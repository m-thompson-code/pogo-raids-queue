// ---------------------------------------------------------------------------
// Twitch EventSub WebSocket message type discriminants
// ---------------------------------------------------------------------------

/** Possible values for `metadata.message_type` in a Twitch WebSocket message */
export const MessageType = {
  /** First message sent by the server after the connection is established */
  SessionWelcome: 'session_welcome',
  /** An EventSub subscription event has fired (e.g. a chat message) */
  Notification: 'notification',
  /** Server keepalive ping – no action required */
  SessionKeepalive: 'session_keepalive',
  /** Server is requesting the client reconnect to a new URL */
  SessionReconnect: 'session_reconnect',
  /** A subscription was revoked by Twitch */
  Revocation: 'revocation',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

/** EventSub subscription types handled by this bot */
export const SubscriptionType = {
  /** Fires whenever a chat message is sent in the monitored channel */
  ChannelChatMessage: 'channel.chat.message',
} as const;
export type SubscriptionType =
  (typeof SubscriptionType)[keyof typeof SubscriptionType];

// ---------------------------------------------------------------------------
// WebSocket message shapes
// ---------------------------------------------------------------------------

export interface TwitchWebSocketMetadata {
  message_id: string;
  message_type: string;
  message_timestamp: string;
  /** Present on `notification` and `revocation` messages */
  subscription_type?: string;
  subscription_version?: string;
}

/** Payload for `session_welcome` and `session_reconnect` messages */
export interface SessionPayload {
  session: {
    id: string;
    status: string;
    connected_at: string;
    keepalive_timeout_seconds: number;
    reconnect_url: string | null;
  };
}

/** Chat message fragment (text, emote, cheermote, etc.) */
export interface ChatMessageFragment {
  type: string;
  text: string;
  /** Present when `type === 'emote'` */
  emote?: { id: string; emote_set_id: string };
}

/** Event data for a `channel.chat.message` notification */
export interface ChatMessageEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id: string;
  message: {
    text: string;
    fragments: ChatMessageFragment[];
  };
  color: string;
  badges: Array<{ set_id: string; id: string; info: string }>;
  message_type: string;
  cheer?: { bits: number };
  reply?: unknown;
  channel_points_custom_reward_id?: string;
}

// ---------------------------------------------------------------------------
// Public notification API types (used by websocket/index.ts consumers)
// ---------------------------------------------------------------------------

/**
 * Normalised payload delivered to the `onNotification` callback.
 * The low-level session handshake is never surfaced here.
 */
export interface NotificationPayload {
  /** The EventSub subscription type that fired (e.g. `channel.chat.message`) */
  subscriptionType: string;
  /** The event data associated with the notification */
  event: ChatMessageEvent;
}

/** Callback signature for consumers of the bot WebSocket API */
export type NotificationHandler = (payload: NotificationPayload) => void;

// ---------------------------------------------------------------------------

/** Top-level shape of every Twitch EventSub WebSocket message */
export interface TwitchWebSocketMessage {
  metadata: TwitchWebSocketMetadata;
  payload: {
    session?: SessionPayload['session'];
    subscription?: { type: string };
    event?: ChatMessageEvent;
  };
}

// ---------------------------------------------------------------------------
// Twitch API response shapes
// ---------------------------------------------------------------------------

/** Response body from POST /helix/eventsub/subscriptions */
export interface EventSubSubscriptionResponse {
  data: Array<{
    id: string;
    status: string;
    type: string;
    version: string;
  }>;
}
