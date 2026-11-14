import { SimulasiBKSettings } from "../components/teacher/SimulasiBKSettings";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../AuthContext";
import { db } from "../lib/firebase";
import { getDriveImageUrl, getDrivePdfEmbedUrl } from "../lib/driveUtils";
import { KOP_SURAT_BASE64 } from "../kopSuratBase64";
import {
  doc,
  addDoc,
  collection,
  getDocs as firestoreGetDocs,
  updateDoc,
  writeBatch,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { dbGetDocs as getDocs, dbGetDoc as getDoc, dbSetDoc as setDoc, dbDeleteDoc as deleteDoc, isFirebaseQuotaExhausted } from "../lib/supabaseSync";
import { OperationType, handleFirestoreError, getLocalCache, setLocalCache, clearTeacherCaches } from "../lib/firestoreUtils";
import { googleSignIn } from "../lib/googleAuth";
import { fetchWithRetry } from "../lib/fetchWithRetry";
import {
  Home,
  Users,
  UserPlus,
  FilePlus,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  BookOpen,
  LogOut, Power,
  Menu,
  X,
  FileText,
  School,
  Edit,
  Pencil,
  Trash2,
  LayoutDashboard,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Clock,
  Calendar,
  SearchX,
  Trophy,
  GraduationCap,
  Database,
  ShieldCheck,
  Zap,
  CheckCircle2,
  HardDrive,
  Download,
  RefreshCw,
  Plus,
  Target,
  ZapOff,
  User,
  Fingerprint,
  Timer,
  Sparkles,
  Star,
  Award,
  ArrowRight,
  Wifi,
  Activity,
  Settings,
  List,
  KeyRound,
  Bell,
  MessageSquare,
  MessageCircle,
  Send,
  Share2,
  Search,
  ChevronDown,
  Filter,
  ExternalLink,
  AlertOctagon,
  Copy,
  Check,
  Edit3,
  Save,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Monitor,
  Upload,
  Eye,
  EyeOff,
  Gamepad2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";

const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
  </svg>
);
import { SimulasiChapterMenu } from "../components/simulation/SimulasiChapterMenu";
import { useNavigate } from "react-router-dom";
import { ResetDashboardModal } from "../components/ResetDashboardModal";
import { StorageManagerModal } from "../components/StorageManagerModal";
import { NotificationModal } from "../components/NotificationModal";
import { ZoomPhotoModal } from "../components/teacher/ZoomPhotoModal";
import { WhatsAppShareModal } from "../components/teacher/WhatsAppShareModal";
import { StudentProfileModal } from "../components/teacher/StudentProfileModal";
import { LogoutModal } from "../components/teacher/LogoutModal";
import { AuditSubmissionModal } from "../components/teacher/AuditSubmissionModal";
import { EditStudentModal } from "../components/teacher/EditStudentModal";
import { PublishExamToClassModal } from "../components/teacher/PublishExamToClassModal";
import { DownloadExamReportModal } from "../components/teacher/DownloadExamReportModal";
import { ResetStudentExamModal } from "../components/teacher/ResetStudentExamModal";
import { ShareCbtExamModal } from "../components/teacher/ShareCbtExamModal";
import { SupabaseSyncModal } from "../components/teacher/SupabaseSyncModal";
import { AddManualColumnModal } from "../components/teacher/AddManualColumnModal";
import { DeleteColumnModal } from "../components/teacher/DeleteColumnModal";
import { EditColumnModal, ColumnEditData } from "../components/teacher/EditColumnModal";
import { AssignmentPreviewModal } from "../components/teacher/AssignmentPreviewModal";
import { BulkImportQuestionsModal, ImportedExamQuestion } from "../components/teacher/BulkImportQuestionsModal";
import { ExamItemAnalysisModal } from "../components/teacher/ExamItemAnalysisModal";
import { LiveProctoringModal } from "../components/teacher/LiveProctoringModal";
import { generateStudentRaporPdf, buildParentWaReportText } from "../lib/studentReportPdf";
import { getFinalGrades, saveFinalGrade, subscribeToFinalGrades, dbSetDoc, dbDeleteDoc } from "../lib/supabaseSync";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { isAssignmentForClass, isExamForClass, isClassMatch, normalizeClassName, isPTSItem, isPASItem, isSameNisn } from "../lib/gradeUtils";

const trackUsage = (reads = 0, writes = 0) => {
  try {
    const stats = JSON.parse(
      sessionStorage.getItem("firas_usage_stats") || '{"reads":0,"writes":0}',
    );
    stats.reads += reads;
    stats.writes += writes;
    sessionStorage.setItem("firas_usage_stats", JSON.stringify(stats));
    try {
      const event = document.createEvent('Event');
      event.initEvent('usage-updated', true, true);
      window.dispatchEvent(event);
    } catch (e) {
      console.warn("Failed to dispatch usage-updated event", e);
    }
  } catch (e) {
    console.warn("Kesalahan statistik penggunaan:", e);
  }
};

export function getStudentAbsensiCounts(s: any, absList: any[], targetClass?: string) {
  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let dispen = 0;

  const relevantAbs = (absList || []).filter(a => !targetClass || a.kelasRef === targetClass || a.kelas === targetClass);

  relevantAbs.forEach(a => {
    let statusVal: string | null = null;
    if (a.data && (a.data[s.nisn] !== undefined || (s.id && a.data[s.id] !== undefined))) {
      statusVal = String(a.data[s.nisn] ?? a.data[s.id]);
    } else if (a.nisn === s.nisn || (s.id && a.studentId === s.id)) {
      statusVal = String(a.status || '');
    }

    if (statusVal) {
      const st = statusVal.trim().toLowerCase();
      if (st === 'hadir' || st === 'h') hadir++;
      else if (st === 'sakit' || st === 's') sakit++;
      else if (st === 'izin' || st === 'i') izin++;
      else if (st === 'alpa' || st === 'a') alpa++;
      else if (st === 'dispen' || st === 'd') dispen++;
    }
  });

  const total = hadir + sakit + izin + alpa + dispen;
  const persentase = total > 0 ? Math.round(((hadir + dispen) / total) * 100) : 0;

  return { hadir, sakit, izin, alpa, dispen, total, persentase };
}

const INFORMATIKA_X_CHAPTERS = [
  "Bab 1: Informatika dan Keterampilan Generik",
  "Bab 2: Berpikir Komputasional (BK)",
  "Bab 3: Teknologi Informasi dan Komunikasi (TIK)",
  "Bab 4: Sistem Komputer (SK)",
  "Bab 5: Jaringan Komputer dan Internet (JKI)",
  "Bab 6: Analisis Data (AD)",
  "Bab 7: Algoritma dan Pemrograman (AP)",
  "Bab 8: Dampak Sosial Informatika (DSI)",
  "Bab 9: Praktik Lintas Bidang (PLB)"
];

const getAssignmentStatus = (asg: any) => {
  if (asg.isCompleted) return "Selesai";
  const now = new Date();
  const deadlines = asg.targets?.map((t: any) => new Date(t.deadline)) || [];
  if (deadlines.length === 0) return "Aktif";
  const allExpired = deadlines.every((d: Date) => d <= now);
  return allExpired ? "Kedaluwarsa" : "Aktif";
};

export default function DashboardTeacher() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verify authentication synchronously on mount
  const isTeacherAuth = sessionStorage.getItem("is_teacher_auth") === "true" || localStorage.getItem("is_teacher_auth") === "true";

  useEffect(() => {
    if (!isTeacherAuth) {
      navigate("/", { replace: true });
    }
  }, [isTeacherAuth, navigate]);

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [direction, setDirection] = useState(0);

  // States and Handlers for Teacher Profile Photo & Sync
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);
  const [isUploadingTeacherPhoto, setIsUploadingTeacherPhoto] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [inlineGrades, setInlineGrades] = useState<{ [subId: string]: string }>({});
  const [inlineFeedback, setInlineFeedback] = useState<{ [subId: string]: string }>({});
  const [isInlineSaving, setIsInlineSaving] = useState<string | null>(null);

  // States and Handlers for Motivational Quote
  const [motivationalQuoteInput, setMotivationalQuoteInput] = useState("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [quoteSaveSuccess, setQuoteSaveSuccess] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const docRef = doc(db, "config", "motivational_quote");
    getDoc(docRef).then((snap: any) => {
      if (snap && snap.exists() && snap.data()?.quote) {
        setMotivationalQuoteInput(snap.data().quote);
      } else {
        setMotivationalQuoteInput("Sukses adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.");
      }
    }).catch(() => {
      setMotivationalQuoteInput("Sukses adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.");
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [aiStats, setAiStats] = useState<{ totalQuestions: number; avgDurationMs: number; violations: any[] }>({
    totalQuestions: 0,
    avgDurationMs: 0,
    violations: [],
  });
  const [isRefreshingAiStats, setIsRefreshingAiStats] = useState(false);
  const [aiStatsFeedback, setAiStatsFeedback] = useState<string | null>(null);

  const fetchAiStats = async (isManual = false) => {
    setIsRefreshingAiStats(true);
    if (isManual) {
      setAiStatsFeedback(null);
    }
    try {
      const logMap = new Map<string, any>();
      const violMap = new Map<string, any>();

      const [fsLogsResult, fsViolResult, apiResult] = await Promise.allSettled([
        firestoreGetDocs(collection(db, "aiChatLogs")),
        firestoreGetDocs(collection(db, "aiViolations")),
        fetch(`${window.location.origin}/api/ai-stats?t=${Date.now()}`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      if (fsLogsResult.status === "fulfilled" && fsLogsResult.value) {
        fsLogsResult.value.docs.forEach((d: any) => {
          const data = d.data();
          const key = data?.id || `${data?.timestamp || ""}_${data?.studentName || ""}_${data?.questionText || ""}` || d.id;
          logMap.set(key, { id: d.id, ...data });
        });
      }

      if (fsViolResult.status === "fulfilled" && fsViolResult.value) {
        fsViolResult.value.docs.forEach((d: any) => {
          const data = d.data();
          const key = d.id;
          violMap.set(key, { id: d.id, ...data });
        });
      }

      let serverTotalQuestions = 0;
      let serverAvgDurationMs = 0;

      if (apiResult.status === "fulfilled" && apiResult.value) {
        const apiData = apiResult.value;
        serverTotalQuestions = Number(apiData.totalQuestions) || 0;
        serverAvgDurationMs = Number(apiData.avgDurationMs) || 0;
        if (Array.isArray(apiData.violations)) {
          apiData.violations.forEach((v: any) => {
            const existing = Array.from(violMap.values()).find(
              (ev) =>
                ev.id === v.id ||
                (ev.timestamp === v.timestamp &&
                  ev.studentName === v.studentName &&
                  ev.questionText === v.questionText)
            );
            if (!existing) {
              const mapKey = v.id || `${v.timestamp || ""}_${v.studentName || ""}_${v.questionText || ""}`;
              violMap.set(mapKey, v);
            }
          });
        }
      }

      const firestoreLogs = Array.from(logMap.values());
      const totalQuestions = Math.max(firestoreLogs.length, serverTotalQuestions);

      let avgDurationMs = serverAvgDurationMs;
      if (firestoreLogs.length > 0) {
        let totalDur = 0;
        let durCount = 0;
        firestoreLogs.forEach((l) => {
          if (typeof l.durationMs === "number" && l.durationMs > 0) {
            totalDur += l.durationMs;
            durCount++;
          }
        });
        if (durCount > 0) {
          avgDurationMs = Math.round(totalDur / durCount);
        }
      }

      const violations = Array.from(violMap.values()).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      setAiStats({
        totalQuestions,
        avgDurationMs,
        violations,
      });

      if (isManual) {
        const timeStr = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setAiStatsFeedback(`Statistik berhasil diperbarui (${timeStr})`);
        setTimeout(() => {
          setAiStatsFeedback((prev) => (prev?.includes(timeStr) ? null : prev));
        }, 4000);
      }
    } catch (e) {
      console.warn("Failed to fetch AI stats:", e);
      if (isManual) {
        setAiStatsFeedback("Gagal memuat pembaruan statistik. Coba lagi.");
      }
    } finally {
      setIsRefreshingAiStats(false);
    }
  };

  useEffect(() => {
    void fetchAiStats(false);
  }, []);

  useEffect(() => {
    if (activeMenu === "statistik-ai") {
      void fetchAiStats(false);
    }
  }, [activeMenu]);

  const handleSaveMotivationalQuote = async () => {
    if (!motivationalQuoteInput.trim()) return;
    setIsSavingQuote(true);
    try {
      await setDoc(doc(db, "config", "motivational_quote"), {
        quote: motivationalQuoteInput.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || "Pak Agan"
      });
      setQuoteSaveSuccess(true);
      setTimeout(() => setQuoteSaveSuccess(false), 3000);
    } catch (err) {
      console.warn("Gagal menyimpan quote motivasi:", err);
    } finally {
      setIsSavingQuote(false);
    }
  };

  const saveTeacherPhotoLocally = (uid: string, photoData: string | null) => {
    try {
      if (photoData) {
        try {
          localStorage.setItem(`teacher_photo_${uid}`, photoData);
        } catch {
          clearTeacherCaches();
          localStorage.setItem(`teacher_photo_${uid}`, photoData);
        }
        if (uid !== "default_teacher") {
          try {
            localStorage.setItem("teacher_photo_default_teacher", photoData);
          } catch {
            // Abaikan kunci sekunder jika penyimpanan lokal terbatas
          }
        }
      } else {
        localStorage.removeItem(`teacher_photo_${uid}`);
        localStorage.removeItem("teacher_photo_default_teacher");
      }
    } catch (e) {
      console.warn("Penyimpanan foto di localStorage dilewati:", e);
    }
  };

  const handleInlineSaveGrade = async (sub: any, newNilai: string, newFeedback: string) => {
    if (!newNilai.trim()) return;
    const subId = sub.id || sub.nisn;
    setIsInlineSaving(subId);
    try {
      const gradeVal = parseInt(newNilai, 10) || 0;
      const assignmentId = sub.assignmentId || sub.assignment_id || sub.taskId || sub.id || "general_task";
      const nisn = sub.nisn || "";
      const fgId = `${assignmentId}_${nisn}`;
      const now = new Date().toISOString();

      const asgObj = assignmentsList.find(a => a.id === assignmentId);
      const examObj = examsList.find(e => e.id === assignmentId);
      const colTitle = asgObj?.materi || asgObj?.title || examObj?.title || sub.materi || "Tugas";
      const colBab = asgObj?.bab || examObj?.bab || "Informatika";

      const fgData = {
        id: fgId,
        assignmentId: assignmentId,
        examId: assignmentId,
        nisn: nisn,
        studentName: sub.studentName || "",
        kelas: sub.kelas || "",
        nilai: gradeVal,
        score: gradeVal,
        title: colTitle,
        bab: colBab,
        type: examObj ? "CBT" : (asgObj?.type || "Tugas"),
        catatan: newFeedback || "Dinilai langsung dari audit pengumpulan",
        gradedAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, "final_grades", fgId), fgData, { merge: true });
      try {
        saveFinalGrade(fgData);
      } catch (_) {}

      if (sub.id) {
        const subRef = doc(db, "submissions", sub.id);
        await updateDoc(subRef, {
          status: "sudah dinilai",
          nilai: gradeVal,
          fileUrl: null,
          feedback: newFeedback || "Dinilai langsung dari audit pengumpulan",
          gradedAt: now,
          updatedAt: now
        });
      }

      setFinalGradesList((prev: any[]) => {
        const idx = prev.findIndex(g => g.id === fgId || (g.assignmentId === assignmentId && g.nisn === nisn));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...fgData };
          return updated;
        }
        return [...prev, fgData];
      });

      setSubmissionsList((prev: any[]) => prev.map((s: any) => (s.id === sub.id || (s.nisn === sub.nisn && (s.assignmentId === assignmentId || s.id === sub.id))) ? { ...s, nilai: gradeVal, status: "sudah dinilai", feedback: newFeedback } : s));

      setInlineGrades(prev => ({ ...prev, [subId]: "" }));
      setInlineFeedback(prev => ({ ...prev, [subId]: "" }));
      setExpandedSubmissionId(null);
      trackUsage(0, 2);
    } catch (err) {
      console.warn("Gagal menyimpan nilai inline:", err);
    } finally {
      setIsInlineSaving(null);
    }
  };

  useEffect(() => {
    const uid = user?.uid || "default_teacher";
    try {
      const localPhoto =
        localStorage.getItem(`teacher_photo_${uid}`) ||
        localStorage.getItem("teacher_photo_default_teacher");
      if (localPhoto) {
        setTeacherPhotoUrl(localPhoto);
      }
    } catch (_) {}

    const fetchProfile = async () => {
      let resolvedPhoto: string | null = null;
      let loadedSettings: any = null;
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.profilePhotoUrl) {
            resolvedPhoto = data.profilePhotoUrl;
            setTeacherPhotoUrl(data.profilePhotoUrl);
            saveTeacherPhotoLocally(uid, data.profilePhotoUrl);
          }
          if (data.userSettings) {
            loadedSettings = data.userSettings;
          }
        }
      } catch (e) {
        console.warn("Gagal memuat profil dari cloud:", e instanceof Error ? e.message : e);
      }

      if (!loadedSettings && uid !== "default_teacher") {
        try {
          const fallbackUserDoc = await getDoc(doc(db, "users", "default_teacher"));
          if (fallbackUserDoc.exists()) {
            const fbData = fallbackUserDoc.data();
            if (!resolvedPhoto && fbData?.profilePhotoUrl) {
              resolvedPhoto = fbData.profilePhotoUrl;
              setTeacherPhotoUrl(fbData.profilePhotoUrl);
              saveTeacherPhotoLocally(uid, fbData.profilePhotoUrl);
            }
            if (fbData?.userSettings) {
              loadedSettings = fbData.userSettings;
            }
          }
        } catch (_) {}
      }

      if (loadedSettings) {
        setUserSettings((prev) => ({ ...prev, ...loadedSettings }));
        try {
          const serialized = JSON.stringify(loadedSettings);
          localStorage.setItem("sipinter_teacher_user_settings", serialized);
          localStorage.setItem("sipinter_teacher_settings_cache", serialized);
        } catch (_) {}
      }

      try {
        const teacherCfg = await getDoc(doc(db, "config", "teacher_profile"));
        const cfgData = teacherCfg.exists() ? teacherCfg.data() : null;
        if (cfgData) {
          if (!resolvedPhoto && cfgData.profilePhotoUrl) {
            setTeacherPhotoUrl(cfgData.profilePhotoUrl);
            saveTeacherPhotoLocally(uid, cfgData.profilePhotoUrl);
          }
          if (!loadedSettings && (cfgData.teacherName || cfgData.principalName || cfgData.teacherNip || cfgData.principalNip)) {
            const mergedFromCfg = {
              subjectName: cfgData.subjectName || "Informatika",
              teacherName: cfgData.teacherName || "Agan Parta, S.Kom.",
              teacherNip: cfgData.teacherNip || "198501012010011001",
              principalName: cfgData.principalName || "Dr. H. Contoh Kepala, M.Pd.",
              principalNip: cfgData.principalNip || "197001011995011001",
              academicYear: cfgData.academicYear || "2026/2027",
              semester: cfgData.semester || "Ganjil",
            };
            setUserSettings((prev) => ({ ...prev, ...mergedFromCfg }));
          }
        }

        // Sinkronkan otomatis ke config/teacher_profile apabila ada perbedaan field dengan Menu Pengguna
        if (loadedSettings) {
          const needsSync =
            !cfgData ||
            (loadedSettings.subjectName || "") !== (cfgData.subjectName || "") ||
            (loadedSettings.teacherName || "") !== (cfgData.teacherName || "") ||
            (loadedSettings.teacherNip || "") !== (cfgData.teacherNip || "") ||
            (loadedSettings.principalName || "") !== (cfgData.principalName || "") ||
            (loadedSettings.principalNip || "") !== (cfgData.principalNip || "") ||
            (loadedSettings.academicYear || "") !== (cfgData.academicYear || "") ||
            (loadedSettings.semester || "") !== (cfgData.semester || "");

          if (needsSync) {
            await setDoc(doc(db, "config", "teacher_profile"), {
              subjectName: loadedSettings.subjectName || "Informatika",
              teacherName: loadedSettings.teacherName || "Agan Parta, S.Kom.",
              teacherNip: loadedSettings.teacherNip || "-",
              principalName: loadedSettings.principalName || "Dr. H. Contoh Kepala, M.Pd.",
              principalNip: loadedSettings.principalNip || "-",
              academicYear: loadedSettings.academicYear || "2026/2027",
              semester: loadedSettings.semester || "Ganjil",
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});

            await setDoc(doc(db, "config", "academic_period"), {
              academicYear: loadedSettings.academicYear || "2026/2027",
              semester: loadedSettings.semester || "Ganjil",
              updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
          }
        }
      } catch (_) {}
    };
    fetchProfile();
  }, [user?.uid]);

  const compressImageToBase64 = (
    file: File,
    maxWidth = 360,
    maxHeight = 360,
    quality = 0.78
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width || maxWidth;
            let height = img.height || maxHeight;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context unavailable"));
              return;
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
            resolve(compressedBase64);
          } catch (canvasErr) {
            reject(canvasErr);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Peringatan", "Pilih file gambar yang valid (JPG, PNG, atau WebP).", "danger");
      inputEl.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert("Peringatan", "Ukuran foto terlalu besar. Maksimal ukuran file adalah 10MB.", "danger");
      inputEl.value = "";
      return;
    }

    setIsUploadingTeacherPhoto(true);
    try {
      // Kompres ke maks 360x360 JPEG (~20-45KB) agar aman untuk Firestore & localStorage
      const compressedBase64 = await compressImageToBase64(file, 360, 360, 0.78);

      const uid = user?.uid || "default_teacher";
      setTeacherPhotoUrl(compressedBase64);
      saveTeacherPhotoLocally(uid, compressedBase64);

      const teacherProfilePayload = {
        profilePhotoUrl: compressedBase64,
        subjectName: userSettings.subjectName || "Informatika",
        teacherName: userSettings.teacherName || "Agan Parta, S.Kom.",
        teacherNip: userSettings.teacherNip || "-",
        principalName: userSettings.principalName || "Dr. H. Contoh Kepala, M.Pd.",
        principalNip: userSettings.principalNip || "-",
        academicYear: userSettings.academicYear || "2026/2027",
        semester: userSettings.semester || "Ganjil",
        updatedAt: new Date().toISOString(),
      };

      const results = await Promise.allSettled([
        setDoc(
          doc(db, "users", uid),
          { profilePhotoUrl: compressedBase64 },
          { merge: true }
        ),
        setDoc(
          doc(db, "config", "teacher_profile"),
          teacherProfilePayload,
          { merge: true }
        ),
      ]);

      const anySuccess = results.some((r) => r.status === "fulfilled");
      if (anySuccess) {
        trackUsage(0, 1);
        showAlert(
          "Berhasil",
          "Foto profil guru berhasil diperbarui dan otomatis tersinkron ke Beranda Guru serta Pesan & Nilai Siswa.",
          "alert"
        );
      } else {
        console.warn("Gagal menyimpan foto ke cloud:", results);
        showAlert(
          "Info",
          "Foto profil guru diperbarui di perangkat ini secara lokal dan ditampilkan di Beranda.",
          "alert"
        );
      }
    } catch (err) {
      console.warn("Gagal memproses gambar:", err);
      showAlert("Gagal", "Gagal memproses gambar foto profil. Pastikan file gambar tidak rusak.", "danger");
    } finally {
      setIsUploadingTeacherPhoto(false);
      inputEl.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    showConfirm(
      "Hapus Foto Profil",
      "Apakah Anda yakin ingin menghapus foto profil saat ini?",
      async () => {
        const uid = user?.uid || "default_teacher";
        setTeacherPhotoUrl(null);
        saveTeacherPhotoLocally(uid, null);

        try {
          await Promise.allSettled([
            setDoc(
              doc(db, "users", uid),
              { profilePhotoUrl: null },
              { merge: true }
            ),
            setDoc(
              doc(db, "config", "teacher_profile"),
              { profilePhotoUrl: null, updatedAt: new Date().toISOString() },
              { merge: true }
            ),
          ]);
          trackUsage(0, 1);
          showAlert("Berhasil", "Foto profil Anda telah dihapus dan dikembalikan ke tampilan awal.", "alert");
        } catch (error) {
          console.warn("Gagal menghapus foto dari cloud:", error);
          showAlert("Berhasil", "Foto profil Anda telah dihapus.", "alert");
        }
        setShowProfileDropdown(false);
      },
      "Hapus"
    );
  };

  const handleMenuChange = (id: string, index: number) => {
    const currentIndex = menus.findIndex((m) => m.id === activeMenu);
    setDirection(index > currentIndex ? 1 : -1);
    setActiveMenu(id);

  };


  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "confirm" | "alert" | "danger";
    onConfirm?: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const showAlert = (
    title: string,
    message: string,
    type: "alert" | "danger" = "alert",
    confirmText?: string,
  ) => {
    setModalConfig({ isOpen: true, title, message, type, confirmText });
  };

  useEffect(() => {
    const handleQuotaExceeded = (e: any) => {
      console.warn("Firestore quota notice in teacher dashboard: data is served smoothly via Supabase.", e?.detail?.message);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded as EventListener);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded as EventListener);
    };
  }, []);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "Proses",
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm,
      confirmText,
    });
  };

  // Form states for adding student
  const [studentName, setStudentName] = useState("");
  const [studentNisn, setStudentNisn] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentAccessCode, setStudentAccessCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  const [classSaveMessage, setClassSaveMessage] = useState({ text: "", type: "" });

  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [studentProfileTab, setStudentProfileTab] = useState<"tugas" | "ujian">("tugas");
  const [copiedAccessCode, setCopiedAccessCode] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("SEMUA_KELAS");
  const [userSettings, setUserSettings] = useState(() => {
    const defaults = {
      subjectName: "Informatika",
      teacherName: "Agan Parta, S.Kom.",
      teacherNip: "198501012010011001",
      principalName: "Dr. H. Contoh Kepala, M.Pd.",
      principalNip: "197001011995011001",
      academicYear: "2026/2027",
      semester: "Ganjil",
    };
    try {
      const raw = localStorage.getItem("sipinter_teacher_user_settings");
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch (_) {}
    return defaults;
  });
  const [isEditingUserSettings, setIsEditingUserSettings] = useState(false);

  const getAlertClasses = (type: string) => {
    switch (type) {
      case "error":
        return "bg-rose-50 text-rose-700 border border-rose-200 shadow-md shadow-rose-100/50";
      case "warning":
        return "bg-amber-50 text-amber-800 border border-amber-200 shadow-md shadow-amber-100/50";
      case "info":
        return "bg-slate-100 text-slate-900 border border-slate-300/80/80 shadow-md shadow-indigo-100/50";
      case "success":
      default:
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-md shadow-emerald-100/50";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />;
      case "info":
        return <Info className="w-5 h-5 shrink-0 mt-0.5" />;
      case "success":
      default:
        return <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />;
    }
  };

  const [teacherNisn, setTeacherNisn] = useState("");

  // Announcement state
  const [announcementContent, setAnnouncementContent] = useState("");
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  const handleSaveAnnouncement = async () => {
    if (!announcementContent.trim()) return;
    setIsSavingAnnouncement(true);
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "announcements", id), {
        id,
        content: announcementContent.trim(),
        createdAt: new Date().toISOString(),
        author: "Guru",
      });
      setAnnouncementContent("");
      showAlert("Berhasil", "Pengumuman berhasil disiarkan.", "alert");
    } catch (e: any) {
      console.warn("Gagal membuat pengumuman:", e);
      showAlert("Gagal", "Gagal menyimpan pengumuman.", "danger");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [dbTeacherPassword, setDbTeacherPassword] = useState<string | null>(() => {
    return localStorage.getItem("teacher_password") || null;
  });

  useEffect(() => {
    if (dbTeacherPassword) return;
    getDoc(doc(db, "config", "teacher_auth")).then((docSnap) => {
      if (docSnap.exists() && docSnap.data()?.password) {
        const pass = docSnap.data().password;
        setDbTeacherPassword(pass);
        localStorage.setItem("teacher_password", pass);
      }
    }).catch((error) => {
      console.warn("Gagal memuat password guru dari Firestore:", error);
    });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ text: "Konfirmasi password baru tidak cocok.", type: "error" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const storedPass = dbTeacherPassword || localStorage.getItem("teacher_password");
      const defaultPasses = ["admin", "guru", "pinter", "123456"];
      
      const isCurrentValid = storedPass 
        ? currentPassword === storedPass 
        : defaultPasses.includes(currentPassword);

      if (!isCurrentValid) {
        setPasswordMessage({ text: "Password lama tidak sesuai.", type: "error" });
        setIsChangingPassword(false);
        return;
      }

      // Save directly to Firebase Database!
      await setDoc(doc(db, "config", "teacher_auth"), {
        password: newPassword,
        updatedAt: new Date().toISOString(),
        updatedBy: "Guru"
      }, { merge: true });

      localStorage.setItem("teacher_password", newPassword);
      
      setPasswordMessage({ text: "Password berhasil diperbarui dan disimpan di Firebase Database.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.warn("Gagal menyimpan password ke Firebase:", error);
      handleFirestoreError(error, OperationType.WRITE, "config/teacher_auth");
      setPasswordMessage({ text: "Gagal memperbarui password ke database.", type: "error" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Chapter Management state
  // Google Drive integration for teacher
  const [teacherDriveConnected, setTeacherDriveConnected] = useState(false);
  const [teacherDriveEmail, setTeacherDriveEmail] = useState("");
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isDriveTokenExpired, setIsDriveTokenExpired] = useState(false);

  const checkDriveTokenValidity = async (token: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        setIsDriveTokenExpired(true);
      } else {
        setIsDriveTokenExpired(false);
      }
    } catch (e) {
      console.warn("Error checking Drive token validity:", e);
    }
  };

  useEffect(() => {
    const loadGoogleAuth = async () => {
      try {
        const snapshot = await getDoc(doc(db, "users", "googleAuth"));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTeacherDriveConnected(!!data.accessToken);
          setTeacherDriveEmail(data.teacherEmail || "");
          if (data.accessToken) {
            checkDriveTokenValidity(data.accessToken);
          } else {
            setIsDriveTokenExpired(false);
          }
        } else {
          setTeacherDriveConnected(false);
          setTeacherDriveEmail("");
          setIsDriveTokenExpired(false);
        }
      } catch (error: any) {
        console.warn("Firestore googleAuth error:", error.message);
      }
    };
    loadGoogleAuth();
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const result = await googleSignIn();
      if (result) {
        await setDoc(doc(db, "users", "googleAuth"), {
          accessToken: result.accessToken,
          teacherEmail: result.user.email || "agan121@guru.sma.belajar.id",
          updatedAt: new Date().toISOString(),
        });
        showAlert("Berhasil", "Google Drive Guru berhasil dihubungkan!", "alert");
      }
    } catch (e: any) {
      console.warn("Gagal menghubungkan Drive:", e);
      showAlert("Gagal", `Terjadi kesalahan: ${e.message || e}`, "danger");
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await setDoc(doc(db, "users", "googleAuth"), {
        accessToken: null,
        teacherEmail: null,
        updatedAt: new Date().toISOString(),
      });
      showAlert("Berhasil", "Google Drive Guru berhasil diputuskan!", "alert");
    } catch (e: any) {
      console.warn("Gagal memutuskan Drive:", e);
      showAlert("Gagal", `Terjadi kesalahan: ${e.message || e}`, "danger");
    }
  };

  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [newChapter, setNewChapter] = useState("");

  // Materials Management state
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [materiTitle, setMateriTitle] = useState("");
  const [materiDescription, setMateriDescription] = useState("");
  const [materiSubject, setMateriSubject] = useState("Informatika");
  const [materiBab, setMateriBab] = useState("");
  const [materiDriveUrl, setMateriDriveUrl] = useState("");
  const [materiKelas, setMateriKelas] = useState("");
  const [editingMateriId, setEditingMateriId] = useState<string | null>(null);
  const [isSavingMateri, setIsSavingMateri] = useState(false);
  const [materiSaveMessage, setMateriSaveMessage] = useState({ text: "", type: "" });
  const [activeMateriTab, setActiveMateriTab] = useState("daftar"); // "daftar", "tambah"

  // --- Ujian Siswa States ---
  const [examsList, setExamsList] = useState<any[]>([]);
  const [activeExamTab, setActiveExamTab] = useState("daftar");
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("Informatika");
  const [examBab, setExamBab] = useState("");
  const [examKelas, setExamKelas] = useState("");
  const [selectedExamClasses, setSelectedExamClasses] = useState<string[]>([]);
  const [activeExamClassFilter, setActiveExamClassFilter] = useState<string[]>(["SEMUA_KELAS"]);
  const [examTema, setExamTema] = useState("Preetes");
  const [examMateri, setExamMateri] = useState("");
  const [examDuration, setExamDuration] = useState(30); // in minutes
  const [examKkm, setExamKkm] = useState(75);
  const [examQuestionCount, setExamQuestionCount] = useState(5);
  const [examQuestionFormat, setExamQuestionFormat] = useState<"multiple_choice" | "mixed" | "short_answer" | "essay">("multiple_choice");
  const [examDescription, setExamDescription] = useState("");
  const [examYoutubeUrls, setExamYoutubeUrls] = useState<string[]>(["", "", ""]);
  const [examDocuments, setExamDocuments] = useState<File[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [examToken, setExamToken] = useState("");
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examSaveMessage, setExamSaveMessage] = useState({ text: "", type: "" });
  const [showExamProgressModal, setShowExamProgressModal] = useState(false);
  const [examGeneratorStatus, setExamGeneratorStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [examGeneratorProgress, setExamGeneratorProgress] = useState<string>("");
  const [examGeneratorError, setExamGeneratorError] = useState<string>("");
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [analysisExamModal, setAnalysisExamModal] = useState<{ isOpen: boolean; exam: any | null }>({
    isOpen: false,
    exam: null,
  });
  const [proctoringExamModal, setProctoringExamModal] = useState<{ isOpen: boolean; exam: any | null }>({
    isOpen: false,
    exam: null,
  });

  const [downloadExamModal, setDownloadExamModal] = useState<{
    isOpen: boolean;
    exam: any | null;
    selectedClass: string;
  }>({
    isOpen: false,
    exam: null,
    selectedClass: "SEMUA_KELAS",
  });

  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceClass, setAttendanceClass] = useState<string>("");
  const [analysisClass, setAnalysisClass] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [isEditingAttendance, setIsEditingAttendance] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementKelas, setAnnouncementKelas] = useState("");
  const [announcementPublishDate, setAnnouncementPublishDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const announcementFormRef = useRef<HTMLDivElement | null>(null);

  // --- PDF Preview Modal States ---
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const generateRandomToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  // Form states for adding assignment
  const [assignmentBab, setAssignmentBab] = useState("");
  const [assignmentMateri, setAssignmentMateri] = useState("");
  const [assignmentPublishedAt, setAssignmentPublishedAt] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [assignmentTargets, setAssignmentTargets] = useState<
    { kelas: string; deadline: string; publishedAt?: string }[]
  >([]);
  const [sharedDeadline, setSharedDeadline] = useState("");
  const [selectedDaftarTugasClasses, setSelectedDaftarTugasClasses] = useState<string[]>([]);
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState("");
  const [assignmentBabFilter, setAssignmentBabFilter] = useState("");

  const [assignmentDesc, setAssignmentDesc] = useState("");
  const [assignmentTaskLink, setAssignmentTaskLink] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState({
    text: "",
    type: "",
  });
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );

  // Grading Rubric State
  const [rubric, setRubric] = useState<any>({
    kehadiran: 20,
    tugas: 50,
    uts: 10,
    uas: 20,
  });
  const [isEditingRubric, setIsEditingRubric] = useState(false);
  const [editKehadiran, setEditKehadiran] = useState("20");
  const [editTugas, setEditTugas] = useState("50");
  const [editUts, setEditUts] = useState("10");
  const [editUas, setEditUas] = useState("20");
  const [isSavingRubric, setIsSavingRubric] = useState(false);

  // --- Buku Nilai Table Inline Edit & Manual Column States ---
  const [isEditingRekapTable, setIsEditingRekapTable] = useState(false);
  const [isFullScreenRekap, setIsFullScreenRekap] = useState(false);
  const [isCompactRowRekap, setIsCompactRowRekap] = useState(false);
  const [editedRekapGrades, setEditedRekapGrades] = useState<Record<string, string>>({});
  const [isSavingRekapGrades, setIsSavingRekapGrades] = useState(false);

  const [isAddManualColumnOpen, setIsAddManualColumnOpen] = useState(false);
  const [isDeleteColumnModalOpen, setIsDeleteColumnModalOpen] = useState(false);
  const [deletedColumnIds, setDeletedColumnIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("firas_deleted_column_ids");
      if (raw) return new Set(JSON.parse(raw));
    } catch (_) {}
    return new Set<string>();
  });
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [isSavingEditColumn, setIsSavingEditColumn] = useState(false);
  const [manualBab, setManualBab] = useState("");
  const [manualMateri, setManualMateri] = useState("");
  const [manualKelas, setManualKelas] = useState("");
  const [manualPublishDate, setManualPublishDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSavingManualColumn, setIsSavingManualColumn] = useState(false);

  const handleAddChapter = async () => {
    if (!newChapter.trim()) return;
    try {
      await setDoc(doc(db, "chapters", newChapter.trim()), {
        name: newChapter.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewChapter("");
      showAlert("Berhasil", "Bab berhasil ditambahkan.", "alert");
    } catch (e: any) {
      console.warn("Gagal menambah bab:", e);
      showAlert("Gagal", "Gagal menambah bab: " + (e.message || e), "danger");
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteDoc(doc(db, "chapters", chapterId));
      showAlert("Berhasil", "Bab berhasil dihapus.", "alert");
    } catch (e: any) {
      console.warn("Gagal menghapus bab:", e);
      showAlert("Gagal", "Gagal menghapus bab: " + (e.message || e), "danger");
    }
  };

  const toLocalDatetimeInputValue = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateIndo = (dateInput: any) => {
    if (!dateInput) return "-";
    if (typeof dateInput === "string" && dateInput.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getAssignmentPublishedAtForTeacher = (asg: any, targetClass?: string): string => {
    if (!asg) return "-";
    
    // 1. If a specific class filter or student class is passed, check targets array first
    if (targetClass && targetClass !== "SEMUA_KELAS" && targetClass !== "ALL" && asg.targets && Array.isArray(asg.targets)) {
      const target = asg.targets.find((t: any) => t.kelas === targetClass);
      if (target && target.publishedAt) {
        return formatDateIndo(target.publishedAt);
      }
    }

    // 2. Check if targets exist with dates
    if (asg.targets && Array.isArray(asg.targets) && asg.targets.length > 0) {
      const targetDates = asg.targets
        .map((t: any) => t.publishedAt)
        .filter((d: any) => d && typeof d === "string" && d.trim() !== "");
        
      if (targetDates.length > 0) {
        const uniqueFormatted: string[] = Array.from(new Set(targetDates.map((d: any) => formatDateIndo(d)))) as string[];
        if (uniqueFormatted.length === 1) {
          return uniqueFormatted[0];
        } else if (uniqueFormatted.length > 1) {
          if (targetClass && targetClass !== "SEMUA_KELAS" && targetClass !== "ALL") {
            return uniqueFormatted[0];
          }
          return uniqueFormatted.join(" • ");
        }
      }
    }

    // 3. Fallback
    const fallback = asg.publishedAt || asg.createdAt;
    return fallback ? formatDateIndo(fallback) : "-";
  };

  const handleEditAssignment = (assignment: any) => {
    setAssignmentBab(assignment.bab);
    setAssignmentMateri(assignment.materi);
    setAssignmentPublishedAt(toLocalDatetimeInputValue(assignment.publishedAt));
    if (assignment.targets && Array.isArray(assignment.targets)) {
      const firstDeadline = assignment.targets[0]?.deadline;
      const firstDeadlineStr = toLocalDatetimeInputValue(firstDeadline);
      setSharedDeadline(firstDeadlineStr);
      setAssignmentTargets(
        assignment.targets.map((t: any) => ({
          kelas: t.kelas || "",
          deadline: toLocalDatetimeInputValue(t.deadline),
          publishedAt: toLocalDatetimeInputValue(t.publishedAt || assignment.publishedAt),
        })),
      );
    } else {
      const dateStr = toLocalDatetimeInputValue(assignment.deadline);
      setSharedDeadline(dateStr);
      setAssignmentTargets([
        { 
          kelas: assignment.kelas || "", 
          deadline: dateStr,
          publishedAt: toLocalDatetimeInputValue(assignment.publishedAt),
        },
      ]);
    }
    setAssignmentDesc(assignment.description || "");
    setAssignmentTaskLink(assignment.taskLink || assignment.linkTugas || assignment.fileUrl || "");
    setEditingAssignmentId(assignment.id);
    setActiveMenu("manajemen-tugas");
    setActiveAssignmentTab("tambah");
  };

  const handleBatalEditAssignment = () => {
    setAssignmentBab("");
    setAssignmentMateri("");
    setAssignmentPublishedAt("");
    setSharedDeadline("");
    setAssignmentTargets([]);
    setAssignmentDesc("");
    setAssignmentTaskLink("");
    setEditingAssignmentId(null);
      localStorage.removeItem("firas_cache_assignments_v2");
      fetchTeacherData(false);
    setAssignmentMessage({ text: "", type: "" });
  };

  // Class Management State
  const [classesList, setClassesList] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");

  const [studentsList, setStudentsList] = useState<any[]>([]);

  useEffect(() => {
    // One-time cleanup for duplicate student ADILA MAULIDAH (NIS: 262710002 and 0262710002 in class X8)
    const cleanupDuplicate = async () => {
      const targetNisList = ["262710002", "0262710002"];
      // Find students matching these NIS and class X8
      const duplicates = studentsList.filter(s => 
        targetNisList.includes(String(s.nisn || "").trim()) && 
        (s.kelas === "X8" || s.class === "X8")
      );

      if (duplicates.length > 1) {
        console.log(`[CLEANUP] Found ${duplicates.length} records for ADILA MAULIDAH. Deleting one...`);
        try {
          // Keep the one with 10 digits if possible, or just the first one
          const studentToDelete = duplicates.find(s => String(s.nisn).length !== 10) || duplicates[0];
          const id = studentToDelete.id || studentToDelete.nisn;
          
          await deleteDoc(doc(db, "studentsByNisn", id));
          console.log(`[CLEANUP] Duplicate student ADILA MAULIDAH (${id}) deleted successfully.`);
          
          // Refresh list locally
          setStudentsList(prev => prev.filter(s => s.id !== id && s.nisn !== id));
          localStorage.removeItem("firas_cache_students");
        } catch (err) {
          console.error(`[CLEANUP] Failed to delete duplicate student:`, err);
        }
      }
    };
    if (studentsList.length > 0) {
      cleanupDuplicate();
    }
  }, [studentsList]);
  const filteredStudents = useMemo(() => {
    let list = studentsList.filter((student) => student && (student.displayName || student.studentName) && student.kelas);
    if (studentClassFilter && studentClassFilter !== "SEMUA_KELAS") {
      list = list.filter((student) => student.kelas === studentClassFilter);
    }
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      list = list.filter((student) => {
        const name = (student.displayName || student.studentName || "").toLowerCase();
        const nisn = (student.nisn || "").toLowerCase();
        const kelas = (student.kelas || "").toLowerCase();
        return name.includes(q) || nisn.includes(q) || kelas.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const classA = (a.kelas || "").toString();
      const classB = (b.kelas || "").toString();
      const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
      if (classComp !== 0) return classComp;
      return (a.displayName || a.studentName || "").localeCompare(
        b.displayName || b.studentName || "",
        "id",
        { sensitivity: "base" }
      );
    });
  }, [studentsList, studentSearchQuery, studentClassFilter]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);

  const assignmentSequenceNumber = useMemo(() => {
    if (!assignmentBab || editingAssignmentId) return null;
    const count = assignmentsList.filter(a => a.bab === assignmentBab && !a.isArchived).length;
    return count + 1;
  }, [assignmentBab, assignmentsList, editingAssignmentId]);

  useEffect(() => {
    if (assignmentSequenceNumber && !assignmentMateri && !editingAssignmentId) {
      setAssignmentMateri(`Tugas ${assignmentSequenceNumber} `);
    }
  }, [assignmentSequenceNumber, editingAssignmentId]);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [finalGradesList, setFinalGradesList] = useState<any[]>([]);
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedStudentSearchFilter, setSelectedStudentSearchFilter] = useState("");
  const [activeAuditSubTab, setActiveAuditSubTab] = useState<"tugas-baru" | "tugas-perbaikan" | "tugas-ditolak">("tugas-baru");


  const finalGradesByNisnLookup = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    finalGradesList.forEach(grade => {
      if (!grade.nisn) return;
      if (!map.has(grade.nisn)) map.set(grade.nisn, new Map());
      const studentMap = map.get(grade.nisn)!;
      const asgId = grade.assignmentId || grade.examId || grade.id?.split('_')[0];
      if (asgId) studentMap.set(asgId, grade);
    });
    return map;
  }, [finalGradesList]);

  const absensiByNisnLookup = useMemo(() => {
    const map = new Map<string, any[]>();
    absensiList.forEach(abs => {
      if (!abs.nisn) return;
      if (!map.has(abs.nisn)) map.set(abs.nisn, []);
      map.get(abs.nisn)!.push(abs);
    });
    return map;
  }, [absensiList]);

  // Grading State
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isFullscreenGradeModal, setIsFullscreenGradeModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeValue, setGradeValue] = useState("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isMassAuditing, setIsMassAuditing] = useState(false);
  const [isRefreshingSubmissions, setIsRefreshingSubmissions] = useState(false);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  const handleRefreshSubmissions = async () => {
    setIsRefreshingSubmissions(true);
    try {
      const snap = await getDocs(collection(db, "submissions"));
      const subs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      trackUsage(snap.size, 0);
      setSubmissionsList(subs);
      setLocalCache("firas_cache_submissions", subs);
      showAlert("Data Disinkronkan", `Berhasil memuat ${subs.length} data respon tugas terbaru dari server.`, "alert");
    } catch (e: any) {
      console.warn("Gagal menyinkronkan data tugas:", e);
      showAlert("Gagal", "Terjadi kendala saat menyinkronkan data respon tugas.", "alert");
    } finally {
      setIsRefreshingSubmissions(false);
    }
  };

  
  const [examToReset, setExamToReset] = useState<any>(null);
  const [resetModalClassFilter, setResetModalClassFilter] = useState<string>("SEMUA_KELAS");
  const [resetModalSearch, setResetModalSearch] = useState<string>("");
  const [isPublishOtherClassModalOpen, setIsPublishOtherClassModalOpen] = useState(false);
  const [examToPublish, setExamToPublish] = useState<any>(null);
  const [newPublishKelas, setNewPublishKelas] = useState("");
  const [publishOtherClasses, setPublishOtherClasses] = useState<string[]>([]);
  const [newPublishToken, setNewPublishToken] = useState("");
  const [isSavingDuplicateExam, setIsSavingDuplicateExam] = useState(false);
  const [shareCbtExamModal, setShareCbtExamModal] = useState<{
    isOpen: boolean;
    exam: any;
    customToken?: string;
    customClasses?: string[];
  }>({ isOpen: false, exam: null });
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const handleConfirmResetStudentExam = async (examId: string, targetNisn: string) => {
    setIsSavingDuplicateExam(true);
    try {
      if (targetNisn === "ALL") {
        const gradesToDelete = finalGradesList.filter(
          (g) => g.assignmentId === examId || g.examId === examId
        );
        for (const g of gradesToDelete) {
          if (g.id) {
            await deleteDoc(doc(db, "final_grades", g.id));
          } else if (g.nisn) {
            await deleteDoc(doc(db, "final_grades", `${examId}_${g.nisn}`));
          }
        }
      } else {
        await deleteDoc(doc(db, "final_grades", `${examId}_${targetNisn}`));
      }

      localStorage.removeItem("firas_cache_final_grades");
      fetchTeacherData(false);
      setExamToReset(null);
      showAlert(
        "Berhasil",
        "Status ujian siswa telah berhasil di-reset. Siswa kini dapat memasukkan token kembali dan mengerjakan ulang ujian CBT.",
        "alert"
      );
    } catch (error) {
      console.warn("Gagal reset ujian:", error);
      showAlert("Gagal", "Terjadi kesalahan saat mereset ujian siswa.", "danger");
    } finally {
      setIsSavingDuplicateExam(false);
    }
  };

  const handleResetStudentExam = async (gradeId: string) => {
    showConfirm(
      "Konfirmasi Reset", 
      "Apakah Anda yakin ingin menghapus nilai ini dan mereset status ujian untuk siswa tersebut? (Siswa dapat mengerjakan ulang)", 
      async () => {
        try {
          await deleteDoc(doc(db, "final_grades", gradeId));
          localStorage.removeItem("firas_cache_final_grades");
          fetchTeacherData(false);
          showAlert("Berhasil", "Status ujian siswa telah reset.", "alert");
        } catch (error) {
          console.warn("Gagal reset ujian:", error);
          showAlert("Gagal", "Terjadi kesalahan saat mereset ujian.", "danger");
        }
      },
      "Reset Ujian"
    );
  };

  const handleTinjauNilai = (submission: any) => {
    const assignment = assignmentsList.find(
      (a) => a.id === submission.assignmentId,
    );
    let calculatedGrade = "100";

    if (assignment) {
      const target = assignment.targets?.find((t: any) => t.kelas === submission.kelas);
      const rawPubDate = target?.publishedAt || assignment.publishedAt || assignment.createdAt;
      if (rawPubDate && submission.submittedAt) {
        const publishedDate = new Date(rawPubDate);
        publishedDate.setHours(0, 0, 0, 0);

        const submittedDate = new Date(submission.submittedAt);
        submittedDate.setHours(0, 0, 0, 0);

        const diffTime = submittedDate.getTime() - publishedDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        const score = 100 - diffDays * 5;
        calculatedGrade = Math.max(75, score).toString();
      }
    }

    const initialScore = submission.nilai !== undefined && submission.nilai !== null
      ? String(submission.nilai)
      : calculatedGrade;

    setSelectedSubmission({
      ...submission,
      suggestedGrade: calculatedGrade,
    });
    setGradeValue(initialScore);
    // Only prefill teacher note if this submission was already graded; never carry over a prior rejection note
    setFeedbackReason(submission.status === "sudah dinilai" ? (submission.keterangan || "") : "");
    setIsRejecting(false);
    setIsGradingModalOpen(true);
  };

  const handleMassAudit = async () => {
    const pendingSubmissions = submissionsList.filter((sub) => {
      const matchTask = selectedAssignmentFilter
        ? sub.assignmentId === selectedAssignmentFilter
        : true;
      const matchClass = selectedClassFilter
        ? sub.kelas === selectedClassFilter
        : true;
      const student = studentsList.find((s) => s.nisn === sub.nisn);
      const studentDisplayName = (
        student?.displayName ||
        student?.studentName ||
        student?.name ||
        sub.studentName ||
        ""
      ).toLowerCase();
      const searchQuery = selectedStudentSearchFilter.trim().toLowerCase();
      const matchStudent = searchQuery
        ? studentDisplayName.includes(searchQuery) ||
          (sub.nisn && sub.nisn.toLowerCase().includes(searchQuery))
        : true;
      // Only audit those that haven't been graded or rejected
      const isPending =
        sub.status !== "sudah dinilai" && sub.status !== "ditolak";
      return matchTask && matchClass && matchStudent && isPending;
    });

    if (pendingSubmissions.length === 0) {
      showAlert(
        "Info",
        "Tidak ada tugas yang menunggu penilaian untuk filter ini.",
        "alert",
      );
      return;
    }

    showConfirm(
      "Audit Massal",
      `Apakah Anda yakin ingin memberikan nilai 100 secara otomatis ke ${pendingSubmissions.length} siswa terpilih? Tindakan ini sangat efisien untuk menilai tugas secara cepat.`,
      async () => {
        setIsMassAuditing(true);
        try {
          const batch = writeBatch(db);
          const now = new Date().toISOString();
          const updatedFinalGrades = [...finalGradesList];
          const updatedSubmissions = [...submissionsList];

          for (const sub of pendingSubmissions) {
            const assignmentId = sub.assignmentId || sub.assignment_id || sub.taskId || sub.id || "general_task";
            const fgId = `${assignmentId}_${sub.nisn || ""}`;
            const asgObj = assignmentsList.find(a => a.id === assignmentId);
            const examObj = examsList.find(e => e.id === assignmentId);
            const colTitle = asgObj?.materi || asgObj?.title || examObj?.title || sub.materi || "Tugas";
            const colBab = asgObj?.bab || examObj?.bab || "Informatika";

            const fgData = {
              id: fgId,
              assignmentId: assignmentId,
              examId: assignmentId,
              nisn: sub.nisn || "",
              studentName: sub.studentName || "",
              kelas: sub.kelas || "",
              nilai: 100,
              score: 100,
              title: colTitle,
              bab: colBab,
              type: examObj ? "CBT" : (asgObj?.type || "Tugas"),
              gradedAt: now,
              updatedAt: now,
            };

            // 1. Create/Update final grade in Firestore
            const gradeRef = doc(db, "final_grades", fgId);
            batch.set(gradeRef, fgData, { merge: true });

            // Sync to Supabase in parallel
            try {
              saveFinalGrade(fgData);
            } catch (_) {}

            // 2. Update submission in Firestore
            const subRef = doc(db, "submissions", sub.id);
            const subUpdate = {
              status: "sudah dinilai",
              nilai: 100,
              fileUrl: null,
              keterangan: "Lulus Audit Massal",
              gradedAt: now,
              updatedAt: now,
            };
            batch.update(subRef, subUpdate);

            // Update in-memory collections
            const fgIdx = updatedFinalGrades.findIndex(g => g.id === fgId || (g.assignmentId === sub.assignmentId && g.nisn === sub.nisn));
            if (fgIdx >= 0) {
              updatedFinalGrades[fgIdx] = { ...updatedFinalGrades[fgIdx], ...fgData };
            } else {
              updatedFinalGrades.push(fgData);
            }

            const subIdx = updatedSubmissions.findIndex(s => s.id === sub.id);
            if (subIdx >= 0) {
              updatedSubmissions[subIdx] = { ...updatedSubmissions[subIdx], ...subUpdate };
            }
          }

          await batch.commit();
          setFinalGradesList(updatedFinalGrades);
          setSubmissionsList(updatedSubmissions);
          setLocalCache("firas_cache_final_grades", updatedFinalGrades);
          setLocalCache("firas_cache_submissions", updatedSubmissions);

          trackUsage(0, pendingSubmissions.length * 2);
          showAlert(
            "Berhasil",
            `${pendingSubmissions.length} tugas berhasil dinilai secara massal dengan skor 100.`,
            "alert",
          );
        } catch (error) {
          console.warn("Gagal audit massal:", error);
          showAlert(
            "Error",
            "Gagal melakukan audit massal. Silakan coba lagi.",
            "danger",
          );
        } finally {
          setIsMassAuditing(false);
        }
      },
      "Audit Semua",
    );
  };

  const handleSimpanPenilaian = async (
    status: "sudah dinilai" | "ditolak",
  ) => {
    if (!selectedSubmission) return;
    const finalScore = Number(gradeValue || selectedSubmission.suggestedGrade || 100);

    if (status === "sudah dinilai" && isNaN(finalScore)) {
      showAlert("Validasi", "Mohon masukkan nilai angka yang valid sebelum menyimpan.", "alert");
      return;
    }
    if (status === "ditolak" && !feedbackReason.trim()) {
      showAlert("Validasi", "Mohon berikan alasan penolakan untuk siswa.", "alert");
      return;
    }

    setIsSavingGrade(true);
    try {
      const now = new Date().toISOString();
      if (status === "sudah dinilai") {
        const assignmentId = selectedSubmission.assignmentId || selectedSubmission.assignment_id || selectedSubmission.taskId || selectedSubmission.id || "general_task";
        const fgId = `${assignmentId}_${selectedSubmission.nisn || ""}`;
        const asgObj = assignmentsList.find(a => a.id === assignmentId);
        const examObj = examsList.find(e => e.id === assignmentId);
        const colTitle = asgObj?.materi || asgObj?.title || examObj?.title || selectedSubmission.materi || "Tugas";
        const colBab = asgObj?.bab || examObj?.bab || "Informatika";

        const fgData = {
          id: fgId,
          assignmentId: assignmentId,
          examId: assignmentId,
          nisn: selectedSubmission.nisn || "",
          studentName: selectedSubmission.studentName || "",
          kelas: selectedSubmission.kelas || "",
          nilai: finalScore,
          score: finalScore,
          title: colTitle,
          bab: colBab,
          type: examObj ? "CBT" : (asgObj?.type || "Tugas"),
          catatan: feedbackReason.trim(),
          gradedAt: now,
          updatedAt: now,
        };

        // 1. Create/Update final grade in Firestore
        await setDoc(
          doc(db, "final_grades", fgId),
          fgData,
          { merge: true },
        );

        // Save to Supabase
        try {
          await saveFinalGrade(fgData);
        } catch (supaErr) {
          console.warn("Supabase final grade save warning:", supaErr);
        }

        // 2. Update submission entry: update status, nilai, remove fileUrl to save space, and clear any previous rejection note
        const subUpdateData = {
          status: "sudah dinilai",
          nilai: finalScore,
          fileUrl: null, // Clear large image data to optimize storage
          keterangan: feedbackReason.trim(),
          rejectionReason: "",
          gradedAt: now,
          updatedAt: now,
        };
        await dbSetDoc(
          doc(db, "submissions", selectedSubmission.id),
          subUpdateData,
          { merge: true },
        );
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from("app_collections").upsert({
              id: `submissions_${selectedSubmission.id}`,
              collection_name: "submissions",
              doc_id: selectedSubmission.id,
              data: { ...(selectedSubmission || {}), ...subUpdateData },
              updated_at: now
            });
          } catch (_) {}
        }

        // 3. Immediately update in-memory state
        setFinalGradesList((prev) => {
          const idx = prev.findIndex(
            (g) => g.id === fgId || (g.assignmentId === selectedSubmission.assignmentId && g.nisn === selectedSubmission.nisn)
          );
          const updated = idx >= 0
            ? prev.map((item, i) => (i === idx ? { ...item, ...fgData } : item))
            : [fgData, ...prev];
          setLocalCache("firas_cache_final_grades", updated);
          return updated;
        });

        setSubmissionsList((prev) => {
          const updated = prev.map((s) => (s.id === selectedSubmission.id ? { ...s, ...subUpdateData } : s));
          setLocalCache("firas_cache_submissions", updated);
          return updated;
        });

        trackUsage(0, 2);
        showAlert("Berhasil", `Nilai ${finalScore} berhasil disimpan dan diterbitkan untuk siswa.`, "alert");
      } else {
        // Update submission status for rejection
        const subRejectData = {
          status: "ditolak",
          nilai: null,
          keterangan: feedbackReason.trim(),
          rejectionReason: feedbackReason.trim(),
          wasRejected: true,
          gradedAt: now,
          updatedAt: now,
        };
        await setDoc(
          doc(db, "submissions", selectedSubmission.id),
          subRejectData,
          { merge: true },
        );

        setSubmissionsList((prev) => {
          const updated = prev.map((s) => (s.id === selectedSubmission.id ? { ...s, ...subRejectData } : s));
          setLocalCache("firas_cache_submissions", updated);
          return updated;
        });

        trackUsage(0, 1);
        showAlert("Tugas Ditolak", "Status penolakan & catatan revisi berhasil dikirim ke siswa.", "alert");
      }

      setIsGradingModalOpen(false);
      setSelectedSubmission(null);
      localStorage.removeItem("firas_cache_submissions");
      localStorage.removeItem("firas_cache_final_grades");
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `submissions/${selectedSubmission.id}`,
      );
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        setSaveMessage({
          text: "Gagal mengimpor. File Excel kosong atau tidak valid.",
          type: "error",
        });
        return;
      }

      const getFieldValue = (row: any, searchTerms: string[]) => {
        const keys = Object.keys(row);
        // Step 1: Pas pencocokan persis setelah dinormalisasi (huruf kecil & tanpa spasi)
        for (const s of searchTerms) {
          const searchNorm = s.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const k of keys) {
            const rowNorm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (rowNorm === searchNorm) {
              return row[k];
            }
          }
        }
        // Step 2: Pencocokan parsial (mengandung kata kunci)
        for (const s of searchTerms) {
          const searchNorm = s.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const k of keys) {
            const rowNorm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (rowNorm.includes(searchNorm) || searchNorm.includes(rowNorm)) {
              return row[k];
            }
          }
        }
        return undefined;
      };

      // Validasi struktur kolom di baris pertama
      const sampleRow = jsonData[0];
      const hasName = getFieldValue(sampleRow, ["nama", "nama_lengkap", "name", "siswa", "pesertadidik"]) !== undefined;
      const hasNisn = getFieldValue(sampleRow, ["nisn", "noinduk", "id", "nis", "nomorinduk"]) !== undefined;
      const hasKelas = getFieldValue(sampleRow, ["kelas", "class", "grade", "rombel"]) !== undefined;

      if (!hasName || !hasNisn || !hasKelas) {
        const missing = [];
        if (!hasName) missing.push("Nama / Nama Lengkap");
        if (!hasNisn) missing.push("NIS / No Induk");
        if (!hasKelas) missing.push("Kelas");
        
        // Dapatkan nama kolom yang terdeteksi di Excel untuk membantu pemecahan masalah pengguna
        const currentHeaders = Object.keys(sampleRow).join(", ");
        setSaveMessage({
          text: `Format Salah: Kolom wajib tidak dikenali! Kolom di Excel Anda: [${currentHeaders}]. Kolom wajib yang tidak ditemukan: [${missing.join(", ")}]. Silakan ubah judul kolom di Excel Anda menjadi "Nama", "NIS", "Kelas", dan "Kode Akses".`,
          type: "error",
        });
        e.target.value = "";
        return;
      }

      setIsSaving(true);
      setSaveMessage({
        text: `Sedang mengimpor ${jsonData.length} siswa...`,
        type: "info",
      });

      let successCount = 0;
      let failedCount = 0;
      for (const row of jsonData) {
        const nameVal = getFieldValue(row, ["nama", "nama_lengkap", "name", "siswa", "pesertadidik"]);
        const nisnVal = getFieldValue(row, ["nisn", "noinduk", "id", "nis", "nomorinduk"]);
        const classVal = getFieldValue(row, ["kelas", "class", "grade", "rombel"]);
        const accessCodeVal = getFieldValue(row, ["kodeakses", "accesscode", "kode", "akses", "password", "katasandi", "sandi"]) || "";

        if (nameVal !== undefined && nisnVal !== undefined && classVal !== undefined) {
          const name = nameVal.toString().trim();
          
          // Konversi NISN secara aman, bersihkan spasi, koma desimal, dll.
          let nisnStr = nisnVal.toString().trim().split(".")[0].replace(/\s+/g, "");
          if (/^\d+$/.test(nisnStr) && nisnStr.length < 10) {
            // Standar NISN di Indonesia adalah 10 digit, jika kurang dan berupa angka, kita pad dengan leading zero
            nisnStr = nisnStr.padStart(10, "0");
          }

          const className = classVal.toString().trim();
          const accessCodeStr = accessCodeVal ? accessCodeVal.toString().trim().split(".")[0] : "";

          if (name && nisnStr && className) {
            await setDoc(
              doc(db, "studentsByNisn", nisnStr),
              {
                nisn: nisnStr,
                displayName: name,
                kelas: className,
                accessCode: accessCodeStr,
                role: "student",
                createdAt: new Date().toISOString(),
              },
              { merge: true },
            );
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }

      if (successCount === 0) {
        setSaveMessage({
          text: "Peringatan: Format tabel tidak sesuai! Pastikan terdapat kolom: Nama, NIS, Kelas, dan Kode Akses.",
          type: "error",
        });
      } else if (failedCount > 0) {
        setSaveMessage({
          text: `Impor Selesai dengan Catatan: Berhasil mengimpor ${successCount} siswa. Namun ${failedCount} baris data dilewati karena format tidak lengkap.`,
          type: "warning",
        });
      } else {
        setSaveMessage({
          text: `Selamat: Berhasil mengimpor seluruh ${successCount} data siswa dengan sukses bersama Kode Aksesnya!`,
          type: "success",
        });
      }
      e.target.value = ""; // Reset input
    } catch (error) {
      console.warn("Import Error:", error);
      setSaveMessage({
        text: "Gagal mengimpor file Excel. Mohon periksa kembali ekstensi file dan format data Anda.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isRefreshingTeacherData, setIsRefreshingTeacherData] = useState(false);

  const fetchTeacherData = async (forceRefresh = false) => {
    setIsRefreshingTeacherData(true);
    try {
      // 1. Classes (rarely changes, always cache first unless missing or forceRefresh)
      const cachedClasses = !forceRefresh && getLocalCache<any[]>("firas_cache_classes", 12 * 60 * 60 * 1000);
      if (cachedClasses && cachedClasses.length > 0) {
        setClassesList(cachedClasses);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "classes"));
          trackUsage(snapshot.size, 0);
          const cls = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          cls.sort((a: any, b: any) => (a.createdAt || "").localeCompare(b.createdAt || ""));
          setClassesList(cls);
          setLocalCache("firas_cache_classes", cls);
        } catch (e) {
          console.warn("Failed fetching classes:", e);
        }
      }

      // 2. Students (rarely changes, always cache first unless missing or forceRefresh)
      const rawCachedStudents = !forceRefresh && getLocalCache<any[]>("firas_cache_students", 12 * 60 * 60 * 1000);
      const cachedStudents = Array.isArray(rawCachedStudents)
        ? rawCachedStudents.filter((s: any) => s && (s.displayName || s.studentName) && s.kelas)
        : null;

      if (cachedStudents && cachedStudents.length > 0) {
        setStudentsList(cachedStudents);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "studentsByNisn"));
          trackUsage(snapshot.size, 0);
          const studs = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s: any) => s && (s.displayName || s.studentName) && s.kelas);

          if (studs.length > 0) {
            studs.sort((a: any, b: any) => {
              const classA = (a.kelas || "").toString();
              const classB = (b.kelas || "").toString();
              const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
              if (classComp !== 0) return classComp;
              return (a.displayName || a.studentName || "").localeCompare(
                b.displayName || b.studentName || "",
                "id",
                { sensitivity: "base" }
              );
            });
            setStudentsList(studs);
            setLocalCache("firas_cache_students", studs);
          } else {
            const rawFallback = getLocalCache<any[]>("firas_cache_students", Infinity);
            const fallbackCached = Array.isArray(rawFallback)
              ? rawFallback.filter((s: any) => s && (s.displayName || s.studentName) && s.kelas)
              : null;
            if (fallbackCached && fallbackCached.length > 0) {
              setStudentsList(fallbackCached);
            }
          }
        } catch (e) {
          console.warn("Failed fetching students:", e);
          const rawFallback = getLocalCache<any[]>("firas_cache_students", Infinity);
          const fallbackCached = Array.isArray(rawFallback)
            ? rawFallback.filter((s: any) => s && (s.displayName || s.studentName) && s.kelas)
            : null;
          if (fallbackCached && fallbackCached.length > 0) {
            setStudentsList(fallbackCached);
          }
        }
      }

      // 3. Assignments (rarely changes, always cache first unless missing or forceRefresh)
      const cachedAssignments = null; // ALWAYS FETCH
      if (cachedAssignments && cachedAssignments.length > 0) {
        setAssignmentsList(cachedAssignments);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "assignments"));
          trackUsage(snapshot.size, 0);
          const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          tasks.sort((a: any, b: any) => {
            const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setAssignmentsList(tasks);
          setLocalCache("firas_cache_assignments_v2", tasks);
        } catch (e) {
          console.warn("Failed fetching assignments:", e);
        }
      }

      // 4. Submissions (Direct query to ensure all new/pending/graded submissions appear)
      // Highly dynamic, obeys forceRefresh
      const cachedSubmissions = !forceRefresh && getLocalCache<any[]>("firas_cache_submissions", 2 * 60 * 1000);
      if (cachedSubmissions && cachedSubmissions.length > 0) {
        setSubmissionsList(cachedSubmissions);
      } else {
        try {
          const snap = await getDocs(collection(db, "submissions"));
          const subs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          trackUsage(snap.size, 0);
          setSubmissionsList(subs);
          setLocalCache("firas_cache_submissions", subs);
        } catch (e: any) {
          console.warn("Failed fetching submissions directly:", e);
          const stale = getLocalCache<any[]>("firas_cache_submissions", 24 * 60 * 60 * 1000);
          if (stale && stale.length > 0) {
            setSubmissionsList(stale);
          }
        }
      }

      // 5. Final Grades (Supabase primary + Firestore fallback, unlimited reads)
      const cachedFinalGrades = !forceRefresh && getLocalCache<any[]>("firas_cache_final_grades", 10 * 60 * 1000);
      if (cachedFinalGrades && cachedFinalGrades.length > 0) {
        setFinalGradesList(cachedFinalGrades);
      } else {
        try {
          const grades = await getFinalGrades();
          if (grades.length > 0) {
            setFinalGradesList(grades);
            setLocalCache("firas_cache_final_grades", grades);
          }
        } catch (e) {
          console.warn("Failed fetching final grades:", e);
        }
      }

      // 6. Chapters (Static, always cache first unless forceRefresh)
      const cachedChapters = !forceRefresh && getLocalCache<any[]>("firas_cache_chapters", 24 * 60 * 60 * 1000);
      if (cachedChapters && cachedChapters.length > 0) {
        setChaptersList(cachedChapters);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "chapters"));
          const chaps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (chaps.length > 0) {
            setChaptersList(chaps);
            setLocalCache("firas_cache_chapters", chaps);
          }
        } catch (e) {
          console.warn("Failed fetching chapters:", e);
        }
      }

      // 7. Exams (Static, always cache first unless forceRefresh)
      const cachedExams = null; // ALWAYS FETCH
      if (cachedExams && cachedExams.length > 0) {
        setExamsList(cachedExams);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "exams"));
          trackUsage(snapshot.size, 0);
          const exams = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          exams.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setExamsList(exams);
          setLocalCache("firas_cache_exams_v2", exams);
        } catch (e) {
          console.warn("Failed fetching exams:", e);
        }
      }

      // 8. Announcements (rarely changes, always cache first unless stale or forceRefresh)
      const cachedAnnouncements = !forceRefresh && getLocalCache<any[]>("firas_cache_announcements", 2 * 60 * 60 * 1000);
      if (cachedAnnouncements && cachedAnnouncements.length > 0) {
        setAnnouncementsList(cachedAnnouncements);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "announcements"));
          trackUsage(snapshot.size, 0);
          const anns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          anns.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          if (anns.length > 0) {
            setAnnouncementsList(anns);
            setLocalCache("firas_cache_announcements", anns);
          }
        } catch (e) {
          console.warn("Failed fetching announcements:", e);
        }
      }

      // 9. Absensi (Dynamic, obeys forceRefresh)
      const cachedAbsensi = !forceRefresh && getLocalCache<any[]>("firas_cache_absensi", 15 * 60 * 1000);
      if (cachedAbsensi && cachedAbsensi.length > 0) {
        setAbsensiList(cachedAbsensi);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "absensi"));
          trackUsage(snapshot.size, 0);
          const abs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (abs.length > 0) {
            setAbsensiList(abs);
            setLocalCache("firas_cache_absensi", abs);
          }
        } catch (e) {
          console.warn("Failed fetching absensi:", e);
        }
      }

      // 10. Materials (Static, always cache first unless forceRefresh)
      const cachedMaterials = !forceRefresh && getLocalCache<any[]>("firas_cache_materials", 12 * 60 * 60 * 1000);
      if (cachedMaterials && cachedMaterials.length > 0) {
        setMaterialsList(cachedMaterials);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "materials"));
          trackUsage(snapshot.size, 0);
          const mat = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          mat.sort((a: any, b: any) => {
            if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          if (mat.length > 0) {
            setMaterialsList(mat);
            setLocalCache("firas_cache_materials", mat);
          }
        } catch (e) {
          console.warn("Failed fetching materials:", e);
        }
      }

      // 11. Rubric (Static, always cache first unless forceRefresh)
      const cachedRubric = !forceRefresh && getLocalCache<any>("firas_cache_rubric", 24 * 60 * 60 * 1000);
      if (cachedRubric) {
        setRubric(cachedRubric);
        setEditKehadiran(String(cachedRubric.kehadiran ?? 20));
        setEditTugas(String(cachedRubric.tugas ?? 50));
        setEditUts(String(cachedRubric.uts ?? 10));
        setEditUas(String(cachedRubric.uas ?? 20));
      } else {
        try {
          const docSnap = await getDoc(doc(db, "config", "grading_rubric"));
          if (docSnap.exists()) {
            const data = docSnap.data();
            const r = {
              kehadiran: Number(data.kehadiran) ?? 20,
              tugas: Number(data.tugas) ?? 50,
              uts: Number(data.uts) ?? 10,
              uas: Number(data.uas) ?? 20,
            };
            setRubric(r);
            setEditKehadiran(String(r.kehadiran));
            setEditTugas(String(r.tugas));
            setEditUts(String(r.uts));
            setEditUas(String(r.uas));
            setLocalCache("firas_cache_rubric", r);
          }
        } catch (e) {
          console.warn("Failed fetching rubric:", e);
        }
      }
    } finally {
      setTimeout(() => setIsRefreshingTeacherData(false), 500);
    }
  };

  useEffect(() => {
    // Initial fetch on mount with cache support
    fetchTeacherData(false);

    // Real-time Supabase subscription (Zero quota, instant updates when students submit)
    const unsubscribeGrades = subscribeToFinalGrades((incomingGrade) => {
      setFinalGradesList((prevGrades) => {
        const index = prevGrades.findIndex((g) => g.id === incomingGrade.id);
        let updatedList: any[];
        if (index >= 0) {
          updatedList = [...prevGrades];
          updatedList[index] = { ...updatedList[index], ...incomingGrade };
        } else {
          updatedList = [incomingGrade, ...prevGrades];
        }
        setLocalCache("firas_cache_final_grades", updatedList);
        return updatedList;
      });
    });

    return () => {
      unsubscribeGrades();
    };
  }, []);

  const handleDeleteAssignment = async (id: string) => {
    if (!id) {
      showAlert("Error", "ID Tugas tidak ditemukan.", "danger");
      return;
    }

    showConfirm(
      "Arsipkan Tugas",
      "Apakah Anda yakin ingin mengarsipkan tugas ini? Tugas tidak akan muncul lagi di daftar siswa.",
      async () => {
        try {
          await setDoc(
            doc(db, "assignments", id),
            { isArchived: true, archivedAt: new Date().toISOString() },
            { merge: true },
          );
          showAlert("Berhasil", "Tugas berhasil diarsipkan!", "alert");
          localStorage.removeItem("firas_cache_assignments_v2");
          fetchTeacherData(false);
        } catch (error: any) {
          console.warn("Archive error:", error);
          showAlert("Gagal", "Gagal mengarsipkan tugas.", "danger");
        }
      },
      "Arsipkan Tugas"
    );
  };

  const handleSaveRubric = async () => {
    const k = Number(editKehadiran) || 0;
    const t = Number(editTugas) || 0;
    const utsVal = Number(editUts) || 0;
    const uasVal = Number(editUas) || 0;

    if (k < 0 || t < 0 || utsVal < 0 || uasVal < 0) {
      showAlert("Validasi", "Persentase tidak boleh negatif.", "danger");
      return;
    }

    const total = k + t + utsVal + uasVal;
    if (total !== 100) {
      showAlert("Validasi Gagal", `Jumlah persentase harus tepat 100% (saat ini: ${total}%). Silakan sesuaikan kembali.`, "danger");
      return;
    }

    setIsSavingRubric(true);
    try {
      await setDoc(doc(db, "config", "grading_rubric"), {
        kehadiran: k,
        tugas: t,
        uts: utsVal,
        uas: uasVal,
        updatedAt: new Date().toISOString()
      });
      setIsEditingRubric(false);
      showAlert("Berhasil", "Rubrik penilaian rapor berhasil disimpan ke cloud!", "alert");
    } catch (error: any) {
      console.warn("Gagal menyimpan rubrik:", error);
      showAlert("Gagal", "Terjadi kesalahan saat menyimpan rubrik ke cloud: " + (error.message || error), "danger");
    } finally {
      setIsSavingRubric(false);
    }
  };

  const handleSaveRekapGrades = async () => {
    setIsSavingRekapGrades(true);
    try {
      const keys = Object.keys(editedRekapGrades);
      if (keys.length === 0) {
        setIsEditingRekapTable(false);
        return;
      }

      const updatedFinalGrades = [...finalGradesList];
      const updatedSubmissions = [...submissionsList];

      for (const key of keys) {
        const valStr = editedRekapGrades[key];
        const lastUnderscore = key.lastIndexOf("_");
        if (lastUnderscore === -1) continue;
        const colId = key.substring(0, lastUnderscore);
        const nisn = key.substring(lastUnderscore + 1);

        const numVal = (valStr === "" || valStr === null || valStr === undefined) ? null : Number(valStr);

        // Find assignment or exam details for metadata
        const asgObj = assignmentsList.find(a => a.id === colId);
        const examObj = examsList.find(e => e.id === colId);
        const colTitle = asgObj?.materi || asgObj?.title || examObj?.title || "Penilaian";
        const colBab = asgObj?.bab || examObj?.bab || "Informatika";
        const colStartDate =
          asgObj?.startDate ||
          asgObj?.publishedAt ||
          asgObj?.createdAt ||
          examObj?.startDate ||
          examObj?.publishedAt ||
          examObj?.createdAt;

        // 1. Save to final_grades (Firestore & Supabase)
        const fgId = `${colId}_${nisn}`;
        const fgData = {
          id: fgId,
          assignmentId: colId,
          nisn: nisn,
          nilai: numVal,
          title: colTitle,
          bab: colBab,
          type: examObj ? "CBT" : (asgObj?.type || "Tugas"),
          startDate: colStartDate,
          publishedAt: colStartDate,
          isManualColumn: Boolean(asgObj?.isManualColumn || examObj?.isManualColumn),
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save to Supabase for quota-free student real-time access
        try {
          await saveFinalGrade(fgData);
        } catch (supaErr) {
          console.warn("Supabase final grade save warning:", supaErr);
        }

        // Save to Firestore
        try {
          await setDoc(
            doc(db, "final_grades", fgId),
            fgData,
            { merge: true }
          );
        } catch (fsErr) {
          console.warn("Firestore final grade save warning:", fsErr);
        }

        // Update in-memory finalGradesList
        const existingFgIdx = updatedFinalGrades.findIndex(g => g.id === fgId || (g.assignmentId === colId && g.nisn === nisn));
        if (existingFgIdx >= 0) {
          updatedFinalGrades[existingFgIdx] = { ...updatedFinalGrades[existingFgIdx], ...fgData };
        } else {
          updatedFinalGrades.push(fgData);
        }

        // 2. Also update or create submission in submissions collection so student dashboard gets sync
        const subId = `SUB-${nisn}-${colId}`;
        const existingSubIdx = updatedSubmissions.findIndex(
          (s) => s.id === subId || (s.assignmentId === colId && s.nisn === nisn)
        );
        const existingSub = existingSubIdx >= 0 ? updatedSubmissions[existingSubIdx] : null;
        const targetSubId = existingSub?.id || subId;
        const stuObj = studentsList.find(s => s.nisn === nisn);
        const stName = existingSub?.studentName || stuObj?.displayName || stuObj?.studentName || stuObj?.name || "";
        const stKelas = existingSub?.kelas || stuObj?.kelas || "";

        const subData = {
          id: targetSubId,
          assignmentId: colId,
          nisn: nisn,
          studentName: stName,
          kelas: stKelas,
          nilai: numVal,
          status: numVal !== null ? "sudah dinilai" : (existingSub?.status || "menunggu"),
          submittedAt: existingSub?.submittedAt || colStartDate || new Date().toISOString(),
          startDate: colStartDate,
          publishedAt: colStartDate,
          isManualColumn: Boolean(asgObj?.isManualColumn || examObj?.isManualColumn),
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(
            doc(db, "submissions", targetSubId),
            subData,
            { merge: true }
          );
        } catch (subFsErr) {
          console.warn("Firestore submission save warning:", subFsErr);
        }

        if (existingSubIdx >= 0) {
          updatedSubmissions[existingSubIdx] = { ...updatedSubmissions[existingSubIdx], ...subData };
        } else {
          updatedSubmissions.push(subData);
        }
      }

      setFinalGradesList(updatedFinalGrades);
      setSubmissionsList(updatedSubmissions);
      setLocalCache("firas_cache_final_grades", updatedFinalGrades);
      setLocalCache("firas_cache_submissions", updatedSubmissions);

      setEditedRekapGrades({});
      setIsEditingRekapTable(false);
      showAlert("Berhasil", "Semua nilai berhasil disimpan ke database dan otomatis sinkron ke dashboard siswa!", "alert");
    } catch (err: any) {
      console.warn("Gagal menyimpan edit nilai rekap:", err);
      showAlert("Gagal", "Terjadi kesalahan saat menyimpan nilai: " + (err.message || err), "danger");
    } finally {
      setIsSavingRekapGrades(false);
    }
  };

  const handleCreateManualColumn = async (formData?: {
    type?: "Tugas" | "CBT";
    materi: string;
    bab: string;
    kelas?: string;
    selectedClasses?: string[];
    publishDate: string;
    description?: string;
  }) => {
    const colType = formData?.type || "Tugas";
    const targetMateri = formData?.materi || manualMateri;
    const targetBab = formData?.bab || manualBab;
    const targetPubDate = formData?.publishDate || manualPublishDate;
    const targetDesc = formData?.description || `Kolom Nilai ${colType} Manual (Buku Nilai)`;

    if (!targetMateri.trim()) {
      showAlert("Validasi", `Judul / Nama ${colType} wajib diisi.`, "alert");
      return;
    }
    if (!targetBab) {
      showAlert("Validasi", "Pilih Bab terlebih dahulu.", "alert");
      return;
    }

    const targetClasses =
      formData?.selectedClasses && formData.selectedClasses.length > 0
        ? formData.selectedClasses
        : formData?.kelas && formData.kelas !== "ALL" && formData.kelas !== "SEMUA_KELAS"
        ? [formData.kelas]
        : classesList.map((c) => c.name || c.id);

    if (targetClasses.length === 0) {
      showAlert("Validasi", "Pilih minimal satu kelas sasaran.", "alert");
      return;
    }

    const kelasRefStr =
      targetClasses.length === classesList.length
        ? "SEMUA_KELAS"
        : targetClasses.join(", ");

    setIsSavingManualColumn(true);
    try {
      const pubDate = targetPubDate ? new Date(targetPubDate).toISOString() : new Date().toISOString();

      if (colType === "CBT") {
        const isPts = /pts|uts|tengah\s*semester/i.test(targetMateri);
        const isPas = /pas|sas|uas|akhir\s*semester/i.test(targetMateri);
        const examCategory = isPts
          ? "Penilaian Tengah Semester"
          : isPas
          ? "Penilaian Sumatif Akhir Semester"
          : "CBT / Evaluasi";

        const newExamId = `EXM-MANUAL-${Date.now()}`;
        const newExamDoc = {
          id: newExamId,
          title: targetMateri.trim(),
          materi: targetMateri.trim(),
          subject: "Informatika",
          bab: targetBab,
          kelasRef: kelasRefStr,
          targetClasses: targetClasses,
          targets: targetClasses.map((k) => ({
            kelas: k,
            startDate: pubDate,
          })),
          startDate: pubDate,
          publishedAt: pubDate,
          createdAt: pubDate,
          updatedAt: new Date().toISOString(),
          duration: 60 * 60,
          kkm: 75,
          category: examCategory,
          description: targetDesc,
          isManualColumn: true,
          type: "CBT",
          questions: [],
          teacherId: user?.uid || "mock-admin",
        };

        await setDoc(doc(db, "exams", newExamId), newExamDoc);

        const updatedExams = [newExamDoc, ...examsList];
        setExamsList(updatedExams);
        setLocalCache("firas_cache_exams_v2", updatedExams);
      } else {
        const newAssignmentId = `TGS-MANUAL-${Date.now()}`;
        const newDoc = {
          id: newAssignmentId,
          bab: targetBab,
          materi: targetMateri.trim(),
          title: targetMateri.trim(),
          kelas: kelasRefStr,
          kelasRef: kelasRefStr,
          targetClasses: targetClasses,
          targets: targetClasses.map((k) => ({
            kelas: k,
            startDate: pubDate,
            publishedAt: pubDate,
            deadline: new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })),
          startDate: pubDate,
          publishedAt: pubDate,
          deadline: new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          description: targetDesc,
          isManualColumn: true,
          type: "Tugas",
          createdAt: pubDate,
          updatedAt: new Date().toISOString(),
          teacherId: user?.uid || "mock-admin",
        };

        await setDoc(doc(db, "assignments", newAssignmentId), newDoc);

        const updatedAssignments = [newDoc, ...assignmentsList];
        setAssignmentsList(updatedAssignments);
        setLocalCache("firas_cache_assignments_v2", updatedAssignments);
      }

      setIsAddManualColumnOpen(false);
      setManualBab("");
      setManualMateri("");
      setManualKelas("");
      setManualPublishDate(new Date().toISOString().split("T")[0]);

      // Automatically enable edit mode so teacher can input scores directly in table
      setIsEditingRekapTable(true);
      showAlert(
        "Berhasil",
        `Kolom ${colType} '${targetMateri.trim()}' berhasil ditambahkan untuk ${targetClasses.length} kelas! Anda dapat langsung menginput nilai siswa pada kolom tersebut.`,
        "alert"
      );
    } catch (err: any) {
      console.warn("Gagal menambah kolom manual:", err);
      showAlert("Gagal", "Gagal menambahkan kolom nilai: " + (err.message || err), "danger");
    } finally {
      setIsSavingManualColumn(false);
    }
  };

  const handlePromptDeleteRekapColumn = (
    colId: string,
    colTitle: string,
    colType: "assignment" | "exam",
    scope?: "class_only" | "all_classes"
  ) => {
    const typeLabel = colType === "exam" ? "CBT" : "Tugas";
    const currentClass = selectedClassFilter?.trim();
    const isFilteredBySpecificClass =
      !!currentClass &&
      currentClass !== "SEMUA_KELAS" &&
      currentClass !== "ALL" &&
      currentClass !== "Semua Kelas";

    // Find the item
    const existingItem =
      colType === "exam"
        ? examsList.find((e) => e.id === colId)
        : assignmentsList.find((a) => a.id === colId);

    // Determine current target classes
    let currentClasses: string[] = [];
    if (existingItem?.targetClasses && Array.isArray(existingItem.targetClasses) && existingItem.targetClasses.length > 0) {
      currentClasses = existingItem.targetClasses.map((c: any) => c.toString().trim()).filter(Boolean);
    } else if (existingItem?.targets && Array.isArray(existingItem.targets) && existingItem.targets.length > 0) {
      currentClasses = existingItem.targets
        .map((t: any) => (typeof t === "string" ? t : (t?.kelas || t?.name || "")).toString().trim())
        .filter(Boolean);
    } else if (existingItem?.kelas && existingItem.kelas.toString().trim()) {
      const rawK = existingItem.kelas.toString().trim();
      if (rawK.toLowerCase() === "semua_kelas" || rawK.toLowerCase() === "all" || rawK.toLowerCase() === "semua kelas") {
        currentClasses = classesList.map((c: any) => c.name?.trim()).filter(Boolean);
      } else {
        currentClasses = rawK.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    } else {
      // Default to all school classes
      currentClasses = classesList.map((c: any) => c.name?.trim()).filter(Boolean);
    }

    // Deduplicate current classes
    currentClasses = Array.from(new Set(currentClasses));

    // Determine if deleting for this specific class only or for all classes
    const shouldDeleteOnlyForClass =
      scope === "class_only" ||
      (scope !== "all_classes" && isFilteredBySpecificClass && currentClasses.length > 1);

    if (shouldDeleteOnlyForClass && isFilteredBySpecificClass) {
      const remainingClasses = currentClasses.filter(
        (c) => !isClassMatch(c, currentClass)
      );
      const remainingPreview =
        remainingClasses.slice(0, 4).join(", ") +
        (remainingClasses.length > 4 ? ` (+${remainingClasses.length - 4} kelas)` : "");

      // If no remaining classes left, delete permanently for all classes
      if (remainingClasses.length === 0) {
        handlePromptDeleteRekapColumn(colId, colTitle, colType, "all_classes");
        return;
      }

      showConfirm(
        `Hapus Kolom untuk Kelas ${currentClass}`,
        `Apakah Anda yakin ingin menghapus kolom ${typeLabel} "${colTitle}" KHUSUS untuk Kelas ${currentClass}?\n\n• Kolom ini HANYA akan dihapus dari Kelas ${currentClass}.\n• Kolom dan nilai di kelas lain (${remainingPreview || "kelas lain"}) TETAP AMAN dan TIDAK akan terhapus.`,
        async () => {
          try {
            const updatedDocData: any = {
              targetClasses: remainingClasses,
              kelas: remainingClasses.join(", "),
              kelasRef: remainingClasses[0] || "",
              updatedAt: new Date().toISOString(),
            };

            if (existingItem?.targets && Array.isArray(existingItem.targets)) {
              updatedDocData.targets = existingItem.targets.filter((t: any) => {
                const k = (typeof t === "string" ? t : (t?.kelas || t?.name || "")).toString().trim();
                return !isClassMatch(k, currentClass);
              });
            }

            if (existingItem?.selectedClasses && Array.isArray(existingItem.selectedClasses)) {
              updatedDocData.selectedClasses = existingItem.selectedClasses.filter((c: any) =>
                !isClassMatch(c.toString().trim(), currentClass)
              );
            }

            const docRef = doc(db, colType === "exam" ? "exams" : "assignments", colId);
            await dbSetDoc(docRef, updatedDocData, { merge: true });

            // Purge final_grades and submissions for students of THIS class from Firestore and Supabase
            const studentsInClass = studentsList.filter((s) => isClassMatch(s.kelas, currentClass));
            const studentNisns = new Set(studentsInClass.map((s) => s.nisn).filter(Boolean));

            for (const nisn of studentNisns) {
              try {
                await dbDeleteDoc(doc(db, "final_grades", `${colId}_${nisn}`), "final_grades", `${colId}_${nisn}`);
              } catch (_) {}
              try {
                await dbDeleteDoc(doc(db, "final_grades", `FG-${nisn}-${colId}`), "final_grades", `FG-${nisn}-${colId}`);
              } catch (_) {}
              try {
                await dbDeleteDoc(doc(db, "submissions", `SUB-${nisn}-${colId}`), "submissions", `SUB-${nisn}-${colId}`);
              } catch (_) {}
            }

            if (isSupabaseConfigured && supabase) {
              try {
                for (const nisn of studentNisns) {
                  await supabase.from("final_grades").delete().eq("assignment_id", colId).eq("nisn", nisn);
                  await supabase.from("final_grades").delete().eq("exam_id", colId).eq("nisn", nisn);
                }
              } catch (_) {}
            }

            // Update in-memory state
            if (colType === "exam") {
              const updatedExams = examsList.map((e) =>
                e.id === colId ? { ...e, ...updatedDocData } : e
              );
              setExamsList(updatedExams);
              setLocalCache("firas_cache_exams_v2", updatedExams);
            } else {
              const updatedAssignments = assignmentsList.map((a) =>
                a.id === colId ? { ...a, ...updatedDocData } : a
              );
              setAssignmentsList(updatedAssignments);
              setLocalCache("firas_cache_assignments_v2", updatedAssignments);
            }

            const updatedFinalGrades = finalGradesList.filter(
              (g) => !((g.assignmentId === colId || g.examId === colId) && studentNisns.has(g.nisn))
            );
            setFinalGradesList(updatedFinalGrades);
            setLocalCache("firas_cache_final_grades", updatedFinalGrades);

            setIsDeleteColumnModalOpen(false);
            clearTeacherCaches();

            showAlert(
              "Berhasil Dihapus dari Kelas",
              `Kolom ${typeLabel} "${colTitle}" berhasil dihapus dari Kelas ${currentClass}. Kolom di kelas lain tetap aman tersimpan!`,
              "alert"
            );
          } catch (err: any) {
            console.warn("Gagal memperbarui kolom kelas:", err);
            showAlert(
              "Gagal",
              "Terjadi kesalahan saat menghapus kolom dari kelas: " + (err.message || err),
              "danger"
            );
          }
        }
      );
    } else {
      // Deleting for ALL classes (or this was the only class)
      const warningText =
        isFilteredBySpecificClass && currentClasses.length <= 1
          ? `Kolom ${typeLabel} "${colTitle}" hanya terdaftar untuk Kelas ${currentClass}. Menghapusnya akan menghapus penilaian ini secara permanen dari sistem.`
          : `Apakah Anda yakin ingin menghapus kolom nilai ${typeLabel} "${colTitle}" untuk SEMUA KELAS?\n\nKolom ini akan dihapus permanen dari Buku Nilai seluruh kelas beserta seluruh riwayat nilai terkait.`;

      showConfirm(
        `Hapus Kolom ${typeLabel} (Semua Kelas)`,
        warningText,
        async () => {
          try {
            // 1. Delete main assignment or exam document from Firestore AND Supabase
            if (colType === "exam") {
              await dbDeleteDoc(doc(db, "exams", colId), "exams", colId);
              if (isSupabaseConfigured && supabase) {
                try {
                  await supabase.from("exams").delete().eq("id", colId);
                  await supabase.from("app_collections").delete().eq("id", `exams_${colId}`);
                  await supabase.from("app_collections").delete().eq("collection_name", "exams").eq("doc_id", colId);
                } catch (_) {}
              }
              const updatedExams = examsList.filter((e) => e.id !== colId);
              setExamsList(updatedExams);
              setLocalCache("firas_cache_exams_v2", updatedExams);
            } else {
              await dbDeleteDoc(doc(db, "assignments", colId), "assignments", colId);
              if (isSupabaseConfigured && supabase) {
                try {
                  await supabase.from("app_collections").delete().eq("id", `assignments_${colId}`);
                  await supabase.from("app_collections").delete().eq("collection_name", "assignments").eq("doc_id", colId);
                } catch (_) {}
              }
              const updatedAssignments = assignmentsList.filter((a) => a.id !== colId);
              setAssignmentsList(updatedAssignments);
              setLocalCache("firas_cache_assignments_v2", updatedAssignments);
            }

            // 2. Delete all related final_grades in Firestore and Supabase
            try {
              const fgAsgSnap = await getDocs(
                query(collection(db, "final_grades"), where("assignmentId", "==", colId))
              );
              for (const d of fgAsgSnap.docs) {
                await dbDeleteDoc(d.ref, "final_grades", d.id);
              }
              const fgExamSnap = await getDocs(
                query(collection(db, "final_grades"), where("examId", "==", colId))
              );
              for (const d of fgExamSnap.docs) {
                await dbDeleteDoc(d.ref, "final_grades", d.id);
              }
              const matchedGrades = finalGradesList.filter(
                (g) => g.assignmentId === colId || g.examId === colId || (g.id && g.id.includes(colId))
              );
              for (const g of matchedGrades) {
                try {
                  await dbDeleteDoc(doc(db, "final_grades", g.id), "final_grades", g.id);
                } catch (_) {}
              }
            } catch (errFg) {
              console.warn("Error deleting related final_grades:", errFg);
            }

            // 3. Delete all related submissions in Firestore and Supabase
            try {
              const subSnap = await getDocs(
                query(collection(db, "submissions"), where("assignmentId", "==", colId))
              );
              for (const d of subSnap.docs) {
                await dbDeleteDoc(d.ref, "submissions", d.id);
              }
              const matchedSubs = submissionsList.filter(
                (s) => s.assignmentId === colId || (s.id && s.id.includes(colId))
              );
              for (const s of matchedSubs) {
                try {
                  await dbDeleteDoc(doc(db, "submissions", s.id), "submissions", s.id);
                } catch (_) {}
              }
            } catch (errSub) {
              console.warn("Error deleting related submissions:", errSub);
            }

            // 4. Delete from Supabase tables
            if (isSupabaseConfigured && supabase) {
              try {
                await supabase.from("final_grades").delete().eq("assignment_id", colId);
                await supabase.from("final_grades").delete().eq("exam_id", colId);
                await supabase.from("app_collections").delete().eq("collection_name", "final_grades").filter("data->>assignmentId", "eq", colId);
                await supabase.from("app_collections").delete().eq("collection_name", "submissions").filter("data->>assignmentId", "eq", colId);
              } catch (_) {}
            }

            // 5. Add to persistent deletedColumnIds
            setDeletedColumnIds((prev) => {
              const next = new Set(prev);
              next.add(colId);
              try {
                localStorage.setItem("firas_deleted_column_ids", JSON.stringify(Array.from(next)));
              } catch (_) {}
              return next;
            });

            // 6. Force refresh teacher data
            await fetchTeacherData(true);
            setIsDeleteColumnModalOpen(false);

            showAlert(
              "Berhasil Dihapus",
              `Kolom ${typeLabel} "${colTitle}" beserta seluruh riwayat nilai telah berhasil dihapus secara permanen dari sistem.`,
              "alert"
            );
          } catch (err: any) {
            console.warn("Gagal menghapus kolom:", err);
            showAlert(
              "Gagal",
              "Terjadi kesalahan saat menghapus kolom: " + (err.message || err),
              "danger"
            );
          }
        }
      );
    }
  };

  const handleOpenEditColumnModal = (col?: any) => {
    if (col && col.id) {
      setEditingColumnId(col.id);
    } else {
      const firstCol = assignmentsList[0]?.id || examsList[0]?.id || null;
      setEditingColumnId(firstCol);
    }
    setIsEditColumnModalOpen(true);
  };

  const handleSaveEditedColumn = async (editData: ColumnEditData) => {
    setIsSavingEditColumn(true);
    try {
      const { id, type, originalType, title, bab, selectedClasses, startDate, deadline, description } = editData;
      const pubDate = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      const deadlineIso = deadline ? new Date(deadline).toISOString() : undefined;
      const kelasRefStr = selectedClasses.length === classesList.length ? "SEMUA_KELAS" : selectedClasses.join(", ");

      const typeChanged = type !== originalType;

      if (!typeChanged) {
        if (type === "CBT") {
          const existingExam = examsList.find((e) => e.id === id) || {};
          const updatedExam = {
            ...existingExam,
            id,
            title: title.trim(),
            materi: title.trim(),
            bab,
            targetClasses: selectedClasses,
            kelasRef: kelasRefStr,
            targets: selectedClasses.map((k) => ({ kelas: k, startDate: pubDate })),
            startDate: pubDate,
            publishedAt: pubDate,
            description: description !== undefined ? description : existingExam.description,
            updatedAt: new Date().toISOString(),
            type: "CBT",
          };
          await setDoc(doc(db, "exams", id), updatedExam);
          const newExamsList = examsList.map((e) => (e.id === id ? updatedExam : e));
          setExamsList(newExamsList);
          setLocalCache("firas_cache_exams_v2", newExamsList);
        } else {
          const existingAssign = assignmentsList.find((a) => a.id === id) || {};
          const updatedAssign = {
            ...existingAssign,
            id,
            title: title.trim(),
            materi: title.trim(),
            bab,
            targetClasses: selectedClasses,
            kelasRef: kelasRefStr,
            kelas: kelasRefStr,
            targets: selectedClasses.map((k) => ({
              kelas: k,
              startDate: pubDate,
              publishedAt: pubDate,
              deadline: deadlineIso || existingAssign.deadline || new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            })),
            startDate: pubDate,
            publishedAt: pubDate,
            deadline: deadlineIso || existingAssign.deadline || new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            description: description !== undefined ? description : existingAssign.description,
            updatedAt: new Date().toISOString(),
            type: "Tugas",
          };
          await setDoc(doc(db, "assignments", id), updatedAssign);
          const newAssignList = assignmentsList.map((a) => (a.id === id ? updatedAssign : a));
          setAssignmentsList(newAssignList);
          setLocalCache("firas_cache_assignments_v2", newAssignList);
        }
      } else {
        // Changed type between Tugas and CBT
        if (type === "CBT" && originalType === "Tugas") {
          const existingAssign = assignmentsList.find((a) => a.id === id) || {};
          const newExamDoc = {
            ...existingAssign,
            id,
            title: title.trim(),
            materi: title.trim(),
            subject: existingAssign.subject || "Informatika",
            bab,
            targetClasses: selectedClasses,
            kelasRef: kelasRefStr,
            targets: selectedClasses.map((k) => ({ kelas: k, startDate: pubDate })),
            startDate: pubDate,
            publishedAt: pubDate,
            createdAt: existingAssign.createdAt || pubDate,
            updatedAt: new Date().toISOString(),
            duration: existingAssign.duration || 60 * 60,
            kkm: existingAssign.kkm || 75,
            category: "CBT / Evaluasi",
            description: description !== undefined ? description : (existingAssign.description || ""),
            type: "CBT",
            questions: existingAssign.questions || [],
            teacherId: user?.uid || "mock-admin",
          };

          await setDoc(doc(db, "exams", id), newExamDoc);
          await deleteDoc(doc(db, "assignments", id));

          const newAssignList = assignmentsList.filter((a) => a.id !== id);
          const newExamsList = [newExamDoc, ...examsList.filter((e) => e.id !== id)];
          setAssignmentsList(newAssignList);
          setExamsList(newExamsList);
          setLocalCache("firas_cache_assignments_v2", newAssignList);
          setLocalCache("firas_cache_exams_v2", newExamsList);
        } else if (type === "Tugas" && originalType === "CBT") {
          const existingExam = examsList.find((e) => e.id === id) || {};
          const newAssignDoc = {
            ...existingExam,
            id,
            title: title.trim(),
            materi: title.trim(),
            bab,
            targetClasses: selectedClasses,
            kelasRef: kelasRefStr,
            kelas: kelasRefStr,
            targets: selectedClasses.map((k) => ({
              kelas: k,
              startDate: pubDate,
              publishedAt: pubDate,
              deadline: deadlineIso || new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            })),
            startDate: pubDate,
            publishedAt: pubDate,
            deadline: deadlineIso || new Date(new Date(pubDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: existingExam.createdAt || pubDate,
            updatedAt: new Date().toISOString(),
            description: description !== undefined ? description : (existingExam.description || ""),
            type: "Tugas",
            teacherId: user?.uid || "mock-admin",
          };

          await setDoc(doc(db, "assignments", id), newAssignDoc);
          await deleteDoc(doc(db, "exams", id));

          const newExamsList = examsList.filter((e) => e.id !== id);
          const newAssignList = [newAssignDoc, ...assignmentsList.filter((a) => a.id !== id)];
          setExamsList(newExamsList);
          setAssignmentsList(newAssignList);
          setLocalCache("firas_cache_exams_v2", newExamsList);
          setLocalCache("firas_cache_assignments_v2", newAssignList);
        }
      }

      setIsEditColumnModalOpen(false);
      showAlert("Berhasil", `Identitas kolom '${title.trim()}' berhasil diperbarui!`, "alert");
    } catch (err: any) {
      console.warn("Gagal memperbarui kolom:", err);
      showAlert("Gagal", `Gagal memperbarui identitas kolom: ${err?.message || err}`, "danger");
      throw err;
    } finally {
      setIsSavingEditColumn(false);
    }
  };

  const handleDeleteStudent = async (id: string, nisn?: string) => {
    showConfirm(
      "Hapus Siswa",
      "Apakah Anda yakin ingin menghapus siswa ini? Seluruh data riwayat tugas siswa ini akan tetap ada namun akun tidak bisa login.",
      async () => {
        try {
          // Always delete using the primary Firestore document ID
          await deleteDoc(doc(db, "studentsByNisn", id));
          
          // Also delete by nisn as fallback if it exists and differs from id
          if (nisn && nisn !== id) {
            try {
              await deleteDoc(doc(db, "studentsByNisn", nisn));
            } catch (innerErr) {
              // Ignore if already deleted
            }
          }
          
          showAlert("Berhasil", "Data siswa berhasil dihapus.", "alert");
          localStorage.removeItem("firas_cache_students");
          fetchTeacherData(false);
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.DELETE,
            `studentsByNisn/${id}`,
          );
        }
      },
      "Hapus Siswa"
    );
  };

  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  const handleEditStudent = (stud: any) => {
    setEditingStudent(stud);
  };

  const handleSaveEditStudent = async (updatedData: {
    displayName: string;
    kelas: string;
    nisn: string;
    accessCode: string;
  }) => {
    if (!editingStudent) return;
    const docId = editingStudent.id || editingStudent.nisn || updatedData.nisn;
    try {
      await setDoc(
        doc(db, "studentsByNisn", docId),
        {
          displayName: updatedData.displayName,
          kelas: updatedData.kelas,
          nisn: updatedData.nisn,
          accessCode: updatedData.accessCode || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // Perbarui local state studentsList agar langsung terlihat
      setStudentsList((prev) =>
        prev.map((s) =>
          (s.id === docId || s.nisn === editingStudent.nisn)
            ? { ...s, ...updatedData }
            : s
        )
      );

      // Invalidate cache
      localStorage.removeItem("firas_cache_students");

      trackUsage(0, 1);
      showAlert("Berhasil", `Data siswa ${updatedData.displayName} berhasil diperbarui.`, "alert");
      setEditingStudent(null);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `studentsByNisn/${docId}`,
      );
      throw error;
    }
  };

  const [activeClassTab, setActiveClassTab] = useState<"tambah" | "daftar">(
    "tambah",
  );
  const [activeStudentClassTab, setActiveStudentClassTab] = useState<
    "input-siswa" | "input-kelas" | "daftar-siswa"
  >("input-siswa");
  const [activeStudentTab, setActiveStudentTab] = useState<"tambah" | "daftar">(
    "tambah",
  );
  const [activeAssignmentTab, setActiveAssignmentTab] = useState<
    "tambah" | "daftar"
  >("tambah");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"Semua" | "Aktif" | "Selesai" | "Kedaluwarsa">("Semua");
  const [previewAssignment, setPreviewAssignment] = useState<any | null>(null);

  const [activeNilaiTab, setActiveNilaiTab] = useState<
    "cek-tugas" | "rekapitulasi"
  >("cek-tugas");

  useEffect(() => {
    if (activeMenu === "manajemen-nilai" && activeNilaiTab === "cek-tugas" && !isFirebaseQuotaExhausted()) {
      const q = collection(db, "submissions");
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const subs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setSubmissionsList(subs);
          setLocalCache("firas_cache_submissions", subs);
        },
        (error) => {
          console.warn("Gagal sinkron otomatis respon tugas realtime:", error);
          const msg = error && (error as any).message ? (error as any).message.toLowerCase() : String(error).toLowerCase();
          if (msg.includes('quota') || msg.includes('resource-exhausted') || msg.includes('exceeded')) {
            window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
          }
        }
      );
      return () => unsubscribe();
    }
  }, [activeMenu, activeNilaiTab]);
  const [activePresensiTab, setActivePresensiTab] = useState<
    "input" | "preview" | "analisis"
  >("input");
  const [sessionUsage, setSessionUsage] = useState({ reads: 0, writes: 0 });
  const [readAnnIds, setReadAnnIds] = useState<string[]>([]);

  // WhatsApp Share Modal States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waStudent, setWaStudent] = useState<any>(null);
  const [waParentPhone, setWaParentPhone] = useState("");
  const [waDraftMessage, setWaDraftMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(false);

  // Zoom Student Photo Modal States
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [zoomedStudentName, setZoomedStudentName] = useState<string>("");

  const handleBukaWhatsAppModal = (
    stu: any,
    studentGrades: { title: string; type: string; nilai: string }[],
    percentage: number | string,
    stats: { Hadir: number; Sakit: number; Izin: number; Alpa: number; Dispen: number },
    totalMeetings: number,
    ipk: string,
    nilaiRapor?: number
  ) => {
    setWaStudent(stu);
    const text = buildParentWaReportText({
      student: stu,
      attendanceStats: stats,
      totalMeetings,
      percentage,
      gradeItems: studentGrades,
      ipk,
      nilaiRapor,
      subjectName: userSettings.subjectName,
    });

    setWaDraftMessage(text);
    setWaParentPhone(stu.parentPhone || "628");
    setIsWaModalOpen(true);
    setCopiedIndex(false);
  };

  const collectStudentReportData = (stu: any) => {
    const targetClass = stu.kelas || selectedClassFilter;
    const studentAbs = absensiByNisnLookup.get(stu.nisn) || absensiList;
    const absCounts = getStudentAbsensiCounts(stu, studentAbs, targetClass);
    const studentGradesMap = finalGradesByNisnLookup.get(stu.nisn);
    const studentSubs = submissionsByNisnLookup.get(stu.nisn) || [];

    const gradeItems: { title: string; type: string; bab: string; tanggal: string; nilai: number }[] = [];
    const tugasVals: number[] = [];
    let nilaiUts = 0;
    let nilaiUas = 0;

    assignmentsList
      .filter((a) => isAssignmentForClass(a, targetClass) && !deletedColumnIds.has(a.id))
      .forEach((a) => {
        const sub = studentSubs.find((s) => s.assignmentId === a.id);
        const fGrade = studentGradesMap?.get(a.id);
        const cellKey = `${a.id}_${stu.nisn}`;
        const rawScore =
          editedRekapGrades[cellKey] !== undefined
            ? editedRekapGrades[cellKey]
            : sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai"
            ? sub.nilai
            : fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== ""
            ? fGrade.nilai
            : sub?.nilai;

        if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
          const num = Number(rawScore);
          tugasVals.push(num);
          const dRaw = sub?.submittedAt || a.publishedAt || a.createdAt;
          gradeItems.push({
            title: a.materi || a.title || "Tugas",
            type: "Tugas",
            bab: a.bab || "-",
            tanggal: dRaw ? new Date(dRaw).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
            nilai: num,
          });
        } else {
          tugasVals.push(0);
        }
      });

    examsList
      .filter((e) => isExamForClass(e, targetClass) && !deletedColumnIds.has(e.id))
      .forEach((e) => {
        const fGrade = studentGradesMap?.get(e.id);
        const cellKey = `${e.id}_${stu.nisn}`;
        const rawScore =
          editedRekapGrades[cellKey] !== undefined
            ? editedRekapGrades[cellKey]
            : fGrade?.nilai ?? fGrade?.score;

        if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
          const num = Number(rawScore);
          if (isPTSItem(e)) nilaiUts = num;
          else if (isPASItem(e)) nilaiUas = num;
          else tugasVals.push(num);

          const dRaw = fGrade?.submittedAt || e.createdAt;
          gradeItems.push({
            title: e.title || "Ujian CBT",
            type: "Ujian CBT",
            bab: e.bab || "-",
            tanggal: dRaw ? new Date(dRaw).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
            nilai: num,
          });
        } else {
          if (isPTSItem(e)) nilaiUts = 0;
          else if (isPASItem(e)) nilaiUas = 0;
          else tugasVals.push(0);
        }
      });

    const avgTugas = tugasVals.length > 0 ? Math.round(tugasVals.reduce((a, b) => a + b, 0) / tugasVals.length) : 0;
    const nilaiKehadiran = absCounts.total > 0 ? absCounts.persentase : 100;
    const finalRaporScore = calculateNilaiRapor(stu);

    return {
      absCounts,
      nilaiKehadiran,
      avgTugas,
      nilaiUts,
      nilaiUas,
      gradeItems,
      finalRaporScore,
    };
  };

  const handleQuickStudentRaporPdf = async (stu: any) => {
    try {
      setIsGeneratingPdf(true);
      const data = collectStudentReportData(stu);
      await generateStudentRaporPdf({
        student: stu,
        userSettings,
        rubric,
        attendanceStats: {
          hadir: data.absCounts.hadir,
          sakit: data.absCounts.sakit,
          izin: data.absCounts.izin,
          alpa: data.absCounts.alpa,
          dispen: data.absCounts.dispen,
          total: data.absCounts.total,
          persentase: data.nilaiKehadiran,
        },
        gradeItems: data.gradeItems,
        componentScores: {
          nilaiKehadiran: data.nilaiKehadiran,
          avgTugas: data.avgTugas,
          nilaiUts: data.nilaiUts,
          nilaiUas: data.nilaiUas,
        },
        finalRaporScore: data.finalRaporScore,
        kkm: 75,
      });
    } catch (err: any) {
      showAlert("Gagal", `Gagal mengunduh rapor siswa: ${err.message || err}`, "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleQuickStudentWaSummary = (stu: any) => {
    const data = collectStudentReportData(stu);
    const avgEval =
      data.gradeItems.length > 0
        ? (data.gradeItems.reduce((s, g) => s + g.nilai, 0) / data.gradeItems.length).toFixed(1)
        : "0";
    handleBukaWhatsAppModal(
      stu,
      data.gradeItems.map((g) => ({ title: g.title, type: g.type, nilai: String(g.nilai) })),
      data.nilaiKehadiran,
      {
        Hadir: data.absCounts.hadir,
        Sakit: data.absCounts.sakit,
        Izin: data.absCounts.izin,
        Alpa: data.absCounts.alpa,
        Dispen: data.absCounts.dispen,
      },
      data.absCounts.total,
      avgEval,
      data.finalRaporScore
    );
  };

  const dashboardStats = useMemo(() => {
    const finishedStudentsCount = new Set(finalGradesList.map(g => g.nisn)).size;
    const averageScore = finalGradesList.length > 0 
      ? (finalGradesList.reduce((sum, g) => sum + (Number(g.nilai) || 0), 0) / finalGradesList.length).toFixed(1)
      : "0";
    
    return {
      activeExams: examsList.length,
      finishedStudents: finishedStudentsCount,
      averageScore
    };
  }, [examsList, finalGradesList]);

  const rankings = useMemo(() => {
    if (!selectedClassFilter || studentsList.length === 0 || !rubric) return new Map();
    
    const studentsInClass = studentsList.filter(s => isClassMatch(s.kelas, selectedClassFilter));
    if (studentsInClass.length === 0) return new Map();

    const studentPerformance = studentsInClass.map((stu: any) => {
      // 1. Nilai Kehadiran
      let stuHadirCount = 0;
      let stuTotalMeetings = 0;
      absensiList.forEach((a: any) => {
        if (isClassMatch(a.kelasRef, selectedClassFilter)) {
          stuTotalMeetings++;
          if (a.data && a.data[stu.nisn]) {
            const sStatus = String(a.data[stu.nisn]).toLowerCase();
            if (sStatus === "hadir" || sStatus === "dispen") {
              stuHadirCount++;
            }
          }
        }
      });
      const nilaiKehadiran = stuTotalMeetings > 0 ? (stuHadirCount / stuTotalMeetings) * 100 : 0;

      // 2. Nilai Tugas & Harian
      const stuGrades = finalGradesList.filter((g: any) => g.nisn === stu.nisn);
      const tugasItems = stuGrades.filter((g: any) => {
        if (g.type === "Tugas") return true;
        const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
        return !isPTSItem(exam || g) && !isPASItem(exam || g);
      });
      const avgTugas = tugasItems.length > 0 
        ? tugasItems.reduce((sum: number, item: any) => sum + (Number(item.nilai) || 0), 0) / tugasItems.length 
        : 0;

      // 3. Nilai UTS
      const utsItem = stuGrades.find((g: any) => {
        const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
        return isPTSItem(exam || g);
      });
      const nilaiUts = utsItem ? (Number(utsItem.nilai) || 0) : 0;

      // 4. Nilai UAS
      const uasItem = stuGrades.find((g: any) => {
        const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
        return isPASItem(exam || g);
      });
      const nilaiUas = uasItem ? (Number(uasItem.nilai) || 0) : 0;

      // Final Calculation based on teacher's rubric
      const finalScore = (
        (nilaiKehadiran * (rubric.kehadiran / 100)) +
        (avgTugas * (rubric.tugas / 100)) +
        (nilaiUts * (rubric.uts / 100)) +
        (nilaiUas * (rubric.uas / 100))
      );

      return {
        nisn: stu.nisn,
        finalScore: finalScore
      };
    });

    studentPerformance.sort((a, b) => b.finalScore - a.finalScore);

    const rankMap = new Map();
    studentPerformance.forEach((item, index) => {
      rankMap.set(item.nisn, index + 1);
    });

    return rankMap;
  }, [studentsList, selectedClassFilter, finalGradesList, absensiList, examsList, rubric]);

  const rekapTableColumns = useMemo(() => {
    const cols: any[] = [];
    const addedIds = new Set<string>();

    // 1. Filtered assignments (strictly for selected class or all classes)
    assignmentsList.forEach((a) => {
      if (deletedColumnIds.has(a.id)) return;
      if (isAssignmentForClass(a, selectedClassFilter)) {
        if (!addedIds.has(a.id)) {
          addedIds.add(a.id);
          cols.push({
            id: a.id,
            title: a.materi || a.title || "Tugas",
            type: "assignment" as const,
            bab: a.bab,
            targetClasses: a.targetClasses,
            kelasRef: a.kelasRef || a.kelas,
            date: (() => {
              if (selectedClassFilter && selectedClassFilter !== "SEMUA_KELAS" && a.targets && Array.isArray(a.targets)) {
                const target = a.targets.find((t: any) => isClassMatch(t.kelas || t.name || t, selectedClassFilter));
                if (target && target.publishedAt) return target.publishedAt;
              }
              return a.startDate || a.publishedAt || a.createdAt;
            })(),
            deadline: a.deadline,
            rawDoc: a,
          });
        }
      }
    });

    // 2. Filtered exams (strictly for selected class, universal pretest, or all classes)
    examsList.forEach((e) => {
      if (deletedColumnIds.has(e.id)) return;
      if (isExamForClass(e, selectedClassFilter)) {
        if (!addedIds.has(e.id)) {
          addedIds.add(e.id);
          cols.push({
            id: e.id,
            title: e.title || e.materi || "CBT",
            type: "exam" as const,
            bab: e.bab,
            targetClasses: e.targetClasses,
            kelasRef: e.kelasRef,
            date: (() => {
              if (selectedClassFilter && selectedClassFilter !== "SEMUA_KELAS") {
                const targets = e.targets || e.targetClasses || e.selectedClasses || e.classes;
                if (Array.isArray(targets)) {
                   const target = targets.find((t: any) => isClassMatch(t.kelas || t.name || t, selectedClassFilter));
                   if (target && target.publishedAt) return target.publishedAt;
                }
              }
              return e.startDate || e.publishedAt || e.createdAt;
            })(),
            deadline: null,
            rawDoc: e,
          });
        }
      }
    });

    // 3. Fallback: Truly manual columns in finalGradesList that aren't yet in assignments/exams
    finalGradesList.forEach((f) => {
      const targetId = f.assignmentId || f.examId || f.id;
      if (!targetId || addedIds.has(targetId) || deletedColumnIds.has(targetId)) return;

      const stu = studentsList.find((s) => isSameNisn(s.nisn, f.nisn) || isSameNisn(s.nis, f.nisn));
      const isForCurrentClass = !selectedClassFilter || selectedClassFilter === "SEMUA_KELAS" || (stu && isClassMatch(stu.kelas, selectedClassFilter));
      
      if (isForCurrentClass) {
        const matchingAsg = assignmentsList.find((a) => a.id === targetId);
        const matchingExam = examsList.find((e) => e.id === targetId);
        const fallbackTitle = f.title || f.materi || f.examTitle || matchingAsg?.title || matchingAsg?.materi || matchingExam?.title;
        
        if (!fallbackTitle && !matchingAsg && !matchingExam) return;

        addedIds.add(targetId);
        const isExam = targetId.startsWith("EXM-") || f.type === "CBT" || f.type === "exam" || /cbt|ujian|pretes|postes|pretest|posttest/i.test(fallbackTitle || "");
        cols.push({
          id: targetId,
          title: fallbackTitle || (isExam ? "CBT" : "Tugas"),
          type: isExam ? ("exam" as const) : ("assignment" as const),
          bab: f.bab || matchingAsg?.bab || matchingExam?.bab,
          targetClasses: [],
          kelasRef: f.kelas || selectedClassFilter,
          date: f.gradedAt || f.createdAt || f.updatedAt || f.date || "",
          deadline: null,
          rawDoc: f,
        });
      }
    });

    return cols.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.id || "").localeCompare(b.id || "");
    });
  }, [assignmentsList, examsList, selectedClassFilter, finalGradesList, studentsList, deletedColumnIds]);

  const gradesLookupMap = useMemo(() => {
    const map = new Map<string, any>();
    finalGradesList.forEach((f) => {
      const nisnKey = f.nisn || f.nis;
      if (!nisnKey) return;
      
      const targetId = f.assignmentId || f.examId || f.id;
      if (targetId) {
        map.set(`${nisnKey}_${targetId}`, f);
      }
      
      if (f.alignmentId) {
        map.set(`${nisnKey}_${f.alignmentId}`, f);
      }
      
      if (f.id && f.id.includes("_")) {
         map.set(f.id, f);
      }
    });
    return map;
  }, [finalGradesList]);

  const submissionsLookupMap = useMemo(() => {
    const map = new Map<string, any>();
    submissionsList.forEach((s) => {
      const nisnKey = s.nisn || s.nis;
      if (!nisnKey || !s.assignmentId) return;
      map.set(`${nisnKey}_${s.assignmentId}`, s);
    });
    return map;
  }, [submissionsList]);

  const submissionsByNisnLookup = useMemo(() => {
    const map = new Map<string, any[]>();
    submissionsList.forEach((s) => {
      const nisnKey = s.nisn || s.nis;
      if (!nisnKey) return;
      if (!map.has(nisnKey)) map.set(nisnKey, []);
      map.get(nisnKey)!.push(s);
    });
    return map;
  }, [submissionsList]);

  const studentAbsensiLookup = useMemo(() => {
    const map = new Map<string, any>();
    studentsList.forEach(stu => {
      const key = `${stu.nisn}_${selectedClassFilter || stu.kelas}`;
      map.set(key, getStudentAbsensiCounts(stu, absensiList, selectedClassFilter || stu.kelas));
    });
    return map;
  }, [studentsList, absensiList, selectedClassFilter]);

  const filteredAndSortedStudents = useMemo(() => {
    return studentsList
      .filter((stu) => {
        const matchClass = selectedClassFilter ? isClassMatch(stu.kelas, selectedClassFilter) : true;
        const matchSearch = studentSearchQuery
          ? (stu.displayName || stu.studentName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
            (stu.nisn || "").includes(studentSearchQuery)
          : true;
        return matchClass && matchSearch;
      })
      .sort((a, b) => {
        const classA = (a.kelas || "").toString();
        const classB = (b.kelas || "").toString();
        const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
        if (classComp !== 0) return classComp;
        return (a.displayName || a.studentName || "").localeCompare(
          b.displayName || b.studentName || "",
          "id",
          { sensitivity: "base" }
        );
      });
  }, [studentsList, selectedClassFilter, studentSearchQuery]);

  const attendanceAnalysis = useMemo(() => {
    if (!analysisClass) return [];
    
    const classStudents = studentsList.filter(s => isClassMatch(s.kelas, analysisClass));
    const classAbsensi = absensiList.filter(a => isClassMatch(a.kelasRef, analysisClass));
    
    return classStudents.map(student => {
      const stats = {
        Hadir: 0,
        Sakit: 0,
        Izin: 0,
        Alpa: 0,
        Dispen: 0
      };
      
      classAbsensi.forEach(abs => {
        const status = abs.data?.[student.nisn] || "Hadir";
        if (stats[status as keyof typeof stats] !== undefined) {
          stats[status as keyof typeof stats]++;
        }
      });
      
      const totalMeetings = classAbsensi.length;
      const attendanceRate = totalMeetings > 0 
        ? Math.round((stats.Hadir / totalMeetings) * 100) 
        : 0;
        
      // New Rubric Logic
      let rubricStatus: "Sangat Rajin" | "Rajin" | "Cukup Rajin" | "Kurang Rajin" = "Rajin";
      let remark = "Kehadiran Baik";
      let warningLevel: "none" | "warning" | "critical" = "none";
      
      if (totalMeetings === 0) {
        rubricStatus = "Rajin";
        remark = "Belum ada pertemuan";
        warningLevel = "none";
      } else {
        if (attendanceRate >= 95 && stats.Alpa === 0 && (stats.Sakit + stats.Izin) <= 2) {
          rubricStatus = "Sangat Rajin";
          remark = "Siswa Sangat Rajin";
        } else if (attendanceRate >= 90 && stats.Alpa < 1) {
          rubricStatus = "Rajin";
          remark = "Siswa Rajin";
        } else if (attendanceRate >= 80 && stats.Alpa < 3) {
          rubricStatus = "Cukup Rajin";
          remark = "Siswa Cukup Rajin";
        } else {
          rubricStatus = "Kurang Rajin";
          remark = "Siswa Kurang Rajin";
        }

        if (stats.Alpa >= 3 || attendanceRate < 80) {
          warningLevel = "critical";
        } else if (stats.Alpa >= 1 || attendanceRate < 90) {
          warningLevel = "warning";
        }
      }
      
      return {
        ...student,
        stats,
        totalMeetings,
        attendanceRate,
        warningLevel,
        rubricStatus,
        remark
      };
    });
  }, [analysisClass, studentsList, absensiList]);

  const handleResetConfirm = async (
    resetType: 'semester' | 'tahun' | 'semua',
    password: string,
    onProgress: (percent: number) => void
  ) => {
    // Add password check logic here (dummy for now)
    if (password !== "admin123") {
      showAlert("Gagal", "Password salah.", "danger");
      throw new Error("Password salah");
    }
    
    const collectionsToClear: string[] = [];
    if (resetType === 'semester') {
      collectionsToClear.push("submissions", "final_grades", "assignments");
    } else if (resetType === 'tahun') {
      collectionsToClear.push("studentsByNisn", "classes", "assignments", "submissions", "final_grades", "chapters", "exams", "absensi", "material_progress");
    } else if (resetType === 'semua') {
      collectionsToClear.push("studentsByNisn", "classes", "assignments", "submissions", "final_grades", "chapters", "exams", "absensi", "material_progress", "announcements", "materials");
    }

    try {
      onProgress(5); // Start progress bar immediately so the user sees a quick response
      
      let totalDocs = 0;
      const snapshotsMap = new Map<string, any>();
      const nestedSubmissionsMap = new Map<string, any[]>();
      
      // Phase 1: Counting/inspecting the database
      let stepPercent = 5;
      const progressIncrement = Math.max(1, Math.floor(15 / collectionsToClear.length));
      
      for (const col of collectionsToClear) {
        try {
          const snapshot = await getDocs(collection(db, col));
          console.log(`Collection ${col} has ${snapshot.size} documents.`);
          snapshotsMap.set(col, snapshot);
          totalDocs += snapshot.size;
          
          // If it's assignments, also check for nested submissions
          if (col === "assignments") {
              for (const docSnapshot of snapshot.docs) {
                  try {
                      const subSnapshot = await getDocs(collection(db, "assignments", docSnapshot.id, "submissions"));
                      console.log(`Nested submissions for assignment ${docSnapshot.id} has ${subSnapshot.size} documents.`);
                      if (!nestedSubmissionsMap.has(docSnapshot.id)) {
                          nestedSubmissionsMap.set(docSnapshot.id, []);
                      }
                      nestedSubmissionsMap.get(docSnapshot.id)!.push(...subSnapshot.docs);
                      totalDocs += subSnapshot.size;
                  } catch (subErr) {
                      console.warn(`Gagal membaca sub-submission untuk tugas ${docSnapshot.id}:`, subErr);
                  }
              }
          }
        } catch (colErr) {
          console.warn(`Gagal menghitung koleksi ${col}:`, colErr);
        }
        stepPercent = Math.min(20, stepPercent + progressIncrement);
        onProgress(stepPercent);
      }
      
      onProgress(20); // Count completed
      console.log(`Total documents to delete: ${totalDocs}`);
      
      if (totalDocs === 0) {
        // If nothing to delete, simulate a fast progress bar so user gets a nice visual feedback
        for (let p = 20; p <= 100; p += 20) {
          onProgress(p);
          await new Promise(r => setTimeout(r, 120));
        }
      } else {
        let processedDocs = 0;
        for (const col of collectionsToClear) {
          try {
            const snapshot = snapshotsMap.get(col);
            if (!snapshot || snapshot.empty) {
                continue;
            }
            
            console.log(`Deleting ${snapshot.size} documents from ${col}...`);
            let batch = writeBatch(db);
            let batchCount = 0;
            
            for (const docSnapshot of snapshot.docs) {
              console.log(`Deleting document ${docSnapshot.id} from ${col}`);
              batch.delete(docSnapshot.ref);
              batchCount++;
              processedDocs++;
              
              if (batchCount === 500) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
              }
              onProgress(Math.round(20 + (processedDocs / totalDocs) * 80));

              // Also delete nested submissions if col is assignments
              if (col === "assignments") {
                  const nestedDocs = nestedSubmissionsMap.get(docSnapshot.id) || [];
                  for (const subDoc of nestedDocs) {
                      console.log(`Deleting nested submission ${subDoc.id} from assignments/${docSnapshot.id}/submissions`);
                      batch.delete(subDoc.ref);
                      batchCount++;
                      processedDocs++;
                      if (batchCount === 500) {
                        await batch.commit();
                        batch = writeBatch(db);
                        batchCount = 0;
                      }
                      onProgress(Math.round(20 + (processedDocs / totalDocs) * 80));
                  }
              }
            }
            if (batchCount > 0) {
              await batch.commit();
            }
          } catch (delErr) {
            console.warn(`Gagal menghapus data dari koleksi ${col}:`, delErr);
          }
          onProgress(Math.round(20 + (processedDocs / totalDocs) * 80));
        }
      }
      
      onProgress(100);
      showAlert("Berhasil", "Data telah direset.", "alert");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.warn("Reset error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      showAlert("Gagal", "Terjadi kesalahan saat mereset data: " + errMsg, "danger");
      throw error;
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        students: studentsList,
        classes: classesList,
        assignments: assignmentsList,
        submissions: submissionsList,
        appVersion: "1.0.0-firas",
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_firas_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      showAlert("Gagal", "Gagal mengekspor data: " + e, "danger");
    }
  };

  const handleResetStats = () => {
    if (confirm("Reset statistik penggunaan sesi ini?")) {
      sessionStorage.setItem("firas_usage_stats", '{"reads":0,"writes":0}');
      try {
        const event = document.createEvent('Event');
        event.initEvent('usage-updated', true, true);
        window.dispatchEvent(event);
      } catch (e) {
        console.warn("Failed to dispatch usage-updated event", e);
      }
    }
  };

  // Retention Policy (Option 3) State & Function
  const [isCleaningRetention, setIsCleaningRetention] = useState(false);
  const [retentionCleanedCount, setRetentionCleanedCount] = useState<number>(() => {
    return Number(localStorage.getItem("sipinter_retention_cleaned") || 0);
  });
  const [retentionLastRun, setRetentionLastRun] = useState<string | null>(() => {
    return localStorage.getItem("sipinter_retention_last_run") || null;
  });

  const storageMetrics = useMemo(() => {
    // Estimasi penggunaan penyimpanan Firebase (Batas Gratis Spark Plan: 5 GB)
    let usedBytes = 5 * 1024 * 1024; // Base system overhead (5 MB)
    submissionsList.forEach((sub: any) => {
      if (sub.fileUrl && !sub.isArchivedByRetention && !sub.fileUrl.includes("Berkas Diarsipkan")) {
        if (sub.fileUrl.startsWith("data:")) {
          usedBytes += Math.round(sub.fileUrl.length * 0.75);
        } else if (sub.fileUrl.includes("firebasestorage")) {
          usedBytes += 1.5 * 1024 * 1024; // Estimasi rata-rata 1.5 MB untuk file lama (PDF/Foto di Storage)
        }
      }
    });
    const maxBytes = 5 * 1024 * 1024 * 1024; // 5 GB
    const freeBytes = Math.max(0, maxBytes - usedBytes);
    
    // Konversi format
    const formatBytes = (bytes: number) => {
      if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
      if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
      return bytes + " B";
    };

    const usedFormatted = formatBytes(usedBytes);
    const freeFormatted = formatBytes(freeBytes);
    const percentage = Math.min(100, Math.max(0.1, Number(((usedBytes / maxBytes) * 100).toFixed(2))));

    return { usedBytes, usedFormatted, maxBytes, freeBytes, freeFormatted, percentage };
  }, [submissionsList]);

  const handleRunRetentionCleanup = async () => {
    const gradedSubmissionsWithFiles = submissionsList.filter(
      (sub: any) =>
        (sub.grade !== undefined && sub.grade !== null && sub.grade !== "") ||
        sub.status === "selesai" ||
        sub.status === "sudah dinilai"
    ).filter(
      (sub: any) =>
        sub.fileUrl &&
        !sub.isArchivedByRetention &&
        sub.fileUrl.length > 50
    );

    if (gradedSubmissionsWithFiles.length === 0) {
      showAlert(
        "Penyimpanan Bersih",
        "Tidak ada berkas lampiran tugas selesai yang perlu dibersihkan. Semua tugas selesai sudah diarsipkan atau menggunakan link eksternal ringan.",
        "alert"
      );
      return;
    }

    const confirmRun = confirm(
      `Jalankan Pembersihan Retensi (Option 3)?\n\nDitemukan ${gradedSubmissionsWithFiles.length} berkas tugas yang sudah dinilai.\n\nSistem akan membersihkan beban file berkas lama dari Firebase Storage dan tetap menyimpan 100% DATA NILAI, NAMA SISWA, NIS, KELAS, TANGGAL, dan CATATAN GURU secara permanen di database.`
    );

    if (!confirmRun) return;

    setIsCleaningRetention(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      let totalCleaned = 0;

      for (const sub of gradedSubmissionsWithFiles) {
        const subRef = doc(db, "submissions", sub.id);
        batch.update(subRef, {
          fileUrl: "[Berkas Diarsipkan Sesuai Kebijakan Retensi]",
          isArchivedByRetention: true,
          archivedAt: new Date().toISOString(),
          originalFileName: sub.fileName || null,
        });
        count++;
        totalCleaned++;

        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      const newTotal = retentionCleanedCount + totalCleaned;
      const nowStr = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setRetentionCleanedCount(newTotal);
      setRetentionLastRun(nowStr);
      localStorage.setItem("sipinter_retention_cleaned", String(newTotal));
      localStorage.setItem("sipinter_retention_last_run", nowStr);

      showAlert(
        "Pembersihan Berhasil!",
        `Berhasil mengarsipkan dan membersihkan ${totalCleaned} berkas tugas lampau. Ruang penyimpanan Firebase berhasil dihemat dan kuota aman 100%. Data nilai seluruh siswa tetap tersimpan utuh.`,
        "alert"
      );
    } catch (err: any) {
      console.warn("Gagal menjalankan kebijakan retensi:", err);
      showAlert("Gagal", `Terjadi kesalahan: ${err.message}`, "danger");
    } finally {
      setIsCleaningRetention(false);
    }
  };

  useEffect(() => {
    const handleUsageUpdate = () => {
      const stats = JSON.parse(
        sessionStorage.getItem("firas_usage_stats") || '{"reads":0,"writes":0}',
      );
      setSessionUsage(stats);
    };

    window.addEventListener("usage-updated", handleUsageUpdate);
    handleUsageUpdate(); // Initial load

    return () => window.removeEventListener("usage-updated", handleUsageUpdate);
  }, []);

  // Menghapus pesan (saveMessage) otomatis setelah 5 detik
  useEffect(() => {
    if (saveMessage.text) {
      const timer = setTimeout(() => {
        setSaveMessage({ text: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage.text]);

  // Menghapus pesan (classSaveMessage) otomatis setelah 5 detik
  useEffect(() => {
    if (classSaveMessage.text) {
      const timer = setTimeout(() => {
        setClassSaveMessage({ text: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [classSaveMessage.text]);

  const menus = [
    { id: "dashboard", label: "Dasbor Utama", icon: LayoutDashboard },
    { id: "simulasi", label: "Simulasi", icon: Gamepad2 },
    { id: "menu-pengguna", label: "Menu Pengguna", icon: User },
    { id: "manajemen-nilai", label: "Manajemen Nilai", icon: ClipboardCheck },
    { id: "manajemen-siswa-dan-kelas", label: "Manajemen Siswa dan Kelas", icon: Users },
    { id: "sistem-presensi-siswa", label: "Sistem Presensi Siswa", icon: ClipboardList },
    { id: "manajemen-tugas", label: "Manajemen Tugas", icon: FilePlus },
    { id: "materi-ajar", label: "Materi Ajar", icon: BookOpen },
    { id: "ujian-siswa", label: "Ujian Siswa", icon: GraduationCap },
    { id: "pengumuman", label: "Pengumuman Kelas", icon: Bell },
    {
      id: "manajemen-penyimpanan",
      label: "Manajemen Penyimpanan",
      icon: HardDrive,
    },
    {
      id: "ubah-password",
      label: "Ubah Password Guru",
      icon: KeyRound,
    },
    {
      id: "statistik-ai",
      label: "Statistik Penggunaan AI",
      icon: Sparkles,
    },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("is_teacher_auth");
    localStorage.removeItem("is_teacher_auth");
    navigate("/", { replace: true });
  };

  const addKopSuratToDoc = async (doc: any, pageWidth: number, margin = 40): Promise<number> => {
    try {
      const targetWidth = pageWidth - (margin * 2);
      // Dimensions are 1450 x 341. Aspect ratio is 341 / 1450 = 0.23517241
      const targetHeight = targetWidth * (341 / 1450);

      doc.addImage(KOP_SURAT_BASE64, "PNG", margin, 20, targetWidth, targetHeight);
      return 20 + targetHeight + 15;
    } catch (e) {
      console.warn("Kop Surat failed to load, drawing text-only header fallback", e);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      
      doc.setFontSize(11);
      doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", pageWidth / 2, 42, { align: "center" });
      doc.setFontSize(12);
      doc.text("DINAS PENDIDIKAN", pageWidth / 2, 56, { align: "center" });
      doc.setFontSize(10);
      doc.text("CABANG DINAS PENDIDIKAN WILAYAH VI", pageWidth / 2, 69, { align: "center" });
      doc.setFontSize(15);
      doc.text("SMA NEGERI 1 CILILIN", pageWidth / 2, 86, { align: "center" });
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Jl. Raya Cililin No. 39, Kec. Cililin, Kabupaten Bandung Barat 40562", pageWidth / 2, 98, { align: "center" });
      doc.setFont("Helvetica", "italic");
      doc.text("Website: https://www.sman1cililin.sch.id | Email: sman1cln@yahoo.co.id", pageWidth / 2, 109, { align: "center" });
      
      doc.setLineWidth(2.0);
      doc.setDrawColor(0, 0, 0);
      doc.line(margin, 122, pageWidth - margin, 122);
      doc.setLineWidth(0.5);
      doc.line(margin, 126, pageWidth - margin, 126);
      
      return 150;
    }
  };

  const calculateNilaiRapor = (stu: any) => {
    const studentNisn = stu.nisn;
    if (!studentNisn) return 0;
    const targetClass = selectedClassFilter || stu.kelas;
    
    // Use Pre-calculated maps for O(1) lookups
    const studentAbs = absensiByNisnLookup.get(studentNisn) || [];
    const { total, persentase } = getStudentAbsensiCounts(stu, studentAbs, targetClass);
    const nilaiKehadiran = total > 0 ? persentase : 100;

    const tugasVals: number[] = [];
    let utsVal = 0;
    let uasVal = 0;

    const studentGrades = finalGradesByNisnLookup.get(studentNisn);
    const studentSubmissions = submissionsByNisnLookup.get(studentNisn);

    const validAssignments = assignmentsList.filter((a) => isAssignmentForClass(a, targetClass));
    validAssignments.forEach((a) => {
      const fGrade = studentGrades?.get(a.id);
      const sub = studentSubmissions?.find(s => s.assignmentId === a.id);
      
      const cellKey = `${a.id}_${studentNisn}`;
      const isEdited = editedRekapGrades[cellKey] !== undefined;
      const val = isEdited
        ? editedRekapGrades[cellKey]
        : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai"
            ? sub.nilai
            : (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== ""
                ? fGrade.nilai
                : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" ? sub.nilai : "")));
      
      if (val !== undefined && val !== null && val !== "") {
        tugasVals.push(Number(val));
      } else {
        tugasVals.push(0);
      }
    });

    const validExams = examsList.filter((e) => isExamForClass(e, targetClass));
    validExams.forEach((e) => {
      const fGrade = studentGrades?.get(e.id);
      const cellKey = `${e.id}_${studentNisn}`;
      const isEdited = editedRekapGrades[cellKey] !== undefined;
      const val = isEdited ? editedRekapGrades[cellKey] : (fGrade?.nilai ?? fGrade?.score);

      if (val !== undefined && val !== null && val !== "") {
        const n = Number(val);
        if (isPTSItem(e)) utsVal = n;
        else if (isPASItem(e)) uasVal = n;
        else tugasVals.push(n);
      } else {
        if (isPTSItem(e)) utsVal = 0;
        else if (isPASItem(e)) uasVal = 0;
        else tugasVals.push(0);
      }
    });

    const avgTugas = tugasVals.length > 0 ? tugasVals.reduce((a, b) => a + b, 0) / tugasVals.length : 0;
    
    const rKehadiran = Number(rubric?.kehadiran ?? 20);
    const rTugas = Number(rubric?.tugas ?? 50);
    const rUts = Number(rubric?.uts ?? 10);
    const rUas = Number(rubric?.uas ?? 20);

    const finalRapor =
      nilaiKehadiran * (rKehadiran / 100) +
      avgTugas * (rTugas / 100) +
      utsVal * (rUts / 100) +
      uasVal * (rUas / 100);

    return Math.round(finalRapor);
  };

  const generateNilaiPDFDoc = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = (await import("jspdf-autotable")) as any;
    // Use standard F4 (Folio) paper size: 215 mm x 330 mm (609.45 pt x 935.43 pt) in portrait position
    const doc = new jsPDF("p", "pt", [609.45, 935.43]);

    const pageWidth = 609.45;
    const margin = 40;

    let currentY = await addKopSuratToDoc(doc, pageWidth, margin);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0); 
    doc.text("LAPORAN PENILAIAN HASIL BELAJAR SISWA", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    doc.setFontSize(11);
    doc.text(`MATA PELAJARAN: ${(userSettings?.subjectName || "").toUpperCase()}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 30;

    // Meta Info Grid
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("GURU MATA PELAJARAN", margin, currentY);
    doc.text(":", margin + 125, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(userSettings.teacherName, margin + 133, currentY);

    doc.setFont("Helvetica", "bold");
    doc.text("TAHUN PELAJARAN", 350, currentY);
    doc.text(":", 455, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(`${userSettings.academicYear} (${userSettings.semester})`, 463, currentY);
    currentY += 15;

    doc.setFont("Helvetica", "bold");
    doc.text("KELAS / SEGMEN", margin, currentY);
    doc.text(":", margin + 125, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(selectedClassFilter || "Seluruh Kelas Aktif", margin + 133, currentY);

    doc.setFont("Helvetica", "bold");
    const currentDateStrString = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    doc.text("TANGGAL CETAK", 350, currentY);
    doc.text(":", 455, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(currentDateStrString, 463, currentY);
    currentY += 25;

    // Prepare Dynamic Headers - filtered by published class
    const filteredAssignmentsForPDF = assignmentsList.filter((a) => isAssignmentForClass(a, selectedClassFilter));
    const filteredExamsForPDF = examsList.filter((e) => isExamForClass(e, selectedClassFilter));

    const sortedEvaluations = [
      ...filteredAssignmentsForPDF.map((a) => ({
        id: a.id,
        title: a.materi || "Tugas",
        type: "assignment",
        date: a.publishedAt || a.createdAt,
      })),
      ...filteredExamsForPDF.map((e) => ({
        id: e.id,
        title: e.title || "Ujian",
        type: "exam",
        date: e.createdAt,
      })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    const tableHeaders = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Nilai Kehadiran",
      ...sortedEvaluations.map((a) => a.title),
      "Nilai Rapor"
    ];

    // Prepare Rows directly from final_grades Firestore DB sync state (finalGradesList)
    const tableRows = studentsList
      .filter((stu) => (selectedClassFilter ? stu.kelas === selectedClassFilter : true))
      .sort((a, b) => {
        const classA = (a.kelas || "").toString();
        const classB = (b.kelas || "").toString();
        const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
        if (classComp !== 0) return classComp;
        return (a.displayName || a.studentName || "").localeCompare(
          b.displayName || b.studentName || "",
          "id",
          { sensitivity: "base" }
        );
      })
      .map((stu, index) => {
        const { total, persentase } = getStudentAbsensiCounts(stu, absensiList, selectedClassFilter || stu.kelas);
        const presenceScore = (total > 0 ? persentase : 100).toString(); // TANPA simbol %

        // List each evaluation's grade
        const gradesCols = sortedEvaluations.map((evalItem) => {
          const fg = finalGradesList.find(
            (f) =>
              (f.assignmentId === evalItem.id || f.examId === evalItem.id || f.alignmentId === evalItem.id || (f.id && f.id.startsWith(evalItem.id))) &&
              (isSameNisn(f.nisn, stu.nisn) || isSameNisn(f.nis, stu.nisn))
          );
          const sub = submissionsList.find(
            (s) => (s.assignmentId === evalItem.id || (s.id && s.id.includes(evalItem.id))) && (isSameNisn(s.nisn, stu.nisn) || isSameNisn(s.nis, stu.nisn))
          );
          const cellKey = `${evalItem.id}_${stu.nisn}`;
          const isEdited = editedRekapGrades[cellKey] !== undefined;

          const val = isEdited
            ? editedRekapGrades[cellKey]
            : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai"
                ? sub.nilai
                : (fg?.nilai !== undefined && fg?.nilai !== null && fg?.nilai !== ""
                    ? fg.nilai
                    : (fg?.score !== undefined && fg?.score !== null && fg?.score !== ""
                        ? fg.score
                        : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" ? sub.nilai : ""))));
          return val !== undefined && val !== null && val !== "" ? val.toString() : "-";
        });

        // Calculate Nilai Rapor
        const nilaiRapor = calculateNilaiRapor(stu).toString();

        return [
          (index + 1).toString(),
          stu.nisn || "-",
          stu.displayName || stu.studentName || "-",
          stu.kelas || "-",
          presenceScore,
          ...gradesCols,
          nilaiRapor
        ];
      });

    // Calculate column widths for Portrait F4
    const totalAvailableWidth = pageWidth - (margin * 2); // 529.45 pt
    const noWidth = 22;
    const nisnWidth = 52;
    const kelasWidth = 38;
    const kehadiranWidth = 48;
    const raporWidth = 48;

    const numEvaluations = sortedEvaluations.length;
    // Ukuran kolom CBT dan Tugas 1 samakan dengan ukuran kolom Kelas (38 pt)
    const evalColWidth = kelasWidth; // 38 pt
    const totalEvalsWidth = numEvaluations * evalColWidth;

    const reservedStaticWidth = noWidth + nisnWidth + kelasWidth + kehadiranWidth + raporWidth;
    let nameWidth = totalAvailableWidth - (reservedStaticWidth + totalEvalsWidth);
    
    if (nameWidth < 100) {
      nameWidth = 100;
    }

    const columnStyles: any = {
      0: { halign: "center", fontStyle: "bold", cellWidth: noWidth },
      1: { halign: "center", cellWidth: nisnWidth },
      2: { halign: "left", cellWidth: nameWidth, overflow: "ellipsize" }, // Nama Siswa: jangan dikemas text (fit single line)
      3: { halign: "center", cellWidth: kelasWidth },
      4: { halign: "center", cellWidth: kehadiranWidth }
    };

    for (let i = 0; i < numEvaluations; i++) {
      columnStyles[5 + i] = { 
        halign: "center", 
        cellWidth: evalColWidth, // Ukuran kolom samakan dengan Kelas (38 pt)
        overflow: "linebreak"   // Dikemas text jika tidak cukup
      };
    }

    columnStyles[5 + numEvaluations] = {
      halign: "center",
      fontStyle: "bold",
      cellWidth: raporWidth,
      fillColor: [220, 252, 231]
    };

    // Generate Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      styles: {
        font: "Helvetica",
        fontSize: 7.5,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [220, 230, 242],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        valign: "middle",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      columnStyles: columnStyles,
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 30,
          { align: "center" }
        );
      }
    });

    // Signature Block
    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 100;
    const spaceForSignature = 150;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let sigY = finalY + 45;
    if (sigY + spaceForSignature > pageHeight) {
      doc.addPage();
      sigY = 60;
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0); 
    doc.text("Mengetahui,", 40, sigY);
    doc.text("Kepala SMAN 1 Cililin,", 40, sigY + 14);
    doc.text("Cililin, " + currentDateStrString, 380, sigY);
    doc.text("Guru Mata Pelajaran Informatika,", 380, sigY + 14);
    
    doc.setFont("Helvetica", "bold");
    doc.text(userSettings.principalName, 40, sigY + 75);
    doc.text(userSettings.teacherName, 380, sigY + 75);

    doc.setFont("Helvetica", "normal");
    doc.text(`NIP. ${userSettings.principalNip}`, 40, sigY + 88);
    doc.text(`NIP. ${userSettings.teacherNip}`, 380, sigY + 88);

    return doc;
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = await generateNilaiPDFDoc();
      const fileName = selectedClassFilter 
        ? `Daftar_Nilai_${userSettings.subjectName.replace(/\s+/g, "_")}_${selectedClassFilter.replace(/\s+/g, "_")}.pdf` 
        : `Daftar_Nilai_${userSettings.subjectName.replace(/\s+/g, "_")}_Semua.pdf`;
      doc.save(fileName);
      showAlert("Berhasil", "Laporan Penilaian (PDF) berhasil diunduh.", "alert", "Tutup");
    } catch (e: any) {
      console.warn(e);
      showAlert("Gagal", `Gagal mengekspor PDF: ${e.message || e}`, "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePreviewNilaiPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = await generateNilaiPDFDoc();
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewTitle("Preview Laporan Nilai Siswa (SMAN 1 Cililin)");
    } catch (e: any) {
      console.warn(e);
      showAlert("Gagal", `Gagal memproses Preview PDF: ${e.message || e}`, "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadViolationReport = async (exam: any, targetClassOverride?: string) => {
    try {
      setIsGeneratingPdf(true);
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = (await import("jspdf-autotable")) as any;

      const targetClass = targetClassOverride || downloadExamModal.selectedClass || exam.kelasRef || "SEMUA_KELAS";

      // Standard Folio/F4 paper size: [609.45, 935.43]
      const doc = new jsPDF("p", "pt", [609.45, 935.43]);
      const pageWidth = 609.45;
      const margin = 40;
      const center = pageWidth / 2;

      // 1. Render Official Kop Surat SMAN 1 Cililin cleanly (tidak meleyot)
      let currentY = await addKopSuratToDoc(doc, pageWidth, margin);

      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0); 
      doc.text("LAPORAN PELANGGARAN & HASIL UJIAN (CBT)", center, currentY, { align: "center" });
      currentY += 25;

      // Document Meta Information
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      doc.text("MATA PELAJARAN", margin, currentY);
      doc.text(":", margin + 100, currentY);
      doc.setFont("Helvetica", "normal");
      doc.text(exam.subject || userSettings.subjectName || "Informatika", margin + 108, currentY);

      const now = new Date();
      const dateOnlyStr = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timeOnlyStr = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const tanggalCetakWithTime = `${dateOnlyStr}, ${timeOnlyStr} WIB`;

      doc.setFont("Helvetica", "bold");
      doc.text("TANGGAL CETAK", 350, currentY);
      doc.text(":", 455, currentY);
      doc.setFont("Helvetica", "normal");
      doc.text(tanggalCetakWithTime, 463, currentY);

      currentY += 15;

      doc.setFont("Helvetica", "bold");
      doc.text("NAMA UJIAN", margin, currentY);
      doc.text(":", margin + 100, currentY);
      doc.setFont("Helvetica", "normal");
      doc.text(exam.title || "-", margin + 108, currentY);

      doc.setFont("Helvetica", "bold");
      doc.text("KELAS SASARAN", 350, currentY);
      doc.text(":", 455, currentY);
      doc.setFont("Helvetica", "normal");
      const displayKelasStr = targetClass === "SEMUA_KELAS" ? "Pilih Semua Kelas (Seluruh Kelas)" : targetClass;
      doc.text(displayKelasStr, 463, currentY);

      currentY += 15;

      doc.setFont("Helvetica", "bold");
      doc.text("BAB / MATERI", margin, currentY);
      doc.text(":", margin + 100, currentY);
      doc.setFont("Helvetica", "normal");
      const rawBab = exam.bab || exam.materi || exam.chapter || "-";
      const displayBab = rawBab.length > 45 ? rawBab.substring(0, 45) + "..." : rawBab;
      doc.text(displayBab, margin + 108, currentY);

      currentY += 25;

      const tableHeaders = [
        "No", 
        "NIS", 
        "Nama Lengkap", 
        "Kelas", 
        "Nilai Asal", 
        "Penalti", 
        "Nilai Akhir",
        "Tgl & Jam Pengerjaan",
        "Catatan Pelanggaran"
      ];

      // Filter students for the selected class (or all students if SEMUA_KELAS)
      const examStudents = (targetClass && targetClass !== "SEMUA_KELAS")
        ? studentsList.filter((stu) => stu.kelas === targetClass)
        : studentsList;

      const tableRows = examStudents.map((stu, idx) => {
        const fg = finalGradesList.find(
          (g) => (g.assignmentId === exam.id || g.examId === exam.id) && g.nisn === stu.nisn
        );
        const submitted = fg ? true : false;
        
        let originalScore = "-";
        let violations = "-";
        let finalScore = "-";
        let dateTimeStr = "-";
        let notes = "Belum Mengumpulkan";
        
        if (submitted) {
          const baseS = fg?.baseScore !== undefined ? fg.baseScore : (fg?.nilai ?? 0);
          originalScore = baseS.toString();
          
          const violC = fg?.violationCount ?? fg?.violationsCount ?? 0;
          violations = violC > 0 ? `-${violC} Poin` : "0";
          
          finalScore = (fg?.nilai ?? 0).toString();
          notes = violC > 0 ? `${violC}x upaya pelanggaran tab out/fokus hilang.` : "Tertib & Jujur";

          const rawTime = fg?.submittedAt || fg?.createdAt || fg?.updatedAt || fg?.timestamp || fg?.date;
          if (rawTime) {
            try {
              const d = new Date(rawTime);
              if (!isNaN(d.getTime())) {
                const datePart = d.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                });
                const timePart = d.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                dateTimeStr = `${datePart} ${timePart} WIB`;
              } else {
                dateTimeStr = String(rawTime);
              }
            } catch (_) {
              dateTimeStr = "-";
            }
          }
        }

        return [
          idx + 1,
          stu.nisn || "-",
          stu.displayName || stu.name || "-",
          stu.kelas || "-",
          originalScore,
          violations,
          finalScore,
          dateTimeStr,
          notes
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: 40, right: 40 },
        head: [tableHeaders],
        body: tableRows,
        theme: "grid",
        styles: {
          font: "Helvetica",
          fontSize: 7.5,
          cellPadding: 4,
          overflow: "linebreak",
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 20 },
          1: { halign: "center", cellWidth: 60 },
          2: { halign: "left", cellWidth: 115 },
          3: { halign: "center", cellWidth: 35 },
          4: { halign: "center", cellWidth: 35 },
          5: { halign: "center", cellWidth: 38, textColor: [220, 38, 38] },
          6: { halign: "center", fontStyle: "bold", cellWidth: 40 },
          7: { halign: "center", cellWidth: 82 },
          8: { halign: "left" },
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || currentY + 100;
      const spaceForSignature = 150;
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let sigY = finalY + 40;
      if (sigY + spaceForSignature > pageHeight) {
        doc.addPage();
        sigY = 60;
      }

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0); 
      doc.text("Mengetahui,", 40, sigY);
      doc.text("Kepala SMAN 1 Cililin,", 40, sigY + 14);
      doc.text("Cililin, " + dateOnlyStr, 380, sigY);
      doc.text("Guru Mata Pelajaran Informatika,", 380, sigY + 14);
      
      doc.setFont("Helvetica", "bold");
      doc.text(userSettings.principalName, 40, sigY + 75);
      doc.text(userSettings.teacherName, 380, sigY + 75);

      doc.setFont("Helvetica", "normal");
      doc.text(`NIP. ${userSettings.principalNip}`, 40, sigY + 88);
      doc.text(`NIP. ${userSettings.teacherNip}`, 380, sigY + 88);

      const cleanFileName = `Laporan_Pelanggaran_${exam.title.replace(/\s+/g, '_')}_${targetClass.replace(/\s+/g, '_')}.pdf`;
      doc.save(cleanFileName);
      showAlert(
        "Unduhan Berhasil",
        "Dokumen Laporan Hasil & Pelanggaran Ujian (PDF) telah berhasil diunduh.",
        "alert"
      );
    } catch (error) {
      console.warn("Gagal mendownload laporan:", error);
      showAlert(
        "Gagal",
        "Terjadi kesalahan saat memproses Laporan Pelanggaran.",
        "danger"
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");
      
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Rekap_Nilai");

      const filteredAssignmentsForExcel = assignmentsList.filter((a) => isAssignmentForClass(a, selectedClassFilter));
      const filteredExamsForExcel = examsList.filter((e) => isExamForClass(e, selectedClassFilter));

      const sortedEvaluations = [
        ...filteredAssignmentsForExcel.map((a) => ({
          id: a.id,
          title: a.materi || a.title || "Tugas",
          type: "assignment" as const,
          dueDate: a.deadline || a.publishedAt || a.createdAt,
        })),
        ...filteredExamsForExcel.map((e) => ({
          id: e.id,
          title: e.title || "Ujian",
          type: "exam" as const,
          dueDate: e.createdAt,
        })),
      ].sort((a, b) => {
        const dateA = a.dueDate?.toDate?.() || new Date(a.dueDate);
        const dateB = b.dueDate?.toDate?.() || new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      });

      const headers = [
        "No",
        "NIS",
        "Nama Siswa",
        "Kelas",
        "Nilai Kehadiran",
        ...sortedEvaluations.map((e) => e.title),
        "Nilai Akhir",
        "Nilai Rapor"
      ];

      // Set Title instead of image
      const endColIndex = Math.max(8, headers.length);
      worksheet.mergeCells(1, 1, 2, endColIndex);
      const headerCell = worksheet.getCell('A1');
      headerCell.value = "SMA NEGERI 1 CILILIN";
      headerCell.font = { bold: true, size: 16 };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells(3, 1, 3, endColIndex);
      const subHeaderCell = worksheet.getCell('A3');
      subHeaderCell.value = `LAPORAN PENILAIAN - ${(userSettings?.subjectName || "").toUpperCase()}`;
      subHeaderCell.font = { bold: true, size: 12 };
      subHeaderCell.alignment = { horizontal: 'center' };

      const dateCell = worksheet.getCell('A4');
      dateCell.value = `Tanggal Update Nilai: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
      dateCell.font = { italic: true, size: 10, bold: true };

      const startRow = 6;

      // Headers
      worksheet.getRow(startRow).values = headers;
      
      const headerRow = worksheet.getRow(startRow);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
      });

      // Data
      const filteredStudents = studentsList
        .filter((s) => !selectedClassFilter || s.kelas === selectedClassFilter)
        .sort((a, b) => {
          const classA = (a.kelas || "").toString();
          const classB = (b.kelas || "").toString();
          const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
          if (classComp !== 0) return classComp;
          return (a.displayName || a.studentName || "").localeCompare(
            b.displayName || b.studentName || "",
            "id",
            { sensitivity: "base" }
          );
        });

      filteredStudents.forEach((stu, index) => {
        const row = worksheet.getRow(startRow + 1 + index);
        
        const { total, persentase } = getStudentAbsensiCounts(stu, absensiList, selectedClassFilter || stu.kelas);
        const presenceScore = total > 0 ? persentase : 100; // TANPA %

        const gradesCols = sortedEvaluations.map((ev) => {
          const fg = finalGradesList.find(
            (g) =>
              (g.nisn === stu.nisn || g.nis === stu.nisn) &&
              (g.assignmentId === ev.id || g.examId === ev.id || g.alignmentId === ev.id || g.id === `${ev.id}_${stu.nisn}`)
          );
          const sub = submissionsList.find(
            (s) => (s.assignmentId === ev.id || s.id === `SUB-${stu.nisn}-${ev.id}`) && (s.nisn === stu.nisn || s.nis === stu.nisn)
          );
          const cellKey = `${ev.id}_${stu.nisn}`;
          const isEdited = editedRekapGrades[cellKey] !== undefined;

          const val = isEdited
            ? editedRekapGrades[cellKey]
            : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai"
                ? sub.nilai
                : (fg?.nilai !== undefined && fg?.nilai !== null && fg?.nilai !== ""
                    ? fg.nilai
                    : (fg?.score !== undefined && fg?.score !== null && fg?.score !== ""
                        ? fg.score
                        : (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" ? sub.nilai : ""))));
          return val !== undefined && val !== null && val !== "" ? Number(val) : "-";
        });

        const studentGrades = finalGradesList.filter((fg) => fg.nisn === stu.nisn);
        const totalScore = studentGrades.reduce((sum, item) => sum + Number(item.nilai || 0), 0);
        const finalGrade = studentGrades.length > 0 ? Number((totalScore / studentGrades.length).toFixed(1)) : "N/A";

        const nilaiRapor = calculateNilaiRapor(stu);

        row.values = [
          index + 1,
          stu.nisn || "-",
          stu.displayName || stu.studentName || "-",
          stu.kelas || "-",
          presenceScore,
          ...gradesCols,
          finalGrade,
          nilaiRapor
        ];

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Column widths
      const colWidths = [
        { width: 5 },  // No
        { width: 15 }, // NIS
        { width: 30 }, // Nama
        { width: 10 }, // Kelas
        { width: 15 }, // Nilai Kehadiran
        ...sortedEvaluations.map(() => ({ width: 15 })),
        { width: 12 }, // Nilai Akhir
        { width: 12 }  // Nilai Rapor
      ];
      worksheet.columns = colWidths;

      const buf = await workbook.xlsx.writeBuffer();
      const fileName = selectedClassFilter 
        ? `Laporan_Nilai_${userSettings.subjectName.replace(/\s+/g, "_")}_${selectedClassFilter.replace(/\s+/g, "_")}.xlsx` 
        : `Laporan_Nilai_${userSettings.subjectName.replace(/\s+/g, "_")}_Semua.xlsx`;
      
      saveAs(new Blob([buf]), fileName);
      showAlert("Berhasil", "Laporan Nilai Excel berhasil diunduh.", "alert", "Tutup");
    } catch (e: any) {
      console.warn(e);
      showAlert("Gagal", `Gagal mengunduh Excel: ${e.message || e}`, "danger");
    }
   };

  const handleDownloadPreviewExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");
      
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("Rekap_Kehadiran");

      // Set Title instead of image
      worksheet.mergeCells('A1:H2');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = "SMA NEGERI 1 CILILIN";
      headerCell.font = { bold: true, size: 16 };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('A3:H3');
      const subHeaderCell = worksheet.getCell('A3');
      subHeaderCell.value = "REKAPITULASI KEHADIRAN SISWA";
      subHeaderCell.font = { bold: true, size: 12 };
      subHeaderCell.alignment = { horizontal: 'center' };

      const startRow = 5;
      
      // Headers
      const attendanceHeaders = [
        "No", 
        "Nama Lengkap Siswa", 
        "Kelas",
        "Hadir",
        "Sakit", 
        "Izin", 
        "Alpa", 
        "Dispen", 
        "Persentase"
      ];
      worksheet.getRow(startRow).values = attendanceHeaders;
      
      // Styling headers
      const headerRow = worksheet.getRow(startRow);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
      });

      // Data
      const attendanceList = studentsList
        .filter((s) => !attendanceClass || s.kelas === attendanceClass)
        .sort((a, b) => (a.displayName || a.studentName || "").localeCompare(b.displayName || b.studentName || ""));

      attendanceList.forEach((s, idx) => {
        const row = worksheet.getRow(startRow + 1 + idx);
        const { hadir, sakit, izin, alpa, dispen, persentase } = getStudentAbsensiCounts(s, absensiList, attendanceClass);
        const percent = `${persentase}%`;

        row.values = [
          idx + 1,
          s.displayName || s.studentName,
          s.kelas || "-",
          hadir,
          sakit,
          izin,
          alpa,
          dispen,
          percent
        ];

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Column widths
      worksheet.columns = [
        { width: 5 },  // No
        { width: 35 }, // Nama
        { width: 10 }, // Kelas
        { width: 10 }, // Hadir
        { width: 10 }, // Sakit
        { width: 10 }, // Izin
        { width: 10 }, // Alpa
        { width: 14 }, // Dispen (Width 14 prevents text wrap for 'Dispen')
        { width: 15 }  // Persentase
      ];

      const buf = await workbook.xlsx.writeBuffer();
      const className = attendanceClass || "Semua_Kelas";
      saveAs(new Blob([buf]), `Rekap_Kehadiran_${className.replace(/\s+/g, "_")}.xlsx`);
      showAlert("Unduhan Berhasil", "Rekap Kehadiran Excel berhasil diunduh.", "alert", "Tutup");
    } catch (e: any) {
      console.warn(e);
      showAlert("Gagal", `Gagal mengunduh Excel: ${e.message || e}`, "danger");
    }
  };

  const generateAbsensiPDFDoc = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = (await import("jspdf-autotable")) as any;
    // Use standard F4 (Folio) paper size: 215 mm x 330 mm (609.45 pt x 935.43 pt) in portrait position
    const doc = new jsPDF("p", "pt", [609.45, 935.43]);

    const pageWidth = 609.45;
    const margin = 40;

    let currentY = await addKopSuratToDoc(doc, pageWidth, margin);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0); 
    doc.text("REKAPITULASI KEHADIRAN SISWA", pageWidth / 2, currentY, { align: "center" });
    currentY += 25;

    const currentDateStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    // Row 1: KELAS (Left) and TAHUN PELAJARAN (Right)
    doc.setFont("Helvetica", "bold");
    doc.text("KELAS", 40, currentY);
    doc.text(":", 105, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(attendanceClass || "Semua Kelas", 113, currentY);

    doc.setFont("Helvetica", "bold");
    doc.text("TAHUN PELAJARAN", 350, currentY);
    doc.text(":", 455, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(userSettings.academicYear || "2026/2027", 463, currentY);

    currentY += 15;

    // Row 2: SEMESTER (Left) and TANGGAL CETAK (Right)
    doc.setFont("Helvetica", "bold");
    doc.text("SEMESTER", 40, currentY);
    doc.text(":", 105, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(userSettings.semester || "Ganjil", 113, currentY);

    doc.setFont("Helvetica", "bold");
    doc.text("TANGGAL CETAK", 350, currentY);
    doc.text(":", 455, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text(currentDateStr, 463, currentY);

    currentY += 25;

    const tableHeaders = [
      "No", 
      "Nama Lengkap Siswa", 
      "Kelas",
      "Hadir",
      "Sakit", 
      "Izin", 
      "Alpa", 
      "Dispen", 
      "Persentase"
    ];

    const filteredStudents = attendanceClass 
      ? studentsList.filter(s => s.kelas === attendanceClass) 
      : studentsList;

    const tableRows = filteredStudents.map((s: any, idx: number) => {
      const { hadir, sakit, izin, alpa, dispen, persentase } = getStudentAbsensiCounts(s, absensiList, attendanceClass);

      return [
        idx + 1,
        s.displayName || s.studentName,
        s.kelas || "-",
        hadir,
        sakit,
        izin,
        alpa,
        dispen,
        `${persentase}%`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      styles: {
        font: "Helvetica",
        fontSize: 8.5,
        cellPadding: 4,
        overflow: "linebreak",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 25 },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: 45 },
        3: { halign: "center", cellWidth: 40 }, // Hadir
        4: { halign: "center", cellWidth: 40 }, // Sakit
        5: { halign: "center", cellWidth: 40 }, // Izin
        6: { halign: "center", cellWidth: 40 }, // Alpa
        7: { halign: "center", cellWidth: 54 }, // Dispen (Width 54pt ensures 'Dispen' never wraps)
        8: { halign: "center", fontStyle: "bold", cellWidth: 62 }, // Persentase
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || currentY + 100;
    
    const sigY = finalY + 45;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0); 
    doc.text("Mengetahui,", 40, sigY);
    doc.text("Kepala SMAN 1 Cililin,", 40, sigY + 14);
    doc.text("Cililin, " + currentDateStr, 380, sigY);
    doc.text("Guru Mata Pelajaran Informatika,", 380, sigY + 14);
    
    doc.setFont("Helvetica", "bold");
    doc.text(userSettings.principalName, 40, sigY + 75);
    doc.text(userSettings.teacherName, 380, sigY + 75);

    doc.setFont("Helvetica", "normal");
    doc.text(`NIP. ${userSettings.principalNip}`, 40, sigY + 88);
    doc.text(`NIP. ${userSettings.teacherNip}`, 380, sigY + 88);

    return doc;
  };

  const handleDownloadPreviewPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = await generateAbsensiPDFDoc();
      const className = attendanceClass || "Semua_Kelas";
      doc.save(`Rekap_Kehadiran_${className.replace(/\s+/g, '_')}.pdf`);
      showAlert(
        "Unduhan Berhasil",
        "Laporan Rekapitulasi Kehadiran (PDF) telah berhasil diunduh.",
        "alert"
      );
    } catch (e: any) {
      showAlert("Gagal", `Gagal mengunduh PDF: ${e.message || e}`, "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePreviewAbsensiPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = await generateAbsensiPDFDoc();
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewTitle("Preview Rekapitulasi Kehadiran Siswa (SMAN 1 Cililin)");
    } catch (e: any) {
      showAlert("Gagal", `Gagal memproses Preview PDF: ${e.message || e}`, "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "20%" : "-20%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "20%" : "-20%",
      opacity: 0,
    }),
  };

  const springConfig = {
    type: "spring" as const,
    stiffness: 180,
    damping: 24,
    mass: 1,
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;

    // Check if class already exists
    const classExists = classesList.some(
      (c) => c.name.toLowerCase() === newClassName.trim().toLowerCase()
    );

    if (classExists) {
      setClassSaveMessage({
        text: "Maaf, kelas dengan nama tersebut sudah terdaftar dalam sistem.",
        type: "error",
      });
      showAlert(
        "Kelas Sudah Ada",
        "Maaf, kelas dengan nama tersebut sudah terdaftar dalam sistem.",
        "danger"
      );
      return;
    }

    try {
      const clsId = Date.now().toString();
      await setDoc(doc(db, "classes", clsId), {
        name: newClassName.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewClassName("");
      setClassSaveMessage({
        text: "Kelas berhasil ditambahkan ke database!",
        type: "success",
      });
      showAlert("Berhasil", "Kelas berhasil ditambahkan.", "alert");
      localStorage.removeItem("firas_cache_classes");
      fetchTeacherData(false);
    } catch (error) {
      setClassSaveMessage({
        text: "Gagal menambahkan kelas.",
        type: "error",
      });
      handleFirestoreError(error, OperationType.CREATE, "classes");
    }
  };

  const handleDeleteClass = async (id: string, className?: string) => {
    const targetName = (className || id || "").trim();
    const studentCount = studentsList.filter((s) => s.kelas === targetName || s.kelas === id).length;
    const confirmMessage =
      studentCount > 0
        ? `Kelas "${targetName}" memiliki ${studentCount} siswa terdaftar. Apakah Anda yakin ingin menghapus kelas ini?`
        : `Apakah Anda yakin ingin menghapus kelas "${targetName}"?`;

    showConfirm(
      "Hapus Kelas",
      confirmMessage,
      async () => {
        try {
          // 1. Optimistic UI update immediately
          setClassesList((prev) => prev.filter((c) => c.id !== id && c.name !== targetName && c.name !== id && c.id !== targetName));
          
          // 2. Invalidate cache
          localStorage.removeItem("firas_cache_classes");
          sessionStorage.removeItem("firas_cache_classes");

          // 3. Delete via dbDeleteDoc (Supabase primary + Firestore fallback)
          try {
            await deleteDoc(doc(db, "classes", id), "classes", id, targetName);
          } catch (delErr) {
            console.warn("deleteDoc classes by id error:", delErr);
          }

          if (targetName && targetName !== id) {
            try {
              await deleteDoc(doc(db, "classes", targetName), "classes", targetName, id);
            } catch (_) {}
          }

          // 4. Ensure Supabase app_collections records are fully cleared
          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.from("app_collections").delete().eq("collection_name", "classes").eq("doc_id", id);
              await supabase.from("app_collections").delete().eq("id", `classes_${id}`);
              if (targetName) {
                await supabase.from("app_collections").delete().eq("collection_name", "classes").filter("data->>name", "eq", targetName);
                await supabase.from("app_collections").delete().eq("collection_name", "classes").eq("doc_id", targetName);
                await supabase.from("app_collections").delete().eq("id", `classes_${targetName}`);
              }
            } catch (supaErr) {
              console.warn("Supabase direct delete error:", supaErr);
            }
          }

          setClassSaveMessage({
            text: `Kelas "${targetName}" berhasil dihapus.`,
            type: "success",
          });
          showAlert("Berhasil", `Kelas "${targetName}" berhasil dihapus dari sistem.`, "alert");

          // Soft refresh after delay so optimistic state stays intact
          setTimeout(() => {
            fetchTeacherData(true);
          }, 300);
        } catch (error: any) {
          console.error("Failed to delete class:", error);
          if (error?.message?.includes("Quota") || error?.code === "resource-exhausted") {
            setClassSaveMessage({
              text: `Kelas "${targetName}" berhasil dihapus secara lokal.`,
              type: "success",
            });
            showAlert("Berhasil", `Kelas "${targetName}" berhasil dihapus dari sistem.`, "alert");
          } else {
            setClassSaveMessage({
              text: "Gagal menghapus kelas.",
              type: "error",
            });
            showAlert("Gagal", "Terjadi kesalahan saat menghapus kelas.", "danger");
            handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
            fetchTeacherData(true);
          }
        }
      },
      "Hapus",
    );
  };

  const handleEditClass = (id: string, currentName: string) => {
    setEditingClassId(id);
    setEditingClassName(currentName);
  };

  const handleSaveEditClass = async () => {
    if (!editingClassName.trim() || !editingClassId) return;
    try {
      await setDoc(
        doc(db, "classes", editingClassId),
        {
          name: editingClassName,
        },
        { merge: true },
      );
      setEditingClassId(null);
      setEditingClassName("");
      setClassSaveMessage({
        text: "Perubahan nama kelas berhasil disimpan.",
        type: "success",
      });
      showAlert("Berhasil", "Perubahan nama kelas berhasil disimpan.", "alert");
      localStorage.removeItem("firas_cache_classes");
      fetchTeacherData(true);
    } catch (error) {
      setClassSaveMessage({
        text: "Gagal mengubah kelas.",
        type: "error",
      });
      showAlert("Gagal", "Gagal memperbarui nama kelas.", "danger");
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `classes/${editingClassId}`,
      );
    }
  };

  const handleSimpanSiswa = async () => {
    if (!studentName || !studentNisn || !studentClass) {
      setSaveMessage({ text: "Mohon lengkapi semua data", type: "error" });
      return;
    }

    // Validasi NISN (9 digits only for demo purposes)
    if (!/^\d{9}$/.test(studentNisn)) {
      setSaveMessage({
        text: "NIS harus terdiri dari 9 angka",
        type: "error",
      });
      return;
    }

    // Check if student with NISN already exists
    const studentExists = studentsList.some((s) => s.nisn === studentNisn);
    if (studentExists) {
      setSaveMessage({
        text: "Maaf, NIS sudah digunakan oleh siswa lain.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage({ text: "", type: "" });

    try {
      await setDoc(doc(db, "studentsByNisn", studentNisn), {
        nisn: studentNisn,
        displayName: studentName,
        kelas: studentClass,
        accessCode: studentAccessCode,
        role: "student",
        createdAt: new Date().toISOString(),
      });
      setSaveMessage({
        text: "Data siswa berhasil disimpan!",
        type: "success",
      });
      showAlert("Berhasil", "Daftar nama siswa berhasil ditambahkan.", "alert");
      localStorage.removeItem("firas_cache_students");
      fetchTeacherData(false);

      // Clear success message quickly
      setTimeout(() => {
        setSaveMessage({ text: "", type: "" });
      }, 1000);

      setStudentName("");
      setStudentNisn("");
      setStudentClass("");
      setStudentAccessCode("");
    } catch (error) {
      setSaveMessage({ text: "Gagal menyimpan data siswa.", type: "error" });
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `studentsByNisn/${studentNisn}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!assignmentBab) {
      setAssignmentMessage({ text: "Silakan pilih Bab Pembelajaran terlebih dahulu.", type: "error" });
      return;
    }
    
    setIsGeneratingTitle(true);
    setAssignmentMessage({ text: "", type: "" });
    try {
      const response = await fetchWithRetry("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bab: assignmentBab }),
      });
      
      if (!response.ok) throw new Error("Gagal generate judul");
      
      const data = await response.json();
      setAssignmentMateri(data.title);
    } catch (error) {
      console.warn(error);
      setAssignmentMessage({ text: "Gagal membuat judul dengan AI.", type: "error" });
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSimpanTugas = async () => {
    if (!assignmentBab || !assignmentMateri || !assignmentDesc) {
      setAssignmentMessage({
        text: "Mohon lengkapi judul bab, materi, dan deskripsi.",
        type: "error",
      });
      return;
    }

    const invalidTargets = assignmentTargets.some(
      (t) => !t.kelas || !t.deadline,
    );
    if (invalidTargets || assignmentTargets.length === 0) {
      setAssignmentMessage({
        text: "Mohon lengkapi semua target kelas dan tenggat waktu.",
        type: "error",
      });
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentMessage({ text: "", type: "" });

    try {
      const assignmentId = editingAssignmentId || `TGS-${Date.now()}`;

      // format targets for saving
      const formattedTargets = assignmentTargets.map((t) => ({
        kelas: t.kelas,
        publishedAt: t.publishedAt
          ? new Date(t.publishedAt).toISOString()
          : (assignmentPublishedAt ? new Date(assignmentPublishedAt).toISOString() : new Date().toISOString()),
        deadline: new Date(t.deadline).toISOString(),
      }));

      await setDoc(
        doc(db, "assignments", assignmentId),
        {
          bab: assignmentBab,
          materi: assignmentMateri,
          targets: formattedTargets,
          kelas: formattedTargets[0]?.kelas || "", // fallback
          deadline: formattedTargets[0]?.deadline || "", // fallback
          publishedAt: assignmentPublishedAt ? new Date(assignmentPublishedAt).toISOString() : new Date().toISOString(),
          description: assignmentDesc,
          taskLink: assignmentTaskLink.trim(),
          linkTugas: assignmentTaskLink.trim(),
          updatedAt: new Date().toISOString(),
          ...(editingAssignmentId
            ? {}
            : {
                createdAt: new Date().toISOString(),
                teacherId: user?.uid || "mock-admin", // using mock-admin for demo
              }),
        },
        { merge: true },
      );

      setAssignmentMessage({
        text: editingAssignmentId
          ? "Tugas berhasil diperbarui!"
          : "Tugas berhasil diterbitkan!",
        type: "success",
      });
      setTimeout(() => {
        setAssignmentMessage({ text: "", type: "" });
      }, 3000);
      setAssignmentBab("");
      setAssignmentMateri("");
      setAssignmentPublishedAt("");
      setSharedDeadline("");
      setAssignmentTargets([]);
      setAssignmentDesc("");
      setAssignmentTaskLink("");
      setEditingAssignmentId(null);
    } catch (error) {
      setAssignmentMessage({
        text: editingAssignmentId
          ? "Gagal memperbarui tugas."
          : "Gagal menerbitkan tugas.",
        type: "error",
      });
      handleFirestoreError(error, OperationType.CREATE, "assignments");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleToggleAssignmentComplete = async (id: string, currentStatus: boolean) => {
    try {
      await dbSetDoc(doc(db, "assignments", id), { isCompleted: !currentStatus }, { merge: true });
      if (previewAssignment && previewAssignment.id === id) {
        setPreviewAssignment({ ...previewAssignment, isCompleted: !currentStatus });
      }
      // Update local list for immediate UI feedback
      setAssignmentsList(prev => prev.map(a => a.id === id ? { ...a, isCompleted: !currentStatus } : a));
    } catch (e) {
      console.warn("Failed toggling assignment status:", e);
    }
  };

  const handleSimpanMateri = async () => {
    if (!materiTitle || !materiBab || !materiDriveUrl) {
      setMateriSaveMessage({
        text: "Mohon lengkapi judul materi, bab, dan link Google Drive.",
        type: "error",
      });
      return;
    }

    setIsSavingMateri(true);
    setMateriSaveMessage({ text: "", type: "" });

    try {
      const materialId = editingMateriId || `MAT-${Date.now()}`;
      await setDoc(doc(db, "materials", materialId), {
        id: materialId,
        title: materiTitle,
        description: materiDescription || "",
        subject: materiSubject,
        bab: materiBab,
        driveUrl: materiDriveUrl,
        kelasRef: materiKelas || "",
        order: 0,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      trackUsage(0, 1);
      
      setMateriTitle("");
      setMateriDescription("");
      setMateriBab("");
      setMateriDriveUrl("");
      setMateriKelas("");
      setEditingMateriId(null);
      setActiveMateriTab("daftar");
      showAlert("Berhasil", editingMateriId ? "Materi berhasil diperbarui." : "Materi baru berhasil ditambahkan.", "alert");
      localStorage.removeItem("firas_cache_materials");
      fetchTeacherData(false);
    } catch (e: any) {
      console.warn("Gagal menyimpan materi:", e);
      setMateriSaveMessage({ text: "Gagal menyimpan materi: " + (e.message || e), type: "error" });
    } finally {
      setIsSavingMateri(false);
    }
  };

  const handleDeleteMateri = async (id: string) => {
    showConfirm(
      "Hapus Materi",
      "Apakah Anda yakin ingin menghapus materi ini?",
      async () => {
        try {
          await deleteDoc(doc(db, "materials", id));
          trackUsage(0, 1);
          showAlert("Berhasil", "Materi berhasil dihapus.", "alert");
          localStorage.removeItem("firas_cache_materials");
          fetchTeacherData(false);
        } catch (e: any) {
          console.warn("Gagal menghapus materi:", e);
          showAlert("Gagal", "Gagal menghapus materi.", "danger");
        }
      },
      "Hapus"
    );
  };

  const handleEditMateri = (material: any) => {
    setEditingMateriId(material.id);
    setMateriTitle(material.title || "");
    setMateriDescription(material.description || "");
    setMateriSubject(material.subject || "Informatika");
    setMateriBab(material.bab || "");
    setMateriDriveUrl(material.driveUrl || "");
    setMateriKelas(material.kelasRef || "");
    setActiveMateriTab("tambah");
    setActiveMenu("materi-ajar");
  };

  const handleGenerateAIExam = async () => {
    if (!examSubject || !examBab) {
      setExamSaveMessage({
        text: "Silakan pilih Mata Pelajaran dan Bab terlebih dahulu.",
        type: "error",
      });
      return;
    }
    // Launch Modal and reset states
    setShowExamProgressModal(true);
    setExamGeneratorStatus("generating");
    setExamGeneratorProgress("Inisialisasi koneksi dengan server AI Gemini...");
    setExamGeneratorError("");
    setIsGeneratingExam(true);
    setExamSaveMessage({ text: "", type: "" });

    // Step indicators
    const progressSteps = [
      "Menghubungkan ke API Google Gemini...",
      "Menganalisis Bab Pelajaran Informatika Kurikulum Merdeka...",
      "Menyusun blueprint soal pilihan ganda (A, B, C, D, E)...",
      "Membuat butir soal berstandar AKM / UTBK...",
      "Memvalidasi opsi kunci jawaban dan mengukur tingkat kesulitan...",
      "Kecepatan transmisi disesuaikan, memproses token visual siswa...",
      "Hampir Selesai! Memformat hasil ke struktur JSON data sekolah..."
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setExamGeneratorProgress(progressSteps[currentStep]);
        currentStep++;
      }
    }, 2200);

    try {
      const formData = new FormData();
      formData.append("subject", examSubject);
      formData.append("bab", examBab);
      formData.append("count", examQuestionCount.toString());
      formData.append("questionFormat", examQuestionFormat);
      formData.append("tema", examTema);
      formData.append("materi", examMateri);
      formData.append("description", examDescription);
      
      const validYoutubeUrls = examYoutubeUrls.filter((u) => u.trim() !== "");
      if (validYoutubeUrls.length > 0) {
        formData.append("youtubeUrls", JSON.stringify(validYoutubeUrls));
      }

      if (examDocuments && examDocuments.length > 0) {
        examDocuments.forEach((file) => {
          formData.append("documents", file);
        });
      }

      const response = await fetchWithRetry("/api/generate-exam", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errMsg = "Koneksi terputus atau server mengembalikan respons tidak valid.";
        try {
          const errData = await response.json();
          errMsg = errData.details || errData.error || errMsg;
        } catch {
          try {
            const text = await response.text();
            if (text) errMsg = text;
          } catch (_) {}
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamQuestions(data.questions);
        if (!examToken) {
          setExamToken(generateRandomToken());
        }
        setExamGeneratorStatus("success");
        setExamSaveMessage({
          text: `Berhasil men-generate ${data.questions.length} soal berkualitas tinggi menggunakan AI Gemini! Silakan ulas, tambahkan gambar bila perlu, atau sesuaikan butir soal sebelum dirilis ke siswa.`,
          type: "success",
        });
      } else {
        throw new Error("Format data yang diterima dari AI tidak valid atau kosong.");
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.warn(error);
      setExamGeneratorStatus("error");
      const cleanError = error.message || "Gagal menghubungi API atau format tanggapan salah.";
      setExamGeneratorError(cleanError);
      setExamSaveMessage({
        text: `Gagal membuat soal: ${cleanError}`,
        type: "error",
      });
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleAddManualQuestion = (type: "multiple_choice" | "short_answer" | "essay" = "multiple_choice") => {
    const newQ =
      type === "multiple_choice"
        ? {
            type: "multiple_choice",
            text: "",
            options: ["", "", "", "", ""],
            correctIndex: 0,
            correctAnswerText: "",
          }
        : {
            type,
            text: "",
            options: [],
            correctIndex: 0,
            correctAnswerText: "",
          };
    setExamQuestions((prev) => [...prev, newQ]);
    if (!examToken) {
      setExamToken(generateRandomToken());
    }
  };

  const handleUploadQuestionImage = (qIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 760;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedUrl = canvas.toDataURL("image/jpeg", 0.78);
          setExamQuestions((prev) => {
            const next = [...prev];
            if (next[qIdx]) {
              next[qIdx] = { ...next[qIdx], imageUrl: compressedUrl };
            }
            return next;
          });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyImportedQuestions = (imported: ImportedExamQuestion[], mode: "append" | "replace") => {
    setExamQuestions((prev) => (mode === "replace" ? imported : [...prev, ...imported]));
    if (!examToken) {
      setExamToken(generateRandomToken());
    }
    setExamSaveMessage({
      text: `Berhasil mengimpor ${imported.length} butir soal ke editor Bank Soal. Silakan periksa kembali sebelum diterbitkan.`,
      type: "success",
    });
  };

  const handleCreateAnswerSheetFromExternal = () => {
    const count = Number(examQuestionCount) || 5;
    const generated = Array.from({ length: count }, (_, i) => ({
      text: `Soal Nomor ${i + 1} (Silakan lihat pada lembar dokumen PDF / Kuis Notebook LM)`,
      options: [
        "Pilihan A",
        "Pilihan B",
        "Pilihan C",
        "Pilihan D",
        "Pilihan E",
      ],
      correctIndex: 0,
    }));
    setExamQuestions(generated);
    if (!examToken) {
      setExamToken(generateRandomToken());
    }
    showAlert(
      "Lembar Jawaban Dibuat",
      `Berhasil membuat ${count} butir lembar jawaban pilihan ganda (A-E) untuk soal luar. Silakan tentukan opsi jawaban yang benar dan simpan ujian.`,
      "alert"
    );
  };

  const handleSimpanUjian = async () => {
    const targetClasses = selectedExamClasses.length > 0 ? selectedExamClasses : (examKelas ? [examKelas] : []);
    if (!examTitle.trim() || !examSubject.trim() || targetClasses.length === 0 || !examToken.trim()) {
      setExamSaveMessage({
        text: "Mohon lengkapi judul ujian, mata pelajaran, minimal 1 target kelas (checklist), dan token ujian.",
        type: "error",
      });
      return;
    }

    if (examQuestions.length === 0) {
      setExamSaveMessage({
        text: "Belum ada soal ujian. Silakan klik tombol 'Generasi Soal dengan AI' terlebih dahulu.",
        type: "error",
      });
      return;
    }

    setIsSavingExam(true);
    setExamSaveMessage({ text: "", type: "" });

    try {
      const kelasRefVal = targetClasses.includes("SEMUA_KELAS") ? "SEMUA_KELAS" : targetClasses.join(", ");
      const examId = `EXM-${Date.now()}`;
      await setDoc(doc(db, "exams", examId), {
        id: examId,
        title: examTitle.trim(),
        subject: examSubject.trim(),
        bab: examBab,
        kelasRef: kelasRefVal,
        targetClasses: targetClasses,
        token: examToken.trim().toUpperCase(),
        duration: examDuration * 60, // save in seconds
        kkm: Number(examKkm) || 75,
        category: "Pilihan Ganda",
        tema: examTema,
        materi: examMateri.trim(),
        youtubeUrls: examYoutubeUrls.filter((u) => u.trim() !== ""),
        questions: examQuestions,
        createdAt: new Date().toISOString(),
        teacherId: user?.uid || "mock-admin",
      });

      setExamSaveMessage({
        text: "Ujian Kompetensi Mandiri berhasil diterbitkan dan token dirilis!",
        type: "success",
      });

      showAlert("Berhasil", `Ujian online berhasil diterbitkan untuk kelas (${kelasRefVal}). Token ujian Anda adalah: ${examToken.toUpperCase()}`, "alert");
      localStorage.removeItem("firas_cache_exams_v2");
      fetchTeacherData(false);

      // Reset form
      setExamTitle("");
      setExamSubject("Informatika");
      setExamBab("");
      setExamKelas("");
      setSelectedExamClasses([]);
      setExamTema("Preetes");
      setExamMateri("");
      setExamDuration(30);
      setExamKkm(75);
      setExamQuestions([]);
      setExamToken("");
      setExamYoutubeUrls(["", "", ""]);
      setExamDocuments([]);
      setExamDescription("");
      setActiveExamTab("daftar");
    } catch (error) {
      setExamSaveMessage({
        text: "Gagal mempublikasikan ujian online ke cloud.",
        type: "error",
      });
      handleFirestoreError(error, OperationType.CREATE, "exams");
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleOpenPublishModal = (exam: any) => {
    setExamToPublish(exam);
    setNewPublishKelas("");
    setPublishOtherClasses([]);
    setNewPublishToken(generateRandomToken());
    setIsPublishOtherClassModalOpen(true);
  };

  const handlePublishToOtherClass = async () => {
    const targetClasses = publishOtherClasses.length > 0 ? publishOtherClasses : (newPublishKelas ? [newPublishKelas] : []);
    const effectiveClasses = targetClasses.filter((c) => c !== "SEMUA_KELAS");
    const finalClasses = effectiveClasses.length > 0 ? effectiveClasses : (classesList.length > 0 ? classesList.map(c => c.name) : targetClasses);

    if (finalClasses.length === 0 || !examToPublish || !newPublishToken.trim()) {
      showAlert("Peringatan", "Mohon pilih minimal satu kelas target (checklist) dan token ujian.", "danger");
      return;
    }

    setIsSavingDuplicateExam(true);
    try {
      for (const targetCls of finalClasses) {
        const newExamId = `EXM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, "exams", newExamId), {
          ...examToPublish,
          id: newExamId,
          kelasRef: targetCls,
          targetClasses: [targetCls],
          token: newPublishToken.toUpperCase(),
          createdAt: new Date().toISOString(),
        });
      }

      localStorage.removeItem("firas_cache_exams_v2");
      fetchTeacherData(false);

      const publishedExam = examToPublish;
      const publishedToken = newPublishToken.toUpperCase();
      const publishedTargetClasses = finalClasses;

      setIsPublishOtherClassModalOpen(false);
      showAlert(
        "Berhasil", 
        `Ujian berhasil diterbitkan untuk ${finalClasses.length} kelas target (${finalClasses.join(", ")}). Token Ujian: ${publishedToken}`, 
        "alert"
      );
      setPublishOtherClasses([]);
      setNewPublishKelas("");

      // Automatically offer to share via WhatsApp
      setShareCbtExamModal({
        isOpen: true,
        exam: publishedExam,
        customToken: publishedToken,
        customClasses: publishedTargetClasses,
      });
    } catch (error) {
      console.warn(error);
      showAlert("Gagal", "Gagal menerbitkan ulang ujian.", "danger");
    } finally {
      setIsSavingDuplicateExam(false);
    }
  };

  const handleStartEditAnnouncement = (ann: any) => {
    setEditingAnnouncementId(ann.id);
    setAnnouncementTitle(ann.title || "");
    setAnnouncementContent(ann.content || "");
    setAnnouncementKelas(ann.kelasRef || "SEMUA_KELAS");
    const rawDate = ann.publishDate || ann.createdAt || "";
    const isoDate =
      typeof rawDate === "string" && rawDate.length >= 10
        ? rawDate.slice(0, 10)
        : new Date().toISOString().split("T")[0];
    setAnnouncementPublishDate(isoDate);
    setTimeout(() => {
      announcementFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleCancelEditAnnouncement = () => {
    setEditingAnnouncementId(null);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementKelas("");
    setAnnouncementPublishDate(new Date().toISOString().split("T")[0]);
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim() || !announcementKelas) {
      showAlert("Peringatan", "Mohon lengkapi judul, konten, dan kelas sasaran pengumuman.", "danger");
      return;
    }

    setIsSavingAnnouncement(true);
    try {
      const pubDate = announcementPublishDate || new Date().toISOString().split("T")[0];
      const isEditing = Boolean(editingAnnouncementId);
      const announcementId = editingAnnouncementId || `ANN-${Date.now()}`;

      await setDoc(
        doc(db, "announcements", announcementId),
        {
          id: announcementId,
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          kelasRef: announcementKelas,
          publishDate: pubDate,
          ...(isEditing
            ? { updatedAt: new Date().toISOString() }
            : { createdAt: new Date().toISOString() }),
          teacherId: user?.uid || "mock-admin",
        },
        { merge: true }
      );

      trackUsage(0, 1);

      setEditingAnnouncementId(null);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementKelas("");
      setAnnouncementPublishDate(new Date().toISOString().split("T")[0]);

      showAlert(
        "Berhasil",
        isEditing ? "Pengumuman berhasil diperbarui." : "Pengumuman berhasil diterbitkan.",
        "alert"
      );
      localStorage.removeItem("firas_cache_announcements");
      fetchTeacherData(false);
    } catch (error) {
      console.warn(error);
      showAlert("Gagal", editingAnnouncementId ? "Gagal memperbarui pengumuman." : "Gagal menerbitkan pengumuman.", "danger");
      handleFirestoreError(error, editingAnnouncementId ? OperationType.UPDATE : OperationType.CREATE, "announcements");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    showConfirm(
      "Hapus Pengumuman",
      "Apakah Anda yakin ingin menghapus pengumuman ini?",
      async () => {
        try {
          await deleteDoc(doc(db, "announcements", id));
          if (editingAnnouncementId === id) {
            handleCancelEditAnnouncement();
          }
          showAlert("Berhasil", "Pengumuman telah dihapus.", "alert");
          localStorage.removeItem("firas_cache_announcements");
          fetchTeacherData(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
        }
      },
      "Hapus"
    );
  };

  const handleDeleteExam = async (id: string) => {
    showConfirm(
      "Hapus Ujian Online",
      "Apakah Anda yakin ingin menghapus dan membatalkan ujian online ini? Semua siswa tidak akan bisa mengakses ujian ini lagi.",
      async () => {
        try {
          await deleteDoc(doc(db, "exams", id));
          showAlert("Ujian Dihapus", "Ujian online telah dihapus dari database sekolah.", "alert");
          localStorage.removeItem("firas_cache_exams_v2");
          fetchTeacherData(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `exams/${id}`);
        }
      },
      "Hapus Ujian"
    );
  };

  const handleSaveAttendance = async () => {
    if (!attendanceDate || !attendanceClass) {
      showAlert("Peringatan", "Mohon pilih tanggal dan kelas terlebih dahulu", "danger");
      return;
    }
    setSavingAttendance(true);
    try {
      // Find students in this class
      const classStudents = studentsList.filter(s => s.kelas === attendanceClass);
      
      // Default unselected students to "Hadir"
      const completeAttendanceData = { ...attendanceData };
      classStudents.forEach(student => {
        if (!completeAttendanceData[student.nisn]) {
          completeAttendanceData[student.nisn] = "Hadir";
        }
      });

      const absensiId = `ABS-${attendanceDate}-${attendanceClass}`;
      await setDoc(doc(db, "absensi", absensiId), {
        id: absensiId,
        date: attendanceDate,
        kelasRef: attendanceClass,
        data: completeAttendanceData,
        createdAt: new Date().toISOString(),
        teacherId: user?.uid || "mock-admin",
      });

      setIsEditingAttendance(false);
      showAlert("Berhasil", "Data absensi berhasil disimpan", "alert");
      localStorage.removeItem("firas_cache_absensi");
      fetchTeacherData(false);
    } catch (e) {
      console.warn(e);
      showAlert("Gagal", "Gagal menyimpan data absensi", "danger");
    } finally {
      setSavingAttendance(false);
    }
  };

  useEffect(() => {
    if (attendanceDate && attendanceClass) {
      const existing = absensiList.find(a => a.date === attendanceDate && a.kelasRef === attendanceClass);
      if (existing) {
        setAttendanceData(existing.data || {});
        setIsEditingAttendance(false);
      } else {
        setAttendanceData({});
        setIsEditingAttendance(true);
      }
    }
  }, [attendanceDate, attendanceClass, absensiList]);

  const handleEditAbsensi = (absData: any) => {
    setAttendanceDate(absData.date);
    setAttendanceClass(absData.kelasRef);
    setAttendanceData(absData.data || {});
    setIsEditingAttendance(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteAbsensi = (id: string, dateStr?: string) => {
    const formattedDate = dateStr ? ` tanggal ${dateStr}` : "";
    showConfirm(
      "Hapus Tanggal Presensi",
      `Apakah Anda yakin ingin menghapus seluruh data presensi${formattedDate}? Seluruh rekapan kehadiran siswa pada tanggal tersebut akan dihapus secara permanen.`,
      async () => {
        try {
          await deleteDoc(doc(db, "absensi", id));
          showAlert("Berhasil", `Data presensi${formattedDate} telah berhasil dihapus.`, "alert");
          localStorage.removeItem("firas_cache_absensi");
          fetchTeacherData(false);
        } catch (e) {
          console.warn(e);
          showAlert("Gagal", "Gagal menghapus data presensi", "danger");
        }
      },
      "Hapus Tanggal"
    );
  };

   if (!isTeacherAuth) {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <div className="text-center space-y-4">
           <div className="w-12 h-12 border-4 border-[#85cc00] border-t-transparent rounded-full animate-spin mx-auto"></div>
           <p className="text-slate-400 text-sm font-medium">Memverifikasi Hak Akses...</p>
         </div>
       </div>
     );
   }

   return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-700 relative">
      <input
        id="teacher-photo-input"
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <NotificationModal
        {...modalConfig}
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
      <ResetDashboardModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        submissions={submissionsList}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        
        <header className="flex h-20 flex-shrink-0 items-center justify-between bg-gradient-to-r from-[#85cc00]/15 via-[#85cc00]/5 to-slate-50 px-4 sm:px-10 shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Hamburger button deleted per user request ("Hapus garis 3") */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                <img loading="lazy" 
                  src={getDriveImageUrl("https://drive.google.com/file/d/1P395tuZymxs3qero4XduMpHy7g2GJrdR/view?usp=sharing")}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="text-sm sm:text-lg font-black text-[#85cc00] uppercase tracking-tight whitespace-nowrap leading-none font-display">SiPinter App</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-[0.18em] leading-none whitespace-nowrap">SMA Negeri 1 Cililin</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 select-none">
            {/* Supabase Background Sync Status Indicator */}
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`hidden md:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                onlineStatus
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              }`}
              title="Status sinkronisasi data SiPinter ke Supabase. Klik untuk detail."
            >
              <span className={`w-2 h-2 rounded-full ${onlineStatus ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="truncate">
                {onlineStatus ? "Supabase: Terhubung (Sync)" : "Mode Offline (Lokal)"}
              </span>
            </button>

            {/* Refresh / Segarkan Data */}
            <button
               onClick={() => fetchTeacherData(true)}
               disabled={isRefreshingTeacherData}
               className="flex items-center justify-center w-11 h-11 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#85cc00] transition-all relative shadow-sm cursor-pointer"
               title="Segarkan / Update Data Cloud"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshingTeacherData ? "animate-spin text-[#85cc00]" : ""}`} />
            </button>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex flex-col justify-center hover:opacity-80 transition-all cursor-pointer"
              title="Keluar"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-95 transition-all border border-slate-200">
                <Power className="w-5 h-5" />
              </div>
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-emerald-50/60 via-slate-50 to-[#85cc00]/15 ${activeMenu === 'simulasi' ? 'p-0 md:p-1 pb-28 sm:pb-32' : 'p-4 sm:p-8 md:p-12 pb-28 sm:pb-32'} scroll-smooth flex flex-col relative`}>
          {/* Decorative background green glow blobs (gradasi pada sela-sela frame agar tidak polos) */}
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-[#85cc00]/15 to-emerald-400/5 blur-3xl pointer-events-none z-0" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/15 to-[#85cc00]/5 blur-3xl pointer-events-none z-0" />
          <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-emerald-200/10 to-[#85cc00]/10 blur-3xl pointer-events-none z-0" />

          <div className="w-full relative z-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeMenu}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: springConfig,
                  opacity: { duration: 0.2 },
                }}
                className="flex-grow w-full"
              >

                {activeMenu === "menu-pengguna" && (
                  <div className="space-y-8 max-w-6xl mx-auto">
                    <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-6 pb-8 border-b border-slate-200/70">
                      <div className="max-w-2xl">
                        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Menu Pengguna</h2>
                        <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed mt-1">
                          Konfigurasi identitas pengampu dan administrasi laporan penilaian.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsSupabaseModalOpen(true)}
                          className="h-11 px-5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          title="Buka Sinkronisasi Database Supabase"
                        >
                          <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Status &amp; Sinkron Supabase</span>
                        </button>
                        {!isEditingUserSettings ? (
                          <button
                            type="button"
                            onClick={() => setIsEditingUserSettings(true)}
                            className="h-11 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <Edit3 className="w-4 h-4 shrink-0" />
                            <span>Edit Profil</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsEditingUserSettings(false)}
                              className="h-11 px-5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                            >
                              <X className="w-4 h-4 shrink-0" />
                              <span>Batal</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setIsEditingUserSettings(false);
                                try {
                                  const serialized = JSON.stringify(userSettings);
                                  localStorage.setItem("sipinter_teacher_user_settings", serialized);
                                  localStorage.setItem("sipinter_teacher_settings_cache", serialized);
                                } catch (_) {}
                                try {
                                  const uid = user?.uid || "default_teacher";
                                  const syncedProfilePayload = {
                                    subjectName: userSettings.subjectName || "Informatika",
                                    teacherName: userSettings.teacherName || "Agan Parta, S.Kom.",
                                    teacherNip: userSettings.teacherNip || "-",
                                    principalName: userSettings.principalName || "Dr. H. Contoh Kepala, M.Pd.",
                                    principalNip: userSettings.principalNip || "-",
                                    academicYear: userSettings.academicYear || "2026/2027",
                                    semester: userSettings.semester || "Ganjil",
                                    updatedAt: new Date().toISOString()
                                  };
                                  const writeTasks: Promise<any>[] = [
                                    setDoc(doc(db, "users", uid), { userSettings }, { merge: true }),
                                    setDoc(doc(db, "config", "academic_period"), {
                                      academicYear: syncedProfilePayload.academicYear,
                                      semester: syncedProfilePayload.semester,
                                      updatedAt: syncedProfilePayload.updatedAt
                                    }, { merge: true }),
                                    setDoc(doc(db, "config", "teacher_profile"), syncedProfilePayload, { merge: true }),
                                  ];
                                  if (uid !== "default_teacher") {
                                    writeTasks.push(
                                      setDoc(doc(db, "users", "default_teacher"), { userSettings }, { merge: true })
                                    );
                                  }
                                  await Promise.allSettled(writeTasks);
                                  showAlert("Berhasil", "Profil pengguna berhasil diperbarui dan disinkronkan ke Rapor PDF Siswa.", "alert");
                                } catch (e) {
                                  console.warn("Gagal menyimpan profil:", e);
                                  showAlert("Error", `Gagal menyimpan profil: ${e instanceof Error ? e.message : String(e)}`, "danger");
                                }
                              }}
                              className="h-11 px-5 bg-[#85cc00] text-slate-950 font-bold text-xs rounded-xl hover:bg-[#74b300] transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                            >
                              <Save className="w-4 h-4 shrink-0" />
                              <span>Simpan Perubahan</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Row 0: Foto Profil Guru */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                          <div className="relative group shrink-0">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-slate-200/80 overflow-hidden bg-slate-100 shadow-xs">
                              <img
                                src={teacherPhotoUrl || "/assets/aistudio/faceu_20230225135623_f97f0c29.jpg"}
                                alt={userSettings.teacherName || "Foto Profil Guru"}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-slate-900">Foto Profil Guru</h3>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">
                              {userSettings.teacherName || "Agan Parta, S.Kom.Gr"}
                              {userSettings.teacherNip ? ` · NIP ${userSettings.teacherNip}` : ""}
                            </p>
                            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                              Unggah foto profil terbaru (JPG, PNG, atau WebP, maks. 10 MB). Foto ini akan otomatis tampil pada kartu profil Beranda guru.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
                          <button
                            type="button"
                            disabled={isUploadingTeacherPhoto}
                            onClick={() => {
                              const input = document.getElementById("teacher-photo-input") as HTMLInputElement | null;
                              if (input) input.click();
                            }}
                            className="h-11 px-5 bg-[#85cc00] hover:bg-[#74b300] text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            {isUploadingTeacherPhoto ? (
                              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              <Upload className="w-4 h-4 shrink-0" />
                            )}
                            <span>
                              {isUploadingTeacherPhoto
                                ? "Mengunggah..."
                                : teacherPhotoUrl
                                  ? "Ganti Foto Profil"
                                  : "Upload Foto Profil"}
                            </span>
                          </button>

                          {teacherPhotoUrl && (
                            <button
                              type="button"
                              disabled={isUploadingTeacherPhoto}
                              onClick={handlePhotoDelete}
                              className="h-11 px-5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 1: Identitas Mata Pelajaran & Periode (3 Kolom Simetris) */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4.5 h-4.5" />
                        </div>
                        <span>Identitas Mata Pelajaran</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Nama Mata Pelajaran
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Informatika"
                            value={userSettings.subjectName}
                            disabled={!isEditingUserSettings}
                            onChange={(e) => setUserSettings({ ...userSettings, subjectName: e.target.value })}
                            className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Tahun Pelajaran
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: 2026/2027"
                            value={userSettings.academicYear}
                            disabled={!isEditingUserSettings}
                            onChange={(e) => setUserSettings({ ...userSettings, academicYear: e.target.value })}
                            className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all tabular-nums ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Semester
                          </label>
                          <div className="relative">
                            <select
                              value={userSettings.semester}
                              disabled={!isEditingUserSettings}
                              onChange={(e) => setUserSettings({ ...userSettings, semester: e.target.value })}
                              className={`w-full h-12 pl-4 pr-10 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all appearance-none ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900 cursor-pointer"}`}
                            >
                              <option value="Ganjil">Ganjil</option>
                              <option value="Genap">Genap</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Data Guru & Data Kepala Sekolah (2 Kolom Simetris Sejajar) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 h-full">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <User className="w-4.5 h-4.5" />
                          </div>
                          <span>Data Guru Mata Pelajaran</span>
                        </h3>
                        <div className="space-y-5 flex-1">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                              Nama Lengkap &amp; Gelar
                            </label>
                            <input
                              type="text"
                              placeholder="Nama Guru"
                              value={userSettings.teacherName}
                              disabled={!isEditingUserSettings}
                              onChange={(e) => setUserSettings({ ...userSettings, teacherName: e.target.value })}
                              className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                              NIP Guru
                            </label>
                            <input
                              type="text"
                              placeholder="NIP Guru"
                              value={userSettings.teacherNip}
                              disabled={!isEditingUserSettings}
                              onChange={(e) => setUserSettings({ ...userSettings, teacherNip: e.target.value })}
                              className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all tabular-nums ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 h-full">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <School className="w-4.5 h-4.5" />
                          </div>
                          <span>Data Kepala Sekolah</span>
                        </h3>
                        <div className="space-y-5 flex-1">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                              Nama Kepala Sekolah
                            </label>
                            <input
                              type="text"
                              placeholder="Nama Kepala Sekolah"
                              value={userSettings.principalName}
                              disabled={!isEditingUserSettings}
                              onChange={(e) => setUserSettings({ ...userSettings, principalName: e.target.value })}
                              className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                              NIP Kepala Sekolah
                            </label>
                            <input
                              type="text"
                              placeholder="NIP Kepala Sekolah"
                              value={userSettings.principalNip}
                              disabled={!isEditingUserSettings}
                              onChange={(e) => setUserSettings({ ...userSettings, principalNip: e.target.value })}
                              className={`w-full h-12 px-4 text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all tabular-nums ${!isEditingUserSettings ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Informasi Sinkronisasi */}
                    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-[#85cc00]/15 flex items-center justify-center text-[#6ea600] shrink-0">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Informasi Sinkronisasi</h4>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-0.5">
                          Data yang Anda inputkan di sini akan otomatis digunakan sebagai identitas pada file laporan PDF maupun Excel yang diunduh.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeMenu === "dashboard" && (
                  <div className="space-y-10">
                    {/* TEACHER PROFILE & IDENTITY SECTION (Desain seperti Dasbor Siswa) */}
                    <div className="w-full bg-gradient-to-b from-white via-slate-50/80 to-slate-50/40 rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/80 shadow-md relative overflow-hidden text-center">
                      {/* Ambient background glows */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#85cc00]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-sky-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                       {/* Top Bar removed clock per user request */}

                      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
                        {/* Photo Container - Square (Kotak) with rounded corners matching student dashboard */}
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); 
                              const input = document.getElementById("teacher-photo-input") as HTMLInputElement;
                              if (input) input.click();
                            }}
                            className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-3xl border-4 border-white shadow-xl shadow-emerald-950/10 ring-1 ring-slate-200/60 overflow-hidden shrink-0 bg-slate-100 relative block cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group"
                            title="Klik untuk mengganti foto profil guru"
                          >
                            <img
                              loading="lazy"
                              src={teacherPhotoUrl || "/assets/aistudio/faceu_20230225135623_f97f0c29.jpg"}
                              alt={userSettings.teacherName || "Agan Parta, S.Kom.Gr"}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {/* Hover overlay with camera icon */}
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-2xs">
                              <Camera className="w-6 h-6" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Ubah Foto</span>
                            </div>
                          </button>
                        </div>

                        {/* Teacher Name & NIP & Mata Pelajaran */}
                        <div className="mt-5 text-center space-y-1">
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-tight font-display">
                            {userSettings.teacherName || "Agan Parta, S.Kom.Gr"}
                          </h2>
                          <p className="text-xs sm:text-sm font-bold text-[#85cc00] tracking-wider">
                            {userSettings.teacherNip ? userSettings.teacherNip : "Guru Mata Pelajaran Informatika"}
                          </p>
                          <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {userSettings.academicYear || "2026/2027"} | {userSettings.semester || "Ganjil"}
                          </p>
                          
                          
                          {/* Motivational Quote in Italics with quotes */}
                          <p className="text-xs sm:text-sm font-medium italic text-slate-600 mt-3 px-4 leading-relaxed max-w-lg mx-auto">
                            &ldquo;{motivationalQuoteInput || "Sukses adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan."}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* MENU UTAMA GURU (AKSES CEPAT SEMUA MODUL DI BERANDA - Desain seperti Dasbor Siswa) */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-end px-1">
                        <span className="text-[10px] font-black text-[#85cc00] bg-[#85cc00]/10 px-3 py-1 rounded-full uppercase tracking-wider border border-[#85cc00]/20">
                          11 Modul Guru
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
                        {/* 1. Manajemen Nilai */}
                        <div
                          onClick={() => handleMenuChange("manajemen-nilai", 3)}
                          className="bg-white hover:bg-emerald-50/60 border-2 border-emerald-100 hover:border-emerald-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {finalGradesList.length} Nilai
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                            <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-emerald-700 transition-colors">
                            Manajemen Nilai
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Rekap nilai rapor & ledger
                          </span>
                        </div>

                        {/* 2. Manajemen Siswa dan Kelas */}
                        <div
                          onClick={() => handleMenuChange("manajemen-siswa-dan-kelas", 4)}
                          className="bg-white hover:bg-blue-50/60 border-2 border-blue-100 hover:border-blue-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {studentsList.length} Siswa
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-blue-700 transition-colors">
                            Siswa & Rombel
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            {classesList.length} Kelas terdaftar
                          </span>
                        </div>

                        {/* 3. Sistem Presensi Siswa */}
                        <div
                          onClick={() => handleMenuChange("sistem-presensi-siswa", 5)}
                          className="bg-white hover:bg-teal-50/60 border-2 border-teal-100 hover:border-teal-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-teal-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {absensiList.length} Sesi
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-200">
                            <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-teal-700 transition-colors">
                            Presensi Siswa
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Absensi & jurnal kelas
                          </span>
                        </div>

                        {/* 4. Manajemen Tugas */}
                        <div
                          onClick={() => handleMenuChange("manajemen-tugas", 6)}
                          className="bg-white hover:bg-amber-50/60 border-2 border-amber-100 hover:border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {assignmentsList.length} Tugas
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
                            <FilePlus className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-amber-700 transition-colors">
                            Manajemen Tugas
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Kirim & koreksi tugas
                          </span>
                        </div>

                        {/* 5. Materi Ajar */}
                        <div
                          onClick={() => handleMenuChange("materi-ajar", 7)}
                          className="bg-white hover:bg-sky-50/60 border-2 border-sky-100 hover:border-sky-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-sky-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {materialsList.length} Modul
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all duration-200">
                            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-sky-700 transition-colors">
                            Materi Ajar
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Modul & Drive materi
                          </span>
                        </div>

                        {/* 6. Ujian Siswa (CBT) */}
                        <div
                          onClick={() => handleMenuChange("ujian-siswa", 8)}
                          className="bg-white hover:bg-purple-50/60 border-2 border-purple-100 hover:border-purple-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-purple-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {examsList.length} Ujian CBT
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-200">
                            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-purple-700 transition-colors">
                            Ujian Siswa (CBT)
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Bank soal & token CBT
                          </span>
                        </div>

                        {/* Statistik & Etika AI */}
                        <div
                          onClick={() => handleMenuChange("statistik-ai", 12)}
                          className="bg-white hover:bg-emerald-50/60 border-2 border-emerald-100 hover:border-emerald-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-700 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {aiStats.violations.length} Pelanggaran
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-emerald-700 group-hover:text-white transition-all duration-200">
                            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-emerald-800 transition-colors">
                            Statistik & Etika AI
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Pantau chat & etika digital
                          </span>
                        </div>

                        {/* 7. Simulasi BK */}
                        <div
                          onClick={() => handleMenuChange("simulasi", 1)}
                          className="bg-white hover:bg-fuchsia-50/60 border-2 border-fuchsia-100 hover:border-fuchsia-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-fuchsia-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            BK & Minat
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-fuchsia-600 group-hover:text-white transition-all duration-200">
                            <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-fuchsia-700 transition-colors">
                            Simulasi BK
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Berpikir komputasional
                          </span>
                        </div>

                        {/* 8. Pengumuman Kelas */}
                        <div
                          onClick={() => handleMenuChange("pengumuman", 9)}
                          className="bg-white hover:bg-rose-50/60 border-2 border-rose-100 hover:border-rose-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            {announcementsList.length} Pesan
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-200">
                            <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-rose-700 transition-colors">
                            Pengumuman
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Kirim pengumuman kelas
                          </span>
                        </div>

                        {/* 9. Menu Pengguna */}
                        <div
                          onClick={() => handleMenuChange("menu-pengguna", 2)}
                          className="bg-white hover:bg-indigo-50/60 border-2 border-indigo-100 hover:border-indigo-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            Profil
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                            <User className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-indigo-700 transition-colors">
                            Menu Pengguna
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Identitas mapel & profil
                          </span>
                        </div>

                        {/* 10. Manajemen Penyimpanan */}
                        <div
                          onClick={() => handleMenuChange("manajemen-penyimpanan", 10)}
                          className="bg-white hover:bg-cyan-50/60 border-2 border-cyan-100 hover:border-cyan-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-cyan-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            Cloud
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200/60 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-200">
                            <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-cyan-700 transition-colors">
                            Penyimpanan
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Google Drive & storage
                          </span>
                        </div>

                        {/* 11. Ubah Password Guru */}
                        <div
                          onClick={() => handleMenuChange("ubah-password", 11)}
                          className="bg-white hover:bg-slate-100/80 border-2 border-slate-200 hover:border-slate-300 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group relative min-h-[155px] sm:min-h-[170px]"
                        >
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-700 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                            Keamanan
                          </span>
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all duration-200">
                            <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-700 leading-tight mt-3 group-hover:text-slate-900 transition-colors">
                            Ubah Password
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                            Keamanan akun guru
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Motivational Quote Editor Card */}
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-md relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 tracking-tight">Kalimat Motivasi Siswa</h3>
                          <p className="text-xs text-slate-500 font-medium">Kalimat ini akan tampil miring dengan tanda kutip di bawah kelas pada dashboard siswa.</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={motivationalQuoteInput}
                            onChange={(e) => setMotivationalQuoteInput(e.target.value)}
                            placeholder="Tulis kalimat motivasi untuk siswa..."
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm text-slate-700 font-medium italic"
                          />
                        </div>
                        <button
                          onClick={handleSaveMotivationalQuote}
                          disabled={isSavingQuote || !motivationalQuoteInput.trim()}
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {quoteSaveSuccess ? (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              <span>Tersimpan!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>{isSavingQuote ? "Menyimpan..." : "Simpan Motivasi"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Duplicate Student Cleanup (Request: ADILA MAULIDAH) */}
                    {(() => {
                      // Find students with same name in same class
                      const nameClassMap = new Map<string, any[]>();
                      studentsList.forEach(s => {
                        const key = `${(s.displayName || s.studentName || "").toLowerCase().trim()}_${(s.kelas || "").trim()}`;
                        if (!nameClassMap.has(key)) nameClassMap.set(key, []);
                        nameClassMap.get(key)!.push(s);
                      });

                      const duplicates = Array.from(nameClassMap.entries())
                        .filter(([_, list]) => list.length > 1)
                        .map(([_, list]) => list);

                      if (duplicates.length > 0) {
                        return (
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 sm:p-8 animate-in slide-in-from-top duration-500">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Peringatan Duplikasi Data</h3>
                                <p className="text-sm font-medium text-amber-700 mt-1 leading-relaxed">
                                  Ditemukan {duplicates.length} nama siswa yang terdaftar lebih dari satu kali di kelas yang sama. Hal ini dapat menyebabkan kebingungan pada laporan nilai.
                                </p>
                                
                                <div className="mt-6 space-y-3">
                                  {duplicates.map((group, gIdx) => (
                                    <div key={`dup-group-${gIdx}`} className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
                                      <div className="flex items-center justify-between gap-4">
                                        <div>
                                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nama Siswa / Kelas</p>
                                          <p className="font-bold text-slate-900">{group[0].displayName || group[0].studentName} - <span className="text-[#85cc00]">{group[0].kelas}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                          {group.map((s, sIdx) => (
                                            <button
                                              key={`dup-btn-${sIdx}`}
                                              onClick={() => handleDeleteStudent(s.id || s.nisn, s.nisn)}
                                              className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                              title={`Hapus data dengan NIS ${s.nisn}`}
                                            >
                                              Hapus NIS {s.nisn}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}


                  </div>
                )}

                  {activeMenu === "manajemen-siswa-dan-kelas" && (
                    <div className="space-y-12">
                      <div className="flex gap-4 border-b border-slate-200">
                        <button onClick={() => setActiveStudentClassTab("input-siswa")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activeStudentClassTab === "input-siswa" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Input Siswa</button>
                        <button onClick={() => setActiveStudentClassTab("input-kelas")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activeStudentClassTab === "input-kelas" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Input Kelas</button>
                        <button onClick={() => setActiveStudentClassTab("daftar-siswa")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activeStudentClassTab === "daftar-siswa" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Daftar Siswa</button>
                      </div>

                      {activeStudentClassTab === "input-siswa" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Input Siswa</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Input data identitas siswa baru ke dalam database atau gunakan fitur impor massal.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-10">
                            {saveMessage.text && (
                              <div
                                className={`max-w-6xl rounded-xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500 border ${getAlertClasses(saveMessage.type)}`}
                              >
                                {getAlertIcon(saveMessage.type)}
                                <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">
                                  {saveMessage.text}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40">
                                <h3 className="text-xl font-bold mb-6">Input Manual</h3>
                                <div className="space-y-4">
                                  <input type="text" placeholder="Nama Lengkap Siswa" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all" />
                                  <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Pilih Kelas</option>
                                    {classesList.map((c, idx) => <option key={`opt-stu-cls-${c.id || c.name || idx}-${idx}`} value={c.name}>{c.name}</option>)}
                                  </select>
                                  <input type="text" placeholder="NIS" value={studentNisn} onChange={(e) => setStudentNisn(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all" />
                                  <input type="text" placeholder="Kode Akses" value={studentAccessCode} onChange={(e) => setStudentAccessCode(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all" />
                                  <button onClick={handleSimpanSiswa} disabled={isSaving} className="bg-[#85cc00] hover:bg-[#74b300] text-white p-3 rounded-xl w-full font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving ? (
                                      <>
                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                        <span>Menyimpan...</span>
                                      </>
                                    ) : (
                                      "Simpan Data Siswa"
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40">
                                  <h3 className="text-xl font-bold mb-6">Impor dari Excel</h3>
                                  <label className="cursor-pointer group/upload flex flex-col justify-center w-full h-56 bg-white border-2 border-dashed border-slate-200 hover:border-[#85cc00] hover:bg-slate-50 rounded-[2.5rem] transition-all duration-500 overflow-hidden relative">
                                    <div className="flex flex-col justify-center px-10 relative z-10">
                                      <p className="text-sm text-slate-900 font-bold uppercase tracking-wider mb-1">
                                        Pilih Berkas Excel
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display italic">
                                        Mendukung: .XLSX dan .XLS
                                      </p>
                                    </div>
                                    <input
                                      type="file"
                                      accept=".xlsx, .xls"
                                      className="hidden"
                                      onChange={handleImportExcel}
                                      disabled={isSaving}
                                    />
                                  </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeStudentClassTab === "input-kelas" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Input Kelas</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Tambahkan kelas baru dan pantau daftar kelas yang telah terdaftar dalam sistem.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40 h-fit">
                              <h3 className="text-xl font-bold mb-6">Tambah Kelas Baru</h3>
                              <div className="space-y-4">
                                <input type="text" placeholder="Nama Ruang Kelas" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all" />
                                <button onClick={handleAddClass} className="bg-[#85cc00] hover:bg-[#74b300] text-white p-3 rounded-xl w-full font-bold transition-colors">Simpan Kelas</button>
                              </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40">
                              <h3 className="text-xl font-bold mb-6">Daftar Kelas</h3>
                              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {classesList.length > 0 ? (
                                  classesList.map((cls, idx) => {
                                    const studentCount = studentsList.filter(s => s.kelas === cls.name).length;
                                    return (
                                      <div key={`cls-card-${cls.id || cls.name || idx}-${idx}`} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-[#85cc00]/30 hover:bg-slate-50 transition-all">
                                        {editingClassId === cls.id ? (
                                          <div className="flex-1 flex items-center gap-2 mr-3">
                                            <input
                                              type="text"
                                              value={editingClassName}
                                              onChange={(e) => setEditingClassName(e.target.value)}
                                              className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#85cc00] outline-none font-semibold text-slate-800"
                                              placeholder="Nama kelas..."
                                              autoFocus
                                            />
                                            <button
                                              onClick={handleSaveEditClass}
                                              className="bg-[#85cc00] hover:bg-[#74b300] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                            >
                                              Simpan
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation();  setEditingClassId(null); setEditingClassName(""); }}
                                              className="text-slate-500 hover:bg-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                            >
                                              Batal
                                            </button>
                                          </div>
                                        ) : (
                                          <div>
                                            <p className="font-bold text-slate-900 text-lg">{cls.name}</p>
                                            <p className="text-slate-500 text-sm font-medium">{studentCount} Siswa</p>
                                          </div>
                                        )}
                                        {editingClassId !== cls.id && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleEditClass(cls.id, cls.name)}
                                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteClass(cls.id, cls.name)}
                                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Hapus
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-slate-400 font-medium">Belum ada kelas yang terdaftar</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeStudentClassTab === "daftar-siswa" && (
                        <div className="space-y-12">
                          <div className="flex flex-col items-center text-center pb-10 border-b border-slate-100">
                            <div className="max-w-2xl text-center">
                              <h2 className="text-2xl font-bold text-slate-950">
                                Daftar Siswa
                              </h2>
                              <p className="text-base text-slate-600 font-normal leading-relaxed max-w-lg mx-auto">
                                Kelola dan pantau seluruh data siswa yang terdaftar dalam sistem akademik.
                              </p>
                            </div>
                          </div>
                          
                          {/* Filter Kelas & Search Input for Students */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                              {/* Filter Kelas */}
                              <div className="md:col-span-4">
                                <label htmlFor="student-class-filter" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                                  Filter Kelas :
                                </label>
                                <select
                                  id="student-class-filter"
                                  value={studentClassFilter}
                                  onChange={(e) => setStudentClassFilter(e.target.value)}
                                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all text-slate-900 shadow-sm font-bold cursor-pointer h-[42px]"
                                >
                                  <option value="SEMUA_KELAS">-- Semua Kelas --</option>
                                  {Array.from(
                                    new Set([
                                      ...classesList.map((c) => c.name || c.id),
                                      ...studentsList.map((s) => s.kelas),
                                    ].filter(Boolean))
                                  ).sort().map((clsName, idx) => (
                                    <option key={`stu-cls-filter-${clsName}-${idx}`} value={clsName}>
                                      Kelas {clsName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Pencarian Siswa */}
                              <div className="md:col-span-5">
                                <label htmlFor="student-search" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                                  Pencarian Siswa :
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-slate-400" />
                                  </span>
                                  <input
                                    id="student-search"
                                    type="text"
                                    placeholder="Ketik Nama Lengkap, NIS, atau Kelas..."
                                    value={studentSearchQuery}
                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#85cc00] focus:border-[#85cc00] outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-sm h-[42px]"
                                  />
                                  {studentSearchQuery && (
                                    <button
                                      onClick={() => setStudentSearchQuery("")}
                                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                      title="Bersihkan Pencarian"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Total Siswa - Simetris dengan input & label */}
                              <div className="md:col-span-3">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                                  Total Data Siswa :
                                </span>
                                <div className="w-full h-[42px] px-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#85cc00] animate-pulse"></span>
                                    <span className="text-slate-500 font-semibold">Tampil</span>
                                  </div>
                                  <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 font-black font-mono">
                                    {filteredStudents.length} / {studentsList.length} Siswa
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border border-slate-200 rounded-xl shadow-sm max-h-[600px] overflow-y-auto overflow-x-auto">
                            <table className="w-full text-left border-collapse font-sans text-xs min-w-[800px]">
                              <thead className="sticky top-0 bg-slate-50 z-10">
                                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <th className="py-3 px-3 border border-slate-200 text-center w-12 bg-slate-50 md:sticky md:left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]">No</th>
                                  <th className="py-3 px-3 border border-slate-200 text-center w-24 bg-slate-50">Poto Siswa</th>
                                  <th className="py-3 px-3 border border-slate-200 bg-slate-50 min-w-[180px] sticky left-[48px] z-20 shadow-[1px_0_0_0_#e2e8f0]">Nama Lengkap Siswa</th>
                                  <th className="py-3 px-3 border border-slate-200 text-center w-36 bg-slate-50">NIS</th>
                                  <th className="py-3 px-3 border border-slate-200 text-center w-32 bg-slate-50">Kelas</th>
                                  <th className="py-3 px-3 border border-slate-200 text-center w-36 bg-slate-50">Kode Akses</th>
                                  <th className="py-3 px-3 border border-slate-200 text-center w-40 bg-slate-50">Opsi (Edit dan Hapus)</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {studentsList.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-12 px-6 text-center text-slate-400 font-medium border border-slate-200 bg-slate-50/50">
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                          <User className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">Belum ada siswa yang terdaftar</span>
                                        <span className="text-xs text-slate-400">Silakan tambahkan siswa baru di menu di atas atau impor via Excel.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : filteredStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-12 px-6 text-center text-slate-400 font-medium border border-slate-200 bg-slate-50/50">
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                          <SearchX className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">Nama Tersebut tidak terdaftar di Database</span>
                                        <span className="text-xs text-slate-400">Coba gunakan kata kunci pencarian yang berbeda atau periksa ejaan Anda.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  filteredStudents.map((student, idx) => (
                                  <tr key={`stu-dft-${student.id || student.nisn || idx}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                    {/* 1. No */}
                                    <td className="py-2.5 px-3 text-center border border-slate-200 font-medium text-slate-500 sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0]">
                                      {idx + 1}
                                    </td>

                                    {/* 2. Poto Siswa */}
                                    <td className="py-2.5 px-3 border border-slate-200 text-center sticky left-[52px] z-10 bg-white shadow-[1px_0_0_0_#e2e8f0]">
                                      <div className="flex justify-center items-center">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); 
                                            if (student.profilePhotoUrl) {
                                              setZoomedPhotoUrl(getDriveImageUrl(student.profilePhotoUrl));
                                              setZoomedStudentName(student.displayName || "Foto Siswa");
                                            }
                                          }}
                                          disabled={!student.profilePhotoUrl}
                                          className={`w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center transition-transform group ${
                                            student.profilePhotoUrl ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"
                                          }`}
                                          title={student.profilePhotoUrl ? "Klik untuk memperbesar" : "Belum ada foto"}
                                        >
                                          {student.profilePhotoUrl ? (
                                            <img loading="lazy" 
                                              src={getDriveImageUrl(student.profilePhotoUrl)} 
                                              alt={student.displayName} 
                                              referrerPolicy="no-referrer"
                                              className="w-full h-full object-cover group-hover:opacity-90" 
                                            />
                                          ) : (
                                            <User className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                                          )}
                                        </button>
                                      </div>
                                    </td>

                                    {/* 3. Nama Lengkap Siswa */}
                                    <td className="py-2.5 px-3 border border-slate-200 font-medium text-slate-900 leading-normal sticky left-[124px] z-10 bg-white shadow-[1px_0_0_0_#e2e8f0]">
                                      {student.displayName}
                                    </td>

                                    {/* 4. NISN */}
                                    <td className="py-2.5 px-3 border border-slate-200 text-center font-normal text-slate-600">
                                      {student.nisn}
                                    </td>

                                    {/* 5. Kelas */}
                                    <td className="py-2.5 px-3 border border-slate-200 text-center font-normal text-slate-600">
                                      {student.kelas}
                                    </td>

                                    {/* 6. Kode Akses */}
                                    <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-slate-600">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span>{student.accessCode}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); 
                                            navigator.clipboard.writeText(student.accessCode);
                                            setCopiedAccessCode(student.accessCode);
                                            setTimeout(() => setCopiedAccessCode(null), 2000);
                                          }}
                                          className="p-1 text-slate-400 hover:text-[#85cc00] hover:bg-slate-100 rounded transition-all cursor-pointer"
                                          title="Salin Kode Akses"
                                        >
                                          {copiedAccessCode === student.accessCode ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </td>

                                    {/* 7. Opsi (Edit dan Hapus) */}
                                    <td className="py-2.5 px-3 border border-slate-200 text-center">
                                      <div className="flex justify-center items-center gap-1.5">
                                        <button 
                                          onClick={() => handleEditStudent(student)} 
                                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-transparent rounded transition-all cursor-pointer shadow-sm text-center inline-flex items-center gap-1"
                                        >
                                          Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteStudent(student.id, student.nisn)} 
                                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-transparent rounded transition-all cursor-pointer shadow-sm text-center inline-flex items-center gap-1"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                               )}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      )}
                    </div>
                  )}







                  {activeMenu === "sistem-presensi-siswa" && (
                    <div className="space-y-12">
                      <div className="flex gap-4 border-b border-slate-200">
                        <button onClick={() => setActivePresensiTab("input")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activePresensiTab === "input" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Sistem Absensi</button>
                        <button onClick={() => setActivePresensiTab("preview")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activePresensiTab === "preview" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Preview Absensi</button>
                        <button onClick={() => setActivePresensiTab("analisis")} className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${activePresensiTab === "analisis" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"}`}>Analisis Presensi</button>
                      </div>

                      {activePresensiTab === "input" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Sistem Absensi</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Kelola dan pantau kehadiran siswa berdasarkan tanggal dan kelas secara presisi.
                              </p>
                            </div>
                          </div>

                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-6">
                        <div className="flex flex-row gap-6 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-3">
                              Tanggal Pelaksanaan Presensi
                            </label>
                            <input
                              type="date"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[#85cc00]/20"
                              value={attendanceDate}
                              onChange={(e) => setAttendanceDate(e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-normal text-slate-400 uppercase tracking-widest mb-3">
                              Rombongan Belajar / Kelas Binaan
                            </label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[#85cc00]/20"
                              value={attendanceClass}
                              onChange={(e) => setAttendanceClass(e.target.value)}
                            >
                              <option value="">-- Pilih Rombongan Belajar (Kelas) --</option>
                              {classesList.map((cls, idx) => (
                                <option key={`att-sel-cls-${cls.id || cls.name || idx}-${idx}`} value={cls.name}>
                                  {cls.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {attendanceClass && (
                          <div className="pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-slate-800">Daftar Siswa</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-xs font-black text-slate-950 uppercase tracking-widest bg-slate-100">
                                    <th className="p-4 rounded-tl-2xl w-16 text-center whitespace-nowrap">No</th>
                                    <th className="p-4 whitespace-nowrap">Nama Lengkap Siswa</th>
                                    <th className="p-4 rounded-tr-2xl w-1/2 text-center border-l border-slate-100">Status Kehadiran / Keterangan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {studentsList.filter((s) => s.kelas === attendanceClass).length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="p-8 text-center text-slate-400 font-medium">Belum ada data siswa di kelas ini.</td>
                                    </tr>
                                  )}
                                  {studentsList
                                    .filter((s) => s.kelas === attendanceClass)
                                    .map((student, idx) => (
                                      <tr key={`stu-att-${student.id || student.nisn || idx}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-center font-mono font-black text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{student.displayName}</td>
                                        <td className="p-4 text-center border-l border-slate-100 flex justify-center gap-2">
                                          {["Hadir", "Sakit", "Izin", "Alpa", "Dispen"].map((status, statusIdx) => (
                                            <button
                                              key={`status-btn-${status}-${statusIdx}`}
                                              disabled={!isEditingAttendance}
                                              onClick={() => setAttendanceData(prev => ({ ...prev, [student.nisn]: status }))}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
                                                (attendanceData[student.nisn] || "Hadir") === status
                                                  ? status === "Hadir" ? "bg-emerald-100/50 text-emerald-700 border-emerald-200"
                                                    : status === "Sakit" ? "bg-amber-100/50 text-amber-700 border-amber-200"
                                                    : status === "Izin" ? "bg-blue-100/50 text-blue-700 border-blue-200"
                                                    : status === "Alpa" ? "bg-rose-100/50 text-rose-700 border-rose-200"
                                                    : "bg-purple-100/50 text-purple-700 border-purple-200" // Dispen
                                                  : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                                              } ${!isEditingAttendance ? "opacity-60 cursor-not-allowed" : ""}`}
                                            >
                                              {status}
                                            </button>
                                          ))}
                                        </td>
                                      </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-8 flex justify-end items-center gap-3 flex-wrap">
                              {attendanceDate && attendanceClass && absensiList.find(a => a.date === attendanceDate && a.kelasRef === attendanceClass) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); 
                                    const rec = absensiList.find(a => a.date === attendanceDate && a.kelasRef === attendanceClass);
                                    if (rec) handleDeleteAbsensi(rec.id, attendanceDate);
                                  }}
                                  className="px-5 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 border border-rose-200/80 transition-colors cursor-pointer"
                                  title="Hapus Tanggal Presensi Ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Hapus Tanggal Presensi</span>
                                </button>
                              )}
                              {!isEditingAttendance && (
                                <button
                                  onClick={() => setIsEditingAttendance(true)}
                                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
                                >
                                  Edit Absen
                                </button>
                              )}
                              <button
                                onClick={handleSaveAttendance}
                                disabled={savingAttendance || !isEditingAttendance}
                                className="px-6 py-3 bg-[#85cc00] text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 shadow-lg shadow-[#85cc00]/20 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                {savingAttendance ? "Menyimpan..." : "Simpan Absen"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#85cc00] to-emerald-500"></div>
                        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/50 bg-white/95 gap-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                            Riwayat Absensi {attendanceClass ? `- Kelas ${attendanceClass}` : ""}
                          </h3>
                          <div className="flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 px-5 py-2.5 rounded-2xl border border-emerald-100/60 shadow-sm">
                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
                              <ClipboardList className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-600/60 leading-none mb-1">Total Terdata</p>
                              <p className="text-sm font-black text-emerald-900 leading-none">
                                {attendanceClass ? absensiList.filter((a) => a.kelasRef === attendanceClass).length : 0} <span className="text-[10px] opacity-60">Pertemuan</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto p-4 sm:p-8">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30">
                                <th className="py-5 px-6 rounded-tl-2xl">Tanggal / Waktu</th>
                                <th className="py-5 px-6">Kelas Tujuan</th>
                                <th className="py-5 px-6 rounded-tr-2xl text-right">Aksi & Opsi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                              {attendanceClass && absensiList
                                .filter((a) => a.kelasRef === attendanceClass)
                                .map((absData, idx) => {
                                  const cls = classesList.find(c => c.id === absData.kelasRef);
                                  return (
                                    <tr key={`abs-hist-${absData.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors group">
                                      <td className="py-5 px-6 group-hover:bg-slate-50/40">
                                         <div className="flex flex-col">
                                           <span className="font-bold text-slate-900">{absData.date}</span>
                                           {absData.createdAt && <span className="text-[11px] font-medium text-slate-400 mt-0.5">{new Date(absData.createdAt).toLocaleTimeString('id-ID')} WIB</span>}
                                         </div>
                                      </td>
                                      <td className="py-5 px-6">
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-600">
                                          {cls?.name || absData.kelasRef}
                                        </span>
                                      </td>
                                      <td className="py-5 px-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                           <button
                                             onClick={() => handleEditAbsensi(absData)}
                                             className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-100 flex items-center gap-1.5"
                                             title="Edit Data Absensi"
                                           >
                                             <Edit className="w-3.5 h-3.5" />
                                             <span>Edit</span>
                                           </button>
                                           <button
                                             onClick={() => handleDeleteAbsensi(absData.id, absData.date)}
                                             className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-100 flex items-center gap-1.5"
                                             title="Hapus Tanggal Presensi"
                                           >
                                             <Trash2 className="w-3.5 h-3.5" />
                                             <span>Hapus Tanggal</span>
                                           </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              {!attendanceClass && (
                                <tr>
                                  <td colSpan={3} className="py-20 text-center">
                                    <div className="flex flex-col gap-4 text-slate-300">
                                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 opacity-50" />
                                      </div>
                                      <p className="text-xs font-bold uppercase tracking-widest">Silakan pilih kelas terlebih dahulu</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {attendanceClass && absensiList.filter((a) => a.kelasRef === attendanceClass).length === 0 && (
                                <tr>
                                  <td colSpan={3} className="py-20 text-center">
                                    <div className="flex flex-col gap-4 text-slate-300">
                                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                        <Calendar className="w-8 h-8 opacity-50" />
                                      </div>
                                      <p className="text-xs font-bold uppercase tracking-widest">Belum ada data absensi untuk kelas ini</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePresensiTab === "preview" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b border-slate-100">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl font-bold text-slate-950">Preview Absensi</h2>
                          <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Tinjau rekapitulasi kehadiran siswa berdasarkan kelas.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                          <select
                            value={attendanceClass}
                            onChange={(e) => setAttendanceClass(e.target.value)}
                            className="bg-white border border-slate-300 rounded-2xl px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-[#85cc00]/20 min-w-[180px]"
                          >
                            <option value="">-- Pilih Rombongan Belajar --</option>
                            {classesList.map((c, idx) => (
                              <option key={`dl-att-cls-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button 
                            onClick={handleDownloadPreviewExcel}
                            className="bg-emerald-600 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all text-xs"
                          >
                             <FileText className="w-4 h-4" /> Ekspor Excel
                          </button>
                          <button 
                            onClick={handlePreviewAbsensiPDF}
                            className="bg-sky-600 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-sky-700 transition-all text-xs"
                          >
                             <Eye className="w-4 h-4" /> Preview PDF
                          </button>
                          <button 
                            onClick={handleDownloadPreviewPDF}
                            className="bg-rose-600 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all text-xs"
                          >
                             <FileText className="w-4 h-4" /> Ekspor PDF
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left" id="previewAbsensiTable">
                            <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-16">No</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nama Lengkap Siswa</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Kelas</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Hadir</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Sakit</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Izin</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Alpa</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Dispen</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Persentase</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(attendanceClass ? studentsList.filter(s => s.kelas === attendanceClass) : studentsList).map((s: any, idx: number) => {
                                const { hadir, sakit, izin, alpa, dispen, persentase } = getStudentAbsensiCounts(s, absensiList, attendanceClass);
                                
                                return (
                                  <tr key={`abs-sum-${s.id || s.nisn || idx}-${s.kelas || ''}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-center font-mono font-black text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{s.displayName || s.studentName}</td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-600 whitespace-nowrap">{s.kelas || "-"}</td>
                                    <td className="px-6 py-4 text-center font-bold text-emerald-600">{hadir}</td>
                                    <td className="px-6 py-4 text-center text-slate-600">{sakit}</td>
                                    <td className="px-6 py-4 text-center text-slate-600">{izin}</td>
                                    <td className="px-6 py-4 text-center text-slate-600">{alpa}</td>
                                    <td className="px-6 py-4 text-center text-slate-600">{dispen}</td>
                                    <td className="px-6 py-4 text-center font-black text-[#85cc00]">{persentase}%</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePresensiTab === "analisis" && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex flex-col text-center md:text-left md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl font-bold text-slate-950">Analisis Presensi</h2>
                          <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Pantau tingkat kehadiran dan identifikasi siswa yang jarang masuk secara otomatis.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                          <label className="text-[10px] font-normal uppercase tracking-widest text-slate-400">Rombongan Belajar (Kelas Analisis)</label>
                          <select
                            className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-normal text-slate-900 outline-none focus:border-[#85cc00] transition-all shadow-sm min-w-[200px]"
                            value={analysisClass}
                            onChange={(e) => setAnalysisClass(e.target.value)}
                          >
                            <option value="">-- Pilih Rombongan Belajar (Kelas) --</option>
                            {classesList.map((cls, idx) => (
                              <option key={`anl-cls-${cls.id || cls.name || idx}-${idx}`} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {analysisClass ? (
                        <div className="grid grid-cols-1 gap-8">
                          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-black text-slate-900 leading-none">Laporan Kehadiran Kelas {analysisClass}</h3>
                                <div className="mt-3 inline-flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                  <BarChart3 className="w-3 h-3 text-slate-400" />
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                    Analisis Berdasarkan <span className="text-slate-900">{absensiList.filter(a => a.kelasRef === analysisClass).length}</span> Pertemuan
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-center px-4 border-r border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kritis</p>
                                  <p className="text-xl font-black text-rose-500">{attendanceAnalysis.filter(s => s.warningLevel === 'critical').length}</p>
                                </div>
                                <div className="text-center px-4">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pantau</p>
                                  <p className="text-xl font-black text-amber-500">{attendanceAnalysis.filter(s => s.warningLevel === 'warning').length}</p>
                                </div>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="py-6 px-8">No</th>
                                    <th className="py-6 px-8">Nama Siswa</th>
                                    <th className="py-6 px-8 text-center">Statistik (H/S/I/A)</th>
                                    <th className="py-6 px-8 text-center">Persentase</th>
                                    <th className="py-6 px-8 text-right">Rubrik Kehadiran</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {attendanceAnalysis.map((data, idx) => (
                                    <tr key={`warn-${data.nisn || idx}-${idx}`} className={`hover:bg-slate-50 transition-colors ${data.warningLevel === 'critical' ? 'bg-rose-50/30' : ''}`}>
                                      <td className="py-6 px-8 text-xs font-black text-slate-400">{idx + 1}</td>
                                      <td className="py-6 px-8 whitespace-nowrap">
                                        <div>
                                          <p className="font-bold text-slate-900 whitespace-nowrap">{data.displayName}</p>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">NIS: {data.nisn}</p>
                                        </div>
                                      </td>
                                      <td className="py-6 px-8">
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="flex flex-col min-w-[30px]">
                                            <span className="text-[10px] font-black text-emerald-500">{data.stats.Hadir}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">H</span>
                                          </div>
                                          <div className="w-px h-6 bg-slate-100"></div>
                                          <div className="flex flex-col min-w-[30px]">
                                            <span className="text-[10px] font-black text-amber-500">{data.stats.Sakit}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">S</span>
                                          </div>
                                          <div className="w-px h-6 bg-slate-100"></div>
                                          <div className="flex flex-col min-w-[30px]">
                                            <span className="text-[10px] font-black text-blue-500">{data.stats.Izin}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">I</span>
                                          </div>
                                          <div className="w-px h-6 bg-slate-100"></div>
                                          <div className="flex flex-col min-w-[30px]">
                                            <span className="text-[10px] font-black text-rose-500">{data.stats.Alpa}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">A</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-6 px-8 text-center">
                                        <div className="flex flex-col gap-2">
                                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full transition-all duration-1000 ${
                                                data.attendanceRate >= 90 ? 'bg-emerald-500' :
                                                data.attendanceRate >= 80 ? 'bg-amber-500' :
                                                'bg-rose-500'
                                              }`}
                                              style={{ width: `${data.attendanceRate}%` }}
                                            ></div>
                                          </div>
                                          <span className={`text-xs font-black ${
                                            data.attendanceRate >= 90 ? 'text-emerald-600' :
                                            data.attendanceRate >= 80 ? 'text-amber-600' :
                                            'text-rose-600'
                                          }`}>{data.attendanceRate}%</span>
                                        </div>
                                      </td>
                                      <td className="py-6 px-8 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            data.rubricStatus === "Sangat Rajin" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                            data.rubricStatus === "Rajin" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                            data.rubricStatus === "Cukup Rajin" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                            "bg-rose-100 text-rose-700 border-rose-200"
                                          }`}>
                                            {data.rubricStatus}
                                          </span>
                                          {data.warningLevel === 'critical' && (
                                            <button 
                                              onClick={() => handleBukaWhatsAppModal(
                                                data, 
                                                [], 
                                                data.attendanceRate, 
                                                data.stats, 
                                                data.totalMeetings, 
                                                "N/A"
                                              )}
                                              className="text-[9px] font-black text-blue-600 uppercase tracking-tighter hover:underline"
                                            >
                                              Kirim Laporan ke Orang Tua
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-3xl font-black text-emerald-900 leading-none">
                                  {attendanceAnalysis.filter(s => s.attendanceRate >= 90).length}
                                </p>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Siswa Rajin (≥ 90%)</p>
                              </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex flex-col gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow-sm">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-3xl font-black text-amber-900 leading-none">
                                  {attendanceAnalysis.filter(s => s.attendanceRate < 90 && s.attendanceRate >= 80).length}
                                </p>
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">Perlu Pemantauan</p>
                              </div>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 flex flex-col gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                                <AlertOctagon className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-3xl font-black text-rose-900 leading-none">
                                  {attendanceAnalysis.filter(s => s.attendanceRate < 80).length}
                                </p>
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-2">Jarang Masuk ({"<"} 80%)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                          <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <BarChart3 className="w-12 h-12 text-slate-200" />
                          </div>
                          <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Pilih kelas untuk melihat analisis</p>
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  )}

                  {activeMenu === "manajemen-tugas" && (
                    <div className="space-y-8 max-w-6xl mx-auto">
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => setActiveAssignmentTab("tambah")}
                          className={`pb-3.5 px-4 font-bold uppercase tracking-widest text-xs transition-colors inline-flex items-center gap-2 cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                            activeAssignmentTab === "tambah"
                              ? "text-[#6ea600] border-[#85cc00]"
                              : "text-slate-400 border-transparent hover:text-slate-600"
                          }`}
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Buat Tugas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveAssignmentTab("daftar")}
                          className={`pb-3.5 px-4 font-bold uppercase tracking-widest text-xs transition-colors inline-flex items-center gap-2 cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                            activeAssignmentTab === "daftar"
                              ? "text-[#6ea600] border-[#85cc00]"
                              : "text-slate-400 border-transparent hover:text-slate-600"
                          }`}
                        >
                          <ClipboardList className="w-4 h-4 shrink-0" />
                          <span>Daftar Tugas</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                            {assignmentsList.filter((a) => !a.isArchived).length}
                          </span>
                        </button>
                      </div>

                      {activeAssignmentTab === "tambah" && (
                        <div className="max-w-5xl mx-auto">
                          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
                            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#6ea600] border border-emerald-100 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                  {editingAssignmentId ? "Edit Konfigurasi Tugas" : "Konfigurasi Tugas"}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                  Definisikan parameter akademik, target kelas, dan tenggat pengumpulan.
                                </p>
                              </div>
                            </div>

                            {assignmentMessage.text && (
                              <div
                                className={`rounded-2xl p-4 flex items-start gap-3 border ${
                                  assignmentMessage.type === "error"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {assignmentMessage.type === "error" ? (
                                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                )}
                                <p className="text-xs font-bold leading-relaxed">
                                  {assignmentMessage.text}
                                </p>
                              </div>
                            )}

                            <div className="space-y-6">
                              {/* Baris 1: Pilih Bab & Judul Tugas Sejajar */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                                <div className="space-y-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    1. Pilih Bab Pembelajaran
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={assignmentBab}
                                      onChange={(e) => setAssignmentBab(e.target.value)}
                                      className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all text-sm font-semibold text-slate-800 appearance-none cursor-pointer"
                                    >
                                      <option value="">-- Pilih Bab Pembelajaran --</option>
                                      <option value="Informatika dan Keterampilan Generik">Informatika dan Keterampilan Generik</option>
                                      <option value="Berpikir Komputasional (BK)">Berpikir Komputasional (BK)</option>
                                      <option value="Teknologi Informasi dan Komunikasi (TIK)">Teknologi Informasi dan Komunikasi (TIK)</option>
                                      <option value="Sistem Komputer (SK)">Sistem Komputer (SK)</option>
                                      <option value="Jaringan Komputer dan Internet (JKI)">Jaringan Komputer dan Internet (JKI)</option>
                                      <option value="Analisis Data (AD)">Analisis Data (AD)</option>
                                      <option value="Algoritma dan Pemrograman (AP)">Algoritma dan Pemrograman (AP)</option>
                                      <option value="Dampak Sosial Informatika (DSI)">Dampak Sosial Informatika (DSI)</option>
                                      <option value="Praktik Lintas Bidang (PLB)">Praktik Lintas Bidang (PLB)</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    2. Tugas ke / Judul Tugas
                                  </label>
                                  <input
                                    type="text"
                                    value={assignmentMateri}
                                    onChange={(e) => setAssignmentMateri(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all text-sm font-semibold text-slate-800"
                                    placeholder="Contoh: Tugas 1 Dekomposisi"
                                  />
                                </div>
                              </div>

                              {/* 3. Pilih Kelas */}
                              <div className="space-y-2.5">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  3. Pilih Kelas Target (Bisa Lebih dari Satu)
                                </label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                  <div className="flex items-center gap-3">
                                    <input
                                      id="checkbox-all-classes"
                                      type="checkbox"
                                      checked={assignmentTargets.length === classesList.length && classesList.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAssignmentTargets(
                                            classesList.map((c) => ({
                                              kelas: c.name,
                                              deadline: sharedDeadline,
                                            }))
                                          );
                                        } else {
                                          setAssignmentTargets([]);
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                                    />
                                    <label htmlFor="checkbox-all-classes" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                                      Pilih Semua Kelas
                                    </label>
                                  </div>
                                  <div className="h-px bg-slate-200" />
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {classesList.map((c, idx) => {
                                      const isChecked = assignmentTargets.some((t) => t.kelas === c.name);
                                      return (
                                        <label
                                          key={`asg-cls-chk-${c.id || c.name || idx}-${idx}`}
                                          htmlFor={`checkbox-class-${c.id}`}
                                          className={`flex items-center gap-2.5 h-10 px-3 rounded-xl border transition-colors cursor-pointer select-none ${
                                            isChecked
                                              ? "bg-white border-[#85cc00] text-slate-900"
                                              : "bg-white/70 border-slate-200 text-slate-600 hover:border-slate-300"
                                          }`}
                                        >
                                          <input
                                            id={`checkbox-class-${c.id}`}
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setAssignmentTargets((prev) => [
                                                  ...prev.filter((t) => t.kelas !== c.name),
                                                  {
                                                    kelas: c.name,
                                                    deadline: sharedDeadline,
                                                  },
                                                ]);
                                              } else {
                                                setAssignmentTargets((prev) => prev.filter((t) => t.kelas !== c.name));
                                              }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer shrink-0"
                                          />
                                          <span className="text-xs font-semibold truncate">
                                            Kelas {c.name}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* 4. Tanggal Terbit & Tenggat Waktu Per Kelas */}
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    4. Tanggal Terbit &amp; Tenggat Waktu
                                  </label>
                                  <span className="text-xs font-medium text-slate-500">
                                    Jadwal dapat disesuaikan per kelas
                                  </span>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                  <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                      Atur Massal Tanggal Terbit
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={assignmentPublishedAt}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAssignmentPublishedAt(val);
                                        setAssignmentTargets((prev) =>
                                          prev.map((t) => ({ ...t, publishedAt: val }))
                                        );
                                      }}
                                      className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none tabular-nums"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                      Atur Massal Jam Deadline
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={sharedDeadline}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSharedDeadline(val);
                                        setAssignmentTargets((prev) =>
                                          prev.map((t) => ({ ...t, deadline: val }))
                                        );
                                      }}
                                      className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none tabular-nums"
                                    />
                                  </div>
                                </div>

                                {assignmentTargets.length > 0 && (
                                  <div className="space-y-3 pt-1">
                                    {assignmentTargets.map((target, idx) => (
                                      <div key={`asg-target-${target.kelas || idx}-${idx}`} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            Kelas {target.kelas}
                                          </span>
                                          <span className="text-xs text-slate-400 font-semibold tabular-nums">
                                            Target #{idx + 1}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                          <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                              Tanggal Terbit ({target.kelas})
                                            </label>
                                            <input
                                              type="datetime-local"
                                              value={target.publishedAt || assignmentPublishedAt || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setAssignmentTargets((prev) =>
                                                  prev.map((t) => (t.kelas === target.kelas ? { ...t, publishedAt: val } : t))
                                                );
                                              }}
                                              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none tabular-nums"
                                            />
                                          </div>
                                          <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                              Deadline ({target.kelas})
                                            </label>
                                            <input
                                              type="datetime-local"
                                              value={target.deadline || sharedDeadline || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setAssignmentTargets((prev) =>
                                                  prev.map((t) => (t.kelas === target.kelas ? { ...t, deadline: val } : t))
                                                );
                                              }}
                                              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none tabular-nums"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Instruksi */}
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  5. Instruksi Tugas
                                </label>
                                <textarea
                                  rows={4}
                                  value={assignmentDesc}
                                  onChange={(e) => setAssignmentDesc(e.target.value)}
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all text-sm font-medium text-slate-800 resize-none"
                                  placeholder="Tuliskan detail instruksi tugas untuk siswa..."
                                />
                              </div>

                              {/* Link File / Video Tugas */}
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                  6. Link Berkas Soal / Referensi (Opsional)
                                </label>
                                <input
                                  type="url"
                                  value={assignmentTaskLink}
                                  onChange={(e) => setAssignmentTaskLink(e.target.value)}
                                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all text-sm font-medium text-slate-800"
                                  placeholder="https://drive.google.com/... atau https://youtu.be/..."
                                />
                                <p className="text-xs text-slate-500">
                                  Link akan tampil pada kolom &ldquo;Lihat Tugas&rdquo; di tabel tugas siswa agar dapat dibuka langsung.
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                              {editingAssignmentId && (
                                <button
                                  type="button"
                                  onClick={handleBatalEditAssignment}
                                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Batal Edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleSimpanTugas}
                                disabled={isSavingAssignment}
                                className="w-full sm:w-auto min-w-[220px] h-12 px-6 bg-[#85cc00] hover:bg-[#74b300] text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4 shrink-0" />
                                <span>
                                  {isSavingAssignment
                                    ? "Menyimpan..."
                                    : editingAssignmentId
                                      ? "Perbarui & Terbitkan"
                                      : "Simpan & Terbitkan"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeAssignmentTab === "daftar" && (() => {
                        const activeAssignments = assignmentsList.filter((a) => !a.isArchived);

                        const babOptions = Array.from(
                          new Set([
                            "Informatika dan Keterampilan Generik",
                            "Berpikir Komputasional (BK)",
                            "Teknologi Informasi dan Komunikasi (TIK)",
                            "Sistem Komputer (SK)",
                            "Jaringan Komputer dan Internet (JKI)",
                            "Analisis Data (AD)",
                            "Algoritma dan Pemrograman (AP)",
                            "Dampak Sosial Informatika (DSI)",
                            "Praktik Lintas Bidang (PLB)",
                            ...activeAssignments.map((a) => String(a.bab || "").trim()).filter(Boolean),
                          ])
                        );

                        const statusCounts = {
                          Semua: activeAssignments.length,
                          Aktif: activeAssignments.filter((a) => getAssignmentStatus(a) === "Aktif").length,
                          Selesai: activeAssignments.filter((a) => getAssignmentStatus(a) === "Selesai").length,
                          Kedaluwarsa: activeAssignments.filter((a) => getAssignmentStatus(a) === "Kedaluwarsa").length,
                        };

                        const searchLower = assignmentSearchQuery.trim().toLowerCase();

                        const filteredAssignments = activeAssignments
                          .filter((a) => {
                            if (assignmentStatusFilter !== "Semua") {
                              if (getAssignmentStatus(a) !== assignmentStatusFilter) return false;
                            }
                            if (assignmentBabFilter && String(a.bab || "").trim() !== assignmentBabFilter) {
                              return false;
                            }
                            if (selectedDaftarTugasClasses.length > 0) {
                              const matchesClass = a.targets?.some((tgt: any) =>
                                selectedDaftarTugasClasses.includes(tgt.kelas)
                              );
                              if (!matchesClass) return false;
                            }
                            if (searchLower) {
                              const titleMatch = String(a.materi || "").toLowerCase().includes(searchLower);
                              const babMatch = String(a.bab || "").toLowerCase().includes(searchLower);
                              const descMatch = String(a.description || "").toLowerCase().includes(searchLower);
                              if (!titleMatch && !babMatch && !descMatch) return false;
                            }
                            return true;
                          })
                          .sort((a, b) => {
                            const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
                            const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
                            return dateB - dateA;
                          });

                        const hasActiveFilters =
                          assignmentStatusFilter !== "Semua" ||
                          selectedDaftarTugasClasses.length > 0 ||
                          assignmentBabFilter !== "" ||
                          assignmentSearchQuery.trim() !== "";

                        const resetAllDaftarFilters = () => {
                          setAssignmentStatusFilter("Semua");
                          setSelectedDaftarTugasClasses([]);
                          setAssignmentBabFilter("");
                          setAssignmentSearchQuery("");
                        };

                        return (
                          <div className="space-y-6">
                            {/* Header Section Simetris */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
                              <div className="max-w-2xl text-center md:text-left">
                                <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Daftar Tugas</h2>
                                <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed mt-1">
                                  Pantau, saring, dan kelola seluruh penugasan yang telah dipublikasikan kepada siswa.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleBatalEditAssignment();
                                    setActiveAssignmentTab("tambah");
                                  }}
                                  className="h-11 px-5 bg-[#85cc00] hover:bg-[#74b300] text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                                >
                                  <Plus className="w-4 h-4 shrink-0" />
                                  <span>Buat Tugas Baru</span>
                                </button>
                              </div>
                            </div>

                            {/* Unified Toolbar Filter (Textbox, Dropdown Bab, Dropdown Kelas & Tombol Status Sejajar Presisi) */}
                            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                {/* Textbox Pencarian */}
                                <div className="md:col-span-5 space-y-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Cari Tugas
                                  </label>
                                  <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={assignmentSearchQuery}
                                      onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                                      placeholder="Cari judul tugas, bab, atau instruksi..."
                                      className="w-full h-11 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all"
                                    />
                                    {assignmentSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => setAssignmentSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center cursor-pointer transition-colors"
                                        title="Bersihkan pencarian"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Dropdown Filter Bab */}
                                <div className="md:col-span-4 space-y-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Filter Bab
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={assignmentBabFilter}
                                      onChange={(e) => setAssignmentBabFilter(e.target.value)}
                                      className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all appearance-none cursor-pointer"
                                    >
                                      <option value="">Semua Bab Pembelajaran</option>
                                      {babOptions.map((bab) => (
                                        <option key={`filter-bab-${bab}`} value={bab}>
                                          {bab}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                                  </div>
                                </div>

                                {/* Dropdown Filter Kelas */}
                                <div className="md:col-span-3 space-y-2">
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Filter Kelas
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={selectedDaftarTugasClasses.length === 1 ? selectedDaftarTugasClasses[0] : ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedDaftarTugasClasses(val ? [val] : []);
                                      }}
                                      className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#85cc00]/40 focus:border-[#85cc00] outline-none transition-all appearance-none cursor-pointer"
                                    >
                                      <option value="">Semua Kelas</option>
                                      {classesList.map((c, idx) => (
                                        <option key={`filter-kelas-opt-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                          Kelas {c.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                                  </div>
                                </div>
                              </div>

                              {/* Baris Status Buttons + Counter & Reset Sejajar */}
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
                                  {(["Semua", "Aktif", "Selesai", "Kedaluwarsa"] as const).map((status) => {
                                    const isActive = assignmentStatusFilter === status;
                                    return (
                                      <button
                                        key={`filter-status-${status}`}
                                        type="button"
                                        onClick={() => setAssignmentStatusFilter(status)}
                                        className={`h-10 px-4 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border ${
                                          isActive
                                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                      >
                                        <span>{status}</span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                                            isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                                          }`}
                                        >
                                          {statusCounts[status]}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                                  <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                                    Menampilkan <strong className="text-slate-900">{filteredAssignments.length}</strong> dari {activeAssignments.length} tugas
                                  </span>
                                  {hasActiveFilters && (
                                    <button
                                      type="button"
                                      onClick={resetAllDaftarFilters}
                                      className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5 shrink-0" />
                                      <span>Reset Filter</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Grid Kartu Tugas Simetris & Presisi */}
                            {filteredAssignments.length === 0 ? (
                              <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-12 sm:p-16 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400">
                                  <ZapOff className="w-7 h-7" />
                                </div>
                                <div className="space-y-1.5">
                                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                                    {hasActiveFilters ? "Tidak Ada Tugas yang Cocok" : "Belum Ada Tugas Dipublikasikan"}
                                  </h3>
                                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                                    {hasActiveFilters
                                      ? "Tidak ditemukan tugas dengan kombinasi pencarian, bab, kelas, atau status yang dipilih."
                                      : "Buat penugasan pertama Anda agar siswa dapat mulai mengerjakan dan mengumpulkan tugas."}
                                  </p>
                                </div>
                                <div className="pt-2 flex justify-center">
                                  {hasActiveFilters ? (
                                    <button
                                      type="button"
                                      onClick={resetAllDaftarFilters}
                                      className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                    >
                                      <RefreshCw className="w-4 h-4 shrink-0" />
                                      <span>Tampilkan Semua Tugas</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveAssignmentTab("tambah")}
                                      className="h-11 px-5 rounded-xl bg-[#85cc00] hover:bg-[#74b300] text-slate-950 text-xs font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                    >
                                      <Plus className="w-4 h-4 shrink-0" />
                                      <span>Buat Tugas Baru</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 items-stretch">
                                {filteredAssignments.map((t, idx) => {
                                  const statusLabel = getAssignmentStatus(t);
                                  const statusStyle =
                                    statusLabel === "Aktif"
                                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                      : statusLabel === "Selesai"
                                        ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                                        : "text-rose-700 bg-rose-50 border-rose-200";
                                  const taskHref = t.taskLink || t.linkTugas || t.fileUrl;
                                  const normalizedHref = taskHref
                                    ? taskHref.startsWith("http")
                                      ? taskHref
                                      : `https://${taskHref}`
                                    : "";

                                  return (
                                    <div
                                      key={`asg-card-${t.id || idx}-${idx}`}
                                      onClick={() => setPreviewAssignment(t)}
                                      className="group flex flex-col justify-between h-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-[#85cc00] hover:shadow-md transition-all duration-200 cursor-pointer"
                                    >
                                      {/* Header Kartu */}
                                      <div>
                                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                                          <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#6ea600] shrink-0">
                                              <School className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-[#6ea600] uppercase tracking-wider truncate">
                                                {t.bab || "Umum"}
                                              </p>
                                              <p className="text-xs font-medium text-slate-500 mt-0.5 tabular-nums truncate">
                                                Rilis: {getAssignmentPublishedAtForTeacher(t, selectedDaftarTugasClasses.length === 1 ? selectedDaftarTugasClasses[0] : undefined)}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditAssignment(t);
                                              }}
                                              className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-[#6ea600] hover:border-[#85cc00] rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95"
                                              title="Sunting Tugas"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAssignment(t.id);
                                              }}
                                              className="w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95"
                                              title="Arsipkan Tugas"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Judul & Target Kelas */}
                                        <div className="py-5 space-y-4">
                                          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 min-h-[3.25rem]">
                                            {t.materi}
                                          </h3>

                                          {normalizedHref && (
                                            <div>
                                              <a
                                                href={normalizedHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 h-8 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors max-w-full"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                                <span className="truncate max-w-[260px]">Lampiran Soal / Link Tugas</span>
                                              </a>
                                            </div>
                                          )}

                                          <div className="flex flex-wrap gap-2">
                                            {t.targets?.map((tgt: any, i: number) => {
                                              const dl = tgt.deadline ? new Date(tgt.deadline).getTime() : 0;
                                              const diff = dl - Date.now();
                                              const isNear = statusLabel === "Aktif" && diff > 0 && diff < 24 * 60 * 60 * 1000;
                                              return (
                                                <span
                                                  key={`tgt-badge-${tgt.kelas || i}-${i}`}
                                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-flex items-center gap-1.5 tabular-nums ${
                                                    isNear
                                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                                  }`}
                                                >
                                                  {isNear && <Clock className="w-3 h-3 shrink-0" />}
                                                  <span>{tgt.kelas}</span>
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Footer Kartu Simetris */}
                                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap ${statusStyle}`}>
                                            {statusLabel}
                                          </span>
                                          <span className="text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">
                                            · {t.targets?.length || 0} Kelas
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAssignmentFilter(t.id);
                                            setActiveMenu("manajemen-nilai");
                                            setActiveNilaiTab("cek-tugas");
                                          }}
                                          className="h-10 px-5 bg-[#85cc00] hover:bg-[#74b300] text-slate-950 rounded-xl text-xs font-bold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                        >
                                          <span>Audit Kinerja</span>
                                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activeMenu === "manajemen-nilai" && (
                    <div className="space-y-12">
                      <div className="flex gap-4 border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => setActiveNilaiTab("cek-tugas")}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer ${
                            activeNilaiTab === "cek-tugas"
                              ? "text-[#85cc00] border-b-2 border-[#85cc00]"
                              : "text-slate-400"
                          }`}
                        >
                          Audit Pengumpulan
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNilaiTab("rekapitulasi")}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer ${
                            activeNilaiTab === "rekapitulasi"
                              ? "text-[#85cc00] border-b-2 border-[#85cc00]"
                              : "text-slate-400"
                          }`}
                        >
                          Buku Nilai
                        </button>
                      </div>
                      
                      {/* Pre-calculate maps for Buku Nilai performance */}
                      {(() => {
                        if (activeNilaiTab !== "rekapitulasi") return null;
                        return null; // Just a placeholder for calculation scope
                      })()}


                      {activeNilaiTab === "cek-tugas" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">
                                Audit Pengumpulan
                              </h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Tinjau pengumpulan tugas siswa dan kelola nilai tugas secara efisien.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                              <button
                                onClick={handleRefreshSubmissions}
                                disabled={isRefreshingSubmissions}
                                className="w-full sm:min-w-[200px] h-13 px-5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                title="Perbarui daftar pengumpulan tugas siswa secara langsung dari server"
                              >
                                <RefreshCw className={`w-4 h-4 text-[#85cc00] shrink-0 ${isRefreshingSubmissions ? "animate-spin" : ""}`} />
                                <span>{isRefreshingSubmissions ? "Menyinkronkan..." : "Segarkan Respon"}</span>
                              </button>
                              <button
                                onClick={handleMassAudit}
                                disabled={isMassAuditing}
                                className="w-full sm:min-w-[200px] h-13 px-5 bg-[#85cc00] text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-xl shadow-[#85cc00]/20 transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                {isMassAuditing ? (
                                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                ) : (
                                  <Zap className="w-4 h-4 shrink-0" />
                                )}
                                <span>Audit Semua Respon</span>
                              </button>
                            </div>
                          </div>

                          {/* Sub-Tabs untuk Kategori Audit Pengumpulan */}
                          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-lg">
                            {(() => {
                              const countBaru = submissionsList.filter(s => {
                                const isGraded = s.status === "sudah dinilai" || (s.nilai !== undefined && s.nilai !== null && s.nilai !== "");
                                if (isGraded) return false;
                                const isDitolak = s.status === "ditolak";
                                const isPerbaikan = !isDitolak && (!!s.resubmittedAt || s.wasRejected === true || !!s.keterangan);
                                return !isDitolak && !isPerbaikan;
                              }).length;

                              const countPerbaikan = submissionsList.filter(s => {
                                const isGraded = s.status === "sudah dinilai" || (s.nilai !== undefined && s.nilai !== null && s.nilai !== "");
                                if (isGraded) return false;
                                const isDitolak = s.status === "ditolak";
                                const isPerbaikan = !isDitolak && (!!s.resubmittedAt || s.wasRejected === true || !!s.keterangan);
                                return isPerbaikan;
                              }).length;

                              const countDitolak = submissionsList.filter(s => {
                                const isGraded = s.status === "sudah dinilai" || (s.nilai !== undefined && s.nilai !== null && s.nilai !== "");
                                if (isGraded) return false;
                                const isDitolak = s.status === "ditolak";
                                return isDitolak;
                              }).length;

                              return (
                                <>
                                  <button
                                    onClick={() => setActiveAuditSubTab("tugas-baru")}
                                    className={`w-full min-h-[50px] px-2 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer shadow-sm ${
                                      activeAuditSubTab === "tugas-baru"
                                        ? "bg-[#85cc00] text-slate-950 shadow-md shadow-[#85cc00]/20"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      <span className="text-center leading-tight">Tugas Baru</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${activeAuditSubTab === "tugas-baru" ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-700"}`}>
                                      {countBaru}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => setActiveAuditSubTab("tugas-perbaikan")}
                                    className={`w-full min-h-[50px] px-2 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer shadow-sm ${
                                      activeAuditSubTab === "tugas-perbaikan"
                                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      <span className="text-center leading-tight">Tugas Perbaikan</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${activeAuditSubTab === "tugas-perbaikan" ? "bg-white text-amber-900" : "bg-slate-200 text-slate-700"}`}>
                                      {countPerbaikan}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => setActiveAuditSubTab("tugas-ditolak")}
                                    className={`w-full min-h-[50px] px-2 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer shadow-sm ${
                                      activeAuditSubTab === "tugas-ditolak"
                                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                      <span className="text-center leading-tight">Tugas Ditolak</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${activeAuditSubTab === "tugas-ditolak" ? "bg-white text-rose-900" : "bg-slate-200 text-slate-700"}`}>
                                      {countDitolak}
                                    </span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40">
                            <div className="space-y-4">
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2.5">
                                <User className="w-4 h-4 text-[#85cc00]" />
                                Cari Nama Siswa
                              </label>
                              <div className="relative group">
                                <input
                                  type="text"
                                  placeholder="Ketik nama atau NIS..."
                                  value={selectedStudentSearchFilter}
                                  onChange={(e) =>
                                    setSelectedStudentSearchFilter(e.target.value)
                                  }
                                  className="block w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-10 py-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#85cc00] transition-colors">
                                  <Search className="w-4 h-4" />
                                </div>
                                {selectedStudentSearchFilter && (
                                  <button
                                    onClick={() => setSelectedStudentSearchFilter("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                    title="Hapus pencarian"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-[#85cc00]" />
                                Pilih Tugas
                              </label>
                              <div className="relative group">
                                <select
                                  value={selectedAssignmentFilter}
                                  onChange={(e) =>
                                    setSelectedAssignmentFilter(e.target.value)
                                  }
                                  className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer"
                                >
                                  <option value="">Semua Tugas Aktif</option>
                                  {assignmentsList.map((a, idx) => (
                                    <option key={`asg-opt-${a.id || idx}-${idx}`} value={a.id}>
                                      {a.materi}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#85cc00] transition-colors">
                                  <ChevronDown className="w-5 h-5" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2.5">
                                <Filter className="w-4 h-4 text-[#85cc00]" />
                                Filter Kelas
                              </label>
                              <div className="relative group">
                                <select
                                  value={selectedClassFilter}
                                  onChange={(e) =>
                                    setSelectedClassFilter(e.target.value)
                                  }
                                  className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer"
                                >
                                  <option value="">Semua Kelas</option>
                                  {classesList.map((c, idx) => (
                                    <option key={`cls-flt-opt-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#85cc00] transition-colors">
                                  <ChevronDown className="w-5 h-5" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {(() => {
                              const filtered = submissionsList
                                .filter((sub) => {
                                  const isGraded = sub.status === "sudah dinilai" || (sub.nilai !== undefined && sub.nilai !== null && sub.nilai !== "");
                                  if (isGraded) return false;
                                  const isDitolak = sub.status === "ditolak";
                                  const isPerbaikan = !isDitolak && (!!sub.resubmittedAt || sub.wasRejected === true || !!sub.keterangan);

                                  if (activeAuditSubTab === "tugas-baru") {
                                    if (isDitolak || isPerbaikan) return false;
                                  } else if (activeAuditSubTab === "tugas-perbaikan") {
                                    if (!isPerbaikan) return false;
                                  } else if (activeAuditSubTab === "tugas-ditolak") {
                                    if (!isDitolak) return false;
                                  }

                                  const matchTask = selectedAssignmentFilter
                                    ? String(sub.assignmentId).trim() === String(selectedAssignmentFilter).trim()
                                    : true;
                                  const student = studentsList.find(s => isSameNisn(s.nisn, sub.nisn));
                                  const studentClass = sub.kelas || student?.kelas || "";
                                  const matchClass = selectedClassFilter
                                    ? isClassMatch(studentClass, selectedClassFilter)
                                    : true;
                                  const studentDisplayName = (student?.displayName || student?.studentName || student?.name || sub.studentName || "").toLowerCase();
                                  const searchQuery = selectedStudentSearchFilter.trim().toLowerCase();
                                  const matchStudent = searchQuery
                                    ? studentDisplayName.includes(searchQuery) || 
                                      (sub.nisn && String(sub.nisn).toLowerCase().includes(searchQuery)) ||
                                      (student?.nisn && String(student.nisn).toLowerCase().includes(searchQuery))
                                    : true;
                                  return matchTask && matchClass && matchStudent;
                                })
                                .sort((a, b) => {
                                  const getPriority = (sub: any) => {
                                    const isPending = sub.status !== "sudah dinilai" && !sub.nilai;
                                    const isResubmitted = sub.status !== "ditolak" && (!!sub.resubmittedAt || sub.wasRejected === true || !!sub.keterangan);
                                    if (isResubmitted && isPending) return 1;
                                    if (isResubmitted) return 2;
                                    if (isPending) return 3;
                                    return 4;
                                  };
                                  const prioA = getPriority(a);
                                  const prioB = getPriority(b);
                                  if (prioA !== prioB) return prioA - prioB;

                                  const timeA = new Date(a.submittedAt || a.createdAt || a.updatedAt || 0).getTime();
                                  const timeB = new Date(b.submittedAt || b.createdAt || b.updatedAt || 0).getTime();
                                  return timeB - timeA;
                                });

                              if (filtered.length === 0) {
                                return (
                                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic shadow-xl">
                                    <SearchX className="w-20 h-20 text-slate-200 mx-auto mb-6 stroke-[1]" />
                                    Data pengumpulan tugas tidak ditemukan
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {filtered.map((sub, idx) => {
                                    const assignment = assignmentsList.find(
                                      (a) => String(a.id) === String(sub.assignmentId),
                                    );
                                    const student = studentsList.find(s => isSameNisn(s.nisn, sub.nisn));
                                    const studentDisplayName = student?.displayName || student?.studentName || student?.name || sub.studentName || "Siswa";
                                    const studentKelas = student?.kelas || sub.kelas || "-";
                                    const isTruePerbaikan = sub.status !== "ditolak" && (!!sub.resubmittedAt || sub.wasRejected === true || !!sub.keterangan);
                                    const isResubmittedPending = isTruePerbaikan && sub.status !== "sudah dinilai" && !sub.nilai;
                                    const isExpanded = expandedSubmissionId === (sub.id || `sub-${idx}`);

                                    return (
                                      <div
                                        key={`sub-card-${sub.id || idx}-${idx}`}
                                        className={`bg-white rounded-[2.5rem] border transition-all duration-300 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden ${
                                          isResubmittedPending
                                            ? "border-amber-400 ring-2 ring-amber-400/20"
                                            : "border-slate-200 hover:border-[#85cc00]/50"
                                        }`}
                                      >
                                        {/* Card Header / Summary */}
                                        <div className="p-6 md:p-8 flex flex-col gap-6 flex-1">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3.5">
                                              {student?.profilePhotoUrl ? (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); 
                                                    if (student?.profilePhotoUrl) {
                                                      setZoomedPhotoUrl(getDriveImageUrl(student.profilePhotoUrl));
                                                      setZoomedStudentName(studentDisplayName || "Foto Siswa");
                                                    }
                                                  }}
                                                  className="w-12 h-12 rounded-2xl overflow-hidden cursor-pointer shrink-0 border border-slate-200 shadow-md hover:ring-2 hover:ring-[#85cc00] active:scale-95 transition-all"
                                                  title="Klik untuk memperbesar foto"
                                                >
                                                  <img 
                                                    src={getDriveImageUrl(student.profilePhotoUrl)} 
                                                    alt={studentDisplayName} 
                                                    referrerPolicy="no-referrer"
                                                    className="w-full h-full object-cover" 
                                                  />
                                                </button>
                                              ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-extrabold text-sm uppercase border border-slate-200 shadow-sm shrink-0">
                                                  {String(studentDisplayName || "S").charAt(0)}
                                                </div>
                                              )}
                                              <div>
                                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                                  {studentDisplayName}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                  {studentKelas} • {sub.nisn}
                                                </p>
                                              </div>
                                            </div>

                                            <span
                                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider border shrink-0 ${
                                                sub.status === "ditolak" ? "bg-rose-50 text-rose-600 border-rose-200" : isResubmittedPending ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                              }`}
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full ${sub.status === "ditolak" ? "bg-rose-500" : "bg-amber-500 animate-pulse"}`} />
                                              {sub.status === "ditolak" ? "Ditolak" : isResubmittedPending ? "Perbaikan" : "Menunggu"}
                                            </span>
                                          </div>

                                          {/* Task Info */}
                                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight">
                                                {assignment?.materi || "Tugas Mandiri"}
                                              </span>
                                              <span className="text-[10px] font-bold text-[#85cc00] bg-[#85cc00]/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                {getAssignmentPublishedAtForTeacher(assignment, sub.kelas)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                                              <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {(() => {
                                                  const dt = sub.submittedAt || sub.createdAt || sub.updatedAt;
                                                  return dt ? new Date(dt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
                                                })()}
                                              </span>
                                              <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {(() => {
                                                  const dt = sub.submittedAt || sub.createdAt || sub.updatedAt;
                                                  return dt ? new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
                                                })()}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Expanded Instant Details & Inline Grading */}
                                          {isExpanded && (
                                            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                              <div className="space-y-2">
                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                                  Jawaban & Catatan Siswa:
                                                </span>
                                                <div className="bg-slate-100/70 p-3.5 rounded-xl text-xs font-medium text-slate-700 max-h-40 overflow-auto custom-scrollbar">
                                                  {sub.jawaban || sub.keterangan || "Tidak ada catatan teks dari siswa."}
                                                </div>
                                                {sub.fileUrl && (
                                                  <a
                                                    href={getDriveImageUrl(sub.fileUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-[#85cc00] hover:underline bg-[#85cc00]/10 px-3 py-2 rounded-xl w-full justify-center"
                                                  >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Lihat Berkas / Lampiran Tugas
                                                  </a>
                                                )}
                                              </div>

                                              {/* Inline Grading Form */}
                                              <div className="space-y-3 pt-2">
                                                <div className="flex gap-2">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="Nilai (0-100)"
                                                    value={inlineGrades[sub.id || idx] || ""}
                                                    onChange={(e) => setInlineGrades({ ...inlineGrades, [sub.id || idx]: e.target.value })}
                                                    className="w-1/3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-[#85cc00] outline-none text-center"
                                                  />
                                                  <input
                                                    type="text"
                                                    placeholder="Catatan guru..."
                                                    value={inlineFeedback[sub.id || idx] || ""}
                                                    onChange={(e) => setInlineFeedback({ ...inlineFeedback, [sub.id || idx]: e.target.value })}
                                                    className="w-2/3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-[#85cc00] outline-none"
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => handleInlineSaveGrade(sub, inlineGrades[sub.id || idx] || "100", inlineFeedback[sub.id || idx] || "Sangat baik")}
                                                    disabled={isInlineSaving === (sub.id || idx)}
                                                    className="flex-1 py-2.5 bg-[#85cc00] text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:brightness-110 shadow-md shadow-[#85cc00]/20 transition-all flex items-center justify-center gap-1.5"
                                                  >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>{isInlineSaving === (sub.id || idx) ? "Menyimpan..." : "Beri Nilai & Setujui"}</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Card Actions */}
                                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                                          <button
                                            onClick={() => setExpandedSubmissionId(isExpanded ? null : (sub.id || `sub-${idx}`))}
                                            className="text-xs font-extrabold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                                          >
                                            {isExpanded ? (
                                              <>
                                                <span>Tutup Detail</span>
                                                <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                                              </>
                                            ) : (
                                              <>
                                                <span>Detail Instan</span>
                                                <ChevronDown className="w-4 h-4 transition-transform" />
                                              </>
                                            )}
                                          </button>

                                          <button
                                            onClick={() => handleTinjauNilai(sub)}
                                            className="px-5 py-2.5 bg-[#85cc00] text-slate-950 text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:brightness-110 shadow-md shadow-[#85cc00]/20 transition-all active:scale-95"
                                          >
                                            Audit Lengkap
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {activeNilaiTab === "rekapitulasi" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-4 pb-2">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">
                                Buku Nilai
                              </h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Tinjau rekapitulasi nilai akhir siswa dan pantau performa akademik kelas secara global.
                              </p>
                            </div>
                          </div>
                          
                          {/* Rubrik Penilaian Rapor Card */}
                          <div className="bg-white rounded-[2.5rem] shadow-lg shadow-slate-100/90 p-8 md:p-10 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#85cc00] shadow-xs">
                                  <Settings className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-950">
                                    Konfigurasi Rubrik Nilai Rapor
                                  </h3>
                                  <p className="text-xs text-slate-400 font-medium">
                                    Atur persentase bobot penilaian untuk kalkulasi Nilai Rapor akhir siswa.
                                  </p>
                                </div>
                              </div>
                              {!isEditingRubric ? (
                                <button
                                  onClick={() => setIsEditingRubric(true)}
                                  className="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-[#85cc00] hover:text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit Proporsi Bobot
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleSaveRubric}
                                    disabled={isSavingRubric}
                                    className="px-5 py-2.5 bg-[#85cc00] text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                  >
                                    {isSavingRubric ? "Menyimpan..." : "Simpan Rubrik"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); 
                                      setIsEditingRubric(false);
                                      setEditKehadiran(String(rubric.kehadiran));
                                      setEditTugas(String(rubric.tugas));
                                      setEditUts(String(rubric.uts));
                                      setEditUas(String(rubric.uas));
                                    }}
                                    className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              )}
                            </div>

                            {!isEditingRubric ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between hover:border-emerald-200 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Kehadiran</span>
                                    <Users className="w-4 h-4 text-emerald-500 opacity-30" />
                                  </div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-display font-black text-emerald-600">{rubric.kehadiran}</span>
                                    <span className="text-xs font-bold text-emerald-400">%</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug mt-3 font-medium">Bobot dari persentase kehadiran siswa (jumlah hadir & dispen).</p>
                                </div>

                                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col justify-between hover:border-blue-200 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Tugas & Harian</span>
                                    <BookOpen className="w-4 h-4 text-blue-500 opacity-30" />
                                  </div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-display font-black text-blue-600">{rubric.tugas}</span>
                                    <span className="text-xs font-bold text-blue-400">%</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug mt-3 font-medium">Bobot rata-rata tugas dan ujian harian (Pretest/Postest/Ulangan).</p>
                                </div>

                                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col justify-between hover:border-amber-200 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Ujian Tengah Semester (UTS)</span>
                                    <Star className="w-4 h-4 text-amber-500 opacity-30" />
                                  </div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-display font-black text-amber-600">{rubric.uts}</span>
                                    <span className="text-xs font-bold text-amber-400">%</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug mt-3 font-medium">Bobot nilai dari ujian Penilaian Tengah Semester.</p>
                                </div>

                                <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between hover:border-rose-200 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Ujian Akhir Semester (UAS)</span>
                                    <Award className="w-4 h-4 text-rose-500 opacity-30" />
                                  </div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-display font-black text-rose-600">{rubric.uas}</span>
                                    <span className="text-xs font-bold text-rose-400">%</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug mt-3 font-medium">Bobot nilai dari ujian Penilaian Sumatif Akhir Semester.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Kehadiran (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editKehadiran}
                                      onChange={(e) => setEditKehadiran(e.target.value)}
                                      className="block w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Tugas & Harian (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editTugas}
                                      onChange={(e) => setEditTugas(e.target.value)}
                                      className="block w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">UTS (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editUts}
                                      onChange={(e) => setEditUts(e.target.value)}
                                      className="block w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">UAS (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editUas}
                                      onChange={(e) => setEditUas(e.target.value)}
                                      className="block w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                    />
                                  </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                                  <span className="text-xs font-semibold text-slate-500">Live Kalkulasi Total:</span>
                                  {(() => {
                                    const total = (Number(editKehadiran) || 0) + (Number(editTugas) || 0) + (Number(editUts) || 0) + (Number(editUas) || 0);
                                    const isValid = total === 100;
                                    return (
                                      <span className={`text-sm font-black px-4 py-1.5 rounded-xl border ${isValid ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"}`}>
                                        {total}% {isValid ? "— Valid (Tepat 100%)" : `— Salah (Harus 100%, selisih ${100 - total}%)`}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-4 sm:p-6 overflow-hidden">
                             <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-6 p-4 sm:p-6 bg-slate-50/90 rounded-2xl sm:rounded-3xl">
                               {/* Left Controls: Class filter and Student search */}
                               <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full xl:max-w-xl">
                                 {/* Dropdown Kelas */}
                                 <div className="flex-1 space-y-1.5">
                                   <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block ml-1">
                                     Filter Kelas
                                   </label>
                                   <div className="relative group">
                                     <select
                                       value={selectedClassFilter}
                                       onChange={(e) => setSelectedClassFilter(e.target.value)}
                                       className="block w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer shadow-sm"
                                     >
                                       <option value="">Semua Kelas</option>
                                       {classesList.map((c, idx) => (
                                         <option key={`stu-flt-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                           {c.name}
                                         </option>
                                       ))}
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#85cc00] transition-colors">
                                       <ChevronDown className="w-4 h-4" />
                                     </div>
                                   </div>
                                 </div>

                                 {/* Textbox Pencarian Siswa */}
                                 <div className="flex-1 space-y-1.5">
                                   <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block ml-1">
                                     Pencarian Siswa
                                   </label>
                                   <div className="relative group">
                                     <input
                                       type="text"
                                       placeholder="Cari nama atau NIS..."
                                       value={studentSearchQuery}
                                       onChange={(e) => setStudentSearchQuery(e.target.value)}
                                       className="block w-full rounded-xl bg-white border border-slate-200 pl-10 pr-8 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/10 transition-all outline-none shadow-sm"
                                     />
                                     <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#85cc00] transition-colors">
                                       <Search className="w-4 h-4" />
                                     </div>
                                     {studentSearchQuery && (
                                       <button
                                         onClick={() => setStudentSearchQuery("")}
                                         className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                       >
                                         <X className="w-4 h-4" />
                                       </button>
                                     )}
                                   </div>
                                 </div>
                               </div>

                                {/* Right Controls: Symmetrical, Parallel & Modern Action Toolbar */}
                                <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-3 w-full xl:w-auto xl:justify-end">
                                  {/* Group A: Manajemen Kolom & Nilai (4 Buttons) */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <button
                                      onClick={() => setIsAddManualColumnOpen(true)}
                                      className="h-10 px-3.5 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                    >
                                      <Plus className="w-4 h-4 shrink-0" />
                                      <span>Tambah Kolom</span>
                                    </button>

                                    <button
                                      onClick={() => handleOpenEditColumnModal()}
                                      className="h-10 px-3.5 sm:px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                      title="Edit Identitas Kolom Penilaian (Judul, Jenis, Tanggal, Bab, Kelas)"
                                    >
                                      <Pencil className="w-4 h-4 shrink-0" />
                                      <span>Edit Kolom</span>
                                    </button>

                                    <button
                                      onClick={() => setIsDeleteColumnModalOpen(true)}
                                      className="h-10 px-3.5 sm:px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                      title="Kelola & Hapus Kolom Penilaian"
                                    >
                                      <Trash2 className="w-4 h-4 shrink-0" />
                                      <span>Hapus Kolom</span>
                                    </button>

                                    <button
                                      onClick={() => setIsEditingRekapTable(!isEditingRekapTable)}
                                      className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap ${
                                        isEditingRekapTable
                                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                      }`}
                                    >
                                      <Edit className="w-4 h-4 shrink-0" />
                                      <span>{isEditingRekapTable ? "Selesai Edit" : "Edit Nilai"}</span>
                                    </button>
                                  </div>

                                  {/* Group B: Ekspor & Tampilan Layar (5 Buttons) */}
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <button
                                      onClick={handleDownloadExcel}
                                      className="h-10 px-3.5 sm:px-4 bg-[#85cc00] hover:brightness-105 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                    >
                                      <Download className="w-4 h-4 shrink-0" />
                                      <span>Excel</span>
                                    </button>

                                    <button
                                      onClick={handlePreviewNilaiPDF}
                                      className="h-10 px-3.5 sm:px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                    >
                                      <Eye className="w-4 h-4 shrink-0" />
                                      <span>Preview PDF</span>
                                    </button>

                                    <button
                                      onClick={handleDownloadPDF}
                                      className="h-10 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
                                    >
                                      <FileText className="w-4 h-4 shrink-0" />
                                      <span>Ekspor PDF</span>
                                    </button>

                                    <button
                                      onClick={() => setIsCompactRowRekap(!isCompactRowRekap)}
                                      className={`h-10 px-3.5 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap ${
                                        isCompactRowRekap
                                          ? "bg-purple-600 hover:bg-purple-700 text-white"
                                          : "bg-slate-700 hover:bg-slate-800 text-white"
                                      }`}
                                      title="Tampilkan semua siswa dalam 1 layar tanpa jarak sel yang tinggi"
                                    >
                                      {isCompactRowRekap ? <ZoomOut className="w-4 h-4 shrink-0" /> : <ZoomIn className="w-4 h-4 shrink-0" />}
                                      <span>{isCompactRowRekap ? "Normal" : "Baris Padat"}</span>
                                    </button>

                                    <button
                                      onClick={() => setIsFullScreenRekap(!isFullScreenRekap)}
                                      className={`col-span-2 sm:col-span-1 h-10 px-3.5 sm:px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm hover:shadow cursor-pointer whitespace-nowrap ${
                                        isFullScreenRekap
                                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                                          : "bg-blue-600 hover:bg-blue-700 text-white"
                                      }`}
                                      title="Tampilkan Buku Nilai Full Screen"
                                    >
                                      {isFullScreenRekap ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
                                      <span>{isFullScreenRekap ? "Tutup Layar" : "Layar Penuh"}</span>
                                    </button>
                                  </div>
                                </div>
                             </div>

                             <div className="mb-4 text-xs font-black text-slate-900 flex items-center gap-2">
                               <span className="inline-block w-2.5 h-2.5 bg-[#85cc00] rounded-full"></span>
                               Tanggal Update Nilai: {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(",", "")}
                             </div>

                             {/* Banner Status Edit Nilai */}
                             {isEditingRekapTable && (
                               <div className="mb-4 p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
                                 <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 rounded-xl bg-amber-200/70 flex items-center justify-center text-amber-800 shrink-0">
                                     <Edit className="w-5 h-5" />
                                   </div>
                                   <div>
                                     <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                       Mode Edit Nilai Tabel Aktif ✏️
                                     </p>
                                     <p className="text-[11px] text-amber-800 font-medium">
                                       Silakan ubah/input nilai siswa langsung pada sel tabel di bawah. Klik <span className="font-extrabold text-amber-950">"Simpan Semua Nilai"</span> setelah selesai.
                                       {Object.keys(editedRekapGrades).length > 0 && (
                                         <span className="ml-2 font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
                                           {Object.keys(editedRekapGrades).length} nilai diubah
                                         </span>
                                       )}
                                     </p>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                   <button
                                     onClick={handleSaveRekapGrades}
                                     disabled={isSavingRekapGrades}
                                     className="px-5 py-2.5 bg-[#85cc00] text-slate-950 font-black uppercase text-[11px] tracking-wider rounded-xl shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
                                   >
                                     <Save className="w-4 h-4" />
                                     {isSavingRekapGrades ? "Menyimpan..." : "Simpan Semua Nilai"}
                                   </button>
                                   <button
                                     onClick={(e) => { e.stopPropagation(); 
                                       setEditedRekapGrades({});
                                       setIsEditingRekapTable(false);
                                     }}
                                     className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                                   >
                                     Batal
                                   </button>
                                 </div>
                               </div>
                             )}

                             {isFullScreenRekap && createPortal(
                               <div className="fixed inset-0 z-[9999999] bg-slate-950/90 backdrop-blur-2xl p-4 sm:p-6 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                 <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white shrink-0 mb-4 shadow-2xl relative z-[10000000]">
                                   <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-2xl bg-[#85cc00]/20 text-[#85cc00] flex items-center justify-center font-bold border border-[#85cc00]/30 shadow-sm">
                                       <Maximize2 className="w-5 h-5" />
                                     </div>
                                     <div>
                                       <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                                         Buku Nilai — Mode Layar Penuh (Full Zoom)
                                         <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#85cc00] text-slate-950 font-black uppercase tracking-wider">
                                           {selectedClassFilter || "Seluruh Kelas"}
                                         </span>
                                       </h3>
                                       <p className="text-[11px] text-slate-400 font-medium">Tabel diperluas ke seluruh layar monitor agar semua data siswa & kolom nilai terlihat jelas dalam 1 layar.</p>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-3 flex-wrap">
                                     {/* Dropdown Filter Kelas di Mode Layar Penuh */}
                                     <div className="relative min-w-[160px]">
                                       <select
                                         value={selectedClassFilter}
                                         onChange={(e) => setSelectedClassFilter(e.target.value)}
                                         className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/20 cursor-pointer appearance-none pr-8 shadow-sm"
                                       >
                                         <option value="" className="bg-slate-900 text-white">Semua Kelas</option>
                                         {classesList.map((c, idx) => (
                                           <option key={`fs-cls-${c.id || c.name || idx}-${idx}`} value={c.name} className="bg-slate-900 text-white">
                                             {c.name}
                                           </option>
                                         ))}
                                       </select>
                                       <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                     </div>

                                     {/* Textbox Pencarian Siswa di Mode Layar Penuh */}
                                     <div className="relative min-w-[200px]">
                                       <input
                                         type="text"
                                         placeholder="Cari nama atau NIS..."
                                         value={studentSearchQuery}
                                         onChange={(e) => setStudentSearchQuery(e.target.value)}
                                         className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/20 placeholder:text-slate-400 placeholder:font-normal shadow-sm"
                                       />
                                       <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                       {studentSearchQuery && (
                                         <button
                                           onClick={() => setStudentSearchQuery("")}
                                           className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                         >
                                           <X className="w-4 h-4" />
                                         </button>
                                       )}
                                     </div>

                                     <button
                                       onClick={() => setIsCompactRowRekap(!isCompactRowRekap)}
                                       className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                                         isCompactRowRekap ? "bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-400/40" : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                                       }`}
                                     >
                                       {isCompactRowRekap ? <ZoomOut className="w-4 h-4"/> : <ZoomIn className="w-4 h-4"/>}
                                       <span>{isCompactRowRekap ? "Ukuran Baris Normal" : "Mode Baris Padat"}</span>
                                     </button>
                                      {isEditingRekapTable ? (
                                        <>
                                          <div className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-2">
                                            <Edit className="w-4 h-4 text-amber-400" />
                                            <span>{Object.keys(editedRekapGrades).length} Nilai Diubah</span>
                                          </div>
                                          <button
                                            onClick={handleSaveRekapGrades}
                                            disabled={isSavingRekapGrades}
                                            className="px-5 py-2.5 bg-[#85cc00] hover:brightness-110 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#85cc00]/20 active:scale-95 disabled:opacity-50"
                                          >
                                            <Save className="w-4 h-4" />
                                            <span>{isSavingRekapGrades ? "Menyimpan..." : "Simpan Nilai"}</span>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); 
                                              setEditedRekapGrades({});
                                              setIsEditingRekapTable(false);
                                            }}
                                            className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => setIsEditingRekapTable(true)}
                                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                                        >
                                          <Edit className="w-4 h-4"/>
                                          <span>Edit Nilai</span>
                                        </button>
                                      )}
                                     <button
                                       onClick={() => setIsFullScreenRekap(false)}
                                       className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xl ring-2 ring-rose-400/50 hover:scale-105 active:scale-95"
                                       title="Kembali ke Mode Normal"
                                     >
                                       <Minimize2 className="w-4 h-4" />
                                       <span>Tutup Layar Penuh</span>
                                     </button>
                                   </div>
                                 </div>
                                 <div className="flex-1 overflow-auto bg-white rounded-2xl border-2 border-black shadow-2xl custom-scrollbar">
                                   <table className="min-w-full border-collapse text-left bg-white border-2 border-black shadow-lg">
                                     <thead className="sticky top-0 z-30">
                                       <tr className="bg-white">
                                         <th
                                           colSpan={7 + assignmentsList.length + examsList.length}
                                           className="px-6 py-4 text-left text-sm font-black text-slate-900 border border-black"
                                         >
                                           Tanggal Update Nilai {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(",", "")}
                                         </th>
                                       </tr>
                                       <tr className="bg-slate-100">
                                         <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-0 top-0 border border-black whitespace-nowrap z-40 w-16 min-w-[64px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                           No
                                         </th>
                                         <th className="px-8 py-6 text-left text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-[64px] top-0 border border-black whitespace-nowrap z-40 min-w-[128px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                           NIS
                                         </th>
                                         <th className="px-8 py-6 text-left text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-[192px] top-0 w-80 min-w-[280px] border border-black whitespace-nowrap z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                           Nama Lengkap Siswa
                                         </th>
                                         <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 z-30 border border-black whitespace-nowrap">
                                           Nilai Kehadiran
                                         </th>
                                         {rekapTableColumns.map((col, idx) => (
                                             <th
                                               key={`col-modal-${col.type}-${col.id || idx}-${idx}`}
                                               className="px-5 py-4 text-center text-xs font-black text-slate-900 bg-slate-100 uppercase tracking-wider border border-black whitespace-nowrap sticky top-0 z-30 group"
                                             >
                                               <div className="flex flex-col text-center items-center justify-center relative min-w-[130px] px-1">
                                                 <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                                                   <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                     col.type === "exam"
                                                       ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                       : "bg-blue-100 text-blue-800 border border-blue-300"
                                                   }`}>
                                                     {col.type === "exam" ? "CBT" : "Tugas"}
                                                   </span>
                                                   <div className="flex items-center gap-1">
                                                     <button
                                                       type="button"
                                                       onClick={(e) => {
                                                         e.stopPropagation();
                                                         handleOpenEditColumnModal(col);
                                                       }}
                                                       className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                                                       title={`Edit identitas kolom ${col.type === "exam" ? "CBT" : "Tugas"}: "${col.title}"`}
                                                     >
                                                       <Pencil className="w-3.5 h-3.5" />
                                                     </button>
                                                     <button
                                                       type="button"
                                                       onClick={(e) => {
                                                         e.stopPropagation();
                                                         handlePromptDeleteRekapColumn(col.id, col.title, col.type);
                                                       }}
                                                       className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                                       title={`Hapus kolom ${col.type === "exam" ? "CBT" : "Tugas"}: "${col.title}"`}
                                                     >
                                                       <Trash2 className="w-3.5 h-3.5" />
                                                     </button>
                                                   </div>
                                                 </div>
                                                 <span className="text-xs text-slate-800 font-bold whitespace-nowrap leading-snug flex items-center justify-center mb-1 max-w-[170px] truncate" title={col.title}>
                                                   {col.title}
                                                 </span>
                                                 <span className="text-[10px] text-slate-600 font-semibold whitespace-nowrap">
                                                   {col.date ? new Date(col.date).toLocaleDateString("id-ID", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(",", "") : "-"}
                                                 </span>
                                               </div>
                                             </th>
                                         ))}
                                         <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 border border-black whitespace-nowrap z-30">
                                           Nilai Rapor
                                         </th>
                                         <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 border border-black whitespace-nowrap z-30">
                                           Status
                                         </th>
                                       </tr>
                                     </thead>
                                     <tbody className="bg-white">
                                       {studentsList
                                         .filter((stu) => {
                                           const matchClass = selectedClassFilter
                                             ? isClassMatch(stu.kelas, selectedClassFilter)
                                             : true;
                                           const matchSearch = studentSearchQuery
                                             ? (stu.displayName || stu.studentName || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                               (stu.nisn || "").includes(studentSearchQuery)
                                             : true;
                                           return matchClass && matchSearch;
                                         })
                                         .sort((a, b) => {
                                           const classA = (a.kelas || "").toString();
                                           const classB = (b.kelas || "").toString();
                                           const classComp = classA.localeCompare(classB, "id", { numeric: true, sensitivity: "base" });
                                           if (classComp !== 0) return classComp;
                                           return (a.displayName || a.studentName || "").localeCompare(
                                             b.displayName || b.studentName || "",
                                             "id",
                                             { sensitivity: "base" }
                                           );
                                         })
                                         .map((stu, index) => {
                                           const studentSubs =
                                             submissionsList.filter(
                                               (s) => s.nisn === stu.nisn,
                                             );
                                           return (
                                             <tr
                                               key={`stu-modal-${stu.id || stu.nisn || index}-${index}`}
                                               className="group hover:bg-slate-50/40 transition-colors"
                                             >
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} font-mono font-black text-slate-900 bg-white whitespace-nowrap border border-black text-center md:sticky md:left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[64px]`}>
                                                 {index + 1}
                                               </td>
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} bg-white whitespace-nowrap text-slate-900 font-bold tracking-tight border border-black md:sticky md:left-[64px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[128px]`}>
                                                 {stu.nisn}
                                               </td>
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} whitespace-nowrap border border-black bg-white text-slate-900 font-medium md:sticky md:left-[192px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[280px]`}>
                                                 <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-bold text-slate-900 whitespace-nowrap`}>
                                                   {stu.displayName || stu.studentName}
                                                 </span>
                                               </td>
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap border border-black bg-white text-slate-900 font-bold`}>
                                                 {(() => {
                                                   const { total, persentase } = getStudentAbsensiCounts(stu, absensiList, selectedClassFilter || stu.kelas);
                                                   const presenceScore = total > 0 ? persentase : 100;
                                                   return (
                                                     <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black text-slate-900`}>
                                                       {presenceScore}%
                                                     </span>
                                                   );
                                                 })()}
                                               </td>
                                               {rekapTableColumns.map((col, colIdx) => {
                                                 const isColApplicable = col.type === "assignment"
                                                   ? isAssignmentForClass(col.rawDoc || col, stu.kelas)
                                                   : isExamForClass(col.rawDoc || col, stu.kelas);

                                                 let score: any = "";
                                                 const fGrade = finalGradesList.find(
                                                   (f) =>
                                                     (isSameNisn(f.nisn, stu.nisn) || isSameNisn(f.nis, stu.nisn)) &&
                                                     (f.assignmentId === col.id ||
                                                       f.examId === col.id ||
                                                       f.alignmentId === col.id ||
                                                       (f.id && (f.id === `${col.id}_${stu.nisn}` || f.id.startsWith(col.id))))
                                                 );
                                                 const sub = studentSubs.find(
                                                   (s) =>
                                                     (isSameNisn(s.nisn, stu.nisn) || isSameNisn(s.nis, stu.nisn)) &&
                                                     (s.assignmentId === col.id || (s.id && s.id.includes(col.id)))
                                                 );
                                                 if (col.type === "assignment") {
                                                   if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai") {
                                                     score = sub.nilai;
                                                   } else if (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "") {
                                                     score = fGrade.nilai;
                                                   } else if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "") {
                                                     score = sub.nilai;
                                                   }
                                                 } else {
                                                   if (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "") {
                                                     score = fGrade.nilai;
                                                   } else if (fGrade?.score !== undefined && fGrade?.score !== null && fGrade?.score !== "") {
                                                     score = fGrade.score;
                                                   } else if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "") {
                                                     score = sub.nilai;
                                                   }
                                                 }

                                                 const cellKey = `${col.id}_${stu.nisn}`;
                                                 const isEdited = editedRekapGrades[cellKey] !== undefined;
                                                 const activeScoreStr = isEdited
                                                   ? editedRekapGrades[cellKey]
                                                   : (score !== undefined && score !== null && score !== "" ? String(score) : "");

                                                 return (
                                                   <td
                                                     key={`col-modal-${col.type}-${col.id || colIdx}-${colIdx}`}
                                                     className={`px-3 ${isCompactRowRekap ? "py-1 text-xs" : "py-2 text-sm"} text-center whitespace-nowrap border border-black font-bold transition-colors ${
                                                       isEdited ? "bg-amber-100/90 text-amber-950" : "bg-white text-slate-900"
                                                     }`}
                                                   >
                                                     {!isColApplicable && !activeScoreStr ? (
                                                       <span className="text-slate-300 font-mono text-xs">-</span>
                                                     ) : isEditingRekapTable ? (
                                                       <input
                                                         type="number"
                                                         min="0"
                                                         max="100"
                                                         value={activeScoreStr}
                                                         placeholder="0-100"
                                                         onChange={(e) => {
                                                           const val = e.target.value;
                                                           setEditedRekapGrades((prev) => ({
                                                             ...prev,
                                                             [cellKey]: val,
                                                           }));
                                                         }}
                                                         className={`w-16 ${isCompactRowRekap ? "h-6 text-[11px]" : "h-8 text-xs"} text-center font-mono font-black text-slate-900 bg-amber-50 border-2 border-amber-400 focus:bg-white focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/20 rounded-md outline-none transition-all`}
                                                       />
                                                     ) : (
                                                       <button
                                                         type="button"
                                                         onClick={() => setIsEditingRekapTable(true)}
                                                         className="group/cell w-full h-full inline-flex items-center justify-center gap-1 hover:text-[#85cc00] cursor-pointer"
                                                         title="Klik untuk mengedit nilai pada tabel"
                                                       >
                                                         {activeScoreStr !== "" && activeScoreStr !== undefined && activeScoreStr !== null ? (
                                                           <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black ${isEdited ? "text-amber-800" : "text-slate-900"}`}>
                                                             {activeScoreStr}
                                                           </span>
                                                         ) : (
                                                           <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-medium ${isEdited ? "text-amber-800" : "text-slate-300"}`}>
                                                             -
                                                           </span>
                                                         )}
                                                       </button>
                                                     )}
                                                   </td>
                                                 );
                                               })}
                                               
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap bg-white border border-black text-slate-900 font-bold`}>
                                                 {(() => {
                                                   const roundedFinal = calculateNilaiRapor(stu);
                                                   return (
                                                     <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black text-slate-900`}>
                                                       {roundedFinal}
                                                     </span>
                                                   );
                                                 })()}
                                               </td>
                                               <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap bg-white border border-black text-slate-900 font-bold`}>
                                                 {(() => {
                                                   const roundedFinal = calculateNilaiRapor(stu);
                                                   const isPassed = roundedFinal >= 75;
                                                   const statusColor = isPassed
                                                     ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                     : "text-rose-700 bg-rose-50 border-rose-200";

                                                   return (
                                                     <span className={`inline-flex items-center justify-center px-2.5 ${isCompactRowRekap ? "py-0.5 text-[10px]" : "py-1 text-xs"} font-black uppercase tracking-wider rounded-xl border shadow-sm min-w-[90px] ${statusColor}`}>
                                                       {isPassed ? "Tuntas" : "Belum Tuntas"}
                                                     </span>
                                                   );
                                                 })()}
                                               </td>
                                             </tr>
                                           );
                                         })}
                                     </tbody>
                                   </table>
                                 </div>
                               </div>,
                               document.body
                             )}

                             <div className="overflow-auto custom-scrollbar max-h-[800px]">
                              <table id="rekapTable" className="min-w-full border-collapse text-left bg-white border-2 border-black shadow-lg">
                                <thead className="sticky top-0 z-30">
                                  <tr className="bg-white">
                                    <th
                                      colSpan={7 + assignmentsList.length + examsList.length}
                                      className="px-6 py-4 text-left text-sm font-black text-slate-900 border border-black"
                                    >
                                      Tanggal Update Nilai {new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(",", "")}
                                    </th>
                                  </tr>
                                  <tr className="bg-slate-100">
                                    <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-0 top-0 border border-black whitespace-nowrap z-40 w-16 min-w-[64px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      No
                                    </th>
                                    <th className="px-8 py-6 text-left text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-[64px] top-0 border border-black whitespace-nowrap z-40 min-w-[128px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      NIS
                                    </th>
                                    <th className="px-8 py-6 text-left text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider md:sticky md:left-[192px] top-0 w-80 min-w-[280px] border border-black whitespace-nowrap z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      Nama Lengkap Siswa
                                    </th>
                                    <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 z-30 border border-black whitespace-nowrap">
                                      Nilai Kehadiran
                                    </th>
                                    {rekapTableColumns.map((col, idx) => (
                                        <th
                                          key={`col-${col.type}-${col.id || idx}-${idx}`}
                                          className="px-5 py-4 text-center text-xs font-black text-slate-900 bg-slate-100 uppercase tracking-wider border border-black whitespace-nowrap sticky top-0 z-30 group"
                                        >
                                          <div className="flex flex-col text-center items-center justify-center relative min-w-[130px] px-1">
                                            {/* Top badges & delete button */}
                                            <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                col.type === "exam"
                                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                  : "bg-blue-100 text-blue-800 border border-blue-300"
                                              }`}>
                                                {col.type === "exam" ? "CBT" : "Tugas"}
                                              </span>

                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditColumnModal(col);
                                                  }}
                                                  className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                                                  title={`Edit identitas kolom ${col.type === "exam" ? "CBT" : "Tugas"}: "${col.title}"`}
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePromptDeleteRekapColumn(col.id, col.title, col.type);
                                                  }}
                                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                                  title={`Hapus kolom ${col.type === "exam" ? "CBT" : "Tugas"}: "${col.title}"`}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {(() => {
                                              if (col.deadline) {
                                                const dl = new Date(col.deadline).getTime();
                                                const now = Date.now();
                                                const diff = dl - now;
                                                const isNear = diff > 0 && diff < 24 * 60 * 60 * 1000;
                                                if (isNear) {
                                                  return (
                                                    <div className="absolute top-0 right-7" title="Tenggat Mendekati">
                                                      <Clock className="w-3 h-3 text-rose-500 animate-pulse" />
                                                    </div>
                                                  );
                                                }
                                              }
                                              return null;
                                            })()}
                                            <span className="text-xs text-slate-800 font-bold whitespace-nowrap leading-snug flex items-center justify-center mb-1 max-w-[170px] truncate" title={col.title}>
                                              {col.title}
                                            </span>
                                            <span className="text-[10px] text-slate-600 font-semibold whitespace-nowrap">
                                              {col.date ? new Date(col.date).toLocaleDateString("id-ID", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(",", "") : "-"}
                                            </span>
                                          </div>
                                        </th>
                                      ))}
                                    
                                    <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 border border-black whitespace-nowrap z-30">
                                      Nilai Rapor
                                    </th>
                                    <th className="px-6 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 border border-black whitespace-nowrap z-30">
                                      Status
                                    </th>
                                    <th className="px-4 py-6 text-center text-sm font-black text-slate-900 bg-slate-100 uppercase tracking-wider sticky top-0 border border-black whitespace-nowrap z-30">
                                      Rapor & Wali
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {filteredAndSortedStudents
                                    .map((stu, index) => {
                                      const studentSubs = submissionsByNisnLookup.get(stu.nisn) || [];

                                      let totalScore = 0;
                                      let count = 0;

                                      return (
                                        <tr
                                          key={`stu-${stu.id || stu.nisn || index}-${index}`}
                                          className="group hover:bg-slate-50/40 transition-colors"
                                        >
                                          <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} font-mono font-black text-slate-900 bg-white whitespace-nowrap border border-black text-center md:sticky md:left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[64px]`}>
                                            {index + 1}
                                          </td>
                                          <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} bg-white whitespace-nowrap text-slate-900 font-bold tracking-tight border border-black md:sticky md:left-[64px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[128px]`}>
                                            {stu.nisn}
                                          </td>
                                          <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} whitespace-nowrap border border-black bg-white text-slate-900 font-medium md:sticky md:left-[192px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[280px]`}>
                                            <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-bold text-slate-900 whitespace-nowrap`}>
                                              {stu.displayName || stu.studentName}
                                            </span>
                                          </td>
                                          <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap border border-black bg-white text-slate-900 font-bold`}>
                                            {(() => {
                                              const absStats = studentAbsensiLookup.get(`${stu.nisn}_${selectedClassFilter || stu.kelas}`);
                                              const total = absStats?.total || 0;
                                              const persentase = absStats?.persentase || 0;
                                              const presenceScore = total > 0 ? persentase : 100;
                                              return (
                                                <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black text-slate-900`}>
                                                  {presenceScore}%
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          {rekapTableColumns.map((col, colIdx) => {
                                            const isColApplicable = col.type === "assignment"
                                              ? isAssignmentForClass(col.rawDoc || col, stu.kelas)
                                              : isExamForClass(col.rawDoc || col, stu.kelas);

                                            let score: any = "";
                                            // 1. Check finalGradesList (primary source for finalized scores)
                                            const fGrade = gradesLookupMap.get(`${stu.nisn}_${col.id}`);

                                            // 2. Check submissionsList
                                            const sub = submissionsLookupMap.get(`${stu.nisn}_${col.id}`);

                                            if (col.type === "assignment") {
                                              if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" && sub?.status === "sudah dinilai") {
                                                score = sub.nilai;
                                              } else if (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "") {
                                                score = fGrade.nilai;
                                              } else if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "") {
                                                score = sub.nilai;
                                              }
                                            } else {
                                              if (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "") {
                                                score = fGrade.nilai;
                                              } else if (fGrade?.score !== undefined && fGrade?.score !== null && fGrade?.score !== "") {
                                                score = fGrade.score;
                                              } else if (sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "") {
                                                score = sub.nilai;
                                              }
                                            }

                                            const cellKey = `${col.id}_${stu.nisn}`;
                                            const isEdited = editedRekapGrades[cellKey] !== undefined;
                                            const activeScoreStr = isEdited
                                              ? editedRekapGrades[cellKey]
                                              : (score !== undefined && score !== null && score !== "" ? String(score) : "");

                                            if (activeScoreStr !== "") {
                                              totalScore += Number(activeScoreStr);
                                              count++;
                                            }

                                            return (
                                              <td
                                                key={`col-${col.type}-${col.id || colIdx}-${colIdx}`}
                                                className={`px-3 ${isCompactRowRekap ? "py-1 text-xs" : "py-2 text-sm"} text-center whitespace-nowrap border border-black font-bold transition-colors ${
                                                  isEdited ? "bg-amber-100/90 text-amber-950" : "bg-white text-slate-900"
                                                }`}
                                              >
                                                {!isColApplicable && !activeScoreStr ? (
                                                  <span className="text-slate-300 font-mono text-xs">-</span>
                                                ) : isEditingRekapTable ? (
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={activeScoreStr}
                                                    placeholder="0-100"
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      setEditedRekapGrades((prev) => ({
                                                        ...prev,
                                                        [cellKey]: val,
                                                      }));
                                                    }}
                                                    className={`w-16 ${isCompactRowRekap ? "h-6 text-[11px]" : "h-8 text-xs"} text-center font-mono font-black text-slate-900 bg-amber-50 border-2 border-amber-400 focus:bg-white focus:border-[#85cc00] focus:ring-2 focus:ring-[#85cc00]/20 rounded-md outline-none transition-all`}
                                                  />
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => setIsEditingRekapTable(true)}
                                                    className="group/cell w-full h-full inline-flex items-center justify-center gap-1 hover:text-[#85cc00] cursor-pointer"
                                                    title="Klik untuk mengedit nilai pada tabel"
                                                  >
                                                    {activeScoreStr !== "" && activeScoreStr !== undefined && activeScoreStr !== null ? (
                                                      <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black ${isEdited ? "text-amber-800" : "text-slate-900"}`}>
                                                        {activeScoreStr}
                                                      </span>
                                                    ) : (
                                                      <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-medium ${isEdited ? "text-amber-800" : "text-slate-300"}`}>
                                                        -
                                                      </span>
                                                    )}
                                                  </button>
                                                )}
                                              </td>
                                            );
                                          })}
                                          
                                          <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap bg-white border border-black text-slate-900 font-bold`}>
                                             {(() => {
                                               const roundedFinal = calculateNilaiRapor(stu);
                                               return (
                                                 <span className={`${isCompactRowRekap ? "text-xs" : "text-sm"} font-mono font-black text-slate-900`}>
                                                   {roundedFinal}
                                                 </span>
                                               );
                                             })()}
                                           </td>
                                           <td className={`px-4 ${isCompactRowRekap ? "py-1 text-xs" : "py-4 text-sm"} text-center whitespace-nowrap bg-white border border-black text-slate-900 font-bold`}>
                                             {(() => {
                                               const roundedFinal = calculateNilaiRapor(stu);
                                               const isPassed = roundedFinal >= 75;
                                               const statusColor = isPassed
                                                 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                 : "text-rose-700 bg-rose-50 border-rose-200";

                                               return (
                                                 <span className={`inline-flex items-center justify-center px-2.5 ${isCompactRowRekap ? "py-0.5 text-[10px]" : "py-1 text-xs"} font-black uppercase tracking-wider rounded-xl border shadow-sm min-w-[90px] ${statusColor}`}>
                                                   {isPassed ? "Tuntas" : "Belum Tuntas"}
                                                 </span>
                                               );
                                             })()}
                                           </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMenu === "materi-ajar" && (
                    <div className="space-y-12 animate-in fade-in duration-300">
                      <div className="flex gap-4 border-b border-slate-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); 
                            setActiveMateriTab("tambah");
                            setMateriSaveMessage({ text: "", type: "" });
                          }}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${
                            activeMateriTab === "tambah"
                              ? "text-[#85cc00] border-b-2 border-[#85cc00]"
                              : "text-slate-400"
                          }`}
                        >
                          {editingMateriId ? "Edit Materi" : "Tambah Materi"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); 
                            setActiveMateriTab("daftar");
                            setMateriSaveMessage({ text: "", type: "" });
                            setEditingMateriId(null);
                            setMateriTitle("");
                            setMateriDescription("");
                            setMateriBab("");
                            setMateriDriveUrl("");
                            setMateriKelas("");
                          }}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${
                            activeMateriTab === "daftar"
                              ? "text-[#85cc00] border-b-2 border-[#85cc00]"
                              : "text-slate-400"
                          }`}
                        >
                          Daftar Materi
                        </button>
                      </div>

                      {activeMateriTab === "tambah" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Materi Ajar</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Kelola semua materi pelajaran Informatika dengan link Google Drive untuk disinkronkan langsung ke dashboard materi ajar siswa.
                              </p>
                            </div>
                          </div>

                          <div className="max-w-4xl">
                            <div className="rounded-[2.5rem] bg-white p-10 border border-slate-200 shadow-xl shadow-slate-200/40">
                            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-100">
                              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                                <BookOpen className="w-6 h-6 text-[#85cc00]" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none mb-2">
                                  {editingMateriId ? "Edit Konfigurasi Materi" : "Konfigurasi Materi Baru"}
                                </h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                  Definisikan detail materi dan kaitkan dengan folder/file Google Drive
                                </p>
                              </div>
                            </div>

                            {materiSaveMessage.text && (
                              <div
                                className={`mb-10 rounded-xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500 border ${
                                  materiSaveMessage.type === "error"
                                    ? "bg-rose-50 text-rose-600 border-rose-100"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                }`}
                              >
                                {materiSaveMessage.type === "error" ? (
                                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                )}
                                <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">
                                  {materiSaveMessage.text}
                                </p>
                              </div>
                            )}

                            <div className="space-y-12">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    1. Judul Materi
                                  </label>
                                  <input
                                    type="text"
                                    value={materiTitle}
                                    onChange={(e) => setMateriTitle(e.target.value)}
                                    placeholder="Contoh: Pengenalan Struktur Data Linier"
                                    className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none"
                                  />
                                </div>

                                <div className="space-y-6">
                                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    2. Bab / Topik Pembelajaran
                                  </label>
                                  <select
                                    value={materiBab}
                                    onChange={(e) => setMateriBab(e.target.value)}
                                    className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer"
                                  >
                                    <option value="">Pilih Bab Pembelajaran...</option>
                                    <option value="Informatika dan Keterampilan Generik">Informatika dan Keterampilan Generik</option>
                                    <option value="Bab 1: Informatika dan Keterampilan Generik">Bab 1: Informatika dan Keterampilan Generik</option>
                                    <option value="Berpikir Komputasional">Berpikir Komputasional</option>
                                    <option value="Berpikir Komputasional (BK)">Berpikir Komputasional (BK)</option>
                                    <option value="Bab 2: Berpikir Komputasional (BK)">Bab 2: Berpikir Komputasional (BK)</option>
                                    <option value="Teknologi Informasi dan Komunikasi">Teknologi Informasi dan Komunikasi</option>
                                    <option value="Teknologi Informasi & Komunikasi">Teknologi Informasi & Komunikasi</option>
                                    <option value="Bab 3: Teknologi Informasi dan Komunikasi (TIK)">Bab 3: Teknologi Informasi dan Komunikasi (TIK)</option>
                                    <option value="Sistem Komputer">Sistem Komputer</option>
                                    <option value="Bab 4: Sistem Komputer (SK)">Bab 4: Sistem Komputer (SK)</option>
                                    <option value="Jaringan Komputer dan Internet">Jaringan Komputer dan Internet</option>
                                    <option value="Jaringan Komputer & Internet">Jaringan Komputer & Internet</option>
                                    <option value="Bab 5: Jaringan Komputer dan Internet (JKI)">Bab 5: Jaringan Komputer dan Internet (JKI)</option>
                                    <option value="Analisis Data">Analisis Data</option>
                                    <option value="Bab 6: Analisis Data (AD)">Bab 6: Analisis Data (AD)</option>
                                    <option value="Algoritma dan Pemrograman">Algoritma dan Pemrograman</option>
                                    <option value="Algoritma & Pemrograman">Algoritma & Pemrograman</option>
                                    <option value="Bab 7: Algoritma dan Pemrograman (AP)">Bab 7: Algoritma dan Pemrograman (AP)</option>
                                    <option value="Dampak Sosial Informatika">Dampak Sosial Informatika</option>
                                    <option value="Bab 8: Dampak Sosial Informatika (DSI)">Bab 8: Dampak Sosial Informatika (DSI)</option>
                                    <option value="Praktik Lintas Bidang">Praktik Lintas Bidang</option>
                                    <option value="Bab 9: Praktik Lintas Bidang (PLB)">Bab 9: Praktik Lintas Bidang (PLB)</option>
                                    {chaptersList.map((c, idx) => {
                                      const defaultNames = [
                                        "Informatika dan Keterampilan Generik", "Bab 1: Informatika dan Keterampilan Generik",
                                        "Berpikir Komputasional", "Berpikir Komputasional (BK)", "Bab 2: Berpikir Komputasional (BK)",
                                        "Teknologi Informasi dan Komunikasi", "Teknologi Informasi & Komunikasi", "Bab 3: Teknologi Informasi dan Komunikasi (TIK)",
                                        "Sistem Komputer", "Bab 4: Sistem Komputer (SK)",
                                        "Jaringan Komputer dan Internet", "Jaringan Komputer & Internet", "Bab 5: Jaringan Komputer dan Internet (JKI)",
                                        "Analisis Data", "Bab 6: Analisis Data (AD)",
                                        "Algoritma dan Pemrograman", "Algoritma & Pemrograman", "Bab 7: Algoritma dan Pemrograman (AP)",
                                        "Dampak Sosial Informatika", "Bab 8: Dampak Sosial Informatika (DSI)",
                                        "Praktik Lintas Bidang", "Bab 9: Praktik Lintas Bidang (PLB)"
                                      ];
                                      if (c.name && !defaultNames.includes(c.name)) {
                                        return (
                                          <option key={`chap-materi-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                            {c.name}
                                          </option>
                                        );
                                      }
                                      return null;
                                    })}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    3. Target Kelas (Mengambil dari kelas siswa)
                                  </label>
                                  <select
                                    value={materiKelas}
                                    onChange={(e) => setMateriKelas(e.target.value)}
                                    className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer"
                                  >
                                    <option value="">Semua Kelas (Umum)</option>
                                    {classesList.map((c, idx) => (
                                      <option key={`mat-cls-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                        Kelas {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-6">
                                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    4. Link Materi (Google Drive PDF / Video YouTube)
                                  </label>
                                  <input
                                    type="text"
                                    value={materiDriveUrl}
                                    onChange={(e) => setMateriDriveUrl(e.target.value)}
                                    placeholder="https://drive.google.com/... atau https://youtu.be/..."
                                    className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-6">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                  5. Deskripsi atau Petunjuk Belajar (Opsional)
                                </label>
                                <textarea
                                  value={materiDescription}
                                  onChange={(e) => setMateriDescription(e.target.value)}
                                  placeholder="Tuliskan petunjuk belajar, ringkasan materi, atau instruksi pengerjaan..."
                                  rows={4}
                                  className="block w-full rounded-2xl bg-slate-50 border border-slate-200 px-6 py-4.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none resize-none"
                                />
                              </div>

                              <div className="pt-10 border-t border-slate-100 flex justify-end gap-4">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); 
                                    setActiveMateriTab("daftar");
                                    setEditingMateriId(null);
                                    setMateriTitle("");
                                    setMateriDescription("");
                                    setMateriBab("");
                                    setMateriDriveUrl("");
                                    setMateriKelas("");
                                  }}
                                  className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingMateri}
                                  onClick={handleSimpanMateri}
                                  className="px-8 py-4 rounded-2xl bg-[#85cc00] text-slate-900 font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#85cc00]/20 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                  {isSavingMateri ? "Menyimpan..." : (editingMateriId ? "Perbarui Materi" : "Simpan & Terbitkan")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                      {activeMateriTab === "daftar" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Materi Ajar</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Kelola semua materi pelajaran Informatika dengan link Google Drive untuk disinkronkan langsung ke dashboard materi ajar siswa.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-8">
                          {/* Filter Card */}
                          <div className="bg-white rounded-[2rem] p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
                                Filter Berdasarkan Kelas
                              </h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Filter materi ajar untuk menyesuaikan target kelas siswa
                              </p>
                            </div>
                            <select
                              value={materiKelas}
                              onChange={(e) => setMateriKelas(e.target.value)}
                              className="w-full md:w-64 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/10 transition-all outline-none appearance-none cursor-pointer"
                            >
                              <option value="">Semua Kelas / Umum</option>
                              {classesList.map((c, idx) => (
                                <option key={`mat-cls-flt-${c.id || c.name || idx}-${idx}`} value={c.name}>
                                  Kelas {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* List Card */}
                          <div className="border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Daftar Materi Terdaftar
                              </h3>
                              <span className="text-xs font-black text-[#85cc00] bg-[#85cc00]/10 px-4 py-1.5 rounded-full uppercase tracking-wider">
                                Total: {
                                  materiKelas 
                                    ? materialsList.filter(m => m.kelasRef === materiKelas).length 
                                    : materialsList.length
                                } Materi
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm min-w-[800px]">
                                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                  <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 bg-slate-50">No</th>
                                    <th className="p-4 bg-slate-50">Detail Materi</th>
                                    <th className="p-4 text-right bg-slate-50">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(materiKelas 
                                    ? materialsList.filter(m => m.kelasRef === materiKelas)
                                    : materialsList
                                  ).length === 0 ? (
                                    <tr>
                                      <td colSpan={3} className="py-20 text-center">
                                        <div className="flex flex-col justify-center text-slate-300">
                                          <BookOpen className="w-16 h-16 mb-4 stroke-1 text-slate-200" />
                                          <p className="text-sm font-black uppercase tracking-wider text-slate-400">
                                            Belum Ada Materi Ajar
                                          </p>
                                          <p className="text-xs text-slate-300 font-bold mt-1 max-w-sm">
                                            Klik tombol "Tambah Materi" untuk mulai membagikan link materi pembelajaran ke siswa.
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    (materiKelas 
                                      ? materialsList.filter(m => m.kelasRef === materiKelas)
                                      : materialsList
                                    ).map((material, index) => (
                                      <tr key={`mat-${material.id || index}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono text-xs text-slate-400 font-bold">
                                          {index + 1}
                                        </td>
                                        <td className="p-4">
                                          <div className="flex flex-col">
                                            <p className="font-bold text-slate-900 text-sm leading-snug">
                                              {material.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{material.bab}</span>
                                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                              <span className="text-[10px] font-black text-[#85cc00] uppercase tracking-wider">
                                                {material.kelasRef ? `Kelas ${material.kelasRef}` : "Semua Kelas"}
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <a
                                              href={material.driveUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#85cc00] hover:border-[#85cc00]/30 transition-all shadow-sm"
                                              title="Buka di Drive"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                              onClick={() => handleEditMateri(material)}
                                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#85cc00] hover:border-[#85cc00]/30 transition-all shadow-sm"
                                              title="Edit Materi"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteMateri(material.id)}
                                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                                              title="Hapus Materi"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeMenu === "ujian-siswa" && (
                    <div className="space-y-12 animate-in fade-in duration-300">
                      <div className="flex gap-4 border-b border-slate-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); 
                            setActiveExamTab("daftar");
                            setExamSaveMessage({ text: "", type: "" });
                          }}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${
                            activeExamTab === "daftar" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"
                          }`}
                        >
                          Daftar Ujian Aktif
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); 
                            setActiveExamTab("tambah");
                            setExamSaveMessage({ text: "", type: "" });
                          }}
                          className={`pb-4 px-2 font-bold uppercase tracking-widest text-xs transition-colors ${
                            activeExamTab === "tambah" ? "text-[#85cc00] border-b-2 border-[#85cc00]" : "text-slate-400"
                          }`}
                        >
                          + Rilis Ujian Baru (AI)
                        </button>
                      </div>

                      {examSaveMessage.text && (
                        <div
                          className={`p-6 rounded-2xl border-2 flex items-start gap-4 ${
                            examSaveMessage.type === "success"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-850"
                              : "bg-rose-50 border-rose-200 text-rose-850"
                          }`}
                        >
                          {examSaveMessage.type === "success" ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                          )}
                          <div className="text-sm font-semibold leading-relaxed">
                            {examSaveMessage.text}
                          </div>
                        </div>
                      )}

                      {activeExamTab === "daftar" && (() => {
                        const filteredExamsList = examsList.filter((exam) => {
                          if (activeExamClassFilter.includes("SEMUA_KELAS") || activeExamClassFilter.length === 0) return true;
                          return activeExamClassFilter.some((filterCls) => isExamForClass(exam, filterCls));
                        });

                        return (
                          <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Ujian CBT AI</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Buat soal pilihan ganda berkualitas tinggi secara instan dibantu AI Gemini, kelola token masuk siswa, serta rilis ujian ke kelas pilihan Anda.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Toolbar Checkbox Filter Kelas Ujian */}
                            {examsList.length > 0 && (
                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Filter Tampilan Kelas Ujian (Checkbox):
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Menampilkan {filteredExamsList.length} dari {examsList.length} Ujian
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      id="checkbox-filter-exam-all"
                                      type="checkbox"
                                      checked={activeExamClassFilter.includes("SEMUA_KELAS") || (classesList.length > 0 && activeExamClassFilter.length === classesList.length)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setActiveExamClassFilter(["SEMUA_KELAS", ...classesList.map(c => c.name)]);
                                        } else {
                                          setActiveExamClassFilter([]);
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                                    />
                                    <label htmlFor="checkbox-filter-exam-all" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                                      Semua Kelas
                                    </label>
                                  </div>
                                  <div className="h-4 w-[1px] bg-slate-300" />
                                  {classesList.map((cls, idx) => {
                                    const isChecked = activeExamClassFilter.includes(cls.name) || activeExamClassFilter.includes("SEMUA_KELAS");
                                    return (
                                      <div key={`act-exam-cls-${cls.id || cls.name || idx}-${idx}`} className="flex items-center gap-2">
                                        <input
                                          id={`checkbox-filter-exam-cls-${cls.id}`}
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let updated: string[];
                                            if (e.target.checked) {
                                              const filtered = activeExamClassFilter.filter(c => c !== "SEMUA_KELAS");
                                              updated = [...filtered, cls.name];
                                            } else {
                                              updated = activeExamClassFilter.filter(c => c !== cls.name && c !== "SEMUA_KELAS");
                                            }
                                            setActiveExamClassFilter(updated);
                                          }}
                                          className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                                        />
                                        <label htmlFor={`checkbox-filter-exam-cls-${cls.id}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                          Kelas {cls.name}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          {examsList.length === 0 ? (
                            <div className="p-16 text-center border-4 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                              <h3 className="text-xl font-display font-black text-black tracking-tight mb-2">
                                Belum Ada Ujian Online yang Diterbitkan
                              </h3>
                              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                                Klik tombol "+ Rilis Ujian Baru (AI)" di kanan atas untuk membuat bank soal pilihan ganda secara otomatis dengan AI Gemini dan mendistribusikan token ujian kepada siswa.
                              </p>
                            </div>
                          ) : filteredExamsList.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                              <h3 className="text-lg font-bold text-slate-800 mb-1">
                                Tidak Ada Ujian Untuk Kelas yang Dipilih
                              </h3>
                              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                                Silakan centang/pilih filter kelas lain di atas untuk menampilkan daftar ujian.
                              </p>
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                              <div className="overflow-x-auto min-w-full">
                                <table className="w-full text-sm min-w-[800px]">
                                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="p-4 bg-slate-50">Mata Pelajaran</th>
                                      <th className="p-4 bg-slate-50">Judul & Rincian</th>
                                      <th className="p-4 bg-slate-50 text-center">Kelas</th>
                                      <th className="p-4 bg-slate-50 text-center">Token</th>
                                      <th className="p-4 bg-slate-50 text-center">KKM</th>
                                      <th className="p-4 bg-slate-50 text-right">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredExamsList.map((exam, idx) => (
                                      <tr key={`exam-${exam.id || idx}-${idx}`} className="hover:bg-slate-50/50">
                                        <td className="p-4">
                                          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                            {exam.subject}
                                          </span>
                                        </td>
                                        <td className="p-4">
                                          <div className="font-bold text-slate-900 text-sm leading-snug">
                                            {exam.title}
                                          </div>
                                          <div className="text-[11px] text-slate-500 font-medium font-mono mt-0.5 flex flex-wrap items-center gap-2">
                                            <span>{exam.questions?.length || 0} Soal • {exam.duration / 60} Menit</span>
                                            {exam.externalQuizUrl && (
                                              <a
                                                href={exam.externalQuizUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                Soal Luar (PDF / Notebook LM)
                                              </a>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-slate-900 text-sm">
                                          {exam.kelasRef}
                                        </td>
                                        <td className="p-4 text-center">
                                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-[#85cc00] text-xs font-mono font-bold rounded-lg uppercase shadow-sm tracking-wide">
                                            {exam.token}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); 
                                                navigator.clipboard.writeText(exam.token);
                                                showAlert("Token Disalin", "Token ujian telah disalin ke papan klip.", "alert");
                                              }}
                                              className="hover:text-white"
                                              title="Salin Token"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </td>
                                        <td className="p-4 text-center font-mono font-bold text-sm text-slate-900">
                                          {exam.kkm}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-1.5 items-center">
                                          <button
                                            onClick={() => {
                                              setProctoringExamModal({ isOpen: true, exam });
                                              setDirection(1);
                                              setActiveMenu("live-proctoring");
                                              window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-[#85cc00] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider"
                                            title="Pantau Peserta Ujian Secara Langsung (Halaman Live Proctoring)"
                                          >
                                            <Activity className="w-3.5 h-3.5" />
                                            <span className="hidden xl:inline">Live</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              setAnalysisExamModal({ isOpen: true, exam });
                                              setDirection(1);
                                              setActiveMenu("analisis-cbt");
                                              window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                            className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider"
                                            title="Halaman Statistik & Analisis Butir Soal CBT"
                                          >
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            <span className="hidden xl:inline">Analisis</span>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); 
                                              setShareCbtExamModal({
                                                isOpen: true,
                                                exam: exam,
                                                customToken: exam.token,
                                                customClasses: Array.isArray(exam.targetClasses) && exam.targetClasses.length > 0 ? exam.targetClasses : [exam.kelasRef || "Semua Kelas"],
                                              });
                                            }}
                                            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                            title="Bagikan Info & Token Ujian ke WhatsApp"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenPublishModal(exam)}
                                            className="p-2 text-[#85cc00] hover:text-[#74b300] hover:bg-lime-50 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                            title="Terbitkan ke Kelas Lain / Tambah Target Kelas"
                                          >
                                            <Share2 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => setExamToReset(exam)}
                                            className="p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                            title="Reset Ujian Siswa (Beri Kesempatan Mengulang)"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDownloadExamModal({
                                                isOpen: true,
                                                exam: exam,
                                                selectedClass: exam.kelasRef || "SEMUA_KELAS",
                                              })
                                            }
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                            title="Unduh Laporan Hasil & Pelanggaran Ujian (PDF)"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteExam(exam.id)}
                                            className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                                            title="Hapus Ujian"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      );
                    })()}

                      {activeExamTab === "tambah" && (
                        <div className="space-y-12">
                          <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                            <div className="max-w-2xl">
                              <h2 className="text-2xl font-bold text-slate-950">Ujian CBT AI</h2>
                              <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Buat soal pilihan ganda berkualitas tinggi secara instan dibantu AI Gemini, kelola token masuk siswa, serta rilis ujian ke kelas pilihan Anda.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                          {/* Col 1: Form controls */}
                          <div className="md:col-span-4 space-y-6">
                            <div className="p-8 rounded-3xl border-2 border-black bg-white shadow-md space-y-5">
                              <h3 className="font-display font-black text-lg text-black tracking-tight flex items-center gap-2 pb-4 border-b">
                                <Sparkles className="w-5 h-5 text-[#85cc00]" /> Rilis Ujian Baru (Informatika)
                              </h3>

                              <div className="space-y-1">
                                <span className="px-2.5 py-1 bg-[#85cc00]/10 border border-[#85cc00]/20 text-[#85cc00] text-[10px] font-black uppercase tracking-wider rounded-lg inline-block">
                                  Mata Pelajaran: {examSubject}
                                </span>
                              </div>

                              {/* 1. Bab Yang terdapat di Mapel Informatika kurikulum mereka kelas X Fase E */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  1. Bab Pelajaran (Fase E Kelas X)
                                </label>
                                <select
                                  value={examBab}
                                  onChange={(e) => {
                                    const selectedBab = e.target.value;
                                    setExamBab(selectedBab);
                                    if (selectedBab) {
                                      const shortBabName = selectedBab.split(':')[0];
                                      setExamTitle(`${examTema || 'Evaluasi'} Informatika - ${shortBabName}`);
                                    }
                                  }}
                                  className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all cursor-pointer"
                                >
                                  <option value="">-- Pilih Bab Informatika --</option>
                                  {INFORMATIKA_X_CHAPTERS.map((chap, idx) => (
                                    <option key={`chap-${chap || idx}-${idx}`} value={chap}>
                                      {chap}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Judul Ujian (Preetes.Postes.Ulangan Harian.Penilaian Tengah Semester.Penilaian Sumatif Akhir Semester) */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#85cc00]">
                                  2. Judul Ujian (Kategori)
                                </label>
                                <select
                                  value={examTema}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setExamTema(val);
                                    const shortBabName = examBab ? examBab.split(':')[0] : "Fase E";
                                    setExamTitle(`${val} Informatika - ${shortBabName}`);
                                  }}
                                  className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all cursor-pointer font-display font-bold text-slate-900"
                                >
                                  <option value="Preetes">Preetes</option>
                                  <option value="Postes">Postes</option>
                                  <option value="Ulangan Harian">Ulangan Harian</option>
                                  <option value="Penilaian Tengah Semester">Penilaian Tengah Semester</option>
                                  <option value="Penilaian Sumatif Akhir Semester">Penilaian Sumatif Akhir Semester</option>
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  Nama Publikasi Ujian (Dapat Diedit)
                                </label>
                                <input
                                  type="text"
                                  value={examTitle}
                                  onChange={(e) => setExamTitle(e.target.value)}
                                  placeholder="Nama Ujian..."
                                  className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                />
                              </div>

                              {/* 3. Materi Ujian */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  3. Materi Ujian (Sub Bab)
                                </label>
                                <input
                                  type="text"
                                  value={examMateri}
                                  onChange={(e) => setExamMateri(e.target.value)}
                                  placeholder="Contoh: Bubble Sort, Hardware CPU, Canva"
                                  className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all"
                                />
                              </div>

                              {/* 4. Target Kelas (Checkbox Multi-Select) */}
                              <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  4. Target Kelas Ujian (Dapat memilih lebih dari satu)
                                </label>
                                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-3">
                                    <input
                                      id="checkbox-exam-all"
                                      type="checkbox"
                                      checked={selectedExamClasses.includes("SEMUA_KELAS") || (classesList.length > 0 && selectedExamClasses.length === classesList.length)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const allNames = ["SEMUA_KELAS", ...classesList.map(c => c.name)];
                                          setSelectedExamClasses(allNames);
                                          setExamKelas("SEMUA_KELAS");
                                        } else {
                                          setSelectedExamClasses([]);
                                          setExamKelas("");
                                        }
                                      }}
                                      className="w-5 h-5 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                                    />
                                    <label htmlFor="checkbox-exam-all" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                                      Semua Kelas
                                    </label>
                                  </div>
                                  <div className="h-[1px] bg-slate-200" />
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {classesList.map((cls, idx) => {
                                      const isChecked = selectedExamClasses.includes(cls.name) || selectedExamClasses.includes("SEMUA_KELAS");
                                      return (
                                        <div key={`sel-exam-cls-${cls.id || cls.name || idx}-${idx}`} className="flex items-center gap-2.5">
                                          <input
                                            id={`checkbox-exam-cls-${cls.id}`}
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              let updated: string[];
                                              if (e.target.checked) {
                                                const filtered = selectedExamClasses.filter(c => c !== "SEMUA_KELAS");
                                                updated = [...filtered, cls.name];
                                              } else {
                                                updated = selectedExamClasses.filter(c => c !== cls.name && c !== "SEMUA_KELAS");
                                              }
                                              setSelectedExamClasses(updated);
                                              setExamKelas(updated.join(", "));
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                                          />
                                          <label htmlFor={`checkbox-exam-cls-${cls.id}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                            Kelas {cls.name}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* 5. Durasi Ujian & 6. Nilai KKM */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    5. Durasi (Menit)
                                  </label>
                                  <input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={examDuration}
                                    onChange={(e) => setExamDuration(Math.max(5, Number(e.target.value)))}
                                    className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-mono font-bold outline-none focus:bg-white focus:border-black transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    6. Nilai KKM
                                  </label>
                                  <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={examKkm}
                                    onChange={(e) => setExamKkm(Math.max(10, Number(e.target.value)))}
                                    className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-sm text-black font-mono font-bold outline-none focus:bg-white focus:border-black transition-all"
                                  />
                                </div>
                              </div>

                              {/* 7. Jumlah & Variasi Tipe Soal */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    7. Jumlah Soal AI
                                  </label>
                                  <select
                                    value={examQuestionCount}
                                    onChange={(e) => setExamQuestionCount(Number(e.target.value))}
                                    className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-black font-semibold outline-none focus:bg-white focus:border-black transition-all cursor-pointer font-mono font-bold"
                                  >
                                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((num, idx) => (
                                      <option key={`soal-num-${num}-${idx}`} value={num}>
                                        {num} Soal
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Variasi Tipe Soal
                                  </label>
                                  <select
                                    value={examQuestionFormat}
                                    onChange={(e) => setExamQuestionFormat(e.target.value as any)}
                                    className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-xs text-black font-bold outline-none focus:bg-white focus:border-black transition-all cursor-pointer"
                                  >
                                    <option value="multiple_choice">Pilihan Ganda (A–E)</option>
                                    <option value="mixed">Campuran (PG + Isian + Esai)</option>
                                    <option value="short_answer">Isian Singkat</option>
                                    <option value="essay">Esai / Uraian</option>
                                  </select>
                                </div>
                              </div>

                              {/* 8. Deskripsi Soal */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  8. Deskripsi Soal (Model / Fokus AI)
                                </label>
                                <textarea
                                  value={examDescription}
                                  onChange={(e) => setExamDescription(e.target.value)}
                                  rows={3}
                                  placeholder="Contoh: Fokuskan pada pemrograman if-else & perulangan loop di python, berikan studi kasus sederhana..."
                                  className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-black outline-none focus:bg-white focus:border-black transition-all resize-none leading-relaxed"
                                />
                              </div>

                              {/* 9. Sumber Data Referensi Link YouTube (Maksimal 3 Link) */}
                              <div className="space-y-3 p-4 rounded-2xl bg-red-50/70 border-2 border-red-200">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-red-700 flex items-center gap-1.5">
                                    <Youtube className="w-4 h-4 text-red-600 shrink-0" />
                                    9. Sumber Data Link YouTube (Maks. 3 Link)
                                  </label>
                                  {examYoutubeUrls.some((u) => u.trim() !== "") && (
                                    <button
                                      type="button"
                                      onClick={() => setExamYoutubeUrls(["", "", ""])}
                                      className="text-[10px] font-extrabold text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Kosongkan Link
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                  Masukkan hingga 3 tautan video YouTube pembelajaran untuk disintesis oleh AI dalam merancang bank soal.
                                </p>
                                <div className="space-y-2">
                                  {[0, 1, 2].map((idx) => (
                                    <div key={`exam-yt-input-${idx}`} className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-black text-[11px] flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </div>
                                      <div className="relative flex-1">
                                        <input
                                          type="url"
                                          value={examYoutubeUrls[idx] || ""}
                                          onChange={(e) => {
                                            const updated = [...examYoutubeUrls];
                                            updated[idx] = e.target.value;
                                            setExamYoutubeUrls(updated);
                                          }}
                                          placeholder={`Link YouTube ${idx + 1} (contoh: https://www.youtube.com/watch?v=...)`}
                                          className="block w-full rounded-xl border-2 border-red-200 bg-white px-3 py-2 text-xs text-black font-semibold outline-none focus:border-red-500 transition-all pr-8"
                                        />
                                        {examYoutubeUrls[idx] && (
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); 
                                              const updated = [...examYoutubeUrls];
                                              updated[idx] = "";
                                              setExamYoutubeUrls(updated);
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 cursor-pointer"
                                            title="Hapus tautan ini"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 10. Sumber Data Referensi Dokumen PDF (Maksimal 3 File PDF) */}
                              <div className="space-y-3 p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                    10. Sumber Data Upload PDF (Maks. 3 File)
                                  </label>
                                  {examDocuments.length > 0 && (
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                                      {examDocuments.length} / 3 Dokumen
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                  Upload hingga 3 berkas PDF kisi-kisi atau materi (maks. 5MB/file) sebagai sumber referensi utama butir soal.
                                </p>

                                {/* List of uploaded PDF files */}
                                {examDocuments.length > 0 && (
                                  <div className="space-y-2">
                                    {examDocuments.map((docFile, docIdx) => (
                                      <div
                                        key={`doc-file-${docIdx}-${docFile.name}`}
                                        className="flex items-center justify-between p-2.5 bg-white border border-blue-200 rounded-xl shadow-xs text-xs font-semibold text-slate-800"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {docIdx + 1}
                                          </span>
                                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                          <span className="truncate max-w-[150px] sm:max-w-[200px] text-slate-900 font-medium">
                                            {docFile.name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                            ({(docFile.size / (1024 * 1024)).toFixed(1)} MB)
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); 
                                            setExamDocuments(examDocuments.filter((_, i) => i !== docIdx));
                                          }}
                                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus PDF ini"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Upload button if fewer than 3 files */}
                                {examDocuments.length < 3 && (
                                  <div className="relative">
                                    <input
                                      type="file"
                                      id="examDocumentMultiUpload"
                                      multiple
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;

                                        const availableSlots = 3 - examDocuments.length;
                                        const selectedFiles = files.slice(0, availableSlots);

                                        const validFiles: File[] = [];
                                        for (const f of selectedFiles) {
                                          if (f.size > 5 * 1024 * 1024) {
                                            showAlert("Peringatan", `File "${f.name}" melebihi ukuran maksimal 5MB.`, "danger");
                                          } else {
                                            validFiles.push(f);
                                          }
                                        }

                                        if (validFiles.length > 0) {
                                          setExamDocuments([...examDocuments, ...validFiles]);
                                        }
                                        e.target.value = "";
                                      }}
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.txt"
                                    />
                                    <label
                                      htmlFor="examDocumentMultiUpload"
                                      className="block w-full rounded-xl border-2 border-dashed border-blue-300 bg-white hover:bg-blue-50/50 p-3 text-xs text-blue-600 font-bold outline-none transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                                    >
                                      <Upload className="w-4 h-4 text-blue-600" />
                                      <span>
                                        {examDocuments.length === 0
                                          ? "+ Pilih File PDF (Maks. 3 PDF)"
                                          : `+ Tambah PDF (${3 - examDocuments.length} slot tersisa)`}
                                      </span>
                                    </label>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={handleGenerateAIExam}
                                disabled={isGeneratingExam || !examBab || !examTitle || !examKelas}
                                className="w-full h-14 bg-[#85cc00] hover:brightness-110 font-black text-xs text-slate-950 uppercase tracking-widest rounded-2xl shadow-lg shadow-[#85cc00]/20 flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                              >
                                {isGeneratingExam ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                    Menganalisis & Membuat Soal...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 shrink-0" />
                                    Generasi Soal dengan AI
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Col 2: Questions review & Token configuration */}
                          <div className="md:col-span-8 space-y-6">
                            {examQuestions.length === 0 ? (
                              <div className="p-10 sm:p-14 text-center border-4 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center min-h-[420px] space-y-5">
                                <Sparkles className="w-14 h-14 text-[#85cc00]" />
                                <div className="space-y-2">
                                  <h3 className="text-xl font-display font-black text-black tracking-tight">
                                    Susun Bank Soal dengan AI, Impor File, atau Input Manual
                                  </h3>
                                  <p className="text-xs text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                                    Klik <strong>Generasi Soal dengan AI</strong> di sebelah kiri, atau gunakan <strong>Impor Massal Excel/Word</strong> maupun tombol manual untuk menyusun soal Pilihan Ganda, Isian Singkat, Esai, dan Soal Bergambar.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setIsBulkImportModalOpen(true)}
                                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
                                  >
                                    <Upload className="w-4 h-4 text-[#85cc00]" />
                                    <span>Impor Excel / Word</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddManualQuestion("multiple_choice")}
                                    className="px-4 py-3 bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4 text-[#85cc00]" />
                                    <span>+ PG</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddManualQuestion("short_answer")}
                                    className="px-4 py-3 bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4 text-blue-600" />
                                    <span>+ Isian Singkat</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddManualQuestion("essay")}
                                    className="px-4 py-3 bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4 text-purple-600" />
                                    <span>+ Esai</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {/* Token configuration info strip */}
                                <div className="p-6 rounded-3xl border-2 border-[#85cc00] bg-emerald-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                  <div>
                                    <h4 className="font-extrabold text-black text-sm mb-1">
                                      Token Akses Berhasil Di-generasi
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                                      Bagikan kode token ini hanya kepada pengawas atau kelas <span className="font-extrabold text-slate-800">{examKelas || "sasaran"}</span> untuk memulai.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative flex items-center">
                                      <input
                                        type="text"
                                        maxLength={6}
                                        value={examToken}
                                        onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                                        className="w-36 text-center text-2xl font-mono font-black tracking-widest border-4 border-slate-900 rounded-2xl bg-slate-950 text-[#85cc00] p-3 uppercase outline-none focus:border-[#85cc00] transition-all shadow-md pr-12"
                                        placeholder="TOKEN"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); 
                                          navigator.clipboard.writeText(examToken);
                                          showAlert("Token Disalin", "Token berhasil disalin ke papan klip.", "alert");
                                        }}
                                        className="absolute right-3 p-1.5 text-slate-500 hover:text-[#85cc00] transition-colors cursor-pointer"
                                        title="Salin Token"
                                      >
                                        <Copy className="w-5 h-5" />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setExamToken(generateRandomToken())}
                                      className="p-3.5 border-4 border-slate-900 bg-white rounded-2xl text-slate-950 hover:bg-slate-50 hover:border-slate-950 transition-colors cursor-pointer shrink-0 shadow-md active:scale-95"
                                      title="Acak Token Baru"
                                    >
                                      <RefreshCw className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); 
                                        setShareCbtExamModal({
                                          isOpen: true,
                                          exam: {
                                            title: examTitle || "Ujian CBT Baru",
                                            subject: examSubject || "Informatika",
                                            duration: examDuration,
                                            questions: examQuestions,
                                            kkm: examKkm,
                                            token: examToken,
                                            kelasRef: examKelas || "Sasaran",
                                          },
                                          customToken: examToken,
                                          customClasses: examKelas ? [examKelas] : ["Semua Kelas"],
                                        });
                                      }}
                                      className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-md cursor-pointer shrink-0"
                                      title="Bagikan ke WhatsApp"
                                    >
                                      <MessageCircle className="w-5 h-5" />
                                      <span>Bagikan WA</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Questions lists editing + Quick Add / Import Toolbar */}
                                <div className="space-y-5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-display font-black text-slate-800 text-base tracking-tight">
                                        Daftar Bank Soal ({examQuestions.length} Soal)
                                      </h4>
                                      <span className="text-xs font-semibold text-slate-400">
                                        Mendukung Pilihan Ganda, Isian Singkat, Esai, Impor Excel/Word, dan Lampiran Gambar
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setIsBulkImportModalOpen(true)}
                                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Upload className="w-3.5 h-3.5 text-[#85cc00]" />
                                        <span>Impor Excel/Word</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddManualQuestion("multiple_choice")}
                                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 cursor-pointer"
                                      >
                                        + PG
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddManualQuestion("short_answer")}
                                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 cursor-pointer"
                                      >
                                        + Isian
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddManualQuestion("essay")}
                                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 cursor-pointer"
                                      >
                                        + Esai
                                      </button>
                                    </div>
                                  </div>

                                  {examQuestions.map((q, idx) => {
                                    const qType = q.type || "multiple_choice";
                                    return (
                                    <div key={`exam-q-box-${idx}`} className="p-6 rounded-3xl border-2 border-slate-200 bg-white space-y-4">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-[#85cc00]">
                                            SOAL NOMOR {idx + 1}
                                          </span>
                                          <select
                                            value={qType}
                                            onChange={(e) => {
                                              const nextType = e.target.value as "multiple_choice" | "short_answer" | "essay";
                                              const updated = [...examQuestions];
                                              updated[idx] = {
                                                ...updated[idx],
                                                type: nextType,
                                                options:
                                                  nextType === "multiple_choice"
                                                    ? (Array.isArray(updated[idx].options) && updated[idx].options.length === 5
                                                        ? updated[idx].options
                                                        : ["", "", "", "", ""])
                                                    : [],
                                                correctIndex: updated[idx].correctIndex ?? 0,
                                                correctAnswerText: updated[idx].correctAnswerText || "",
                                              };
                                              setExamQuestions(updated);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                                          >
                                            <option value="multiple_choice">Pilihan Ganda (A–E)</option>
                                            <option value="short_answer">Isian Singkat</option>
                                            <option value="essay">Esai / Uraian</option>
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <label className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span>{q.imageUrl ? "Ganti Gambar" : "+ Gambar"}</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadQuestionImage(idx, f);
                                                e.target.value = "";
                                              }}
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); 
                                              const updated = examQuestions.filter((_, i) => i !== idx);
                                              setExamQuestions(updated);
                                            }}
                                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                            title="Hapus Soal"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <textarea
                                        value={q.text}
                                        rows={2}
                                        placeholder="Tulis teks pertanyaan soal di sini..."
                                        onChange={(e) => {
                                          const updated = [...examQuestions];
                                          updated[idx] = { ...updated[idx], text: e.target.value };
                                          setExamQuestions(updated);
                                        }}
                                        className="w-full text-sm font-bold text-black border-2 border-slate-100 hover:border-slate-200 focus:border-slate-400 p-3 rounded-xl bg-slate-50/50 outline-none leading-relaxed transition-all"
                                      />

                                      {/* Optional Image Attachment Preview & Link Input */}
                                      <div className="space-y-2">
                                        {q.imageUrl && (
                                          <div className="relative inline-block rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                                            <img
                                              src={getDriveImageUrl(q.imageUrl)}
                                              alt={`Gambar Soal ${idx + 1}`}
                                              className="max-h-48 rounded-xl object-contain"
                                              referrerPolicy="no-referrer"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = [...examQuestions];
                                                updated[idx] = { ...updated[idx], imageUrl: "" };
                                                setExamQuestions(updated);
                                              }}
                                              className="absolute top-3 right-3 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700 cursor-pointer"
                                              title="Hapus Gambar"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                        <input
                                          type="url"
                                          value={q.imageUrl && !q.imageUrl.startsWith("data:") ? q.imageUrl : ""}
                                          onChange={(e) => {
                                            const updated = [...examQuestions];
                                            updated[idx] = { ...updated[idx], imageUrl: e.target.value };
                                            setExamQuestions(updated);
                                          }}
                                          placeholder="Atau tempel URL gambar soal (Google Drive / link gambar https://...)"
                                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-[11px] font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-400"
                                        />
                                      </div>

                                      {qType === "multiple_choice" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                                          {(q.options || ["", "", "", "", ""]).map((opt: string, optIdx: number) => (
                                            <div
                                              key={`exam-opt-${optIdx}`}
                                              className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3.5 transition-all ${
                                                q.correctIndex === optIdx
                                                  ? "border-emerald-500 bg-emerald-50/20"
                                                  : "border-slate-150 hover:border-slate-250 bg-slate-50/30"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">
                                                  {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                <input
                                                  type="text"
                                                  value={opt}
                                                  placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                                  onChange={(e) => {
                                                    const updated = [...examQuestions];
                                                    const nextOpts = [...(updated[idx].options || ["", "", "", "", ""])];
                                                    nextOpts[optIdx] = e.target.value;
                                                    updated[idx] = { ...updated[idx], options: nextOpts };
                                                    setExamQuestions(updated);
                                                  }}
                                                  className="flex-1 bg-transparent border-none text-xs font-semibold text-black outline-none p-0"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); 
                                                  const updated = [...examQuestions];
                                                  updated[idx] = { ...updated[idx], correctIndex: optIdx };
                                                  setExamQuestions(updated);
                                                }}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                                  q.correctIndex === optIdx
                                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                                    : "border-slate-300 bg-white"
                                                }`}
                                              >
                                                {q.correctIndex === optIdx && (
                                                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                                )}
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-700">
                                            {qType === "short_answer"
                                              ? "Kunci Jawaban Isian Singkat (pisahkan variasi valid dengan tanda |, misal: CPU|Central Processing Unit)"
                                              : "Kunci Jawaban / Rubrik Penilaian Esai (Referensi Koreksi Guru)"}
                                          </label>
                                          <textarea
                                            rows={qType === "essay" ? 3 : 1}
                                            value={q.correctAnswerText || ""}
                                            onChange={(e) => {
                                              const updated = [...examQuestions];
                                              updated[idx] = { ...updated[idx], correctAnswerText: e.target.value };
                                              setExamQuestions(updated);
                                            }}
                                            placeholder={
                                              qType === "short_answer"
                                                ? "Contoh: CPU|Central Processing Unit"
                                                : "Tuliskan poin-poin jawaban yang benar untuk memudahkan koreksi..."
                                            }
                                            className="w-full rounded-xl border-2 border-blue-100 bg-blue-50/30 focus:bg-white focus:border-blue-400 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none"
                                          />
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>

                                <div className="p-6 rounded-3xl border-2 border-black bg-black flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                                  <div className="text-white">
                                    <h4 className="font-extrabold text-white text-sm leading-snug mb-1">
                                      Siap Untuk Menerbitkan CBT?
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                                      Semua konfigurasi valid. Klik simpan untuk mendistribusikan soal ujian secara langsung ke platform siswa.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleSimpanUjian}
                                    disabled={isSavingExam}
                                    className="px-8 h-14 bg-[#85cc00] hover:bg-[#72b000] text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-lg shrink-0"
                                  >
                                    {isSavingExam ? (
                                      <>
                                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> Menyimpan...
                                      </>
                                    ) : (
                                      <>
                                        Terbitkan Ujian & Rilis Token <ArrowRight className="w-4 h-4" />
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  )}

                  {activeMenu === "pengumuman" && (
                    <div className="space-y-12 animate-in fade-in duration-300">
                      <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl font-bold text-slate-950">Sistem Pengumuman</h2>
                          <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Kirim pengumuman penting ke siswa secara massal atau per kelas.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        {/* Form Col */}
                        <div ref={announcementFormRef} className="md:col-span-5 space-y-6 scroll-mt-24">
                            <div className={`p-8 rounded-xl border bg-white shadow-sm space-y-5 transition-colors ${editingAnnouncementId ? "border-amber-300 ring-2 ring-amber-200/60" : "border-slate-200"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                                    {editingAnnouncementId ? (
                                      <Pencil className="w-5 h-5 text-amber-500" />
                                    ) : (
                                      <MessageSquare className="w-5 h-5 text-[#85cc00]" />
                                    )}
                                    {editingAnnouncementId ? "Edit Pengumuman" : "Kirim Pengumuman Baru"}
                                  </h3>
                                  <p className="text-xs text-slate-500 font-medium mt-1">
                                    {editingAnnouncementId
                                      ? "Perbarui isi pengumuman, tanggal terbit, atau kelas sasaran."
                                      : "Pesan ini akan muncul sebagai popup notifikasi khusus untuk siswa pada target kelas yang dipilih."}
                                  </p>
                                </div>
                                {editingAnnouncementId && (
                                  <button
                                    type="button"
                                    onClick={handleCancelEditAnnouncement}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Batal</span>
                                  </button>
                                )}
                              </div>
                              <hr className="border-slate-100" />
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Judul Pengumuman
                                  </label>
                                  <input
                                    type="text"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                    placeholder="Contoh: Info Remedi, Perubahan Jadwal, dll"
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold outline-none focus:bg-white focus:border-[#85cc00] transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Tanggal Terbit Pengumuman
                                  </label>
                                  <input
                                    type="date"
                                    value={announcementPublishDate}
                                    onChange={(e) => setAnnouncementPublishDate(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold outline-none focus:bg-white focus:border-[#85cc00] transition-all cursor-pointer"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Isi Pesan
                                  </label>
                                  <textarea
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                    placeholder="Ketik isi pengumuman lengkap disini..."
                                    className="block w-full min-h-[140px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-medium outline-none focus:bg-white focus:border-[#85cc00] transition-all resize-y"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Kelas Sasaran
                                  </label>
                                  <select
                                    value={announcementKelas}
                                    onChange={(e) => setAnnouncementKelas(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 font-semibold outline-none focus:bg-white focus:border-[#85cc00] transition-all cursor-pointer"
                                  >
                                    <option value="" disabled>Pilih Kelas Sasaran</option>
                                    <option value="SEMUA_KELAS">-- KIRIM KE SEMUA KELAS --</option>
                                    {classesList.map((cls, idx) => (
                                      <option key={`ann-cls-${cls.id || cls.name || idx}-${idx}`} value={cls.name}>{cls.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={handleCreateAnnouncement}
                                  disabled={isSavingAnnouncement || !announcementTitle || !announcementContent || !announcementKelas}
                                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#85cc00] px-5 py-4 text-sm font-bold uppercase tracking-widest text-slate-950 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                                >
                                  {isSavingAnnouncement ? "Menyimpan..." : editingAnnouncementId ? (
                                    <>
                                      <Save className="w-4 h-4" />
                                      Simpan Perubahan
                                    </>
                                  ) : (
                                    <>
                                      <Bell className="w-4 h-4" />
                                      Kirim Pengumuman
                                    </>
                                  )}
                                </button>
                                {editingAnnouncementId && (
                                  <button
                                    type="button"
                                    onClick={handleCancelEditAnnouncement}
                                    className="sm:w-auto px-4 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                )}
                              </div>
                            </div>
                        </div>
                        {/* List Col */}
                        <div className="md:col-span-7 space-y-6">
                            <div className="p-8 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
                              <h3 className="font-bold text-lg text-slate-900 tracking-tight mb-2 flex items-center gap-2">
                                Riwayat Pengumuman ({announcementsList.length})
                              </h3>
                              
                              <div className="flex-1 mt-4 space-y-4">
                                {announcementsList.length === 0 ? (
                                    <div className="text-center py-20 px-6 border border-dashed border-slate-200 rounded-xl">
                                        <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-1">
                                          Belum ada pengumuman
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                          Gunakan form di samping untuk membuat dan mengirim pengumuman baru ke kelas.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {announcementsList.map((ann, idx) => {
                                            const isBeingEdited = editingAnnouncementId === ann.id;
                                            return (
                                            <div key={`ann-${ann.id || idx}-${idx}`} className={`p-5 rounded-xl border transition-colors bg-slate-50/50 relative ${isBeingEdited ? "border-amber-400 bg-amber-50/30 ring-1 ring-amber-300" : "border-slate-100 hover:border-slate-200"}`}>
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border bg-[#85cc00]/10 text-[#85cc00] border-[#85cc00]/20">
                                                            {ann.kelasRef === "SEMUA_KELAS" ? "PENGUMUMAN GLOBAL" : `KELAS: ${ann.kelasRef}`}
                                                        </span>
                                                        <span className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg flex items-center gap-1 border border-slate-200">
                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                            <span>Terbit: {(() => {
                                                                const dStr = ann.publishDate || ann.createdAt;
                                                                if (!dStr) return "-";
                                                                if (typeof dStr === "string" && dStr.includes("-") && dStr.length === 10) {
                                                                  const [y, m, d] = dStr.split("-");
                                                                  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
                                                                  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
                                                                }
                                                                const d = new Date(dStr);
                                                                return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                                                            })()}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditAnnouncement(ann)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:text-white bg-white hover:bg-amber-500 rounded-lg transition-all cursor-pointer border border-slate-200 hover:border-amber-500 shadow-2xs"
                                                            title="Edit Pengumuman"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-white bg-white hover:bg-rose-500 rounded-lg transition-all cursor-pointer border border-slate-200 hover:border-rose-500 shadow-2xs"
                                                            title="Hapus Pengumuman"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>Hapus</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-base leading-tight mb-2">{ann.title}</h4>
                                                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{ann.content}</p>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMenu === "manajemen-penyimpanan" && (
                    <div className="space-y-8 max-w-6xl mx-auto">
                      {/* Header & Tombol Aksi Sejajar */}
                      <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-6 pb-8 border-b border-slate-200/70">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Manajemen Penyimpanan</h2>
                          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed mt-1">
                            Monitoring pemakaian resource, kapasitas berkas, dan cadangan database.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsSupabaseModalOpen(true)}
                            className="h-11 px-5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Sinkron Supabase</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsStorageModalOpen(true)}
                            className="h-11 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Kelola Berkas</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetStats}
                            className="h-11 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Reset Statistik</span>
                          </button>
                        </div>
                      </div>

                      {/* Row 1: Statistik Kuota Harian (Simetris Sejajar) */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reads</h4>
                            <p className="text-3xl font-black text-slate-950 tabular-nums">{sessionUsage.reads.toLocaleString()}</p>
                          </div>
                          <p className="mt-4 text-xs text-emerald-700 font-semibold">
                            Sesi Aktif
                          </p>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Writes</h4>
                            <p className="text-3xl font-black text-slate-950 tabular-nums">{sessionUsage.writes.toLocaleString()}</p>
                          </div>
                          <p className="mt-4 text-xs text-slate-500 font-medium">
                            Update transaksional
                          </p>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 h-full">
                          <div className="flex items-center gap-5">
                            <div className="relative w-20 h-20 shrink-0">
                              <svg className="w-20 h-20" viewBox="0 0 100 100">
                                <circle className="text-slate-200 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                                <circle
                                  className="text-emerald-600 stroke-current transition-all duration-700"
                                  strokeWidth="10"
                                  strokeDasharray={`${Math.min(251.2, (sessionUsage.reads / 50000) * 251.2)} 251.2`}
                                  strokeLinecap="round"
                                  fill="transparent"
                                  r="40"
                                  cx="50"
                                  cy="50"
                                  transform="rotate(-90 50 50)"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900 tabular-nums">
                                {Math.round((sessionUsage.reads / 50000) * 100)}%
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Kuota Harian</h4>
                              <p className="text-xl font-black text-slate-950 tracking-tight">OPTIMAL</p>
                              <p className="text-xs font-medium text-slate-500 tabular-nums">
                                {Math.max(0, 50000 - sessionUsage.reads).toLocaleString()} sisa kuota pembacaan
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Kapasitas Penyimpanan Berkas */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-950 tracking-tight">
                                Kapasitas Penyimpanan Berkas
                              </h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Total Kuota Server: <span className="font-bold text-slate-700 tabular-nums">5.00 GB</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsStorageModalOpen(true)}
                            className="h-11 px-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Daftar Berkas Tugas</span>
                          </button>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 sm:p-6 space-y-3">
                          <div className="flex justify-between items-end gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Ruang Terpakai
                              </p>
                              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                                {storageMetrics.usedFormatted}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Sisa Ruang
                              </p>
                              <p className="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums">
                                {storageMetrics.freeFormatted}
                              </p>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                            <div
                              className={`h-3 rounded-full transition-all duration-700 ${
                                storageMetrics.percentage > 90
                                  ? "bg-rose-500"
                                  : storageMetrics.percentage > 70
                                  ? "bg-amber-500"
                                  : "bg-blue-600"
                              }`}
                              style={{ width: `${storageMetrics.percentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className={`tabular-nums ${storageMetrics.percentage > 90 ? "text-rose-600" : "text-slate-600"}`}>
                              {storageMetrics.percentage}% Terpakai
                            </span>
                            <span className="text-slate-400 tabular-nums">Batas 5.00 GB</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Kebijakan Retensi Berkas & Optimasi Penyimpanan */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                          <div className="flex items-start sm:items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-950 tracking-tight">
                                Kebijakan Retensi Berkas &amp; Optimasi Penyimpanan
                              </h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Menjaga kapasitas penyimpanan agar tetap lega tanpa menghapus rekap nilai siswa.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isCleaningRetention}
                            onClick={handleRunRetentionCleanup}
                            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {isCleaningRetention ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                <span>Membersihkan...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>Jalankan Pembersihan Retensi</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-2 h-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Data Nilai &amp; Rekap Siswa
                            </span>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>100% Permanen di Database</span>
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Nama, NIS, kelas, nilai angka, catatan guru, dan tanggal penyerahan tetap aman tersimpan.
                            </p>
                          </div>

                          <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-2 h-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Berkas Tugas Selesai Dinilai
                            </span>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <HardDrive className="w-4 h-4 text-sky-600 shrink-0" />
                              <span>Diarsipkan &amp; Dibersihkan</span>
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Lampiran tugas yang sudah selesai diperiksa dibersihkan dari penyimpanan untuk menghemat ruang.
                            </p>
                          </div>

                          <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex flex-col justify-between space-y-2 h-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                              Status Retensi Penyimpanan
                            </span>
                            <p className="text-sm font-bold text-emerald-950 tabular-nums">
                              {retentionCleanedCount} Berkas Terpelihara
                            </p>
                            <p className="text-xs text-emerald-700 font-medium">
                              Terakhir dijalankan: {retentionLastRun || "Belum pernah (Sistem siap)"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Eksplorasi Koleksi & Cadangan (Simetris) */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#85cc00]/15 border border-[#85cc00]/30 rounded-2xl flex items-center justify-center text-[#5c8d00] shrink-0">
                            <Database className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Eksplorasi Koleksi &amp; Cadangan</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Ringkasan entri database aktif dan pengelolaan cadangan data</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-stretch">
                          {[
                            { name: "Siswa", count: studentsList.length, tone: "bg-slate-50 border-slate-200/80 text-slate-900", labelTone: "text-slate-500" },
                            { name: "Kelas", count: classesList.length, tone: "bg-slate-50 border-slate-200/80 text-slate-900", labelTone: "text-slate-500" },
                            { name: "Tugas", count: assignmentsList.length, tone: "bg-emerald-50/60 border-emerald-200/80 text-emerald-950", labelTone: "text-emerald-700" },
                            { name: "Audit", count: submissionsList.length, tone: "bg-emerald-50/60 border-emerald-200/80 text-emerald-950", labelTone: "text-emerald-700" },
                          ].map((item, i) => (
                            <div
                              key={`db-stat-${i}`}
                              className={`${item.tone} p-5 rounded-2xl border flex flex-col justify-between h-full`}
                            >
                              <span className={`text-xs font-bold uppercase tracking-wider ${item.labelTone}`}>{item.name}</span>
                              <span className="text-3xl font-black tabular-nums mt-2">{item.count}</span>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <button
                            type="button"
                            onClick={handleExportData}
                            className="h-12 px-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all font-bold text-xs text-slate-800 inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            <Download className="w-4 h-4 text-slate-600 shrink-0" />
                            <span>Unduh Cadangan Data</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetModalOpen(true)}
                            className="h-12 px-5 bg-rose-50 rounded-xl border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all font-bold text-xs text-rose-700 inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            <RefreshCw className="w-4 h-4 shrink-0" />
                            <span>Inisialisasi Ulang</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMenu === "ubah-password" && (
                    <div className="space-y-12">
                      <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl font-bold text-slate-950">Ubah Password Guru</h2>
                          <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Perbarui kata sandi keamanan Anda.
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-white/95 rounded-[3.5rem] border border-white p-12 md:p-16 shadow-2xl max-w-2xl mx-auto space-y-8">
                        {/* Information Card displaying Initial/Current Password Status */}
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2.5 font-bold text-slate-800 text-sm">
                            <KeyRound className="w-4 h-4 text-[#85cc00]" />
                            <span>Informasi Kata Sandi Guru</span>
                          </div>
                          <div className="space-y-2 text-xs text-slate-600">
                            {dbTeacherPassword ? (
                              <p className="flex items-center gap-2 text-emerald-700 font-semibold pt-1">
                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                <span>Password aktif tersimpan aman di Database Firebase.</span>
                              </p>
                            ) : (
                              <p className="text-slate-500 italic pt-1">
                                (Saat ini menggunakan password default. Perubahan password yang Anda buat akan langsung tersimpan di Firebase Database.)
                              </p>
                            )}
                          </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-8">
                          {passwordMessage.text && (
                            <div className={`p-4 rounded-xl text-sm font-bold ${passwordMessage.type === 'success' ? 'bg-[#85cc00]/10 text-[#649c00]' : 'bg-rose-50 text-rose-600'}`}>
                              {passwordMessage.text}
                            </div>
                          )}

                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Lama</label>
                            <div className="relative">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-[#85cc00]/20 focus:border-[#85cc00] transition-all text-sm font-medium"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-[#85cc00]/20 focus:border-[#85cc00] transition-all text-sm font-medium"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password Baru</label>
                            <div className="relative">
                              <input
                                type={showConfirmNewPassword ? "text" : "password"}
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-[#85cc00]/20 focus:border-[#85cc00] transition-all text-sm font-medium"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-4 bg-[#85cc00] hover:bg-[#7bc000] text-slate-900 font-bold uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            {isChangingPassword ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <>Simpan Password <ArrowRight className="w-4 h-4" /></>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {activeMenu === "statistik-ai" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <div className="flex flex-col text-center md:text-left md:items-end md:flex-row justify-between gap-8 pb-10 border-b border-slate-100">
                        <div className="max-w-2xl">
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Statistik & Etika Digital AI (Si Pinter)</h2>
                          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed mt-1">
                            Pantau intensitas interaksi siswa, kecepatan respons AI, serta ringkasan pelanggaran etika digital (kata kasar/kotor).
                          </p>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => void fetchAiStats(true)}
                            disabled={isRefreshingAiStats}
                            className="px-5 py-3 bg-[#85cc00] hover:bg-[#72b000] active:scale-95 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRefreshingAiStats ? "animate-spin" : ""}`} />
                            <span>{isRefreshingAiStats ? "Memperbarui..." : "Perbarui Statistik"}</span>
                          </button>
                          {aiStatsFeedback && (
                            <span className="text-xs font-semibold text-emerald-700">
                              {aiStatsFeedback}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm relative overflow-hidden">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#075e54] flex items-center justify-center mb-4">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Pertanyaan Siswa</p>
                          <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{aiStats.totalQuestions}</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Sesi tanya jawab interaktif</p>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm relative overflow-hidden">
                          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Rata-rata Durasi Respon</p>
                          <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">
                            {aiStats.avgDurationMs > 0 ? `${(aiStats.avgDurationMs / 1000).toFixed(2)}s` : "0.00s"}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Kecepatan pemrosesan Si Pinter</p>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm relative overflow-hidden">
                          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Pelanggaran Etika Digital</p>
                          <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{aiStats.violations.length}</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">Kata kasar/kotor terdeteksi</p>
                        </div>
                      </div>

                      {/* Violations Table / List */}
                      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Log Pelanggaran Etika Digital Siswa</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Daftar pesan siswa yang terdeteksi mengandung kata kasar atau tidak senonoh.</p>
                          </div>
                        </div>

                        {aiStats.violations.length === 0 ? (
                          <div className="text-center py-16 px-6 border border-dashed border-slate-200 rounded-2xl">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-slate-800">Bersih dari Pelanggaran Etika</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Belum ada siswa yang mengirimkan kata-kata kasar atau kotor dalam chat Si Pinter.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {aiStats.violations.map((v: any, vIdx: number) => (
                              <div key={`viol-${v.id || "item"}-${vIdx}`} className="p-5 rounded-2xl border border-rose-200/80 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                                      Pelanggaran Etika
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">Siswa: {v.studentName || "Siswa"}</span>
                                    <span className="text-xs font-medium text-slate-400">·</span>
                                    <span className="text-xs text-slate-500">{new Date(v.timestamp || Date.now()).toLocaleString("id-ID")}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-900 bg-white/80 p-3 rounded-xl border border-rose-100">
                                    &ldquo;{v.questionText}&rdquo;
                                  </p>
                                  <p className="text-xs text-rose-700 font-medium">
                                    Kata terdeteksi: <strong className="font-bold underline">&ldquo;{v.flaggedWord}&rdquo;</strong>
                                  </p>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-xl ${v.status === "Sudah Ditindaklanjuti" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                    {v.status || "Belum Ditindaklanjuti"}
                                  </span>
                                  {v.status !== "Sudah Ditindaklanjuti" && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const resolvedAt = new Date().toISOString();
                                        setAiStats((prev) => ({
                                          ...prev,
                                          violations: prev.violations.map((item) =>
                                            item.id === v.id
                                              ? { ...item, status: "Sudah Ditindaklanjuti", resolvedAt }
                                              : item
                                          ),
                                        }));
                                        try {
                                          if (v.id && !String(v.id).startsWith("viol-")) {
                                            await updateDoc(doc(db, "aiViolations", v.id), {
                                              status: "Sudah Ditindaklanjuti",
                                              resolvedAt,
                                            }).catch(() => {});
                                          }
                                          await fetch(`${window.location.origin}/api/ai-violations/${v.id}/resolve`, { method: "POST" }).catch(() => {});
                                          void fetchAiStats(false);
                                        } catch (e) {
                                          console.warn("Failed to resolve:", e);
                                        }
                                      }}
                                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                                    >
                                      Tindak Lanjuti
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Simulasi Berpikir Komputasional Menu */}
                  {activeMenu === "simulasi" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <SimulasiChapterMenu
                        userRole="teacher"
                        currentUser={{
                          name: "Guru Pengampu Informatika",
                          kelas: selectedClassFilter || "Kelas X",
                        }}
                        onBackToDashboard={() => setActiveMenu("dashboard")}
                      >
                        <SimulasiBKSettings classesList={classesList} />
                      </SimulasiChapterMenu>
                    </div>
                  )}

                  {/* Halaman Khusus Live Proctoring Ujian Siswa */}
                  {activeMenu === "live-proctoring" && (
                    <LiveProctoringModal
                      asPage={true}
                      isOpen={true}
                      onClose={() => {
                        setProctoringExamModal({ isOpen: false, exam: null });
                        setDirection(-1);
                        setActiveMenu("ujian-siswa");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      exam={proctoringExamModal.exam || examsList[0]}
                      examsList={examsList}
                      onSelectExam={(nextExam) => setProctoringExamModal({ isOpen: true, exam: nextExam })}
                      studentsList={studentsList}
                      finalGradesList={finalGradesList}
                      classesList={classesList}
                    />
                  )}

                  {/* Halaman Khusus Statistik & Analisis Butir Soal CBT */}
                  {activeMenu === "analisis-cbt" && (
                    <ExamItemAnalysisModal
                      asPage={true}
                      isOpen={true}
                      onClose={() => {
                        setAnalysisExamModal({ isOpen: false, exam: null });
                        setDirection(-1);
                        setActiveMenu("ujian-siswa");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      exam={analysisExamModal.exam || examsList[0]}
                      examsList={examsList}
                      onSelectExam={(nextExam) => setAnalysisExamModal({ isOpen: true, exam: nextExam })}
                      studentsList={studentsList}
                      finalGradesList={finalGradesList}
                      classesList={classesList}
                      onGradeUpdated={() => fetchTeacherData(false)}
                    />
                  )}

                  </motion.div>
                </AnimatePresence>


          </div>
        </div>

        {/* Bottom Navigation Bar (Unified Styling: Tugas, Nilai, Beranda, Siswa, Profil) */}
        {!isGradingModalOpen && (
          <nav
            aria-label="Teacher Bottom Navigation"
            className="fixed bottom-0 left-0 right-0 z-[80] bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.06)] px-2 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] min-h-[72px] flex items-center justify-center overflow-visible"
          >
            <div className="w-full max-w-lg md:max-w-xl grid grid-cols-5 items-center overflow-visible">
              {/* 1. Ujung Kiri: Tugas */}
              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuChange("manajemen-tugas", menus.findIndex((m) => m.id === "manajemen-tugas"));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group active:scale-95 ${
                    activeMenu === "manajemen-tugas" ? "text-[#85cc00]" : "text-slate-500 hover:text-[#85cc00]"
                  }`}
                  title="Manajemen Tugas"
                >
                  <div
                    className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-3xs ${
                      activeMenu === "manajemen-tugas"
                        ? "bg-[#85cc00] text-white shadow-sm"
                        : "bg-[#85cc00]/10 text-[#85cc00] group-hover:bg-[#85cc00] group-hover:text-white"
                    }`}
                  >
                    <FilePlus className="w-4.5 h-4.5" />
                    {assignmentsList.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                        {assignmentsList.length}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-tight leading-none ${activeMenu === "manajemen-tugas" ? "text-[#85cc00]" : "text-slate-600"}`}>
                    Tugas
                  </span>
                </button>
              </div>

              {/* 2. Kiri Tengah: Nilai */}
              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuChange("manajemen-nilai", menus.findIndex((m) => m.id === "manajemen-nilai"));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group active:scale-95 ${
                    activeMenu === "manajemen-nilai" ? "text-[#85cc00]" : "text-slate-500 hover:text-[#85cc00]"
                  }`}
                  title="Manajemen Nilai"
                >
                  <div
                    className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-3xs ${
                      activeMenu === "manajemen-nilai"
                        ? "bg-[#85cc00] text-white shadow-sm"
                        : "bg-[#85cc00]/10 text-[#85cc00] group-hover:bg-[#85cc00] group-hover:text-white"
                    }`}
                  >
                    <ClipboardCheck className="w-4.5 h-4.5" />
                    {finalGradesList.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                        {finalGradesList.length}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-tight leading-none ${activeMenu === "manajemen-nilai" ? "text-[#85cc00]" : "text-slate-600"}`}>
                    Nilai
                  </span>
                </button>
              </div>

              {/* 3. Tepat di Tengah (Item #3 dari 5): Beranda */}
              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuChange("dashboard", 0);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group"
                  title="Beranda"
                >
                  <div className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-[#85cc00] to-emerald-600 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center border-4 border-white active:scale-95 transition-all hover:scale-105 shrink-0">
                    <Home className="w-5 h-5 fill-white" />
                  </div>
                  <span className={`text-[10px] font-black tracking-tight leading-none ${activeMenu === "dashboard" ? "text-[#85cc00]" : "text-slate-700"}`}>
                    Beranda
                  </span>
                </button>
              </div>

              {/* 4. Kanan Tengah: Siswa */}
              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuChange("manajemen-siswa-dan-kelas", menus.findIndex((m) => m.id === "manajemen-siswa-dan-kelas"));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group active:scale-95 ${
                    activeMenu === "manajemen-siswa-dan-kelas" ? "text-[#85cc00]" : "text-slate-500 hover:text-[#85cc00]"
                  }`}
                  title="Manajemen Siswa dan Kelas"
                >
                  <div
                    className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-3xs ${
                      activeMenu === "manajemen-siswa-dan-kelas"
                        ? "bg-[#85cc00] text-white shadow-sm"
                        : "bg-[#85cc00]/10 text-[#85cc00] group-hover:bg-[#85cc00] group-hover:text-white"
                    }`}
                  >
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-tight leading-none ${activeMenu === "manajemen-siswa-dan-kelas" ? "text-[#85cc00]" : "text-slate-600"}`}>
                    Siswa
                  </span>
                </button>
              </div>

              {/* 5. Ujung Kanan: Profil */}
              <div className="flex justify-center items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuChange("menu-pengguna", menus.findIndex((m) => m.id === "menu-pengguna"));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group active:scale-95 ${
                    activeMenu === "menu-pengguna" ? "text-[#85cc00]" : "text-slate-500 hover:text-[#85cc00]"
                  }`}
                  title="Profil & Pengaturan"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-3xs ${
                      activeMenu === "menu-pengguna"
                        ? "bg-[#85cc00] text-white shadow-sm"
                        : "bg-[#85cc00]/10 text-[#85cc00] group-hover:bg-[#85cc00] group-hover:text-white"
                    }`}
                  >
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-tight leading-none ${activeMenu === "menu-pengguna" ? "text-[#85cc00]" : "text-slate-600"}`}>
                    Profil
                  </span>
                </button>
              </div>
            </div>
          </nav>
        )}
      </main>

      {/* Zoom Student Photo Modal */}
      <ZoomPhotoModal
        zoomedPhotoUrl={zoomedPhotoUrl}
        zoomedStudentName={zoomedStudentName}
        onClose={() => {
          setZoomedPhotoUrl(null);
          setZoomedStudentName("");
        }}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWaModalOpen}
        waStudent={waStudent}
        waDraftMessage={waDraftMessage}
        onClose={() => setIsWaModalOpen(false)}
      />

      {/* Audit Respon / Grading Modal */}
      <AuditSubmissionModal
        isOpen={isGradingModalOpen}
        onClose={() => {
          setIsGradingModalOpen(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        assignment={assignmentsList.find(
          (a) => String(a.id) === String(selectedSubmission?.assignmentId)
        )}
        student={studentsList.find(
          (s) => isSameNisn(s.nisn, selectedSubmission?.nisn)
        )}
        gradeValue={gradeValue}
        setGradeValue={setGradeValue}
        feedbackReason={feedbackReason}
        setFeedbackReason={setFeedbackReason}
        isRejecting={isRejecting}
        setIsRejecting={setIsRejecting}
        isSavingGrade={isSavingGrade}
        onSaveGrade={handleSimpanPenilaian}
        onZoomPhoto={(photoUrl, name) => {
          setZoomedPhotoUrl(photoUrl);
          setZoomedStudentName(name);
        }}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        selectedStudentProfile={selectedStudentProfile}
        onClose={() => setSelectedStudentProfile(null)}
        studentProfileTab={studentProfileTab}
        setStudentProfileTab={setStudentProfileTab}
        submissionsList={submissionsList}
        assignmentsList={assignmentsList}
        examsList={examsList}
        finalGradesList={finalGradesList}
        getAssignmentPublishedAtForTeacher={getAssignmentPublishedAtForTeacher}
        onDownloadRaporPdf={handleQuickStudentRaporPdf}
        onShareWhatsApp={handleQuickStudentWaSummary}
      />

      {/* Bulk Import Questions Modal (Excel & Word) */}
      <BulkImportQuestionsModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        existingCount={examQuestions.length}
        onApplyQuestions={handleApplyImportedQuestions}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        classesList={classesList}
        onSave={handleSaveEditStudent}
        onZoomPhoto={(photoUrl, name) => {
          setZoomedPhotoUrl(photoUrl);
          setZoomedStudentName(name);
        }}
      />

      {/* Publish Exam to Other Classes Modal */}
      <PublishExamToClassModal
        isOpen={isPublishOtherClassModalOpen}
        onClose={() => {
          setIsPublishOtherClassModalOpen(false);
          setExamToPublish(null);
        }}
        exam={examToPublish}
        classesList={classesList}
        publishOtherClasses={publishOtherClasses}
        setPublishOtherClasses={setPublishOtherClasses}
        newPublishToken={newPublishToken}
        setNewPublishToken={setNewPublishToken}
        isSavingDuplicateExam={isSavingDuplicateExam}
        onPublish={handlePublishToOtherClass}
        onOpenWhatsAppShare={(ex, customTok, targetCls) => {
          setShareCbtExamModal({
            isOpen: true,
            exam: ex,
            customToken: customTok,
            customClasses: targetCls,
          });
        }}
      />

      {/* Download Exam Report Modal */}
      <DownloadExamReportModal
        isOpen={downloadExamModal.isOpen}
        onClose={() =>
          setDownloadExamModal({ isOpen: false, exam: null, selectedClass: "SEMUA_KELAS" })
        }
        exam={downloadExamModal.exam}
        classesList={classesList}
        selectedClass={downloadExamModal.selectedClass || "SEMUA_KELAS"}
        setSelectedClass={(cls) =>
          setDownloadExamModal((prev) => ({ ...prev, selectedClass: cls }))
        }
        onDownloadReport={(ex, cls) => handleDownloadViolationReport(ex, cls)}
        isGeneratingPdf={isGeneratingPdf}
        studentsList={studentsList}
        finalGradesList={finalGradesList}
      />

      {/* Reset Student Exam Modal */}
      <ResetStudentExamModal
        isOpen={!!examToReset}
        onClose={() => setExamToReset(null)}
        exam={examToReset}
        studentsList={studentsList}
        finalGradesList={finalGradesList}
        onConfirmReset={handleConfirmResetStudentExam}
        isResetting={isSavingDuplicateExam}
      />

      {/* Share CBT Exam via WhatsApp Modal */}
      <ShareCbtExamModal
        isOpen={shareCbtExamModal.isOpen}
        onClose={() => setShareCbtExamModal({ isOpen: false, exam: null })}
        exam={shareCbtExamModal.exam}
        customToken={shareCbtExamModal.customToken}
        customClasses={shareCbtExamModal.customClasses}
      />

      {/* Add Manual Column Modal */}
      <AddManualColumnModal
        isOpen={isAddManualColumnOpen}
        onClose={() => setIsAddManualColumnOpen(false)}
        chaptersList={
          chaptersList.length > 0
            ? chaptersList
            : [
                { id: "Informatika dan Keterampilan Generik", name: "Informatika dan Keterampilan Generik" },
                { id: "Berpikir Komputasional", name: "Berpikir Komputasional" },
                { id: "Teknologi Informasi dan Komunikasi", name: "Teknologi Informasi dan Komunikasi" },
                { id: "Sistem Komputer", name: "Sistem Komputer" },
                { id: "Jaringan Komputer dan Internet", name: "Jaringan Komputer dan Internet" },
                { id: "Analisis Data", name: "Analisis Data" },
                { id: "Algoritma dan Pemrograman", name: "Algoritma dan Pemrograman" },
                { id: "Dampak Sosial Informatika", name: "Dampak Sosial Informatika" },
                { id: "Praktik Lintas Bidang", name: "Praktik Lintas Bidang" },
              ]
        }
        classesList={classesList}
        onSave={handleCreateManualColumn}
        isSaving={isSavingManualColumn}
      />

      {/* Delete Rekap Column Modal */}
      <DeleteColumnModal
        isOpen={isDeleteColumnModalOpen}
        onClose={() => setIsDeleteColumnModalOpen(false)}
        columns={[
          ...assignmentsList
            .filter((a) => !deletedColumnIds.has(a.id))
            .map((a) => ({
            id: a.id,
            title: a.materi || a.title || "Tugas",
            type: "assignment" as const,
            bab: a.bab,
            date: a.startDate || a.publishedAt || a.createdAt,
            targetClasses: a.targetClasses,
            kelasRef: a.kelasRef || a.kelas,
          })),
          ...examsList
            .filter((e) => !deletedColumnIds.has(e.id))
            .map((e) => ({
            id: e.id,
            title: e.title || e.materi || "CBT",
            type: "exam" as const,
            bab: e.bab,
            date: e.startDate || e.publishedAt || e.createdAt,
            targetClasses: e.targetClasses,
            kelasRef: e.kelasRef,
          })),
        ].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })}
        onDeleteColumn={handlePromptDeleteRekapColumn}
        onEditColumn={handleOpenEditColumnModal}
        selectedClass={selectedClassFilter}
      />

      {/* Edit Rekap Column Modal */}
      <EditColumnModal
        isOpen={isEditColumnModalOpen}
        onClose={() => setIsEditColumnModalOpen(false)}
        columns={[
          ...assignmentsList
            .filter((a) => !deletedColumnIds.has(a.id))
            .map((a) => ({
            id: a.id,
            title: a.materi || a.title || "Tugas",
            type: "assignment" as const,
            bab: a.bab,
            date: a.startDate || a.publishedAt || a.createdAt,
            startDate: a.startDate || a.publishedAt || a.createdAt,
            deadline: a.deadline,
            targetClasses: a.targetClasses,
            kelasRef: a.kelasRef || a.kelas,
            description: a.description,
            rawDoc: a,
          })),
          ...examsList
            .filter((e) => !deletedColumnIds.has(e.id))
            .map((e) => ({
            id: e.id,
            title: e.title || e.materi || "CBT",
            type: "exam" as const,
            bab: e.bab,
            date: e.startDate || e.publishedAt || e.createdAt,
            startDate: e.startDate || e.publishedAt || e.createdAt,
            deadline: null,
            targetClasses: e.targetClasses,
            kelasRef: e.kelasRef,
            description: e.description,
            rawDoc: e,
          })),
        ].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })}
        initialSelectedId={editingColumnId}
        chaptersList={
          chaptersList.length > 0
            ? chaptersList
            : [
                { id: "Informatika dan Keterampilan Generik", name: "Informatika dan Keterampilan Generik" },
                { id: "Berpikir Komputasional", name: "Berpikir Komputasional" },
                { id: "Teknologi Informasi dan Komunikasi", name: "Teknologi Informasi dan Komunikasi" },
                { id: "Sistem Komputer", name: "Sistem Komputer" },
                { id: "Jaringan Komputer dan Internet", name: "Jaringan Komputer dan Internet" },
                { id: "Analisis Data", name: "Analisis Data" },
                { id: "Algoritma dan Pemrograman", name: "Algoritma dan Pemrograman" },
                { id: "Dampak Sosial Informatika", name: "Dampak Sosial Informatika" },
                { id: "Praktik Lintas Bidang", name: "Praktik Lintas Bidang" },
              ]
        }
        classesList={classesList}
        onSave={handleSaveEditedColumn}
        isSaving={isSavingEditColumn}
      />

      {/* Supabase Database Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSuccessRefresh={() => {
          fetchTeacherData(true);
        }}
      />

      {/* Assignment Preview Modal */}
      <AssignmentPreviewModal
        isOpen={!!previewAssignment}
        onClose={() => setPreviewAssignment(null)}
        assignment={previewAssignment}
        onToggleComplete={handleToggleAssignmentComplete}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

    </div>
  );
}
