import React, { useState, useEffect } from 'react';
import type { TournamentRecord, JoinRequest } from '../types/tournament';
import { translations, type Language } from '../utils/translations';
import {
  Users,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Copy
} from 'lucide-react';

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentRecord | null;
  lang: Language;
  onApproveRequest: (tourneyId: string, request: JoinRequest) => void;
  onRejectRequest: (tourneyId: string, requestId: string) => void;
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  onClose,
  tournament,
  lang,
  onApproveRequest,
  onRejectRequest
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

  const requests: JoinRequest[] = tournament.joinRequests || [];
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const filteredRequests = activeTab === 'pending'
    ? pendingRequests
    : requests;

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#invite=${tournament.id}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      prompt(lang === 'id' ? 'Salin link undangan:' : 'Copy invite link:', inviteUrl);
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return lang === 'id' ? 'Baru saja' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} ${lang === 'id' ? 'mnt lalu' : 'min ago'}`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ${lang === 'id' ? 'jam lalu' : 'hours ago'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${lang === 'id' ? 'hari lalu' : 'days ago'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-xl bg-[#0c1220] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 relative z-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {lang === 'id' ? 'Persetujuan Host' : 'Host Approval'}
                </span>
                <span className="text-xs text-slate-400 font-semibold truncate max-w-[180px]">
                  {tournament.name}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                {t.joinRequestsTitle} ({pendingRequests.length})
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

        {/* Quick Invite Link Banner */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0 relative z-10">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-200">
              {lang === 'id' ? 'Tautan Undangan Turnamen' : 'Tournament Invite Link'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {window.location.origin}{window.location.pathname}#invite={tournament.id}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 flex items-center gap-1.5 shrink-0 transition-all"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t.copiedText}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyInviteLink}</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Menunggu Review' : 'Pending Review'} ({pendingRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{lang === 'id' ? 'Semua Riwayat' : 'All History'} ({requests.length})</span>
          </button>
        </div>

        {/* Requests List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredRequests.length === 0 ? (
            <div className="p-10 rounded-2xl border border-slate-800/80 bg-slate-950/40 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto text-xl">
                🎾
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                {activeTab === 'pending' ? t.noPendingRequests : (lang === 'id' ? 'Belum ada riwayat permohonan' : 'No request history')}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {lang === 'id'
                  ? 'Bagikan link undangan di atas kepada calon pemain untuk mulai menerima permohonan join.'
                  : 'Share the invite link above with prospective players to start receiving join requests.'}
              </p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isRejected = req.status === 'rejected';

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* User Avatar */}
                    {req.userAvatar ? (
                      <img
                        src={req.userAvatar}
                        alt={req.userName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {req.userName[0]?.toUpperCase() || 'P'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white truncate">{req.userName}</span>
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 shrink-0">
                            {lang === 'id' ? 'Menunggu' : 'Pending'}
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === 'id' ? 'Disetujui' : 'Approved'}</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 flex items-center gap-1 shrink-0">
                            <XCircle className="w-3 h-3" />
                            <span>{lang === 'id' ? 'Ditolak' : 'Rejected'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {req.userEmail && <span className="truncate">{req.userEmail}</span>}
                        {req.userEmail && <span>•</span>}
                        <span>{formatTimeAgo(req.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Host */}
                  {isPending ? (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onApproveRequest(tournament.id, req)}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1 transition-all"
                        title={lang === 'id' ? 'Setujui & masukkan ke daftar pemain' : 'Approve & add to player roster'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{t.approveJoin}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRejectRequest(tournament.id, req.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 font-bold text-xs rounded-xl transition-all"
                        title={lang === 'id' ? 'Tolak permohonan' : 'Reject request'}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t.rejectJoin}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500 shrink-0 self-end sm:self-center">
                      {isApproved
                        ? (lang === 'id' ? '✓ Masuk di Roster' : '✓ In Roster')
                        : (lang === 'id' ? '✗ Ditolak' : '✗ Rejected')}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            {lang === 'id'
              ? '💡 Pemain yang disetujui akan otomatis memiliki akses ke turnamen privat.'
              : '💡 Approved players automatically get full access to private tournaments.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all"
          >
            {lang === 'id' ? 'Selesai' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
