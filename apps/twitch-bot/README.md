# twitch-bot

A TypeScript Node.js bot that connects to a Twitch channel via the [Twitch EventSub WebSocket API](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) and writes events to a Firebase database.

WebSocket connection and Twitch EventSub types are handled by the [`@pogo-raid-system/twitch-eventsub`](../../libs/twitch-eventsub/README.md) library.

---

## Project structure

```
src/
├── main.ts                Entry point – validates auth, wires commands, starts the WebSocket client
├── config.ts              Reads environment variables into a typed config object
├── types.ts               Re-exports all Twitch types from @pogo-raid-system/twitch-eventsub
├── auth.ts                Token validation against the Twitch OAuth endpoint
├── chat.ts                Twitch Helix API helpers: send messages, register EventSub subscriptions
├── permissions.ts         Checks whether a chatter is privileged (broadcaster or moderator)
├── command-aliases.ts     Maps command aliases to canonical command names
├── command-registry.ts    Command enable/disable registry
├── persisted-settings.ts  Loads/saves bot settings to disk
├── queue-state.ts         In-memory queue open/closed state
├── spam-detection.ts      Detects and filters spam messages
├── messages.ts            Chat message templates
└── commands/
    ├── raid.ts            !raid – adds user to the queue
    ├── add.ts             !add  – manually adds a user (privileged)
    ├── remove.ts          !remove
    ├── leave.ts           !leave
    ├── clear.ts           !clear
    ├── open.ts            !open
    ├── close.ts           !close
    ├── list.ts            !list
    ├── groups.ts          !groups
    ├── strike.ts          !strike
    ├── hints.ts           Passive hint detection (add-me, how-to-join patterns)
    ├── hints.test.ts
    ├── spam-window.ts     !spamwindow
    ├── enable-disable.ts  !enable / !disable
    └── commands.ts        !commands
```

---

## Function reference

### `config.ts`

| Export | Description |
|--------|-------------|
| `config` | Typed const object containing all environment-sourced settings (`botUserId`, `oauthToken`, `clientId`, `chatChannelUserId`, `eventSubWebSocketUrl`). |

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
| `registerEventSubListeners(sessionId)` | Subscribes to `channel.chat.message` via `POST https://api.twitch.tv/helix/eventsub/subscriptions` using the WebSocket session ID. Exits with code 1 on failure. Passed as `onSessionWelcome` to `connectBot`. |

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

After authorising, copy the token from the address bar — it appears after `#access_token=` and before `&scope`. This is your `OAUTH_TOKEN`.

> **Keep this token secret.** Do not share it or commit it to source control.

---

### 4b. Get an OAuth token for the broadcaster account

Channel point redemptions require a token from the **broadcaster account** (the channel owner). Open a **private/incognito browser window**, log in as the **broadcaster**, then visit:

```
https://id.twitch.tv/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://localhost&response_type=token&scope=channel:read:redemptions&force_verify=true
```

Copy the token the same way. This is your `BROADCASTER_OAUTH_TOKEN`.

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
BROADCASTER_OAUTH_TOKEN=your_broadcaster_account_oauth_token
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

## Token expiry

Implicit flow tokens expire after a short period. If the bot logs `Token is not valid`, repeat step 4 to generate a fresh token and update `OAUTH_TOKEN` in your `.env`.

