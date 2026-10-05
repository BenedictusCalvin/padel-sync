import React, { useEffect } from 'react';
import type { LeaderboardEntry } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import { Crown, Sparkles, RotateCcw, X } from 'lucide-react';

interface PodiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  leaderboard: LeaderboardEntry[];
  tournamentName: string;
  lang: Language;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  isOpen,
  onClose,
  onReset,
  leaderboard,
  tournamentName,
  lang
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const t = translations[lang];

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-8 text-center shadow-2xl my-6 sm:my-auto relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-white p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700/80 transition-all z-50 cursor-pointer shadow-lg"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Decorative Neon Blurs */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{t.podiumConcluded}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            {t.podiumTitle}
          </h2>
          <p className="text-slate-400 text-sm mb-8">{tournamentName}</p>

          {/* 3D Podium Layout */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto mb-8">
            {/* Rank 2 (Silver) */}
            {top2 && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-300/20 border border-slate-300/40 text-slate-200 flex items-center justify-center mb-2 font-black text-lg">
                  🥈
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[100px] mb-1">
                  {top2.name}
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold mb-2">
                  {top2.pointsWon} pts
                </div>
                <div className="w-full h-24 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl border-t border-slate-500/40 flex items-center justify-center font-black text-2xl text-slate-300">
                  2
                </div>
              </div>
            )}

            {/* Rank 1 (Gold - King) */}
            {top1 && (
              <div className="flex flex-col items-center -mt-6">
                <div className="relative">
                  <Crown className="w-7 h-7 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center mb-2 font-black text-2xl shadow-lg shadow-amber-500/20">
                    🥇
                  </div>
                </div>
                <div className="text-sm sm:text-base font-black text-white truncate max-w-[120px] mb-1">
                  {top1.name}
                </div>
                <div className="text-sm font-mono text-amber-400 font-extrabold mb-2">
                  {top1.pointsWon} pts
                </div>
                <div className="w-full h-36 bg-gradient-to-t from-amber-600/40 via-amber-500/30 to-amber-400/40 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center font-black text-3xl text-amber-300 shadow-xl shadow-amber-500/10">
                  1
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 && (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-900/30 border border-amber-700/50 text-amber-400 flex items-center justify-center mb-2 font-black text-lg">
                  🥉
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[100px] mb-1">
                  {top3.name}
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold mb-2">
                  {top3.pointsWon} pts
                </div>
                <div className="w-full h-16 bg-gradient-to-t from-slate-900 to-amber-950/60 rounded-t-2xl border-t border-amber-800/40 flex items-center justify-center font-black text-xl text-amber-600">
                  3
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700"
            >
              {t.viewFullStandings}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.newTournamentBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
