import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { isSupabaseConfigured } from "../../lib/supabase";
import { syncAllFirebaseToSupabase } from "../../lib/supabaseSync";

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

const SUPABASE_SQL_SCRIPT = `-- 1. Tabel Riwayat Nilai & Hasil Ujian CBT
CREATE TABLE IF NOT EXISTS final_grades (
    id TEXT PRIMARY KEY,
    exam_id TEXT,
    assignment_id TEXT,
    nisn TEXT NOT NULL,
    student_name TEXT,
    kelas TEXT,
    nilai NUMERIC,
    score NUMERIC,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    violation_count INT DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    is_remedial BOOLEAN DEFAULT FALSE,
    remedial_score NUMERIC
);

-- 2. Tabel Bank Soal & Paket Ujian CBT
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    kelas_ref TEXT,
    token TEXT NOT NULL,
    duration INT DEFAULT 3600,
    kkm NUMERIC DEFAULT 75,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Koleksi Menu Lainnya
CREATE TABLE IF NOT EXISTS app_collections (
    id VARCHAR(255) PRIMARY KEY,
    collection_name VARCHAR(100) NOT NULL,
    doc_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_name ON app_collections(collection_name);

ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for final_grades" ON final_grades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for exams" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for app_collections" ON app_collections FOR ALL USING (true) WITH CHECK (true);`;

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccessRefresh,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    gradesCount: number;
    examsCount: number;
    otherCount?: number;
    error?: string;
  } | null>(null);

  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncAllFirebaseToSupabase();
      setSyncResult(result);
      if (onSuccessRefresh && !result.error) {
        onSuccessRefresh();
      }
    } catch (err: any) {
      setSyncResult({
        gradesCount: 0,
        examsCount: 0,
        otherCount: 0,
        error: err.message || "Gagal menyinkronkan data.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      setCopiedSql(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => !isSyncing && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200/80 ring-1 ring-slate-900/5"
          >
            {/* Header Sederhana */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-slate-900 truncate">
                    Sinkronisasi Firebase ke Supabase
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Salin dan perbarui data aplikasi secara aman
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                aria-label="Tutup modal sinkronisasi"
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Konten Sederhana */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Baris Status Koneksi */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600">
                  Status Koneksi Supabase
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    isSupabaseConfigured ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isSupabaseConfigured ? "Terhubung" : "Belum Konfigurasi"}</span>
                </span>
              </div>

              {/* Status Proses Sinkronisasi */}
              {isSyncing ? (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-900">
                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                    <span>Sedang menyinkronkan data ke Supabase...</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
                    <div className="h-full w-2/3 bg-emerald-600 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Mohon tunggu sebentar, jangan tutup jendela ini hingga proses selesai.
                  </p>
                </div>
              ) : syncResult ? (
                <div
                  className={`p-4 rounded-2xl border ${
                    syncResult.error
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                    {syncResult.error ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <span>
                      {syncResult.error ? (
                        `Sinkronisasi gagal: ${syncResult.error}`
                      ) : (
                        <>
                          Sinkronisasi selesai:{" "}
                          <strong className="tabular-nums">{syncResult.gradesCount}</strong> data nilai,{" "}
                          <strong className="tabular-nums">{syncResult.examsCount}</strong> paket ujian, dan{" "}
                          <strong className="tabular-nums">{syncResult.otherCount || 0}</strong> data lainnya berhasil disalin.
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Proses ini akan menyalin data siswa, kelas, tugas, materi, ujian CBT, dan nilai dari Firebase ke Supabase agar akses aplikasi lebih cepat dan bebas batas kuota harian.
                </p>
              )}

              {/* Opsi Lanjutan Tersembunyi (Collapsible) */}
              <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer list-none">
                  <span>Pengaturan Lanjutan: Script SQL Tabel</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/60">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Gunakan script ini hanya jika tabel Supabase belum dibuat sebelumnya.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="h-10 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span>Salin SQL</span>
                        </>
                      )}
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/ikiruonvyfdphpxqszna/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <span>SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              </details>
            </div>

            {/* Footer Simetris */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className="h-11 px-4 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleStartSync}
                disabled={isSyncing}
                className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-60 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Menyinkronkan..." : "Mulai Sinkronisasi"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
