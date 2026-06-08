# Bot Setup Guide

Follow these steps to get the raid queue bot running in your channel.

---

## Step 1 — Install Node.js

Download and install **Node.js 20 or later** from:
👉 https://nodejs.org/en/download

To verify it installed, open a terminal and run:
```
node --version
```
You should see something like `v20.x.x`.

---

## Step 2 — Download the project

Download the project from GitHub:
👉 https://github.com/m-thompson-code/pogo-raids-queue

Click **Code → Download ZIP**, then extract it somewhere easy to find, like your Desktop.

---

## Step 3 — Add your secret files

You will need two files that are **not** included in the repo for security reasons. Reach out to whoever set this up for you to get them:

| File | Where to put it |
|---|---|
| `.env` | Root of the project folder (same level as `package.json`) |
| `service-account.json` | Root of the project folder (same level as `package.json`) |

---

## Step 4 — Add your Twitch channel ID to `.env`

Open `.env` in any text editor (Notepad, TextEdit, etc.).

Find this line:
```
CHAT_CHANNEL_USER_ID=
```

Look up your numeric Twitch channel ID here:
👉 https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/

Paste the number after the `=` sign. Example:
```
CHAT_CHANNEL_USER_ID=36547695
```

Save the file.

---

## Step 5 — Install dependencies

Open a terminal in the project folder and run:
```
npm install
```

This only needs to be done once (or after updates).

---

## Step 6 — Start the bot

```
npm start
```

You should see a message like `Connected to Twitch EventSub`. The bot is now live in your channel.

To stop it, press `Ctrl + C` in the terminal.

---

## Bot commands

| Command | Who can use it | What it does |
|---|---|---|
| `!commands` | Everyone | Lists all currently enabled commands in chat |
| `!raid <PogoUsername>` | Everyone | Adds you to the raid queue |
| `!leave` | Everyone | Removes you from the queue |
| `!list` | Everyone | Lists the current queue |
| `!add <name1,name2>` | Mods / Broadcaster | Manually adds one or more users |
| `!remove <PogoUsername>` | Mods / Broadcaster | Removes a specific user |
| `!clear` | Mods / Broadcaster | Clears the entire queue |
| `!open` | Mods / Broadcaster | Opens the queue |
| `!close` | Mods / Broadcaster | Closes the queue |
| `!strike <TwitchUsername>` | Mods / Broadcaster | Adds a strike to a user |
| `!strike <TwitchUsername> <n>` | Mods / Broadcaster | Sets a user's strikes to a specific number |
| `!hintcooldown <seconds>` | Mods / Broadcaster | Sets how long (in seconds) before the same hint can fire again in chat |
| `!spamwindow <seconds>` | Mods / Broadcaster | Sets the spam detection window in seconds (`0` disables spam detection) |
| `!enable <command>` | Mods / Broadcaster | Re-enables a previously disabled command |
| `!disable <command>` | Mods / Broadcaster | Disables a command (persists across restarts; `!enable` and `!disable` cannot be disabled) |
