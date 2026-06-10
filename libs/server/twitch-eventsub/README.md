# @pogo-raid-system/twitch-eventsub

A zero-dependency (aside from `ws`) library for connecting to the [Twitch EventSub WebSocket API](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

Handles the low-level session handshake internally so consumers only deal with typed notification events.

---

## Usage

```ts
import {
  connectBot,
  SubscriptionType,
} from '@pogo-raid-system/twitch-eventsub';

connectBot(
  'wss://eventsub.wss.twitch.tv/ws',
  (sessionId) => {
    // Called on session_welcome — register your EventSub subscriptions here
    registerEventSubListeners(sessionId);
  },
  ({ subscriptionType, event }) => {
    if (subscriptionType === SubscriptionType.ChannelChatMessage) {
      console.log(event.message.text);
    }
  },
);
```

---

## API

### `connectBot(url, onSessionWelcome, onNotification)`

Opens a WebSocket connection to the given Twitch EventSub URL and wires all protocol handling internally.

| Parameter          | Type                          | Description                                                                                                           |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `url`              | `string`                      | The EventSub WebSocket endpoint (e.g. `wss://eventsub.wss.twitch.tv/ws`)                                              |
| `onSessionWelcome` | `(sessionId: string) => void` | Called with the session ID when a `session_welcome` message is received. Use this to register EventSub subscriptions. |
| `onNotification`   | `NotificationHandler`         | Called for every `notification` message. Never receives lower-level protocol messages.                                |

Returns the underlying `WebSocket` instance.

---

## Types

| Export                         | Description                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MessageType`                  | Const map of Twitch WebSocket `metadata.message_type` values (`SessionWelcome`, `Notification`, `SessionKeepalive`, `SessionReconnect`, `Revocation`). |
| `SubscriptionType`             | Const map of EventSub subscription type strings (`ChannelChatMessage`).                                                                                |
| `NotificationPayload`          | Payload passed to `onNotification` — `{ subscriptionType: string, event: ChatMessageEvent }`.                                                          |
| `NotificationHandler`          | `(payload: NotificationPayload) => void`                                                                                                               |
| `ChatMessageEvent`             | Event data for a `channel.chat.message` notification.                                                                                                  |
| `ChatMessageFragment`          | A single fragment within a chat message (text, emote, cheermote, etc.).                                                                                |
| `TwitchWebSocketMessage`       | Top-level shape of every raw message from the EventSub WebSocket.                                                                                      |
| `TwitchWebSocketMetadata`      | Metadata block present on every WebSocket message.                                                                                                     |
| `SessionPayload`               | Payload shape for `session_welcome` and `session_reconnect` messages.                                                                                  |
| `EventSubSubscriptionResponse` | Response body from `POST /helix/eventsub/subscriptions`.                                                                                               |

---

## Protocol overview

1. On connection, Twitch sends a `session_welcome` message containing a `session.id`.
2. Your `onSessionWelcome` callback receives that session ID — use it to call `POST /helix/eventsub/subscriptions` and subscribe to event types.
3. Twitch routes matching events to your WebSocket as `notification` messages.
4. `session_keepalive`, `session_reconnect`, and `revocation` messages are handled silently by the library.
