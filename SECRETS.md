# Secret & Private Files Setup

These files are **gitignored** and must be created manually when cloning this repo.

---

## 1. `apps/twitch-bot/.env`

Create this file with the following keys:

```
CLIENT_ID=
OAUTH_TOKEN=
BOT_USER_ID=
CHAT_CHANNEL_USER_ID=
FIREBASE_PROJECT_ID=hydro-pogo-raids
GOOGLE_APPLICATION_CREDENTIALS=apps/twitch-bot/service-account.json
BROADCASTER_OAUTH_TOKEN=
```

### Where to get each value

| Variable | Where to find it |
|---|---|
| `CLIENT_ID` | [Twitch Developer Console](https://dev.twitch.tv/console/apps) → your app → **Client ID** |
| `OAUTH_TOKEN` | Generate at [twitchtokengenerator.com](https://twitchtokengenerator.com) using your **bot account**. Needs `chat:read`, `chat:edit`, `user:bot`, `user:read:chat`, `user:write:chat` scopes. |
| `BOT_USER_ID` | The numeric Twitch user ID of the bot account. Look it up at [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) |
| `CHAT_CHANNEL_USER_ID` | Same tool — the numeric ID of the channel the bot should join |
| `FIREBASE_PROJECT_ID` | [Firebase Console](https://console.firebase.google.com) → your project → **Project settings** → Project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the service account JSON (see below) |
| `BROADCASTER_OAUTH_TOKEN` | Generate using the **broadcaster account** with `channel:read:redemptions` scope. Use the OAuth URL in `apps/twitch-bot/README.md` step 4b. |

---

## 2. `apps/twitch-bot/service-account.json`

This is the Firebase Admin SDK service account key.

**How to generate:**
1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Click **Project settings** (gear icon) → **Service accounts** tab
3. Click **Generate new private key**
4. Rename the downloaded file to `service-account.json`
5. Move it to `apps/twitch-bot/service-account.json`

---

## 3. `apps/client/src/environments/` *(not secret — safe to commit)*

These files hold the Firebase **client** SDK config. Unlike the service account, this config is designed to be public — access is controlled by Firestore security rules and Firebase Auth.

**How to find these values:**
1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Click **Project settings** (gear icon) → **General** tab
3. Scroll to **Your apps** → Web app → **SDK setup and configuration**
4. Copy the `firebaseConfig` object values into `environment.ts` and `environment.prod.ts`
