import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Check,
  Save,
  AlertCircle,
  KeyRound,
  GraduationCap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getDriveImageUrl } from "../../lib/driveUtils";

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  classesList: any[];
  onSave: (updatedData: {
    displayName: string;
    kelas: string;
    nisn: string;
    accessCode: string;
  }) => Promise<void>;
  onZoomPhoto?: (photoUrl: string, name: string) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  classesList,
  onSave,
  onZoomPhoto,
}) => {
  const [displayName, setDisplayName] = useState("");
  const [kelas, setKelas] = useState("");
  const [nisn, setNisn] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (student) {
      setDisplayName(student.displayName || student.name || "");
      setKelas(student.kelas || "");
      setNisn(student.nisn || "");
      setAccessCode(student.accessCode || "");
      setErrorMessage("");
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleGenerateAccessCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage("Nama lengkap siswa wajib diisi.");
      return;
    }
    if (!kelas.trim()) {
      setErrorMessage("Kelas siswa wajib dipilih.");
      return;
    }
    if (!nisn.trim()) {
      setErrorMessage("NISN/NIS siswa wajib diisi.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await onSave({
        displayName: displayName.trim(),
        kelas: kelas.trim(),
        nisn: nisn.trim(),
        accessCode: accessCode.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menyimpan perubahan data siswa.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableClasses = Array.from(
    new Set([
      ...classesList.map((c) => c.name || c.id),
      student.kelas,
    ].filter(Boolean))
  ).sort();

  return (
    <div
      id="edit-student-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Edit Data Siswa
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Perbarui nama lengkap, kelas, atau kode akses siswa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Photo & Quick Info Preview */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3.5">
            {student.profilePhotoUrl ? (
              <button
                type="button"
                onClick={() => {
                  if (onZoomPhoto && student.profilePhotoUrl) {
                    onZoomPhoto(
                      getDriveImageUrl(student.profilePhotoUrl),
                      student.displayName || "Foto Siswa"
                    );
                  }
                }}
                className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer shrink-0 border border-slate-200 shadow-xs hover:ring-2 hover:ring-emerald-500 transition-all group"
                title="Klik untuk perbesar foto"
              >
                <img
                  src={getDriveImageUrl(student.profilePhotoUrl)}
                  alt={student.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-400 shrink-0 font-bold border border-slate-200">
                <User className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Identitas Terdaftar (NIS: {student.nisn || "-"})
              </span>
              <p className="text-xs text-slate-600 truncate font-semibold">
                ID Dokumen: <span className="font-mono text-slate-800">{student.id || student.nisn}</span>
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nama Lengkap Siswa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap Siswa <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan nama lengkap siswa..."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] focus:bg-white outline-none transition-all text-slate-900 font-semibold shadow-xs"
            />
          </div>

          {/* NIS / NISN & Kelas (Grid 2 Kolom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* NIS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                NIS / NISN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 10423"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] focus:bg-white outline-none transition-all text-slate-900 font-mono font-semibold shadow-xs"
              />
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kelas Siswa <span className="text-rose-500">*</span>
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] focus:bg-white outline-none transition-all text-slate-900 font-bold shadow-xs cursor-pointer h-[42px]"
              >
                <option value="">-- Pilih Kelas --</option>
                {availableClasses.map((clsName, idx) => (
                  <option key={`edit-stu-cls-${clsName}-${idx}`} value={clsName}>
                    Kelas {clsName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kode Akses Siswa */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kode Akses (PIN Masuk Siswa)
              </label>
              <button
                type="button"
                onClick={handleGenerateAccessCode}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Acak Baru
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Contoh: X7K9P2"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] focus:bg-white outline-none transition-all text-slate-900 font-mono font-bold tracking-wider uppercase shadow-xs"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Kode ini digunakan siswa saat login pertama kali jika diperlukan.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#85cc00] hover:brightness-110 active:scale-98 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#85cc00]/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
