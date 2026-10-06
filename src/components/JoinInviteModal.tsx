import React, { useState, useEffect } from 'react';
import type { TournamentRecord, JoinRequest } from '../types/tournament';
import { getTournamentVisibility } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import type { User } from '@supabase/supabase-js';
import {
  Trophy,
  Users,
  Layers,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  Send,
  LogIn
} from 'lucide-react';

interface JoinInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentRecord | null;
  user: User | null;
  lang: Language;
  onRequestJoin: (tourneyId: string, playerName: string) => Promise<void> | void;
  onOpenTournament: (tourneyId: string) => void;
  onOpenAuthModal?: () => void;
}

export const JoinInviteModal: React.FC<JoinInviteModalProps> = ({
  isOpen,
  onClose,
  tournament,
  user,
  lang,
  onRequestJoin,
  onOpenTournament,
  onOpenAuthModal
}) => {
  const t = translations[lang];

  const defaultName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const [playerName, setPlayerName] = useState<string>(defaultName);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user && !playerName) {
      setPlayerName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    }
  }, [user]);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !tournament) return null;

  const isPrivate = getTournamentVisibility(tournament) === 'private';

  // Check if current user is already in the roster
  const userFullName = (user?.user_metadata?.full_name || '').toLowerCase().trim();
  const userEmailPrefix = (user?.email?.split('@')[0] || '').toLowerCase().trim();
  const inputNameLower = playerName.toLowerCase().trim();

  const isAlreadyInRoster = tournament.players.some(p => {
    const pName = p.name.toLowerCase().trim();
    return (
      (userFullName && pName === userFullName) ||
      (userEmailPrefix && pName === userEmailPrefix) ||
      (inputNameLower && pName === inputNameLower)
    );
  });

  // Check existing join request for current user
  const existingRequest: JoinRequest | undefined = (tournament.joinRequests || []).find(r => {
    if (user?.id && r.userId === user.id) return true;
    if (user?.email && r.userEmail === user.email) return true;
    if (inputNameLower && r.userName.toLowerCase().trim() === inputNameLower) return true;
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onRequestJoin(tournament.id, trimmed);
      setSubmittedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-lg bg-[#0c1220] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isPrivate ? 'bg-amber-500/15' : 'bg-emerald-500/15'
        }`} />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg ${
              isPrivate
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/20'
            }`}>
              {isPrivate ? <Lock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isPrivate
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  {isPrivate ? t.visibilityPrivate : t.visibilityPublic}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {tournament.config.format.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-1 line-clamp-1">
                {tournament.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 relative z-10">
          {/* Tournament Quick Specs */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>{lang === 'id' ? 'Lapangan' : 'Courts'}</span>
              </div>
              <div className="font-extrabold text-white">{tournament.config.courtCount} {lang === 'id' ? 'Court' : 'Courts'}</div>
            </div>

            <div className="space-y-0.5 text-center sm:text-left border-x border-slate-800 px-2">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>{lang === 'id' ? 'Pemain' : 'Players'}</span>
              </div>
              <div className="font-extrabold text-white">
                {tournament.players.length} / {tournament.config.courtCount * 4}
              </div>
            </div>

            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{lang === 'id' ? 'Skor' : 'Scoring'}</span>
              </div>
              <div className="font-extrabold text-amber-300 truncate">
                {tournament.config.scoringSystem === 'fixed_points'
                  ? `${tournament.config.targetPoints} Pts`
                  : `${tournament.config.totalGamesTarget || 6} Games`}
              </div>
            </div>
          </div>

          {/* Conditional States */}
          {isAlreadyInRoster ? (
            /* CASE 1: ALREADY IN ROSTER */
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{t.alreadyInRoster}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {lang === 'id'
                    ? 'Nama Anda telah terdaftar dalam susunan pemain turnamen ini. Anda dapat langsung membuka dashboard matchmaker.'
                    : 'Your name is already registered in this tournament roster. You can enter the live matchmaker now.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTournament(tournament.id);
                }}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>{t.openTournament}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : existingRequest?.status === 'pending' || submittedSuccess ? (
            /* CASE 2: PENDING APPROVAL */
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 animate-pulse">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lang === 'id' ? 'Status: Menunggu Persetujuan' : 'Status: Pending Host Review'}
                </span>
                <h3 className="text-base font-extrabold text-white mt-2">{t.requestPendingStatus}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {t.requestPendingDesc}
                </p>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-500">{lang === 'id' ? 'Nama Pemain:' : 'Player Name:'}</span>
                <span className="font-bold text-emerald-400">{playerName || existingRequest?.userName}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all"
              >
                {lang === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          ) : existingRequest?.status === 'rejected' ? (
            /* CASE 3: REJECTED */
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{t.rejectedNotice}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {lang === 'id'
                    ? 'Permohonan Anda belum disetujui oleh host turnamen saat ini.'
                    : 'Your request was not approved by the tournament host at this time.'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t.playerNamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !playerName.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  {lang === 'id' ? 'Ajukan Permohonan Lagi' : 'Request Again'}
                </button>
              </form>
            </div>
          ) : (
            /* CASE 4: REQUEST FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{t.enterPlayerName}</span>
                  {!user && onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>{t.signIn}</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={t.playerNamePlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                    required
                  />
                  {user && (
                    <span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      {user.email?.split('@')[0]}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'id'
                    ? 'Nama ini akan ditampilkan pada antrean permintaan join host dan dimasukkan ke daftar pemain setelah disetujui.'
                    : 'This name will appear on the host review queue and will be added to the tournament player roster once approved.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !playerName.trim()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? (lang === 'id' ? 'Mengirim...' : 'Sending...') : t.requestToJoin}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
