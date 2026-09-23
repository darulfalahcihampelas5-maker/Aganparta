import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  RotateCw,
  Sparkles,
  User,
  ShieldCheck,
  Send,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";
import { getDriveImageUrl, getDrivePdfEmbedUrl } from "../../lib/driveUtils";

interface AuditSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
  assignment: any;
  student: any;
  gradeValue: string;
  setGradeValue: (val: string) => void;
  feedbackReason: string;
  setFeedbackReason: (val: string) => void;
  isRejecting: boolean;
  setIsRejecting: (val: boolean) => void;
  isSavingGrade: boolean;
  onSaveGrade: (status: "sudah dinilai" | "ditolak") => void;
  onZoomPhoto?: (photoUrl: string, name: string) => void;
}

export const AuditSubmissionModal: React.FC<AuditSubmissionModalProps> = ({
  isOpen,
  onClose,
  submission,
  assignment,
  student,
  gradeValue,
  setGradeValue,
  feedbackReason,
  setFeedbackReason,
  isRejecting,
  setIsRejecting,
  isSavingGrade,
  onSaveGrade,
  onZoomPhoto,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [justUsedSuggested, setJustUsedSuggested] = useState(false);

  if (!isOpen || !submission) return null;

  const studentDisplayName =
    student?.displayName ||
    student?.studentName ||
    student?.name ||
    submission?.studentName ||
    "Siswa";
  const studentNis = student?.nisn || submission?.nisn || "-";
  const studentKelas = student?.kelas || submission?.kelas || "-";
  const fileUrl = submission?.fileUrl || "";
  const isImage =
    fileUrl &&
    (fileUrl.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(fileUrl) ||
      fileUrl.includes("googleusercontent.com") ||
      fileUrl.includes("drive.google.com"));
  const isPdf =
    fileUrl &&
    (fileUrl.startsWith("data:application/pdf") ||
      /\.pdf($|\?)/i.test(fileUrl) ||
      (fileUrl.includes("drive.google.com") && !isImage));

  const suggestedScore = submission?.suggestedGrade || "100";
  const quickGrades = [100, 95, 90, 85, 80, 75];
  const quickRejectionReasons = [
    "Tugas di buku catatan belum ditambahkan Nama dan Kelas silahkan tambahkan dan kirim ulang tugas",
    "Foto hasil tugas kurang jelas / buram, mohon foto ulang.",
    "Jawaban belum lengkap atau belum selesai, silakan lengkapi.",
    "File tugas yang dikirim tidak sesuai / salah dokumen.",
    "Format tugas tidak sesuai instruksi, silakan perbaiki dan kirim ulang.",
  ];

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `Tugas_${studentDisplayName.replace(/\s+/g, "_")}_${submission.id || "berkas"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleApplySuggested = () => {
    const scoreToUse = String(suggestedScore || "100");
    setGradeValue(scoreToUse);
    setJustUsedSuggested(true);
    setTimeout(() => {
      setJustUsedSuggested(false);
    }, 2000);
  };

  const handleExecuteAcceptAndGrade = () => {
    const finalScore = gradeValue || String(suggestedScore || "100");
    if (!gradeValue) {
      setGradeValue(finalScore);
    }
    onSaveGrade("sudah dinilai");
  };

  return (
    <div
      id="audit-submission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`bg-white w-full rounded-2xl md:rounded-[2rem] border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-2 sm:inset-4 md:inset-6 z-50 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] max-w-none"
            : "max-w-6xl max-h-[92vh] h-full"
        }`}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#85cc00]/20 border border-[#85cc00]/40 flex items-center justify-center text-[#558300] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  Audit Respon & Penilaian Tugas
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {assignment?.materi || "Tugas Siswa"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                Tinjau berkas penyerahan tugas dan tentukan nilai kelulusan siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-toggle-fullscreen-audit"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? "Kecilkan Tampilan" : "Tampilan Penuh (Fullscreen)"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            <button
              id="btn-close-audit-modal"
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns Layout) */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0 bg-slate-100/40">
          {/* Left Column: Student Info & Submission Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 space-y-4">
            {/* Student Card Summary */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {student?.profilePhotoUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onZoomPhoto && student.profilePhotoUrl) {
                        onZoomPhoto(
                          getDriveImageUrl(student.profilePhotoUrl),
                          studentDisplayName
                        );
                      }
                    }}
                    className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer shrink-0 border border-slate-200 shadow-sm hover:ring-2 hover:ring-[#85cc00] transition-all group relative"
                    title="Klik untuk perbesar foto"
                  >
                    <img
                      src={getDriveImageUrl(student.profilePhotoUrl)}
                      alt={studentDisplayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-base border border-slate-200 shrink-0">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {studentDisplayName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5 flex-wrap">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      NIS: {studentNis}
                    </span>
                    <span className="bg-[#85cc00]/15 text-slate-800 px-2 py-0.5 rounded">
                      Kelas: {studentKelas}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    submission.status === "sudah dinilai" || submission.nilai
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : submission.status === "ditolak"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      submission.status === "sudah dinilai" || submission.nilai
                        ? "bg-emerald-500"
                        : submission.status === "ditolak"
                        ? "bg-rose-500"
                        : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  {submission.status === "ditolak"
                    ? "Ditolak"
                    : submission.nilai || submission.status === "sudah dinilai"
                    ? `Dinilai: ${submission.nilai}`
                    : submission.resubmittedAt
                    ? "Kirim Ulang"
                    : "Menunggu Penilaian"}
                </span>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>
            </div>

            {/* Submission Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[300px]">
              {/* Content Header Tools */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Berkas Jawaban Tugas Siswa
                </span>
                {fileUrl && (
                  <div className="flex items-center gap-1">
                    {isImage && (
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title="Putar Gambar 90 Derajat"
                      >
                        <RotateCw className="w-3 h-3" />
                        Putar ({rotation}°)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Unduh Berkas"
                    >
                      <Download className="w-3 h-3" />
                      Unduh
                    </button>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1 shadow-xs transition-colors"
                      title="Buka di Tab Baru"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka
                    </a>
                  </div>
                )}
              </div>

              {/* Content Display Area */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[260px] bg-slate-900/5 relative overflow-auto">
                {isImage ? (
                  <div className="flex items-center justify-center w-full h-full min-h-[240px] p-2">
                    <img
                      src={getDriveImageUrl(fileUrl)}
                      alt="Berkas Tugas Siswa"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: "transform 0.2s ease",
                      }}
                      className="max-h-[500px] w-auto max-w-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                    />
                  </div>
                ) : isPdf ? (
                  <div className="w-full h-full min-h-[380px] flex flex-col">
                    <iframe
                      src={getDrivePdfEmbedUrl(fileUrl)}
                      title="PDF Preview"
                      className="w-full flex-1 rounded-lg border border-slate-200 bg-white min-h-[350px]"
                    />
                  </div>
                ) : fileUrl && fileUrl.startsWith("http") ? (
                  <div className="text-center p-6 space-y-3 bg-white rounded-xl border border-slate-200 shadow-xs max-w-md">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm">
                      Tautan / Dokumen Eksternal
                    </h5>
                    <p className="text-xs text-slate-500 break-all">{fileUrl}</p>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#85cc00] text-slate-950 text-xs font-bold rounded-xl hover:brightness-110 shadow-sm transition-all"
                    >
                      Buka Tautan Jawaban <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-2 text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">
                      Berkas Fisik Tidak Tersimpan / Diarsipkan
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Tugas ini telah dinilai sebelumnya atau berkas lama telah
                      dibersihkan untuk penghematan memori. Data nilai tetap
                      tersimpan aman di database.
                    </p>
                  </div>
                )}
              </div>

              {/* Student Submission Notes (if any) */}
              {(submission?.catatan ||
                submission?.studentNotes ||
                submission?.answerText ||
                submission?.keteranganSiswa) && (
                <div className="p-3.5 bg-amber-50/70 border-t border-amber-200/70 text-xs text-amber-900">
                  <span className="font-bold block mb-1">
                    💬 Catatan dari Siswa:
                  </span>
                  <p className="italic">
                    "{submission.catatan ||
                      submission.studentNotes ||
                      submission.answerText ||
                      submission.keteranganSiswa}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scoring & Feedback Action Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 overflow-y-auto bg-white p-4 sm:p-6 space-y-5">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                id="tab-mode-accept"
                type="button"
                onClick={() => setIsRejecting(false)}
                className={`py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isRejecting
                    ? "bg-[#85cc00] text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Mode: Terima & Nilai
              </button>
              <button
                id="tab-mode-reject"
                type="button"
                onClick={() => setIsRejecting(true)}
                className={`py-2.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isRejecting
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Mode: Tolak & Revisi
              </button>
            </div>

            {!isRejecting ? (
              /* ACCEPT & GRADE SECTION */
              <div className="space-y-4 flex-1 flex flex-col">
                {/* Suggested Auto-Grade Banner */}
                <div className="p-3.5 bg-[#85cc00]/15 border border-[#85cc00]/30 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-5 h-5 text-[#558300] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-black uppercase text-slate-800 block">
                        Saran Nilai Ketepatan Waktu:
                      </span>
                      <span className="text-lg font-mono font-black text-[#436800]">
                        {suggestedScore} Poin
                      </span>
                    </div>
                  </div>
                  <button
                    id="btn-use-suggested-grade"
                    type="button"
                    onClick={handleApplySuggested}
                    className="px-3.5 py-2 bg-[#85cc00] hover:brightness-110 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    title="Gunakan rekomendasi nilai ini"
                  >
                    {justUsedSuggested ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        Diterapkan
                      </>
                    ) : (
                      "Gunakan"
                    )}
                  </button>
                </div>

                {/* Score Input Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Nilai Angka (Skala 0 - 100) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-grade-value"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Contoh: 100"
                      value={gradeValue}
                      onChange={(e) => setGradeValue(e.target.value)}
                      className="w-full text-center py-4 px-4 text-3xl font-mono font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/20 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                      / 100
                    </span>
                  </div>
                </div>

                {/* Quick Score Chips */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Preset Nilai Cepat:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {quickGrades.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGradeValue(val.toString())}
                        className={`py-2 px-3 rounded-xl font-mono text-sm font-black border transition-all cursor-pointer ${
                          gradeValue === val.toString()
                            ? "bg-[#85cc00] text-slate-950 border-[#85cc00] shadow-sm scale-[1.02]"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button: Terima dan Beri Nilai */}
                <div className="mt-auto pt-4 border-t border-slate-100">
                  <button
                    id="btn-save-grade-accept"
                    type="button"
                    disabled={isSavingGrade}
                    onClick={handleExecuteAcceptAndGrade}
                    className="w-full py-4 bg-[#85cc00] hover:brightness-110 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-[#85cc00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingGrade ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        Menyimpan Nilai...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Terima dan Beri Nilai ({gradeValue || String(suggestedScore || "100")})
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* REJECT / REQUEST REVISION SECTION */
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Penolakan / Permintaan Revisi
                  </p>
                  <p className="text-[11px] text-rose-700">
                    Siswa akan menerima notifikasi bahwa tugasnya ditolak dan
                    diminta memperbaiki jawaban sesuai catatan Anda.
                  </p>
                </div>

                {/* Feedback Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Alasan / Catatan Perbaikan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="textarea-feedback-reason"
                    rows={4}
                    placeholder="Tuliskan catatan perbaikan atau alasan penolakan secara jelas untuk siswa..."
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    className="w-full p-3.5 text-xs font-medium text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* Quick Rejection Templates */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Template Alasan Cepat:
                  </span>
                  <div className="space-y-1.5">
                    {quickRejectionReasons.map((reason, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFeedbackReason(reason)}
                        className="w-full text-left p-2.5 rounded-xl text-[11px] font-medium bg-slate-50 hover:bg-rose-50/60 hover:text-rose-900 border border-slate-200 hover:border-rose-200 transition-colors block text-slate-700 cursor-pointer"
                      >
                        • {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <button
                    id="btn-save-grade-reject"
                    type="button"
                    disabled={isSavingGrade || !feedbackReason.trim()}
                    onClick={() => onSaveGrade("ditolak")}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSavingGrade ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Mengirim Penolakan...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Kirim Penolakan & Minta Revisi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
