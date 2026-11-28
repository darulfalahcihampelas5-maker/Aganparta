import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Clock,
  HardDrive,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";
import type { SupabaseHealthInfo } from "../../lib/supabaseSync";

interface DatabaseMaintenanceModalProps {
  isOpen: boolean;
  healthInfo: SupabaseHealthInfo | null;
  isRechecking: boolean;
  onRecheck: () => void;
  onDismiss: () => void;
  onOpenStorageMenu?: () => void;
}

export const DatabaseMaintenanceModal: React.FC<DatabaseMaintenanceModalProps> = ({
  isOpen,
  healthInfo,
  isRechecking,
  onRecheck,
  onDismiss,
  onOpenStorageMenu,
}) => {
  const mode = healthInfo?.mode || "unreachable";

  const statusMeta =
    mode === "maintenance"
      ? {
          badge: "Mode Pemeliharaan",
          badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
          iconBgCls: "bg-amber-50 border-amber-200 text-amber-600",
          cardCls: "bg-amber-50/70 border-amber-200/80 text-amber-950",
          Icon: ServerCrash,
        }
      : mode === "restricted"
      ? {
          badge: "Pembatasan Layanan Cloud",
          badgeCls: "bg-rose-50 text-rose-700 border-rose-200",
          iconBgCls: "bg-rose-50 border-rose-200 text-rose-600",
          cardCls: "bg-rose-50/70 border-rose-200/80 text-rose-950",
          Icon: ShieldAlert,
        }
      : {
          badge: "Tidak Dapat Dijangkau",
          badgeCls: "bg-rose-50 text-rose-700 border-rose-200",
          iconBgCls: "bg-rose-50 border-rose-200 text-rose-600",
          cardCls: "bg-rose-50/70 border-rose-200/80 text-rose-950",
          Icon: WifiOff,
        };

  const StatusIcon = statusMeta.Icon;

  const formattedCheckedTime = React.useMemo(() => {
    const raw = healthInfo?.checkedAt;
    if (!raw) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(raw)) + " WIB";
    } catch {
      return raw;
    }
  }, [healthInfo?.checkedAt]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="db-maintenance-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => !isRechecking && onDismiss()}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200/80 ring-1 ring-slate-900/5"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${statusMeta.iconBgCls}`}
                >
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="db-maintenance-title"
                      className="font-display font-black text-base sm:text-lg text-slate-900 tracking-tight"
                    >
                      Database Maintenance
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeCls}`}
                    >
                      {statusMeta.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Pemberitahuan kondisi server database utama
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                disabled={isRechecking}
                aria-label="Tutup pemberitahuan maintenance"
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[72vh] custom-scrollbar">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {healthInfo?.title ||
                  "Server database Supabase sedang dalam pemeliharaan atau sementara tidak dapat dijangkau."}{" "}
                Sebagian data terbaru (seperti nilai, ujian, atau lampiran tugas) mungkin belum dapat dimuat untuk sementara waktu.{" "}
                <span className="font-semibold text-slate-800">
                  Data lokal &amp; cadangan yang sudah tersimpan tetap aman.
                </span>
              </p>

              {/* Estimasi Waktu Perbaikan */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${statusMeta.cardCls}`}>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Estimasi Waktu Perbaikan / Pemulihan</span>
                </div>
                <p className="text-sm sm:text-base font-black leading-snug">
                  {healthInfo?.estimatedRecovery || "± 15 – 60 menit"}
                </p>
                <p className="text-xs opacity-90 leading-relaxed">
                  {healthInfo?.reason ||
                    "Koneksi ke server Supabase belum merespons normal. Sistem akan otomatis menyinkronkan kembali begitu layanan pulih."}
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold opacity-75 border-t border-current/10">
                  <span>Terakhir dicek: {formattedCheckedTime}</span>
                  {healthInfo?.httpStatus ? (
                    <span className="tabular-nums">Kode Status: HTTP {healthInfo.httpStatus}</span>
                  ) : null}
                </div>
              </div>

              {/* Info Tambahan untuk Guru */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Jika ada data yang belum tampil, Anda tidak perlu memasukkan ulang data. Tunggu hingga masa pemeliharaan selesai lalu tekan tombol{" "}
                  <strong className="text-slate-800">Cek Koneksi Ulang</strong>.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              {mode === "restricted" && onOpenStorageMenu ? (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss();
                    onOpenStorageMenu();
                  }}
                  disabled={isRechecking}
                  className="h-10 px-3.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                >
                  <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Menu Penyimpanan</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onDismiss}
                  disabled={isRechecking}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                >
                  Mengerti, Tutup
                </button>
                <button
                  type="button"
                  onClick={onRecheck}
                  disabled={isRechecking}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRechecking ? "animate-spin" : ""}`} />
                  <span>{isRechecking ? "Mengecek..." : "Cek Koneksi Ulang"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
