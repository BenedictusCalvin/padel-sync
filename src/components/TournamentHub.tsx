import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  TournamentRecord,
  TournamentConfig,
  Player,
  Court,
  MatchFormat,
  PairingMode,
  ScoringSystem,
  TennisGameMode,
  FixedPointsOption,
  TournamentVisibility
} from '../types/tournament';
import { getTournamentVisibility } from '../types/tournament';
import { generateNextRound, recalculateLeaderboard } from '../utils/scheduler';
import { translations, type Language } from '../utils/translations';
import {
  Trophy,
  Plus,
  Layers,
  Users,
  Play,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  Crown,
  Shuffle,
  Clock,
  X,
  Globe,
  Lock,
  Share2,
  Check,
  UserPlus
} from 'lucide-react';
import { ReclubImportModal } from './ReclubImportModal';

interface TournamentHubProps {
  tournaments: TournamentRecord[];
  lang: Language;
  onSelectTournament: (tournamentId: string) => void;
  onCreateTournament: (newRecord: TournamentRecord) => void;
  onDeleteTournament: (tournamentId: string) => void;
  onUpdateTournamentVisibility?: (tournamentId: string, newVisibility: TournamentVisibility) => void;
  onOpenRequestsModal?: (tournamentId: string) => void;
  user?: User | null;
}

const DEFAULT_PRESET_NAMES = [
  'Carlos Alcaraz',
  'Alejandro Galán',
  'Juan Lebrón',
  'Arturo Coello',
  'Agustín Tapia',
  'Paquito Navarro',
  'Federico Chingotto',
  'Franco Stupaczuk',
  'Fernando Belasteguín',
  'Sanyo Gutiérrez',
  'Martin Di Nenno',
  'Momo González',
  'Javier Garrido',
  'Mike Yanguas',
  'Lucas Bergamini',
  'Coki Nieto'
];

export const TournamentHub: React.FC<TournamentHubProps> = ({
  tournaments,
  lang,
  onSelectTournament,
  onCreateTournament,
  onDeleteTournament,
  onUpdateTournamentVisibility,
  onOpenRequestsModal,
  user
}) => {
  const t = translations[lang];
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Close modal on Escape key press
  useEffect(() => {
    if (!showCreateModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  // Form states for new tournament
  const [name, setName] = useState<string>('Friday Night Americano Cup');
  const [courtCount, setCourtCount] = useState<number>(2);
  const [visibility, setVisibility] = useState<TournamentVisibility>('public');
  const [pairingMode, setPairingMode] = useState<PairingMode>('individual');
  const [format, setFormat] = useState<MatchFormat>('americano');
  const [scoringSystem, setScoringSystem] = useState<ScoringSystem>('tennis_games');
  const [targetPoints, setTargetPoints] = useState<FixedPointsOption>(24);
  const [tennisGameMode, setTennisGameMode] = useState<TennisGameMode>('total_games');
  const [totalGamesTarget, setTotalGamesTarget] = useState<number>(6);
  const [raceToGamesTarget, setRaceToGamesTarget] = useState<number>(6);
  const [goldenPoint, setGoldenPoint] = useState<boolean>(true);

  // Hub Filtering & Share States
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const handleCopyShareLink = (e: React.MouseEvent, tourneyId: string) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#tourney=${tourneyId}&spectate=true`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedShareId(tourneyId);
      setTimeout(() => {
        setCopiedShareId(null);
      }, 2500);
    }).catch(() => {
      // fallback
      prompt('Salin link live score:', shareUrl);
    });
  };

  const handleCopyInviteLink = (e: React.MouseEvent, tourneyId: string) => {
    e.stopPropagation();
    const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${tourneyId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInviteId(tourneyId);
      setTimeout(() => {
        setCopiedInviteId(null);
      }, 2500);
    }).catch(() => {
      prompt(lang === 'id' ? 'Salin link undangan:' : 'Copy invite link:', inviteUrl);
    });
  };

  // Roster state - Default KOSONG
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [showReclubModal, setShowReclubModal] = useState<boolean>(false);

  const requiredCapacity = courtCount * 4;
  const isCapacitySufficient = playerList.length >= requiredCapacity;
  const sitOutCount = Math.max(0, playerList.length - requiredCapacity);

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (playerList.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('Player already exists in the roster!');
      return;
    }
    setPlayerList([...playerList, trimmed]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (idx: number) => {
    setPlayerList(playerList.filter((_, i) => i !== idx));
  };

  const handleOpenCreateModal = () => {
    setName('New Padel Tournament');
    setCourtCount(2);
    setVisibility('public');
    setPairingMode('individual');
    setFormat('americano');
    setScoringSystem('tennis_games');
    setTennisGameMode('total_games');
    setTotalGamesTarget(6);
    setRaceToGamesTarget(6);
    setPlayerList([]); // Default kosong
    setNewPlayerName('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = () => {
    if (!isCapacitySufficient) {
      alert(t.capacityAlert(requiredCapacity, playerList.length));
      return;
    }

    const newConfig: TournamentConfig = {
      id: `tourney-${Date.now()}`,
      name: name.trim() || 'PDL UP Tournament',
      courtCount,
      pairingMode,
      format,
      scoringSystem,
      targetPoints,
      tennisGameMode,
      totalGamesTarget,
      raceToGamesTarget,
      goldenPoint,
      totalExpectedRounds: 5,
      visibility
    };

    const newPlayers: Player[] = playerList.map((pName, idx) => ({
      id: `p-${idx + 1}-${Date.now().toString(36)}`,
      name: pName,
      pairId: pairingMode === 'fixed_pair' ? `pair-${Math.floor(idx / 2) + 1}` : undefined,
      pairName:
        pairingMode === 'fixed_pair' && idx % 2 === 0 && playerList[idx + 1]
          ? `${pName.split(' ')[0]} & ${playerList[idx + 1].split(' ')[0]}`
          : undefined,
      sitOutCount: 0,
      partnerHistory: {},
      opponentHistory: {},
      courtHistory: {},
      currentCourtLevel: format === 'king_of_the_court' ? Math.floor(idx / 4) + 1 : undefined
    }));

    const courts: Court[] = Array.from({ length: courtCount }, (_, i) => ({
      id: i + 1,
      name: i === 0 && format === 'king_of_the_court' ? 'Court 1 (King)' : `Court ${i + 1}`,
      level: i + 1
    }));

    const { round: r1, updatedPlayers } = generateNextRound(
      newConfig,
      newPlayers,
      courts,
      1
    );

    const initialLeaderboard = recalculateLeaderboard(
      updatedPlayers,
      [r1],
      pairingMode
    );

    const newRecord: TournamentRecord = {
      id: newConfig.id,
      name: newConfig.name,
      config: newConfig,
      visibility,
      players: updatedPlayers,
      courts,
      rounds: [r1],
      currentRoundIndex: 0,
      leaderboard: initialLeaderboard,
      status: 'live',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    onCreateTournament(newRecord);
    setShowCreateModal(false);
  };

  // Filter tournaments by visibility & user authorization:
  // If not logged in / signed out (!user): HIDE ALL PRIVATE TOURNAMENTS
  // If logged in: show public + authorized private tournaments
  const visibleTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const isPrivate = getTournamentVisibility(t) === 'private';
      if (!isPrivate) return true; // Public tournaments are visible to all

      // If user is not logged in / signed out, HIDE all private tournaments
      if (!user) return false;

      // If user is logged in:
      // 1. Creator / Owner
      if (t.userId && t.userId === user.id) return true;

      // 2. Player in roster
      const userFullName = (user.user_metadata?.full_name || '').toLowerCase().trim();
      const userEmailPrefix = (user.email?.split('@')[0] || '').toLowerCase().trim();
      const isPlayer = t.players.some(p => {
        const pName = p.name.toLowerCase().trim();
        return (userFullName && pName === userFullName) || (userEmailPrefix && pName === userEmailPrefix);
      });
      if (isPlayer) return true;

      // 3. Local owner (if no userId assigned yet, created on this device)
      if (!t.userId) return true;

      return false;
    });
  }, [tournaments, user]);

  const totalCourtsInUse = visibleTournaments.reduce((acc, tourney) => acc + tourney.config.courtCount, 0);
  const totalActivePlayers = visibleTournaments.reduce((acc, tourney) => acc + tourney.players.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.multiHubSubtitle}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t.hubTitle}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {t.hubSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t.createNewTournament}</span>
          </button>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.totalTournaments}</span>
            </div>
            <div className="text-2xl font-black text-white">{visibleTournaments.length}</div>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.activeCourts}</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{totalCourtsInUse}</div>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.registeredPlayers}</span>
            </div>
            <div className="text-2xl font-black text-cyan-400">{totalActivePlayers}</div>
          </div>

          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.engineStatus}</span>
            </div>
            <div className="text-sm font-black text-purple-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.readyToMatch}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Cards Section */}
      {(() => {
        const publicCount = visibleTournaments.filter(t => getTournamentVisibility(t) === 'public').length;
        const privateCount = visibleTournaments.filter(t => getTournamentVisibility(t) === 'private').length;

        const filteredTournaments = visibleTournaments.filter(t => {
          const vis = getTournamentVisibility(t);
          if (visibilityFilter === 'public') return vis === 'public';
          if (visibilityFilter === 'private') return vis === 'private';
          return true;
        });

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{t.activeTournamentsList}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {t.sessionsCount(visibleTournaments.length)}
                </span>
              </div>

              {/* Visibility Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    visibilityFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.filterAll} ({visibleTournaments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('public')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    visibilityFilter === 'public'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t.filterPublic} ({publicCount})</span>
                </button>
                {Boolean(user && privateCount > 0) && (
                  <button
                    type="button"
                    onClick={() => setVisibilityFilter('private')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      visibilityFilter === 'private'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t.filterPrivate} ({privateCount})</span>
                  </button>
                )}
              </div>
            </div>

            {filteredTournaments.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto text-2xl">
                  {visibilityFilter === 'private' ? '🔒' : '🎾'}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {visibilityFilter === 'private'
                    ? (lang === 'id' ? 'Belum Ada Turnamen Private' : 'No Private Tournaments')
                    : t.noTournamentsTitle}
                </h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  {visibilityFilter === 'private'
                    ? (lang === 'id' ? 'Buat turnamen baru dan pilih status Private untuk peserta terdaftar saja.' : 'Create a new tournament and choose Private for registered players only.')
                    : t.noTournamentsDesc}
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.createFirstTourney}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTournaments.map(tourney => {
                  const leader = tourney.leaderboard[0];
                  const isFixedPair = tourney.config.pairingMode === 'fixed_pair';
                  const isPrivate = getTournamentVisibility(tourney) === 'private';
                  const pendingRequests = (tourney.joinRequests || []).filter(r => r.status === 'pending');

                  return (
                    <div
                      key={tourney.id}
                      className="glass-panel rounded-2xl border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 shadow-xl flex flex-col justify-between group overflow-hidden relative"
                    >
                      {/* Card Header (CLICKABLE TO OPEN MATCHMAKER) */}
                      <div
                        onClick={() => onSelectTournament(tourney.id)}
                        className="p-5 border-b border-slate-800/80 bg-slate-950/40 cursor-pointer hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTournament(tourney.id);
                            }}
                            className="font-extrabold text-white text-lg group-hover:text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors line-clamp-1"
                            title={tourney.name}
                          >
                            {tourney.name}
                          </h3>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(t.deleteConfirm(tourney.name))) {
                                onDeleteTournament(tourney.id);
                              }
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                            title="Delete Tournament"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Format & Visibility Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Visibility Badge (Quick Toggle) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTournamentVisibility?.(tourney.id, isPrivate ? 'public' : 'private');
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                              isPrivate
                                ? 'bg-amber-500/15 hover:bg-amber-500/30 border-amber-500/30 text-amber-300'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-300'
                            }`}
                            title={lang === 'id' ? 'Klik untuk ubah status Publik / Privat' : 'Click to toggle Public / Private'}
                          >
                            {isPrivate ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>{t.visibilityPrivate}</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <Globe className="w-3 h-3" />
                                <span>{t.visibilityPublic}</span>
                              </>
                            )}
                          </button>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                            {tourney.config.format.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                            {isFixedPair ? t.fixedPairMode : t.individualMode}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {tourney.config.scoringSystem === 'fixed_points'
                              ? `Fixed ${tourney.config.targetPoints} Pts`
                              : tourney.config.tennisGameMode === 'total_games'
                              ? `Total ${tourney.config.totalGamesTarget} Games`
                              : `Race to ${tourney.config.raceToGamesTarget} Games`}
                          </span>

                          {/* Pending Join Requests Notification Pill */}
                          {pendingRequests.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRequestsModal?.(tourney.id);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse transition-all cursor-pointer shadow-sm"
                              title={lang === 'id' ? 'Klik untuk tinjau permintaan gabung' : 'Click to review join requests'}
                            >
                              <span>🔔</span>
                              <span>{t.pendingRequestsBadge(pendingRequests.length)}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body Metrics (Also clickable to open) */}
                      <div
                        onClick={() => onSelectTournament(tourney.id)}
                        className="p-5 space-y-3.5 cursor-pointer"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                              {t.activeCourts}
                            </span>
                            <span className="font-bold text-white text-sm">
                              {t.courtCountLabel(tourney.config.courtCount)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                              {t.registeredPlayers}
                            </span>
                            <span className="font-bold text-white text-sm">
                              {t.participantsCount(tourney.players.length, isFixedPair)}
                            </span>
                          </div>
                        </div>

                        {/* Leader Preview */}
                        <div className="p-3 bg-gradient-to-r from-amber-950/20 to-slate-900/60 rounded-xl border border-amber-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-amber-400/90 font-bold block uppercase tracking-wider">
                                {t.temporaryRank1}
                              </span>
                              <span className="font-bold text-white text-xs truncate block">
                                {leader?.name || t.noMatchYet}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-amber-400 font-mono">
                              {leader?.pointsWon || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              {tourney.config.scoringSystem === 'tennis_games' ? 'Games' : 'Pts'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Enter Button & Live Score Share */}
                      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{t.roundsCreated(tourney.rounds.length)}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Invite Players Link Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyInviteLink(e, tourney.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                            title={t.copyInviteLink}
                          >
                            {copiedInviteId === tourney.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 text-[11px] font-bold">{t.inviteLinkCopied}</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">{t.invitePlayers}</span>
                              </>
                            )}
                          </button>

                          {!isPrivate && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyShareLink(e, tourney.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                              title={t.shareLiveScore}
                            >
                              {copiedShareId === tourney.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 text-[11px] font-bold">{t.liveScoreCopied}</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span className="text-[11px] hidden sm:inline">{lang === 'id' ? 'Live Skor' : 'Live Score'}</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectTournament(tourney.id)}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all transform group-hover:scale-105"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{t.enterMatchmaker}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal: Create Tournament */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-start justify-center animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-6 sm:my-10 space-y-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Neon Blurs */}
            <div className="absolute -top-24 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{t.modalCreateTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t.modalCreateSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  {t.eventNameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.eventNamePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tournament Visibility (Public Live vs Private) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase flex items-center justify-between">
                  <span>{t.visibilityLabel}</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase">
                    {visibility === 'public' ? 'Live score spectator enabled' : 'Roster members only'}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      visibility === 'public'
                        ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${visibility === 'public' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className={`font-black text-xs ${visibility === 'public' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {t.visibilityPublic}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t.visibilityPublicDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      visibility === 'private'
                        ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${visibility === 'private' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className={`font-black text-xs ${visibility === 'private' ? 'text-amber-400' : 'text-slate-300'}`}>
                        {t.visibilityPrivate}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t.visibilityPrivateDesc}
                    </p>
                  </button>
                </div>
              </div>

              {/* Courts Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    {t.courtSelectionLabel}
                  </label>
                  <span className="text-xs text-emerald-400 font-bold">
                    {courtCount} {lang === 'en' ? 'Courts' : 'Lapangan'} ({requiredCapacity} {lang === 'en' ? 'Players' : 'Pemain'})
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCourtCount(num)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        courtCount === num
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pairing Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
                  {t.pairingModeLabel}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPairingMode('individual')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      pairingMode === 'individual'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-400 mb-0.5">{t.individualMode}</div>
                    <div className="text-[11px] text-slate-300">{t.individualModeDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPairingMode('fixed_pair')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      pairingMode === 'fixed_pair'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-400 mb-0.5">{t.fixedPairMode}</div>
                    <div className="text-[11px] text-slate-300">{t.fixedPairModeDesc}</div>
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
                  {t.matchFormatLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('americano')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      format === 'americano'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Shuffle className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <div className="font-bold text-xs text-white">Americano</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('mexicano')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      format === 'mexicano'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="w-4 h-4 mx-auto mb-1 text-cyan-400 font-bold text-xs">⚡</div>
                    <div className="font-bold text-xs text-white">Mexicano</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('king_of_the_court')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      format === 'king_of_the_court'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Crown className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <div className="font-bold text-xs text-white">King Court</div>
                  </button>
                </div>
              </div>

              {/* Scoring System */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
                  {t.scoringSystemLabel}
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setScoringSystem('tennis_games')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      scoringSystem === 'tennis_games'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-400 mb-0.5">{t.tennisPointSystem}</div>
                    <div className="text-[11px] text-slate-300">{t.tennisPointDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScoringSystem('fixed_points')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      scoringSystem === 'fixed_points'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-400 mb-0.5">{t.fixedPoints}</div>
                    <div className="text-[11px] text-slate-300">{t.fixedPointsDesc}</div>
                  </button>
                </div>

                {scoringSystem === 'tennis_games' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        onClick={() => setTennisGameMode('total_games')}
                        className={`p-2.5 rounded-lg border cursor-pointer ${
                          tennisGameMode === 'total_games' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-bold block text-cyan-400">{t.totalGamesOption}</span>
                        <input
                          type="number"
                          min={2}
                          max={16}
                          value={totalGamesTarget}
                          onChange={e => setTotalGamesTarget(Number(e.target.value) || 6)}
                          className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-center font-bold text-white text-xs mt-1"
                        />
                      </div>

                      <div
                        onClick={() => setTennisGameMode('race_to')}
                        className={`p-2.5 rounded-lg border cursor-pointer ${
                          tennisGameMode === 'race_to' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-bold block text-cyan-400">{t.raceToOption}</span>
                        <input
                          type="number"
                          min={2}
                          max={12}
                          value={raceToGamesTarget}
                          onChange={e => setRaceToGamesTarget(Number(e.target.value) || 6)}
                          className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-center font-bold text-white text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs mt-2">
                      <span className="text-white font-medium">{t.puntoDeOro}</span>
                      <button
                        type="button"
                        onClick={() => setGoldenPoint(!goldenPoint)}
                        className={`w-9 h-4.5 rounded-full p-0.5 transition-colors ${goldenPoint ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${goldenPoint ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {scoringSystem === 'fixed_points' && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-300">Target Points:</span>
                    <div className="flex gap-1.5">
                      {([16, 21, 24, 32] as FixedPointsOption[]).map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setTargetPoints(pts)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                            targetPoints === pts
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Roster & Capacity */}
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    {t.rosterLabel(playerList.length)}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Reclub Import Button */}
                    <button
                      type="button"
                      onClick={() => setShowReclubModal(true)}
                      className="px-2.5 py-1 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[9px]">R</span>
                      <span>{lang === 'id' ? 'Import Reclub' : 'Import Reclub'}</span>
                    </button>

                    {/* Clear Button */}
                    {playerList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPlayerList([])}
                        className="px-2 py-1 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-[11px] rounded-lg font-medium transition-colors border border-slate-700/60"
                      >
                        {lang === 'id' ? 'Kosongkan' : 'Clear'}
                      </button>
                    )}

                    {/* Quick Preset Buttons */}
                    <button
                      type="button"
                      onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg font-medium border border-slate-700"
                    >
                      Preset {requiredCapacity}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity + 2))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg font-medium border border-slate-700"
                    >
                      +{2} Sit-out
                    </button>
                  </div>
                </div>

                {sitOutCount > 0 && (
                  <div className="text-[11px] text-blue-300 bg-blue-950/40 border border-blue-800/40 p-2 rounded-lg mb-2 flex items-center justify-between">
                    <span>⚠️ {t.sitOutAlert(sitOutCount)}</span>
                    <span className="font-bold text-blue-400">Fair Rest</span>
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); } }}
                    placeholder={t.playerInputPlaceholder}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                  >
                    {t.addBtn}
                  </button>
                </div>

                {playerList.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2.5">
                    <Users className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {lang === 'id'
                        ? 'Roster pemain masih kosong. Masukkan nama manual di atas, import dari Reclub, atau gunakan preset.'
                        : 'Player roster is currently empty. Add player names above, import from Reclub, or use a preset.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowReclubModal(true)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95 transition-all"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-[9px]">R</span>
                        <span>{lang === 'id' ? 'Import Peserta dari Reclub' : 'Import from Reclub'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity))}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        {lang === 'id' ? `Isi Cepat (${requiredCapacity} Pemain)` : `Fill Preset (${requiredCapacity})`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    {playerList.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                      >
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(i)}
                          className="text-slate-500 hover:text-red-400 p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={!isCapacitySufficient}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <span>{t.saveAndOpenBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reclub Import Modal */}
      <ReclubImportModal
        isOpen={showReclubModal}
        onClose={() => setShowReclubModal(false)}
        currentRosterCount={playerList.length}
        requiredCapacity={requiredCapacity}
        lang={lang}
        onImport={(importedNames, mode) => {
          if (mode === 'replace') {
            setPlayerList(importedNames);
          } else {
            const combined = [...playerList];
            for (const n of importedNames) {
              if (!combined.some(p => p.toLowerCase() === n.toLowerCase())) {
                combined.push(n);
              }
            }
            setPlayerList(combined);
          }
        }}
      />
    </div>
  );
};
