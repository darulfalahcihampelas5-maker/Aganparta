import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  X,
  BookOpen,
  Users,
  Calendar,
  Sparkles,
  Check,
  FileText,
  MonitorPlay,
  Layers,
  CheckSquare,
  Square,
} from "lucide-react";

interface AddManualColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  chaptersList: any[];
  classesList: any[];
  onSave: (data: {
    type: "Tugas" | "CBT";
    materi: string;
    bab: string;
    kelas: string;
    selectedClasses: string[];
    publishDate: string;
    description?: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export const AddManualColumnModal: React.FC<AddManualColumnModalProps> = ({
  isOpen,
  onClose,
  chaptersList,
  classesList,
  onSave,
  isSaving,
}) => {
  const [type, setType] = useState<"Tugas" | "CBT">("Tugas");
  const [materi, setMateri] = useState("");
  const [bab, setBab] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Initialize form state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setPublishDate(new Date().toISOString().split("T")[0]);
      if (chaptersList.length > 0 && !bab) {
        setBab(chaptersList[0].name || chaptersList[0].id || "");
      }
      // Default: select all classes if classesList available
      if (classesList.length > 0) {
        setSelectedClasses(classesList.map((c: any) => c.name || c.id));
      } else {
        setSelectedClasses([]);
      }
    }
  }, [isOpen, chaptersList, classesList]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materi.trim()) {
      setError(`Judul / Nama ${type} wajib diisi.`);
      return;
    }
    if (!bab) {
      setError("Pilih Bab terlebih dahulu.");
      return;
    }
    if (selectedClasses.length === 0) {
      setError("Pilih minimal satu kelas sasaran menggunakan checkbox.");
      return;
    }

    try {
      const kelasString =
        selectedClasses.length === classesList.length
          ? "ALL"
          : selectedClasses.join(", ");

      await onSave({
        type,
        materi: materi.trim(),
        bab,
        kelas: kelasString,
        selectedClasses,
        publishDate,
        description:
          description.trim() ||
          (type === "CBT"
            ? "Kolom CBT Manual (Buku Nilai)"
            : "Kolom Nilai Manual (Buku Nilai)"),
      });

      // Reset form
      setMateri("");
      setDescription("");
      setError("");
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan kolom nilai.");
    }
  };

  const quickTitlesTugas = [
    "Tugas 1",
    "Tugas 2",
    "Tugas 3",
    "Praktik 1",
    "Tugas Portofolio",
    "Tugas Kelompok",
    "Projek Akhir",
  ];

  const quickTitlesCbt = [
    "Ulangan Harian 1",
    "Ulangan Harian 2",
    "Ulangan Harian 3",
    "Kuis CBT 1",
    "Penilaian Harian",
    "UTS / PTS",
    "UAS / SAS",
  ];

  const currentQuickTitles = type === "CBT" ? quickTitlesCbt : quickTitlesTugas;
  const isAllClassesSelected =
    classesList.length > 0 && selectedClasses.length === classesList.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                type === "CBT"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : "bg-[#85cc00]/20 border border-[#85cc00]/40 text-[#85cc00]"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Tambah Kolom Nilai Baru
              </h3>
              <p className="text-xs text-slate-300">
                Tambahkan kolom {type === "CBT" ? "CBT (Ujian)" : "Tugas"} ke Buku Nilai & otomatis tampil di Siswa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Dropdown Jenis Kolom (Tugas / CBT) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#649c00]" />
              Jenis Penilaian <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "Tugas" | "CBT")}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent font-bold text-slate-800 transition-all cursor-pointer"
              >
                <option value="Tugas">📝 Tugas (Nilai Tugas / Penilaian Harian / Praktik)</option>
                <option value="CBT">💻 CBT (Ujian Online CBT / Evaluasi)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {type === "CBT"
                ? "Kolom ini akan dikategorikan sebagai Ujian CBT dalam rubrik dan Buku Nilai."
                : "Kolom ini akan dikategorikan sebagai Tugas Mandiri / Praktik dalam rubrik dan Buku Nilai."}
            </p>
          </div>

          {/* Quick Suggestions */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Pilihan Cepat Judul Kolom ({type})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {currentQuickTitles.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMateri(t)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    materi === t
                      ? type === "CBT"
                        ? "bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm"
                        : "bg-[#85cc00] border-[#85cc00] text-slate-950 font-bold shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Judul Tugas / CBT */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              {type === "CBT" ? (
                <MonitorPlay className="w-4 h-4 text-emerald-600" />
              ) : (
                <FileText className="w-4 h-4 text-[#649c00]" />
              )}
              Judul / Nama {type} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder={
                type === "CBT"
                  ? "Contoh: Ulangan Harian 1 - Jaringan Komputer & Internet"
                  : "Contoh: Tugas 1 - Algoritma Pemrograman"
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent font-medium"
              required
            />
          </div>

          {/* Bab Pembelajaran */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#649c00]" />
              Bab Pembelajaran <span className="text-rose-500">*</span>
            </label>
            {chaptersList.length > 0 ? (
              <select
                value={bab}
                onChange={(e) => setBab(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent font-medium"
                required
              >
                <option value="" disabled>
                  -- Pilih Bab --
                </option>
                {chaptersList.map((ch: any) => {
                  const rawName = ch.name || ch.id || "";
                  const cleanName = rawName.replace(/^Bab\s*\d+\s*[-:.]\s*/i, "").trim();
                  return (
                    <option key={ch.id || ch.name} value={cleanName}>
                      {cleanName}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={bab}
                onChange={(e) => setBab(e.target.value)}
                placeholder="Contoh: Berpikir Komputasional"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent font-medium"
                required
              />
            )}
          </div>

          {/* 3. Checkbox Pilihan Kelas Sasaran */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#649c00]" />
                Kelas Sasaran (Checkbox) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleToggleAllClasses}
                className="text-[11px] font-bold text-[#649c00] hover:text-[#528000] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isAllClassesSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Hapus Semua</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Pilih Semua Kelas</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {classesList.map((cls: any) => {
                  const cName = cls.name || cls.id;
                  const isChecked = selectedClasses.includes(cName);
                  return (
                    <label
                      key={cName}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-white border-[#85cc00] text-slate-900 shadow-sm ring-1 ring-[#85cc00]/30"
                          : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleClass(cName)}
                        className="w-4 h-4 rounded text-[#85cc00] focus:ring-[#85cc00] border-slate-300 cursor-pointer accent-[#85cc00]"
                      />
                      <span className="truncate">{cName}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Status: <strong>{selectedClasses.length}</strong> dari {classesList.length} kelas dipilih
                </span>
                {selectedClasses.length === 0 && (
                  <span className="text-rose-600 font-bold">Wajib pilih minimal 1 kelas</span>
                )}
              </div>
            </div>
          </div>

          {/* Tanggal Mulai / Penugasan */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#649c00]" />
              Tanggal Mulai {type === "CBT" ? "CBT" : "Tugas"} <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent font-medium"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Tanggal ini akan ditampilkan di menu <strong>Nilai Siswa</strong> saat tugas/CBT diinput manual.
            </p>
          </div>

          {/* Keterangan Tambahan (Opsional) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Keterangan / Catatan (Opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "CBT"
                  ? "Contoh: Ujian CBT Harian / Evaluasi Tengah Bab"
                  : "Contoh: Tugas Mandiri / Penilaian Lembar Kerja Siswa"
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00] focus:border-transparent"
            />
          </div>

          {/* Info banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Setelah ditambahkan, kolom {type} baru akan langsung muncul di tabel Rekap Nilai untuk diinput nilainya dan otomatis tersinkronisasi ke menu <strong>Nilai Siswa</strong> beserta tanggal mulainya.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                type === "CBT"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-[#85cc00] hover:bg-[#78b800] text-slate-950"
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Kolom...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tambahkan Kolom {type}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
