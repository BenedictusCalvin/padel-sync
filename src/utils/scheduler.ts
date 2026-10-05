/**
 * PDL UP — Padel Tournament & Matchmaker Engine
 * Algorithmic Scheduling & Tournament Operations
 * 
 * Supports:
 * - Americano: Individual (rotate partner & opponent) OR Fixed Pair (round-robin teams)
 * - Mexicano: Individual (dynamic Swiss tiers) OR Fixed Pair (ladder pairing by team standing)
 * - King of the Court: Individual (partner split) OR Fixed Pair (pair moves together)
 * - Scoring: Fixed Points (16, 21, 24, 32) OR Tennis Games (Total of X Games, Race to X Games)
 * - Fair Bench / Sit-out rotation balancer
 */

import type {
  TournamentConfig,
  Player,
  Court,
  Round,
  Match,
  Team,
  LeaderboardEntry,
  FixedPairTeam
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
        sitOutCount: Math.min(p1.sitOutCount, p2.sitOutCount),
        lastSitOutRound: Math.max(p1.lastSitOutRound ?? -1, p2.lastSitOutRound ?? -1),
        currentCourtLevel: p1.currentCourtLevel ?? Math.floor(pairs.length / 2) + 1
      });
    }
  }
  return pairs;
}

// ============================================================================
// 2. Fair Sit-out / Bench Rotation Balancer
// ============================================================================
export function balanceBenchPlayers(
  players: Player[],
  capacityNeeded: number,
  _roundNumber?: number
): { activePlayers: Player[]; benchPlayers: Player[] } {
  if (players.length <= capacityNeeded) {
    return {
      activePlayers: [...players],
      benchPlayers: []
    };
  }

  const benchCount = players.length - capacityNeeded;

  const sortedForBench = [...players].sort((a, b) => {
    if (a.sitOutCount !== b.sitOutCount) {
      return a.sitOutCount - b.sitOutCount;
    }
    const lastA = a.lastSitOutRound ?? -1;
    const lastB = b.lastSitOutRound ?? -1;
    if (lastA !== lastB) {
      return lastA - lastB;
    }
    return a.id.localeCompare(b.id);
  });

  const benchPlayers = sortedForBench.slice(0, benchCount);
  const benchIds = new Set(benchPlayers.map(p => p.id));
  const activePlayers = players.filter(p => !benchIds.has(p.id));

  return { activePlayers, benchPlayers };
}

export function balanceBenchPairs(
  pairs: FixedPairTeam[],
  courtsCount: number,
  _roundNumber?: number
): { activePairs: FixedPairTeam[]; benchPairs: FixedPairTeam[] } {
  const capacityNeeded = courtsCount * 2; // 2 pairs per court
  if (pairs.length <= capacityNeeded) {
    return {
      activePairs: [...pairs],
      benchPairs: []
    };
  }

  const benchCount = pairs.length - capacityNeeded;
  const sorted = [...pairs].sort((a, b) => {
    if (a.sitOutCount !== b.sitOutCount) {
      return a.sitOutCount - b.sitOutCount;
    }
    const lastA = a.lastSitOutRound ?? -1;
    const lastB = b.lastSitOutRound ?? -1;
    if (lastA !== lastB) return lastA - lastB;
    return a.id.localeCompare(b.id);
  });

  const benchPairs = sorted.slice(0, benchCount);
  const benchIds = new Set(benchPairs.map(p => p.id));
  const activePairs = pairs.filter(p => !benchIds.has(p.id));

  return { activePairs, benchPairs };
}

// ============================================================================
// 3. Americano Schedulers
// ============================================================================

/** Individual Americano (Minimizes duplicate partner & opponent) */
export function scheduleIndividualAmericano(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number }
): Match[] {
  const courtCount = courts.length;
  const pool = [...activePlayers];
  const pairs: [Player, Player][] = [];

  while (pool.length >= 2) {
    const p1 = pool.shift()!;
    let bestPartnerIdx = 0;
    let minPenalty = Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const partnerTimes = p1.partnerHistory[candidate.id] || 0;
      const opponentTimes = p1.opponentHistory[candidate.id] || 0;
      const penalty = partnerTimes * 1000 + opponentTimes * 10;
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestPartnerIdx = i;
      }
    }

    const [p2] = pool.splice(bestPartnerIdx, 1);
    pairs.push([p1, p2]);
  }

  const matches: Match[] = [];
  for (let c = 0; c < courtCount; c++) {
    const pairA = pairs[c * 2];
    const pairB = pairs[c * 2 + 1];
    if (!pairA || !pairB) break;
    const court = courts[c];

    const teamA: Team = {
      id: `team-a-${roundNumber}-${court.id}`,
      name: `${pairA[0].name.split(' ')[0]} & ${pairA[1].name.split(' ')[0]}`,
      player1Id: pairA[0].id,
      player2Id: pairA[1].id,
      score: defaultInitialScores.a
    };

    const teamB: Team = {
      id: `team-b-${roundNumber}-${court.id}`,
      name: `${pairB[0].name.split(' ')[0]} & ${pairB[1].name.split(' ')[0]}`,
      player1Id: pairB[0].id,
      player2Id: pairB[1].id,
      score: defaultInitialScores.b
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

/** Fixed Pair Americano (Round Robin among pairs with Berger polygon rotation) */
export function scheduleFixedPairAmericano(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number }
): Match[] {
  const pool = [...activePairs];
  if (pool.length % 2 !== 0) {
    // Dummy bye pair if odd
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
          score: defaultInitialScores.a
        },
        teamB: {
          id: `team-b-${roundNumber}-${court.id}`,
          name: pairB.name,
          player1Id: pairB.player1.id,
          player2Id: pairB.player2.id,
          score: defaultInitialScores.b
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

/** Individual Mexicano (Tiered grouping by individual leaderboard rank) */
export function scheduleIndividualMexicano(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number },
  leaderboard: LeaderboardEntry[]
): Match[] {
  if (roundNumber === 1 || leaderboard.length === 0) {
    return scheduleIndividualAmericano(activePlayers, courts, roundNumber, defaultInitialScores);
  }

  const rankMap = new Map<string, number>();
  leaderboard.forEach((entry, idx) => {
    rankMap.set(entry.id, idx);
  });

  const rankedActive = [...activePlayers].sort((a, b) => {
    const rA = rankMap.get(a.id) ?? 999;
    const rB = rankMap.get(b.id) ?? 999;
    return rA - rB;
  });

  const matches: Match[] = [];

  for (let c = 0; c < courts.length; c++) {
    const court = courts[c];
    const tier = rankedActive.slice(c * 4, c * 4 + 4);
    if (tier.length < 4) break;

    const [p1, p2, p3, p4] = tier;
    const combos = [
      { a: [p1, p4], b: [p2, p3] },
      { a: [p1, p3], b: [p2, p4] },
      { a: [p1, p2], b: [p3, p4] }
    ];

    let bestCombo = combos[0];
    let lowestPenalty = Infinity;

    for (const combo of combos) {
      const penaltyA = combo.a[0].partnerHistory[combo.a[1].id] || 0;
      const penaltyB = combo.b[0].partnerHistory[combo.b[1].id] || 0;
      const total = penaltyA + penaltyB;
      if (total < lowestPenalty) {
        lowestPenalty = total;
        bestCombo = combo;
      }
    }

    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA: {
        id: `team-a-${roundNumber}-${court.id}`,
        name: `${bestCombo.a[0].name.split(' ')[0]} & ${bestCombo.a[1].name.split(' ')[0]}`,
        player1Id: bestCombo.a[0].id,
        player2Id: bestCombo.a[1].id,
        score: defaultInitialScores.a
      },
      teamB: {
        id: `team-b-${roundNumber}-${court.id}`,
        name: `${bestCombo.b[0].name.split(' ')[0]} & ${bestCombo.b[1].name.split(' ')[0]}`,
        player1Id: bestCombo.b[0].id,
        player2Id: bestCombo.b[1].id,
        score: defaultInitialScores.b
      },
      completed: false,
      roundNumber
    });
  }

  return matches;
}

/** Fixed Pair Mexicano (Pair Swiss ladder: Rank 1 pair vs Rank 2 pair on Court 1, etc.) */
export function scheduleFixedPairMexicano(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number },
  leaderboard: LeaderboardEntry[]
): Match[] {
  if (roundNumber === 1 || leaderboard.length === 0) {
    return scheduleFixedPairAmericano(activePairs, courts, roundNumber, defaultInitialScores);
  }

  // Sort pairs by pair leaderboard rank
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
    const pairA = rankedPairs[c * 2];
    const pairB = rankedPairs[c * 2 + 1];
    const court = courts[c];

    if (pairA && pairB) {
      matches.push({
        id: `match-r${roundNumber}-c${court.id}`,
        courtId: court.id,
        courtName: court.name,
        teamA: {
          id: `team-a-${roundNumber}-${court.id}`,
          name: pairA.name,
          player1Id: pairA.player1.id,
          player2Id: pairA.player2.id,
          score: defaultInitialScores.a
        },
        teamB: {
          id: `team-b-${roundNumber}-${court.id}`,
          name: pairB.name,
          player1Id: pairB.player1.id,
          player2Id: pairB.player2.id,
          score: defaultInitialScores.b
        },
        completed: false,
        roundNumber
      });
    }
  }

  return matches;
}

// ============================================================================
// 5. King of the Court Schedulers
// ============================================================================

/** Individual King of the Court (Winners promote, losers relegate, partners split) */
export function scheduleIndividualKing(
  activePlayers: Player[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number },
  previousRound?: Round
): Match[] {
  const courtCount = courts.length;
  if (roundNumber === 1 || !previousRound || !previousRound.completed) {
    return scheduleIndividualAmericano(activePlayers, courts, roundNumber, defaultInitialScores);
  }

  const courtBuckets: Map<number, Player[]> = new Map();
  for (let i = 1; i <= courtCount; i++) {
    courtBuckets.set(i, []);
  }

  const playerLookup = new Map<string, Player>(activePlayers.map(p => [p.id, p]));

  previousRound.matches.forEach((match) => {
    const currentCourtLevel = match.courtId;
    const teamAWon = match.teamA.score > match.teamB.score;
    const winnerTeam = teamAWon ? match.teamA : match.teamB;
    const loserTeam = winnerTeam === match.teamA ? match.teamB : match.teamA;

    const winP1 = playerLookup.get(winnerTeam.player1Id);
    const winP2 = playerLookup.get(winnerTeam.player2Id);
    const loseP1 = playerLookup.get(loserTeam.player1Id);
    const loseP2 = playerLookup.get(loserTeam.player2Id);

    const winDest = Math.max(1, currentCourtLevel - 1);
    if (winP1) courtBuckets.get(winDest)?.push(winP1);
    if (winP2) courtBuckets.get(winDest)?.push(winP2);

    const loseDest = Math.min(courtCount, currentCourtLevel + 1);
    if (loseP1) courtBuckets.get(loseDest)?.push(loseP1);
    if (loseP2) courtBuckets.get(loseDest)?.push(loseP2);
  });

  const matches: Match[] = [];

  for (let c = 0; c < courtCount; c++) {
    const court = courts[c];
    const candidates = courtBuckets.get(court.id) || [];

    while (candidates.length < 4) {
      const remaining = activePlayers.find(p => !candidates.includes(p));
      if (remaining) candidates.push(remaining);
      else break;
    }

    const [p1, p2, p3, p4] = candidates.slice(0, 4);
    if (!p1 || !p2 || !p3 || !p4) continue;

    // Split partners: 1+3 vs 2+4
    matches.push({
      id: `match-r${roundNumber}-c${court.id}`,
      courtId: court.id,
      courtName: court.name,
      teamA: {
        id: `team-a-${roundNumber}-${court.id}`,
        name: `${p1.name.split(' ')[0]} & ${p3.name.split(' ')[0]}`,
        player1Id: p1.id,
        player2Id: p3.id,
        score: defaultInitialScores.a
      },
      teamB: {
        id: `team-b-${roundNumber}-${court.id}`,
        name: `${p2.name.split(' ')[0]} & ${p4.name.split(' ')[0]}`,
        player1Id: p2.id,
        player2Id: p4.id,
        score: defaultInitialScores.b
      },
      completed: false,
      roundNumber
    });
  }

  return matches;
}

/** Fixed Pair King of the Court (Winners promote, losers relegate, pairs stay together!) */
export function scheduleFixedPairKing(
  activePairs: FixedPairTeam[],
  courts: Court[],
  roundNumber: number,
  defaultInitialScores: { a: number; b: number },
  previousRound?: Round
): Match[] {
  const courtCount = courts.length;
  if (roundNumber === 1 || !previousRound || !previousRound.completed) {
    return scheduleFixedPairAmericano(activePairs, courts, roundNumber, defaultInitialScores);
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
    const teamAWon = m.teamA.score > m.teamB.score;
    const winnerTeam = teamAWon ? m.teamA : m.teamB;
    const loserTeam = winnerTeam === m.teamA ? m.teamB : m.teamA;

    const winPair = pairLookup.get(`${winnerTeam.player1Id}-${winnerTeam.player2Id}`);
    const losePair = pairLookup.get(`${loserTeam.player1Id}-${loserTeam.player2Id}`);

    const winDest = Math.max(1, currentCourtLevel - 1);
    if (winPair) courtBuckets.get(winDest)?.push(winPair);

    const loseDest = Math.min(courtCount, currentCourtLevel + 1);
    if (losePair) courtBuckets.get(loseDest)?.push(losePair);
  });

  const matches: Match[] = [];

  for (let c = 0; c < courtCount; c++) {
    const court = courts[c];
    const candidates = courtBuckets.get(court.id) || [];

    while (candidates.length < 2) {
      const rem = activePairs.find(p => !candidates.includes(p));
      if (rem) candidates.push(rem);
      else break;
    }

    const [pairA, pairB] = candidates.slice(0, 2);
    if (pairA && pairB) {
      matches.push({
        id: `match-r${roundNumber}-c${court.id}`,
        courtId: court.id,
        courtName: court.name,
        teamA: {
          id: `team-a-${roundNumber}-${court.id}`,
          name: pairA.name,
          player1Id: pairA.player1.id,
          player2Id: pairA.player2.id,
          score: defaultInitialScores.a
        },
        teamB: {
          id: `team-b-${roundNumber}-${court.id}`,
          name: pairB.name,
          player1Id: pairB.player1.id,
          player2Id: pairB.player2.id,
          score: defaultInitialScores.b
        },
        completed: false,
        roundNumber
      });
    }
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
  // Determine default initial scores
  let initialScoreA = 0;
  let initialScoreB = 0;

  if (config.scoringSystem === 'fixed_points') {
    initialScoreA = Math.floor(config.targetPoints / 2) + 1;
    initialScoreB = config.targetPoints - initialScoreA;
  } else if (config.scoringSystem === 'tennis_games') {
    if (config.tennisGameMode === 'total_games') {
      initialScoreA = Math.floor(config.totalGamesTarget / 2) + 1;
      initialScoreB = config.totalGamesTarget - initialScoreA;
    } else {
      // Race to
      initialScoreA = 0;
      initialScoreB = 0;
    }
  }

  const defaultScores = { a: initialScoreA, b: initialScoreB };

  let matches: Match[] = [];
  let benchPlayerIds: string[] = [];
  let updatedPlayers = [...players];

  if (config.pairingMode === 'fixed_pair') {
    const fixedPairs = extractFixedPairs(players);
    const { activePairs, benchPairs } = balanceBenchPairs(fixedPairs, config.courtCount, roundNumber);

    benchPlayerIds = benchPairs.flatMap(bp => [bp.player1.id, bp.player2.id]);

    // Update sit-out counts for bench pairs
    updatedPlayers = players.map(p => {
      const isBench = benchPlayerIds.includes(p.id);
      if (isBench) {
        return {
          ...p,
          sitOutCount: p.sitOutCount + 1,
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
    const { activePlayers, benchPlayers } = balanceBenchPlayers(players, capacityNeeded, roundNumber);

    benchPlayerIds = benchPlayers.map(p => p.id);

    updatedPlayers = players.map(p => {
      const isBench = benchPlayerIds.includes(p.id);
      if (isBench) {
        return {
          ...p,
          sitOutCount: p.sitOutCount + 1,
          lastSitOutRound: roundNumber
        };
      }
      return p;
    });

    if (config.format === 'americano') {
      matches = scheduleIndividualAmericano(activePlayers, courts, roundNumber, defaultScores);
    } else if (config.format === 'mexicano') {
      matches = scheduleIndividualMexicano(activePlayers, courts, roundNumber, defaultScores, leaderboard);
    } else if (config.format === 'king_of_the_court') {
      matches = scheduleIndividualKing(activePlayers, courts, roundNumber, defaultScores, previousRound);
    }
  }

  // Update partnership and opponent histories
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
        teamBIds.forEach(idB => {
          p.opponentHistory[idB] = (p.opponentHistory[idB] || 0) + 1;
        });
      }
    });

    teamBIds.forEach(idB => {
      const p = updatedPlayers.find(pl => pl.id === idB);
      if (p) {
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
// 7. Live Leaderboard Calculation
// ============================================================================

export function recalculateLeaderboard(
  players: Player[],
  rounds: Round[],
  pairingMode: 'individual' | 'fixed_pair'
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
        sitOutCount: pair.sitOutCount,
        winRate: 0,
        currentCourtLevel: pair.currentCourtLevel
      });
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (!match.completed) return;
        const scA = Number(match.teamA.score) || 0;
        const scB = Number(match.teamB.score) || 0;

        // Find pair for teamA
        const pairA = fixedPairs.find(
          p => (p.player1.id === match.teamA.player1Id && p.player2.id === match.teamA.player2Id) ||
               (p.player1.id === match.teamA.player2Id && p.player2.id === match.teamA.player1Id)
        );
        // Find pair for teamB
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
        sitOutCount: p.sitOutCount,
        winRate: 0,
        currentCourtLevel: p.currentCourtLevel
      });
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
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

  // Sort: Points Won > Point Diff (+/-) > Matches Won
  entries.sort((a, b) => {
    if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
    return a.name.localeCompare(b.name);
  });

  return entries;
}
