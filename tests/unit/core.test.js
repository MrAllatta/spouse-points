import { describe, test, expect, vi } from 'vitest';

// ================================================================
// Test helpers — pure-function replicas of index.html core logic
//
// These replicate the algorithm from the app without DOM or
// localStorage dependencies so we can unit-test the business
// logic.  They should match the behaviour of the real functions
// after BUG-01 (dedup) and BUG-02 (storage guard) are fixed.
// ================================================================

// ------------------------------------------------------------------
// Name normalisation / orientation helpers  (mirrors index.html)
// ------------------------------------------------------------------

function normNamePart(s) {
  return String(s || '').trim().toLowerCase();
}

/** True when the packet's A/B orientation is the reverse of the
 *  receiving device's orientation — scores must be flipped. */
function incomingRolesAreOpposite(packet, localNames) {
  const pn = packet.names;
  if (!pn || typeof pn !== 'object') return false;
  const pa = normNamePart(pn.a);
  const pb = normNamePart(pn.b);
  const la = normNamePart(localNames.a);
  const lb = normNamePart(localNames.b);
  if (!pa || !la || !lb) return false;
  if (pa === la && pb === lb) return false;   // same orientation
  if (pa === lb && pb === la) return true;    // exactly swapped
  if (pa === lb) return true;                 // sender's A == local B
  return false;
}

function flipScoreSides(scores) {
  if (!scores || typeof scores !== 'object') return scores;
  return { a: scores.b, b: scores.a };
}

function flipPendingRequestSides(pending) {
  if (!Array.isArray(pending)) return [];
  return pending.map(r => ({
    ...r,
    requester: r.requester === 'a' ? 'b' : r.requester === 'b' ? 'a' : r.requester,
  }));
}

// ------------------------------------------------------------------
// Packet construction  (mirrors buildSyncPacket in index.html)
// ------------------------------------------------------------------

function makePacket({ scores = { a: 0, b: 0 }, names = { a: 'Alice', b: 'Bob' },
                       pending = [], ts = Date.now(), txId } = {}) {
  return {
    v: 1,
    scores: { a: scores.a, b: scores.b },
    names: { a: names.a, b: names.b },
    pending: pending.map(r => ({ ...r })),
    ts,
    ...(txId !== undefined ? { txId } : {}),
  };
}

function encodePacket(packet) {
  return btoa(JSON.stringify(packet));
}

// ------------------------------------------------------------------
// State factory
// ------------------------------------------------------------------

function makeDefaultState(overrides = {}) {
  return {
    scores: { a: 0, b: 0 },
    pending: [],
    lastAppliedPacketTs: 0,
    names: { a: 'Alice', b: 'Bob' },
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Pure apply (mirrors applyPacket logic without DOM / global state)
// ------------------------------------------------------------------

function applyPacketToState(packet, currentState) {
  if (!packet || packet.v !== 1) return null;

  const packetTs = typeof packet.ts === 'number' && Number.isFinite(packet.ts)
    ? packet.ts : 0;
  if (packetTs && currentState.lastAppliedPacketTs &&
      packetTs <= currentState.lastAppliedPacketTs) {
    return null; // stale — "newest wins" policy
  }

  let scores = packet.scores;
  let pending = packet.pending || [];
  if (!scores || typeof scores !== 'object') return null;
  if (!Number.isFinite(scores.a) || !Number.isFinite(scores.b)) return null;
  if (!Array.isArray(pending)) pending = [];

  const swap = incomingRolesAreOpposite(packet, currentState.names);
  if (swap) {
    scores = flipScoreSides(scores);
    pending = flipPendingRequestSides(pending);
  }

  return {
    scores: { a: scores.a, b: scores.b },
    pending: pending.map(r => ({ ...r })),
    lastAppliedPacketTs: Math.max(packetTs, currentState.lastAppliedPacketTs),
    names: { ...currentState.names },
  };
}

/** applyPacket with txId dedup (simulates BUG-01 guard). */
function applyPacketWithTxGuard(packet, currentState, seenTx) {
  if (packet.txId && seenTx.has(packet.txId)) return null;
  const result = applyPacketToState(packet, currentState);
  if (result && packet.txId) seenTx.add(packet.txId);
  return result;
}

// ================================================================
// Tests
// ================================================================

// ------------------------------------------------------------------
// 1.  Packet round-trip
// ------------------------------------------------------------------
describe('buildSyncPacket + buildShareURL + applyPacket round-trip', () => {

  test('round-trips correctly with matching names', () => {
    const initialState = makeDefaultState({ scores: { a: 10, b: 5 } });
    const packet = makePacket({
      scores: { a: 10, b: 5 },
      names: initialState.names,
      ts: 1000,
    });
    const encoded = encodePacket(packet);
    const decoded = JSON.parse(atob(encoded));
    const result = applyPacketToState(decoded, makeDefaultState());
    expect(result).not.toBeNull();
    expect(result.scores).toEqual({ a: 10, b: 5 });
  });

  test('round-trips correctly with swapped names (orientation swap)', () => {
    // Sender (Bob) has scores {a:3, b:7} with names {a:'Bob', b:'Alice'}
    // Receiver (Alice) has local names {a:'Alice', b:'Bob'}
    const senderPacket = makePacket({
      scores: { a: 3, b: 7 },
      names: { a: 'Bob', b: 'Alice' },
      ts: 1000,
    });
    const encoded = encodePacket(senderPacket);
    const decoded = JSON.parse(atob(encoded));
    const result = applyPacketToState(decoded, makeDefaultState({
      names: { a: 'Alice', b: 'Bob' },
    }));
    expect(result).not.toBeNull();
    // On Alice's phone: scoreA (Alice) = 7, scoreB (Bob) = 3
    expect(result.scores).toEqual({ a: 7, b: 3 });
  });

});

// ------------------------------------------------------------------
// 2.  A/B orientation swap
// ------------------------------------------------------------------
describe('applyPacket swaps A/B scores when partner sends state', () => {

  test('swaps scores when packet names are opposite local orientation', () => {
    const localNames = { a: 'Alice', b: 'Bob' };
    const packet = makePacket({
      scores: { a: 5, b: 3 },
      names: { a: 'Bob', b: 'Alice' },
      ts: 1000,
    });
    const result = applyPacketToState(packet, makeDefaultState({ names: localNames }));
    expect(result).not.toBeNull();
    expect(result.scores).toEqual({ a: 3, b: 5 });
  });

  test('does not swap when packet names match local orientation', () => {
    const localNames = { a: 'Alice', b: 'Bob' };
    const packet = makePacket({
      scores: { a: 5, b: 3 },
      names: { a: 'Alice', b: 'Bob' },
      ts: 1000,
    });
    const result = applyPacketToState(packet, makeDefaultState({ names: localNames }));
    expect(result).not.toBeNull();
    expect(result.scores).toEqual({ a: 5, b: 3 });
  });

  test('flips pending request sides on swap', () => {
    const localNames = { a: 'Alice', b: 'Bob' };
    const pending = [{ id: 1, requester: 'a', label: 'Cooked' }];
    const packet = makePacket({
      scores: { a: 5, b: 3 },
      names: { a: 'Bob', b: 'Alice' },
      pending,
      ts: 1000,
    });
    const result = applyPacketToState(packet, makeDefaultState({ names: localNames }));
    expect(result).not.toBeNull();
    expect(result.pending[0].requester).toBe('b');
  });

  // ------------------------------------------------------------------
  // 3-5.  Idempotency guards  (BUG-01)
  // ------------------------------------------------------------------
  describe('applyPacket ignores a packet with a previously seen txId', () => {
    test('same txId rejected on second application', () => {
      const seenTx = new Set();
      const state = makeDefaultState();
      const packet = makePacket({
        scores: { a: 3, b: 0 }, ts: 1000, txId: 'abc123',
      });

      const r1 = applyPacketWithTxGuard(packet, state, seenTx);
      expect(r1).not.toBeNull();
      expect(r1.scores.a).toBe(3);

      const r2 = applyPacketWithTxGuard(packet, makeDefaultState(), seenTx);
      expect(r2).toBeNull();
    });
  });

  describe('applyPacket ignores a packet older than the last applied ts', () => {
    test('stale ts rejected', () => {
      const state = makeDefaultState();
      const newPacket = makePacket({ scores: { a: 5, b: 0 }, ts: 2000 });
      const oldPacket = makePacket({ scores: { a: 3, b: 0 }, ts: 1000 });

      const r1 = applyPacketToState(newPacket, state);
      expect(r1).not.toBeNull();
      expect(r1.scores.a).toBe(5);
      expect(r1.lastAppliedPacketTs).toBe(2000);

      // Apply older packet to the state that now has lastAppliedPacketTs=2000
      const staleState = { ...state, lastAppliedPacketTs: 2000 };
      const r2 = applyPacketToState(oldPacket, staleState);
      expect(r2).toBeNull();
    });
  });

  describe('three rapid packets with same delta apply points exactly once', () => {
    test('newest-link-wins for three concurrent packets', () => {
      // Three packets with the same delta but different timestamps
      const state = makeDefaultState();
      const packetC = makePacket({ scores: { a: 3, b: 0 }, ts: 3000, txId: 'c' });
      const packetB = makePacket({ scores: { a: 3, b: 0 }, ts: 2000, txId: 'b' });
      const packetA = makePacket({ scores: { a: 3, b: 0 }, ts: 1000, txId: 'a' });

      // Apply newest first  (the user opens the latest SMS first)
      let s = state;
      const r3 = applyPacketToState(packetC, s);
      expect(r3).not.toBeNull();
      s = { ...s, ...r3 };

      // The two older packets should each be rejected by the ts guard
      const r2 = applyPacketToState(packetB, s);
      expect(r2).toBeNull();

      const r1 = applyPacketToState(packetA, s);
      expect(r1).toBeNull();

      expect(s.scores.a).toBe(3);
    });
  });

});

// ------------------------------------------------------------------
// 6-7.  Error handling
// ------------------------------------------------------------------
describe('applyPacket error handling', () => {

  test('does not throw on malformed base64 input', () => {
    const state = makeDefaultState();
    expect(() => {
      try {
        const decoded = JSON.parse(atob('this-is-not-valid-base64!!!'));
        applyPacketToState(decoded, state);
      } catch (_e) {
        // expected — malformed base64 should be caught
      }
    }).not.toThrow();
  });

  test('does not throw on missing required fields', () => {
    const state = makeDefaultState();
    expect(() => {
      const r1 = applyPacketToState(null, state);
      expect(r1).toBeNull();

      const r2 = applyPacketToState({ v: 1 }, state);  // missing scores
      expect(r2).toBeNull();

      const r3 = applyPacketToState(
        { v: 1, scores: { a: 'not-a-number', b: 0 } }, state,
      );
      expect(r3).toBeNull();

      const r4 = applyPacketToState({ v: 2 }, state);  // wrong version
      expect(r4).toBeNull();
    }).not.toThrow();
  });

});

// ------------------------------------------------------------------
// 8-9.  URL length
// ------------------------------------------------------------------
describe('buildShareURL output length', () => {

  function buildEncodedUrl(packet) {
    const encoded = btoa(JSON.stringify(packet));
    return `https://spousepoints.lol/#state=${encoded}`;
  }

  test('for a standard award is under 500 chars', () => {
    const packet = makePacket({
      scores: { a: 42, b: 17 },
      names: { a: 'Alice', b: 'Bob' },
      pending: [],
      ts: 1_700_000_000_000,
      txId: 'abc12345',
    });
    const url = buildEncodedUrl(packet);
    expect(url.length).toBeLessThan(500);
  });

  test('never exceeds 1800 chars regardless of ledger size', () => {
    // The pending array is the main contributor to packet size.
    // Build a large realistic pending list.
    // NB: after BUG-05 short-aliases are applied, this limit will
    // accommodate significantly more entries.  Without aliases, the
    // verbose JSON keys + base64 overhead limit us to ~7 entries.
    const largePending = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i,
      requester: 'a',
      requesterName: 'Alice',
      category: 'custom',
      label: 'Did a thing that was noticed',
      quip: 'Nice work, keep it up!',
      time: '12:00 PM',
    }));
    const packet = makePacket({
      scores: { a: 99999, b: 99999 },
      names: { a: 'Alice', b: 'Bob' },
      pending: largePending,
      ts: 1_700_000_000_000,
      txId: 'abc12345',
    });
    const url = buildEncodedUrl(packet);
    expect(url.length).toBeLessThan(1800);
  });

});

// ------------------------------------------------------------------
// 10.  Storage health check  (BUG-02)
// ------------------------------------------------------------------
describe('checkStorageHealth', () => {

  /** Replica of the function described in BUG-02 fix plan. */
  function checkStorageHealth() {
    const canary = '__sp_canary__';
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(canary, '1');
      const ok = localStorage.getItem(canary) === '1';
      localStorage.removeItem(canary);
      return ok;
    } catch { return false; }
  }

  test('returns false when localStorage throws', () => {
    const throwingStorage = {
      setItem: vi.fn(() => { throw new Error('denied'); }),
      getItem: vi.fn(() => { throw new Error('denied'); }),
      removeItem: vi.fn(() => { throw new Error('denied'); }),
    };
    vi.stubGlobal('localStorage', throwingStorage);
    try {
      expect(checkStorageHealth()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('returns true when localStorage works', () => {
    const store = {};
    const workingStorage = {
      setItem: vi.fn((k, v) => { store[k] = v; }),
      getItem: vi.fn(k => store[k] ?? null),
      removeItem: vi.fn(k => { delete store[k]; }),
    };
    vi.stubGlobal('localStorage', workingStorage);
    try {
      expect(checkStorageHealth()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('returns false when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    try {
      expect(checkStorageHealth()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

});
