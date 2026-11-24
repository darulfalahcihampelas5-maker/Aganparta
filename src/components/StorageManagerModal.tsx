import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, X, Database, FileText, Search, ChevronDown, Download, Upload, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, storage } from '../lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { doc } from 'firebase/firestore';
import { dbDeleteDoc as deleteDoc } from '../lib/supabaseSync';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: any[];
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  submissions,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'backup'>('files');
  const [fileData, setFileData] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const files = submissions.filter((s) => s.fileUrl);
      setFileData(files);
      setSearchQuery('');
      setSelectedClass('Semua Kelas');
      setActiveTab('files');
      setBackupMessage(null);
    }
  }, [isOpen, submissions]);

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(fileData.map((f) => f.kelas || f.class).filter(Boolean))
    ).sort();
    return ['Semua Kelas', ...classes];
  }, [fileData]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fileData.filter((sub) => {
      const cls = sub.kelas || sub.class || '';
      const matchesClass = selectedClass === 'Semua Kelas' || cls === selectedClass;
      const matchesSearch =
        !q ||
        (sub.studentName || '').toLowerCase().includes(q) ||
        (sub.title || sub.materi || '').toLowerCase().includes(q);
      return matchesClass && matchesSearch;
    });
  }, [fileData, searchQuery, selectedClass]);

  const handleDelete = async (submission: any) => {
    setIsDeleting(submission.id);
    try {
      if (submission.fileUrl) {
        const storageRef = ref(storage, submission.fileUrl);
        try {
          await deleteObject(storageRef);
        } catch (e) {
          console.warn("File mungkin sudah dihapus atau tidak ditemukan di Storage:", e);
        }
      }

      await deleteDoc(doc(db, "submissions", submission.id));
      setFileData((prev) => prev.filter((f) => f.id !== submission.id));
    } catch (error) {
      console.warn("Gagal menghapus file:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  // 1. Download Backup JSON
  const handleDownloadBackup = () => {
    try {
      const backupBundle: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("firas_cache_") || key.startsWith("ujian_history_") || key.startsWith("pending_exam_sync_") || key.startsWith("sipinter_"))) {
          try {
            backupBundle[key] = JSON.parse(localStorage.getItem(key) || "null");
          } catch {
            backupBundle[key] = localStorage.getItem(key);
          }
        }
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupBundle, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sipinter_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupMessage({ text: "Cadangan database (.json) berhasil diunduh!", type: "success" });
    } catch (err: any) {
      setBackupMessage({ text: "Gagal membuat file cadangan: " + (err?.message || err), type: "error" });
    }
  };

  // 2. Restore / Import Backup JSON
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error("Format file JSON tidak valid.");
        }

        let restoredCount = 0;
        for (const [key, val] of Object.entries(parsed)) {
          if (val !== undefined && val !== null) {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            restoredCount++;
          }
        }

        setBackupMessage({ 
          text: `Berhasil memulihkan ${restoredCount} item data cadangan ke perangkat! Memuat ulang...`, 
          type: "success" 
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setBackupMessage({ text: "Gagal memulihkan file cadangan: Format file tidak dikenali.", type: "error" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/70 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-600 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Manajemen Data & Penyimpanan</h2>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Kelola berkas tugas siswa atau unduh/pulihkan cadangan database offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup modal manajemen penyimpanan"
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'files'
                    ? 'border-[#85cc00] text-[#74b300]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Berkas Tugas Siswa ({filteredFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'backup'
                    ? 'border-[#85cc00] text-[#74b300]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Cadangan & Pemulihan Database (.json)
              </button>
            </div>

            {activeTab === 'files' ? (
              <>
                {/* Filter & Search Bar */}
                <div className="px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama siswa atau judul tugas..."
                        className="w-full h-11 pl-10 pr-4 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] transition-all"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] transition-all appearance-none cursor-pointer"
                      >
                        {classOptions.map((cls, idx) => (
                          <option key={`st-cls-${cls}-${idx}`} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* File List */}
                <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm font-medium">
                      Tidak ada berkas tugas siswa yang sesuai.
                    </div>
                  ) : (
                    filteredFiles.map((sub, idx) => (
                      <div
                        key={`storage-sub-${sub.id || idx}-${idx}`}
                        className="flex items-center gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-colors"
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-xl text-slate-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {sub.studentName || 'Siswa'}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {sub.title || sub.materi || 'Tugas Tanpa Judul'}
                            {sub.kelas || sub.class ? ` · ${sub.kelas || sub.class}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub)}
                          disabled={isDeleting === sub.id}
                          title="Hapus berkas"
                          className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {isDeleting === sub.id ? (
                            <span className="text-xs font-bold">...</span>
                          ) : (
                            <Trash2 className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Backup & Restore Tab */
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {backupMessage && (
                  <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                    backupMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{backupMessage.text}</span>
                  </div>
                )}

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#85cc00]" />
                    <span>Unduh Cadangan Database (.json)</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Simpan seluruh data aplikasi (daftar siswa, nilai akhir, ujian, tugas, kelas, dan riwayat absen) ke dalam satu file cadangan berformat JSON di komputer atau HP Anda.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="h-11 px-5 bg-[#85cc00] hover:bg-[#74b300] text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File Cadangan Sekarang</span>
                  </button>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Pulihkan / Impor Database dari File (.json)</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Jika server Firebase dan Supabase sedang mengalami gangguan atau limit kuota habis, Anda dapat mengunggah file cadangan JSON sebelumnya agar aplikasi langsung berjalan normal dengan data tersebut.
                  </p>
                  <label className="h-11 px-5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Pilih & Unggah File Cadangan (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-6 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
