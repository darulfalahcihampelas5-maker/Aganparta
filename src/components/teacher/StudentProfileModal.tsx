import React from "react";
import { motion } from "motion/react";
import { User, X } from "lucide-react";
import { getDriveImageUrl } from "../../lib/driveUtils";
import { isAssignmentForClass, isExamForClass } from "../../lib/gradeUtils";

interface StudentProfileModalProps {
  selectedStudentProfile: any;
  onClose: () => void;
  studentProfileTab: "tugas" | "ujian";
  setStudentProfileTab: (tab: "tugas" | "ujian") => void;
  submissionsList: any[];
  assignmentsList: any[];
  examsList: any[];
  finalGradesList: any[];
  getAssignmentPublishedAtForTeacher: (asg: any, kelas?: string) => string;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  selectedStudentProfile,
  onClose,
  studentProfileTab,
  setStudentProfileTab,
  submissionsList,
  assignmentsList,
  examsList,
  finalGradesList,
  getAssignmentPublishedAtForTeacher,
}) => {
  if (!selectedStudentProfile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-950/80 bg-white/95 p-4 sm:p-10 animate-in fade-in duration-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-50 p-10 text-black flex justify-between items-center shrink-0 relative overflow-hidden border-b border-slate-200">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 rounded-full border-4 border-[#85cc00] bg-[#85cc00]/10 flex items-center justify-center overflow-hidden shadow-md">
              {selectedStudentProfile.profilePhotoUrl ? (
                <img
                  loading="lazy"
                  src={getDriveImageUrl(selectedStudentProfile.profilePhotoUrl)}
                  alt={selectedStudentProfile.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-10 h-10 text-slate-950" />
              )}
            </div>
            <div>
              <h3 className="text-3xl font-display font-black tracking-tight text-slate-950">
                {selectedStudentProfile.displayName}
              </h3>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white border border-slate-200 rounded-md text-slate-600">
                  NIS: {selectedStudentProfile.nisn}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[#85cc00]/20 border border-[#85cc00]/30 rounded-md text-slate-800">
                  Kelas: {selectedStudentProfile.kelas || "-"}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[#85cc00]/10 border border-[#85cc00]/20 rounded-md text-[#85cc00]">
                  Akses: {selectedStudentProfile.accessCode || "-"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 group relative z-10 animate-pulse"
          >
            <X className="w-7 h-7 group-hover:rotate-90 transition-transform text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 px-10 py-3 gap-4 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setStudentProfileTab("tugas")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              studentProfileTab === "tugas"
                ? "bg-[#85cc00] text-black shadow-md shadow-[#85cc00]/20"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            Riwayat Tugas & Materi
          </button>
          <button
            onClick={() => setStudentProfileTab("ujian")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              studentProfileTab === "ujian"
                ? "bg-[#85cc00] text-black shadow-md shadow-[#85cc00]/20"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            Riwayat Ujian / CBT
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className="p-10 overflow-y-auto space-y-6">
          {studentProfileTab === "tugas" ? (
            <div className="space-y-6">
              <h4 className="text-lg font-display font-black text-slate-800 uppercase tracking-wider mb-4">
                Daftar Tugas & Status Pengumpulan
              </h4>
              {(() => {
                const studentSubmissions = submissionsList.filter(
                  (s) => s.nisn === selectedStudentProfile.nisn
                );
                const studentAssignments = assignmentsList.filter(
                  (a) => isAssignmentForClass(a, selectedStudentProfile.kelas)
                );

                if (studentAssignments.length === 0) {
                  return (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium">
                      Belum ada tugas yang ditugaskan ke kelas siswa ini.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {studentAssignments.map((asg, idx) => {
                      const sub = studentSubmissions.find(
                        (s) => (s.assignmentId === asg.id || s.id === `SUB-${selectedStudentProfile.nisn}-${asg.id}`)
                      );
                      const finalGrade = finalGradesList.find(
                        (fg) =>
                          (fg.nisn === selectedStudentProfile.nisn || fg.nis === selectedStudentProfile.nisn) &&
                          (fg.assignmentId === asg.id || fg.examId === asg.id || fg.id === `${asg.id}_${selectedStudentProfile.nisn}`)
                      );

                      const score = (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai")
                        ? sub.nilai
                        : (finalGrade?.nilai ?? finalGrade?.score ?? (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" ? sub.nilai : undefined));

                      return (
                        <div
                          key={`stu-asg-${asg.id || idx}-${idx}`}
                          className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
                            sub
                              ? "bg-white border-slate-300 shadow-md hover:shadow-lg"
                              : "bg-slate-50/50 border-slate-200"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-[#85cc00]/10 text-[#85cc00] border border-[#85cc00]/20 rounded px-2.5 py-0.5 uppercase tracking-wider">
                                {asg.type === "materi" ? "Materi" : "Tugas"}
                              </span>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-600 rounded px-2.5 py-0.5 uppercase tracking-wider">
                                {asg.subject}
                              </span>
                            </div>
                            <h5 className="text-lg font-black text-slate-800 font-display">
                              {asg.title}
                            </h5>
                            <p className="text-xs font-semibold text-slate-400">
                              Rilis: {getAssignmentPublishedAtForTeacher(asg, selectedStudentProfile?.kelas)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                            {score !== undefined ? (
                              <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                  Nilai:
                                </span>
                                <span className="text-2xl font-black text-[#85cc00] font-display">
                                  {score}
                                </span>
                              </div>
                            ) : sub ? (
                              <span className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-md uppercase tracking-wider">
                                Menunggu Penilaian Guru
                              </span>
                            ) : (
                              <span className="text-[10px] font-black bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1 rounded-md uppercase tracking-wider">
                                Belum Mengumpulkan
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-6">
              <h4 className="text-lg font-display font-black text-slate-800 uppercase tracking-wider mb-4">
                Riwayat Hasil Ujian Informatika
              </h4>
              {(() => {
                const studentExams = examsList.filter((e) => {
                  const isCorrectClass = isExamForClass(e, selectedStudentProfile.kelas);
                  const isSubjectInformatika = !e.subject || e.subject.toLowerCase().includes("informatika");
                  return isCorrectClass && isSubjectInformatika;
                });

                if (studentExams.length === 0) {
                  return (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium">
                      Tidak ada ujian Informatika yang dijadwalkan untuk kelas siswa ini.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {studentExams.map((exam, idx) => {
                      const finalGrade = finalGradesList.find(
                        (fg) =>
                          (fg.nisn === selectedStudentProfile.nisn || fg.nis === selectedStudentProfile.nisn) &&
                          (fg.assignmentId === exam.id || fg.examId === exam.id || fg.alignmentId === exam.id || fg.id === `${exam.id}_${selectedStudentProfile.nisn}`)
                      );

                      const score = finalGrade?.nilai ?? finalGrade?.score;
                      const kkm = exam.kkm || 75;
                      const hasPassed = score !== undefined && score >= kkm;
                      const violationCount = finalGrade?.violationCount || 0;

                      return (
                        <div
                          key={`stu-exam-${exam.id || idx}-${idx}`}
                          className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
                            score !== undefined
                              ? "bg-white border-slate-300 shadow-md hover:shadow-lg"
                              : "bg-slate-50/50 border-slate-200"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-[#85cc00]/10 text-[#85cc00] border border-[#85cc00]/20 rounded px-2.5 py-0.5 uppercase tracking-wider">
                                {exam.subject}
                              </span>
                              {score !== undefined && (
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                                    hasPassed
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-[#85cc00]/10 text-[#85cc00] border-[#85cc00]/20"
                                  }`}
                                >
                                  {hasPassed ? "Memenuhi KKM" : "Belum Lulus"}
                                </span>
                              )}
                            </div>
                            <h5 className="text-lg font-black text-slate-800 font-display">
                              {exam.title}
                            </h5>
                            <p className="text-xs font-semibold text-slate-400">
                              Terbit: {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"} • KKM: <span className="text-slate-700 font-bold">{kkm}</span> • Total Soal: <span className="text-slate-700 font-bold">{exam.questions?.length || 0}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                            {score !== undefined && (
                              <div className="flex-1 md:flex-initial text-left md:text-right pr-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Status Pengawasan
                                </p>
                                {violationCount > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#85cc00]/10 text-[#85cc00] border border-[#85cc00]/20 uppercase text-[10px] font-black tracking-wider animate-pulse">
                                    🚨 {violationCount}x Pelanggaran
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase text-[10px] font-black tracking-wider">
                                    🟢 Aman / Tertib
                                  </span>
                                )}
                              </div>
                            )}

                            {score !== undefined ? (
                              <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shrink-0">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                  Nilai:
                                </span>
                                <span
                                  className={`text-2xl font-black font-display ${
                                    score >= kkm
                                      ? "text-emerald-500"
                                      : "text-[#85cc00]"
                                  }`}
                                >
                                  {score}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-black bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1 rounded-md uppercase tracking-wider shrink-0">
                                Belum Ujian
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
