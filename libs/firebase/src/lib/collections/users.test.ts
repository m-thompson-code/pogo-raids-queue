import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore mock primitives ────────────────────────────────────────────────

const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockTransactionGet = vi.fn();

const mockTransaction = {
  get: mockTransactionGet,
  set: mockSet,
  update: mockUpdate,
};

const mockDocRef = {
  set: mockSet,
  get: mockGet,
};

const mockDoc = vi.fn(() => mockDocRef);
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

const mockRunTransaction = vi.fn((fn: (t: typeof mockTransaction) => Promise<void>) =>
  fn(mockTransaction)
);

const mockDb = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
};

const SENTINEL_INCREMENT = Symbol('increment');
const SENTINEL_TIMESTAMP = Symbol('serverTimestamp');

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: vi.fn(() => SENTINEL_INCREMENT),
    serverTimestamp: vi.fn(() => SENTINEL_TIMESTAMP),
  },
}));

vi.mock('../core/firebase.js', () => ({
  getDb: vi.fn(() => mockDb),
}));

const { upsertUser, strikeUser } = await import('./users.js');

// ── Shared test data ─────────────────────────────────────────────────────────

const baseParams = {
  twitchUserId: 'user-123',
  twitchUsername: 'moomoomamoo',
  pogoUsername: 'CoolTrainer',
  isSubscriber: true,
  isVip: false,
};

// ── upsertUser ───────────────────────────────────────────────────────────────

describe('upsertUser', () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockTransactionGet.mockReset();
    mockRunTransaction.mockImplementation((fn: (t: typeof mockTransaction) => Promise<void>) =>
      fn(mockTransaction)
    );
  });

  it('creates a new document with createdAt when user does not exist', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await upsertUser(baseParams);

    expect(mockSet).toHaveBeenCalledOnce();
    const [, data] = mockSet.mock.calls[0];
    expect(data).toMatchObject({
      twitchUserId: 'user-123',
      twitchUsername: 'moomoomamoo',
      pogoUsername: 'CoolTrainer',
      isSubscriber: true,
      isVip: false,
      raidCount: SENTINEL_INCREMENT,
      lastRaided: SENTINEL_TIMESTAMP,
      createdAt: SENTINEL_TIMESTAMP,
    });
  });

  it('updates existing document without overwriting createdAt if already set', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ createdAt: SENTINEL_TIMESTAMP }),
    });

    await upsertUser(baseParams);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, data] = mockUpdate.mock.calls[0];
    expect(data).not.toHaveProperty('createdAt');
    expect(data).toMatchObject({
      twitchUserId: 'user-123',
      raidCount: SENTINEL_INCREMENT,
    });
  });

  it('adds createdAt when updating a document that is missing it', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({}),
    });

    await upsertUser(baseParams);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, data] = mockUpdate.mock.calls[0];
    expect(data).toHaveProperty('createdAt', SENTINEL_TIMESTAMP);
  });

  it('looks up the correct document by twitchUserId', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await upsertUser(baseParams);

    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('user-123');
  });
});

// ── strikeUser ───────────────────────────────────────────────────────────────

describe('strikeUser', () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockGet.mockReset();
  });

  it('increments strikes by 1 when no value is provided', async () => {
    mockGet.mockResolvedValue({ data: () => ({ strikes: 3 }) });

    const result = await strikeUser('moomoomamoo', 'user-123');

    expect(mockSet).toHaveBeenCalledOnce();
    const [data] = mockSet.mock.calls[0];
    expect(data.strikes).toBe(SENTINEL_INCREMENT);
    expect(result).toBe(3);
  });

  it('sets strikes to an explicit value when one is provided', async () => {
    mockGet.mockResolvedValue({ data: () => ({ strikes: 5 }) });

    const result = await strikeUser('moomoomamoo', 'user-123', 5);

    const [data] = mockSet.mock.calls[0];
    expect(data.strikes).toBe(5);
    expect(result).toBe(5);
  });

  it('strips leading @ from twitchUsername and lowercases it', async () => {
    mockGet.mockResolvedValue({ data: () => ({ strikes: 1 }) });

    await strikeUser('@MooMooMamoo', 'user-123');

    const [data] = mockSet.mock.calls[0];
    expect(data.twitchUsername).toBe('moomoomamoo');
  });

  it('returns 0 when strikes field is missing from the document', async () => {
    mockGet.mockResolvedValue({ data: () => ({}) });

    const result = await strikeUser('moomoomamoo', 'user-123');

    expect(result).toBe(0);
  });
});
