import React, { useState } from "react";
import { motion } from "motion/react";
import {
  RotateCcw,
  X,
  AlertTriangle,
  Users,
  User,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";

interface ResetStudentExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  studentsList: any[];
  finalGradesList: any[];
  onConfirmReset: (examId: string, targetNisn: string) => Promise<void>;
  isResetting: boolean;
}

export const ResetStudentExamModal: React.FC<ResetStudentExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  studentsList,
  finalGradesList,
  onConfirmReset,
  isResetting,
}) => {
  const [resetMode, setResetMode] = useState<"single" | "all">("single");
  const [selectedNisn, setSelectedNisn] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen || !exam) return null;

  // Filter students in exam target class
  const examRef = exam.kelasRef || "";
  const targetClasses = Array.isArray(exam.targetClasses) && exam.targetClasses.length > 0
    ? exam.targetClasses
    : examRef.split(",").map((s: string) => s.trim());

  const classStudents = studentsList.filter((s) => {
    if (targetClasses.includes("SEMUA_KELAS") || examRef === "SEMUA_KELAS" || !examRef) return true;
    return targetClasses.includes(s.kelas) || examRef.includes(s.kelas);
  });

  // Check exam scores from final_grades
  const examGrades = finalGradesList.filter((g) => g.assignmentId === exam.id || g.examId === exam.id);
  const studentsWithStatus = classStudents.map((stu) => {
    const grade = examGrades.find((g) => g.nisn === stu.nisn);
    return {
      ...stu,
      hasSubmitted: !!grade,
      score: grade?.nilai ?? grade?.score ?? null,
      violationCount: grade?.violationCount ?? 0,
      submittedAt: grade?.submittedAt ?? null,
    };
  });

  const submittedStudents = studentsWithStatus.filter((s) => s.hasSubmitted);

  const filteredSubmittedStudents = submittedStudents.filter(
    (s) =>
      s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn?.includes(searchQuery) ||
      s.kelas?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecuteReset = async () => {
    if (resetMode === "single" && !selectedNisn) return;
    const target = resetMode === "all" ? "ALL" : selectedNisn;
    await onConfirmReset(exam.id, target);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border-2 border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
              <RotateCcw className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                Reset Ujian CBT Siswa
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Beri Kesempatan Mengerjakan Ulang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-200/50 rounded-xl active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Exam Info */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                  {exam.subject || "Informatika"}
                </span>
                <h4 className="font-display font-black text-slate-900 text-base mt-1">
                  {exam.title}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded-lg">
                  Token: {exam.token}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Kelas: <strong className="text-slate-800">{exam.kelasRef}</strong> • Total {submittedStudents.length} siswa telah menyelesaikan ujian ini.
            </p>
          </div>

          {/* Reset Mode Switch */}
          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block">
              Pilih Target Reset Ujian:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetMode("single");
                  if (submittedStudents.length > 0 && !selectedNisn) {
                    setSelectedNisn(submittedStudents[0].nisn);
                  }
                }}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
                  resetMode === "single"
                    ? "border-orange-500 bg-orange-50/30 text-orange-950 font-bold"
                    : "border-slate-200 bg-slate-50 hover:bg-white text-slate-600"
                }`}
              >
                <div className={`p-2 rounded-xl ${resetMode === "single" ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black">1 Siswa Tertentu</div>
                  <div className="text-[10px] text-slate-400 font-medium">Reset untuk perorangan</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResetMode("all")}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
                  resetMode === "all"
                    ? "border-orange-500 bg-orange-50/30 text-orange-950 font-bold"
                    : "border-slate-200 bg-slate-50 hover:bg-white text-slate-600"
                }`}
              >
                <div className={`p-2 rounded-xl ${resetMode === "all" ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black">Semua Siswa di Kelas</div>
                  <div className="text-[10px] text-slate-400 font-medium">Reset massal seluruh kelas</div>
                </div>
              </button>
            </div>
          </div>

          {/* Single Student Selection List */}
          {resetMode === "single" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Pilih Siswa yang Ingin Diberi Kesempatan Mengulang:
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {submittedStudents.length} Siswa Sudah Mengerjakan
                </span>
              </div>

              {submittedStudents.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs font-medium">
                  Belum ada siswa yang menyelesaikan ujian ini di database.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NISN siswa..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {filteredSubmittedStudents.map((stu) => {
                      const isSelected = selectedNisn === stu.nisn;
                      return (
                        <div
                          key={`rst-stu-${stu.nisn}`}
                          onClick={() => setSelectedNisn(stu.nisn)}
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-orange-50/80 font-bold" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300"
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">
                                {stu.displayName || stu.studentName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                NISN: {stu.nisn} • Kelas: {stu.kelas}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-black text-slate-900">
                              Nilai: {stu.score ?? 0}
                            </span>
                            {stu.violationCount > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                {stu.violationCount}x Pelanggaran
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed space-y-1">
              <strong className="block font-bold">Perhatian:</strong>
              <p>
                {resetMode === "single"
                  ? "Mereset ujian untuk siswa ini akan menghapus nilai dan riwayat pengerjaan sebelumnya di server. Siswa dapat memasukkan token ujian kembali dan memulai ujian dari awal."
                  : "Mereset seluruh kelas akan menghapus seluruh data nilai ujian ini untuk semua siswa di kelas sasaran. Tindakan ini tidak dapat dibatalkan!"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200/60 transition-all border border-slate-200 cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={isResetting || (resetMode === "single" && !selectedNisn)}
            className="px-8 py-3.5 bg-orange-600 hover:bg-orange-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Mereset Ujian...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 shrink-0" />
                {resetMode === "all" ? "Reset Seluruh Kelas" : "Reset Ujian Siswa Ini"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
