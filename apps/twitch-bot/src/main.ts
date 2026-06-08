import { validateToken } from './auth.js';
import { connectBot } from './websocket/index.js';
import { SubscriptionType } from './types.js';
import { handleRaidCommand } from './commands/raid.js';
import { handleClearCommand } from './commands/clear.js';
import { handleOpenCommand } from './commands/open.js';
import { handleCloseCommand } from './commands/close.js';
import { handleListCommand } from './commands/list.js';
import { handleAddCommand } from './commands/add.js';
import { handleLeaveCommand } from './commands/leave.js';
import { handleRemoveCommand } from './commands/remove.js';
import { FirestoreQueueProvider } from './providers/firestore-queue-provider.js';
import { isPrivileged } from './permissions.js';
import { sendChatMessage } from './chat.js';
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
  await validateToken();

  const provider = new FirestoreQueueProvider();
  // const provider = new InMemoryQueueProvider();

  connectBot(({ subscriptionType, event }) => {
    if (subscriptionType === SubscriptionType.ChannelChatMessage) {
      console.log(
        `MSG #${event.broadcaster_user_login} <${event.chatter_user_login}> ${event.message.text}`
      );

      const text = event.message.text.trim().toLowerCase();

      if (text.startsWith('!raid')) {
        handleRaidCommand(event, provider);
      } else if (text === '!leave') {
        handleLeaveCommand(event, provider);
      } else if (text === '!clear' || text === '!open' || text === '!close' || text === '!list' || text.startsWith('!add') || text.startsWith('!remove')) {
        if (!isPrivileged(event)) {
          sendChatMessage(`@${event.chatter_user_login} you do not have permissions for that command`);
          return;
        }
        if (text === '!clear') {
          handleClearCommand(event, provider);
        } else if (text === '!open') {
          handleOpenCommand(event, provider);
        } else if (text === '!close') {
          handleCloseCommand(event, provider);
        } else if (text === '!list') {
          handleListCommand(event, provider);
        } else if (text.startsWith('!add')) {
          handleAddCommand(event, provider);
        } else if (text.startsWith('!remove')) {
          handleRemoveCommand(event, provider);
        }
      }
    }
  });
})();


