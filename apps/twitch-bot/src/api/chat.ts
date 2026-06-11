import { config } from '../config.js';

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
  if (chatMessage.trimStart().startsWith('/')) {
    console.error(`sendChatMessage blocked: message starts with '/' — "${chatMessage}"`);
    return;
  }

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
    await response.json();
    console.log('Bot connected. Listening for chat messages.');
  }
};

/**
 * Validates the broadcaster OAuth token and subscribes to
 * `channel.channel_points_custom_reward_redemption.add` on a dedicated
 * WebSocket session that uses the broadcaster's token.
 *
 * Must be called as the `onSessionWelcome` callback of a second `connectBot`
 * call — NOT on the same session as the bot's chat subscription.
 */
export const registerBroadcasterEventSubListeners = async (
  websocketSessionId: string
): Promise<void> => {
  if (!config.broadcasterOauthToken) {
    console.error('');
    console.error('⚠️  BROADCASTER_OAUTH_TOKEN is not set — channel point redemptions will not be tracked.');
    console.error('   To fix this:');
    console.error('   1. Log into Twitch as the broadcaster account in a private/incognito window');
    console.error('   2. Visit: https://id.twitch.tv/oauth2/authorize?client_id=' + config.clientId + '&redirect_uri=https://localhost&response_type=token&scope=channel:read:redemptions&force_verify=true');
    console.error('   3. Authorise and copy the token from the URL (between #access_token= and &scope)');
    console.error('   4. Add BROADCASTER_OAUTH_TOKEN=<token> to your .env and restart the bot');
    console.error('');
    return;
  }

  const validateRes = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: 'OAuth ' + config.broadcasterOauthToken },
  });
  if (!validateRes.ok) {
    console.error('⚠️  BROADCASTER_OAUTH_TOKEN is invalid or expired — channel point redemptions will not be tracked.');
    console.error('   Regenerate it using step 4b in apps/twitch-bot/README.md.');
    return;
  }
  const validateData = await validateRes.json() as { login: string; scopes: string[] };
  if (!validateData.scopes.includes('channel:read:redemptions') && !validateData.scopes.includes('channel:manage:redemptions')) {
    console.error('⚠️  BROADCASTER_OAUTH_TOKEN is missing channel:read:redemptions scope — channel point redemptions will not be tracked.');
    console.error('   Regenerate it using step 4b in apps/twitch-bot/README.md.');
    return;
  }

  const cpResponse = await fetch(
    'https://api.twitch.tv/helix/eventsub/subscriptions',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + config.broadcasterOauthToken,
        'Client-Id': config.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: {
          broadcaster_user_id: config.chatChannelUserId,
        },
        transport: {
          method: 'websocket',
          session_id: websocketSessionId,
        },
      }),
    }
  );

  if (cpResponse.status !== 202) {
    const data = await cpResponse.json();
    console.error(
      'Failed to subscribe to channel.channel_points_custom_reward_redemption.add. API call returned status code ' +
        cpResponse.status
    );
    console.error(data);
    if (cpResponse.status === 403) {
      console.error('');
      console.error('   Common causes:');
      console.error('   • The channel is not Twitch Affiliate or Partner (channel points require Affiliate/Partner status)');
      console.error('   • The BROADCASTER_OAUTH_TOKEN is from the wrong account (must be from the broadcaster, not the bot)');
      console.error('');
    }
  } else {
    await cpResponse.json();
    console.log('Channel points connected. Listening for reward redemptions.');
  }
};
