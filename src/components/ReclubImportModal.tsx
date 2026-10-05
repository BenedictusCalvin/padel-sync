import React, { useState, useEffect, useRef } from 'react';
import { translations, type Language } from '../utils/translations';
import { parseReclubText, parseCSVAttendees } from '../utils/reclubParser';
import {
  X,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  Users,
  FileText,
  Sparkles
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
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
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

  // Update parsed names in real-time as user types/pastes
  useEffect(() => {
    if (activeTab === 'paste') {
      const names = parseReclubText(rawText);
      setParsedNames(names);
    }
  }, [rawText, activeTab]);

  if (!isOpen) return null;

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
  };

  const handleClear = () => {
    setRawText('');
    setParsedNames([]);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                  Smart Parser
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'id'
                  ? 'Salin daftar peserta (Going / Attendees) dari aplikasi Reclub atau upload file export.'
                  : 'Copy attendee list from Reclub event or upload an export file.'}
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

        {/* Instructions Guide Pill */}
        <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Cara Mengambil Data dari Reclub:' : 'How to get data from Reclub:'}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {lang === 'id'
              ? 'Buka event di Reclub ➔ Buka tab Attendees (Going) ➔ Pilih & Copy (Salin) seluruh teks peserta ➔ Tempel di kotak bawah. Nomor urut, label (Paid), (Going), dan status akan dibersihkan otomatis!'
              : 'Open your event in Reclub ➔ View Attendees (Going) list ➔ Copy names ➔ Paste below. Numberings and status badges are automatically filtered!'}
          </p>
        </div>

        {/* Mode Tabs: Paste vs File */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paste'
                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Salin - Tempel Teks' : 'Paste Names'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'file'
                ? 'bg-rose-600 text-white font-black shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Upload File (.csv / .txt)' : 'Upload File (.csv / .txt)'}</span>
          </button>
        </div>

        {/* Tab 1: Paste Text */}
        {activeTab === 'paste' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300">
                {lang === 'id' ? 'Kotak Teks Peserta Reclub:' : 'Paste Reclub Attendees Here:'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-2"
                >
                  {lang === 'id' ? 'Coba Contoh Reclub' : 'Try Reclub Sample'}
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-slate-400 hover:text-red-400"
                  >
                    {lang === 'id' ? 'Hapus' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                lang === 'id'
                  ? "Tempel nama peserta Reclub di sini. Contoh:\n1. Carlos Alcaraz (Host)\n2. Alejandro Galan - Paid\n3. Juan Lebron\n4. Arturo Coello (Going)..."
                  : "Paste Reclub attendees here. E.g.:\n1. Carlos Alcaraz (Host)\n2. Alejandro Galan - Paid\n3. Juan Lebron\n4. Arturo Coello (Going)..."
              }
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed transition-colors resize-none"
            />
          </div>
        )}

        {/* Tab 2: Upload File */}
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
              <span className="text-[11px] text-slate-400">
                {parsedNames.length >= requiredCapacity
                  ? (lang === 'id' ? '✓ Kuota lapangan terpenuhi' : '✓ Capacity requirement met')
                  : (lang === 'id' ? `Minimal ${requiredCapacity} pemain disarankan` : `At least ${requiredCapacity} recommended`)}
              </span>
            )}
          </div>

          {parsedNames.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
              {lang === 'id'
                ? 'Belum ada nama yang terdeteksi. Tempel teks daftar peserta Reclub di atas.'
                : 'No players detected yet. Paste attendee list above.'}
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
                    className="text-slate-400 hover:text-red-400 transition-colors"
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
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all"
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
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
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
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-40 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
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
