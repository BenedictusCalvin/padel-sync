/**
 * PDL UP — Padel Tournament & Matchmaker Engine
 * Domain Data Models & TypeScript Interfaces
 */

export type MatchFormat = 'americano' | 'mexicano' | 'king_of_the_court';

export type PairingMode = 'individual' | 'fixed_pair';

export type ScoringSystem = 'fixed_points' | 'tennis_games';

export type TennisGameMode = 'total_games' | 'race_to';

export type FixedPointsOption = 16 | 21 | 24 | 32;

export type TournamentVisibility = 'public' | 'private';

export function getTournamentVisibility(
  tourney?: { visibility?: TournamentVisibility; config?: { visibility?: TournamentVisibility } } | null
): TournamentVisibility {
  if (!tourney) return 'public';
  if (tourney.config?.visibility === 'private' || tourney.visibility === 'private') {
    return 'private';
  }
  return 'public';
}

export type PairingAlgorithm = 'smart_pairing' | 'strict_ranking';
export type ScoringType = 'points' | 'sets';
export type TiebreakingRule = 'allow_tied' | 'diff' | 'head_to_head';

export interface TournamentAdvancedSettings {
  tournamentName: string;
  pairingAlgorithm: PairingAlgorithm;
  scoringType: ScoringType;
  pointsPerMatch: number; // 16, 21, 24, 32, or 5 (sets)
  dateTime?: string; // YYYY-MM-DDTHH:mm
  sortByWinsBeforePoints: boolean;
  tiebreakingRule: TiebreakingRule;
  hidePublicLeaderboard: boolean;
  disableCompensationPoints: boolean;
}

export interface TournamentConfig {
  id: string;
  name: string;
  courtCount: number; // 1 - 8 courts
  pairingMode: PairingMode; // 'individual' | 'fixed_pair'
  format: MatchFormat; // 'americano' | 'mexicano' | 'king_of_the_court'
  scoringSystem: ScoringSystem; // 'fixed_points' | 'tennis_games'
  targetPoints: FixedPointsOption; // 16, 21, 24, 32 for fixed points
  tennisGameMode: TennisGameMode; // 'total_games' | 'race_to'
  totalGamesTarget: number; // e.g. Total of 4, 6, 8 games
  raceToGamesTarget: number; // e.g. Race to 4, 6, 9 games
  goldenPoint: boolean; // Punto de Oro at 40-40 deuce
  totalExpectedRounds: number;
  visibility?: TournamentVisibility; // 'public' (live score viewable by anyone) | 'private' (participants only)
  dateTime?: string;
  advancedSettings?: TournamentAdvancedSettings;
  joinRequests?: JoinRequest[];
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  pairId?: string; // If in fixed_pair mode, links with partner
  pairName?: string; // e.g. "Budi & Andi"
  sitOutCount: number; // Fair rest balancer
  lastSitOutRound?: number;
  partnerHistory: Record<string, number>; // counts frequency of playing with partner
  opponentHistory: Record<string, number>; // counts frequency of playing against opponent
  courtHistory: Record<number, number>; // court tracking
  currentCourtLevel?: number; // For King of the Court (1 = King, 2 = Court 2...)
}

export interface FixedPairTeam {
  id: string;
  name: string;
  player1: Player;
  player2: Player;
  sitOutCount: number;
  lastSitOutRound?: number;
  currentCourtLevel?: number;
}

export interface Court {
  id: number;
  name: string;
  level: number; // 1 = King Court, 2 = Court 2, etc.
}

export interface Team {
  id: string;
  name: string;
  player1Id: string;
  player2Id: string;
  score: number; // Points or games won
}

export interface Match {
  id: string;
  courtId: number;
  courtName: string;
  teamA: Team;
  teamB: Team;
  completed: boolean;
  roundNumber: number;
  winner?: 'teamA' | 'teamB' | 'tie';
}

export interface Round {
  roundNumber: number;
  matches: Match[];
  benchPlayerIds: string[]; // Players or pairs sitting out / resting
  completed: boolean;
  generatedAt: number;
}

export interface LeaderboardEntry {
  id: string; // playerId or pairId
  name: string; // playerName or pairName
  isPair: boolean;
  player1Name?: string;
  player2Name?: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesTied: number;
  pointsWon: number; // Total points or games won
  pointsConceded: number;
  pointDiff: number;
  compensationPoints?: number; // Extra +M compensation points for fewer matches
  effectivePoints?: number; // Total points including compensation
  sitOutCount: number;
  winRate: number;
  currentCourtLevel?: number;
  rank?: number;
}

export interface LeaderboardPlayerRow {
  rank: number;
  id: string;
  name: string;
  avatar?: string;
  gamesPlayed: number; // Kolom G
  wins: number;        // W
  losses: number;      // L
  ties: number;        // T
  pointDiff: number;   // Kolom DIFF
  matchHistoryDots: ('win' | 'loss' | 'tie')[]; // Array titik riwayat game (maks. 12-16 titik kecil)
  compensationPoints: number; // Kolom +M
  totalPoints: number; // Kolom P (angka utama berwarna biru)
}

export interface TournamentState {
  config: TournamentConfig;
  players: Player[];
  courts: Court[];
  rounds: Round[];
  currentRoundIndex: number;
  leaderboard: LeaderboardEntry[];
}

export interface TournamentRecord {
  id: string;
  name: string;
  config: TournamentConfig;
  players: Player[];
  courts: Court[];
  rounds: Round[];
  currentRoundIndex: number;
  leaderboard: LeaderboardEntry[];
  status: 'setup' | 'live' | 'completed';
  visibility: TournamentVisibility; // 'public' | 'private'
  createdAt: number;
  lastUpdated: number;
  userId?: string;
  joinRequests?: JoinRequest[];
}

export interface JoinRequest {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}
