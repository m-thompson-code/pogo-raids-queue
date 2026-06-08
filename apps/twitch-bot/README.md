# twitch-bot

A TypeScript Node.js bot that connects to a Twitch channel via the [Twitch EventSub WebSocket API](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) and writes events to a Firebase database.

## How it works

The bot authenticates with a Twitch OAuth token, opens a persistent WebSocket connection to the EventSub endpoint, subscribes to `channel.chat.message` events, and responds to specific chat messages.

---

## Project structure

```
src/
├── main.ts              Entry point – validates auth, then starts the WebSocket client
├── config.ts            Reads environment variables into a typed config object
├── types.ts             TypeScript interfaces and const-based type discriminants for all Twitch message/event shapes
├── auth.ts              Token validation against the Twitch OAuth endpoint
├── chat.ts              Twitch Helix API helpers: sending messages and registering EventSub subscriptions
└── websocket/
    ├── index.ts         Public API – exports connectBot(onNotification)
    ├── client.ts        Creates the WebSocket and wires event handlers
    └── handlers.ts      Internal dispatch: session handshake handled here, only notifications reach the consumer
```

---

## Function reference

### `config.ts`

| Export | Description |
|--------|-------------|
| `config` | Typed const object containing all environment-sourced settings (`botUserId`, `oauthToken`, `clientId`, `chatChannelUserId`, `eventSubWebSocketUrl`). |

---

### `types.ts`

| Export | Description |
|--------|-------------|
| `MessageType` | Const map of Twitch WebSocket `metadata.message_type` values (`SessionWelcome`, `Notification`, `SessionKeepalive`, `SessionReconnect`, `Revocation`). |
| `SubscriptionType` | Const map of EventSub subscription type strings (`ChannelChatMessage`). |
| `NotificationPayload` | Normalised payload passed to the `onNotification` callback (`subscriptionType` + `event`). |
| `NotificationHandler` | Callback type for consumers of `connectBot`. |
| `TwitchWebSocketMessage` | Top-level shape of every message received from the EventSub WebSocket. |
| `ChatMessageEvent` | Event data shape for a `channel.chat.message` notification. |
| `EventSubSubscriptionResponse` | Response body from `POST /helix/eventsub/subscriptions`. |

---

### `auth.ts`

| Function | Description |
|----------|-------------|
| `validateToken()` | Calls `GET https://id.twitch.tv/oauth2/validate` with the configured OAuth token. Exits the process with code 1 if the token is invalid or expired. |

---

### `chat.ts`

| Function | Description |
|----------|-------------|
| `sendChatMessage(chatMessage)` | Posts a message to the configured channel via `POST https://api.twitch.tv/helix/chat/messages`. Logs success or error. |
| `registerEventSubListeners(websocketSessionId)` | Subscribes to the `channel.chat.message` EventSub topic by calling `POST https://api.twitch.tv/helix/eventsub/subscriptions` with the current WebSocket session ID. Exits with code 1 on failure. |

---

### `websocket/`

| Export | Description |
|--------|-------------|
| `connectBot(onNotification)` | Opens a WebSocket to Twitch EventSub, handles the session handshake and EventSub registration internally, then calls `onNotification` for every incoming event. The consumer never sees lower-level protocol messages. |

---

## First-time setup

### 1. Register a Twitch application

1. Go to [https://dev.twitch.tv/console](https://dev.twitch.tv/console) and click **Register Your Application**.
2. Set the **OAuth Redirect URL** to `https://localhost`.
3. Save and copy the **Client ID** — this is your `CLIENT_ID`.

---

### 2. Create a bot account (recommended)

Create a separate Twitch account for the bot (e.g. `MyChannelBot`) so chat messages appear under its name rather than yours. You will need to log in as this account in step 4.

---

### 3. Look up Twitch User IDs

Twitch API calls use numeric User IDs, not usernames. Look them up at:

```
https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
```

You need two IDs:
- **`BOT_USER_ID`** — the numeric ID of the bot account
- **`CHAT_CHANNEL_USER_ID`** — the numeric ID of your main/streamer channel

---

### 4. Get an OAuth token for the bot account

Open a **private/incognito browser window**, log into Twitch as the **bot account**, then visit this URL (replace `YOUR_CLIENT_ID`):

```
https://id.twitch.tv/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://localhost&response_type=token&scope=user:bot+user:read:chat+user:write:chat
```

After authorising, the browser redirects to a broken `https://localhost` page. Copy the token from the address bar — it appears after `#access_token=` and before `&scope`.

> **Keep this token secret.** Do not share it or commit it to source control.

---

### 5. Configure environment variables

Copy `.env.example` to `.env` and fill in all four values:

```bash
cp apps/twitch-bot/.env.example apps/twitch-bot/.env
```

```env
CLIENT_ID=your_client_id
OAUTH_TOKEN=your_bot_account_oauth_token
BOT_USER_ID=numeric_id_of_bot_account
CHAT_CHANNEL_USER_ID=numeric_id_of_your_channel
```

The `.env` file is gitignored and will never be committed.

---

### 6. Build and run

```bash
npx nx build twitch-bot && node --env-file=apps/twitch-bot/.env apps/twitch-bot/dist/main.js
```

You should see:

```
Validated token.
WebSocket connection opened to wss://eventsub.wss.twitch.tv/ws
WebSocket session established [<session-id>]
Subscribed to channel.chat.message [<subscription-id>]
```

---

## Default behaviour

The bot watches for any chat message that is exactly `HeyGuys` and replies with `VoHiYo`. Edit the `connectBot` callback in [main.ts](src/main.ts) to add your own command handling logic.

---

## Token expiry

Implicit flow tokens (used above) expire after a short period. If the bot logs `Token is not valid`, repeat step 4 to generate a fresh token and update `OAUTH_TOKEN` in your `.env`.


## How it works

The bot authenticates with a Twitch OAuth token, opens a persistent WebSocket connection to the EventSub endpoint, subscribes to `channel.chat.message` events, and responds to specific chat messages.

---

## Project structure

```
src/
├── main.ts        Entry point – validates auth, then starts the WebSocket client
├── config.ts      Reads environment variables into a typed config object
├── types.ts       TypeScript interfaces and const-based type discriminants for all Twitch message/event shapes
├── auth.ts        Token validation against the Twitch OAuth endpoint
├── chat.ts        Twitch Helix API helpers: sending messages and registering EventSub subscriptions
└── websocket.ts   WebSocket client setup and incoming message dispatch
```

---

## Function reference

### `config.ts`

| Export | Description |
|--------|-------------|
| `config` | Typed const object containing all environment-sourced settings (`botUserId`, `oauthToken`, `clientId`, `chatChannelUserId`, `eventSubWebSocketUrl`). |

---

### `types.ts`

| Export | Description |
|--------|-------------|
| `MessageType` | Const map of Twitch WebSocket `metadata.message_type` values (`SessionWelcome`, `Notification`, `SessionKeepalive`, `SessionReconnect`, `Revocation`). |
| `SubscriptionType` | Const map of EventSub subscription type strings (`ChannelChatMessage`). |
| `TwitchWebSocketMessage` | Top-level shape of every message received from the EventSub WebSocket. |
| `SessionPayload` | Payload shape for `session_welcome` / `session_reconnect` messages. |
| `ChatMessageEvent` | Event data shape for a `channel.chat.message` notification. |
| `EventSubSubscriptionResponse` | Response body from `POST /helix/eventsub/subscriptions`. |

---

### `auth.ts`

| Function | Description |
|----------|-------------|
| `validateToken()` | Calls `GET https://id.twitch.tv/oauth2/validate` with the configured OAuth token. Exits the process with code 1 if the token is invalid or expired. |

---

### `chat.ts`

| Function | Description |
|----------|-------------|
| `sendChatMessage(chatMessage)` | Posts a message to the configured channel via `POST https://api.twitch.tv/helix/chat/messages`. Logs success or error. |
| `registerEventSubListeners(websocketSessionId)` | Subscribes to the `channel.chat.message` EventSub topic by calling `POST https://api.twitch.tv/helix/eventsub/subscriptions` with the current WebSocket session ID. Exits with code 1 on failure. |

---

### `websocket.ts`

| Function | Description |
|----------|-------------|
| `startWebSocketClient()` | Creates a `WebSocket` connected to the Twitch EventSub URL, registers `error`, `open`, and `message` handlers, and returns the socket. |
| `handleWebSocketMessage(data)` *(internal)* | Dispatches incoming messages by `message_type`. On `session_welcome` it triggers `registerEventSubListeners`. On `channel.chat.message` notifications it logs the message and calls `sendChatMessage('VoHiYo')` when the text is `"HeyGuys"`. |

---

## Setup

### 1. Environment variables

Create a `.env` file (or export the variables) before running the bot:

```env
BOT_USER_ID=<your-bot-account-user-id>
OAUTH_TOKEN=<oauth-token-with-user:bot+user:read:chat+user:write:chat-scopes>
CLIENT_ID=<your-twitch-app-client-id>
CHAT_CHANNEL_USER_ID=<user-id-of-the-channel-to-join>
```

To obtain a token see the [Twitch authentication guide](https://dev.twitch.tv/docs/authentication/).

### 2. Build

```bash
npx nx build twitch-bot
```

### 3. Run

```bash
node apps/twitch-bot/dist/main.js
```

Or during development:

```bash
npx nx serve twitch-bot
```

---

## Default behaviour

The bot watches for any chat message that is exactly `HeyGuys` and replies with `VoHiYo`. Edit the `handleWebSocketMessage` function in [websocket.ts](src/websocket.ts) to add your own command handling logic.
