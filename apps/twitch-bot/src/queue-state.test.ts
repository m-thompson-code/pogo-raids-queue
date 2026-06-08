import { describe, it, expect } from 'vitest';
import { isQueueOpen, openQueue, closeQueue } from './queue-state.js';

// Reset to open state before each test (default is true at module load)
beforeEach(() => openQueue());

describe('queue-state', () => {
  it('is open by default', () => {
    expect(isQueueOpen()).toBe(true);
  });

  it('closeQueue closes the queue', () => {
    closeQueue();
    expect(isQueueOpen()).toBe(false);
  });

  it('openQueue re-opens a closed queue', () => {
    closeQueue();
    openQueue();
    expect(isQueueOpen()).toBe(true);
  });

  it('openQueue on an already-open queue is a no-op', () => {
    openQueue();
    expect(isQueueOpen()).toBe(true);
  });

  it('closeQueue on an already-closed queue is a no-op', () => {
    closeQueue();
    closeQueue();
    expect(isQueueOpen()).toBe(false);
  });
});
