import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Database,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { isSupabaseConfigured, SUPABASE_URL } from "../../lib/supabase";
import { syncAllFirebaseToSupabase } from "../../lib/supabaseSync";

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccessRefresh,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    gradesCount: number;
    examsCount: number;
    otherCount?: number;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

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
      setSyncResult({ gradesCount: 0, examsCount: 0, otherCount: 0, error: err.message || "Gagal sinkronisasi" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border-2 border-slate-200"
      >
        {/* Header */}
        <div className="bg-emerald-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-2xl">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-white tracking-tight flex items-center gap-2">
                Integrasi Database Supabase
                <span className="text-[10px] bg-emerald-500 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Aktif
                </span>
              </h3>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest mt-0.5">
                Solusi Kuota Bebas Batas (Unlimited Reads & Writes)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-400 hover:text-white transition-all p-2 hover:bg-white/10 rounded-xl active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Status Box */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                Status Sambungan Supabase
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                {isSupabaseConfigured ? "Terhubung (Connected)" : "Belum Konfigurasi"}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-600 truncate">
              {SUPABASE_URL}
            </p>
          </div>

          {/* Explanation */}
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Keuntungan Menggunakan Supabase untuk CBT & Nilai:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 font-medium">
              <li>
                <strong className="text-slate-900">Bebas Limit Harian:</strong> Tidak ada lagi batasan 50.000 pembacaan dokumen per hari di jam 14.00.
              </li>
              <li>
                <strong className="text-slate-900">Dual Sync Safety:</strong> Nilai siswa dan soal ujian otomatis diamankan di Supabase (primer) dan Firestore (backup).
              </li>
              <li>
                <strong className="text-slate-900">Performa Cepat:</strong> Dashboard guru memuat rekapitulasi nilai dan ujian secara instan.
              </li>
            </ul>
          </div>

          {/* Quick 3-Step Setup Guide */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                Cara Buat Tabel Otomatis di Supabase (3 Langkah Mudah)
              </span>
              <a
                href="https://supabase.com/dashboard/project/ikiruonvyfdphpxqszna/sql/new"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
              >
                Buka SQL Editor <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="text-[11px] space-y-1.5 list-decimal list-inside text-slate-300 font-medium">
              <li>
                Buka link <strong>SQL Editor</strong> di atas.
              </li>
              <li>
                Klik tombol <strong>"Salin Script SQL"</strong> di bawah lalu tempelkan (Paste / Ctrl+V) di kotak hitam Supabase.
              </li>
              <li>
                Klik tombol hijau <strong>"Run"</strong> di Supabase. (Selesai! Tabel langsung jadi).
              </li>
            </ol>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const sqlCode = `-- 1. Tabel Riwayat Nilai & Hasil Ujian CBT
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

-- 3. Tabel Koleksi Menu Lainnya (Kelas, Tugas, Absensi, Materi, Pengumuman, dll)
CREATE TABLE IF NOT EXISTS app_collections (
    id VARCHAR(255) PRIMARY KEY,
    collection_name VARCHAR(100) NOT NULL,
    doc_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collection_name ON app_collections(collection_name);

-- Aktifkan akses Read & Write Publik
ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for final_grades" 
ON final_grades FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public read-write for exams" 
ON exams FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public read-write for app_collections" 
ON app_collections FOR ALL 
USING (true) 
WITH CHECK (true);`;
                  navigator.clipboard.writeText(sqlCode);
                  alert("Script SQL berhasil disalin ke Clipboard! Sekarang tinggal paste di Supabase dan klik Run.");
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Salin Script SQL Pembuat Tabel (1-Klik)</span>
              </button>
            </div>
          </div>

          {/* Sync Results Banner */}
          {syncResult && (
            <div
              className={`p-4 rounded-2xl border ${
                syncResult.error
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {syncResult.error ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {syncResult.error
                  ? `Sinkronisasi gagal: ${syncResult.error}`
                  : `Berhasil menyinkronkan ${syncResult.gradesCount} data nilai, ${syncResult.examsCount} paket ujian, dan ${syncResult.otherCount || 0} data menu lainnya ke Supabase!`}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200/60 transition-all border border-slate-200 cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleStartSync}
            disabled={isSyncing}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Menyinkronkan ke Supabase...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 shrink-0" />
                Sinkronkan Data Lama dari Firebase
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
