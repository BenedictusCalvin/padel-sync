import React, { useState, useEffect, useRef } from 'react';
import { Lock, Globe } from 'lucide-react';
import type { TournamentVisibility } from '../types/tournament';

export interface TournamentVisibilityBadgeProps {
  tournamentId: string;
  visibility: TournamentVisibility;
  onToggle?: (tournamentId: string, newVisibility: TournamentVisibility) => void;
  lang?: 'en' | 'id';
  className?: string;
  disabled?: boolean;
}

export const TournamentVisibilityBadge: React.FC<TournamentVisibilityBadgeProps> = ({
  tournamentId,
  visibility,
  onToggle,
  lang = 'en',
  className = '',
  disabled = false,
}) => {
  const isPrivate = visibility === 'private';
  const [isRadarPinging, setIsRadarPinging] = useState(false);
  const prevVisibilityRef = useRef(visibility);

  // Trigger radar ping effect when transitioning from private to public
  useEffect(() => {
    if (prevVisibilityRef.current === 'private' && visibility === 'public') {
      setIsRadarPinging(true);
      const timer = setTimeout(() => {
        setIsRadarPinging(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    prevVisibilityRef.current = visibility;
  }, [visibility]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !onToggle) return;

    const nextVisibility: TournamentVisibility = isPrivate ? 'public' : 'private';

    if (nextVisibility === 'public') {
      setIsRadarPinging(true);
      setTimeout(() => setIsRadarPinging(false), 1500);
    }

    onToggle(tournamentId, nextVisibility);
  };

  const tooltipTitle = isPrivate
    ? lang === 'id'
      ? 'Status: Private (Khusus Peserta). Klik untuk ganti ke Publik.'
      : 'Status: Private. Click to switch to Public.'
    : lang === 'id'
    ? 'Status: Publik (Live Score Terbuka). Klik untuk ganti ke Private.'
    : 'Status: Public Live. Click to switch to Private.';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className={`badge-toggle-btn no-press-anim relative w-[78px] h-[24px] rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer select-none shrink-0 ${
        isPrivate
          ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/90 text-amber-800'
          : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/90 text-emerald-800'
      } ${className}`}
      title={tooltipTitle}
      aria-label={tooltipTitle}
    >
      {/* 1. Radar Ring / Ping Effect (Active when switching to Public) */}
      {isRadarPinging && (
        <>
          <span
            className="absolute -inset-1.5 rounded-lg border-2 border-emerald-400 opacity-80 animate-radar-ping pointer-events-none z-10"
            aria-hidden="true"
          />
          <span
            className="absolute inset-0 rounded-md bg-emerald-400/25 animate-pulse pointer-events-none"
            aria-hidden="true"
          />
        </>
      )}

      {/* 2. Top-Right Live Beacon Indicator (Smoothly fades in when Public) */}
      <span
        className={`absolute -top-1 -right-1 flex h-2.5 w-2.5 transition-all duration-300 z-20 ${
          !isPrivate ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
        }`}
        aria-hidden="true"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white shadow-2xs" />
      </span>

      {/* 3. Morphing Icon Wrapper (Persistent absolute positioning on both icons ensures CSS transform & opacity transitions ALWAYS run) */}
      <div className="w-3.5 h-3.5 relative flex items-center justify-center shrink-0">
        {/* Lock Icon */}
        <Lock
          className={`w-3.5 h-3.5 absolute inset-0 m-auto text-amber-600 transition-all duration-300 ease-out transform ${
            isPrivate
              ? 'opacity-100 scale-100 rotate-0'
              : 'opacity-0 scale-50 rotate-90 pointer-events-none'
          }`}
        />
        {/* Globe Icon */}
        <Globe
          className={`w-3.5 h-3.5 absolute inset-0 m-auto text-emerald-600 transition-all duration-300 ease-out transform ${
            !isPrivate
              ? 'opacity-100 scale-100 rotate-0'
              : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
          }`}
        />
      </div>

      {/* 4. Text Label Wrapper (Fixed width to strictly eliminate layout shift) */}
      <div className="relative h-4 w-[42px] flex items-center justify-start overflow-hidden">
        <span
          className={`absolute left-0 text-[11px] font-semibold transition-all duration-300 ease-out leading-none ${
            isPrivate
              ? 'opacity-100 translate-y-0 text-amber-800'
              : 'opacity-0 -translate-y-2 pointer-events-none text-emerald-800'
          }`}
        >
          Private
        </span>
        <span
          className={`absolute left-0 text-[11px] font-semibold transition-all duration-300 ease-out leading-none ${
            !isPrivate
              ? 'opacity-100 translate-y-0 text-emerald-800'
              : 'opacity-0 translate-y-2 pointer-events-none text-amber-800'
          }`}
        >
          Public
        </span>
      </div>
    </button>
  );
};
