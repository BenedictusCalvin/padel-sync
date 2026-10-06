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

  // Local editable draft state
  const [name, setName] = useState(config.name);
  const [format, setFormat] = useState<MatchFormat>(config.format);
  const [pairingMode, setPairingMode] = useState<PairingMode>(config.pairingMode);
  const [scoringSystem, setScoringSystem] = useState<ScoringSystem>(config.scoringSystem);
  const [targetPoints, setTargetPoints] = useState<FixedPointsOption>(config.targetPoints);
  const [tennisGameMode, setTennisGameMode] = useState<TennisGameMode>(config.tennisGameMode);
  const [totalGamesTarget, setTotalGamesTarget] = useState<number>(config.totalGamesTarget);
  const [raceToGamesTarget, setRaceToGamesTarget] = useState<number>(config.raceToGamesTarget);
  const [goldenPoint, setGoldenPoint] = useState<boolean>(config.goldenPoint);
  const [courtCount, setCourtCount] = useState<number>(config.courtCount);
  const [visibility, setVisibility] = useState<TournamentVisibility>(config.visibility || 'public');

  const [playerList, setPlayerList] = useState<string[]>(players.map(p => p.name));
  const [newPlayerName, setNewPlayerName] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showReclubModal, setShowReclubModal] = useState(false);

  // Sync when config or players change externally
  useEffect(() => {
    setName(config.name);
    setFormat(config.format);
    setPairingMode(config.pairingMode);
    setScoringSystem(config.scoringSystem);
    setTargetPoints(config.targetPoints);
    setTennisGameMode(config.tennisGameMode);
    setTotalGamesTarget(config.totalGamesTarget);
    setRaceToGamesTarget(config.raceToGamesTarget);
    setGoldenPoint(config.goldenPoint);
    setCourtCount(config.courtCount);
    setVisibility(config.visibility || 'public');
    setPlayerList(players.map(p => p.name));
  }, [config, players]);

  const requiredCapacity = courtCount * 4;
  const isCapacitySufficient = playerList.length >= requiredCapacity;
  const sitOutCount = Math.max(0, playerList.length - requiredCapacity);

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (playerList.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert(lang === 'en' ? 'Player already in roster!' : 'Pemain sudah ada di daftar!');
      return;
    }
    setPlayerList([...playerList, trimmed]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (index: number) => {
    setPlayerList(playerList.filter((_, i) => i !== index));
  };

  const handleBulkAdd = () => {
    const names = bulkInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const uniqueNew = names.filter(
      n => !playerList.some(existing => existing.toLowerCase() === n.toLowerCase())
    );

    setPlayerList([...playerList, ...uniqueNew]);
    setBulkInput('');
    setShowBulkModal(false);
  };

  const handleLoadPreset = (count: number) => {
    const selected = PRESET_PLAYER_NAMES.slice(0, count);
    setPlayerList(selected);
  };

  const handleApply = () => {
    if (!isCapacitySufficient) {
      alert(
        lang === 'en'
          ? `Requires at least ${requiredCapacity} players for ${courtCount} courts!`
          : `Dibutuhkan minimal ${requiredCapacity} pemain untuk ${courtCount} lapangan!`
      );
      return;
    }

    if (
      !confirm(
        lang === 'en'
          ? 'Applying new setup will reset round progression and reschedule matches from Round 1. Proceed?'
          : 'Menerapkan pengaturan ini akan me-reset progres ronde dan menjadwal ulang dari Ronde 1. Lanjutkan?'
      )
    ) {
      return;
    }

    const updatedConfig: TournamentConfig = {
      ...config,
      name,
      format,
      pairingMode,
      scoringSystem,
      targetPoints,
      tennisGameMode,
      totalGamesTarget,
      raceToGamesTarget,
      goldenPoint,
      courtCount,
      visibility
    };

    const updatedPlayers: Player[] = playerList.map((pName, idx) => ({
      id: `p-${idx + 1}-${Date.now()}`,
      name: pName,
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
      {/* Accordion Toggle Bar */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
            ⚙️
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{t.setupAccordionTitle}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                visibility === 'private'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {visibility === 'private' ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                <span>{visibility === 'private' ? t.visibilityPrivate : t.visibilityPublic}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                {isOpen ? t.clickToCollapse : t.clickToExpand}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{t.courtCountLabel(courtCount)}</span>
              <span>•</span>
              <span className="capitalize">{pairingMode === 'fixed_pair' ? t.fixedPairMode : t.individualMode}</span>
              <span>•</span>
              <span className="capitalize font-semibold text-emerald-700">{format.replace(/_/g, ' ')}</span>
              <span>•</span>
              <span>
                {scoringSystem === 'fixed_points'
                  ? `Fixed ${targetPoints} Pts`
                  : tennisGameMode === 'total_games'
                  ? `Tennis: Total of ${totalGamesTarget} Sets`
                  : `Tennis: Race to ${raceToGamesTarget} Sets`}
              </span>
            </div>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body Content */}
      {isOpen && (
        <div className="p-6 border-t border-slate-100 space-y-6 bg-slate-50/50 animate-fadeIn">
          {/* Section 1: Courts & Event Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                {t.eventNameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  {t.courtSelectionLabel}
                </label>
                <span className="text-xs text-emerald-700 font-bold">
                  {t.courtCountLabel(courtCount)} ({requiredCapacity} {lang === 'en' ? 'Players' : 'Pemain'})
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCourtCount(num)}
                    className={`py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      courtCount === num
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Tournament Visibility (Public vs Private) */}
          <div className="pt-4 border-t border-slate-200/80">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {visibility === 'public' ? (
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{t.visibilityLabel}</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
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
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  visibility === 'public'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-emerald-800">{t.visibilityPublic}</span>
                  </div>
                  {visibility === 'public' && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {lang === 'id' ? 'Aktif' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {t.visibilityPublicDesc}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVisibility('private');
                  onUpdateVisibility?.('private');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  visibility === 'private'
                    ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/50 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-xs text-amber-800">{t.visibilityPrivate}</span>
                  </div>
                  {visibility === 'private' && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      {lang === 'id' ? 'Aktif' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {t.visibilityPrivateDesc}
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Pairing Mode & Match Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/80">
            {/* Pairing Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                {t.pairingModeLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPairingMode('individual')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    pairingMode === 'individual'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-800 mb-1">{t.individualMode}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {t.individualModeDesc}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPairingMode('fixed_pair')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    pairingMode === 'fixed_pair'
                      ? 'bg-sky-50/80 border-sky-500 ring-1 ring-sky-500/50 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="font-bold text-xs text-sky-800 mb-1">{t.fixedPairMode}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {t.fixedPairModeDesc}
                  </div>
                </button>
              </div>
            </div>

            {/* Match Format */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                {t.matchFormatLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('americano')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    format === 'americano'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <Shuffle className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <div className="font-bold text-xs text-slate-900">Americano</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Round-Robin</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('mexicano')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    format === 'mexicano'
                      ? 'bg-sky-50/80 border-sky-500 ring-1 ring-sky-500/50 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="w-4 h-4 mx-auto mb-1 text-sky-600 font-bold text-xs flex items-center justify-center">⚡</div>
                  <div className="font-bold text-xs text-slate-900">Mexicano</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Swiss Ladder</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('king_of_the_court')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    format === 'king_of_the_court'
                      ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/50 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <Crown className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <div className="font-bold text-xs text-slate-900">King Court</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Up / Down</div>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Scoring Rules */}
          <div className="pt-4 border-t border-slate-200/80">
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
              {t.scoringSystemLabel}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setScoringSystem('tennis_games')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  scoringSystem === 'tennis_games'
                    ? 'bg-sky-50/80 border-sky-500 ring-1 ring-sky-500/50 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="font-bold text-xs text-sky-800 mb-0.5">{t.tennisPointSystem}</div>
                <div className="text-[11px] text-slate-500">
                  {t.tennisPointDesc}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScoringSystem('fixed_points')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  scoringSystem === 'fixed_points'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="font-bold text-xs text-emerald-800 mb-0.5">{t.fixedPoints}</div>
                <div className="text-[11px] text-slate-500">
                  {t.fixedPointsDesc}
                </div>
              </button>
            </div>

            {scoringSystem === 'fixed_points' && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                <span className="text-xs font-semibold text-slate-700">Target Points:</span>
                <div className="flex gap-2">
                  {([16, 21, 24, 32] as FixedPointsOption[]).map(pts => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setTargetPoints(pts)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        targetPoints === pts
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pts} Pts
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scoringSystem === 'tennis_games' && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setTennisGameMode('total_games')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      tennisGameMode === 'total_games'
                        ? 'bg-sky-50/80 border-sky-400 ring-1 ring-sky-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold text-xs text-sky-800 mb-1">{t.totalGamesOption}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                        <select
                          value={totalGamesTarget}
                          onChange={e => {
                            setTotalGamesTarget(Number(e.target.value));
                            setTennisGameMode('total_games');
                          }}
                          className="appearance-none w-20 pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 hover:border-sky-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 rounded-lg text-center font-bold text-slate-900 text-sm shadow-2xs cursor-pointer transition-all outline-none"
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16].map(num => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {t.totalGamesDesc}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setTennisGameMode('race_to')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      tennisGameMode === 'race_to'
                        ? 'bg-sky-50/80 border-sky-400 ring-1 ring-sky-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold text-xs text-sky-800 mb-1">{t.raceToOption}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                        <select
                          value={raceToGamesTarget}
                          onChange={e => {
                            setRaceToGamesTarget(Number(e.target.value));
                            setTennisGameMode('race_to');
                          }}
                          className="appearance-none w-20 pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 hover:border-sky-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 rounded-lg text-center font-bold text-slate-900 text-sm shadow-2xs cursor-pointer transition-all outline-none"
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                            <option key={num} value={num}>
                              {num}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {t.raceToDesc}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{t.puntoDeOro}</span>
                    <span className="text-slate-500 ml-2">{t.puntoDeOroDesc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoldenPoint(!goldenPoint)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      goldenPoint ? 'bg-emerald-600' : 'bg-slate-300'
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
          <div className="pt-4 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {t.rosterLabel(playerList.length)}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Boolean(pendingRequestsCount > 0) && (
                  <button
                    type="button"
                    onClick={onOpenRequestsModal}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all animate-pulse cursor-pointer"
                    title={lang === 'id' ? 'Tinjau permintaan join pemain' : 'Review player join requests'}
                  >
                    <span>🔔</span>
                    <span>{t.pendingRequestsBadge(pendingRequestsCount)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReclubModal(true)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-[9px]">R</span>
                  <span>{lang === 'id' ? 'Import Reclub' : 'Import Reclub'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(requiredCapacity)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg font-semibold border border-slate-200 cursor-pointer"
                >
                  Preset {requiredCapacity}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(requiredCapacity + 2)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded-lg font-semibold border border-slate-200 cursor-pointer"
                >
                  +{2} Sit-out
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerList([])}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] rounded-lg font-semibold border border-rose-200 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Capacity status alert */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
                !isCapacitySufficient
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : sitOutCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
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
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addBtn}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                <span>Batch Paste</span>
              </button>
            </div>

            {/* List chips */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-slate-100/70 rounded-xl border border-slate-200">
              {playerList.map((pName, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs font-medium"
                >
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">#{idx + 1}</span>
                  <span>{pName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(idx)}
                    className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Apply & Restart Button */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onToggleOpen}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isCapacitySufficient}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.applyAndRegenerate}</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Paste Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Batch Paste</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            <textarea
              rows={8}
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              placeholder="Paste names separated by newlines or commas..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono text-xs"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={!bulkInput.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
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
