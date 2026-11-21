import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pencil,
  X,
  Clock,
  BookOpen,
  Sparkles,
  Users,
  Copy,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronDown,
} from "lucide-react";

export interface EditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  classesList: any[];
  chaptersList: any[];
  onSave: (updatedData: {
    id: string;
    title: string;
    subject: string;
    bab: string;
    durationMinutes: number;
    kkm: number;
    token: string;
    targetClasses: string[];
    externalQuizUrl?: string;
    kisiKisiDriveUrl?: string;
    description?: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  classesList,
  chaptersList,
  onSave,
  isSaving,
}) => {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Informatika");
  const [bab, setBab] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [kkm, setKkm] = useState<number>(75);
  const [token, setToken] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [externalQuizUrl, setExternalQuizUrl] = useState("");
  const [kisiKisiDriveUrl, setKisiKisiDriveUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);

  // Quick preset durations (in minutes)
  const durationPresets = [15, 30, 45, 60, 75, 90, 120];

  useEffect(() => {
    if (isOpen && exam) {
      setTitle(exam.title || exam.materi || "");
      setSubject(exam.subject || "Informatika");
      setBab(exam.bab || (chaptersList[0]?.name || chaptersList[0]?.id || ""));
      
      // Calculate duration in minutes (stored in seconds in Firestore/Supabase)
      const rawDurationSeconds = Number(exam.duration);
      if (rawDurationSeconds && !isNaN(rawDurationSeconds) && rawDurationSeconds > 0) {
        setDurationMinutes(Math.max(1, Math.round(rawDurationSeconds / 60)));
      } else {
        setDurationMinutes(60);
      }

      setKkm(Number(exam.kkm) || 75);
      setToken(exam.token ? String(exam.token).toUpperCase() : "");
      setExternalQuizUrl(exam.externalQuizUrl || "");
      setKisiKisiDriveUrl(exam.kisiKisiDriveUrl || "");
      setDescription(exam.description || exam.materi_desc || "");

      // Classes
      if (Array.isArray(exam.targetClasses) && exam.targetClasses.length > 0) {
        setSelectedClasses([...exam.targetClasses]);
      } else if (exam.kelasRef) {
        const refStr = String(exam.kelasRef).trim();
        if (
          refStr.toLowerCase() === "semua_kelas" ||
          refStr.toLowerCase() === "all" ||
          refStr.toLowerCase() === "semua kelas"
        ) {
          setSelectedClasses(classesList.map((c) => c.name || c.id));
        } else {
          const split = refStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          setSelectedClasses(split.length > 0 ? split : classesList.map((c) => c.name || c.id));
        }
      } else {
        setSelectedClasses(classesList.map((c) => c.name || c.id));
      }

      setError("");
      setCopiedToken(false);
    }
  }, [isOpen, exam, classesList, chaptersList]);

  const handleGenerateRandomToken = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(res);
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token.toUpperCase());
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleToggleClass = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const handleToggleAllClasses = () => {
    const allNames = classesList.map((c: any) => c.name || c.id);
    if (selectedClasses.length === allNames.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(allNames);
    }
  };

  const handleAdjustDuration = (delta: number) => {
    setDurationMinutes((prev) => Math.max(5, Math.min(360, (prev || 60) + delta)));
  };

  // Human readable duration text helper
  const formatDurationText = (minutes: number) => {
    if (minutes <= 0) return "0 Menit";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const seconds = minutes * 60;
    if (hours > 0 && mins > 0) {
      return `${hours} Jam ${mins} Menit (${seconds.toLocaleString("id-ID")} Detik)`;
    } else if (hours > 0) {
      return `${hours} Jam (${seconds.toLocaleString("id-ID")} Detik)`;
    }
    return `${minutes} Menit (${seconds.toLocaleString("id-ID")} Detik)`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam?.id) {
      setError("Data ujian tidak valid.");
      return;
    }
    if (!title.trim()) {
      setError("Judul ujian wajib diisi.");
      return;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setError("Durasi waktu ujian harus lebih dari 0 menit.");
      return;
    }
    if (!token.trim()) {
      setError("Token ujian wajib diisi (minimal 4 karakter).");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("Pilih minimal satu kelas sasaran.");
      return;
    }

    try {
      setError("");
      await onSave({
        id: exam.id,
        title: title.trim(),
        subject: subject.trim(),
        bab,
        durationMinutes: Number(durationMinutes),
        kkm: Number(kkm) || 75,
        token: token.trim().toUpperCase(),
        targetClasses: selectedClasses,
        externalQuizUrl: externalQuizUrl.trim(),
        kisiKisiDriveUrl: kisiKisiDriveUrl.trim(),
        description: description.trim(),
      });
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan perubahan ujian.");
    }
  };

  const allClassNames = classesList.map((c: any) => c.name || c.id);
  const isAllSelected =
    allClassNames.length > 0 && selectedClasses.length === allClassNames.length;

  return (
    <AnimatePresence>
      {isOpen && exam && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => !isSaving && onClose()}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90dvh]"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-[#85cc00]/20 border border-[#85cc00]/40 flex items-center justify-center text-[#85cc00]">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    Edit Data & Durasi Ujian CBT
                  </h3>
                  <p className="text-xs text-slate-300">
                    Perbarui durasi waktu pengerjaan, token, KKM, kelas sasaran, dan judul ujian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-32 h-32 bg-[#85cc00]/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. SEKSI UTAMA: DURASI WAKTU UJIAN (FITUR UTAMA YANG DIMINTA USER) */}
              <div className="p-5 bg-gradient-to-br from-amber-50/80 to-lime-50/50 border-2 border-amber-200/80 rounded-2xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Durasi Waktu Ujian (Menit)
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-amber-900 bg-white/80 border border-amber-200 px-2.5 py-0.5 rounded-lg shadow-2xs font-mono">
                    {formatDurationText(durationMinutes)}
                  </span>
                </div>

                {/* Input & Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustDuration(-15)}
                      disabled={durationMinutes <= 15 || isSaving}
                      className="px-2.5 py-2.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-900 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                      title="Kurangi 15 Menit"
                    >
                      -15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustDuration(-5)}
                      disabled={durationMinutes <= 5 || isSaving}
                      className="px-2.5 py-2.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-900 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                      title="Kurangi 5 Menit"
                    >
                      -5m
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="5"
                        max="360"
                        step="1"
                        required
                        value={durationMinutes || ""}
                        onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full text-center px-3 py-2 bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl text-base font-black font-mono text-slate-900 outline-none shadow-inner"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                        Mnt
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdjustDuration(5)}
                      disabled={durationMinutes >= 360 || isSaving}
                      className="px-2.5 py-2.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-900 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                      title="Tambah 5 Menit"
                    >
                      +5m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustDuration(15)}
                      disabled={durationMinutes >= 345 || isSaving}
                      className="px-2.5 py-2.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-900 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                      title="Tambah 15 Menit"
                    >
                      +15m
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="sm:col-span-6 flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                    {durationPresets.map((preset) => {
                      const isActive = durationMinutes === preset;
                      return (
                        <button
                          key={`preset-${preset}`}
                          type="button"
                          onClick={() => setDurationMinutes(preset)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs scale-105"
                              : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
                          }`}
                        >
                          {preset}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-amber-800/90 leading-relaxed font-medium">
                  💡 <strong>Catatan Durasi:</strong> Waktu ujian yang Anda simpan akan menjadi batas waktu pengerjaan otomatis (countdown) bagi siswa saat menekan tombol <em>"Mulai Ujian"</em> di dashboard mereka.
                </p>
              </div>

              {/* 2. Judul Ujian & Bab */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Judul Ujian CBT
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Postes Bab 1 IKG / Evaluasi Informatika"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bab Pelajaran */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Bab Pembelajaran
                    </label>
                    <div className="relative">
                      <select
                        value={bab}
                        onChange={(e) => setBab(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#85cc00] outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Pilih / Tanpa Bab Khusus --</option>
                        {chaptersList.map((chap, idx) => {
                          const name = chap.name || chap.id;
                          return (
                            <option key={`chap-opt-${idx}`} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* KKM */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      Standar KKM Kelulusan
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={kkm}
                      onChange={(e) => setKkm(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:bg-white focus:border-[#85cc00] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Token Masuk Ujian */}
              <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Token Masuk Ujian (Huruf Kapital)
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomToken}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Acak Token Baru
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="Contoh: IKGT01"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black font-mono tracking-widest text-slate-900 uppercase focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Salin Token"
                  >
                    {copiedToken ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#85cc00]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 4. Target Kelas Sasaran */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Target Kelas Sasaran
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleAllClasses}
                    className="text-[11px] font-bold text-[#74b300] hover:underline cursor-pointer"
                  >
                    {isAllSelected ? "Batalkan Semua" : "Pilih Semua Kelas"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {classesList.map((cls, idx) => {
                    const clsName = cls.name || cls.id;
                    const isChecked = selectedClasses.includes(clsName);
                    return (
                      <label
                        key={`edit-cls-${clsName}-${idx}`}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-white border-[#85cc00] text-slate-900 shadow-2xs"
                            : "bg-white/60 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClass(clsName)}
                          className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                        />
                        <span className="truncate">Kelas {clsName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Link Soal Luar (PDF / Notebook LM) - Opsional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  Link Soal Luar (PDF / Google Drive / Notebook LM) - Opsional
                </label>
                <input
                  type="url"
                  value={externalQuizUrl}
                  onChange={(e) => setExternalQuizUrl(e.target.value)}
                  placeholder="https://drive.google.com/... atau https://notebooklm.google.com/..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#85cc00] outline-none transition-all"
                />
              </div>

              {/* 5b. Link Google Drive Kisi-Kisi Ujian (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  Link Google Drive Kisi-Kisi Ujian (Opsional — tampil di Menu Kisi-Kisi Siswa)
                </label>
                <input
                  type="url"
                  value={kisiKisiDriveUrl}
                  onChange={(e) => setKisiKisiDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-4 py-2 bg-teal-50/40 border border-teal-200 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 outline-none transition-all"
                />
              </div>

              {/* 6. Deskripsi / Petunjuk Ujian */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Petunjuk & Keterangan Ujian untuk Siswa (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kerjakan secara mandiri. Dilarang membuka tab lain atau keluar dari layar penuh."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#85cc00] outline-none transition-all resize-none"
                />
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                {exam.questions?.length || 0} butir soal pilihan ganda
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#85cc00] hover:bg-[#74b300] active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
