import { config } from './config';
import type { EventSubSubscriptionResponse } from './types';

/**
 * Sends a chat message to the configured channel via the Twitch Helix API.
 *
 * Calls `POST https://api.twitch.tv/helix/chat/messages` authenticated as
 * the bot user.  Logs a success message on 200 OK, or logs the error body
 * on any other status.
 *
 * @param chatMessage - The text content to post in the channel chat
 */
export const sendChatMessage = async (chatMessage: string): Promise<void> => {
  const response = await fetch('https://api.twitch.tv/helix/chat/messages', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.oauthToken,
      'Client-Id': config.clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      broadcaster_id: config.chatChannelUserId,
      sender_id: config.botUserId,
      message: chatMessage,
    }),
  });

  if (response.status !== 200) {
    const data = await response.json();
    console.error('Failed to send chat message');
    console.error(data);
  } else {
    console.log('Sent chat message: ' + chatMessage);
  }
};

/**
 * Sends a whisper from the bot to a specific user via the Twitch Helix API.
 *
 * Calls `POST https://api.twitch.tv/helix/whispers`.  Requires the bot token
 * to have the `user:manage:whispers` scope.  Logs on success (204) or error.
 *
 * @param toUserId - The numeric Twitch User ID of the whisper recipient
 * @param message  - The text content of the whisper
 */
export const sendWhisper = async (
  toUserId: string,
  message: string
): Promise<void> => {
  const url = new URL('https://api.twitch.tv/helix/whispers');
  url.searchParams.set('from_user_id', config.botUserId);
  url.searchParams.set('to_user_id', toUserId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.oauthToken,
      'Client-Id': config.clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (response.status !== 204) {
    const data = await response.json();
    console.error(`Failed to send whisper to ${toUserId}`);
    console.error(data);
  } else {
    console.log(`Whispered to ${toUserId}: ${message}`);
  }
};



/**
 * Subscribes to the `channel.chat.message` EventSub topic for the configured
 * channel using the provided WebSocket session ID.
 *
 * Calls `POST https://api.twitch.tv/helix/eventsub/subscriptions`.  On
 * success (202 Accepted) it logs the subscription ID.  On failure it logs the
 * error body and exits the process with code 1.
 *
 * @param websocketSessionId - The session ID received in the `session_welcome`
 *   WebSocket message.  Twitch uses this to route notifications to the correct
 *   WebSocket connection.
 */
export const registerEventSubListeners = async (
  websocketSessionId: string
): Promise<void> => {
  const response = await fetch(
    'https://api.twitch.tv/helix/eventsub/subscriptions',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + config.oauthToken,
        'Client-Id': config.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: config.chatChannelUserId,
          user_id: config.botUserId,
        },
        transport: {
          method: 'websocket',
          session_id: websocketSessionId,
        },
      }),
    }
  );

  if (response.status !== 202) {
    const data = await response.json();
    console.error(
      'Failed to subscribe to channel.chat.message. API call returned status code ' +
        response.status
    );
    console.error(data);
    process.exit(1);
  } else {
    const data = (await response.json()) as EventSubSubscriptionResponse;
    console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
  }
};
