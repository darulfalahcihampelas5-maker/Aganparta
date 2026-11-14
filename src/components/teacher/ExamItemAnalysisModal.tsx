import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  CheckCircle2,
  X,
  Download,
  AlertTriangle,
  FileCheck2,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { isClassMatch, isSameNisn } from "../../lib/gradeUtils";
import { saveFinalGrade } from "../../lib/supabaseSync";
import { KOP_SURAT_BASE64 } from "../../kopSuratBase64";
import { getDriveImageUrl } from "../../lib/driveUtils";

interface ExamItemAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  studentsList: any[];
  finalGradesList: any[];
  classesList: any[];
  onGradeUpdated?: () => void;
  asPage?: boolean;
  examsList?: any[];
  onSelectExam?: (exam: any) => void;
}

export const ExamItemAnalysisModal: React.FC<ExamItemAnalysisModalProps> = ({
  isOpen,
  onClose,
  exam,
  studentsList,
  finalGradesList,
  classesList,
  onGradeUpdated,
  asPage = false,
  examsList = [],
  onSelectExam,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("SEMUA_KELAS");
  const [activeTab, setActiveTab] = useState<"butir" | "koreksi">("butir");
  const [expandedStudentNisn, setExpandedStudentNisn] = useState<string | null>(null);
  const [editedScores, setEditedScores] = useState<Record<string, Record<number, number>>>({});
  const [savingStudentNisn, setSavingStudentNisn] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const questions: any[] = useMemo(() => (Array.isArray(exam?.questions) ? exam.questions : []), [exam]);

  const examGrades = useMemo(() => {
    if (!exam) return [];
    return finalGradesList.filter((fg) => {
      const matchExam =
        fg.examId === exam.id ||
        fg.assignmentId === exam.id ||
        fg.alignmentId === exam.id ||
        (fg.id && fg.id.startsWith(`${exam.id}_`));
      if (!matchExam) return false;
      if (fg.nilai === undefined && fg.score === undefined) return false;

      const stu = studentsList.find((s) => isSameNisn(s.nisn, fg.nisn));
      const kelasVal = fg.kelas || stu?.kelas || "";
      if (selectedClass !== "SEMUA_KELAS" && !isClassMatch(kelasVal, selectedClass)) {
        return false;
      }
      return true;
    });
  }, [exam, finalGradesList, studentsList, selectedClass]);

  const itemStats = useMemo(() => {
    return questions.map((q, qIdx) => {
      const qType = q.type || "multiple_choice";
      const optionCounts = [0, 0, 0, 0, 0];
      let totalResponses = 0;
      let correctCount = 0;
      let earnedSum = 0;
      const sampleTextAnswers: { studentName: string; answer: string; earned: number }[] = [];

      examGrades.forEach((fg) => {
        const answersPayload = fg.answers;
        const itemEntry =
          answersPayload?.items?.[qIdx] ??
          answersPayload?.[qIdx] ??
          answersPayload?.[String(qIdx)];

        if (itemEntry === undefined || itemEntry === null) return;

        totalResponses++;
        const rawAns = typeof itemEntry === "object" && "answer" in itemEntry ? itemEntry.answer : itemEntry;

        if (qType === "multiple_choice") {
          const optIdx = Number(rawAns);
          if (!Number.isNaN(optIdx) && optIdx >= 0 && optIdx < 5) {
            optionCounts[optIdx]++;
          }
          const isCorr =
            typeof itemEntry === "object" && typeof itemEntry.isCorrect === "boolean"
              ? itemEntry.isCorrect
              : optIdx === q.correctIndex;
          if (isCorr) {
            correctCount++;
            earnedSum += 1;
          }
        } else {
          const earned =
            typeof itemEntry === "object" && typeof itemEntry.earned === "number"
              ? itemEntry.earned
              : typeof itemEntry === "object" && itemEntry.isCorrect
              ? 1
              : 0;
          earnedSum += earned;
          if (earned >= 0.7) correctCount++;
          if (rawAns !== undefined && rawAns !== "") {
            sampleTextAnswers.push({
              studentName: fg.studentName || fg.nisn,
              answer: String(rawAns),
              earned,
            });
          }
        }
      });

      const pctCorrect = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0;
      const pctWrong = totalResponses > 0 ? 100 - pctCorrect : 0;
      const difficulty =
        totalResponses === 0
          ? "Belum Ada Data"
          : pctCorrect >= 75
          ? "Mudah"
          : pctCorrect >= 45
          ? "Sedang"
          : "Sulit (Perlu Penguatan)";

      return {
        idx: qIdx,
        question: q,
        qType,
        totalResponses,
        correctCount,
        wrongCount: Math.max(0, totalResponses - correctCount),
        pctCorrect,
        pctWrong,
        difficulty,
        optionCounts,
        sampleTextAnswers,
      };
    });
  }, [questions, examGrades]);

  const summary = useMemo(() => {
    const kkm = Number(exam?.kkm) || 75;
    const totalStudents = examGrades.length;
    const avgScore =
      totalStudents > 0
        ? Math.round(examGrades.reduce((s, g) => s + (Number(g.nilai ?? g.score) || 0), 0) / totalStudents)
        : 0;
    const passedCount = examGrades.filter((g) => (Number(g.nilai ?? g.score) || 0) >= kkm).length;
    const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

    const validStats = itemStats.filter((s) => s.totalResponses > 0);
    const hardest =
      validStats.length > 0
        ? validStats.reduce((min, cur) => (cur.pctCorrect < min.pctCorrect ? cur : min))
        : null;

    const needsManualCount = examGrades.filter((fg) => fg.answers?.needsManualGrading).length;

    return { totalStudents, avgScore, passRate, passedCount, hardest, kkm, needsManualCount };
  }, [exam, examGrades, itemStats]);

  const handleSaveStudentCorrection = async (fg: any) => {
    const nisn = fg.nisn;
    const overrides = editedScores[nisn];
    if (!overrides || questions.length === 0) return;

    setSavingStudentNisn(nisn);
    try {
      const existingItems = { ...(fg.answers?.items || {}) };
      let totalPoints = 0;

      questions.forEach((q, idx) => {
        const currentItem = existingItems[idx] || {};
        const qType = q.type || "multiple_choice";
        let earned = 0;
        if (overrides[idx] !== undefined) {
          earned = Math.max(0, Math.min(1, overrides[idx]));
        } else if (typeof currentItem.earned === "number") {
          earned = currentItem.earned;
        } else if (currentItem.isCorrect) {
          earned = 1;
        } else if (qType === "multiple_choice" && Number(currentItem.answer) === q.correctIndex) {
          earned = 1;
        }
        existingItems[idx] = {
          ...currentItem,
          type: qType,
          earned,
          isCorrect: earned >= 0.7,
        };
        totalPoints += earned;
      });

      const newScore = Math.round((totalPoints / questions.length) * 100);
      await saveFinalGrade({
        ...fg,
        id: fg.id || `${exam.id}_${nisn}`,
        examId: exam.id,
        assignmentId: exam.id,
        nisn,
        nilai: newScore,
        score: newScore,
        answers: {
          ...(fg.answers || {}),
          items: existingItems,
          needsManualGrading: false,
          gradedByTeacher: true,
        },
        updatedAt: new Date().toISOString(),
      });

      setEditedScores((prev) => {
        const next = { ...prev };
        delete next[nisn];
        return next;
      });
      if (onGradeUpdated) onGradeUpdated();
    } finally {
      setSavingStudentNisn(null);
    }
  };

  const handleExportAnalysisPdf = async () => {
    if (!exam) return;
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = (await import("jspdf-autotable")) as any;
      const doc = new jsPDF("p", "pt", [609.45, 935.43]);
      const pageWidth = 609.45;
      const margin = 40;

      let currentY = 30;
      try {
        const targetW = pageWidth - margin * 2;
        const targetH = (341 / 1450) * targetW;
        doc.addImage(KOP_SURAT_BASE64, "PNG", margin, 18, targetW, targetH);
        currentY = 18 + targetH + 18;
      } catch {
        currentY = 60;
      }

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("LAPORAN ANALISIS BUTIR SOAL UJIAN (CBT)", pageWidth / 2, currentY, { align: "center" });
      currentY += 16;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Ujian: ${exam.title} | Kelas: ${selectedClass === "SEMUA_KELAS" ? "Semua Kelas" : selectedClass} | Peserta: ${summary.totalStudents} Siswa`,
        pageWidth / 2,
        currentY,
        { align: "center" }
      );
      currentY += 18;

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["No", "Tipe", "Ringkasan Soal", "Responden", "Benar", "Salah", "Kategori Kesukaran"]],
        body: itemStats.map((item) => [
          String(item.idx + 1),
          item.qType === "multiple_choice" ? "PG" : item.qType === "short_answer" ? "Isian" : "Esai",
          String(item.question.text || "").slice(0, 95) + ((item.question.text || "").length > 95 ? "..." : ""),
          String(item.totalResponses),
          `${item.pctCorrect}%`,
          `${item.pctWrong}%`,
          item.difficulty,
        ]),
        theme: "grid",
        styles: { font: "Helvetica", fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center", cellWidth: 26 },
          1: { halign: "center", cellWidth: 40 },
          2: { halign: "left", cellWidth: 205 },
          3: { halign: "center", cellWidth: 55 },
          4: { halign: "center", cellWidth: 45, fontStyle: "bold" },
          5: { halign: "center", cellWidth: 45 },
          6: { halign: "center", cellWidth: 110 },
        },
      });

      doc.save(`Analisis_Butir_Soal_${(exam.title || "CBT").replace(/\s+/g, "_")}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!exam) return null;

  const contentBody = (
    <div
      className={
        asPage
          ? "bg-white w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 flex flex-col"
          : "relative z-10 bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
      }
    >
      {/* Header */}
      <div className="bg-slate-50 px-6 sm:px-8 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          {asPage && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs shrink-0"
              title="Kembali ke Ujian Siswa"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>Kembali</span>
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
              Statistik & Analisis Butir Soal Ujian
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              {exam.title} • {questions.length} Soal • KKM {summary.kkm}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {asPage && examsList.length > 1 && onSelectExam && (
            <select
              value={exam.id}
              onChange={(e) => {
                const found = examsList.find((item) => item.id === e.target.value);
                if (found) onSelectExam(found);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[220px]"
            >
              {examsList.map((ex) => (
                <option key={`ana-ex-${ex.id}`} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="SEMUA_KELAS">Semua Kelas</option>
            {classesList.map((c, idx) => (
              <option key={`ana-cls-${c.id || idx}`} value={c.name}>
                Kelas {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportAnalysisPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#85cc00]" />
            <span>{isExportingPdf ? "Mengekspor..." : "Ekspor PDF"}</span>
          </button>
          {!asPage && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 sm:px-8 py-4 bg-white border-b border-slate-100 shrink-0">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Peserta Mengumpulkan
                </span>
                <p className="text-xl font-display font-black text-slate-900 mt-1">
                  {summary.totalStudents} Siswa
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                  Rata-Rata Nilai Kelas
                </span>
                <p className="text-xl font-display font-black text-blue-900 mt-1">
                  {summary.avgScore}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  Ketuntasan ({">"}= {summary.kkm})
                </span>
                <p className="text-xl font-display font-black text-emerald-900 mt-1">
                  {summary.passRate}% ({summary.passedCount}/{summary.totalStudents})
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                  Butir Soal Tersulit
                </span>
                <p className="text-sm font-display font-black text-rose-900 mt-1 truncate">
                  {summary.hardest
                    ? `No. ${summary.hardest.idx + 1} (${summary.hardest.pctCorrect}% Benar)`
                    : "Belum ada jawaban"}
                </p>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="px-6 sm:px-8 pt-3 bg-white border-b border-slate-200 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("butir")}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === "butir"
                    ? "border-[#85cc00] text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Persentase Benar/Salah Per Nomor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("koreksi")}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "koreksi"
                    ? "border-[#85cc00] text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <span>Koreksi Esai & Jawaban Siswa</span>
                {summary.needsManualCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    {summary.needsManualCount} Perlu Cek
                  </span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className={`p-6 sm:p-8 ${asPage ? "" : "overflow-y-auto custom-scrollbar flex-1"} space-y-5 bg-slate-50/40`}>
              {activeTab === "butir" ? (
                itemStats.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm font-semibold">
                    Ujian ini belum memiliki daftar butir soal.
                  </div>
                ) : (
                  itemStats.map((item) => {
                    const isHard = item.totalResponses > 0 && item.pctCorrect < 45;
                    return (
                      <div
                        key={`item-stat-${item.idx}`}
                        className={`p-5 sm:p-6 rounded-3xl bg-white border shadow-xs space-y-4 ${
                          isHard ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                                Soal No. {item.idx + 1}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                                {item.qType === "multiple_choice"
                                  ? "Pilihan Ganda"
                                  : item.qType === "short_answer"
                                  ? "Isian Singkat"
                                  : "Esai"}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                                  item.difficulty === "Mudah"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : item.difficulty === "Sedang"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : item.totalResponses === 0
                                    ? "bg-slate-50 text-slate-500 border border-slate-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isHard && <AlertTriangle className="w-3 h-3" />}
                                {item.difficulty}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                              {item.question.text}
                            </p>
                            {item.question.imageUrl && (
                              <img
                                src={getDriveImageUrl(item.question.imageUrl)}
                                alt={`Lampiran Soal ${item.idx + 1}`}
                                className="max-h-36 rounded-xl border border-slate-200 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>

                          <div className="w-full lg:w-64 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-black">
                              <span className="text-emerald-700">Benar: {item.pctCorrect}%</span>
                              <span className="text-rose-600">Salah: {item.pctWrong}%</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-rose-200 overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full transition-all duration-500"
                                style={{ width: `${item.totalResponses > 0 ? item.pctCorrect : 0}%` }}
                              />
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 text-center">
                              {item.totalResponses > 0
                                ? `${item.correctCount} benar dari ${item.totalResponses} siswa terdata`
                                : "Belum ada rincian jawaban per butir tersimpan"}
                            </p>
                          </div>
                        </div>

                        {/* Distractor / Option Distribution */}
                        {item.qType === "multiple_choice" && Array.isArray(item.question.options) && (
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100">
                            {item.question.options.map((optText: string, optIdx: number) => {
                              const count = item.optionCounts[optIdx] || 0;
                              const pct =
                                item.totalResponses > 0 ? Math.round((count / item.totalResponses) * 100) : 0;
                              const isKey = optIdx === item.question.correctIndex;
                              return (
                                <div
                                  key={`dist-${item.idx}-${optIdx}`}
                                  className={`p-2.5 rounded-xl border text-xs ${
                                    isKey
                                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-black mb-1">
                                    <span>
                                      {String.fromCharCode(65 + optIdx)} {isKey ? "(Kunci)" : ""}
                                    </span>
                                    <span>{pct}%</span>
                                  </div>
                                  <p className="text-[11px] font-medium line-clamp-2" title={optText}>
                                    {optText}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {item.qType !== "multiple_choice" && (
                          <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                            <p className="font-bold text-slate-700">
                              Kunci / Rubrik: <span className="text-blue-700">{item.question.correctAnswerText || "-"}</span>
                            </p>
                            {item.sampleTextAnswers.length > 0 && (
                              <p className="text-[11px] text-slate-500">
                                {item.sampleTextAnswers.length} jawaban tertulis terekam. Gunakan tab{" "}
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("koreksi")}
                                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                                >
                                  Koreksi Esai & Jawaban Siswa
                                </button>{" "}
                                untuk memberi poin manual.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : examGrades.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm font-semibold">
                  Belum ada siswa yang mengumpulkan ujian pada filter kelas ini.
                </div>
              ) : (
                examGrades.map((fg) => {
                  const nisn = fg.nisn;
                  const isExpanded = expandedStudentNisn === nisn;
                  const stuScore = fg.nilai ?? fg.score ?? 0;
                  const stuOverrides = editedScores[nisn] || {};
                  const hasEdits = Object.keys(stuOverrides).length > 0;

                  return (
                    <div key={`kor-${nisn}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div
                        onClick={() => setExpandedStudentNisn(isExpanded ? null : nisn)}
                        className="p-4 sm:px-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {fg.studentName || nisn}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {fg.kelas || "-"}
                            </span>
                            {fg.answers?.needsManualGrading && (
                              <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                Perlu Koreksi Esai
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">NIS: {nisn}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Nilai Akhir</span>
                            <span className="text-xl font-display font-black text-slate-900">{stuScore}</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-5 sm:px-6 border-t border-slate-100 bg-slate-50/60 space-y-3">
                          {questions.map((q, qIdx) => {
                            const itemEntry = fg.answers?.items?.[qIdx] ?? fg.answers?.[qIdx];
                            const qType = q.type || "multiple_choice";
                            const rawAns =
                              typeof itemEntry === "object" && itemEntry !== null && "answer" in itemEntry
                                ? itemEntry.answer
                                : itemEntry;

                            const currentEarned =
                              stuOverrides[qIdx] !== undefined
                                ? stuOverrides[qIdx]
                                : typeof itemEntry?.earned === "number"
                                ? itemEntry.earned
                                : itemEntry?.isCorrect || (qType === "multiple_choice" && Number(rawAns) === q.correctIndex)
                                ? 1
                                : 0;

                            return (
                              <div
                                key={`stu-${nisn}-q-${qIdx}`}
                                className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                              >
                                <div className="space-y-1 flex-1">
                                  <span className="text-[10px] font-black uppercase text-slate-400">
                                    Soal {qIdx + 1} ({qType === "multiple_choice" ? "PG" : qType === "short_answer" ? "Isian" : "Esai"})
                                  </span>
                                  <p className="text-xs font-bold text-slate-900">{q.text}</p>
                                  <p className="text-xs text-slate-700">
                                    <span className="font-bold">Jawaban Siswa:</span>{" "}
                                    {rawAns === undefined || rawAns === "" ? (
                                      <span className="text-slate-400 italic">Kosong</span>
                                    ) : qType === "multiple_choice" ? (
                                      `${String.fromCharCode(65 + Number(rawAns))}. ${q.options?.[Number(rawAns)] || "-"}`
                                    ) : (
                                      <span className="font-semibold text-blue-900">{String(rawAns)}</span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-emerald-700 font-semibold">
                                    Kunci:{" "}
                                    {qType === "multiple_choice"
                                      ? `${String.fromCharCode(65 + q.correctIndex)}. ${q.options?.[q.correctIndex] || ""}`
                                      : q.correctAnswerText || "-"}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-bold text-slate-500">Poin:</span>
                                  {[
                                    { label: "Salah (0)", val: 0 },
                                    { label: "Setengah (0.5)", val: 0.5 },
                                    { label: "Benar (1)", val: 1 },
                                  ].map((opt) => (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() =>
                                        setEditedScores((prev) => ({
                                          ...prev,
                                          [nisn]: { ...(prev[nisn] || {}), [qIdx]: opt.val },
                                        }))
                                      }
                                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                        currentEarned === opt.val
                                          ? opt.val === 1
                                            ? "bg-emerald-600 text-white border-emerald-600"
                                            : opt.val === 0.5
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-rose-600 text-white border-rose-600"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              disabled={!hasEdits || savingStudentNisn === nisn}
                              onClick={() => handleSaveStudentCorrection(fg)}
                              className="px-5 py-2.5 bg-[#85cc00] hover:brightness-105 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-sm"
                            >
                              {savingStudentNisn === nisn ? (
                                <FileCheck2 className="w-4 h-4 animate-pulse" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              <span>
                                {savingStudentNisn === nisn ? "Menyimpan..." : "Simpan & Hitung Ulang Nilai"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
  );

  if (asPage) {
    return isOpen ? <div className="space-y-6 animate-in fade-in duration-300">{contentBody}</div> : null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-5xl"
          >
            {contentBody}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
