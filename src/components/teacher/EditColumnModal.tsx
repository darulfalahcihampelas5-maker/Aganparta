import React, { useState, useEffect } from "react";
import {
  Pencil,
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
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface ColumnEditData {
  id: string;
  type: "Tugas" | "CBT";
  originalType: "Tugas" | "CBT";
  title: string;
  bab: string;
  selectedClasses: string[];
  startDate: string;
  deadline?: string;
  description?: string;
}

export interface RekapColumnItemForEdit {
  id: string;
  title: string;
  type: "assignment" | "exam";
  bab?: string;
  date?: string;
  startDate?: string;
  deadline?: string | null;
  targetClasses?: string[];
  kelasRef?: string;
  kelas?: string;
  description?: string;
  rawDoc?: any;
}

interface EditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: RekapColumnItemForEdit[];
  initialSelectedId?: string | null;
  chaptersList: any[];
  classesList: any[];
  onSave: (data: ColumnEditData) => Promise<void>;
  isSaving: boolean;
}

export const EditColumnModal: React.FC<EditColumnModalProps> = ({
  isOpen,
  onClose,
  columns,
  initialSelectedId,
  chaptersList,
  classesList,
  onSave,
  isSaving,
}) => {
  const [selectedColId, setSelectedColId] = useState<string>("");
  const [type, setType] = useState<"Tugas" | "CBT">("Tugas");
  const [originalType, setOriginalType] = useState<"Tugas" | "CBT">("Tugas");
  const [title, setTitle] = useState("");
  const [bab, setBab] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Helper to extract clean YYYY-MM-DD
  const formatDateForInput = (d?: string | null): string => {
    if (!d) return "";
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return "";
      return dateObj.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Populate form based on a column
  const populateFromColumn = (col: RekapColumnItemForEdit) => {
    setSelectedColId(col.id);
    const colType: "Tugas" | "CBT" = col.type === "exam" ? "CBT" : "Tugas";
    setType(colType);
    setOriginalType(colType);
    setTitle(col.title || "");
    setBab(col.bab || (chaptersList[0]?.name || chaptersList[0]?.id || ""));
    setDescription(col.description || col.rawDoc?.description || "");

    const sDate = formatDateForInput(col.startDate || col.date || col.rawDoc?.createdAt);
    setStartDate(sDate || new Date().toISOString().split("T")[0]);

    const dLine = formatDateForInput(col.deadline || col.rawDoc?.deadline);
    setDeadline(dLine);

    // Parse selected classes
    if (Array.isArray(col.targetClasses) && col.targetClasses.length > 0) {
      setSelectedClasses([...col.targetClasses]);
    } else if (col.kelasRef || col.kelas) {
      const refStr = (col.kelasRef || col.kelas || "").trim();
      if (refStr.toLowerCase() === "semua_kelas" || refStr.toLowerCase() === "all" || refStr.toLowerCase() === "semua kelas") {
        setSelectedClasses(classesList.map((c: any) => c.name || c.id));
      } else {
        const split = refStr.split(",").map((s: string) => s.trim()).filter(Boolean);
        setSelectedClasses(split.length > 0 ? split : classesList.map((c: any) => c.name || c.id));
      }
    } else {
      setSelectedClasses(classesList.map((c: any) => c.name || c.id));
    }
    setError("");
  };

  // When modal opens or initialSelectedId changes
  useEffect(() => {
    if (isOpen && columns.length > 0) {
      setError("");
      const target =
        columns.find((c) => c.id === initialSelectedId) ||
        columns[0];
      if (target) {
        populateFromColumn(target);
      }
    }
  }, [isOpen, initialSelectedId, columns]);

  if (!isOpen) return null;

  const handleColumnSelectChange = (newId: string) => {
    const found = columns.find((c) => c.id === newId);
    if (found) {
      populateFromColumn(found);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColId) {
      setError("Pilih kolom penilaian yang ingin diedit.");
      return;
    }
    if (!title.trim()) {
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
      setError("");
      await onSave({
        id: selectedColId,
        type,
        originalType,
        title: title.trim(),
        bab,
        selectedClasses,
        startDate,
        deadline: type === "Tugas" ? deadline : undefined,
        description: description.trim(),
      });
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan perubahan kolom.");
    }
  };

  const allClassNames = classesList.map((c: any) => c.name || c.id);
  const isAllSelected =
    allClassNames.length > 0 && selectedClasses.length === allClassNames.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-900 via-slate-900 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Edit Identitas Kolom Nilai
              </h3>
              <p className="text-xs text-slate-300">
                Ubah judul, jenis, bab, tanggal, kelas sasaran, dan keterangan kolom
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
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Kolom Selector */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Pilih Kolom Penilaian yang Diedit
            </label>
            <select
              value={selectedColId}
              onChange={(e) => handleColumnSelectChange(e.target.value)}
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all cursor-pointer"
            >
              {columns.map((col) => {
                const isExam = col.type === "exam";
                return (
                  <option key={`opt-col-${col.id}`} value={col.id}>
                    [{isExam ? "CBT" : "TUGAS"}] {col.title} - {col.bab || "Umum"}
                  </option>
                );
              })}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Catatan: Nilai siswa yang telah diinput pada kolom ini akan tetap aman dan tidak akan hilang saat identitas kolom diperbarui.
            </p>
          </div>

          {/* 1. Jenis Penilaian: Tugas vs CBT */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Jenis Penilaian
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("Tugas")}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  type === "Tugas"
                    ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm shadow-blue-500/10 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    type === "Tugas"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Tugas</span>
                    {type === "Tugas" && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    Tugas mandiri / kelompok / proyek siswa
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType("CBT")}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  type === "CBT"
                    ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-sm shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    type === "CBT"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <MonitorPlay className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">CBT (Ujian)</span>
                    {type === "CBT" && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    Penilaian Harian, Evaluasi, atau CBT
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Judul / Nama Tugas atau CBT */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Judul / Nama {type === "CBT" ? "CBT (Ujian)" : "Tugas"}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "CBT"
                  ? "Contoh: Penilaian Harian Sistem Komputer"
                  : "Contoh: Tugas 1 Analisis Algoritma"
              }
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
            />
          </div>

          {/* 3. Bab Pembelajaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              Bab Pembelajaran
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={bab}
              onChange={(e) => setBab(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
            >
              <option value="" disabled>-- Pilih Bab --</option>
              {chaptersList.map((chap, idx) => {
                const name = chap.name || chap.id;
                return (
                  <option key={`chap-${idx}`} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 4. Tanggal Mulai & Tenggat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal Mulai / Penugasan
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
              />
            </div>

            {type === "Tugas" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Batas Waktu (Tenggat)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1.5 opacity-60">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Batas Waktu CBT
                </label>
                <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 italic">
                  Sesuai durasi sesi CBT aktif
                </div>
              </div>
            )}
          </div>

          {/* 5. Kelas Sasaran (Checkboxes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Kelas Sasaran
                <span className="text-rose-500">*</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 ml-1">
                  {selectedClasses.length} / {classesList.length} Dipilih
                </span>
              </label>

              <button
                type="button"
                onClick={handleToggleAllClasses}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                    Batal Pilih
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    Pilih Semua Kelas
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 max-h-40 overflow-y-auto custom-scrollbar">
              {classesList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  Belum ada daftar kelas yang terdaftar.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classesList.map((cls, idx) => {
                    const cName = cls.name || cls.id;
                    const isChecked = selectedClasses.includes(cName);
                    return (
                      <label
                        key={`cls-edit-${cls.id || cName}-${idx}`}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                          isChecked
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClass(cName)}
                          className="hidden"
                        />
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? "bg-white text-amber-600 border-white"
                              : "border-slate-300 bg-slate-50"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{cName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Kolom ini hanya akan muncul pada filter kelas yang dipilih di atas dan pada buku nilai siswa bersangkutan.
            </p>
          </div>

          {/* 6. Keterangan / Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Keterangan / Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Penilaian praktikum pembuatan program sederhana materi perulangan..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
