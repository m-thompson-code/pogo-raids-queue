import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore mock primitives ─────────────────────────────────────────────────

const SENTINEL_TIMESTAMP = Symbol('serverTimestamp');

const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockTransactionGet = vi.fn();

const mockTransaction = {
  get: mockTransactionGet,
  set: mockSet,
  update: mockUpdate,
};

const mockRunTransaction = vi.fn(
  (fn: (t: typeof mockTransaction) => Promise<void>) => fn(mockTransaction),
);

// Per-doc get/delete — rebuilt per test via mockDoc
const mockDocGet = vi.fn();
const makeDocRef = () => ({ get: mockDocGet, delete: mockDelete });

const mockDoc = vi.fn(() => makeDocRef());

// Collection builder — returns different things for chained vs direct calls
const mockCollectionGet = vi.fn();
const mockOrderBy = vi.fn(() => ({ get: mockCollectionGet }));
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
  get: mockCollectionGet,
  orderBy: mockOrderBy,
}));

const mockDb = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
};

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => SENTINEL_TIMESTAMP),
    increment: vi.fn((n: number) => ({ increment: n })),
  },
}));

vi.mock('../core/firebase.js', () => ({
  getDb: vi.fn(() => mockDb),
}));

const {
  addToQueue,
  clearQueue,
  getQueue,
  addManualToQueue,
  removeFromQueueByTwitchId,
  removeFromQueueByPogoUsername,
} = await import('./queue.js');

// ── Shared params ─────────────────────────────────────────────────────────────

const baseParams = {
  twitchUserId: 'user-123',
  twitchUsername: 'moomoomamoo',
  pogoUsername: 'CoolTrainer',
  isSubscriber: true,
  isVip: false,
};

const resetMocks = () => {
  mockSet.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockDocGet.mockReset();
  mockTransactionGet.mockReset();
  mockCollectionGet.mockReset();
  mockDoc.mockImplementation(() => makeDocRef());
  mockRunTransaction.mockImplementation(
    (fn: (t: typeof mockTransaction) => Promise<void>) => fn(mockTransaction),
  );
};

// ── addToQueue ────────────────────────────────────────────────────────────────

describe('addToQueue', () => {
  beforeEach(resetMocks);

  it('creates a new entry with joinedAt when user is not in the queue', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await addToQueue(baseParams);

    expect(mockSet).toHaveBeenCalledOnce();
    const [, data] = mockSet.mock.calls[0];
    expect(data).toMatchObject({
      twitchUserId: 'user-123',
      twitchUsername: 'moomoomamoo',
      pogoUsername: 'CoolTrainer',
      isSubscriber: true,
      isVip: false,
      status: 'joined',
      joinedAt: SENTINEL_TIMESTAMP,
    });
  });

  it('updates profile fields only (no joinedAt) when user is already in the queue', async () => {
    mockTransactionGet.mockResolvedValue({ exists: true });

    await addToQueue(baseParams);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, data] = mockUpdate.mock.calls[0];
    expect(data).not.toHaveProperty('joinedAt');
    expect(data).toMatchObject({
      twitchUserId: 'user-123',
      pogoUsername: 'CoolTrainer',
    });
  });

  it('targets the raidQueue collection with twitchUserId as document key', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await addToQueue(baseParams);

    expect(mockCollection).toHaveBeenCalledWith('raidQueue');
    expect(mockDoc).toHaveBeenCalledWith('user-123');
  });
});

// ── clearQueue ────────────────────────────────────────────────────────────────

describe('clearQueue', () => {
  beforeEach(resetMocks);

  it('deletes all documents in the collection', async () => {
    const del1 = vi.fn();
    const del2 = vi.fn();
    mockCollectionGet.mockResolvedValue({
      docs: [{ ref: { delete: del1 } }, { ref: { delete: del2 } }],
    });

    await clearQueue();

    expect(del1).toHaveBeenCalledOnce();
    expect(del2).toHaveBeenCalledOnce();
  });

  it('does nothing when the queue is empty', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });

    await expect(clearQueue()).resolves.toBeUndefined();
  });
});

// ── getQueue ──────────────────────────────────────────────────────────────────

describe('getQueue', () => {
  beforeEach(resetMocks);

  const fakeDate = new Date('2024-01-01T00:00:00Z');

  it('returns mapped entries with converted joinedAt dates', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            twitchUserId: 'user-1',
            twitchUsername: 'alice',
            pogoUsername: 'Alice99',
            isSubscriber: false,
            isVip: true,
            status: 'invited',
            joinedAt: { toDate: () => fakeDate },
          }),
        },
      ],
    });

    const result = await getQueue();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      twitchUserId: 'user-1',
      twitchUsername: 'alice',
      pogoUsername: 'Alice99',
      isSubscriber: false,
      isVip: true,
      status: 'invited',
      joinedAt: fakeDate,
    });
  });

  it('falls back to new Date() when joinedAt has no toDate method', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            twitchUserId: 'user-2',
            twitchUsername: 'bob',
            pogoUsername: 'Bob42',
            isSubscriber: false,
            isVip: false,
            joinedAt: null,
          }),
        },
      ],
    });

    const before = Date.now();
    const result = await getQueue();
    const after = Date.now();

    expect(result[0].joinedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result[0].joinedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns an empty array when the queue is empty', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });

    const result = await getQueue();

    expect(result).toEqual([]);
  });

  it('queries with orderBy joinedAt asc', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });

    await getQueue();

    expect(mockOrderBy).toHaveBeenCalledWith('joinedAt', 'asc');
  });

  it('defaults status to joined when field is missing from document', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            twitchUserId: 'user-3',
            twitchUsername: 'charlie',
            pogoUsername: 'Charlie1',
            isSubscriber: false,
            isVip: false,
            joinedAt: { toDate: () => new Date() },
          }),
        },
      ],
    });

    const result = await getQueue();

    expect(result[0].status).toBe('joined');
  });
});

// ── addManualToQueue ──────────────────────────────────────────────────────────

describe('addManualToQueue', () => {
  beforeEach(resetMocks);

  it('creates an entry with synthetic twitchUserId when not already present', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await addManualToQueue('ManualTrainer');

    expect(mockSet).toHaveBeenCalledOnce();
    const [, data] = mockSet.mock.calls[0];
    expect(data).toMatchObject({
      twitchUserId: 'manual-ManualTrainer',
      twitchUsername: '',
      pogoUsername: 'ManualTrainer',
      isSubscriber: false,
      isVip: false,
      status: 'joined',
      joinedAt: SENTINEL_TIMESTAMP,
    });
  });

  it('does not create a duplicate entry when one already exists', async () => {
    mockTransactionGet.mockResolvedValue({ exists: true });

    await addManualToQueue('ManualTrainer');

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('uses manual-<pogoUsername> as the document key', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await addManualToQueue('Pikachu99');

    expect(mockDoc).toHaveBeenCalledWith('manual-Pikachu99');
  });
});

// ── removeFromQueueByTwitchId ─────────────────────────────────────────────────

describe('removeFromQueueByTwitchId', () => {
  beforeEach(resetMocks);

  it('deletes the document and returns the pogoUsername when found', async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ pogoUsername: 'CoolTrainer' }),
    });
    const docRef = { get: mockDocGet, delete: mockDelete };
    mockDoc.mockReturnValue(docRef);

    const result = await removeFromQueueByTwitchId('user-123');

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(result).toBe('CoolTrainer');
  });

  it('returns null and still calls delete when document does not exist', async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    const docRef = { get: mockDocGet, delete: mockDelete };
    mockDoc.mockReturnValue(docRef);

    const result = await removeFromQueueByTwitchId('user-999');

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });
});

// ── removeFromQueueByPogoUsername ─────────────────────────────────────────────

describe('removeFromQueueByPogoUsername', () => {
  beforeEach(resetMocks);

  it('deletes the matching document and returns true (case-insensitive)', async () => {
    const mockMatchDelete = vi.fn();
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({ pogoUsername: 'CoolTrainer' }),
          ref: { delete: mockMatchDelete },
        },
        {
          data: () => ({ pogoUsername: 'OtherTrainer' }),
          ref: { delete: vi.fn() },
        },
      ],
    });

    const result = await removeFromQueueByPogoUsername('cooltrainer');

    expect(mockMatchDelete).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('returns false when no matching entry is found', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({ pogoUsername: 'OtherTrainer' }),
          ref: { delete: vi.fn() },
        },
      ],
    });

    const result = await removeFromQueueByPogoUsername('NoSuchTrainer');

    expect(result).toBe(false);
  });

  it('returns false when the queue is empty', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });

    const result = await removeFromQueueByPogoUsername('anyone');

    expect(result).toBe(false);
  });
});
