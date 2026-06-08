import { validateToken } from './auth.js';
import { connectBot } from './websocket/index.js';
import { SubscriptionType } from './types.js';
import { loadSettings, isCommandEnabled } from './persisted-settings.js';
import { handleRaidCommand } from './commands/raid.js';
import { handleClearCommand } from './commands/clear.js';
import { handleOpenCommand } from './commands/open.js';
import { handleCloseCommand } from './commands/close.js';
import { handleListCommand } from './commands/list.js';
import { handleAddCommand } from './commands/add.js';
import { handleLeaveCommand } from './commands/leave.js';
import { handleRemoveCommand } from './commands/remove.js';
import { handleStrikeCommand } from './commands/strike.js';
import { maybeHintRaidCommand, handleHintCooldownCommand, maybeHintCode } from './commands/hints.js';
import { handleSpamWindowCommand } from './commands/spam-window.js';
import { handleEnableCommand, handleDisableCommand } from './commands/enable-disable.js';
import { handleCommandsCommand } from './commands/commands.js';
import { checkSpam } from './spam-detection.js';
import { FirestoreQueueProvider } from './providers/firestore-queue-provider.js';
import { isPrivileged } from './permissions.js';
import { sendChatMessage } from './chat.js';
// import { messages } from './messages.js'; // re-enable when !code command is re-enabled
import { resolveCommand } from './command-aliases.js';
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

  connectBot(({ subscriptionType, event }) => {
    if (subscriptionType === SubscriptionType.ChannelChatMessage) {
      const text = event.message.text.trim();
      const command = resolveCommand(text);

      if (command) {
        console.log(`CMD !${command} <${event.chatter_user_login}>`);
      }

      // enable/disable bypass the enabled check intentionally
      if (command === 'enable' || command === 'disable') {
        if (!isPrivileged(event)) {
          sendChatMessage(`@${event.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (command === 'enable') handleEnableCommand(event);
        else handleDisableCommand(event);
        return;
      }

      if (command && !isCommandEnabled(command)) {
        return;
      }

      if (command === 'raid') {
        handleRaidCommand(event, provider);
      // } else if (command === 'code') {
      //   sendChatMessage(messages.hintCode(event.chatter_user_login));
      } else if (command === 'commands') {
        handleCommandsCommand(event);
      } else if (command === 'leave') {
        handleLeaveCommand(event, provider);
      } else if (command === 'clear' || command === 'open' || command === 'close' || command === 'list' || command === 'add' || command === 'remove' || command === 'strike' || command === 'hintcooldown' || command === 'spamwindow') {
        if (!isPrivileged(event)) {
          sendChatMessage(`@${event.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (command === 'clear') {
          handleClearCommand(event, provider);
        } else if (command === 'open') {
          handleOpenCommand(event, provider);
        } else if (command === 'close') {
          handleCloseCommand(event, provider);
        } else if (command === 'list') {
          handleListCommand(event, provider);
        } else if (command === 'add') {
          handleAddCommand(event, provider);
        } else if (command === 'remove') {
          handleRemoveCommand(event, provider);
        } else if (command === 'strike') {
          handleStrikeCommand(event);
        } else if (command === 'hintcooldown') {
          handleHintCooldownCommand(event);
        } else if (command === 'spamwindow') {
          handleSpamWindowCommand(event);
        }
      } else {
        if (text.startsWith('!')) return;
        if (checkSpam(event)) return;
        maybeHintRaidCommand(event);
        maybeHintCode(event);
      }
    }
  });
})();


