/**
 * Bot configuration loaded from environment variables.
 *
 * Required environment variables:
 *   BOT_USER_ID              - Twitch User ID of the bot account
 *   OAUTH_TOKEN              - OAuth token with scopes: user:bot, user:read:chat, user:write:chat
 *   CLIENT_ID                - Twitch application Client ID
 *   CHAT_CHANNEL_USER_ID     - Twitch User ID of the channel the bot will join
 *   BROADCASTER_OAUTH_TOKEN  - OAuth token from the broadcaster account with channel:read:redemptions
 */
export const config = {
  /** Twitch User ID of the bot account */
  botUserId: process.env['BOT_USER_ID'] ?? '',

  /** OAuth token (without the "Bearer" prefix) */
  oauthToken: process.env['OAUTH_TOKEN'] ?? '',

  /** Twitch application Client ID */
  clientId: process.env['CLIENT_ID'] ?? '',

  /** Twitch User ID of the channel the bot will join and listen to */
  chatChannelUserId: process.env['CHAT_CHANNEL_USER_ID'] ?? '',

  /** OAuth token from the broadcaster account — needs channel:read:redemptions scope */
  broadcasterOauthToken: process.env['BROADCASTER_OAUTH_TOKEN'] ?? '',

  /** Twitch EventSub WebSocket endpoint */
  eventSubWebSocketUrl: 'wss://eventsub.wss.twitch.tv/ws',

  /**
   * When true, the bot subscribes to chat and processes all commands but
   * never actually sends messages or writes to Firestore.
   * Set DRY_RUN=true to enable.
   */
  dryRun: process.env['DRY_RUN'] === 'true',
} as const;
