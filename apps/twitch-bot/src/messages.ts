// ─────────────────────────────────────────────────────────────────────────────
// Bot chat messages
//
// All text the bot sends to chat lives here.
// Edit this file to change what the bot says.
// ─────────────────────────────────────────────────────────────────────────────

import { FRIEND_CODE_RAW } from './friend-code.js';

export const messages = {
  // !raid
  raidQueueClosed: (username: string) =>
    `@${username} Raids are currently closed.`,
  raidMissingUsername: (username: string) =>
    `@${username} !raid your_pogo_username to join the queue! Make sure you added the host ${FRIEND_CODE_RAW} and told them your pogo username first.`,
  raidInvalidUsername: (username: string) =>
    `@${username} Your pogo username includes an invalid character.`,
  raidAdded: (pogoUsername: string) =>
    `${pogoUsername} added to the raid queue! Use !joined when you enter the raid.`,
  raidAlreadyInQueue: `You're already in the queue.`,
  raidForgotJoinedStrike: (count: number) =>
    count >= 3
      ? `You forgot to use !joined after your raid. You now have ${count} strikes and are timed out for 10 minutes.`
      : `You forgot to use !joined after your raid. You now have ${count} strike${count === 1 ? '' : 's'}. At 3 strikes, you will be timed out for 10 minutes.`,
  raidTimedOut: (twitchUsername: string, remainingMs: number) => {
    const totalSec = Math.ceil(remainingMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const timeStr = min > 0 && sec > 0
      ? `${min} min ${sec} sec`
      : min > 0
        ? `${min} min`
        : `${sec} sec`;
    return `@${twitchUsername} is temporarily timed out. Try again in ${timeStr}.`;
  },
  raidRejoinedQueue: (pogoUsername: string) =>
    `${pogoUsername} is back in the queue!`,
  raidUsernameUpdated: (newPogoUsername: string, previousPogoUsername?: string) =>
    previousPogoUsername
      ? `Queue username updated from ${previousPogoUsername} to ${newPogoUsername}.`
      : `Queue username updated to ${newPogoUsername}.`,
  raidAddedUsernameSaved: (pogoUsername: string) =>
    `${pogoUsername} added to the raid queue! Username saved — next time you can just use !raid. Use !joined when you enter the raid.`,
  raidAddedFirstTime: (pogoUsername: string) =>
    `${pogoUsername} added to the raid queue! Make sure you have added ${FRIEND_CODE_RAW} and that the host has added you back. Use !joined when you enter the raid.`,

  // !leave
  leaveRemoved: (pogoUsername: string) =>
    `${pogoUsername} removed from the raid queue.`,
  leaveNotInQueue: (username: string) =>
    `@${username} You're not in the queue yet.`,

  // !remove
  removeUsage: (username: string) =>
    `@${username} Usage: !remove <pogo_username>.`,
  removeSuccess: (pogoUsername: string) =>
    `${pogoUsername} has been removed from the queue.`,
  removeNotFound: (pogoUsername: string) =>
    `${pogoUsername} was not found in the queue.`,

  // !add
  addUsage: (username: string) =>
    `@${username} Usage: !add <pogo_username>[,<pogo_username>...].`,
  addSuccess: (listed: string, noun: string) =>
    `${listed} ${noun} been added to the raid queue.`,

  // !invited
  invitedNotInQueue: (username: string) =>
    `@${username} You're not in queue yet.`,
  invitedAlreadyMarked: `You're already marked as invited.`,
  invitedSuccess: `Thank you for raiding with us!`,

  // !list
  listEmpty: () =>
    `The queue is empty.`,

  // !clear
  clearSuccess: (username: string) =>
    `@${username} The raid queue has been cleared.`,

  // !open
  openSuccess: (username: string) =>
    `@${username} The queue is now open! !raid your_pogo_username to join.`,

  // !close
  closeSuccess: (username: string) =>
    `@${username} The raid queue is now closed.`,

  // !strike
  strikeUsage: (username: string) =>
    `@${username} Usage: !strike <twitch_username> [value].`,
  strikeNotFound: (username: string, target: string) =>
    `@${username} User "${target}" was not found.`,
  strikeConfirm: (target: string, count: number) =>
    `@${target} You now have ${count} strike${count === 1 ? '' : 's'}.${count >= 3 ? ' You will be timed out or banned if you receive more.' : ''}`,

  // !timeout
  timeoutUsage: (username: string) =>
    `@${username} Usage: !timeout <twitch_username>.`,
  timeoutNotFound: (username: string, target: string) =>
    `@${username} User "${target}" was not found.`,
  timeoutSuccess: (target: string) =>
    `@${target} has been moved to the timed-out queue.`,

  // hints
  hintStreamerWontAdd:
    `Host will not add your code, add ${FRIEND_CODE_RAW} instead and post your pogo username.`,
  hintAddCodeFirst:
    `Add ${FRIEND_CODE_RAW} and then use !raid to join queue.`,
  hintUseRaidCommand:
    `!raid your_pogo_username. Use !help for more information`,
  help:
    `Add the host ${FRIEND_CODE_RAW} and tell host your username. Use !raid your_pogo_username to join the queue.`,

  // periodic interval reminder
  intervalReminder:
    `Use !joined when you enter a raid. If you forget, you will be timed out for the next raid. Use !commands for a list of all commands.`,
  intervalPromo:
    `Post your wins in discord https://discord.gg/AARRcwjChD and drop a follow on TikTok https://www.tiktok.com/@poketrainerhydro.`,

  // spam detection
  spamWarning: (username: string) =>
    `@${username} Please don't repeat the same message.`,
  spamWindowSet: (username: string, seconds: number) =>
    seconds === 0
      ? `@${username} Spam detection is now off.`
      : `@${username} Spam detection window set to ${seconds} second${seconds === 1 ? '' : 's'}.`,
} as const;
