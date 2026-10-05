import React, { useState } from 'react';
import type { LeaderboardEntry, MatchFormat } from '../types/tournament';
import {
  Trophy,
  Search,
  X,
  Share2,
  Check,
  Crown,
  Coffee,
  ArrowUpDown
} from 'lucide-react';

interface LeaderboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  format: MatchFormat;
  currentRound: number;
}

export const LeaderboardDrawer: React.FC<LeaderboardDrawerProps> = ({
  isOpen,
  onClose,
  leaderboard,
  format,
  currentRound
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filtered = leaderboard.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = () => {
    const text = `🏆 *PDL UP LIVE STANDINGS (Round ${currentRound})*\n` +
      `Format: ${format.toUpperCase()}\n\n` +
      leaderboard
        .slice(0, 10)
        .map((e, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          return `${medal} ${e.name} — ${e.pointsWon} pts (${e.pointDiff >= 0 ? '+' : ''}${e.pointDiff}) [${e.matchesWon}W-${e.matchesLost}L]`;
        })
        .join('\n') +
      `\n\nGenerated with PDL UP Matchmaker`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Live Leaderboard
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/30">
                  Ronde {currentRound}
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                Urutan: Total Poin &gt; Selisih Poin (+/-) &gt; Kemenangan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
              title="Copy Standings to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama pemain di klasemen..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Standings Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Tidak ada data pemain yang cocok.
            </div>
          ) : (
            filtered.map((entry, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    isTop1
                      ? 'bg-gradient-to-r from-amber-950/30 to-slate-900 border-amber-500/40 shadow-md shadow-amber-500/10'
                      : isTop2
                      ? 'bg-gradient-to-r from-slate-800/40 to-slate-900 border-slate-400/40'
                      : isTop3
                      ? 'bg-gradient-to-r from-amber-900/20 to-slate-900 border-amber-700/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Rank + Name + Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${
                        isTop1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm sm:text-base truncate">
                          {entry.name}
                        </span>
                        {isTop1 && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{entry.matchesPlayed} Main ({entry.matchesWon}M - {entry.matchesLost}K)</span>
                        {entry.sitOutCount > 0 && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Coffee className="w-3 h-3 text-slate-400" />
                            {entry.sitOutCount}x Bench
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Points Stats */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div className="text-lg font-black font-mono text-emerald-400">
                        {entry.pointsWon}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Poin Total
                      </div>
                    </div>

                    <div className="w-16">
                      <div
                        className={`text-sm font-bold font-mono ${
                          entry.pointDiff > 0
                            ? 'text-emerald-400'
                            : entry.pointDiff < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {entry.pointDiff > 0 ? `+${entry.pointDiff}` : entry.pointDiff}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">
                        Diff (+/-)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400 flex items-center justify-between">
          <span>Klasemen otomatis ter-update setiap verifikasi skor lapangan</span>
          <span className="font-bold text-slate-300">{leaderboard.length} Pemain Aktif</span>
        </div>
      </div>
    </div>
  );
};
