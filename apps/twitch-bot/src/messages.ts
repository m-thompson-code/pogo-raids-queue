// ─────────────────────────────────────────────────────────────────────────────
// Bot chat messages
//
// All text the bot sends to chat lives here.
// Edit this file to change what the bot says.
// ─────────────────────────────────────────────────────────────────────────────

export const messages = {
  // !raid
  raidQueueClosed: (username: string) =>
    `@${username} Raids are currently closed.`,
  raidMissingUsername: (username: string) =>
    `@${username} !raid YourPogoUsername to join the queue!`,
  raidInvalidUsername: (username: string) =>
    `@${username} Your pogo username includes an invalid character.`,
  raidAdded: (username: string) =>
    `@${username} You've been added to the queue!`,

  // !leave
  leaveRemoved: (username: string) =>
    `@${username} You've been removed from the queue.`,

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
  addSuccess: (username: string, listed: string, noun: string) =>
    `@${username} ${listed} ${noun} been added to the queue.`,

  // !list
  listEmpty: () =>
    `The queue is empty.`,

  // !clear
  clearSuccess: (username: string) =>
    `@${username} The raid queue has been cleared.`,

  // !open
  openSuccess: (username: string) =>
    `@${username} The queue is now open! !raid YourPogoUsername to join.`,

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
  hintRaidCommand: (username: string) =>
    `@${username} !raid YourPogoUsername to join the queue!`,
  hintHowToJoin: (username: string) =>
    `@${username} Friend request using code 8357 6698 6460, then !raid YourPogoUsername to join the queue!`,
  hintCode: (_username: string) =>
    `8357 6698 6460`,
  hintAddStreamer: (username: string) =>
    `@${username} You need to add the streamer! Send a friend request using code 8357 6698 6460, then !raid YourPogoUsername to join the queue.`,

  // spam detection
  spamWarning: (username: string) =>
    `@${username} Please don't repeat the same message.`,
  spamWindowSet: (username: string, seconds: number) =>
    seconds === 0
      ? `@${username} Spam detection is now off.`
      : `@${username} Spam detection window set to ${seconds} second${seconds === 1 ? '' : 's'}.`,
} as const;
