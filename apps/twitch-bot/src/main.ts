import { validateToken } from './api/auth.js';
import { connectBot } from '@pogo-raid-system/twitch-eventsub';
import { SubscriptionType } from './types.js';
import type { ChannelPointsRedemptionEvent } from './types.js';
import { loadSettings, isCommandEnabled, getIntervalMessageMs, getInfoCooldownMs, getIntervalPromoMs } from './persisted-settings.js';
import { handleRaidCommand } from './commands/raid.js';
import { handleClearCommand } from './commands/clear.js';
import { handleOpenCommand } from './commands/open.js';
import { handleCloseCommand } from './commands/close.js';
import { handleListCommand } from './commands/list.js';
import { handleGroupsCommand } from './commands/groups.js';
import { handleAddCommand } from './commands/add.js';
import { handleLeaveCommand } from './commands/leave.js';
import { handleInvitedCommand } from './commands/invited.js';
import { handleRemoveCommand } from './commands/remove.js';
import { handleStrikeCommand, strikeByUsername } from './commands/strike.js';
import { handleHintCooldownCommand } from './detectables/hints.js';
import { runDetectables } from './detectables/main.js';
import { handleSpamWindowCommand } from './commands/spam-window.js';
import { handleEnableCommand, handleDisableCommand } from './commands/enable-disable.js';
import { handleCommandsCommand } from './commands/commands.js';
import { checkSpam } from './detectables/spam-detection.js';
import { subscribeToQueue, triggerRegirice } from '@pogo-raid-system/firebase';
import { isPrivileged } from './permissions.js';
import { sendChatMessage, registerEventSubListeners, registerBroadcasterEventSubListeners } from './api/chat.js';
import { messages } from './messages.js';
import { resolveCommand } from './command-aliases.js';
import { config } from './config.js';
import { hydrateQueueMemory, setFirestoreListenerActive } from './detectables/shared.js';
// To use the in-memory provider instead, swap the import above for:
// import { InMemoryQueueProvider } from './providers/in-memory-queue-provider.js';

/**
 * Bot entry point.
 *
 * 1. Validates the OAuth token – exits immediately if it is invalid.
 * 2. Instantiates a queue provider (Firestore by default).
 * 3. Opens a persistent WebSocket connection. The session handshake and
 *    EventSub registration are handled internally; this level only sees
 *    notification events.
 *
 * Command permissions:
 *   Public:     !raid
 *   Privileged: !clear, !open, !close, !list  (broadcaster + moderators only)
 */
(async () => {
  loadSettings();
  await validateToken();

  const intervalMs = getIntervalMessageMs();
  if (intervalMs > 0) {
    setInterval(() => sendChatMessage(messages.intervalReminder), intervalMs);
  }

  const intervalPromoMs = getIntervalPromoMs();
  if (intervalPromoMs > 0) {
    setInterval(() => sendChatMessage(messages.intervalPromo), intervalPromoMs);
  }

  const infoCooldownMap = new Map<string, number>();
  let lastRegiriceAt = 0;
  const REGIRICE_COOLDOWN_MS = 5 * 60 * 1000;

  // Subscribe to live Firestore queue changes so in-memory state stays in sync
  // with updates made by the client (e.g. removing entries via the web UI).
  subscribeToQueue(
    (entries) => {
      setFirestoreListenerActive(true);
      hydrateQueueMemory(entries);
    },
    (err) => {
      console.error('Firestore queue listener error — falling back to local state:', err);
      setFirestoreListenerActive(false);
    }
  );

  // Second WebSocket connection for broadcaster-owned subscriptions (channel points).
  // Must be separate because Twitch requires all subscriptions on a session to use the same user token.
  if (config.broadcasterOauthToken) {
    connectBot(config.eventSubWebSocketUrl, registerBroadcasterEventSubListeners, async ({ subscriptionType, event }) => {
      if (subscriptionType === SubscriptionType.ChannelPointsRedemption) {
        const redemption = event as ChannelPointsRedemptionEvent;
        console.log(`CHANNEL POINTS [${redemption.reward.title}] by ${redemption.user_login} (input: "${redemption.user_input}")`);
        if (redemption.reward.title.toLowerCase() === 'strike') {
          const target = redemption.user_input.trim();
          if (target) {
            await strikeByUsername(target, redemption.user_login);
          } else {
            sendChatMessage(`@${redemption.user_login} please include the Twitch username to strike when redeeming this reward.`);
          }
        }
      }
    });
  }

  connectBot(config.eventSubWebSocketUrl, registerEventSubListeners, async ({ subscriptionType, event }) => {
    if (subscriptionType === SubscriptionType.ChannelChatMessage) {
      const chatEvent = event as import('./types.js').ChatMessageEvent;

      // Ignore messages from the bot itself to prevent feedback loops.
      if (chatEvent.chatter_user_id === config.botUserId) return;

      const text = chatEvent.message.text.trim();
      const command = resolveCommand(text);

      // Detect the Regirice emote in any fragment and trigger the UI animation.
      // Fires with a 1-in-10 chance and at most once per 5 minutes.
      if (chatEvent.message.fragments.some((f) => f.text === 'poketra1Regirice')) {
        const now = Date.now();
        if (now - lastRegiriceAt >= REGIRICE_COOLDOWN_MS && Math.random() < 0.1) {
          lastRegiriceAt = now;
          triggerRegirice();
        }
      }

      if (command) {
        console.log(`CMD !${command} <${chatEvent.chatter_user_login}>`);
      }

      // enable/disable bypass the enabled check intentionally
      if (command === 'enable' || command === 'disable') {
        if (!isPrivileged(chatEvent)) {
          sendChatMessage(`@${chatEvent.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (command === 'enable') handleEnableCommand(chatEvent);
        else handleDisableCommand(chatEvent);
        return;
      }

      // Check if command was disabled using !disable
      if (command && !isCommandEnabled(command)) {
        return;
      }

      // Catch malformed !raid attempts
      // e.g. "!raidusername" (no space), "! raid" (space between ! and command), "!rait".
      if (!command &&
          (/^!raid\S/i.test(text) || /^!\s+r(?:aid)?\b/i.test(text) || /^!rait\b/i.test(text))) {
        sendChatMessage(`@${chatEvent.chatter_user_login}  did you mean !raid?`);
        return;
      }

      if (command === 'raid') {
        handleRaidCommand(chatEvent);
      } else if (command === 'code' || command === 'help' || command === 'discord' || command === 'tiktok') {
        const cooldownMs = getInfoCooldownMs();
        const now = Date.now();
        const lastSent = infoCooldownMap.get(command) ?? 0;
        if (cooldownMs === 0 || now - lastSent >= cooldownMs) {
          infoCooldownMap.set(command, now);
          if (command === 'code') sendChatMessage(messages.hintAddCodeFirst);
          else if (command === 'help') sendChatMessage(messages.help);
          else if (command === 'discord') sendChatMessage('https://discord.gg/AARRcwjChD');
          else if (command === 'tiktok') sendChatMessage('https://www.tiktok.com/@poketrainerhydro');
        }
      } else if (command === 'shutdown') {
        if (!isPrivileged(chatEvent)) {
          sendChatMessage(`@${chatEvent.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        await sendChatMessage('Shutting down. Goodbye! 👋');
        process.exit(0);
      } else if (command === 'commands') {
        handleCommandsCommand(chatEvent);
      } else if (command === 'leave') {
        handleLeaveCommand(chatEvent);
      } else if (command === 'invited') {
        handleInvitedCommand(chatEvent);
      } else if (command === 'clear' || command === 'open' || command === 'close' || command === 'list' || command === 'groups' || command === 'add' || command === 'remove' || command === 'strike' || command === 'hintcooldown' || command === 'spamwindow') {
        if (!isPrivileged(chatEvent)) {
          sendChatMessage(`@${chatEvent.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (command === 'clear') {
          handleClearCommand(chatEvent);
        } else if (command === 'open') {
          handleOpenCommand(chatEvent);
        } else if (command === 'close') {
          handleCloseCommand(chatEvent);
        } else if (command === 'list') {
          handleListCommand(chatEvent);
        } else if (command === 'groups') {
          handleGroupsCommand(chatEvent);
        } else if (command === 'add') {
          handleAddCommand(chatEvent);
        } else if (command === 'remove') {
          handleRemoveCommand(chatEvent);
        } else if (command === 'strike') {
          handleStrikeCommand(chatEvent);
        } else if (command === 'hintcooldown') {
          handleHintCooldownCommand(chatEvent);
        } else if (command === 'spamwindow') {
          handleSpamWindowCommand(chatEvent);
        }
      } else {
        if (text.startsWith('!')) return;
        if (checkSpam(chatEvent)) return;
        runDetectables(chatEvent);
      }
    }
  });
})();
