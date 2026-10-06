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
import { TournamentVisibilityBadge } from './TournamentVisibilityBadge';

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
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t.hubTitle}
            </h1>
            <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
              {t.hubSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.createNewTournament}</span>
          </button>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{t.totalTournaments}</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{visibleTournaments.length}</div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{t.activeCourts}</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{totalCourtsInUse}</div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{t.registeredPlayers}</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{totalActivePlayers}</div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{t.engineStatus}</span>
            </div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t.activeTournamentsList}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                  {t.sessionsCount(visibleTournaments.length)}
                </span>
              </div>

              {/* Visibility Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/80 p-0.5 rounded-xl self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer ${
                    visibilityFilter === 'all'
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {t.filterAll} ({visibleTournaments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('public')}
                  className={`px-3 py-1 rounded-lg transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    visibilityFilter === 'public'
                      ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 font-medium'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.filterPublic} ({publicCount})</span>
                </button>
                {Boolean(user && privateCount > 0) && (
                  <button
                    type="button"
                    onClick={() => setVisibilityFilter('private')}
                    className={`px-3 py-1 rounded-lg transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      visibilityFilter === 'private'
                        ? 'bg-white text-amber-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-amber-700 font-medium'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.filterPrivate} ({privateCount})</span>
                  </button>
                )}
              </div>
            </div>

            {filteredTournaments.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl">
                  {visibilityFilter === 'private' ? '🔒' : '🎾'}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {visibilityFilter === 'private'
                    ? (lang === 'id' ? 'Belum Ada Turnamen Private' : 'No Private Tournaments')
                    : t.noTournamentsTitle}
                </h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                  {visibilityFilter === 'private'
                    ? (lang === 'id' ? 'Buat turnamen baru dan pilih status Private untuk peserta terdaftar saja.' : 'Create a new tournament and choose Private for registered players only.')
                    : t.noTournamentsDesc}
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.createFirstTourney}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.map(tourney => {
                  const leader = tourney.leaderboard[0];
                  const isFixedPair = tourney.config.pairingMode === 'fixed_pair';
                  const isPrivate = getTournamentVisibility(tourney) === 'private';
                  const pendingRequests = (tourney.joinRequests || []).filter(r => r.status === 'pending');

                  // Combined Clean Format & Target Label
                  const formatName = tourney.config.format === 'king_of_the_court'
                    ? 'King of Court'
                    : tourney.config.format.charAt(0).toUpperCase() + tourney.config.format.slice(1);
                  const targetLabel = tourney.config.scoringSystem === 'fixed_points'
                    ? `${tourney.config.targetPoints} Pts`
                    : tourney.config.tennisGameMode === 'total_games'
                    ? `${tourney.config.totalGamesTarget} Games`
                    : `Race ${tourney.config.raceToGamesTarget}G`;
                  const formatSummary = `${formatName} • ${targetLabel}${isFixedPair ? ' • Pair' : ''}`;

                  return (
                    <div
                      key={tourney.id}
                      className="rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/40 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group overflow-hidden"
                    >
                      {/* Card Header (CLICKABLE TO OPEN MATCHMAKER) */}
                      <div
                        onClick={() => onSelectTournament(tourney.id)}
                        className="p-4 border-b border-slate-100 bg-white cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTournament(tourney.id);
                            }}
                            className="font-semibold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-1 cursor-pointer"
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
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            title="Delete Tournament"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Format & Visibility (Max 2 concise items) */}
                        <div className="flex items-center justify-between gap-2">
                          {/* 1. Combined Neutral Format Tag */}
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 truncate">
                            {formatSummary}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Pending Join Requests Indicator (discreet) */}
                            {pendingRequests.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRequestsModal?.(tourney.id);
                                }}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                                title={lang === 'id' ? 'Tinjau permintaan gabung' : 'Review join requests'}
                              >
                                <span>🔔</span>
                                <span>{pendingRequests.length}</span>
                              </button>
                            )}

                            {/* 2. Interactive Visibility Toggle Badge with Smooth Transitions */}
                            <TournamentVisibilityBadge
                              tournamentId={tourney.id}
                              visibility={getTournamentVisibility(tourney)}
                              onToggle={onUpdateTournamentVisibility}
                              lang={lang}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Body Metrics (Also clickable to open) */}
                      <div
                        onClick={() => onSelectTournament(tourney.id)}
                        className="p-4 space-y-3 cursor-pointer"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="text-slate-500 block text-[10px] uppercase font-medium">
                              {t.activeCourts}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {t.courtCountLabel(tourney.config.courtCount)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                            <span className="text-slate-500 block text-[10px] uppercase font-medium">
                              {t.registeredPlayers}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              {t.participantsCount(tourney.players.length, isFixedPair)}
                            </span>
                          </div>
                        </div>

                        {/* Leader Preview */}
                        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">
                                {t.temporaryRank1}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs truncate block">
                                {leader?.name || t.noMatchYet}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              {leader?.pointsWon || 0}
                            </span>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">
                              {tourney.config.scoringSystem === 'tennis_games' ? 'Games' : 'Pts'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Enter Button & Live Score Share */}
                      <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.roundsCreated(tourney.rounds.length)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Invite Players Link Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyInviteLink(e, tourney.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-medium shadow-xs cursor-pointer"
                            title={t.copyInviteLink}
                          >
                            {copiedInviteId === tourney.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 text-[11px] font-semibold">{t.inviteLinkCopied}</span>
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
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-medium shadow-xs cursor-pointer"
                              title={t.shareLiveScore}
                            >
                              {copiedShareId === tourney.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 text-[11px] font-semibold">{t.liveScoreCopied}</span>
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
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{t.enterMatchmaker}</span>
                            <ArrowRight className="w-3 h-3" />
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
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs overflow-y-auto p-4 sm:p-6 flex items-start justify-center animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-6 sm:my-10 space-y-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle Light Mode Accents */}
            <div className="absolute -top-24 right-0 w-72 h-72 bg-emerald-50/70 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-0 w-72 h-72 bg-sky-50/70 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t.modalCreateTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t.modalCreateSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-5 relative z-10">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  {t.eventNameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.eventNamePlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder:text-slate-400"
                />
              </div>

              {/* Tournament Visibility (Public Live vs Private) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center justify-between">
                  <span>{t.visibilityLabel}</span>
                  <span className="text-[10px] font-normal text-slate-500 lowercase">
                    {visibility === 'public' ? 'Live score spectator enabled' : 'Roster members only'}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${visibility === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold text-xs ${visibility === 'public' ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {t.visibilityPublic}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {t.visibilityPublicDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/50 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${visibility === 'private' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold text-xs ${visibility === 'private' ? 'text-amber-800' : 'text-slate-700'}`}>
                        {t.visibilityPrivate}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {t.visibilityPrivateDesc}
                    </p>
                  </button>
                </div>
              </div>

              {/* Courts Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    {t.courtSelectionLabel}
                  </label>
                  <span className="text-xs text-emerald-700 font-bold">
                    {courtCount} {lang === 'en' ? 'Courts' : 'Lapangan'} ({requiredCapacity} {lang === 'en' ? 'Players' : 'Pemain'})
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCourtCount(num)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        courtCount === num
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pairing Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
                  {t.pairingModeLabel}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPairingMode('individual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      pairingMode === 'individual'
                        ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-700 mb-0.5">{t.individualMode}</div>
                    <div className="text-[11px] text-slate-500">{t.individualModeDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPairingMode('fixed_pair')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      pairingMode === 'fixed_pair'
                        ? 'bg-emerald-50/80 border-emerald-500 text-slate-900 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-700 mb-0.5">{t.fixedPairMode}</div>
                    <div className="text-[11px] text-slate-500">{t.fixedPairModeDesc}</div>
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
                  {t.matchFormatLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('americano')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      format === 'americano'
                        ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Shuffle className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="font-bold text-xs text-slate-900">Americano</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('mexicano')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      format === 'mexicano'
                        ? 'bg-cyan-50 border-cyan-500 text-slate-900 ring-1 ring-cyan-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-4 h-4 mx-auto mb-1 text-cyan-600 font-bold text-xs">⚡</div>
                    <div className="font-bold text-xs text-slate-900">Mexicano</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('king_of_the_court')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      format === 'king_of_the_court'
                        ? 'bg-amber-50 border-amber-500 text-slate-900 ring-1 ring-amber-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Crown className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div className="font-bold text-xs text-slate-900">King Court</div>
                  </button>
                </div>
              </div>

              {/* Scoring System */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
                  {t.scoringSystemLabel}
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setScoringSystem('tennis_games')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scoringSystem === 'tennis_games'
                        ? 'bg-cyan-50 border-cyan-500 text-slate-900 ring-1 ring-cyan-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-700 mb-0.5">{t.tennisPointSystem}</div>
                    <div className="text-[11px] text-slate-500">{t.tennisPointDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScoringSystem('fixed_points')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scoringSystem === 'fixed_points'
                        ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-emerald-700 mb-0.5">{t.fixedPoints}</div>
                    <div className="text-[11px] text-slate-500">{t.fixedPointsDesc}</div>
                  </button>
                </div>

                {scoringSystem === 'tennis_games' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        onClick={() => setTennisGameMode('total_games')}
                        className={`p-2.5 rounded-lg border cursor-pointer ${
                          tennisGameMode === 'total_games' ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/30 text-slate-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-bold block text-cyan-700">{t.totalGamesOption}</span>
                        <input
                          type="number"
                          min={2}
                          max={16}
                          value={totalGamesTarget}
                          onChange={e => setTotalGamesTarget(Number(e.target.value) || 6)}
                          className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-center font-bold text-slate-900 text-xs mt-1"
                        />
                      </div>

                      <div
                        onClick={() => setTennisGameMode('race_to')}
                        className={`p-2.5 rounded-lg border cursor-pointer ${
                          tennisGameMode === 'race_to' ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/30 text-slate-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-bold block text-cyan-700">{t.raceToOption}</span>
                        <input
                          type="number"
                          min={2}
                          max={12}
                          value={raceToGamesTarget}
                          onChange={e => setRaceToGamesTarget(Number(e.target.value) || 6)}
                          className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-center font-bold text-slate-900 text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs mt-2">
                      <span className="text-slate-800 font-medium">{t.puntoDeOro}</span>
                      <button
                        type="button"
                        onClick={() => setGoldenPoint(!goldenPoint)}
                        className={`w-9 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${goldenPoint ? 'bg-emerald-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${goldenPoint ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {scoringSystem === 'fixed_points' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Target Points:</span>
                    <div className="flex gap-1.5">
                      {([16, 21, 24, 32] as FixedPointsOption[]).map(pts => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setTargetPoints(pts)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                            targetPoints === pts
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
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
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    {t.rosterLabel(playerList.length)}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Reclub Import Button */}
                    <button
                      type="button"
                      onClick={() => setShowReclubModal(true)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-[9px]">R</span>
                      <span>{lang === 'id' ? 'Import Reclub' : 'Import Reclub'}</span>
                    </button>

                    {/* Clear Button */}
                    {playerList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPlayerList([])}
                        className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-[11px] rounded-lg font-medium transition-colors border border-slate-200 cursor-pointer"
                      >
                        {lang === 'id' ? 'Kosongkan' : 'Clear'}
                      </button>
                    )}

                    {/* Quick Preset Buttons */}
                    <button
                      type="button"
                      onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg font-medium border border-slate-200 cursor-pointer"
                    >
                      Preset {requiredCapacity}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity + 2))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg font-medium border border-slate-200 cursor-pointer"
                    >
                      +{2} Sit-out
                    </button>
                  </div>
                </div>

                {sitOutCount > 0 && (
                  <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-lg mb-2 flex items-center justify-between">
                    <span>⚠️ {t.sitOutAlert(sitOutCount)}</span>
                    <span className="font-bold text-blue-700">Fair Rest</span>
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayer(); } }}
                    placeholder={t.playerInputPlaceholder}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {t.addBtn}
                  </button>
                </div>

                {playerList.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-2.5">
                    <Users className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {lang === 'id'
                        ? 'Roster pemain masih kosong. Masukkan nama manual di atas, import dari Reclub, atau gunakan preset.'
                        : 'Player roster is currently empty. Add player names above, import from Reclub, or use a preset.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowReclubModal(true)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-[9px]">R</span>
                        <span>{lang === 'id' ? 'Import Peserta dari Reclub' : 'Import from Reclub'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayerList(DEFAULT_PRESET_NAMES.slice(0, requiredCapacity))}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
                      >
                        {lang === 'id' ? `Isi Cepat (${requiredCapacity} Pemain)` : `Fill Preset (${requiredCapacity})`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                    {playerList.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs"
                      >
                        <span>{p}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(i)}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
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
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 relative z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={!isCapacitySufficient}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
