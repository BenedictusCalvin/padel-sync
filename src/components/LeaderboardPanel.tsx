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
      `Scoring: ${config.scoringSystem === 'fixed_points' ? `Fixed ${config.targetPoints} Pts` : `${config.tennisGameMode === 'total_games' ? `Total ${config.totalGamesTarget} Games` : `Race to ${config.raceToGamesTarget} Games`}`}\n\n` +
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
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {t.liveStandingsTitle}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/30">
                R{currentRound}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-emerald-400" />
              <span>{isFixedPair ? t.teamStandings : t.individualStandings}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-all"
          title={t.copyStandingsBtn}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">{t.copiedText}</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">{t.copyStandingsBtn}</span>
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder(isFixedPair)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Standings List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[580px]">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
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
                    ? 'bg-gradient-to-r from-amber-950/30 to-slate-900 border-amber-500/40 shadow-sm'
                    : isTop2
                    ? 'bg-gradient-to-r from-slate-800/40 to-slate-900 border-slate-400/40'
                    : isTop3
                    ? 'bg-gradient-to-r from-amber-900/20 to-slate-900 border-amber-700/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left: Rank + Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md font-black text-xs flex items-center justify-center shrink-0 ${
                      isTop1
                        ? 'bg-amber-500 text-slate-950'
                        : isTop2
                        ? 'bg-slate-300 text-slate-950'
                        : isTop3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white text-xs sm:text-sm truncate">
                        {entry.name}
                      </span>
                      {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{entry.matchesPlayed}M ({entry.matchesWon}W-{entry.matchesLost}L)</span>
                      {entry.sitOutCount > 0 && (
                        <span className="flex items-center gap-0.5 text-slate-500">
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
                    <div className="text-base font-black font-mono text-emerald-400">
                      {entry.pointsWon}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">
                      {config.scoringSystem === 'tennis_games' ? t.totalGamesCol : t.totalPointsCol}
                    </div>
                  </div>

                  <div className="w-12">
                    <div
                      className={`text-xs font-bold font-mono ${
                        entry.pointDiff > 0
                          ? 'text-emerald-400'
                          : entry.pointDiff < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.pointDiff > 0 ? `+${entry.pointDiff}` : entry.pointDiff}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold">
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
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.registeredParticipantsFooter(leaderboard.length, isFixedPair)}</span>
        </span>
        <span className="text-[10px] text-slate-500">{t.rankingCriteria}</span>
      </div>
    </div>
  );
};
