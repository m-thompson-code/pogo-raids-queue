import type { ChatMessageEvent } from '../types.js';

export interface MakeChatMessageEventOptions {
  userId?: string;
  login?: string;
  userName?: string;
  broadcasterUserId?: string;
  broadcasterUserLogin?: string;
  broadcasterUserName?: string;
  messageId?: string;
  color?: string;
  messageType?: ChatMessageEvent['message_type'];
  badges?: ChatMessageEvent['badges'];
  reply?: ChatMessageEvent['reply'];
  fragments?: ChatMessageEvent['message']['fragments'];
}

export const makeChatMessageEvent = (
  text: string,
  options: MakeChatMessageEventOptions = {}
): ChatMessageEvent => {
  const {
    userId = 'u1',
    login = 'moo',
    userName = login,
    broadcasterUserId = 'b1',
    broadcasterUserLogin = 'streamer',
    broadcasterUserName = 'streamer',
    messageId = 'msg-1',
    color = '',
    messageType = 'text',
    badges = [],
    reply = undefined,
    fragments = [],
  } = options;

  return {
    chatter_user_id: userId,
    chatter_user_login: login,
    chatter_user_name: userName,
    broadcaster_user_id: broadcasterUserId,
    broadcaster_user_login: broadcasterUserLogin,
    broadcaster_user_name: broadcasterUserName,
    message_id: messageId,
    message: { text, fragments },
    color,
    message_type: messageType,
    badges,
    reply,
  };
};
