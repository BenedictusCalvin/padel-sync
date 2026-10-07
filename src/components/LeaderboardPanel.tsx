import React, { useState, useMemo } from 'react';
import type { LeaderboardEntry, TournamentConfig, Round } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import { mapLeaderboardToPlayerRows } from '../utils/scheduler';
import {
  Trophy,
  Search,
  Share2,
  Check,
  Crown,
  Users,
  EyeOff,
  ArrowRight
} from 'lucide-react';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
  config: TournamentConfig;
  lang: Language;
  currentRound: number;
  isSpectatorMode?: boolean;
  isCompleted?: boolean;
  rounds?: Round[];
  onViewFullLeaderboard?: () => void;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  leaderboard,
  config,
  lang,
  currentRound,
  isSpectatorMode = false,
  isCompleted = false,
  rounds = [],
  onViewFullLeaderboard
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const isHiddenForSpectators = Boolean(
    config.advancedSettings?.hidePublicLeaderboard && isSpectatorMode && !isCompleted
  );

  const playerRows = useMemo(
    () => mapLeaderboardToPlayerRows(leaderboard, rounds),
    [leaderboard, rounds]
  );

  const filtered = leaderboard.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFixedPair = config.pairingMode === 'fixed_pair';

  const handleShare = () => {
    const text = `🏆 *PDL UP LIVE STANDINGS (Round ${currentRound})*\n` +
      `Format: ${config.format.toUpperCase()} (${isFixedPair ? 'Fixed Pairs' : 'Individual'})\n` +
      `Scoring: ${config.scoringSystem === 'fixed_points' ? `Fixed ${config.targetPoints} Pts` : `${config.tennisGameMode === 'total_games' ? `Total ${config.totalGamesTarget} Sets` : `Race to ${config.raceToGamesTarget} Sets`}`}\n\n` +
      leaderboard
        .slice(0, 10)
        .map((e, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          return `${medal} ${e.name} — ${e.pointsWon} pts (${e.pointDiff >= 0 ? '+' : ''}${e.pointDiff}) [${e.matchesWon}W-${e.matchesLost}L]`;
        })
        .join('\n') +
      `\n\nGenerated with PDL UP Tournament Engine`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <span>{t.liveStandingsTitle}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200/80 shrink-0">
                R{currentRound}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isFixedPair ? t.teamStandings : t.individualStandings}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onViewFullLeaderboard && (
            <button
              type="button"
              onClick={onViewFullLeaderboard}
              className="px-2 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
              title={lang === 'id' ? 'Buka Tabel Klasemen Lengkap' : 'View Full Leaderboard'}
            >
              <span>{lang === 'id' ? 'Tabel Penuh' : 'Full Table'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title={t.copyStandingsBtn}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px] font-bold hidden sm:inline">{t.copiedText}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] hidden sm:inline">{t.copyStandingsBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder(isFixedPair)}
            className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 3. Minimalist PDL UP Inline Table (Option A - Desktop Sidebar) */}
      <div className="flex-1 overflow-y-auto max-h-[580px]">
        {isHiddenForSpectators ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <EyeOff className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {lang === 'id' ? 'Klasemen Publik Disembunyikan' : 'Public Standings Hidden'}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {lang === 'id'
                ? 'Peringkat klasemen disembunyikan oleh penyelenggara dan akan diumumkan secara lengkap setelah seluruh putaran selesai.'
                : 'Standings are hidden during the tournament. Rankings will be revealed once the tournament is finished.'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            {t.noScoresYet}
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-2 px-1 text-center w-7">#</th>
                <th className="py-2 px-2 text-left">{isFixedPair ? (lang === 'id' ? 'Tim' : 'Team') : (lang === 'id' ? 'Pemain' : 'Player')}</th>
                <th className="py-2 px-1 text-center w-11">W-L</th>
                <th className="py-2 px-1 text-center w-14">DIFF</th>
                <th className="py-2 px-1 text-center w-9">+M</th>
                <th className="py-2 px-2 text-right w-11 text-blue-600">P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((entry, idx) => {
                const displayRank = entry.rank ?? (idx + 1);
                const isTop1 = displayRank === 1;
                const isTop2 = displayRank === 2;
                const isTop3 = displayRank === 3;
                const displayPoints = entry.effectivePoints ?? entry.pointsWon;
                const hasComp = Boolean(entry.compensationPoints && entry.compensationPoints > 0);
                const pRow = playerRows.find(r => r.id === entry.id);

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isTop1
                        ? 'bg-amber-50/40 hover:bg-amber-50/60'
                        : isTop2
                        ? 'bg-slate-50/50 hover:bg-slate-100/60'
                        : isTop3
                        ? 'bg-amber-50/20 hover:bg-amber-50/40'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* 1. Rank # */}
                    <td className="px-1 py-1.5 text-center align-middle">
                      <div
                        className={`w-5 h-5 mx-auto rounded-md font-bold text-[10px] font-mono flex items-center justify-center shrink-0 ${
                          isTop1
                            ? 'bg-amber-500 text-white shadow-2xs ring-1 ring-amber-300'
                            : isTop2
                            ? 'bg-slate-200 text-slate-700'
                            : isTop3
                            ? 'bg-amber-100 text-amber-800'
                            : 'text-slate-500 font-semibold'
                        }`}
                      >
                        {displayRank}
                      </div>
                    </td>

                    {/* 2. Pemain */}
                    <td className="px-2 py-1.5 align-middle min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-slate-900 text-xs truncate" title={entry.name}>
                          {entry.name}
                        </span>
                        {isTop1 && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                        {entry.sitOutCount > 0 && (
                          <span
                            className="text-[9px] text-slate-400 shrink-0 font-medium"
                            title={`Sit-out: ${entry.sitOutCount}x`}
                          >
                            ☕
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. W-L */}
                    <td className="px-1 py-1.5 text-center align-middle font-mono text-[11px] text-slate-600 font-medium tabular-nums">
                      {entry.matchesWon}-{entry.matchesLost}
                    </td>

                    {/* 4. DIFF with Micro Dot Matrix Underneath */}
                    <td className="px-1 py-1.5 text-center align-middle">
                      <div
                        className={`font-mono font-bold text-xs tabular-nums leading-none ${
                          entry.pointDiff > 0
                            ? 'text-emerald-600'
                            : entry.pointDiff < 0
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {entry.pointDiff > 0 ? `+${entry.pointDiff}` : entry.pointDiff}
                      </div>
                      {/* Dot matrix riwayat: Titik bulat kecil w-1.5 h-1.5 rounded-full */}
                      {pRow && pRow.matchHistoryDots.length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-1 overflow-hidden">
                          {pRow.matchHistoryDots.slice(-5).map((res, i) => (
                            <span
                              key={i}
                              title={`Match: ${res.toUpperCase()}`}
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                res === 'win'
                                  ? 'bg-emerald-500'
                                  : res === 'loss'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 5. +M (Dedicated Column for Compensation) */}
                    <td className="px-1 py-1.5 text-center align-middle">
                      {hasComp ? (
                        <span
                          className="font-mono font-bold text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/80 inline-block tabular-nums"
                          title={`+${entry.compensationPoints} Compensation Points dari sit-out`}
                        >
                          +{entry.compensationPoints}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-300">-</span>
                      )}
                    </td>

                    {/* 6. P (Total Points, Bold Blue, tabular-nums) */}
                    <td className="px-2 py-1.5 text-right align-middle">
                      <span className="font-mono font-bold text-blue-600 text-base tabular-nums">
                        {displayPoints}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Footer Summary */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1 font-medium">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t.registeredParticipantsFooter(leaderboard.length, isFixedPair)}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono font-medium">
          {config.advancedSettings?.sortByWinsBeforePoints ? 'W > PTS > DIFF' : t.rankingCriteria}
        </span>
      </div>
    </div>
  );
};
