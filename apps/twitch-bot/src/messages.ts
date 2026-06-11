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
    `${pogoUsername} added to the raid queue!`,
  raidAlreadyInQueue: `You're already in the queue.`,
  raidRejoinedQueue: (pogoUsername: string) =>
    `${pogoUsername} is back in the queue!`,
  raidAddedUsernameSaved: (pogoUsername: string) =>
    `${pogoUsername} added to the raid queue! Username saved — next time you can just use !raid`,
  raidAddedFirstTime: (pogoUsername: string) =>
    `${pogoUsername} added to the raid queue! Make sure you have added ${FRIEND_CODE_RAW} and that the host has added you back.`,

  // !leave
  leaveRemoved: (pogoUsername: string) =>
    `${pogoUsername} removed from the raid queue.`,

  // !remove
  removeUsage: (username: string) =>
    `@${username} Usage: !remove <pogo_username>`,
  removeSuccess: (pogoUsername: string) =>
    `${pogoUsername} has been removed from the queue.`,
  removeNotFound: (pogoUsername: string) =>
    `${pogoUsername} was not found in the queue.`,

  // !add
  addUsage: (username: string) =>
    `@${username} Usage: !add <pogo_username>[,<pogo_username>...]`,
  addSuccess: (listed: string, noun: string) =>
    `${listed} ${noun} been added to the raid queue.`,

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
    `@${username} Usage: !strike <twitch_username> [value]`,
  strikeNotFound: (username: string, target: string) =>
    `@${username} User "${target}" was not found.`,
  strikeConfirm: (target: string, count: number) =>
    `@${target} you now have ${count} strike${count === 1 ? '' : 's'}.${count >= 3 ? ' You will be timed out or banned if you receive more.' : ''}`,

  // hints
  hintStreamerWontAdd:
    `Host will not add your code, add ${FRIEND_CODE_RAW} instead and post your pogo username`,
  hintAddCodeFirst:
    `Add ${FRIEND_CODE_RAW} and then use !raid to join queue`,
  hintUseRaidCommand:
    `!raid your_pogo_username. Use !help for more information`,
  help:
    `Add the host ${FRIEND_CODE_RAW} and tell host your username. Use !raid your_pogo_username to join the queue`,

  // spam detection
  spamWarning: (username: string) =>
    `@${username} Please don't repeat the same message.`,
  spamWindowSet: (username: string, seconds: number) =>
    seconds === 0
      ? `@${username} Spam detection is now off.`
      : `@${username} Spam detection window set to ${seconds} second${seconds === 1 ? '' : 's'}.`,
} as const;
