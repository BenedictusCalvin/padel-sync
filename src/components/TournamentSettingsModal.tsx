import React, { useState, useEffect } from 'react';
import type {
  TournamentAdvancedSettings,
  PairingAlgorithm,
  ScoringType,
  TiebreakingRule
} from '../types/tournament';
import {
  Settings,
  X,
  Calendar,
  Trophy,
  Sliders,
  ChevronDown,
  Check,
  Award,
  EyeOff,
  Scale
} from 'lucide-react';

interface TournamentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  currentSettings?: Partial<TournamentAdvancedSettings>;
  onSave: (settings: TournamentAdvancedSettings) => void;
  lang?: 'en' | 'id';
}

export const TournamentSettingsModal: React.FC<TournamentSettingsModalProps> = ({
  isOpen,
  onClose,
  tournamentName: initialTournamentName,
  currentSettings,
  onSave,
  lang = 'id'
}) => {
  const isId = lang === 'id';

  // --- Form State ---
  const [tournamentName, setTournamentName] = useState(initialTournamentName);
  const [pairingAlgorithm, setPairingAlgorithm] = useState<PairingAlgorithm>(
    currentSettings?.pairingAlgorithm || 'smart_pairing'
  );
  const [scoringType, setScoringType] = useState<ScoringType>(
    currentSettings?.scoringType || 'points'
  );
  const [pointsPerMatch, setPointsPerMatch] = useState<number>(
    currentSettings?.pointsPerMatch || 24
  );
  const [dateTime, setDateTime] = useState<string>(
    () => currentSettings?.dateTime || new Date().toISOString().slice(0, 16)
  );

  // --- Advanced Toggles ---
  const [sortByWinsBeforePoints, setSortByWinsBeforePoints] = useState<boolean>(
    currentSettings?.sortByWinsBeforePoints || false
  );
  const [tiebreakingRule, setTiebreakingRule] = useState<TiebreakingRule>(
    currentSettings?.tiebreakingRule || 'diff'
  );
  const [hidePublicLeaderboard, setHidePublicLeaderboard] = useState<boolean>(
    currentSettings?.hidePublicLeaderboard || false
  );
  const [disableCompensationPoints, setDisableCompensationPoints] = useState<boolean>(
    currentSettings?.disableCompensationPoints || false
  );

  useEffect(() => {
    if (isOpen) {
      setTournamentName(initialTournamentName);
      if (currentSettings) {
        if (currentSettings.pairingAlgorithm) setPairingAlgorithm(currentSettings.pairingAlgorithm);
        if (currentSettings.scoringType) setScoringType(currentSettings.scoringType);
        if (currentSettings.pointsPerMatch) setPointsPerMatch(currentSettings.pointsPerMatch);
        if (currentSettings.dateTime) setDateTime(currentSettings.dateTime);
        if (currentSettings.sortByWinsBeforePoints !== undefined) {
          setSortByWinsBeforePoints(currentSettings.sortByWinsBeforePoints);
        }
        if (currentSettings.tiebreakingRule) setTiebreakingRule(currentSettings.tiebreakingRule);
        if (currentSettings.hidePublicLeaderboard !== undefined) {
          setHidePublicLeaderboard(currentSettings.hidePublicLeaderboard);
        }
        if (currentSettings.disableCompensationPoints !== undefined) {
          setDisableCompensationPoints(currentSettings.disableCompensationPoints);
        }
      }
    }
  }, [isOpen, initialTournamentName, currentSettings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      tournamentName: tournamentName.trim() || initialTournamentName,
      pairingAlgorithm,
      scoringType,
      pointsPerMatch,
      dateTime,
      sortByWinsBeforePoints,
      tiebreakingRule,
      hidePublicLeaderboard,
      disableCompensationPoints
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {isId ? 'Pengaturan Turnamen & Aturan Lanjutan' : 'Tournament Settings & Advanced Rules'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isId
                  ? 'Konfigurasi algoritma matchmaking, sistem skoring, dan kalkulasi peringkat'
                  : 'Configure matchmaking algorithm, scoring rules, and standings calculations'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Section 1: Tournament Setup Fields */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isId ? 'Pengaturan Utama' : 'General Configuration'}
                </h3>
              </div>

              {/* Tournament Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isId ? 'Nama Turnamen' : 'Tournament Name'}
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={e => setTournamentName(e.target.value)}
                  placeholder="e.g. Saturday Padel Open 2026"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-sm font-medium text-slate-900 shadow-2xs transition-all outline-none"
                />
              </div>

              {/* Pairing Algorithm & Scoring Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pairing Algorithm */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isId ? 'Algoritma Pasangan (Pairing)' : 'Pairing Algorithm'}
                  </label>
                  <div className="relative">
                    <select
                      value={pairingAlgorithm}
                      onChange={e => setPairingAlgorithm(e.target.value as PairingAlgorithm)}
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-all outline-none cursor-pointer"
                    >
                      <option value="smart_pairing">
                        {isId ? 'Smart Pairing (Rekomendasi)' : 'Smart Pairing (Recommended)'}
                      </option>
                      <option value="strict_ranking">
                        {isId ? 'Strict Ranking (Rank 1 & 4 vs 2 & 3)' : 'Strict Ranking (Rank 1 & 4 vs 2 & 3)'}
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {pairingAlgorithm === 'smart_pairing'
                      ? isId
                        ? 'Memasangkan berdasarkan klasemen terdekat + memprioritaskan rotasi partner baru.'
                        : 'Pairs players close in standings while actively minimizing repeat partners.'
                      : isId
                        ? 'Murni memasangkan Rank 1&4 vs Rank 2&3 tanpa penalti riwayat partner.'
                        : 'Strictly pairs Rank 1&4 vs Rank 2&3 without partner history balancing.'}
                  </p>
                </div>

                {/* Scoring Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isId ? 'Tipe Skoring' : 'Scoring Type'}
                  </label>
                  <div className="relative">
                    <select
                      value={scoringType}
                      onChange={e => {
                        const newType = e.target.value as ScoringType;
                        setScoringType(newType);
                        if (newType === 'points' && pointsPerMatch < 16) {
                          setPointsPerMatch(24);
                        } else if (newType === 'sets' && pointsPerMatch > 12) {
                          setPointsPerMatch(5);
                        }
                      }}
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-all outline-none cursor-pointer"
                    >
                      <option value="points">
                        {isId ? 'Point Scoring (Fixed Target Points)' : 'Point Scoring (Fixed Points)'}
                      </option>
                      <option value="sets">
                        {isId ? 'Game / Sets (Aturan Tenis/Set)' : 'Game / Sets (Tennis/Sets)'}
                      </option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {scoringType === 'points'
                      ? isId ? 'Total target skor terkunci (misal 16, 21, 24, 32 poin).' : 'Locked target score per match (e.g. 16, 21, 24, 32 pts).'
                      : isId ? 'Sistem set tenis (misal Total 4/5/6 Set atau Race to X Set).' : 'Tennis sets system (e.g. Total of 5 Sets or Race to X Sets).'}
                  </p>
                </div>
              </div>

              {/* Points per Match & Date Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Points / Sets per Match */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isId ? 'Poin / Set Tiap Match' : 'Points per Match'}
                  </label>
                  <div className="relative">
                    <select
                      value={pointsPerMatch}
                      onChange={e => setPointsPerMatch(Number(e.target.value))}
                      className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-all outline-none cursor-pointer"
                    >
                      {scoringType === 'points' ? (
                        <>
                          <option value={16}>16 Points</option>
                          <option value={21}>21 Points</option>
                          <option value={24}>24 Points</option>
                          <option value={32}>32 Points</option>
                        </>
                      ) : (
                        <>
                          <option value={4}>{isId ? 'Total of 4 Sets' : 'Total of 4 Sets'}</option>
                          <option value={5}>{isId ? 'Total of 5 Games / Sets' : 'Total of 5 Games / Sets'}</option>
                          <option value={6}>{isId ? 'Total of 6 Sets' : 'Total of 6 Sets'}</option>
                          <option value={8}>{isId ? 'Total of 8 Sets' : 'Total of 8 Sets'}</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Tournament Date & Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isId ? 'Tanggal & Waktu Turnamen' : 'Tournament Date & Time'}
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={e => setDateTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-all outline-none"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Additional Settings (Advanced Toggles) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Trophy className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isId ? 'Aturan Lanjutan & Klasemen (Advanced Rules)' : 'Additional Settings & Standings Rules'}
                </h3>
              </div>

              {/* 1. Sort by Wins Before Points Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 transition-all hover:border-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Prioritaskan Kemenangan Sebelum Poin (Wins Before Points)' : 'Sort by Wins Before Points'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isId
                      ? 'Pemain diurutkan berdasarkan jumlah kemenangan (W) terlebih dahulu, baru kemudian total poin dan selisih poin.'
                      : 'Rank players by wins first, then by points.'}
                  </p>
                </div>

                {/* iOS Style Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={sortByWinsBeforePoints}
                  onClick={() => setSortByWinsBeforePoints(!sortByWinsBeforePoints)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    sortByWinsBeforePoints ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      sortByWinsBeforePoints ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 2. Tiebreaking Rule Dropdown */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Aturan Tiebreaking (Penentu Seri)' : 'Tiebreaking Rule'}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={tiebreakingRule}
                    onChange={e => setTiebreakingRule(e.target.value as TiebreakingRule)}
                    className="w-full appearance-none px-3.5 py-2.5 pr-9 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-all outline-none cursor-pointer"
                  >
                    <option value="diff">
                      {isId ? 'Point Differential (Diff) — Selisih Poin' : 'Point Differential (Diff)'}
                    </option>
                    <option value="head_to_head">
                      {isId ? 'Head-to-Head — Hasil Pertemuan Langsung' : 'Head-to-Head'}
                    </option>
                    <option value="allow_tied">
                      {isId ? 'Allow tied ranks — Beri Peringkat Kembar' : 'Allow tied ranks'}
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500">
                  {tiebreakingRule === 'allow_tied'
                    ? isId
                      ? 'Pemain dengan poin & metrik identik akan menempati peringkat juara bersama (misal: Rank 1 kembar).'
                      : 'Players with identical records share the same ranking position.'
                    : tiebreakingRule === 'head_to_head'
                    ? isId
                      ? 'Jika poin seri, diutamakan siapa yang unggul saat kedua pemain pernah bertanding sebagai lawan.'
                      : 'Resolves ties based on direct match results between the tied players.'
                    : isId
                      ? 'Menggunakan selisih poin (Poin Menang - Poin Kebobolan) sebagai pemecah seri utama.'
                      : 'Uses point differential (Points Won minus Points Conceded) as primary tiebreaker.'}
                </p>
              </div>

              {/* 3. Hide Public Leaderboard Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 transition-all hover:border-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Sembunyikan Klasemen Publik' : 'Hide Public Leaderboard'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isId
                      ? 'Sembunyikan peringkat klasemen pada link turnamen publik. Klasemen hanya akan terbuka untuk penonton setelah seluruh turnamen selesai.'
                      : 'Hide leaderboard rankings on the public tournament link. Standings are revealed once the tournament is finished.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={hidePublicLeaderboard}
                  onClick={() => setHidePublicLeaderboard(!hidePublicLeaderboard)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    hidePublicLeaderboard ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      hidePublicLeaderboard ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 4. Disable Compensation Points (+M) Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 transition-all hover:border-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {isId ? 'Nonaktifkan Poin Kompensasi (+M)' : 'Disable Compensation Points (+M)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isId
                      ? 'Pemain yang bermain lebih sedikit (karena sit-out / istirahat) tidak akan mendapatkan poin kompensasi tambahan untuk menutup selisih pertandingan.'
                      : 'Players who play fewer matches than others will not receive extra compensation points to make up the difference.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={disableCompensationPoints}
                  onClick={() => setDisableCompensationPoints(!disableCompensationPoints)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    disableCompensationPoints ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      disableCompensationPoints ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              {isId ? 'Batal' : 'Close'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isId ? 'Simpan Pengaturan' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
