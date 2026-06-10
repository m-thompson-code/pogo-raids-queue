// ---------------------------------------------------------------------------
// Twitch EventSub WebSocket message type discriminants
// ---------------------------------------------------------------------------

/** Possible values for `metadata.message_type` in a Twitch WebSocket message */
export const MessageType = {
  SessionWelcome: 'session_welcome',
  Notification: 'notification',
  SessionKeepalive: 'session_keepalive',
  SessionReconnect: 'session_reconnect',
  Revocation: 'revocation',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

/** EventSub subscription types handled by this bot */
export const SubscriptionType = {
  ChannelChatMessage: 'channel.chat.message',
  ChannelPointsRedemption:
    'channel.channel_points_custom_reward_redemption.add',
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
  subscription_type?: string;
  subscription_version?: string;
}

export interface SessionPayload {
  session: {
    id: string;
    status: string;
    connected_at: string;
    keepalive_timeout_seconds: number;
    reconnect_url: string | null;
  };
}

export interface ChatMessageFragment {
  type: string;
  text: string;
  emote?: { id: string; emote_set_id: string };
}

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

export interface ChannelPointsRedemptionEvent {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  user_id: string;
  user_login: string;
  user_name: string;
  user_input: string;
  status: string;
  reward: {
    id: string;
    title: string;
    cost: number;
    prompt: string;
  };
  redeemed_at: string;
}

export interface NotificationPayload {
  subscriptionType: string;
  event: ChatMessageEvent | ChannelPointsRedemptionEvent;
}

export type NotificationHandler = (payload: NotificationPayload) => void;

export interface TwitchWebSocketMessage {
  metadata: TwitchWebSocketMetadata;
  payload: {
    session?: SessionPayload['session'];
    subscription?: { type: string };
    event?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Twitch API response shapes
// ---------------------------------------------------------------------------

export interface EventSubSubscriptionResponse {
  data: Array<{
    id: string;
    status: string;
    type: string;
    version: string;
  }>;
}
