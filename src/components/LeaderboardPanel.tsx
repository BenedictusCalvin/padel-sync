import React, { useState } from 'react';
import type { LeaderboardEntry, TournamentConfig } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import {
  Trophy,
  Search,
  Share2,
  Check,
  Crown,
  Coffee,
  ArrowUpDown,
  Users
} from 'lucide-react';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
  config: TournamentConfig;
  lang: Language;
  currentRound: number;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  leaderboard,
  config,
  lang,
  currentRound
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{t.liveStandingsTitle}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200/80">
                R{currentRound}
              </span>
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <ArrowUpDown className="w-3 h-3 text-emerald-600" />
              <span>{isFixedPair ? t.teamStandings : t.individualStandings}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title={t.copyStandingsBtn}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 text-[11px] font-bold">{t.copiedText}</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] hidden sm:inline">{t.copyStandingsBtn}</span>
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder(isFixedPair)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Column Headers for Maximum Clarity */}
      <div className="px-4 py-1.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-6 text-center">#</span>
          <span>{isFixedPair ? (lang === 'id' ? 'Pasangan Tim' : 'Team') : (lang === 'id' ? 'Pemain' : 'Player')}</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="w-10 text-right">{config.scoringSystem === 'tennis_games' ? (lang === 'id' ? 'Set' : 'Sets') : 'Poin'}</span>
          <span className="w-12 text-right">+/- Diff</span>
        </div>
      </div>

      {/* Standings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[580px]">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            {t.noScoresYet}
          </div>
        ) : (
          filtered.map((entry, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            return (
              <div
                key={entry.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  isTop1
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-2xs'
                    : isTop2
                    ? 'bg-slate-50/90 border-slate-200/90 text-slate-900'
                    : isTop3
                    ? 'bg-amber-50/30 border-amber-200/60 text-slate-900'
                    : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-50 text-slate-800'
                }`}
              >
                {/* Left: Rank + Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      isTop1
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : isTop2
                        ? 'bg-slate-200 text-slate-700'
                        : isTop3
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                        {entry.name}
                      </span>
                      {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span>{entry.matchesPlayed}M ({entry.matchesWon}W-{entry.matchesLost}L)</span>
                      {entry.sitOutCount > 0 && (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Coffee className="w-2.5 h-2.5" />
                          {entry.sitOutCount}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Points & Differential */}
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                      {entry.pointsWon}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">
                      {config.scoringSystem === 'tennis_games' ? t.totalGamesCol : t.totalPointsCol}
                    </div>
                  </div>

                  <div className="w-12">
                    <div
                      className={`text-xs font-bold font-mono tabular-nums ${
                        entry.pointDiff > 0
                          ? 'text-emerald-600'
                          : entry.pointDiff < 0
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.pointDiff > 0 ? `+${entry.pointDiff}` : entry.pointDiff}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">
                      {t.diffCol}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t.registeredParticipantsFooter(leaderboard.length, isFixedPair)}</span>
        </span>
        <span className="text-[10px] text-slate-400">{t.rankingCriteria}</span>
      </div>
    </div>
  );
};
