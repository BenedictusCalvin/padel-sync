import { useState, useMemo, useEffect } from 'react';
import type {
  TournamentRecord,
  TournamentConfig,
  Player,
  Court,
  TournamentVisibility,
  JoinRequest
} from './types/tournament';
import { getTournamentVisibility } from './types/tournament';
import type { User } from '@supabase/supabase-js';
import { TournamentHub } from './components/TournamentHub';
import { SetupAccordion } from './components/SetupAccordion';
import { ScoreInputCard } from './components/ScoreInputCard';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { PodiumModal } from './components/PodiumModal';
import { AuthModal } from './components/AuthModal';
import { JoinInviteModal } from './components/JoinInviteModal';
import { JoinRequestsModal } from './components/JoinRequestsModal';
import { generateNextRound, recalculateLeaderboard } from './utils/scheduler';
import { translations, type Language } from './utils/translations';
import {
  supabase,
  fetchUserTournaments,
  upsertTournamentDb,
  deleteTournamentDb
} from './lib/supabase';
import {
  Coffee,
  Award,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  ArrowLeft,
  Globe,
  Lock,
  Share2,
  Check,
  ChevronDown,
  Shuffle,
  Users,
  Trophy,
  Zap,
  Info,
  LogIn,
  UserPlus
} from 'lucide-react';

const STORAGE_KEY = 'pdl_up_tournaments_v1';
const LANG_STORAGE_KEY = 'pdl_up_lang_v1';

// Preset sample tournaments for rich initial state
function createSampleTournament(
  id: string,
  name: string,
  courtCount: number,
  pairingMode: 'individual' | 'fixed_pair',
  format: 'americano' | 'mexicano' | 'king_of_the_court',
  scoringSystem: 'fixed_points' | 'tennis_games',
  targetPoints: 16 | 21 | 24 | 32,
  tennisGameMode: 'total_games' | 'race_to',
  totalGames: number,
  playerNames: string[],
  visibility: TournamentVisibility = 'public'
): TournamentRecord {
  const config: TournamentConfig = {
    id,
    name,
    courtCount,
    pairingMode,
    format,
    scoringSystem,
    targetPoints,
    tennisGameMode,
    totalGamesTarget: totalGames,
    raceToGamesTarget: totalGames,
    goldenPoint: true,
    totalExpectedRounds: 5,
    visibility
  };

  const players: Player[] = playerNames.map((pName, idx) => ({
    id: `${id}-p${idx + 1}`,
    name: pName,
    pairId: pairingMode === 'fixed_pair' ? `pair-${Math.floor(idx / 2) + 1}` : undefined,
    pairName:
      pairingMode === 'fixed_pair' && idx % 2 === 0 && playerNames[idx + 1]
        ? `${pName.split(' ')[0]} & ${playerNames[idx + 1].split(' ')[0]}`
        : undefined,
    sitOutCount: 0,
    partnerHistory: {},
    opponentHistory: {},
    courtHistory: {}
  }));

  const courts: Court[] = Array.from({ length: courtCount }, (_, i) => ({
    id: i + 1,
    name: i === 0 && format === 'king_of_the_court' ? 'Court 1 (King)' : `Court ${i + 1}`,
    level: i + 1
  }));

  const { round: r1, updatedPlayers } = generateNextRound(
    config,
    players,
    courts,
    1
  );

  const initialLb = recalculateLeaderboard(updatedPlayers, [r1], pairingMode);

  return {
    id,
    name,
    config,
    visibility,
    players: updatedPlayers,
    courts,
    rounds: [r1],
    currentRoundIndex: 0,
    leaderboard: initialLb,
    status: 'live',
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };
}

const DEFAULT_TOURNAMENTS: TournamentRecord[] = [
  createSampleTournament(
    'tourney-1',
    'Weekend Americano Championship',
    2,
    'individual',
    'americano',
    'fixed_points',
    24,
    'total_games',
    6,
    [
      'Carlos Alcaraz',
      'Alejandro Galán',
      'Juan Lebrón',
      'Arturo Coello',
      'Agustín Tapia',
      'Paquito Navarro',
      'Federico Chingotto',
      'Franco Stupaczuk'
    ],
    'public'
  ),
  createSampleTournament(
    'tourney-2',
    'Sunset Mexicano (Fixed Pair 2v2)',
    2,
    'fixed_pair',
    'mexicano',
    'tennis_games',
    24,
    'total_games',
    6,
    [
      'Fernando Belasteguín',
      'Sanyo Gutiérrez',
      'Martin Di Nenno',
      'Momo González',
      'Javier Garrido',
      'Mike Yanguas',
      'Lucas Bergamini',
      'Coki Nieto'
    ],
    'public'
  ),
  createSampleTournament(
    'tourney-3',
    'King of the Court Friday Night',
    2,
    'individual',
    'king_of_the_court',
    'tennis_games',
    24,
    'race_to',
    4,
    [
      'Kevin Sanjaya',
      'Marcus Gideon',
      'Fajar Alfian',
      'M. Rian Ardianto',
      'Hendra Setiawan',
      'Mohammad Ahsan',
      'Daniel Marthin',
      'Leo Rolly Carnando'
    ],
    'private'
  )
];

export function App() {
  // Tournaments Collection State
  const [tournaments, setTournaments] = useState<TournamentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TOURNAMENTS;
  });

  // Language State (Default: English 'en')
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'id') return saved;
    } catch {
      // fallback
    }
    return 'en';
  });

  const t = translations[lang];

  // Persist language preference
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Supabase Authentication & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Supabase Auth Listener
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Navigation State: null = Tournament Hub (First Page), string = Active Tournament ID (Current Matchmaker Page)
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // Spectator / Live Score Mode State
  const [isSpectatorMode, setIsSpectatorMode] = useState<boolean>(false);
  const [copiedShareInRunner, setCopiedShareInRunner] = useState<boolean>(false);

  // Join Invite & Host Approval States
  const [inviteModalTourneyId, setInviteModalTourneyId] = useState<string | null>(null);
  const [requestsModalTourneyId, setRequestsModalTourneyId] = useState<string | null>(null);
  const [copiedInviteInRunner, setCopiedInviteInRunner] = useState<boolean>(false);

  // Hash Navigation Listener for Direct Links, Spectating & Join Invites
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) {
        setActiveTournamentId(null);
        setIsSpectatorMode(false);
        setInviteModalTourneyId(null);
        return;
      }

      const params = new URLSearchParams(hash);
      const tourneyId = params.get('tourney');
      const isSpectate = params.get('spectate') === 'true';
      const inviteId = params.get('invite') || params.get('join');

      if (inviteId) {
        setInviteModalTourneyId(inviteId);
        return;
      }

      if (tourneyId) {
        const target = tournaments.find(t => t.id === tourneyId);
        if (target) {
          setActiveTournamentId(tourneyId);
          setIsSpectatorMode(isSpectate);
          setActiveTabRound(target.rounds.length - 1);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tournaments]);

  // Active Tournament UI States
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [showPodium, setShowPodium] = useState<boolean>(false);
  const [activeTabRound, setActiveTabRound] = useState<number>(0);

  // Supabase Tournaments Sync on User Login
  useEffect(() => {
    if (!user || !supabase) return;

    let isSubscribed = true;
    setIsSyncing(true);

    fetchUserTournaments(user.id)
      .then(cloudTournaments => {
        if (!isSubscribed) return;
        if (cloudTournaments && cloudTournaments.length > 0) {
          setTournaments(cloudTournaments);
        } else {
          // Upload local tournaments to user's cloud database if cloud is empty
          tournaments.forEach(tourney => {
            upsertTournamentDb(tourney, user.id).catch(console.error);
          });
        }
      })
      .catch(err => {
        console.warn('Supabase fetch failed, continuing with local tournaments:', err);
      })
      .finally(() => {
        if (isSubscribed) setIsSyncing(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  // Save to localStorage whenever tournaments change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
    } catch {
      // ignore
    }
  }, [tournaments]);

  // Find active tournament record
  const activeRecord = useMemo(() => {
    return tournaments.find(t => t.id === activeTournamentId) || null;
  }, [tournaments, activeTournamentId]);

  // Check authorization for Private tournaments
  const isPrivateTournament = getTournamentVisibility(activeRecord) === 'private';
  const isAuthorizedForPrivate = useMemo(() => {
    if (!activeRecord || !isPrivateTournament) return true;
    // 1. Creator / Owner via Cloud User ID
    if (user && activeRecord.userId && activeRecord.userId === user.id) return true;
    // 2. Player in roster matching user's full name or email username
    if (user) {
      const userFullName = (user.user_metadata?.full_name || '').toLowerCase().trim();
      const userEmailPrefix = (user.email?.split('@')[0] || '').toLowerCase().trim();
      const isPlayer = activeRecord.players.some(p => {
        const pName = p.name.toLowerCase().trim();
        return (userFullName && pName === userFullName) || (userEmailPrefix && pName === userEmailPrefix);
      });
      if (isPlayer) return true;
    }
    // 3. Local owner (if tournament has no cloud userId and user opened it directly from hub)
    if (!activeRecord.userId && !isSpectatorMode) return true;

    return false;
  }, [activeRecord, isPrivateTournament, user, isSpectatorMode]);

  // Current viewed round
  const currentRound = activeRecord?.rounds[activeTabRound] || activeRecord?.rounds[activeRecord.rounds.length - 1];
  const isViewingLatestRound = activeRecord ? activeTabRound === activeRecord.rounds.length - 1 : false;

  // Name map
  const playerNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    if (activeRecord) {
      activeRecord.players.forEach(p => map.set(p.id, p.name));
    }
    return map;
  }, [activeRecord]);

  const allMatchesCompleted = currentRound?.matches.every(m => m.completed) ?? false;

  // Bench players/pairs
  const benchNames = (currentRound?.benchPlayerIds || [])
    .map(id => playerNamesMap.get(id))
    .filter(Boolean) as string[];

  // Handlers for Navigation & Tournament Hub
  const handleBackToHub = () => {
    setActiveTournamentId(null);
    setIsSpectatorMode(false);
    window.location.hash = '';
  };

  const handleSelectTournament = (id: string) => {
    const target = tournaments.find(t => t.id === id);
    if (target) {
      setActiveTournamentId(id);
      setIsSpectatorMode(false);
      setActiveTabRound(target.rounds.length - 1);
      setIsSetupOpen(false);
      window.location.hash = `tourney=${id}`;
    }
  };

  const handleCreateTournament = (newRecord: TournamentRecord) => {
    setTournaments([newRecord, ...tournaments]);
    setActiveTournamentId(newRecord.id);
    setIsSpectatorMode(false);
    setActiveTabRound(0);
    setIsSetupOpen(false);
    window.location.hash = `tourney=${newRecord.id}`;

    if (user) {
      upsertTournamentDb(newRecord, user.id).catch(console.error);
    }
  };

  const handleDeleteTournament = (id: string) => {
    setTournaments(tournaments.filter(t => t.id !== id));
    if (activeTournamentId === id) {
      handleBackToHub();
    }

    if (user) {
      deleteTournamentDb(id).catch(console.error);
    }
  };

  // Handlers for Matchmaker Runner
  const handleScoreUpdate = (matchId: string, scoreA: number, scoreB: number) => {
    if (!activeRecord) return;

    const updatedRounds = activeRecord.rounds.map((rnd, rIdx) => {
      if (rIdx !== activeTabRound) return rnd;

      const updatedMatches = rnd.matches.map(m => {
        if (m.id !== matchId) return m;

        return {
          ...m,
          teamA: { ...m.teamA, score: scoreA },
          teamB: { ...m.teamB, score: scoreB },
          completed: true,
          winner: scoreA > scoreB ? 'teamA' : scoreB > scoreA ? 'teamB' : 'tie'
        } as const;
      });

      return {
        ...rnd,
        matches: updatedMatches,
        completed: updatedMatches.every(m => m.completed)
      };
    });

    const newLb = recalculateLeaderboard(
      activeRecord.players,
      updatedRounds,
      activeRecord.config.pairingMode
    );

    const updatedRecord: TournamentRecord = {
      ...activeRecord,
      rounds: updatedRounds,
      leaderboard: newLb,
      lastUpdated: Date.now()
    };

    setTournaments(tournaments.map(t => (t.id === activeRecord.id ? updatedRecord : t)));
    if (user) {
      upsertTournamentDb(updatedRecord, user.id).catch(console.error);
    }
  };

  const handleToggleMatchComplete = (matchId: string) => {
    if (!activeRecord) return;

    const updatedRounds = activeRecord.rounds.map((rnd, rIdx) => {
      if (rIdx !== activeTabRound) return rnd;

      const updatedMatches = rnd.matches.map(m => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          completed: !m.completed
        };
      });

      return {
        ...rnd,
        matches: updatedMatches,
        completed: updatedMatches.every(m => m.completed)
      };
    });

    const newLb = recalculateLeaderboard(
      activeRecord.players,
      updatedRounds,
      activeRecord.config.pairingMode
    );

    const updatedRecord: TournamentRecord = {
      ...activeRecord,
      rounds: updatedRounds,
      leaderboard: newLb,
      lastUpdated: Date.now()
    };

    setTournaments(tournaments.map(t => (t.id === activeRecord.id ? updatedRecord : t)));
    if (user) {
      upsertTournamentDb(updatedRecord, user.id).catch(console.error);
    }
  };

  const handleGenerateNextRound = () => {
    if (!activeRecord || !currentRound) return;

    const finalizedMatches = currentRound.matches.map(m => ({ ...m, completed: true }));
    const finalizedCurrentRound = { ...currentRound, matches: finalizedMatches, completed: true };

    const updatedRoundsSoFar = activeRecord.rounds.map((r, i) =>
      i === activeTabRound ? finalizedCurrentRound : r
    );

    const nextRoundNumber = activeRecord.rounds.length + 1;

    const { round: nextRound, updatedPlayers } = generateNextRound(
      activeRecord.config,
      activeRecord.players,
      activeRecord.courts,
      nextRoundNumber,
      finalizedCurrentRound,
      activeRecord.leaderboard
    );

    const newRounds = [...updatedRoundsSoFar, nextRound];
    const newLb = recalculateLeaderboard(
      updatedPlayers,
      newRounds,
      activeRecord.config.pairingMode
    );

    const updatedRecord: TournamentRecord = {
      ...activeRecord,
      players: updatedPlayers,
      rounds: newRounds,
      currentRoundIndex: newRounds.length - 1,
      leaderboard: newLb,
      lastUpdated: Date.now()
    };

    setTournaments(tournaments.map(t => (t.id === activeRecord.id ? updatedRecord : t)));
    setActiveTabRound(newRounds.length - 1);
    if (user) {
      upsertTournamentDb(updatedRecord, user.id).catch(console.error);
    }
  };

  const handleUpdateVisibility = (newVisibility: TournamentVisibility) => {
    if (!activeRecord) return;
    const updatedRecord: TournamentRecord = {
      ...activeRecord,
      visibility: newVisibility,
      config: {
        ...activeRecord.config,
        visibility: newVisibility
      },
      lastUpdated: Date.now()
    };

    setTournaments(prev => prev.map(t => (t.id === activeRecord.id ? updatedRecord : t)));
    if (user) {
      upsertTournamentDb(updatedRecord, user.id).catch(console.error);
    }
  };

  const handleUpdateTournamentVisibility = (tourneyId: string, newVisibility: TournamentVisibility) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tourneyId) return t;
        const updated: TournamentRecord = {
          ...t,
          visibility: newVisibility,
          config: {
            ...t.config,
            visibility: newVisibility
          },
          lastUpdated: Date.now()
        };
        if (user) {
          upsertTournamentDb(updated, user.id).catch(console.error);
        }
        return updated;
      })
    );
  };

  const handleRequestJoin = (tourneyId: string, playerName: string) => {
    const trimmed = playerName.trim();
    if (!trimmed) return;

    const newRequest: JoinRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: user?.id,
      userName: trimmed,
      userEmail: user?.email,
      userAvatar: user?.user_metadata?.avatar_url,
      requestedAt: Date.now(),
      status: 'pending'
    };

    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tourneyId) return t;
        const currentReqs = t.joinRequests || [];
        const filtered = currentReqs.filter(r => {
          if (user?.id && r.userId === user.id) return false;
          if (r.userName.toLowerCase() === trimmed.toLowerCase()) return false;
          return true;
        });
        const updatedReqs = [...filtered, newRequest];
        const updatedTourney: TournamentRecord = {
          ...t,
          joinRequests: updatedReqs,
          config: {
            ...t.config,
            joinRequests: updatedReqs
          },
          lastUpdated: Date.now()
        };
        if (t.userId) {
          upsertTournamentDb(updatedTourney, t.userId).catch(console.error);
        }
        return updatedTourney;
      })
    );
  };

  const handleApproveRequest = (tourneyId: string, request: JoinRequest) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tourneyId) return t;

        const updatedReqs = (t.joinRequests || []).map(r =>
          r.id === request.id ? { ...r, status: 'approved' as const } : r
        );

        const alreadyExists = t.players.some(
          p => p.name.toLowerCase().trim() === request.userName.toLowerCase().trim()
        );

        let updatedPlayers = t.players;
        if (!alreadyExists) {
          const newPlayer: Player = {
            id: request.userId ? `player-${request.userId}` : `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: request.userName,
            avatar: request.userAvatar,
            sitOutCount: 0,
            partnerHistory: {},
            opponentHistory: {},
            courtHistory: {}
          };
          updatedPlayers = [...t.players, newPlayer];
        }

        const updatedLb = recalculateLeaderboard(
          updatedPlayers,
          t.rounds,
          t.config.pairingMode
        );

        const updatedTourney: TournamentRecord = {
          ...t,
          players: updatedPlayers,
          leaderboard: updatedLb,
          joinRequests: updatedReqs,
          config: {
            ...t.config,
            joinRequests: updatedReqs
          },
          lastUpdated: Date.now()
        };

        if (user) {
          upsertTournamentDb(updatedTourney, user.id).catch(console.error);
        }
        return updatedTourney;
      })
    );
  };

  const handleRejectRequest = (tourneyId: string, requestId: string) => {
    setTournaments(prev =>
      prev.map(t => {
        if (t.id !== tourneyId) return t;
        const updatedReqs = (t.joinRequests || []).map(r =>
          r.id === requestId ? { ...r, status: 'rejected' as const } : r
        );
        const updatedTourney: TournamentRecord = {
          ...t,
          joinRequests: updatedReqs,
          config: {
            ...t.config,
            joinRequests: updatedReqs
          },
          lastUpdated: Date.now()
        };
        if (user) {
          upsertTournamentDb(updatedTourney, user.id).catch(console.error);
        }
        return updatedTourney;
      })
    );
  };

  const handleApplyConfig = (newConfig: TournamentConfig, newPlayers: Player[]) => {
    if (!activeRecord) return;

    const resolvedVisibility = newConfig.visibility || activeRecord.visibility || 'public';

    const newCourts: Court[] = Array.from({ length: newConfig.courtCount }, (_, i) => ({
      id: i + 1,
      name: i === 0 && newConfig.format === 'king_of_the_court' ? 'Court 1 (King)' : `Court ${i + 1}`,
      level: i + 1
    }));

    const { round: r1, updatedPlayers } = generateNextRound(
      newConfig,
      newPlayers,
      newCourts,
      1
    );

    const newLb = recalculateLeaderboard(updatedPlayers, [r1], newConfig.pairingMode);

    const updatedRecord: TournamentRecord = {
      ...activeRecord,
      name: newConfig.name,
      config: {
        ...newConfig,
        visibility: resolvedVisibility
      },
      visibility: resolvedVisibility,
      players: updatedPlayers,
      courts: newCourts,
      rounds: [r1],
      currentRoundIndex: 0,
      leaderboard: newLb,
      lastUpdated: Date.now()
    };

    setTournaments(tournaments.map(t => (t.id === activeRecord.id ? updatedRecord : t)));
    setActiveTabRound(0);
    if (user) {
      upsertTournamentDb(updatedRecord, user.id).catch(console.error);
    }
  };

  const handleResetTournament = () => {
    if (!activeRecord) return;
    handleApplyConfig(activeRecord.config, activeRecord.players);
  };

  const renderUserAuthButton = () => {
    if (!user) {
      return (
        <button
          type="button"
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{t.signIn}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setShowAuthModal(true)}
        className="flex items-center gap-2 p-1 pr-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        title={`${t.loggedInAs}: ${user.email}`}
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.email || 'User'}
            className="w-6 h-6 rounded-lg object-cover border border-emerald-500/40"
          />
        ) : (
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200/80">
            {user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[100px] truncate">
          {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
        </span>
        {isSyncing ? (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title={t.syncingToCloud} />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500" title={t.cloudSynced} />
        )}
      </button>
    );
  };

  const visibleTournamentsCount = useMemo(() => {
    return tournaments.filter(t => {
      const isPrivate = getTournamentVisibility(t) === 'private';
      if (!isPrivate) return true;
      if (!user) return false;
      if (t.userId && t.userId === user.id) return true;
      const userFullName = (user.user_metadata?.full_name || '').toLowerCase().trim();
      const userEmailPrefix = (user.email?.split('@')[0] || '').toLowerCase().trim();
      const isPlayer = t.players.some(p => {
        const pName = p.name.toLowerCase().trim();
        return (userFullName && pName === userFullName) || (userEmailPrefix && pName === userEmailPrefix);
      });
      if (isPlayer) return true;
      if (!t.userId) return true;
      return false;
    }).length;
  }, [tournaments, user]);

  const inviteTournament = useMemo(
    () => tournaments.find(t => t.id === inviteModalTourneyId) || null,
    [tournaments, inviteModalTourneyId]
  );

  const requestsTournament = useMemo(
    () => tournaments.find(t => t.id === requestsModalTourneyId) || null,
    [tournaments, requestsModalTourneyId]
  );

  const pendingRequestsInRunner = useMemo(() => {
    if (!activeRecord) return [];
    return (activeRecord.joinRequests || []).filter(r => r.status === 'pending');
  }, [activeRecord]);

  // =========================================================================
  // VIEW 1: FIRST PAGE — TOURNAMENT HUB (Daftar & Pembuatan Turnamen)
  // =========================================================================
  if (!activeTournamentId || !activeRecord) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <div>
                <div className="font-bold text-base text-slate-900 tracking-wider flex items-center gap-1 leading-none">
                  <span>PDL</span>
                  <span className="text-emerald-600 font-extrabold">UP</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  {t.multiHubSubtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* User Profile / Supabase Auth Button */}
              {renderUserAuthButton()}

              {/* Language Switcher Pill */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-medium shadow-inner">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    lang === 'en'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to English"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>EN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLang('id')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    lang === 'id'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ganti ke Bahasa Indonesia"
                >
                  <span>ID</span>
                </button>
              </div>

              <span className="hidden sm:inline px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-medium shadow-xs">
                {t.activeTournamentsCount(visibleTournamentsCount)}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-between">
          <TournamentHub
            tournaments={tournaments}
            lang={lang}
            onSelectTournament={handleSelectTournament}
            onCreateTournament={handleCreateTournament}
            onDeleteTournament={handleDeleteTournament}
            onUpdateTournamentVisibility={handleUpdateTournamentVisibility}
            onOpenRequestsModal={(id) => setRequestsModalTourneyId(id)}
            user={user}
          />
        </main>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          user={user}
          lang={lang}
        />

        <JoinInviteModal
          isOpen={Boolean(inviteModalTourneyId && inviteTournament)}
          onClose={() => {
            setInviteModalTourneyId(null);
            if (window.location.hash.includes('invite=') || window.location.hash.includes('join=')) {
              window.location.hash = '';
            }
          }}
          tournament={inviteTournament}
          user={user}
          lang={lang}
          onRequestJoin={handleRequestJoin}
          onOpenTournament={(tourneyId) => {
            setInviteModalTourneyId(null);
            window.location.hash = `#tourney=${tourneyId}`;
            setActiveTournamentId(tourneyId);
          }}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />

        <JoinRequestsModal
          isOpen={Boolean(requestsModalTourneyId && requestsTournament)}
          onClose={() => setRequestsModalTourneyId(null)}
          tournament={requestsTournament}
          lang={lang}
          onApproveRequest={handleApproveRequest}
          onRejectRequest={handleRejectRequest}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SECOND PAGE — CURRENT TOURNAMENT RUNNER (Matchmaker 1 Halaman)
  // =========================================================================
  // Check authorization for Private tournament
  if (isPrivateTournament && !isAuthorizedForPrivate) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToHub}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600" />
              <span>{t.backToHub}</span>
            </button>
            <div className="flex items-center gap-2">
              {renderUserAuthButton()}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-amber-200 max-w-md w-full text-center space-y-6 shadow-sm relative overflow-hidden animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-10 h-10 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wider inline-block">
                {t.visibilityPrivate}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight pt-2">
                {t.privateRestrictedTitle}
              </h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                {t.privateRestrictedDesc}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setInviteModalTourneyId(activeRecord.id)}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t.requestToJoin}</span>
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  {t.signIn}
                </button>
              )}
              <button
                type="button"
                onClick={handleBackToHub}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                {t.backToHub}
              </button>
            </div>
          </div>
        </main>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          user={user}
          lang={lang}
        />

        <JoinInviteModal
          isOpen={Boolean(inviteModalTourneyId && inviteTournament)}
          onClose={() => {
            setInviteModalTourneyId(null);
            if (window.location.hash.includes('invite=') || window.location.hash.includes('join=')) {
              window.location.hash = '';
            }
          }}
          tournament={inviteTournament}
          user={user}
          lang={lang}
          onRequestJoin={handleRequestJoin}
          onOpenTournament={(tourneyId) => {
            setInviteModalTourneyId(null);
            window.location.hash = `#tourney=${tourneyId}`;
            setActiveTournamentId(tourneyId);
          }}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
      </div>
    );
  }

  const config = activeRecord.config;
  const leaderboard = activeRecord.leaderboard;
  const rounds = activeRecord.rounds;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12 animate-fadeIn">
      {/* Spectator Live Score Alert Banner */}
      {isSpectatorMode && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{t.spectatorModeTitle}</span>
          <span className="font-normal opacity-90 hidden sm:inline">• {t.spectatorModeDesc}</span>
        </div>
      )}

      {/* Top Global Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Back to Tournament Hub Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleBackToHub}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title={t.backToTournaments}
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600" />
              <span>{t.backToTournaments}</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Tournament Title & Subtitle */}
            <div className="min-w-0 max-w-[180px] sm:max-w-xs md:max-w-sm">
              <h1 className="font-bold text-base text-slate-900 tracking-tight truncate leading-tight" title={config.name}>
                {config.name}
              </h1>
              <div className="text-[11px] text-slate-500 font-medium capitalize mt-0.5 truncate">
                {config.format.replace(/_/g, ' ')} • {config.pairingMode === 'fixed_pair' ? (lang === 'id' ? 'Tim 2v2' : '2v2 Team') : (lang === 'id' ? 'Individu' : 'Individual')}
              </div>
            </div>
          </div>

          {/* Tournament Specs & Status — Hover Card Popover */}
          <div className="relative group">
            {/* Hover Trigger Pill */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors duration-300 shadow-2xs cursor-pointer select-none whitespace-nowrap ${
                isPrivateTournament
                  ? 'bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="w-3.5 h-3.5 relative flex items-center justify-center shrink-0">
                <Lock
                  className={`w-3.5 h-3.5 text-amber-600 transition-all duration-300 ease-out transform ${
                    isPrivateTournament
                      ? 'opacity-100 scale-100 rotate-0'
                      : 'opacity-0 scale-50 rotate-45 pointer-events-none absolute'
                  }`}
                />
                <Globe
                  className={`w-3.5 h-3.5 text-emerald-600 transition-all duration-300 ease-out transform ${
                    !isPrivateTournament
                      ? 'opacity-100 scale-100 rotate-0'
                      : 'opacity-0 scale-50 -rotate-45 pointer-events-none absolute'
                  }`}
                />
              </div>

              <div className="relative h-4 w-[62px] flex items-center justify-start overflow-hidden">
                <span
                  className={`absolute left-0 text-xs font-semibold transition-all duration-300 ease-out leading-none ${
                    isPrivateTournament
                      ? 'opacity-100 translate-y-0 text-amber-800'
                      : 'opacity-0 -translate-y-2 pointer-events-none text-emerald-800'
                  }`}
                >
                  {lang === 'id' ? 'Privat' : 'Private'}
                </span>
                <span
                  className={`absolute left-0 text-xs font-semibold transition-all duration-300 ease-out leading-none flex items-center gap-1 ${
                    !isPrivateTournament
                      ? 'opacity-100 translate-y-0 text-emerald-800'
                      : 'opacity-0 translate-y-2 pointer-events-none text-amber-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>{lang === 'id' ? 'Publik' : 'Public'}</span>
                </span>
              </div>

              <span className="text-slate-400 font-normal hidden sm:inline">•</span>
              <span className="text-slate-700 font-medium capitalize hidden sm:inline">
                {config.format.replace(/_/g, ' ')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform duration-200" />
            </div>

            {/* Floating Popover on Hover (with invisible bridge to prevent closing on mouse move) */}
            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full pt-2 w-72 sm:w-80 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 relative overflow-hidden text-slate-900">
                {/* Subtle Glow Background */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                  isPrivateTournament ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                }`} />

                {/* Popover Header: Status & Instant Switcher */}
                <div className="pb-3 border-b border-slate-100 relative z-10 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isPrivateTournament ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isPrivateTournament ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{isPrivateTournament ? t.visibilityPrivate : t.visibilityPublic}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {isPrivateTournament
                          ? (lang === 'id' ? 'Khusus pemain terdaftar & pembuat' : 'Restricted to roster players & creator')
                          : (lang === 'id' ? 'Live score terbuka untuk penonton' : 'Real-time live scores open to all')}
                      </div>
                    </div>
                  </div>

                  {/* Instant Switcher (Public vs Private) */}
                  {!isSpectatorMode && (
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateVisibility('public');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          !isPrivateTournament
                            ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={lang === 'id' ? 'Ubah status menjadi Publik' : 'Change to Public'}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{lang === 'id' ? 'Publik' : 'Public'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateVisibility('private');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isPrivateTournament
                            ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title={lang === 'id' ? 'Ubah status menjadi Privat' : 'Change to Private'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{lang === 'id' ? 'Privat' : 'Private'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Popover Content: Formats & Rules */}
                <div className="space-y-1.5 relative z-10">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {lang === 'id' ? 'Aturan Turnamen' : 'Tournament Format & Rules'}
                  </div>

                  {/* Format */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shuffle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'id' ? 'Format Match' : 'Match Format'}</span>
                    </div>
                    <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
                      {config.format.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Mode Pasangan */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      <span>{lang === 'id' ? 'Mode Pasangan' : 'Pairing Mode'}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-[11px]">
                      {config.pairingMode === 'fixed_pair' ? t.fixedPairMode : t.individualMode}
                    </span>
                  </div>

                  {/* Sistem Skor */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>{lang === 'id' ? 'Sistem Skor' : 'Scoring System'}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-[11px] font-mono">
                      {config.scoringSystem === 'fixed_points'
                        ? `Fixed ${config.targetPoints} Pts`
                        : config.tennisGameMode === 'total_games'
                        ? `Total ${config.totalGamesTarget} Games`
                        : `Race to ${config.raceToGamesTarget} Games`}
                    </span>
                  </div>

                  {/* Punto de Oro */}
                  {config.goldenPoint && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>Punto de Oro</span>
                      </div>
                      <span className="font-bold text-amber-800 text-[10px] px-2 py-0.5 rounded bg-amber-100">
                        {lang === 'id' ? 'Golden Point 40-40' : 'Sudden Death at Deuce'}
                      </span>
                    </div>
                  )}

                  {/* Lapangan & Pemain */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      <span>{lang === 'id' ? 'Kapasitas' : 'Capacity'}</span>
                    </div>
                    <span className="font-semibold text-slate-900 text-[11px]">
                      {config.courtCount} {lang === 'id' ? 'Lapangan' : 'Courts'} • {activeRecord.players.length} {lang === 'id' ? 'Pemain' : 'Players'}
                    </span>
                  </div>
                </div>

                {/* Popover Footer with discreet Sign In for logged out users */}
                <div className="pt-2 text-[10px] text-slate-500 text-center border-t border-slate-100 relative z-10 space-y-2">
                  <div>
                    {lang === 'id'
                      ? '💡 Arahkan kursor atau atur di menu Setup & Roster'
                      : '💡 Hover anytime or configure in Setup & Roster'}
                  </div>
                  {!user && !isSpectatorMode && (
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>{t.signIn} • Supabase Cloud</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons & Language Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Invite Players Link Button */}
            {!isSpectatorMode && (
              <button
                type="button"
                onClick={() => {
                  const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${config.id}`;
                  navigator.clipboard.writeText(inviteUrl).then(() => {
                    setCopiedInviteInRunner(true);
                    setTimeout(() => setCopiedInviteInRunner(false), 2500);
                  }).catch(() => {
                    prompt(lang === 'id' ? 'Salin link undangan:' : 'Copy invite link:', inviteUrl);
                  });
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs whitespace-nowrap cursor-pointer"
                title={t.copyInviteLink}
              >
                {copiedInviteInRunner ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 text-xs font-bold">{t.inviteLinkCopied}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.invitePlayers}</span>
                  </>
                )}
              </button>
            )}

            {/* Pending Join Requests Notification Button */}
            {!isSpectatorMode && pendingRequestsInRunner.length > 0 && (
              <button
                type="button"
                onClick={() => setRequestsModalTourneyId(config.id)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs animate-pulse whitespace-nowrap cursor-pointer"
                title={lang === 'id' ? 'Lihat permohonan join' : 'Review join requests'}
              >
                <span>🔔</span>
                <span>{t.pendingRequestsBadge(pendingRequestsInRunner.length)}</span>
              </button>
            )}

            {/* Share Live Score Button */}
            {!isPrivateTournament && (
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}${window.location.pathname}#tourney=${config.id}&spectate=true`;
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopiedShareInRunner(true);
                    setTimeout(() => setCopiedShareInRunner(false), 2500);
                  }).catch(() => {
                    prompt('Salin link live score:', shareUrl);
                  });
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs whitespace-nowrap cursor-pointer"
                title={lang === 'id' ? 'Salin link live score penonton' : 'Share spectator live score link'}
              >
                {copiedShareInRunner ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 text-xs font-bold">{t.liveScoreCopied}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{lang === 'id' ? 'Bagikan' : 'Share'}</span>
                  </>
                )}
              </button>
            )}

            {/* User Profile / Supabase Auth Button (Only visible when logged in to keep runner menu uncluttered) */}
            {renderUserAuthButton()}

            {/* Language Switcher Pill */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs font-medium shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to English"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  lang === 'id'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ganti ke Bahasa Indonesia"
              >
                <span>ID</span>
              </button>
            </div>

            {/* Organizer controls (Hidden in spectator mode) */}
            {!isSpectatorMode && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSetupOpen(!isSetupOpen)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isSetupOpen ? t.closeSetup : t.setupAndRoster}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPodium(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">{t.podium}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t.resetRound1Confirm)) {
                      handleResetTournament();
                    }
                  }}
                  className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
                  title={t.resetTourney}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            {isSpectatorMode && (
              <button
                type="button"
                onClick={() => setShowPodium(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">{t.podium}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Runner Body */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 flex-1 w-full">
        {/* Collapsible Setup & Roster Accordion (Only for non-spectators) */}
        {!isSpectatorMode && (
          <SetupAccordion
            config={config}
            players={activeRecord.players}
            lang={lang}
            isOpen={isSetupOpen}
            onToggleOpen={() => setIsSetupOpen(!isSetupOpen)}
            onApplyConfig={handleApplyConfig}
            onUpdateVisibility={handleUpdateVisibility}
            onOpenRequestsModal={() => setRequestsModalTourneyId(config.id)}
            pendingRequestsCount={pendingRequestsInRunner.length}
          />
        )}

        {/* 2-Column All-in-One Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Matches & Round Controls (8 of 12 cols = 67%) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Round Navigation Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Round Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {rounds.map((r, idx) => {
                  const isSelected = activeTabRound === idx;
                  const isCompleted = r.completed;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTabRound(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span>{t.roundLabel(idx + 1)}</span>
                      {isCompleted && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Next Round Button (Hidden for spectators) */}
              {!isSpectatorMode && isViewingLatestRound && (
                <div className="flex items-center gap-2">
                  {allMatchesCompleted && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hidden sm:inline">
                      {t.allScoresVerified}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateNextRound}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <span>{t.nextRoundBtn(rounds.length + 1)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isSpectatorMode && (
                <div className="text-xs text-amber-700 font-bold flex items-center gap-1.5 px-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>{t.spectatorModeTitle}</span>
                </div>
              )}
            </div>

            {/* Bench / Resting Players Banner */}
            {benchNames.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      {t.restingBannerTitle(currentRound?.roundNumber || 1)}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {benchNames.map((name, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-white border border-blue-200 text-blue-900 shadow-2xs font-medium"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-blue-700 font-medium">
                  {t.fairRestNote}
                </div>
              </div>
            )}

            {/* Court Match Cards Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>{t.courtMatchesTitle(currentRound?.roundNumber || 1)}</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {config.scoringSystem === 'fixed_points'
                    ? t.fixedScoreFormulaTip
                    : config.tennisGameMode === 'total_games'
                    ? t.tennisTotalTip(config.totalGamesTarget)
                    : t.tennisRaceTip(config.raceToGamesTarget)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentRound?.matches.map(match => (
                  <ScoreInputCard
                    key={match.id}
                    match={match}
                    config={config}
                    lang={lang}
                    playerNamesMap={playerNamesMap}
                    isReadOnly={isSpectatorMode}
                    onScoreChange={handleScoreUpdate}
                    onToggleComplete={handleToggleMatchComplete}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Embedded Real-time Leaderboard (4 of 12 cols = 33%) */}
          <div className="lg:col-span-4 sticky top-20">
            <LeaderboardPanel
              leaderboard={leaderboard}
              config={config}
              lang={lang}
              currentRound={currentRound?.roundNumber || 1}
            />
          </div>
        </div>
      </main>

      {/* Championship Podium Modal */}
      <PodiumModal
        isOpen={showPodium}
        onClose={() => setShowPodium(false)}
        onReset={handleResetTournament}
        leaderboard={leaderboard}
        tournamentName={config.name}
        lang={lang}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        user={user}
        lang={lang}
      />

      {/* Join / Invite Modal */}
      <JoinInviteModal
        isOpen={Boolean(inviteModalTourneyId && inviteTournament)}
        onClose={() => {
          setInviteModalTourneyId(null);
          if (window.location.hash.includes('invite=') || window.location.hash.includes('join=')) {
            window.location.hash = activeTournamentId ? `#tourney=${activeTournamentId}` : '';
          }
        }}
        tournament={inviteTournament}
        user={user}
        lang={lang}
        onRequestJoin={handleRequestJoin}
        onOpenTournament={(tourneyId) => {
          setInviteModalTourneyId(null);
          window.location.hash = `#tourney=${tourneyId}`;
          setActiveTournamentId(tourneyId);
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Join Requests Approval Modal (for Host) */}
      <JoinRequestsModal
        isOpen={Boolean(requestsModalTourneyId && requestsTournament)}
        onClose={() => setRequestsModalTourneyId(null)}
        tournament={requestsTournament}
        lang={lang}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
      />
    </div>
  );
}

export default App;
