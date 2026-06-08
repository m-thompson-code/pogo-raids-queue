import { describe, it, expect } from 'vitest';
import { messages } from './messages.js';

describe('messages', () => {
  describe('raid', () => {
    it('raidQueueClosed mentions the username', () => {
      expect(messages.raidQueueClosed('moo')).toContain('@moo');
    });
    it('raidMissingUsername includes !raid and the username', () => {
      const msg = messages.raidMissingUsername('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('!raid');
    });
    it('raidInvalidUsername mentions the username', () => {
      expect(messages.raidInvalidUsername('moo')).toContain('@moo');
    });
    it('raidAdded mentions the pogo username', () => {
      expect(messages.raidAdded('TrainerAsh')).toContain('TrainerAsh');
    });
  });

  describe('leave', () => {
    it('leaveRemoved mentions the pogo username', () => {
      expect(messages.leaveRemoved('TrainerAsh')).toContain('TrainerAsh');
    });
  });

  describe('remove', () => {
    it('removeUsage mentions the username and !remove', () => {
      const msg = messages.removeUsage('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('!remove');
    });
    it('removeSuccess mentions the pogo username', () => {
      expect(messages.removeSuccess('TrainerAsh')).toContain('TrainerAsh');
    });
    it('removeNotFound mentions the pogo username', () => {
      expect(messages.removeNotFound('TrainerAsh')).toContain('TrainerAsh');
    });
  });

  describe('add', () => {
    it('addUsage mentions the username', () => {
      expect(messages.addUsage('moo')).toContain('@moo');
    });
    it('addSuccess includes listed names and noun', () => {
      expect(messages.addSuccess('Ash, Misty', 'have')).toContain('Ash, Misty');
      expect(messages.addSuccess('Ash, Misty', 'have')).toContain('have');
    });
  });

  describe('list', () => {
    it('listEmpty returns a non-empty string', () => {
      expect(messages.listEmpty().length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('clearSuccess mentions the username', () => {
      expect(messages.clearSuccess('moo')).toContain('@moo');
    });
  });

  describe('open / close', () => {
    it('openSuccess mentions the username and !raid', () => {
      const msg = messages.openSuccess('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('!raid');
    });
    it('closeSuccess mentions the username', () => {
      expect(messages.closeSuccess('moo')).toContain('@moo');
    });
  });

  describe('strike', () => {
    it('strikeUsage mentions the username and !strike', () => {
      const msg = messages.strikeUsage('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('!strike');
    });
    it('strikeNotFound mentions both caller and target', () => {
      const msg = messages.strikeNotFound('moo', 'BadGuy');
      expect(msg).toContain('@moo');
      expect(msg).toContain('BadGuy');
    });
    it('strikeConfirm uses singular "strike" for count 1', () => {
      expect(messages.strikeConfirm('BadGuy', 1)).toContain('1 strike');
      expect(messages.strikeConfirm('BadGuy', 1)).not.toContain('strikes');
    });
    it('strikeConfirm uses plural "strikes" for count > 1', () => {
      expect(messages.strikeConfirm('BadGuy', 2)).toContain('2 strikes');
    });
    it('strikeConfirm includes warning at 3+ strikes', () => {
      expect(messages.strikeConfirm('BadGuy', 3)).toContain('timed out');
      expect(messages.strikeConfirm('BadGuy', 2)).not.toContain('timed out');
    });
  });

  describe('hints', () => {
    it('hintRaidCommand mentions username and !raid', () => {
      const msg = messages.hintRaidCommand('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('!raid');
    });
    it('hintHowToJoin mentions username and friend code', () => {
      const msg = messages.hintHowToJoin('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('8357 6698 6460');
    });
    it('hintCode returns the friend code', () => {
      expect(messages.hintCode('moo')).toContain('8357 6698 6460');
    });
    it('hintAddStreamer mentions username and friend code', () => {
      const msg = messages.hintAddStreamer('moo');
      expect(msg).toContain('@moo');
      expect(msg).toContain('8357 6698 6460');
    });
  });

  describe('spam detection', () => {
    it('spamWarning mentions the username', () => {
      expect(messages.spamWarning('moo')).toContain('@moo');
    });
    it('spamWindowSet with 0 says off', () => {
      expect(messages.spamWindowSet('moo', 0)).toContain('off');
    });
    it('spamWindowSet with seconds mentions duration', () => {
      const msg = messages.spamWindowSet('moo', 30);
      expect(msg).toContain('@moo');
      expect(msg).toContain('30');
    });
    it('spamWindowSet uses singular for 1 second', () => {
      expect(messages.spamWindowSet('moo', 1)).toContain('1 second');
      expect(messages.spamWindowSet('moo', 1)).not.toContain('seconds');
    });
  });
});
