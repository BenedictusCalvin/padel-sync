/**
 * PDL UP — Padel Tournament & Matchmaker Engine
 * Algorithmic Scheduling & Tournament Operations
 * 
 * Supports:
 * - Americano: Individual (optimal non-repeating partners) OR Fixed Pair (Berger round-robin)
 * - Mexicano: Dynamic Swiss tiers (Rank 1+4 vs Rank 2+3, anti-duplicate partner)
 * - King of the Court: Court ladder with mandatory partner splits & bench challenger rotation
 * - Scoring: Fixed Points (16, 21, 24, 32) OR Tennis Games (Total / Race To)
 * - Fair Bench / Sit-out rotation balancer (max delta <= 1 match, anti-consecutive sit-outs)
 */

import type {
  TournamentConfig,
  Player,
  Court,
  Round,
  Match,
  Team,
  LeaderboardEntry,
  FixedPairTeam,
  TournamentAdvancedSettings,
  TiebreakingRule,
  LeaderboardPlayerRow
} from '../types/tournament';

// ============================================================================
// 1. Helper: Extract or Build Fixed Pair Teams from Players
// ============================================================================
export function extractFixedPairs(players: Player[]): FixedPairTeam[] {
  const pairs: FixedPairTeam[] = [];
  for (let i = 0; i < players.length; i += 2) {
    if (players[i] && players[i + 1]) {
      const p1 = players[i];
      const p2 = players[i + 1];
      const pairId = p1.pairId || `pair-${p1.id}-${p2.id}`;
      const pairName = p1.pairName || `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`;

      pairs.push({
        id: pairId,
        name: pairName,
        player1: p1,
        player2: p2,
        sitOutCount: Math.min(p1.sitOutCount ?? 0, p2.sitOutCount ?? 0),
        lastSitOutRound: Math.max(p1.lastSitOutRound ?? -1, p2.lastSitOutRound ?? -1),
        currentCourtLevel: p1.currentCourtLevel ?? Math.floor(pairs.length / 2) + 1
      });
    }
  }
  return pairs;
}

// ============================================================================
// 2. Fair Sit-out / Bench Rotation Balancer (Universal)
// ============================================================================

/**
 * Ensures sit-outs are distributed with mathematical fairness across the tournament:
 * 1. Players who rested in the immediate previous round MUST play (no back-to-back sit-outs).
 * 2. Players who have played the MOST matches have highest priority to sit out (keeps match delta <= 1).
 * 3. Players with fewest sit-outs sit out first; if tied, player who sat out furthest in the past sits out first.
 */
export function balanceBenchPlayers(
  players: Player[],
  capacityNeeded: number,
  roundNumber: number = 1,
  leaderboard: LeaderboardEntry[] = []
): { activePlayers: Player[]; benchPlayers: Player[] } {
  if (players.length <= capacityNeeded) {
    return {
      activePlayers: [...players],
      benchPlayers: []
    };
  }

  const benchCount = players.length - capacityNeeded;
  const prevRound = roundNumber - 1;

  // Compute matches played for each player
  const matchCountMap = new Map<string, number>();
  if (leaderboard.length > 0) {
    leaderboard.forEach(entry => {
      matchCountMap.set(entry.id, entry.matchesPlayed);
    });
  }

  players.forEach(p => {
    if (!matchCountMap.has(p.id)) {
      // Estimated matches played prior to this round
      const estimated = Math.max(0, prevRound - (p.sitOutCount || 0));
      matchCountMap.set(p.id, estimated);
    }
  });

  // Rule 1: Prevent back-to-back sit-outs
  const didRestLastRound = (p: Player) => (p.lastSitOutRound ?? -1) === prevRound;

  const canRest = players.filter(p => !didRestLastRound(p));
  const mustPlayIfPossible = players.filter(p => didRestLastRound(p));

  // Sort candidates to rest:
  // - Higher matches played -> rests first
  // - Lower sitOutCount -> rests first
  // - Smaller lastSitOutRound (-1, 1, 2...) -> sat out furthest in the past rests first
  const benchPriorityComparator = (a: Player, b: Player) => {
    const playedA = matchCountMap.get(a.id) ?? 0;
    const playedB = matchCountMap.get(b.id) ?? 0;
    if (playedA !== playedB) {
      return playedB - playedA; // Most matches played rests first!
    }
    if ((a.sitOutCount ?? 0) !== (b.sitOutCount ?? 0)) {
      return (a.sitOutCount ?? 0) - (b.sitOutCount ?? 0); // Fewest sit-outs rests first!
    }
    const lastA = a.lastSitOutRound ?? -1;
    const lastB = b.lastSitOutRound ?? -1;
    if (lastA !== lastB) {
      return lastA - lastB; // Sat out furthest in the past rests first!
    }
    return a.id.localeCompare(b.id);
  };

  canRest.sort(benchPriorityComparator);
  mustPlayIfPossible.sort(benchPriorityComparator);

  let benchPlayers: Player[] = [];
  if (canRest.length >= benchCount) {
    benchPlayers = canRest.slice(0, benchCount);
  } else {
    // Edge case where benchCount exceeds canRest pool size
    const remainder = benchCount - canRest.length;
    benchPlayers = [...canRest, ...mustPlayIfPossible.slice(0, remainder)];
  }

  const benchIds = new Set(benchPlayers.map(p => p.id));
  const activePlayers = players.filter(p => !benchIds.has(p.id));

  return { activePlayers, benchPlayers };
}

export function balanceBenchPairs(
  pairs: FixedPairTeam[],
  courtsCount: number,
  roundNumber: number = 1,
  leaderboard: LeaderboardEntry[] = []
): { activePairs: FixedPairTeam[]; benchPairs: FixedPairTeam[] } {
  const capacityNeeded = courtsCount * 2; // 2 pairs per court
  if (pairs.length <= capacityNeeded) {
    return {
      activePairs: [...pairs],
      benchPairs: []
    };
  }

  const benchCount = pairs.length - capacityNeeded;
  const prevRound = roundNumber - 1;

  const matchCountMap = new Map<string, number>();
  if (leaderboard.length > 0) {
    leaderboard.forEach(entry => {
      matchCountMap.set(entry.id, entry.matchesPlayed);
    });
  }

  pairs.forEach(p => {
    if (!matchCountMap.has(p.id)) {
      const estimated = Math.max(0, prevRound - (p.sitOutCount || 0));
      matchCountMap.set(p.id, estimated);
    }
  });

  const didRestLastRound = (p: FixedPairTeam) => (p.lastSitOutRound ?? -1) === prevRound;

  const canRest = pairs.filter(p => !didRestLastRound(p));
  const mustPlayIfPossible = pairs.filter(p => didRestLastRound(p));

  const benchPriorityComparator = (a: FixedPairTeam, b: FixedPairTeam) => {
    const playedA = matchCountMap.get(a.id) ?? 0;
    const playedB = matchCountMap.get(b.id) ?? 0;
    if (playedA !== playedB) {
      return playedB - playedA;
    }
    if ((a.sitOutCount ?? 0) !== (b.sitOutCount ?? 0)) {
      return (a.sitOutCount ?? 0) - (b.sitOutCount ?? 0);
    }
    const lastA = a.lastSitOutRound ?? -1;
    const lastB = b.lastSitOutRound ?? -1;
    if (lastA !== lastB) {
      return lastA - lastB;
    }
    return a.id.localeCompare(b.id);
  };

  canRest.sort(benchPriorityComparator);
  mustPlayIfPossible.sort(benchPriorityComparator);

  let benchPairs: FixedPairTeam[] = [];
  if (canRest.length >= benchCount) {
    benchPairs = canRest.slice(0, benchCount);
  } else {
    const remainder = benchCount - canRest.length;
    benchPairs = [...canRest, ...mustPlayIfPossible.slice(0, remainder)];
  }

  const benchIds = new Set(benchPairs.map(p => p.id));
  const activePairs = pairs.filter(p => !benchIds.has(p.id));

  return { activePairs, benchPairs };
}

// ============================================================================
// 3. Americano Schedulers
// ============================================================================

/**
 * Finds the optimal pair partitioning that minimizes repeat partnership history.
 * Uses branch-and-bound search with greedy heuristic ordering.
 */
function findOptimalAmericanoPairs(players: Player[]): [Player, Player][] {
  if (players.length < 2) return [];

  let bestPairs: [Player, Player][] = [];
  let minPenalty = Infinity;
  let iterations = 0;
  const maxIterations = 25000;

  function backtrack(remaining: Player[], currentPairs: [Player, Player][], currentPenalty: number) {
    if (remaining.length === 0) {
      if (currentPenalty < minPenalty) {
        minPenalty = currentPenalty;
        bestPairs = [...currentPairs];
      }
      return;
    }

    if (currentPenalty >= minPenalty) return; // Prune suboptimal branch
    iterations++;
    if (iterations > maxIterations) return; // Safeguard

    const p1 = remaining[0];
    const candidates = remaining.slice(1).map(cand => {
      const pHistory = p1.partnerHistory[cand.id] || 0;
      const oHistory = p1.opponentHistory[cand.id] || 0;
      const penalty = pHistory * 10000 + oHistory * 10;
      return { player: cand, penalty };
    });

    candidates.sort((a, b) => a.penalty - b.penalty);

    for (const cand of candidates) {
      const nextRemaining = remaining.slice(1).filter(p => p.id !== cand.player.id);
      backtrack(nextRemaining, [...currentPairs, [p1, cand.player]], currentPenalty + cand.penalty);
    }
  }

  backtrack(players, [], 0);
  return bestPairs;
}

/** Individual Americano (Optimal partner rotation with 0 - 0 default scores) */
export function scheduleIndividualAmericano(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number }
): Match[] {
  const courtCount = courts.length;
  const numMatches = Math.min(courtCount, Math.floor(activePlayers.length / 4));
  if (numMatches === 0) return [];

  const playersNeeded = numMatches * 4;
  const pool = activePlayers.slice(0, playersNeeded);

  // 1. Solve optimal pairs that minimize repeat partners
  const pairs = findOptimalAmericanoPairs(pool);

  // 2. Pair vs Pair court matching minimizing repeat opponents
  const matches: Match[] = [];
  const remainingPairs = [...pairs];

  for (let c = 0; c < numMatches; c++) {
    const court = courts[c];
    if (remainingPairs.length < 2) break;

    const pairA = remainingPairs.shift()!;

    let bestOpponentIdx = 0;
    let minOpponentPenalty = Infinity;

    for (let i = 0; i < remainingPairs.length; i++) {
      const pairB = remainingPairs[i];
      const oppPen =
        (pairA[0].opponentHistory[pairB[0].id] || 0) +
        (pairA[0].opponentHistory[pairB[1].id] || 0) +
        (pairA[1].opponentHistory[pairB[0].id] || 0) +
        (pairA[1].opponentHistory[pairB[1].id] || 0);

      if (oppPen < minOpponentPenalty) {
        minOpponentPenalty = oppPen;
        bestOpponentIdx = i;
      }
    }

    const [pairB] = remainingPairs.splice(bestOpponentIdx, 1);

    const teamA: Team = {
      id: `team-a-${roundNumber}-${court.id}`,
      name: `${pairA[0].name.split(' ')[0]} & ${pairA[1].name.split(' ')[0]}`,
      player1Id: pairA[0].id,
      player2Id: pairA[1].id,
      score: 0
    };

    const teamB: Team = {
      id: `team-b-${roundNumber}-${court.id}`,
      name: `${pairB[0].name.split(' ')[0]} & ${pairB[1].name.split(' ')[0]}`,
      player1Id: pairB[0].id,
      player2Id: pairB[1].id,
      score: 0
    };

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA,
      teamB,
      completed: false,
      roundNumber
    });
  }

  return matches;
}

/** Fixed Pair Americano (Berger polygon round-robin rotation) */
export function scheduleFixedPairAmericano(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number }
): Match[] {
  const pool = [...activePairs];
  if (pool.length % 2 !== 0) {
    pool.push({
      id: 'bye-pair',
      name: 'BYE',
      player1: { id: 'b1', name: 'BYE', sitOutCount: 0, partnerHistory: {}, opponentHistory: {}, courtHistory: {} },
      player2: { id: 'b2', name: 'BYE', sitOutCount: 0, partnerHistory: {}, opponentHistory: {}, courtHistory: {} },
      sitOutCount: 0
    });
  }

  const shift = (roundNumber - 1) % (pool.length - 1);
  const fixed = pool[0];
  const rest = pool.slice(1);
  for (let s = 0; s < shift; s++) {
    rest.unshift(rest.pop()!);
  }
  const rotated = [fixed, ...rest];

  const matches: Match[] = [];
  const numCourts = Math.min(courts.length, Math.floor(rotated.length / 2));

  for (let c = 0; c < numCourts; c++) {
    const pairA = rotated[c];
    const pairB = rotated[rotated.length - 1 - c];
    const court = courts[c];

    if (pairA.name !== 'BYE' && pairB.name !== 'BYE') {
      matches.push({
        id: `match-r${roundNumber}-c${court.id}`,
        courtId: court.id,
        courtName: court.name,
        teamA: {
          id: `team-a-${roundNumber}-${court.id}`,
          name: pairA.name,
          player1Id: pairA.player1.id,
          player2Id: pairA.player2.id,
          score: 0
        },
        teamB: {
          id: `team-b-${roundNumber}-${court.id}`,
          name: pairB.name,
          player1Id: pairB.player1.id,
          player2Id: pairB.player2.id,
          score: 0
        },
        completed: false,
        roundNumber
      });
    }
  }

  return matches;
}

// ============================================================================
// 4. Mexicano Schedulers
// ============================================================================

/**
 * Individual Mexicano:
 * 1. Active players are sorted by current leaderboard: Total Points Won > Diff > Matches Won.
 * 2. Court 1 gets Top 4, Court 2 gets next 4, etc.
 * 3. Inside each tier:
 *    - Standard combo: Team A = [Rank 1, Rank 4] vs Team B = [Rank 2, Rank 3].
 *    - If Rank 1 & 4 were partners in the previous round, fallback to Combo 2 ([Rank 1, Rank 3] vs [Rank 2, Rank 4]).
 * 4. Default score is 0 - 0 with completed = false.
 */
export function scheduleIndividualMexicano(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number },
  leaderboard: LeaderboardEntry[] = [],
  previousRound?: Round,
  advancedSettings?: TournamentAdvancedSettings
): Match[] {
  if (roundNumber === 1 || leaderboard.length === 0) {
    return scheduleIndividualAmericano(activePlayers, courts, roundNumber);
  }

  // 1. Sort active players by leaderboard rank
  const rankMap = new Map<string, number>();
  leaderboard.forEach((entry, idx) => {
    rankMap.set(entry.id, idx);
  });

  const rankedActive = [...activePlayers].sort((a, b) => {
    const rA = rankMap.get(a.id) ?? 999;
    const rB = rankMap.get(b.id) ?? 999;
    return rA - rB;
  });

  const numCourts = Math.min(courts.length, Math.floor(rankedActive.length / 4));
  const matches: Match[] = [];

  const werePartnersInPrevRound = (id1: string, id2: string): boolean => {
    if (!previousRound) return false;
    return previousRound.matches.some(m =>
      (m.teamA.player1Id === id1 && m.teamA.player2Id === id2) ||
      (m.teamA.player1Id === id2 && m.teamA.player2Id === id1) ||
      (m.teamB.player1Id === id1 && m.teamB.player2Id === id2) ||
      (m.teamB.player1Id === id2 && m.teamB.player2Id === id1)
    );
  };

  // 2. Tier assignment per court
  for (let c = 0; c < numCourts; c++) {
    const court = courts[c];
    const tier = rankedActive.slice(c * 4, c * 4 + 4);
    if (tier.length < 4) break;

    const [p1, p2, p3, p4] = tier;

    // Pairing combos in tier
    const combos = [
      { a: [p1, p4], b: [p2, p3], basePenalty: 0 },
      { a: [p1, p3], b: [p2, p4], basePenalty: 100 },
      { a: [p1, p2], b: [p3, p4], basePenalty: 250 }
    ];

    let bestCombo = combos[0];
    let minPenalty = Infinity;

    // Strict Ranking: purely Rank 1 & 4 vs Rank 2 & 3 without partner rotation balancing
    if (advancedSettings?.pairingAlgorithm === 'strict_ranking') {
      bestCombo = combos[0];
    } else {
      for (const combo of combos) {
        let penalty = combo.basePenalty;

        // Heavy penalty if paired in immediate previous round
        if (werePartnersInPrevRound(combo.a[0].id, combo.a[1].id)) penalty += 20000;
        if (werePartnersInPrevRound(combo.b[0].id, combo.b[1].id)) penalty += 20000;

        // Historical partner frequency penalty
        const histA = combo.a[0].partnerHistory[combo.a[1].id] || 0;
        const histB = combo.b[0].partnerHistory[combo.b[1].id] || 0;
        penalty += (histA + histB) * 500;

        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestCombo = combo;
        }
      }
    }

    const teamA: Team = {
      id: `team-a-${roundNumber}-${court.id}`,
      name: `${bestCombo.a[0].name.split(' ')[0]} & ${bestCombo.a[1].name.split(' ')[0]}`,
      player1Id: bestCombo.a[0].id,
      player2Id: bestCombo.a[1].id,
      score: 0
    };

    const teamB: Team = {
      id: `team-b-${roundNumber}-${court.id}`,
      name: `${bestCombo.b[0].name.split(' ')[0]} & ${bestCombo.b[1].name.split(' ')[0]}`,
      player1Id: bestCombo.b[0].id,
      player2Id: bestCombo.b[1].id,
      score: 0
    };

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA,
      teamB,
      completed: false,
      roundNumber
    });
  }

  return matches;
}

/** Fixed Pair Mexicano (Swiss ladder by pair standings) */
export function scheduleFixedPairMexicano(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number },
  leaderboard: LeaderboardEntry[] = []
): Match[] {
  if (roundNumber === 1 || leaderboard.length === 0) {
    return scheduleFixedPairAmericano(activePairs, courts, roundNumber);
  }

  const rankMap = new Map<string, number>();
  leaderboard.forEach((entry, idx) => {
    rankMap.set(entry.id, idx);
  });

  const rankedPairs = [...activePairs].sort((a, b) => {
    const rA = rankMap.get(a.id) ?? 999;
    const rB = rankMap.get(b.id) ?? 999;
    return rA - rB;
  });

  const matches: Match[] = [];
  const numCourts = Math.min(courts.length, Math.floor(rankedPairs.length / 2));

  for (let c = 0; c < numCourts; c++) {
    const court = courts[c];
    const pairA = rankedPairs[c * 2];
    const pairB = rankedPairs[c * 2 + 1];
    if (!pairA || !pairB) break;

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA: {
        id: `team-a-${roundNumber}-${court.id}`,
        name: pairA.name,
        player1Id: pairA.player1.id,
        player2Id: pairA.player2.id,
        score: 0
      },
      teamB: {
        id: `team-b-${roundNumber}-${court.id}`,
        name: pairB.name,
        player1Id: pairB.player1.id,
        player2Id: pairB.player2.id,
        score: 0
      },
      completed: false,
      roundNumber
    });
  }

  return matches;
}

// ============================================================================
// 5. King of the Court Schedulers
// ============================================================================

/**
 * Individual King of the Court:
 * - Court 1 = King Court (highest level), Court 2, ..., Court C = Bottom Court.
 * - Winners move up (Court N -> N-1), losers move down (Court N -> N+1).
 * - Incoming bench players challenge at the bottom court.
 * - MANDATORY PARTNER SPLIT: Previous partners w1 & w2 MUST be split and face each other as opponents!
 * - Default scores: 0 - 0 with completed = false.
 */
export function scheduleIndividualKing(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number },
  previousRound?: Round
): Match[] {
  const courtCount = courts.length;
  if (roundNumber === 1 || !previousRound || previousRound.matches.length === 0) {
    return scheduleIndividualAmericano(activePlayers, courts, roundNumber);
  }

  const activeLookup = new Map<string, Player>(activePlayers.map(p => [p.id, p]));
  const courtBuckets: Map<number, Player[]> = new Map();
  for (let i = 1; i <= courtCount; i++) {
    courtBuckets.set(i, []);
  }

  // Record former partnerships so they are strictly split
  const previousPartnerOf = new Map<string, string>();

  previousRound.matches.forEach(match => {
    const cLevel = match.courtId;
    const teamAWon = (match.teamA.score || 0) > (match.teamB.score || 0);
    const winTeam = teamAWon ? match.teamA : match.teamB;
    const loseTeam = teamAWon ? match.teamB : match.teamA;

    previousPartnerOf.set(winTeam.player1Id, winTeam.player2Id);
    previousPartnerOf.set(winTeam.player2Id, winTeam.player1Id);
    previousPartnerOf.set(loseTeam.player1Id, loseTeam.player2Id);
    previousPartnerOf.set(loseTeam.player2Id, loseTeam.player1Id);

    // Winners promote: Court N -> Court N - 1 (Court 1 winners stay)
    const winDest = Math.max(1, cLevel - 1);
    const w1 = activeLookup.get(winTeam.player1Id);
    const w2 = activeLookup.get(winTeam.player2Id);
    if (w1) courtBuckets.get(winDest)?.push(w1);
    if (w2) courtBuckets.get(winDest)?.push(w2);

    // Losers relegate: Court N -> Court N + 1 (Bottom court losers stay)
    const loseDest = Math.min(courtCount, cLevel + 1);
    const l1 = activeLookup.get(loseTeam.player1Id);
    const l2 = activeLookup.get(loseTeam.player2Id);
    if (l1) courtBuckets.get(loseDest)?.push(l1);
    if (l2) courtBuckets.get(loseDest)?.push(l2);
  });

  // Incoming bench players enter at the bottom court
  const assignedIds = new Set<string>();
  courtBuckets.forEach(list => list.forEach(p => assignedIds.add(p.id)));

  activePlayers.forEach(p => {
    if (!assignedIds.has(p.id)) {
      courtBuckets.get(courtCount)?.push(p);
      assignedIds.add(p.id);
    }
  });

  // Balance buckets so each court has exactly 4 players
  for (let c = 1; c <= courtCount; c++) {
    const bucket = courtBuckets.get(c)!;
    while (bucket.length > 4 && c < courtCount) {
      const overflow = bucket.pop()!;
      courtBuckets.get(c + 1)!.unshift(overflow);
    }
  }
  for (let c = courtCount; c >= 1; c--) {
    const bucket = courtBuckets.get(c)!;
    while (bucket.length > 4 && c > 1) {
      const overflow = bucket.shift()!;
      courtBuckets.get(c - 1)!.push(overflow);
    }
  }

  // Generate matches with MANDATORY PARTNER SPLIT
  const matches: Match[] = [];

  for (let c = 0; c < courtCount; c++) {
    const court = courts[c];
    const pool = courtBuckets.get(court.id) || [];
    if (pool.length < 4) continue;

    const [p1, p2, p3, p4] = pool.slice(0, 4);

    let teamAPlayers: [Player, Player] = [p1, p3];
    let teamBPlayers: [Player, Player] = [p2, p4];

    // Ensure former partners face each other
    const prevOfP1 = previousPartnerOf.get(p1.id);
    if (prevOfP1 === p3.id) {
      teamAPlayers = [p1, p2];
      teamBPlayers = [p3, p4];
    } else if (prevOfP1 === p4.id) {
      teamAPlayers = [p1, p2];
      teamBPlayers = [p4, p3];
    } else {
      teamAPlayers = [p1, p3];
      teamBPlayers = [p2, p4];
    }

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA: {
        id: `team-a-${roundNumber}-${court.id}`,
        name: `${teamAPlayers[0].name.split(' ')[0]} & ${teamAPlayers[1].name.split(' ')[0]}`,
        player1Id: teamAPlayers[0].id,
        player2Id: teamAPlayers[1].id,
        score: 0
      },
      teamB: {
        id: `team-b-${roundNumber}-${court.id}`,
        name: `${teamBPlayers[0].name.split(' ')[0]} & ${teamBPlayers[1].name.split(' ')[0]}`,
        player1Id: teamBPlayers[0].id,
        player2Id: teamBPlayers[1].id,
        score: 0
      },
      completed: false,
      roundNumber
    });
  }

  return matches;
}

/** Fixed Pair King of the Court (Winners promote, losers relegate, pairs stay together) */
export function scheduleFixedPairKing(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  _defaultInitialScores?: { a: number; b: number },
  previousRound?: Round
): Match[] {
  const courtCount = courts.length;
  if (roundNumber === 1 || !previousRound || previousRound.matches.length === 0) {
    return scheduleFixedPairAmericano(activePairs, courts, roundNumber);
  }

  const courtBuckets: Map<number, FixedPairTeam[]> = new Map();
  for (let i = 1; i <= courtCount; i++) {
    courtBuckets.set(i, []);
  }

  const pairLookup = new Map<string, FixedPairTeam>();
  activePairs.forEach(p => {
    pairLookup.set(`${p.player1.id}-${p.player2.id}`, p);
    pairLookup.set(`${p.player2.id}-${p.player1.id}`, p);
  });

  previousRound.matches.forEach(m => {
    const currentCourtLevel = m.courtId;
    const teamAWon = (m.teamA.score || 0) > (m.teamB.score || 0);
    const winnerTeam = teamAWon ? m.teamA : m.teamB;
    const loserTeam = teamAWon ? m.teamB : m.teamA;

    const winPair = pairLookup.get(`${winnerTeam.player1Id}-${winnerTeam.player2Id}`);
    const losePair = pairLookup.get(`${loserTeam.player1Id}-${loserTeam.player2Id}`);

    const winDest = Math.max(1, currentCourtLevel - 1);
    if (winPair) courtBuckets.get(winDest)?.push(winPair);

    const loseDest = Math.min(courtCount, currentCourtLevel + 1);
    if (losePair) courtBuckets.get(loseDest)?.push(losePair);
  });

  // Assign any incoming bench pairs to bottom court
  const assignedPairIds = new Set<string>();
  courtBuckets.forEach(list => list.forEach(p => assignedPairIds.add(p.id)));

  activePairs.forEach(p => {
    if (!assignedPairIds.has(p.id)) {
      courtBuckets.get(courtCount)?.push(p);
      assignedPairIds.add(p.id);
    }
  });

  // Balance pairs across courts
  for (let c = 1; c <= courtCount; c++) {
    const bucket = courtBuckets.get(c)!;
    while (bucket.length > 2 && c < courtCount) {
      const overflow = bucket.pop()!;
      courtBuckets.get(c + 1)!.unshift(overflow);
    }
  }

  const matches: Match[] = [];

  for (let c = 0; c < courtCount; c++) {
    const court = courts[c];
    const candidates = courtBuckets.get(court.id) || [];
    if (candidates.length < 2) continue;

    const [pairA, pairB] = candidates.slice(0, 2);

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA: {
        id: `team-a-${roundNumber}-${court.id}`,
        name: pairA.name,
        player1Id: pairA.player1.id,
        player2Id: pairA.player2.id,
        score: 0
      },
      teamB: {
        id: `team-b-${roundNumber}-${court.id}`,
        name: pairB.name,
        player1Id: pairB.player1.id,
        player2Id: pairB.player2.id,
        score: 0
      },
      completed: false,
      roundNumber
    });
  }

  return matches;
}

// ============================================================================
// 6. Master Round Generator
// ============================================================================

export function generateNextRound(
  config: TournamentConfig,
  players: Player[],
  courts: Court[],
  roundNumber: number,
  previousRound?: Round,
  leaderboard: LeaderboardEntry[] = []
): { round: Round; updatedPlayers: Player[] } {
  // CRITICAL RULE: Scores ALWAYS initialize to 0 - 0 for every new round
  const defaultScores = { a: 0, b: 0 };

  let matches: Match[] = [];
  let benchPlayerIds: string[] = [];
  let updatedPlayers = [...players];

  if (config.pairingMode === 'fixed_pair') {
    const fixedPairs = extractFixedPairs(players);
    const { activePairs, benchPairs } = balanceBenchPairs(fixedPairs, config.courtCount, roundNumber, leaderboard);

    benchPlayerIds = benchPairs.flatMap(bp => [bp.player1.id, bp.player2.id]);

    // Update sit-out metadata
    updatedPlayers = players.map(p => {
      const isBench = benchPlayerIds.includes(p.id);
      if (isBench) {
        return {
          ...p,
          sitOutCount: (p.sitOutCount ?? 0) + 1,
          lastSitOutRound: roundNumber
        };
      }
      return p;
    });

    if (config.format === 'americano') {
      matches = scheduleFixedPairAmericano(activePairs, courts, roundNumber, defaultScores);
    } else if (config.format === 'mexicano') {
      matches = scheduleFixedPairMexicano(activePairs, courts, roundNumber, defaultScores, leaderboard);
    } else if (config.format === 'king_of_the_court') {
      matches = scheduleFixedPairKing(activePairs, courts, roundNumber, defaultScores, previousRound);
    }
  } else {
    // Individual mode
    const capacityNeeded = config.courtCount * 4;
    const { activePlayers, benchPlayers } = balanceBenchPlayers(players, capacityNeeded, roundNumber, leaderboard);

    benchPlayerIds = benchPlayers.map(p => p.id);

    // Update sit-out metadata
    updatedPlayers = players.map(p => {
      const isBench = benchPlayerIds.includes(p.id);
      if (isBench) {
        return {
          ...p,
          sitOutCount: (p.sitOutCount ?? 0) + 1,
          lastSitOutRound: roundNumber
        };
      }
      return p;
    });

    if (config.format === 'americano') {
      matches = scheduleIndividualAmericano(activePlayers, courts, roundNumber, defaultScores);
    } else if (config.format === 'mexicano') {
      matches = scheduleIndividualMexicano(activePlayers, courts, roundNumber, defaultScores, leaderboard, previousRound, config.advancedSettings);
    } else if (config.format === 'king_of_the_court') {
      matches = scheduleIndividualKing(activePlayers, courts, roundNumber, defaultScores, previousRound);
    }
  }

  // Update partnership, opponent, and court histories
  matches.forEach(m => {
    const p1A = updatedPlayers.find(p => p.id === m.teamA.player1Id);
    const p2A = updatedPlayers.find(p => p.id === m.teamA.player2Id);
    const p1B = updatedPlayers.find(p => p.id === m.teamB.player1Id);
    const p2B = updatedPlayers.find(p => p.id === m.teamB.player2Id);

    if (p1A && p2A) {
      p1A.partnerHistory[p2A.id] = (p1A.partnerHistory[p2A.id] || 0) + 1;
      p2A.partnerHistory[p1A.id] = (p2A.partnerHistory[p1A.id] || 0) + 1;
    }
    if (p1B && p2B) {
      p1B.partnerHistory[p2B.id] = (p1B.partnerHistory[p2B.id] || 0) + 1;
      p2B.partnerHistory[p1B.id] = (p2B.partnerHistory[p1B.id] || 0) + 1;
    }

    const teamAIds = [m.teamA.player1Id, m.teamA.player2Id];
    const teamBIds = [m.teamB.player1Id, m.teamB.player2Id];

    teamAIds.forEach(idA => {
      const p = updatedPlayers.find(pl => pl.id === idA);
      if (p) {
        p.courtHistory[m.courtId] = (p.courtHistory[m.courtId] || 0) + 1;
        p.currentCourtLevel = m.courtId;
        teamBIds.forEach(idB => {
          p.opponentHistory[idB] = (p.opponentHistory[idB] || 0) + 1;
        });
      }
    });

    teamBIds.forEach(idB => {
      const p = updatedPlayers.find(pl => pl.id === idB);
      if (p) {
        p.courtHistory[m.courtId] = (p.courtHistory[m.courtId] || 0) + 1;
        p.currentCourtLevel = m.courtId;
        teamAIds.forEach(idA => {
          p.opponentHistory[idA] = (p.opponentHistory[idA] || 0) + 1;
        });
      }
    });
  });

  const round: Round = {
    roundNumber,
    matches,
    benchPlayerIds,
    completed: false,
    generatedAt: Date.now()
  };

  return { round, updatedPlayers };
}

// ============================================================================
// 7. Live Leaderboard Calculation & Advanced Tiebreaker Rules
// ============================================================================

/**
 * Calculates direct head-to-head match outcomes between two players across completed matches.
 */
export function getHeadToHeadResult(
  idA: string,
  idB: string,
  rounds: Round[]
): {
  matchesCount: number;
  netPoints: number; // positive if A scored more than B in direct matchups
  netWins: number; // positive if A won more direct matchups against B
} {
  let aPoints = 0;
  let bPoints = 0;
  let aWins = 0;
  let bWins = 0;
  let matchesCount = 0;

  rounds.forEach(rnd => {
    rnd.matches.forEach(m => {
      if (!m.completed) return;
      const teamAIds = [m.teamA.player1Id, m.teamA.player2Id];
      const teamBIds = [m.teamB.player1Id, m.teamB.player2Id];

      const aInA = teamAIds.includes(idA);
      const bInA = teamAIds.includes(idB);
      const aInB = teamBIds.includes(idA);
      const bInB = teamBIds.includes(idB);

      if (aInA && bInB) {
        matchesCount++;
        aPoints += m.teamA.score || 0;
        bPoints += m.teamB.score || 0;
        if ((m.teamA.score || 0) > (m.teamB.score || 0)) aWins++;
        else if ((m.teamB.score || 0) > (m.teamA.score || 0)) bWins++;
      } else if (aInB && bInA) {
        matchesCount++;
        aPoints += m.teamB.score || 0;
        bPoints += m.teamA.score || 0;
        if ((m.teamB.score || 0) > (m.teamA.score || 0)) aWins++;
        else if ((m.teamA.score || 0) > (m.teamB.score || 0)) bWins++;
      }
    });
  });

  return {
    matchesCount,
    netPoints: aPoints - bPoints,
    netWins: aWins - bWins
  };
}

/**
 * Applies advanced rules:
 * - Compensation Points (+M) for players with fewer matches (if not disabled)
 * - Sorting by Wins before Points (if enabled)
 * - Tiebreaker selection: 'diff' | 'head_to_head' | 'allow_tied'
 */
export function sortLeaderboardWithAdvancedRules(
  entries: LeaderboardEntry[],
  rounds: Round[] = [],
  settings?: TournamentAdvancedSettings
): LeaderboardEntry[] {
  const disableCompensation = settings?.disableCompensationPoints ?? false;
  const sortByWinsFirst = settings?.sortByWinsBeforePoints ?? false;
  const tieRule: TiebreakingRule = settings?.tiebreakingRule ?? 'diff';

  // 1. Calculate Compensation Points (+M)
  const maxMatches = Math.max(0, ...entries.map(e => e.matchesPlayed));

  entries.forEach(entry => {
    if (!disableCompensation && maxMatches > 0 && entry.matchesPlayed > 0 && entry.matchesPlayed < maxMatches) {
      const avgPts = entry.pointsWon / entry.matchesPlayed;
      const missingMatches = maxMatches - entry.matchesPlayed;
      const comp = Math.round(avgPts * missingMatches);
      entry.compensationPoints = comp;
      entry.effectivePoints = entry.pointsWon + comp;
    } else {
      entry.compensationPoints = 0;
      entry.effectivePoints = entry.pointsWon;
    }
  });

  // 2. Sorting comparator
  entries.sort((a, b) => {
    const ptsA = a.effectivePoints ?? a.pointsWon;
    const ptsB = b.effectivePoints ?? b.pointsWon;

    if (sortByWinsFirst) {
      if (b.matchesWon !== a.matchesWon) {
        return b.matchesWon - a.matchesWon;
      }
      if (ptsB !== ptsA) {
        return ptsB - ptsA;
      }
    } else {
      if (ptsB !== ptsA) {
        return ptsB - ptsA;
      }
      if (tieRule === 'diff') {
        if (b.pointDiff !== a.pointDiff) {
          return b.pointDiff - a.pointDiff;
        }
      }
      if (b.matchesWon !== a.matchesWon) {
        return b.matchesWon - a.matchesWon;
      }
    }

    // Secondary Tiebreaker
    if (tieRule === 'head_to_head' && rounds.length > 0) {
      const h2h = getHeadToHeadResult(a.id, b.id, rounds);
      if (h2h.matchesCount > 0) {
        if (h2h.netWins !== 0) return -h2h.netWins;
        if (h2h.netPoints !== 0) return -h2h.netPoints;
      }
    }

    if (b.pointDiff !== a.pointDiff) {
      return b.pointDiff - a.pointDiff;
    }

    if (a.pointsConceded !== b.pointsConceded) {
      return a.pointsConceded - b.pointsConceded;
    }

    if (a.matchesPlayed !== b.matchesPlayed) {
      return a.matchesPlayed - b.matchesPlayed;
    }

    return a.name.localeCompare(b.name);
  });

  // 3. Assign Ranks (handling Allow Tied Ranks)
  entries.forEach((entry, index) => {
    if (index === 0) {
      entry.rank = 1;
      return;
    }

    const prev = entries[index - 1];
    const ptsPrev = prev.effectivePoints ?? prev.pointsWon;
    const ptsCurr = entry.effectivePoints ?? entry.pointsWon;

    const isTied =
      ptsPrev === ptsCurr &&
      prev.matchesWon === entry.matchesWon &&
      (tieRule === 'allow_tied' || prev.pointDiff === entry.pointDiff);

    if (tieRule === 'allow_tied' && isTied) {
      entry.rank = prev.rank;
    } else {
      entry.rank = index + 1;
    }
  });

  return entries;
}

/**
 * Maps standard LeaderboardEntry + Round history into PDL UP LeaderboardPlayerRow
 * with G, W, L, T, DIFF, matchHistoryDots, +M compensation, and totalPoints.
 */
export function mapLeaderboardToPlayerRows(
  leaderboard: LeaderboardEntry[],
  rounds: Round[] = []
): LeaderboardPlayerRow[] {
  return leaderboard.map((entry, idx) => {
    const historyDots: ('win' | 'loss' | 'tie')[] = [];

    // Chronologically traverse completed rounds to extract match results for this player/pair
    rounds.forEach(round => {
      round.matches.forEach(m => {
        if (!m.completed) return;
        const inTeamA =
          m.teamA.player1Id === entry.id ||
          m.teamA.player2Id === entry.id ||
          m.teamA.id === entry.id;
        const inTeamB =
          m.teamB.player1Id === entry.id ||
          m.teamB.player2Id === entry.id ||
          m.teamB.id === entry.id;

        const scoreA = m.teamA.score ?? 0;
        const scoreB = m.teamB.score ?? 0;

        if (inTeamA) {
          if (scoreA > scoreB) historyDots.push('win');
          else if (scoreB > scoreA) historyDots.push('loss');
          else historyDots.push('tie');
        } else if (inTeamB) {
          if (scoreB > scoreA) historyDots.push('win');
          else if (scoreA > scoreB) historyDots.push('loss');
          else historyDots.push('tie');
        }
      });
    });

    return {
      rank: entry.rank ?? idx + 1,
      id: entry.id,
      name: entry.name,
      gamesPlayed: entry.matchesPlayed,
      wins: entry.matchesWon,
      losses: entry.matchesLost,
      ties: entry.matchesTied,
      pointDiff: entry.pointDiff,
      matchHistoryDots: historyDots.slice(-16), // Maksimal 12-16 titik riwayat
      compensationPoints: entry.compensationPoints || 0,
      totalPoints: entry.effectivePoints ?? entry.pointsWon
    };
  });
}

export function recalculateLeaderboard(
  players: Player[],
  rounds: Round[],
  pairingMode: 'individual' | 'fixed_pair',
  advancedSettings?: TournamentAdvancedSettings
): LeaderboardEntry[] {
  const statsMap = new Map<string, LeaderboardEntry>();

  if (pairingMode === 'fixed_pair') {
    const fixedPairs = extractFixedPairs(players);
    fixedPairs.forEach(pair => {
      statsMap.set(pair.id, {
        id: pair.id,
        name: pair.name,
        isPair: true,
        player1Name: pair.player1.name,
        player2Name: pair.player2.name,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
        pointsWon: 0,
        pointsConceded: 0,
        pointDiff: 0,
        sitOutCount: pair.sitOutCount ?? 0,
        winRate: 0,
        currentCourtLevel: pair.currentCourtLevel
      });
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
        // ONLY count matches that have been verified/completed
        if (!match.completed) return;
        const scA = Number(match.teamA.score) || 0;
        const scB = Number(match.teamB.score) || 0;

        const pairA = fixedPairs.find(
          p => (p.player1.id === match.teamA.player1Id && p.player2.id === match.teamA.player2Id) ||
               (p.player1.id === match.teamA.player2Id && p.player2.id === match.teamA.player1Id)
        );
        const pairB = fixedPairs.find(
          p => (p.player1.id === match.teamB.player1Id && p.player2.id === match.teamB.player2Id) ||
               (p.player1.id === match.teamB.player2Id && p.player2.id === match.teamB.player1Id)
        );

        if (pairA) {
          const entryA = statsMap.get(pairA.id);
          if (entryA) {
            entryA.matchesPlayed++;
            entryA.pointsWon += scA;
            entryA.pointsConceded += scB;
            entryA.pointDiff = entryA.pointsWon - entryA.pointsConceded;
            if (scA > scB) entryA.matchesWon++;
            else if (scA < scB) entryA.matchesLost++;
            else entryA.matchesTied++;
          }
        }

        if (pairB) {
          const entryB = statsMap.get(pairB.id);
          if (entryB) {
            entryB.matchesPlayed++;
            entryB.pointsWon += scB;
            entryB.pointsConceded += scA;
            entryB.pointDiff = entryB.pointsWon - entryB.pointsConceded;
            if (scB > scA) entryB.matchesWon++;
            else if (scB < scA) entryB.matchesLost++;
            else entryB.matchesTied++;
          }
        }
      });
    });
  } else {
    // Individual calculation
    players.forEach(p => {
      statsMap.set(p.id, {
        id: p.id,
        name: p.name,
        isPair: false,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
        pointsWon: 0,
        pointsConceded: 0,
        pointDiff: 0,
        sitOutCount: p.sitOutCount ?? 0,
        winRate: 0,
        currentCourtLevel: p.currentCourtLevel
      });
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
        // ONLY count matches that have been verified/completed
        if (!match.completed) return;
        const scA = Number(match.teamA.score) || 0;
        const scB = Number(match.teamB.score) || 0;

        const teamAPlayerIds = [match.teamA.player1Id, match.teamA.player2Id];
        const teamBPlayerIds = [match.teamB.player1Id, match.teamB.player2Id];

        teamAPlayerIds.forEach(id => {
          const entry = statsMap.get(id);
          if (entry) {
            entry.matchesPlayed++;
            entry.pointsWon += scA;
            entry.pointsConceded += scB;
            entry.pointDiff = entry.pointsWon - entry.pointsConceded;
            if (scA > scB) entry.matchesWon++;
            else if (scA < scB) entry.matchesLost++;
            else entry.matchesTied++;
          }
        });

        teamBPlayerIds.forEach(id => {
          const entry = statsMap.get(id);
          if (entry) {
            entry.matchesPlayed++;
            entry.pointsWon += scB;
            entry.pointsConceded += scA;
            entry.pointDiff = entry.pointsWon - entry.pointsConceded;
            if (scB > scA) entry.matchesWon++;
            else if (scB < scA) entry.matchesLost++;
            else entry.matchesTied++;
          }
        });
      });
    });
  }

  const entries = Array.from(statsMap.values()).map(e => ({
    ...e,
    winRate: e.matchesPlayed > 0 ? Math.round((e.matchesWon / e.matchesPlayed) * 100) : 0
  }));

  return sortLeaderboardWithAdvancedRules(entries, rounds, advancedSettings);
}
