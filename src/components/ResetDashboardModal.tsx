import React, { useState } from 'react';
import { AlertTriangle, X, Lock, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResetDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resetType: 'semester' | 'tahun' | 'semua', password: string, onProgress: (percent: number) => void) => Promise<void>;
}

export const ResetDashboardModal: React.FC<ResetDashboardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [resetType, setResetType] = useState<'semester' | 'tahun' | 'semua'>('semester');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    setProgress(0);
    try {
      await onConfirm(resetType, password, (p) => setProgress(p));
      setIsSuccess(true);
    } catch (error) {
      console.warn("Reset failed:", error);
    } finally {
      setIsResetting(false);
    }
  };

  const isFormValid = confirmText === 'HAPUS' && password !== '';

  const resetOptions = [
    {
      id: 'semester' as const,
      title: 'Reset Semester Baru',
      desc: 'Menghapus nilai & pengumpulan tugas. Data siswa & kelas tetap aman.',
    },
    {
      id: 'tahun' as const,
      title: 'Reset Tahun Ajaran Baru',
      desc: 'Menghapus siswa, kelas, tugas & nilai. Pengumuman tetap aman.',
    },
    {
      id: 'semua' as const,
      title: 'Reset Semuanya (Factory Reset)',
      desc: 'Menghapus seluruh data aplikasi tanpa sisa.',
    }
  ];

  const activeOption = resetOptions.find((o) => o.id === resetType) || resetOptions[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => !isResetting && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5 z-10 max-h-[92vh] flex flex-col"
          >
            <div className="bg-slate-950/95 text-white px-6 py-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#85cc00]">Pusat Inisialisasi Ulang</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isResetting}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-7 space-y-5 overflow-y-auto custom-scrollbar">
              {isSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Berhasil</h3>
                    <p className="text-sm text-slate-600 font-medium">Semua data terpilih sudah berhasil dihapus.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  {/* Dropdown Tipe Reset yang Rapi & Sejajar */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Pilih Tipe Reset
                    </label>
                    <div className="relative">
                      <select
                        value={resetType}
                        onChange={(e) => setResetType(e.target.value as 'semester' | 'tahun' | 'semua')}
                        disabled={isResetting}
                        className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] transition-all appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {resetOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed px-0.5">
                      {activeOption.desc}
                    </p>
                  </div>

                  {(isResetting || progress > 0) && (
                    <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>Progres Penghapusan Data</span>
                        <span className="text-emerald-600 tabular-nums">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 2 Textbox Sejajar & Simetris */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="flex items-center justify-between min-h-[20px] text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <span>Konfirmasi Teks</span>
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        disabled={isResetting}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] font-bold text-sm text-center placeholder:font-normal text-rose-600 transition-all disabled:opacity-50"
                        placeholder='Ketik "HAPUS"'
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between min-h-[20px] text-xs font-bold text-slate-600 uppercase tracking-wider">
                        <span>Password Admin</span>
                        <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">
                          Hint: admin123
                        </span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isResetting}
                          className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] font-semibold text-sm text-slate-900 transition-all disabled:opacity-50"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-slate-400 font-medium">
                    Tindakan ini tidak dapat dibatalkan setelah diproses.
                  </p>
                </>
              )}
            </div>

            {!isSuccess && (
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isResetting}
                  className="h-11 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!isFormValid || isResetting}
                  onClick={handleReset}
                  className={`h-11 px-4 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                    isFormValid && !isResetting
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-98 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isResetting ? "Sedang Mereset..." : "Eksekusi Reset"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
