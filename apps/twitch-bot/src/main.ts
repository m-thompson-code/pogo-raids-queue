import { validateToken } from './api/auth.js';
import { connectBot } from '@pogo-raid-system/twitch-eventsub';
import { SubscriptionType } from './types.js';
import type { ChannelPointsRedemptionEvent } from './types.js';
import { loadSettings, isCommandEnabled } from './persisted-settings.js';
import { handleRaidCommand } from './commands/raid.js';
import { handleClearCommand } from './commands/clear.js';
import { handleOpenCommand } from './commands/open.js';
import { handleCloseCommand } from './commands/close.js';
import { handleListCommand } from './commands/list.js';
import { handleGroupsCommand } from './commands/groups.js';
import { handleAddCommand } from './commands/add.js';
import { handleLeaveCommand } from './commands/leave.js';
import { handleRemoveCommand } from './commands/remove.js';
import { handleStrikeCommand, strikeByUsername } from './commands/strike.js';
import { maybeHintRaidCommand, handleHintCooldownCommand, maybeHintCode } from './detectables/hints.js';
import { handleSpamWindowCommand } from './commands/spam-window.js';
import { handleEnableCommand, handleDisableCommand } from './commands/enable-disable.js';
import { handleCommandsCommand } from './commands/commands.js';
import { checkSpam } from './detectables/spam-detection.js';
import { FirestoreQueueProvider } from './providers/firestore-queue-provider.js';
import { isPrivileged } from './permissions.js';
import { sendChatMessage, registerEventSubListeners, registerBroadcasterEventSubListeners } from './api/chat.js';
import { messages } from './messages.js';
import { resolveCommand } from './command-aliases.js';
import { config } from './config.js';
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

  const provider = new FirestoreQueueProvider();
  // const provider = new InMemoryQueueProvider();

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
      const text = chatEvent.message.text.trim();
      const command = resolveCommand(text);

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

      if (command && !isCommandEnabled(command)) {
        return;
      }

      if (command === 'raid') {
        handleRaidCommand(chatEvent, provider);
      } else if (command === 'code') {
        sendChatMessage(messages.hintCode(chatEvent.chatter_user_login));
      } else if (command === 'help') {
        sendChatMessage('Type "!raid your_username" to join raids (no quotes). Please don\'t spam.');
      } else if (command === 'discord') {
        sendChatMessage('https://discord.gg/7WACyhUHtb');
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
        handleLeaveCommand(chatEvent, provider);
      } else if (command === 'clear' || command === 'open' || command === 'close' || command === 'list' || command === 'groups' || command === 'add' || command === 'remove' || command === 'strike' || command === 'hintcooldown' || command === 'spamwindow') {
        if (!isPrivileged(chatEvent)) {
          sendChatMessage(`@${chatEvent.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (command === 'clear') {
          handleClearCommand(chatEvent, provider);
        } else if (command === 'open') {
          handleOpenCommand(chatEvent);
        } else if (command === 'close') {
          handleCloseCommand(chatEvent);
        } else if (command === 'list') {
          handleListCommand(chatEvent, provider);
        } else if (command === 'groups') {
          handleGroupsCommand(chatEvent, provider);
        } else if (command === 'add') {
          handleAddCommand(chatEvent, provider);
        } else if (command === 'remove') {
          handleRemoveCommand(chatEvent, provider);
        } else if (command === 'strike') {
          handleStrikeCommand(chatEvent);
        } else if (command === 'hintcooldown') {
          handleHintCooldownCommand(chatEvent);
        } else if (command === 'spamwindow') {
          handleSpamWindowCommand(chatEvent);
        }
      } else {
        if (text.startsWith('!')) return;
        if (chatEvent.chatter_user_id === config.botUserId) return;
        if (checkSpam(chatEvent)) return;
        maybeHintRaidCommand(chatEvent);
        maybeHintCode(chatEvent);
      }
    }
  });
})();
