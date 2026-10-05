import React from 'react';
import type { Match, TournamentConfig } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import { Minus, Plus, Crown, Check, Trophy, ArrowUp, ArrowDown } from 'lucide-react';

interface ScoreInputCardProps {
  match: Match;
  config: TournamentConfig;
  lang: Language;
  playerNamesMap: Map<string, string>;
  onScoreChange: (matchId: string, teamAScore: number, teamBScore: number) => void;
  onToggleComplete: (matchId: string) => void;
  isReadOnly?: boolean;
}

export const ScoreInputCard: React.FC<ScoreInputCardProps> = ({
  match,
  config,
  lang,
  playerNamesMap,
  onScoreChange,
  onToggleComplete,
  isReadOnly = false
}) => {
  const t = translations[lang];
  const isKing = config.format === 'king_of_the_court' && match.courtId === 1;
  const isFixedPoints = config.scoringSystem === 'fixed_points';
  const isTotalGames = config.scoringSystem === 'tennis_games' && config.tennisGameMode === 'total_games';
  const isRaceToGames = config.scoringSystem === 'tennis_games' && config.tennisGameMode === 'race_to';

  const scoreA = match.teamA.score;
  const scoreB = match.teamB.score;

  const targetLimit = isFixedPoints
    ? config.targetPoints
    : isTotalGames
    ? config.totalGamesTarget
    : config.raceToGamesTarget;

  const p1A = playerNamesMap.get(match.teamA.player1Id) || match.teamA.name || 'Player 1';
  const p2A = playerNamesMap.get(match.teamA.player2Id) || '';
  const p1B = playerNamesMap.get(match.teamB.player1Id) || match.teamB.name || 'Player 3';
  const p2B = playerNamesMap.get(match.teamB.player2Id) || '';

  const isTeamAWinner = scoreA > scoreB;
  const isTeamBWinner = scoreB > scoreA;

  // Complementary score handler (for Fixed Points OR Total of X Games)
  const isComplementary = isFixedPoints || isTotalGames;

  const handleUpdateTeamA = (newScoreA: number) => {
    if (isComplementary) {
      const clampedA = Math.max(0, Math.min(targetLimit, newScoreA));
      const complementaryB = targetLimit - clampedA;
      onScoreChange(match.id, clampedA, complementaryB);
    } else {
      // Race to
      const clampedA = Math.max(0, newScoreA);
      onScoreChange(match.id, clampedA, scoreB);
    }
  };

  const handleUpdateTeamB = (newScoreB: number) => {
    if (isComplementary) {
      const clampedB = Math.max(0, Math.min(targetLimit, newScoreB));
      const complementaryA = targetLimit - clampedB;
      onScoreChange(match.id, complementaryA, clampedB);
    } else {
      // Race to
      const clampedB = Math.max(0, newScoreB);
      onScoreChange(match.id, scoreA, clampedB);
    }
  };

  // Quick preset ratios
  let presetRatios: { label: string; a: number; b: number }[] = [];
  if (isComplementary) {
    const half = Math.floor(targetLimit / 2);
    presetRatios = [
      { label: `${half}-${targetLimit - half}`, a: half, b: targetLimit - half },
      { label: `${half + 1}-${targetLimit - (half + 1)}`, a: half + 1, b: targetLimit - (half + 1) },
      { label: `${targetLimit - 1}-1`, a: targetLimit - 1, b: 1 },
      { label: `${targetLimit}-0`, a: targetLimit, b: 0 },
      { label: `0-${targetLimit}`, a: 0, b: targetLimit }
    ];
  } else {
    // Race to presets
    presetRatios = [
      { label: `${targetLimit}-0`, a: targetLimit, b: 0 },
      { label: `${targetLimit}-2`, a: targetLimit, b: 2 },
      { label: `${targetLimit}-${targetLimit - 1}`, a: targetLimit, b: targetLimit - 1 },
      { label: `0-${targetLimit}`, a: 0, b: targetLimit },
      { label: `2-${targetLimit}`, a: 2, b: targetLimit }
    ];
  }

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border relative overflow-hidden ${
        isKing
          ? 'king-court-glow bg-gradient-to-b from-amber-950/20 via-slate-900/95 to-slate-950 border-amber-500/50'
          : match.completed
          ? 'bg-slate-900/90 border-slate-700/80 shadow-lg'
          : 'glass-panel border-slate-800 hover:border-slate-700 shadow-xl'
      }`}
    >
      {/* Court Header Banner */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          {isKing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>KING COURT 1</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
              <span>{match.courtName || `Court ${match.courtId}`}</span>
            </div>
          )}

          {/* Scoring rule indicator badge */}
          <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
            {isFixedPoints && `Fixed ${config.targetPoints} Pts`}
            {isTotalGames && `Total ${config.totalGamesTarget} Games`}
            {isRaceToGames && `Race to ${config.raceToGamesTarget} Games`}
          </span>

          {config.goldenPoint && (
            <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 hidden sm:inline">
              Punto de Oro
            </span>
          )}
        </div>

        {isReadOnly ? (
          match.completed ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" />
              <span>{t.verifiedBtn}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>LIVE</span>
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => onToggleComplete(match.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              match.completed
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{match.completed ? t.verifiedBtn : t.verifyBtn}</span>
          </button>
        )}
      </div>

      {/* Main Teams & Score Board */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 items-center">
          {/* TEAM A (Cols 3) */}
          <div
            className={`col-span-3 p-3 rounded-xl border transition-all ${
              isTeamAWinner && match.completed
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/70 border-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                {match.teamA.name || t.teamA}
              </span>
              {isTeamAWinner && match.completed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-0.5">
                  <Trophy className="w-3 h-3 text-emerald-400" />
                  {t.winBadge}
                </span>
              )}
            </div>

            {/* Players in Team A */}
            <div className="space-y-0.5 mb-2.5 min-h-[38px]">
              <div className="text-xs sm:text-sm font-semibold text-white truncate">{p1A}</div>
              {p2A && <div className="text-xs sm:text-sm font-semibold text-slate-300 truncate">{p2A}</div>}
            </div>

            {/* King of the court movement */}
            {config.format === 'king_of_the_court' && (
              <div className="text-[10px] font-medium mb-2 flex items-center gap-1">
                {isTeamAWinner ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" /> {t.kingPromote(Math.max(1, match.courtId - 1))}
                  </span>
                ) : (
                  <span className="text-amber-400/80 flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" /> {t.kingRelegate(match.courtId + 1)}
                  </span>
                )}
              </div>
            )}

            {/* Stepper & Number */}
            {isReadOnly ? (
              <div className="py-1 text-center bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {scoreA}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleUpdateTeamA(scoreA - 1)}
                  disabled={scoreA <= 0}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="text-2xl font-black font-mono text-emerald-400 text-center flex-1">
                  {scoreA}
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateTeamA(scoreA + 1)}
                  disabled={isComplementary && scoreA >= targetLimit}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* VS Divider (Col 1) */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-slate-500 tracking-widest">VS</span>
            <span className="text-[10px] text-slate-600 font-mono mt-1 text-center">
              {isComplementary ? `${scoreA + scoreB}/${targetLimit}` : 'Games'}
            </span>
          </div>

          {/* TEAM B (Cols 3) */}
          <div
            className={`col-span-3 p-3 rounded-xl border transition-all ${
              isTeamBWinner && match.completed
                ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/70 border-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 truncate">
                {match.teamB.name || t.teamB}
              </span>
              {isTeamBWinner && match.completed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 flex items-center gap-0.5">
                  <Trophy className="w-3 h-3 text-cyan-400" />
                  {t.winBadge}
                </span>
              )}
            </div>

            {/* Players in Team B */}
            <div className="space-y-0.5 mb-2.5 min-h-[38px]">
              <div className="text-xs sm:text-sm font-semibold text-white truncate">{p1B}</div>
              {p2B && <div className="text-xs sm:text-sm font-semibold text-slate-300 truncate">{p2B}</div>}
            </div>

            {/* King of the court movement */}
            {config.format === 'king_of_the_court' && (
              <div className="text-[10px] font-medium mb-2 flex items-center gap-1">
                {isTeamBWinner ? (
                  <span className="text-cyan-400 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" /> {t.kingPromote(Math.max(1, match.courtId - 1))}
                  </span>
                ) : (
                  <span className="text-amber-400/80 flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" /> {t.kingRelegate(match.courtId + 1)}
                  </span>
                )}
              </div>
            )}

            {/* Stepper & Number */}
            {isReadOnly ? (
              <div className="py-1 text-center bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-3xl font-black font-mono text-cyan-400">
                  {scoreB}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleUpdateTeamB(scoreB - 1)}
                  disabled={scoreB <= 0}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="text-2xl font-black font-mono text-cyan-400 text-center flex-1">
                  {scoreB}
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateTeamB(scoreB + 1)}
                  disabled={isComplementary && scoreB >= targetLimit}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Bar & Score Quick Presets */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          {isComplementary && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex mb-2">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(scoreA / (targetLimit || 1)) * 100}%` }}
              />
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${(scoreB / (targetLimit || 1)) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t.shortcuts}</span>
            <div className="flex gap-1 overflow-x-auto">
              {presetRatios.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onScoreChange(match.id, item.a, item.b)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                    scoreA === item.a && scoreB === item.b
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
