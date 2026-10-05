import React, { useState, useEffect } from 'react';
import type {
  TournamentConfig,
  Player,
  MatchFormat,
  PairingMode,
  ScoringSystem,
  TennisGameMode,
  FixedPointsOption,
  TournamentVisibility
} from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import {
  Trophy,
  Users,
  Layers,
  Plus,
  Trash2,
  ClipboardList,
  Shuffle,
  Crown,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  Globe,
  Lock
} from 'lucide-react';
import { ReclubImportModal } from './ReclubImportModal';

interface SetupAccordionProps {
  config: TournamentConfig;
  players: Player[];
  lang: Language;
  isOpen: boolean;
  onToggleOpen: () => void;
  onApplyConfig: (newConfig: TournamentConfig, newPlayers: Player[]) => void;
  onUpdateVisibility?: (newVisibility: TournamentVisibility) => void;
  onOpenRequestsModal?: () => void;
  pendingRequestsCount?: number;
}

const PRESET_PLAYER_NAMES = [
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

export const SetupAccordion: React.FC<SetupAccordionProps> = ({
  config,
  players,
  lang,
  isOpen,
  onToggleOpen,
  onApplyConfig,
  onUpdateVisibility,
  onOpenRequestsModal,
  pendingRequestsCount = 0
}) => {
  const t = translations[lang];
  const [name, setName] = useState<string>(config.name);
  const [courtCount, setCourtCount] = useState<number>(config.courtCount);
  const [visibility, setVisibility] = useState<TournamentVisibility>(config.visibility || 'public');

  useEffect(() => {
    if (config.visibility) {
      setVisibility(config.visibility);
    }
  }, [config.visibility]);
  const [pairingMode, setPairingMode] = useState<PairingMode>(config.pairingMode);
  const [format, setFormat] = useState<MatchFormat>(config.format);
  const [scoringSystem, setScoringSystem] = useState<ScoringSystem>(config.scoringSystem);
  const [targetPoints, setTargetPoints] = useState<FixedPointsOption>(config.targetPoints);
  const [tennisGameMode, setTennisGameMode] = useState<TennisGameMode>(config.tennisGameMode);
  const [totalGamesTarget, setTotalGamesTarget] = useState<number>(config.totalGamesTarget);
  const [raceToGamesTarget, setRaceToGamesTarget] = useState<number>(config.raceToGamesTarget);
  const [goldenPoint, setGoldenPoint] = useState<boolean>(config.goldenPoint);

  const [playerList, setPlayerList] = useState<string[]>(players.map(p => p.name));
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [bulkInput, setBulkInput] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [showReclubModal, setShowReclubModal] = useState<boolean>(false);

  // Capacity calculations
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

  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;
    const names = bulkInput
      .split(/[\n,;]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const uniqueNew = names.filter(
      n => !playerList.some(p => p.toLowerCase() === n.toLowerCase())
    );

    setPlayerList([...playerList, ...uniqueNew]);
    setBulkInput('');
    setShowBulkModal(false);
  };

  const handleLoadPreset = (count: number) => {
    setPlayerList(PRESET_PLAYER_NAMES.slice(0, count));
  };

  const handleApply = () => {
    if (!isCapacitySufficient) {
      alert(t.capacityAlert(requiredCapacity, playerList.length));
      return;
    }

    const updatedConfig: TournamentConfig = {
      ...config,
      name: name || 'PDL UP Tournament',
      courtCount,
      pairingMode,
      format,
      scoringSystem,
      targetPoints,
      tennisGameMode,
      totalGamesTarget,
      raceToGamesTarget,
      goldenPoint,
      visibility
    };

    const updatedPlayers: Player[] = playerList.map((pName, idx) => ({
      id: `p-${idx + 1}`,
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

    onApplyConfig(updatedConfig, updatedPlayers);
    onToggleOpen();
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
      {/* Accordion Toggle Bar */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            ⚙️
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{t.setupAccordionTitle}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                visibility === 'private'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {visibility === 'private' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                <span>{visibility === 'private' ? t.visibilityPrivate : t.visibilityPublic}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {isOpen ? t.clickToCollapse : t.clickToExpand}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{t.courtCountLabel(courtCount)}</span>
              <span>•</span>
              <span className="capitalize">{pairingMode === 'fixed_pair' ? t.fixedPairMode : t.individualMode}</span>
              <span>•</span>
              <span className="capitalize font-semibold text-emerald-400">{format.replace(/_/g, ' ')}</span>
              <span>•</span>
              <span>
                {scoringSystem === 'fixed_points'
                  ? `Fixed ${targetPoints} Pts`
                  : tennisGameMode === 'total_games'
                  ? `Tennis: Total of ${totalGamesTarget} Games`
                  : `Tennis: Race to ${raceToGamesTarget} Games`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body Content */}
      {isOpen && (
        <div className="p-6 border-t border-slate-800 space-y-6 bg-slate-950/60 animate-fadeIn">
          {/* Section 1: Courts & Event Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                {t.eventNameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  {t.courtSelectionLabel}
                </label>
                <span className="text-xs text-emerald-400 font-bold">
                  {t.courtCountLabel(courtCount)} ({requiredCapacity} {lang === 'en' ? 'Players' : 'Pemain'})
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCourtCount(num)}
                    className={`py-2 rounded-lg border font-bold text-xs transition-all ${
                      courtCount === num
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Tournament Visibility (Public vs Private) */}
          <div className="pt-4 border-t border-slate-800/80">
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {visibility === 'public' ? (
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{t.visibilityLabel}</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {visibility === 'public' ? t.visibilityPublic : t.visibilityPrivate}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setVisibility('public');
                  onUpdateVisibility?.('public');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  visibility === 'public'
                    ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-emerald-400">{t.visibilityPublic}</span>
                  </div>
                  {visibility === 'public' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      {lang === 'id' ? 'Aktif' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {t.visibilityPublicDesc}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVisibility('private');
                  onUpdateVisibility?.('private');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  visibility === 'private'
                    ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-amber-400">{t.visibilityPrivate}</span>
                  </div>
                  {visibility === 'private' && (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md">
                      {lang === 'id' ? 'Aktif' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {t.visibilityPrivateDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Pairing Mode & Match Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            {/* Pairing Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {t.pairingModeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPairingMode('individual')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    pairingMode === 'individual'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-400 mb-1">{t.individualMode}</div>
                  <div className="text-[11px] text-slate-300 leading-tight">
                    {t.individualModeDesc}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPairingMode('fixed_pair')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    pairingMode === 'fixed_pair'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-cyan-400 mb-1">{t.fixedPairMode}</div>
                  <div className="text-[11px] text-slate-300 leading-tight">
                    {t.fixedPairModeDesc}
                  </div>
                </button>
              </div>
            </div>

            {/* Match Format */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {t.matchFormatLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('americano')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    format === 'americano'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Shuffle className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <div className="font-bold text-xs text-white">Americano</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Round-Robin</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('mexicano')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    format === 'mexicano'
                      ? 'bg-cyan-500/15 border-cyan-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-4 h-4 mx-auto mb-1 text-cyan-400 font-bold text-xs">⚡</div>
                  <div className="font-bold text-xs text-white">Mexicano</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Swiss Ladder</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('king_of_the_court')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    format === 'king_of_the_court'
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Crown className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <div className="font-bold text-xs text-white">King Court</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Up / Down</div>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Scoring Rules */}
          <div className="pt-4 border-t border-slate-800/80">
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase">
              {t.scoringSystemLabel}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setScoringSystem('tennis_games')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  scoringSystem === 'tennis_games'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs text-cyan-400 mb-0.5">{t.tennisPointSystem}</div>
                <div className="text-[11px] text-slate-300">
                  {t.tennisPointDesc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScoringSystem('fixed_points')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  scoringSystem === 'fixed_points'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs text-emerald-400 mb-0.5">{t.fixedPoints}</div>
                <div className="text-[11px] text-slate-300">
                  {t.fixedPointsDesc}
                </div>
              </button>
            </div>

            {scoringSystem === 'fixed_points' && (
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-300">Target Points:</span>
                <div className="flex gap-2">
                  {([16, 21, 24, 32] as FixedPointsOption[]).map(pts => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setTargetPoints(pts)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        targetPoints === pts
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {pts} Pts
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scoringSystem === 'tennis_games' && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setTennisGameMode('total_games')}
                    className={`p-3 rounded-xl border cursor-pointer ${
                      tennisGameMode === 'total_games'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-400 mb-1">{t.totalGamesOption}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={2}
                        max={16}
                        value={totalGamesTarget}
                        onChange={e => setTotalGamesTarget(Math.max(2, Number(e.target.value) || 6))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center font-bold text-white text-sm"
                      />
                      <span className="text-[11px] text-slate-300">
                        {t.totalGamesDesc}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setTennisGameMode('race_to')}
                    className={`p-3 rounded-xl border cursor-pointer ${
                      tennisGameMode === 'race_to'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-cyan-400 mb-1">{t.raceToOption}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={2}
                        max={12}
                        value={raceToGamesTarget}
                        onChange={e => setRaceToGamesTarget(Math.max(2, Number(e.target.value) || 6))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center font-bold text-white text-sm"
                      />
                      <span className="text-[11px] text-slate-300">
                        {t.raceToDesc}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-white">{t.puntoDeOro}</span>
                    <span className="text-slate-400 ml-2">{t.puntoDeOroDesc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoldenPoint(!goldenPoint)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                      goldenPoint ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        goldenPoint ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Player Roster */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {t.rosterLabel(playerList.length)}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Boolean(pendingRequestsCount > 0) && (
                  <button
                    type="button"
                    onClick={onOpenRequestsModal}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded flex items-center gap-1.5 shadow-sm transition-all animate-pulse"
                    title={lang === 'id' ? 'Tinjau permintaan join pemain' : 'Review player join requests'}
                  >
                    <span>🔔</span>
                    <span>{t.pendingRequestsBadge(pendingRequestsCount)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReclubModal(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold rounded flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[9px]">R</span>
                  <span>{lang === 'id' ? 'Import Reclub' : 'Import Reclub'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(requiredCapacity)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded font-medium border border-slate-700"
                >
                  Preset {requiredCapacity}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(requiredCapacity + 2)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded font-medium border border-slate-700"
                >
                  +{2} Sit-out
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerList([])}
                  className="px-2 py-1 bg-red-950/40 text-red-300 text-[11px] rounded font-medium border border-red-800/40"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Capacity status alert */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                !isCapacitySufficient
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : sitOutCount > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div>
                {!isCapacitySufficient ? (
                  <span>
                    {t.capacityAlert(requiredCapacity, playerList.length)}
                  </span>
                ) : sitOutCount > 0 ? (
                  <span>
                    {t.sitOutAlert(sitOutCount)}
                  </span>
                ) : (
                  <span>{t.perfectCapacity(playerList.length, courtCount)}</span>
                )}
              </div>
            </div>

            {/* Add & Batch paste input */}
            <div className="flex gap-2">
              <form onSubmit={handleAddPlayer} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  placeholder={t.playerInputPlaceholder}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim()}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addBtn}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                <span>Batch Paste</span>
              </button>
            </div>

            {/* List chips */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950/80 rounded-xl border border-slate-800">
              {playerList.map((pName, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                >
                  <span className="text-[10px] text-emerald-400 font-mono">#{idx + 1}</span>
                  <span>{pName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(idx)}
                    className="text-slate-500 hover:text-red-400 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Apply & Restart Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onToggleOpen}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isCapacitySufficient}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.applyAndRegenerate}</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Paste Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                Batch Paste
              </h4>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <textarea
              rows={8}
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder="Paste names separated by newlines or commas..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={!bulkInput.trim()}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl"
              >
                {t.addBtn}
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
