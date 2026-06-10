import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApp = { name: '[DEFAULT]' };
const mockDb = {};
const mockInitializeApp = vi.fn(() => mockApp);
const mockGetApps = vi.fn<() => unknown[]>(() => []);
const mockApplicationDefault = vi.fn(() => ({}));
const mockGetFirestore = vi.fn(() => mockDb);

vi.mock('firebase-admin/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  applicationDefault: mockApplicationDefault,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
}));

const { getFirebaseApp, getDb } = await import('./firebase.js');

describe('getFirebaseApp', () => {
  beforeEach(() => {
    mockInitializeApp.mockReset();
    mockGetApps.mockReset();
    mockApplicationDefault.mockReset();
    mockApplicationDefault.mockReturnValue({});
  });

  it('initializes a new app when none exist', () => {
    mockGetApps.mockReturnValue([]);
    process.env['FIREBASE_PROJECT_ID'] = 'test-project';

    const app = getFirebaseApp();

    expect(mockInitializeApp).toHaveBeenCalledOnce();
    expect(mockInitializeApp).toHaveBeenCalledWith({
      credential: {},
      projectId: 'test-project',
    });
    expect(app).toBe(mockApp);
  });

  it('returns the existing app without re-initializing when one already exists', () => {
    const existingApp = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([existingApp]);

    const app = getFirebaseApp();

    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(app).toBe(existingApp);
  });
});

describe('getDb', () => {
  it('returns a Firestore instance', () => {
    mockGetApps.mockReturnValue([mockApp]);
    mockGetFirestore.mockClear();

    const db = getDb();

    expect(mockGetFirestore).toHaveBeenCalledOnce();
    expect(db).toBe(mockDb);
  });
});
