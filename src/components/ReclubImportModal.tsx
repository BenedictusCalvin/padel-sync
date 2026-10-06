import React, { useState, useEffect, useRef } from 'react';
import { translations, type Language } from '../utils/translations';
import {
  parseReclubText,
  parseCSVAttendees,
  fetchReclubEventPlayers,
  extractReclubRef,
  isReclubUrl,
  type ReclubEventDetails
} from '../utils/reclubParser';
import {
  X,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  Users,
  FileText,
  Sparkles,
  Link2,
  Loader2,
  AlertCircle,
  MapPin,
  ExternalLink,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

interface ReclubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: string[], mode: 'replace' | 'append') => void;
  currentRosterCount: number;
  requiredCapacity?: number;
  lang: Language;
}

const RECLUB_SAMPLE = `Attendees (12)
1. Carlos Alcaraz (Host)
2. Alejandro Galan - Paid
3. Juan Lebron
4. Arturo Coello (Going)
5. Agustin Tapia
6. Paquito Navarro - Paid
7. Federico Chingotto
8. Franco Stupaczuk (Going)
9. Fernando Belasteguin
10. Sanyo Gutierrez
11. Martin Di Nenno
12. Momo Gonzalez`;

export const ReclubImportModal: React.FC<ReclubImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentRosterCount,
  requiredCapacity = 8,
  lang
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'link' | 'paste' | 'file'>('link');

  // Link tab state
  const [reclubUrl, setReclubUrl] = useState<string>('');
  const [includeWaitlist, setIncludeWaitlist] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<ReclubEventDetails | null>(null);

  // Paste & File tab state
  const [rawText, setRawText] = useState<string>('');
  const [parsedNames, setParsedNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    const names = parseReclubText(text);
    setParsedNames(names);
  };

  if (!isOpen) return null;

  const handleFetchFromLink = async (customUrl?: string) => {
    const targetUrl = (customUrl ?? reclubUrl).trim();
    if (!targetUrl) {
      setFetchError(
        lang === 'id'
          ? 'Masukkan link acara Reclub terlebih dahulu.'
          : 'Please enter a Reclub event link first.'
      );
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const result = await fetchReclubEventPlayers(targetUrl, {
        includeWaitlist,
        lang,
      });

      if (result.success && result.players.length > 0) {
        setParsedNames(result.players);
        setEventDetails(result.eventDetails || null);
        setFetchError(null);
      } else {
        setFetchError(
          result.error ||
            (lang === 'id'
              ? 'Tidak dapat mengambil daftar pemain dari tautan ini.'
              : 'Could not retrieve player list from this link.')
        );
        if (result.eventDetails) {
          setEventDetails(result.eventDetails);
        }
      }
    } catch (err: any) {
      setFetchError(
        err.message ||
          (lang === 'id'
            ? 'Terjadi kendala saat memuat data dari Reclub.'
            : 'An error occurred while loading data from Reclub.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const names = parseCSVAttendees(content);
        setParsedNames(names);
      }
    };
    reader.readAsText(file);
  };

  const handleRemoveName = (indexToRemove: number) => {
    setParsedNames(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePasteSample = () => {
    setRawText(RECLUB_SAMPLE);
    setParsedNames(parseReclubText(RECLUB_SAMPLE));
  };

  const handleClear = () => {
    setRawText('');
    setParsedNames([]);
    setFileName(null);
    setReclubUrl('');
    setEventDetails(null);
    setFetchError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSwitchToLinkFromPaste = () => {
    const detectedRef = extractReclubRef(rawText);
    const urlToUse = rawText.trim();
    setActiveTab('link');
    setReclubUrl(urlToUse);
    if (detectedRef) {
      handleFetchFromLink(urlToUse);
    }
  };

  const isUrlInRawText = isReclubUrl(rawText);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-6 sm:my-auto relative overflow-hidden space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Neon Blurs (Reclub Red-Rose Theme) */}
        <div className="absolute -top-24 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3 pr-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 font-black text-xl shrink-0">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  {lang === 'id' ? 'Import Peserta dari Reclub' : 'Import Players from Reclub'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'id'
                  ? 'Masukkan link Reclub acara, salin teks daftar peserta, atau upload file CSV/TXT.'
                  : 'Enter Reclub event link, paste copied attendees text, or upload a CSV/TXT export.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Mode Tabs: Link vs Paste vs File */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lang === 'id' ? 'Link Reclub' : 'Reclub Link'}</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 bg-white/20 text-[9px] font-black rounded-md uppercase">
              {lang === 'id' ? 'Otomatis' : 'Auto'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lang === 'id' ? 'Salin Teks' : 'Paste Text'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lang === 'id' ? 'File CSV/TXT' : 'File Upload'}</span>
          </button>
        </div>

        {/* Tab 1: Reclub Link */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{lang === 'id' ? 'Link Acara / Meet Reclub:' : 'Reclub Event / Meet Link:'}</span>
                </label>
                {reclubUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setReclubUrl('');
                      setFetchError(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    {lang === 'id' ? 'Bersihkan' : 'Clear'}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={reclubUrl}
                    onChange={(e) => {
                      setReclubUrl(e.target.value);
                      if (fetchError) setFetchError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchFromLink();
                      }
                    }}
                    placeholder={
                      lang === 'id'
                        ? 'Contoh: https://reclub.co/m/b9u2a1 atau kode event'
                        : 'E.g. https://reclub.co/m/b9u2a1 or event code'
                    }
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
                  />
                  {reclubUrl && (
                    <button
                      type="button"
                      onClick={() => setReclubUrl('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isLoading || !reclubUrl.trim()}
                  onClick={() => handleFetchFromLink()}
                  className="px-5 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-40 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'id' ? 'Menghubungkan...' : 'Fetching...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{lang === 'id' ? 'Tarik Pemain' : 'Fetch Players'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Waitlist Toggle & Helper */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeWaitlist}
                  onChange={(e) => {
                    setIncludeWaitlist(e.target.checked);
                    if (reclubUrl.trim() && parsedNames.length > 0) {
                      // re-fetch with new waitlist preference
                      handleFetchFromLink();
                    }
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                />
                <span className="font-semibold">
                  {lang === 'id'
                    ? 'Sertakan peserta di daftar tunggu (Waitlist)'
                    : 'Include waitlisted participants'}
                </span>
              </label>

              <span className="text-[11px] text-slate-500">
                {lang === 'id'
                  ? 'Default: hanya pemain terkonfirmasi (Approved / Going)'
                  : 'Default: approved / going players only'}
              </span>
            </div>

            {/* Error Message with Guidance */}
            {fetchError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-2 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-300">{lang === 'id' ? 'Gagal Mengambil Data:' : 'Import Notice:'}</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{fetchError}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-rose-900/40 text-[11px]">
                  <span className="text-rose-400 font-semibold">{lang === 'id' ? 'Solusi alternatif:' : 'Alternative option:'}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className="inline-flex items-center gap-1 text-white hover:text-rose-300 font-bold underline underline-offset-2 cursor-pointer"
                  >
                    <span>{lang === 'id' ? 'Buka Tab Salin-Tempel Teks' : 'Switch to Paste Text Tab'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Event Info Card if fetched */}
            {eventDetails && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{eventDetails.title}</span>
                  </div>
                  <a
                    href={`https://reclub.co/m/${eventDetails.ref}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <span>{lang === 'id' ? 'Buka di Reclub' : 'View on Reclub'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300 pt-0.5">
                  {eventDetails.venueName && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{eventDetails.venueName}</span>
                    </span>
                  )}
                  <span>
                    <strong>{eventDetails.confirmedCount}</strong> {lang === 'id' ? 'Terkonfirmasi' : 'Confirmed'}
                  </span>
                  {eventDetails.waitlistCount > 0 && (
                    <span className="text-amber-300">
                      <strong>{eventDetails.waitlistCount}</strong> {lang === 'id' ? 'Waitlist' : 'Waitlist'}
                    </span>
                  )}
                  {eventDetails.numPlayers && (
                    <span className="text-slate-400">
                      ({lang === 'id' ? `Kapasitas: ${eventDetails.numPlayers}` : `Capacity: ${eventDetails.numPlayers}`})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Tips on how to get link */}
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                {lang === 'id' ? 'Cara mendapatkan link dari Reclub:' : 'How to get Reclub link:'}
              </span>
              <p className="leading-relaxed">
                {lang === 'id'
                  ? 'Buka jadwal event di Reclub ➔ Klik tombol Bagikan (Share / Copy Link) ➔ Tempel link di atas (format: reclub.co/m/xxxx). PDL UP akan langsung menarik nama seluruh peserta!'
                  : 'Open event in Reclub ➔ Tap Share / Copy Link ➔ Paste above (format: reclub.co/m/xxxx). PDL UP will automatically fetch all registered player names!'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Text */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            {/* If user pasted a URL in the text area, show instant quick-action banner */}
            {isUrlInRawText && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between gap-2 text-xs animate-fadeIn">
                <div className="flex items-center gap-2 text-rose-200">
                  <Link2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-[11px]">
                    {lang === 'id'
                      ? 'Tautan Reclub terdeteksi di kotak teks!'
                      : 'Reclub link detected in text box!'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToLinkFromPaste}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg shrink-0 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span>{lang === 'id' ? 'Tarik Otomatis' : 'Fetch Automatically'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300">
                {lang === 'id' ? 'Kotak Teks Peserta Reclub:' : 'Paste Reclub Attendees Here:'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  {lang === 'id' ? 'Coba Contoh Reclub' : 'Try Reclub Sample'}
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    {lang === 'id' ? 'Hapus' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              placeholder={
                lang === 'id'
                  ? "Tempel nama peserta Reclub di sini. Contoh:\n1. Carlos Alcaraz (Host)\n2. Alejandro Galan - Paid\n3. Juan Lebron\n4. Arturo Coello (Going)..."
                  : "Paste Reclub attendees here. E.g.:\n1. Carlos Alcaraz (Host)\n2. Alejandro Galan - Paid\n3. Juan Lebron\n4. Arturo Coello (Going)..."
              }
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed transition-colors resize-none"
            />
          </div>
        )}

        {/* Tab 3: Upload File */}
        {activeTab === 'file' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-2xl bg-slate-950/60 text-center cursor-pointer transition-all hover:bg-slate-950/90 group"
            >
              <FileText className="w-10 h-10 text-slate-500 group-hover:text-rose-400 mx-auto mb-2 transition-colors" />
              <div className="text-xs font-bold text-white mb-1">
                {fileName ? fileName : (lang === 'id' ? 'Pilih file CSV / TXT peserta' : 'Select CSV / TXT attendee export')}
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'id'
                  ? 'Klik untuk memilih file dari komputer Anda'
                  : 'Click to browse files from your device'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Live Detected Preview Area */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-white">
                {lang === 'id' ? 'Hasil Deteksi Pemain:' : 'Detected Players:'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                  parsedNames.length >= requiredCapacity
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {parsedNames.length} {lang === 'id' ? 'Pemain' : 'Players'}
              </span>
            </div>

            {parsedNames.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {parsedNames.length >= requiredCapacity
                    ? (lang === 'id' ? '✓ Kuota lapangan terpenuhi' : '✓ Capacity requirement met')
                    : (lang === 'id' ? `Minimal ${requiredCapacity} pemain disarankan` : `At least ${requiredCapacity} recommended`)}
                </span>
                <button
                  type="button"
                  onClick={() => setParsedNames([])}
                  className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5 cursor-pointer"
                  title="Reset list"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Reset' : 'Reset'}</span>
                </button>
              </div>
            )}
          </div>

          {parsedNames.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
              {activeTab === 'link'
                ? (lang === 'id'
                    ? 'Belum ada nama pemain. Masukkan link Reclub di atas dan klik "Tarik Pemain".'
                    : 'No players detected yet. Enter a Reclub link above and click "Fetch Players".')
                : (lang === 'id'
                    ? 'Belum ada nama yang terdeteksi. Tempel teks daftar peserta Reclub di atas.'
                    : 'No players detected yet. Paste attendee list above.')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 bg-slate-950 rounded-2xl border border-slate-800">
              {parsedNames.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:border-slate-600 transition-colors shadow-sm"
                >
                  <span className="font-semibold">{name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveName(i)}
                    className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            {t.cancelBtn}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentRosterCount > 0 && parsedNames.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onImport(parsedNames, 'append');
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{lang === 'id' ? `+ Tambahkan (+${parsedNames.length})` : `+ Append (+${parsedNames.length})`}</span>
              </button>
            )}

            <button
              type="button"
              disabled={parsedNames.length === 0}
              onClick={() => {
                onImport(parsedNames, 'replace');
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-40 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {currentRosterCount > 0
                  ? (lang === 'id' ? `Ganti Roster (${parsedNames.length} Pemain)` : `Replace Roster (${parsedNames.length})`)
                  : (lang === 'id' ? `Import ${parsedNames.length} Pemain` : `Import ${parsedNames.length} Players`)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
