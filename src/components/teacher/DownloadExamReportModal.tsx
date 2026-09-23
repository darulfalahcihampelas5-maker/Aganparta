import React from "react";
import { motion } from "motion/react";
import {
  FileText,
  X,
  Download,
  ShieldAlert,
  GraduationCap,
  RefreshCw,
  Filter,
} from "lucide-react";

interface DownloadExamReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  classesList: any[];
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  onDownloadReport: (exam: any, selectedClass: string) => void;
  isGeneratingPdf: boolean;
  studentsList: any[];
  finalGradesList: any[];
}

export const DownloadExamReportModal: React.FC<DownloadExamReportModalProps> = ({
  isOpen,
  onClose,
  exam,
  classesList,
  selectedClass,
  setSelectedClass,
  onDownloadReport,
  isGeneratingPdf,
  studentsList,
  finalGradesList,
}) => {
  if (!isOpen || !exam) return null;

  const effectiveClass = selectedClass || "SEMUA_KELAS";

  // Filter students based on selected class
  const classStudents = effectiveClass === "SEMUA_KELAS"
    ? studentsList
    : studentsList.filter((s) => s.kelas === effectiveClass);

  // Filter exam results for this exam
  const examGrades = finalGradesList.filter((g) => g.assignmentId === exam.id || g.examId === exam.id);
  const studentsWithGrades = classStudents.map((stu) => {
    const grade = examGrades.find((g) => g.nisn === stu.nisn);
    return {
      ...stu,
      grade: grade?.nilai ?? grade?.score ?? null,
      violationCount: grade?.violationCount ?? 0,
      submittedAt: grade?.submittedAt ?? null,
      wasTimeOut: grade?.wasTimeOut ?? false,
    };
  });

  const completedCount = studentsWithGrades.filter((s) => s.grade !== null).length;
  const violationTotal = studentsWithGrades.reduce((sum, s) => sum + (s.violationCount || 0), 0);
  const avgScore = completedCount > 0
    ? Math.round(studentsWithGrades.reduce((sum, s) => sum + (s.grade || 0), 0) / completedCount)
    : 0;

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
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                Unduh Laporan Pelanggaran & Hasil Ujian
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Format Resmi PDF • Kop SMAN 1 Cililin
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
          {/* Exam Details */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md">
                  {exam.subject || "Informatika"}
                </span>
                <h4 className="font-display font-black text-slate-900 text-base mt-1">
                  {exam.title}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-500 block">
                  Token: {exam.token}
                </span>
                <span className="text-[11px] font-bold text-slate-700">
                  KKM: {exam.kkm || 75}
                </span>
              </div>
            </div>
          </div>

          {/* Class Filter Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Pilih Kelas yang Ingin Dicetak dalam Laporan:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
            >
              <option value="SEMUA_KELAS">-- Semua Kelas (Gabungan Seluruh Siswa) --</option>
              {classesList.map((cls, idx) => (
                <option key={`dl-cls-opt-${cls.id || idx}`} value={cls.name}>
                  Kelas {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Statistics Grid */}
          <div className="grid grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Siswa Mengerjakan
              </span>
              <div className="text-lg font-black text-slate-900 flex items-center justify-center gap-1">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                {completedCount} / {classStudents.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Rata-rata Nilai
              </span>
              <div className="text-lg font-black text-slate-900">
                {avgScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">
                Total Pelanggaran
              </span>
              <div className="text-lg font-black text-amber-800 flex items-center justify-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                {violationTotal} Kali
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              Isi Dokumen Laporan PDF Resmi:
            </p>
            <ul className="list-disc list-inside text-[11px] text-blue-800 pl-1 space-y-0.5">
              <li>Kop Surat Resmi SMA Negeri 1 Cililin</li>
              <li>Rekap nilai ujian dan status ketuntasan siswa (Tuntas / Belum Tuntas)</li>
              <li>Catatan log deteksi pelanggaran (berpindah tab / keluar layar ujian)</li>
              <li>Kolom tanda tangan Guru Mata Pelajaran</li>
            </ul>
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
            onClick={() => onDownloadReport(exam, effectiveClass)}
            disabled={isGeneratingPdf}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Membuat Dokumen PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                Unduh PDF Laporan ({effectiveClass === "SEMUA_KELAS" ? "Semua Kelas" : `Kelas ${effectiveClass}`})
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
