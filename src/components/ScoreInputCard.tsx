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
      className={`rounded-2xl transition-all duration-200 border p-5 shadow-sm relative overflow-hidden ${
        isKing
          ? 'bg-gradient-to-b from-amber-50/40 via-white to-white border-amber-300 ring-1 ring-amber-200'
          : match.completed
          ? 'bg-slate-50/60 border-slate-200'
          : 'bg-white border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Court Header Banner */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {isKing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold tracking-wide shadow-2xs">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>KING COURT 1</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold">
              <span>{match.courtName || `Court ${match.courtId}`}</span>
            </div>
          )}

          {/* Scoring rule indicator badge */}
          <span className="text-[11px] font-medium font-mono text-emerald-700 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70">
            {isFixedPoints && `Fixed ${config.targetPoints} Pts`}
            {isTotalGames && `Total ${config.totalGamesTarget} Games`}
            {isRaceToGames && `Race to ${config.raceToGamesTarget} Games`}
          </span>

          {config.goldenPoint && (
            <span className="text-[10px] font-semibold text-amber-700 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/80 hidden sm:inline">
              Punto de Oro
            </span>
          )}
        </div>

        {/* Verification Status */}
        {isReadOnly ? (
          match.completed ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>{t.verifiedBtn}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>LIVE</span>
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => onToggleComplete(match.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              match.completed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{match.completed ? t.verifiedBtn : t.verifyBtn}</span>
          </button>
        )}
      </div>

      {/* Main Teams & Score Board */}
      <div>
        <div className="grid grid-cols-7 gap-2.5 items-center">
          {/* TEAM A (Cols 3) */}
          <div
            className={`col-span-3 p-3.5 rounded-2xl border transition-all ${
              isTeamAWinner && match.completed
                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                {match.teamA.name || t.teamA}
              </span>
              {isTeamAWinner && match.completed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                  <Trophy className="w-3 h-3 text-emerald-600" />
                  {t.winBadge}
                </span>
              )}
            </div>

            {/* Players in Team A */}
            <div className="space-y-0.5 mb-3 min-h-[42px]">
              <div className="text-sm sm:text-base font-semibold text-slate-900 truncate leading-tight">
                {p1A}
              </div>
              {p2A && (
                <div className="text-xs sm:text-sm font-medium text-slate-600 truncate leading-tight">
                  {p2A}
                </div>
              )}
            </div>

            {/* King of the court movement */}
            {config.format === 'king_of_the_court' && (
              <div className="text-[10px] font-semibold mb-2 flex items-center gap-1">
                {isTeamAWinner ? (
                  <span className="text-emerald-700 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" /> {t.kingPromote(Math.max(1, match.courtId - 1))}
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" /> {t.kingRelegate(match.courtId + 1)}
                  </span>
                )}
              </div>
            )}

            {/* Scoreboard Stepper & Number */}
            {isReadOnly ? (
              <div className="py-2 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                  {scoreA}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleUpdateTeamA(scoreA - 1)}
                  disabled={scoreA <= 0}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  aria-label="Decrease score A"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <div className={`text-3xl font-bold font-mono tabular-nums text-center flex-1 ${
                  scoreA > scoreB ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                  {scoreA}
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateTeamA(scoreA + 1)}
                  disabled={isComplementary && scoreA >= targetLimit}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  aria-label="Increase score A"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>

          {/* VS Divider (Col 1) */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-slate-400 tracking-wider">VS</span>
            <span className="text-[10px] text-slate-500 font-mono mt-1 text-center font-medium">
              {isComplementary ? `${scoreA + scoreB}/${targetLimit}` : 'Games'}
            </span>
          </div>

          {/* TEAM B (Cols 3) */}
          <div
            className={`col-span-3 p-3.5 rounded-2xl border transition-all ${
              isTeamBWinner && match.completed
                ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-200 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 truncate">
                {match.teamB.name || t.teamB}
              </span>
              {isTeamBWinner && match.completed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 flex items-center gap-0.5">
                  <Trophy className="w-3 h-3 text-sky-600" />
                  {t.winBadge}
                </span>
              )}
            </div>

            {/* Players in Team B */}
            <div className="space-y-0.5 mb-3 min-h-[42px]">
              <div className="text-sm sm:text-base font-semibold text-slate-900 truncate leading-tight">
                {p1B}
              </div>
              {p2B && (
                <div className="text-xs sm:text-sm font-medium text-slate-600 truncate leading-tight">
                  {p2B}
                </div>
              )}
            </div>

            {/* King of the court movement */}
            {config.format === 'king_of_the_court' && (
              <div className="text-[10px] font-semibold mb-2 flex items-center gap-1">
                {isTeamBWinner ? (
                  <span className="text-sky-700 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" /> {t.kingPromote(Math.max(1, match.courtId - 1))}
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center gap-0.5">
                    <ArrowDown className="w-3 h-3" /> {t.kingRelegate(match.courtId + 1)}
                  </span>
                )}
              </div>
            )}

            {/* Scoreboard Stepper & Number */}
            {isReadOnly ? (
              <div className="py-2 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                  {scoreB}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleUpdateTeamB(scoreB - 1)}
                  disabled={scoreB <= 0}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  aria-label="Decrease score B"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <div className={`text-3xl font-bold font-mono tabular-nums text-center flex-1 ${
                  scoreB > scoreA ? 'text-sky-600' : 'text-slate-900'
                }`}>
                  {scoreB}
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateTeamB(scoreB + 1)}
                  disabled={isComplementary && scoreB >= targetLimit}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  aria-label="Increase score B"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Bar & Score Quick Presets */}
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          {isComplementary && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex mb-2.5">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(scoreA / (targetLimit || 1)) * 100}%` }}
              />
              <div
                className="bg-sky-500 h-full transition-all duration-300"
                style={{ width: `${(scoreB / (targetLimit || 1)) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {t.shortcuts}
            </span>
            <div className="flex gap-1.5 overflow-x-auto py-0.5">
              {presetRatios.map((item, idx) => {
                const isSelected = scoreA === item.a && scoreB === item.b;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onScoreChange(match.id, item.a, item.b)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                        : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border-slate-200/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
