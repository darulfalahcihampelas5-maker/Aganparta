import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  X,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { collection, getDocs as fsGetDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { dbGetDocs, isFirebaseQuotaExhausted, saveFinalGrade, setFirebaseQuotaExhausted } from "../../lib/supabaseSync";
import { isClassMatch, isExamForClass, isSameNisn } from "../../lib/gradeUtils";

interface LiveProctoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  studentsList: any[];
  finalGradesList: any[];
  classesList: any[];
  asPage?: boolean;
  examsList?: any[];
  onSelectExam?: (exam: any) => void;
  onRefreshGrades?: () => void;
}

const hasNumericScoreVal = (val: any): boolean =>
  val !== undefined && val !== null && val !== "" && !Number.isNaN(Number(val));

const normalizeNisnKey = (val: any): string => {
  const s = String(val || "").trim();
  if (!s) return "";
  return s.replace(/^0+/, "") || s;
};

const toTimeMs = (iso?: any): number => {
  if (!iso) return 0;
  if (typeof iso?.toDate === "function") return iso.toDate().getTime() || 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const isSessionCompleted = (s: any): boolean =>
  Boolean(s && s.status !== "reset" && (s.status === "selesai" || Boolean(s.finishedAt)));

const mergeSessionRecord = (existing: any, incoming: any): any => {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const exResetTs = existing.status === "reset" ? toTimeMs(existing.resetAt || existing.lastActiveAt) : 0;
  const inResetTs = incoming.status === "reset" ? toTimeMs(incoming.resetAt || incoming.lastActiveAt) : 0;
  if (incoming.status === "reset" && existing.status !== "reset") {
    const exAttemptTs = toTimeMs(existing.finishedAt || existing.startedAt || existing.lastActiveAt);
    if (inResetTs >= exAttemptTs) {
      return { ...incoming };
    }
    return { ...existing };
  }
  if (existing.status === "reset" && incoming.status !== "reset") {
    const inAttemptTs = toTimeMs(incoming.finishedAt || incoming.startedAt || incoming.lastActiveAt);
    if (inAttemptTs > exResetTs) {
      return { ...incoming };
    }
    return { ...existing };
  }

  const exDone = isSessionCompleted(existing);
  const inDone = isSessionCompleted(incoming);

  // Allow an explicit newer remedial attempt (`startedAt` strictly newer than previous `finishedAt`)
  const exFinTs = toTimeMs(existing.finishedAt || existing.lastActiveAt);
  const inStartTs = toTimeMs(incoming.startedAt);
  const isNewRemedialRestart = exDone && !inDone && inStartTs > exFinTs + 2000;

  if (exDone && !inDone && !isNewRemedialRestart) {
    return {
      ...incoming,
      ...existing,
      status: "selesai",
      violationCount: Math.max(Number(existing.violationCount || 0), Number(incoming.violationCount || 0)),
      answeredCount: Math.max(Number(existing.answeredCount || 0), Number(incoming.answeredCount || 0)),
      score: hasNumericScoreVal(existing.score ?? existing.nilai)
        ? (existing.score ?? existing.nilai)
        : (incoming.score ?? incoming.nilai),
      finishedAt: existing.finishedAt || incoming.finishedAt || existing.lastActiveAt,
      lastActiveAt:
        toTimeMs(incoming.lastActiveAt) > toTimeMs(existing.lastActiveAt)
          ? incoming.lastActiveAt
          : existing.lastActiveAt,
    };
  }

  if (inDone && !exDone) {
    return {
      ...existing,
      ...incoming,
      status: "selesai",
      violationCount: Math.max(Number(existing.violationCount || 0), Number(incoming.violationCount || 0)),
      answeredCount: Math.max(Number(existing.answeredCount || 0), Number(incoming.answeredCount || 0)),
      score: hasNumericScoreVal(incoming.score ?? incoming.nilai)
        ? (incoming.score ?? incoming.nilai)
        : (existing.score ?? existing.nilai),
      finishedAt: incoming.finishedAt || existing.finishedAt || incoming.lastActiveAt,
    };
  }

  const exTs = toTimeMs(existing.finishedAt || existing.lastActiveAt);
  const inTs = toTimeMs(incoming.finishedAt || incoming.lastActiveAt);
  const primary = inTs >= exTs ? incoming : existing;
  const secondary = primary === incoming ? existing : incoming;

  return {
    ...secondary,
    ...primary,
    violationCount: Math.max(Number(existing.violationCount || 0), Number(incoming.violationCount || 0)),
    answeredCount:
      primary.status === "selesai" || secondary.status === "selesai"
        ? Math.max(Number(existing.answeredCount || 0), Number(incoming.answeredCount || 0))
        : Number(primary.answeredCount ?? secondary.answeredCount ?? 0),
    score: hasNumericScoreVal(primary.score ?? primary.nilai)
      ? (primary.score ?? primary.nilai)
      : (secondary.score ?? secondary.nilai),
    startedAt: primary.startedAt || secondary.startedAt,
    durationUsedSeconds: primary.durationUsedSeconds ?? secondary.durationUsedSeconds,
  };
};

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "-";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 20) return "Baru saja";
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} mnt lalu`;
  return new Date(isoString).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatSolveDuration(totalSeconds?: number | null): string {
  if (totalSeconds === undefined || totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "-";
  }
  const secs = Math.max(1, Math.round(totalSeconds));
  if (secs < 60) return `${secs} detik`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) {
    return remSecs > 0 ? `${mins} mnt ${remSecs} dtk` : `${mins} menit`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} jam ${remMins} mnt` : `${hrs} jam`;
}

export const LiveProctoringModal: React.FC<LiveProctoringModalProps> = ({
  isOpen,
  onClose,
  exam,
  studentsList,
  finalGradesList,
  classesList,
  asPage = false,
  examsList = [],
  onSelectExam,
  onRefreshGrades,
}) => {
  const [sessionsMap, setSessionsMap] = useState<Record<string, any>>({});
  const [selectedClass, setSelectedClass] = useState<string>("SEMUA_KELAS");
  const [statusFilter, setStatusFilter] = useState<"semua" | "mengerjakan" | "melanggar" | "selesai" | "belum">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mergeIntoSessionsMap = (incomingList: any[]) => {
    if (!incomingList || incomingList.length === 0) return;
    setSessionsMap((prev) => {
      const next = { ...prev };
      incomingList.forEach((data) => {
        if (!data || data?.examId !== exam?.id || !data?.nisn) return;
        const nKey = normalizeNisnKey(data.nisn);
        if (!nKey) return;
        next[nKey] = mergeSessionRecord(next[nKey], data);
      });
      return next;
    });
  };

  const loadFallbackSessions = async (alsoRefreshGrades = false) => {
    if (!exam?.id) return;
    setIsRefreshing(true);
    try {
      const collected: any[] = [];

      // 1. Read from Supabase app_collections (filtered by examId to avoid scanning all historical exams)
      try {
        const snap = await dbGetDocs(
          query(collection(db, "exam_sessions"), where("examId", "==", exam.id))
        );
        snap.forEach((d: any) => {
          const data = typeof d.data === "function" ? d.data() : d;
          if (data?.examId === exam.id && data?.nisn) {
            collected.push(data);
          }
        });
      } catch (sbErr) {
        console.warn("Supabase exam_sessions poll warning:", sbErr);
      }

      // 2. Only also query Firestore directly if onSnapshot isn't already streaming live or Supabase returned nothing
      if (!isFirebaseQuotaExhausted() && collected.length === 0) {
        try {
          const fsSnap = await fsGetDocs(
            query(collection(db, "exam_sessions"), where("examId", "==", exam.id))
          );
          fsSnap.forEach((d) => {
            const data = d.data();
            if (data?.nisn) {
              collected.push(data);
            }
          });
        } catch (fsErr: any) {
          const msg = String(fsErr?.message || fsErr || "").toLowerCase();
          if (msg.includes("quota") || msg.includes("resource-exhausted")) {
            setFirebaseQuotaExhausted(true);
          }
        }
      }

      mergeIntoSessionsMap(collected);
      if (alsoRefreshGrades && onRefreshGrades) {
        onRefreshGrades();
      }
    } catch (err) {
      console.warn("Gagal memuat sesi proctoring fallback:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !exam?.id) return;

    setSessionsMap({});
    loadFallbackSessions(true);

    let unsubscribe: (() => void) | undefined;
    let isSnapshotHealthy = false;
    if (!isFirebaseQuotaExhausted()) {
      try {
        const q = query(collection(db, "exam_sessions"), where("examId", "==", exam.id));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            isSnapshotHealthy = true;
            const updated: any[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data?.nisn) {
                updated.push(data);
              }
            });
            mergeIntoSessionsMap(updated);
          },
          (err) => {
            isSnapshotHealthy = false;
            const msg = err?.message?.toLowerCase() || String(err).toLowerCase();
            if (msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("unavailable") || msg.includes("permission")) {
              setFirebaseQuotaExhausted(true);
            }
            console.warn("Realtime listener exam_sessions dialihkan ke polling:", err);
          }
        );
      } catch (err) {
        console.warn("onSnapshot exam_sessions fallback:", err);
      }
    }

    // Only poll periodically when tab is visible AND Firestore realtime listener is inactive/exhausted
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!isSnapshotHealthy || isFirebaseQuotaExhausted()) {
        loadFallbackSessions(false);
      }
    }, 30000);
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollInterval);
    };
  }, [isOpen, exam?.id]);

  // Self-heal: if Live Proctoring detects a completed exam_session with score that isn't yet in finalGradesList, backfill it
  useEffect(() => {
    if (!isOpen || !exam?.id) return;
    const sessions = Object.values(sessionsMap);
    if (sessions.length === 0) return;

    let didBackfill = false;
    sessions.forEach((sess: any) => {
      if (!isSessionCompleted(sess)) return;
      const sessScore = sess.score ?? sess.nilai;
      if (!hasNumericScoreVal(sessScore)) return;

      const existingFg = finalGradesList.find(
        (g) =>
          (isSameNisn(g.nisn, sess.nisn) || isSameNisn(g.nis, sess.nisn)) &&
          (g.examId === exam.id || g.assignmentId === exam.id || g.id === `${exam.id}_${sess.nisn}`)
      );
      const fgHasScore = Boolean(existingFg && hasNumericScoreVal(existingFg.nilai ?? existingFg.score));
      if (!fgHasScore) {
        didBackfill = true;
        saveFinalGrade({
          id: `${exam.id}_${sess.nisn}`,
          examId: exam.id,
          assignmentId: exam.id,
          examTitle: sess.examTitle || exam.title || "",
          title: sess.examTitle || exam.title || "",
          nisn: String(sess.nisn),
          studentName: sess.studentName || "",
          kelas: sess.kelas || "",
          nilai: Number(sessScore),
          score: Number(sessScore),
          violationCount: Number(sess.violationCount || 0) || 0,
          submittedAt: sess.finishedAt || sess.lastActiveAt || new Date().toISOString(),
          gradedAt: sess.finishedAt || sess.lastActiveAt || new Date().toISOString(),
          status: "selesai",
          type: "exam",
        }).catch(() => {});
      }
    });

    if (didBackfill && onRefreshGrades) {
      const timer = setTimeout(() => onRefreshGrades(), 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, exam?.id, sessionsMap, finalGradesList]);

  const totalQuestions = exam?.questions?.length || 0;

  const proctoringRows = useMemo(() => {
    if (!exam) return [];
    const targetStudents = studentsList.filter((stu) => {
      if (!isExamForClass(exam, stu.kelas)) return false;
      if (selectedClass !== "SEMUA_KELAS" && !isClassMatch(stu.kelas, selectedClass)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (stu.displayName || stu.studentName || "").toLowerCase().includes(q);
        const nisnMatch = String(stu.nisn || "").includes(q);
        if (!nameMatch && !nisnMatch) return false;
      }
      return true;
    });

    return targetStudents.map((stu) => {
      const session =
        sessionsMap[normalizeNisnKey(stu.nisn)] ||
        sessionsMap[String(stu.nisn || "").trim()];
      const fg = finalGradesList.find(
        (g) =>
          (isSameNisn(g.nisn, stu.nisn) || isSameNisn(g.nis, stu.nisn)) &&
          (g.examId === exam.id || g.assignmentId === exam.id || g.id === `${exam.id}_${stu.nisn}`)
      );

      const isResetSession =
        session?.status === "reset" &&
        (!session?.startedAt || toTimeMs(session.startedAt) <= toTimeMs(session.resetAt));
      const fgHasAnswers = Boolean(
        fg?.answers && typeof fg.answers === "object" && fg.answers.items && Object.keys(fg.answers.items).length > 0
      );
      const fgIsStubOnly = Boolean(
        fg &&
          ((fg.status === "melanggar" && fg.status !== "selesai" && !fg.submittedAt && !fg.gradedAt && !fgHasAnswers) ||
            (Number(fg.violationCount || 0) > 0 && !fgHasAnswers && !fg.isRemedial && !fg.gradedAt && fg.status !== "selesai" && Number(fg.nilai ?? fg.score ?? 0) === 0))
      );

      const fgScore = fg?.nilai ?? fg?.score;
      const fgHasScore = Boolean(fg && !fgIsStubOnly && hasNumericScoreVal(fgScore));
      const fgLooksFinished = Boolean(
        fgHasScore &&
          (fg.status === "selesai" ||
            Boolean(fg.submittedAt || fg.gradedAt) ||
            fg.status !== "melanggar") &&
          (!isResetSession || toTimeMs(fg.submittedAt || fg.gradedAt || fg.updatedAt) > toTimeMs(session?.resetAt))
      );
      const isFinished =
        (!isResetSession && (session?.status === "selesai" || Boolean(session?.finishedAt))) ||
        fgLooksFinished;

      const violationCount = isResetSession
        ? 0
        : Math.max(
            Number(session?.violationCount || 0),
            Number(fg?.violationCount || fg?.violationsCount || 0)
          );
      const answeredCount = isResetSession
        ? 0
        : Number(session?.answeredCount ?? (isFinished ? totalQuestions : 0));
      const currentQuestion = isResetSession ? 1 : Number(session?.currentQuestion || 1);

      let statusCategory: "mengerjakan" | "melanggar" | "selesai" | "belum" = "belum";
      if (isFinished) statusCategory = "selesai";
      else if (isResetSession) statusCategory = "belum";
      else if (violationCount > 0 || session?.status === "melanggar") statusCategory = "melanggar";
      else if (session) statusCategory = "mengerjakan";

      const resolvedScore = fgHasScore
        ? fgScore
        : !isResetSession && hasNumericScoreVal(session?.score ?? session?.nilai)
        ? (session?.score ?? session?.nilai)
        : undefined;

      const explicitDur = Number(session?.durationUsedSeconds ?? fg?.durationUsedSeconds);
      let durationSeconds: number | null =
        !isResetSession && Number.isFinite(explicitDur) && explicitDur > 0 ? Math.round(explicitDur) : null;
      if (durationSeconds === null && isFinished) {
        const startMs = toTimeMs(session?.startedAt || fg?.startedAt);
        const endMs = toTimeMs(session?.finishedAt || fg?.submittedAt || fg?.gradedAt || session?.lastActiveAt);
        if (startMs > 0 && endMs > startMs) {
          durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));
        }
      }

      return {
        student: stu,
        session,
        fg,
        statusCategory,
        violationCount,
        answeredCount: Math.min(totalQuestions, answeredCount),
        currentQuestion,
        score: resolvedScore,
        durationSeconds,
        lastActiveAt: session?.finishedAt || session?.lastActiveAt || fg?.updatedAt || fg?.submittedAt,
        lastViolationReason: session?.lastViolationReason || (violationCount > 0 ? "Terdeteksi keluar tab / layar penuh" : ""),
      };
    });
  }, [exam, studentsList, sessionsMap, finalGradesList, selectedClass, searchQuery, totalQuestions]);

  const counts = useMemo(() => {
    return {
      total: proctoringRows.length,
      mengerjakan: proctoringRows.filter((r) => r.statusCategory === "mengerjakan").length,
      melanggar: proctoringRows.filter((r) => r.violationCount > 0 && r.statusCategory !== "selesai").length,
      selesai: proctoringRows.filter((r) => r.statusCategory === "selesai").length,
      belum: proctoringRows.filter((r) => r.statusCategory === "belum").length,
    };
  }, [proctoringRows]);

  const displayedRows = useMemo(() => {
    return proctoringRows
      .filter((r) => {
        if (statusFilter === "semua") return true;
        if (statusFilter === "melanggar") return r.violationCount > 0;
        return r.statusCategory === statusFilter;
      })
      .sort((a, b) => {
        const order: Record<string, number> = { melanggar: 0, mengerjakan: 1, selesai: 2, belum: 3 };
        return order[a.statusCategory] - order[b.statusCategory];
      });
  }, [proctoringRows, statusFilter]);

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
      <div className="bg-slate-900 text-white px-6 sm:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          {asPage && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0"
              title="Kembali ke Ujian Siswa"
            >
              <ArrowLeft className="w-4 h-4 text-[#85cc00]" />
              <span>Kembali</span>
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-[#85cc00] text-slate-950 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-white tracking-tight">
              Pemantauan Peserta Ujian Langsung (Live Proctoring)
            </h3>
            <p className="text-xs font-semibold text-slate-300">
              {exam.title} • Token: <span className="text-[#85cc00] font-mono font-bold">{exam.token}</span> • {totalQuestions} Soal
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
              className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none cursor-pointer max-w-[220px]"
            >
              {examsList.map((ex) => (
                <option key={`proc-ex-${ex.id}`} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => loadFallbackSessions(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#85cc00]" : ""}`} />
            <span>Segarkan</span>
          </button>
          {!asPage && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 sm:px-8 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "mengerjakan" ? "semua" : "mengerjakan")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "mengerjakan" ? "bg-blue-50 border-blue-400" : "bg-white border-slate-200"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                  Sedang Mengerjakan
                </span>
                <p className="text-xl font-display font-black text-slate-900 mt-0.5">{counts.mengerjakan}</p>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "melanggar" ? "semua" : "melanggar")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "melanggar" ? "bg-rose-50 border-rose-400" : "bg-white border-slate-200"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">
                  Keluar Tab / Pelanggaran
                </span>
                <p className="text-xl font-display font-black text-rose-700 mt-0.5">{counts.melanggar}</p>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "selesai" ? "semua" : "selesai")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "selesai" ? "bg-emerald-50 border-emerald-400" : "bg-white border-slate-200"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
                  Selesai Ujian
                </span>
                <p className="text-xl font-display font-black text-emerald-700 mt-0.5">{counts.selesai}</p>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "belum" ? "semua" : "belum")}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  statusFilter === "belum" ? "bg-slate-100 border-slate-400" : "bg-white border-slate-200"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Belum Mulai
                </span>
                <p className="text-xl font-display font-black text-slate-700 mt-0.5">{counts.belum}</p>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="px-6 sm:px-8 py-3.5 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa atau NIS..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-900 text-xs font-semibold outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="SEMUA_KELAS">Semua Kelas Sasaran</option>
                  {classesList.map((c, idx) => (
                    <option key={`proc-cls-${c.id || idx}`} value={c.name}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
                {statusFilter !== "semua" && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("semua")}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Tampilkan Semua
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Peserta</th>
                    <th className="py-3.5 px-4 text-center">Kelas</th>
                    <th className="py-3.5 px-4">Status Pengerjaan</th>
                    <th className="py-3.5 px-4">Progres Soal</th>
                    <th className="py-3.5 px-4 text-center">Keluar Tab</th>
                    <th className="py-3.5 px-6 text-right">Aktivitas / Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-semibold">
                        Tidak ada data peserta yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row) => {
                      const pct =
                        totalQuestions > 0 ? Math.round((row.answeredCount / totalQuestions) * 100) : 0;
                      return (
                        <tr key={`proc-${row.student.nisn}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6">
                            <p className="text-xs font-bold text-slate-900">
                              {row.student.displayName || row.student.studentName}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">NIS: {row.student.nisn}</p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                              {row.student.kelas || "-"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {row.statusCategory === "selesai" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Selesai
                              </span>
                            ) : row.statusCategory === "melanggar" ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Terdeteksi Keluar Tab
                                </span>
                                <p className="text-[10px] text-rose-600 font-medium">{row.lastViolationReason}</p>
                              </div>
                            ) : row.statusCategory === "mengerjakan" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-black">
                                <Clock className="w-3.5 h-3.5" />
                                Mengerjakan (Soal #{row.currentQuestion})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                Belum Mulai
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 w-44">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                                <span>
                                  {row.answeredCount} / {totalQuestions}
                                </span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    row.statusCategory === "selesai" ? "bg-emerald-500" : "bg-blue-600"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {row.violationCount > 0 ? (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-mono font-black text-xs">
                                {row.violationCount}x
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {row.statusCategory === "selesai" && row.score !== undefined ? (
                              <div className="space-y-0.5">
                                <span className="text-sm font-display font-black text-emerald-700 block">
                                  Nilai: {row.score}
                                </span>
                                <p className="text-[11px] font-bold text-slate-600">
                                  Durasi: {formatSolveDuration(row.durationSeconds)}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatRelativeTime(row.lastActiveAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {formatRelativeTime(row.lastActiveAt)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
