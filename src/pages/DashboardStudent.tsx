import React, { useState, useEffect, useRef, useMemo, Fragment, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useSWR from "swr";
import {
  collection,
  query,
  where,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { dbGetDocs as getDocs, dbGetDoc as getDoc, dbSetDoc as setDoc, dbDeleteDoc as deleteDoc, isFirebaseQuotaExhausted } from "../lib/supabaseSync";
import { db, auth, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { getDriveImageUrl, getDrivePdfEmbedUrl, isYouTubeUrl, getYouTubeEmbedUrl, getYouTubeThumbnailUrl, getMediaEmbedUrl, getExternalOpenUrl, getDirectDownloadUrl, getAlternativePdfEmbedUrl } from "../lib/driveUtils";
import { initAuth, googleSignIn, getAccessToken } from "../lib/googleAuth";
import { uploadFileToDrive, uploadFileToDriveWithToken } from "../lib/driveUpload";
import { fetchWithRetry } from "../lib/fetchWithRetry";
import { Toast } from "../components/Toast";
import { getLocalCache, setLocalCache, clearStudentCaches } from "../lib/firestoreUtils";
import { saveFinalGrade } from "../lib/supabaseSync";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { generateStudentRaporPdf } from "../lib/studentReportPdf";

export function handleOpenFileLink(rawUrl: string, e?: React.MouseEvent) {
  if (e) {
    e.preventDefault();
  }
  if (!rawUrl) return;
  const trimmed = rawUrl.trim();

  // Handle base64 Data URLs (PDF, Image, etc) which iOS Safari blocks when opened directly via target="_blank"
  if (trimmed.startsWith("data:")) {
    try {
      const parts = trimmed.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      
      const newWin = window.open(blobUrl, "_blank");
      if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.warn("Error opening data URL:", err);
      const a = document.createElement("a");
      a.href = trimmed;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return;
  }

  // Standard http/https URLs or plain domain URLs
  const hrefUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  // Try window.open first with noopener,noreferrer
  const win = window.open(hrefUrl, "_blank", "noopener,noreferrer");
  if (!win || win.closed || typeof win.closed === "undefined") {
    // Fallback dynamic link click for iOS Safari iframe / popup blockers
    const a = document.createElement("a");
    a.href = hrefUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export function getPreviewEmbedUrl(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;

  // Google Drive File (/file/d/FILE_ID)
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  // Google Drive open?id=FILE_ID
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes("drive.google.com") && driveIdMatch && driveIdMatch[1]) {
    return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
  }

  // Google Docs
  const docsMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch && docsMatch[1]) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;
  }

  // Google Sheets
  const sheetsMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch && sheetsMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
  }

  // Google Slides
  const slidesMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch && slidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false`;
  }

  // YouTube
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]+)/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  return trimmed;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}


function dispatchIfQuotaError(e: any) {
  const msg = e && e.message ? e.message.toLowerCase() : String(e).toLowerCase();
  if (msg.includes('quota') || msg.includes('resource-exhausted') || msg.includes('exceeded')) {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
      detail: {
        message: "Batas kuota pembacaan harian Firebase (Free Tier) telah tercapai untuk hari ini. Kuota akan direset otomatis pada hari berikutnya, atau Anda dapat menaikkan paket/billing database di Firebase Console."
      }
    }));
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  if (errInfo.error && errInfo.error.toLowerCase().includes("quota")) {
    console.warn("Firestore Quota Exceeded:", errInfo.path);
    dispatchIfQuotaError(errInfo.error);
    return;
  }
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper for session usage tracking
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

// Helper to get name initials for profile avatar
const getInitials = (name?: any) => {
  if (!name || typeof name !== "string") return "S";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const first = parts[0].charAt(0) || "";
    const second = parts[1].charAt(0) || "";
    return (first + second).toUpperCase() || "S";
  }
  if (parts.length >= 1 && parts[0]) {
    return (parts[0].charAt(0) || "S").toUpperCase();
  }
  return "S";
};
import {
  LayoutDashboard,
  Home,
  BarChart3,
  MonitorPlay,
  TrendingUp,
  Trophy,
  ChevronDown,
  Calendar,
  LineChart,
  FileEdit,
  FileText,
  Award,
  BookOpen, GraduationCap,
  LogOut, Power,
  Menu,
  X,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Bell,
  ClipboardList,
  Timer,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Volume2,
  AlertOctagon,
  Info,
  RotateCcw,
  RefreshCw,
  Trash2,
  MessageSquare,
  MessageCircle,
  Send,
  Link,
  Search,
  Camera,
  Quote,
  Phone,
  MapPin,
  Moon,
  Globe2,
  Gamepad2,
  Target,
  Lightbulb,
  AlignLeft,
  ShieldCheck,
  ShieldAlert,
  Flag,
  AlertTriangle,
  Check,
  ArrowLeft,
  Monitor as MonitorIcon,
  Lock as LockIcon,
  Edit3,
  Users,
  Building2,
  Activity,
  HeartPulse,
  ChevronUp,
  Sliders,
  Hourglass,
  Download,
  Filter,
  Star,
  CheckSquare,
  History,
  Maximize2,
  MoreVertical,
  ExternalLink,
  Upload,
  CheckCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  Clipboard,
  Image as ImageIcon,
  Plus,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Layers,
  FileSearch,
  XCircle,
  Video,
  Smile,
  Paperclip,
  Mic,
  CheckCheck,
  Battery,
  Wifi,
  Play,
} from "lucide-react";
const AiChatModal = React.lazy(() =>
  import("../components/student/AiChatModal").then((m) => ({ default: m.AiChatModal }))
);

const SimulasiChapterMenu = React.lazy(() =>
  import("../components/simulation/SimulasiChapterMenu").then((m) => ({ default: m.SimulasiChapterMenu }))
);
import { motion, AnimatePresence } from "motion/react";
import { NotificationModal } from "../components/NotificationModal";
import { AttendanceDonutChart } from "../components/AttendanceDonutChart";
import { isAssignmentForClass, isExamForClass, isPTSItem, isPASItem, isSameNisn } from "../lib/gradeUtils";

const MOCK_EXAMS = [
  {
    id: "ujian-sejarah-01",
    title: "Latihan Ujian PAT Sejarah Indonesia",
    subject: "Sejarah Indonesia",
    category: "Pilihan Ganda",
    duration: 900, // 15 menit dalam detik
    kkm: 75,
    questions: [
      {
        text: "Siapakah tokoh yang membacakan teks proklamasi kemerdekaan Republik Indonesia pada tanggal 17 Agustus 1945?",
        options: [
          "Drs. Moh. Hatta",
          "Ir. Soekarno",
          "Sutan Syahrir",
          "Achmad Soebardjo",
          "Sayuti Melik"
        ],
        correctIndex: 1
      },
      {
        text: "Pertempuran Ambarawa yang dipimpin oleh Letkol Isdiman kemudian dilanjutkan oleh Kolonel Sudirman menorehkan kemenangan heroik yang diperingati sebagai hari...",
        options: [
          "Kesaktian Pancasila",
          "Hari Ibu",
          "Hari Juang Kartika (TNI AD)",
          "Hari Pahlawan",
          "Hari Kebangkitan Nasional"
        ],
        correctIndex: 2
      },
      {
        text: "Perjanjian pertama antara Indonesia dan Belanda setelah proklamasi kemerdekaan untuk membahas status kedaulatan diadakan di...",
        options: [
          "Perjanjian Linggajati",
          "Perjanjian Renville",
          "Perjanjian Roem-Royen",
          "Konferensi Meja Bundar",
          "Perjanjian Salatiga"
        ],
        correctIndex: 0
      },
      {
        text: "Tokoh pemuda yang merumuskan naskah proklamasi dengan mengetik teks yang telah ditulis tangan oleh Bung Karno adalah...",
        options: [
          "Sukarni",
          "B.M. Diah",
          "Sayuti Melik",
          "Radjiman Wedyodiningrat",
          "Wikana"
        ],
        correctIndex: 2
      },
      {
        text: "Belanda secara resmi mengakui kedaulatan Republik Indonesia Serikat (RIS) pada tanggal 27 Desember 1949 melalui kesepakatan...",
        options: [
          "Perjanjian Renville",
          "Konferensi Meja Bundar (KMB)",
          "Perjanjian Roem-Royen",
          "Perundingan Kaliurang",
          "Perjanjian Linggajati"
        ],
        correctIndex: 1
      }
    ]
  },
  {
    id: "ujian-matematika-01",
    title: "Ulangan Harian Matematika Wajib",
    subject: "Matematika",
    category: "Pilihan Ganda",
    duration: 900,
    kkm: 78,
    questions: [
      {
        text: "Turunan pertama dari fungsi f(x) = 3x^2 - 5x + 7 adalah f'(x) = ...",
        options: [
          "6x + 5",
          "6x - 5",
          "3x - 5",
          "6x^2 - 5",
          "6x"
        ],
        correctIndex: 1
      },
      {
        text: "Jika f(x) = (2x - 3)(x + 4), nilai turunan f'(1) adalah...",
        options: [
          "7",
          "9",
          "11",
          "13",
          "15"
        ],
        correctIndex: 1
      },
      {
        text: "Titik stasioner dari fungsi f(x) = x^2 - 4x + 5 adalah...",
        options: [
          "x = -2",
          "x = 0",
          "x = 1",
          "x = 2",
          "x = 4"
        ],
        correctIndex: 3
      },
      {
        text: "Nilai minimum fungsi f(x) = x^2 - 6x + 8 pada interval [0, 5] adalah...",
        options: [
          "8",
          "3",
          "0",
          "-1",
          "-2"
        ],
        correctIndex: 3
      },
      {
        text: "Turunan pertama dari f(x) = 2x^3 adalah f'(x) = ...",
        options: [
          "6x^2",
          "5x^2",
          "6x",
          "3x^2",
          "2x^2"
        ],
        correctIndex: 0
      }
    ]
  },
  {
    id: "ujian-inggris-01",
    title: "Ujian Simulasi UTBK SBMPTN (Literasi Bahasa Inggris)",
    subject: "Bahasa Inggris",
    category: "Pilihan Ganda",
    duration: 900,
    kkm: 75,
    questions: [
      {
        text: "Choose the synonym of the word 'Meticulous' commonly used in descriptive academic texts:",
        options: [
          "Careless",
          "Haphazard",
          "Extremely precise and careful",
          "Indifferent",
          "Sluggish"
        ],
        correctIndex: 2
      },
      {
        text: "What is the primary purpose of an Analytical Exposition text?",
        options: [
          "To retell a past historical event",
          "To entertain the readers with a fantasy story",
          "To persuade the listener/audience that something is the case",
          "To describe a specific person or place in physical details",
          "To explain how to make a cup of tea"
        ],
        correctIndex: 2
      },
      {
        text: "Find the correct passive voice of the sentence: 'The teacher evaluates the student grades regularly.'",
        options: [
          "The student grades were evaluated by the teacher regularly.",
          "The student grades are evaluated by the teacher regularly.",
          "The student grades evaluates by the teacher regularly.",
          "The teacher are evaluated by the student grades regularly.",
          "The student grades has been evaluated by the teacher regularly."
        ],
        correctIndex: 1
      },
      {
        text: "Which connector is best suited to show a contrast between two sentences?",
        options: [
          "Furthermore",
          "Therefore",
          "Consequently",
          "However",
          "In addition"
        ],
        correctIndex: 3
      },
      {
        text: "If you had prepared well for the exam, you would have passed it easily. What does this conditional sentence mean?",
        options: [
          "You prepared well and you passed.",
          "You didn't prepare well but you passed anyway.",
          "You didn't prepare well, so you did not pass the exam.",
          "You will prepare well in the future.",
          "You are preparing well right now."
        ],
        correctIndex: 2
      }
    ]
  }
];

const EMPTY_ARRAY: any[] = [];

const compressImageToFile = async (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.7): Promise<File> => {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
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
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const SevenSegmentClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-[#85cc00] font-mono rounded-xl border border-[#85cc00]/40 shadow-inner tracking-widest text-xs sm:text-sm font-black select-none">
      <div className="w-2 h-2 rounded-full bg-[#85cc00] animate-pulse"></div>
      <span>{hours}:{minutes}:{seconds}</span>
    </div>
  );
};

export default function DashboardStudent() {
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

  const showAlert = (
    title: string,
    message: string,
    type: "alert" | "danger" = "alert",
  ) => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  const [onlineStatus, setOnlineStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deviceBattery, setDeviceBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [networkType, setNetworkType] = useState<string>("4G / WiFi");

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      setNetworkType(conn.effectiveType ? conn.effectiveType.toUpperCase() : "4G");
    }
    if (navigator && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setDeviceBattery({ level: Math.round(battery.level * 100), charging: battery.charging });
        battery.addEventListener('levelchange', () => {
          setDeviceBattery({ level: Math.round(battery.level * 100), charging: battery.charging });
        });
        battery.addEventListener('chargingchange', () => {
          setDeviceBattery({ level: Math.round(battery.level * 100), charging: battery.charging });
        });
      }).catch(() => {
        setDeviceBattery({ level: 92, charging: true });
      });
    } else {
      setDeviceBattery({ level: 95, charging: true });
    }

    const handleQuotaExceeded = () => {
      console.warn("Firestore quota notice: data is served smoothly via Supabase");
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded as EventListener);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

  const location = useLocation();
  const navigate = useNavigate();
  const [needsDriveAuth, setNeedsDriveAuth] = useState(true);
  const [isDriveAuthLoading, setIsDriveAuthLoading] = useState(false);
  
  const [student, setStudent] = useState(() => {
    if (location.state?.student) {
      const s = location.state.student;
      try {
        localStorage.setItem("current_student", JSON.stringify(s));
      } catch (e) {
        console.warn("Storage quota notice on current_student:", e);
      }
      return s;
    }
    const saved = localStorage.getItem("current_student");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!student) {
      navigate("/", { replace: true });
    }
  }, [student, navigate]);

  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const isFirstAssignmentsRun = useRef(true);
  const [newAssignmentToast, setNewAssignmentToast] = useState<any | null>(null);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    // Add a small delay to ensure everything is ready and prevent "muter-muter" feeling
    const timer = setTimeout(() => {
      setIsLoadingInitialData(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const [simConfig, setSimConfig] = useState<any>(null);
  const studentData = student;
  useEffect(() => {
    if (!student?.kelas) return;
    let isMounted = true;
    const docRef = doc(db, "config", "simulasiBK");

    // Load config via getDoc (handles Supabase primary & local cache)
    getDoc(docRef).then((snap: any) => {
      if (!isMounted) return;
      if (snap && snap.exists()) {
        const data = snap.data();
        const activeClasses = data.activeClasses || [];
        const classConfigs = data.classConfigs || {};
        const isEnabled = activeClasses.includes(student.kelas);
        setIsSimulasiEnabled(isEnabled);
        if (isEnabled && classConfigs[student.kelas]) {
          setSimConfig(classConfigs[student.kelas]);
        } else {
          setSimConfig({ active: isEnabled, chapters: ["dekomposisi", "pola", "abstraksi", "algoritma", "classic_sim", "modul_kuis"] });
        }
      } else {
        setIsSimulasiEnabled(false);
        setSimConfig(null);
      }
    }).catch((err) => {
      console.warn("Failed loading simulasiBK config:", err);
    });

    if (isFirebaseQuotaExhausted()) return;

    let unsubscribe: any = null;
    import("firebase/firestore").then(({ onSnapshot }) => {
      if (!isMounted) return;
      unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (!isMounted) return;
          if (snap.exists()) {
            const data = snap.data();
            const activeClasses = data.activeClasses || [];
            const classConfigs = data.classConfigs || {};
            const isEnabled = activeClasses.includes(student.kelas);
            setIsSimulasiEnabled(isEnabled);
            if (isEnabled && classConfigs[student.kelas]) {
              setSimConfig(classConfigs[student.kelas]);
            } else {
              setSimConfig({ active: isEnabled, chapters: ["dekomposisi", "pola", "abstraksi", "algoritma", "classic_sim", "modul_kuis"] });
            }
          } else {
            setIsSimulasiEnabled(false);
            setSimConfig(null);
          }
        },
        (error) => {
          console.warn("Snapshot error fetching simulasiBK config:", error);
          dispatchIfQuotaError(error);
        }
      );
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [student?.kelas]);


  const saveSafeExamState = (nisn: string | undefined, stateToSave: any) => {
    if (!nisn) return;
    const key = `exam_state_${nisn}`;
    try {
      let serialized = JSON.stringify(stateToSave);
      // If exam questions contain large embedded base64 images, strip bulky data URLs
      // from the backup copy so localStorage never hits QuotaExceededError
      if (serialized.length > 350_000 && stateToSave?.activeExam) {
        const sanitizedQuestions = Array.isArray(stateToSave.activeExam.questions)
          ? stateToSave.activeExam.questions.map((q: any) => ({
              ...q,
              imageUrl:
                typeof q?.imageUrl === "string" && q.imageUrl.startsWith("data:") && q.imageUrl.length > 2000
                  ? ""
                  : q?.imageUrl,
            }))
          : stateToSave.activeExam.questions;
        serialized = JSON.stringify({
          ...stateToSave,
          activeExam: {
            ...stateToSave.activeExam,
            questions: sanitizedQuestions,
          },
        });
      }
      try {
        localStorage.setItem(key, serialized);
      } catch {
        console.warn("Storage quota exceeded on exam_state, clearing student caches and retrying...");
        clearStudentCaches();
        try {
          localStorage.setItem(key, serialized);
        } catch {
          try {
            sessionStorage.setItem(key, serialized);
          } catch {
            // ignore sessionStorage failure
          }
        }
      }
    } catch (err) {
      console.warn("Could not serialize exam state:", err);
    }
  };

  const getSafeExamState = (nisn: string | undefined) => {
    if (!nisn) return null;
    const key = `exam_state_${nisn}`;
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("Could not read exam state:", err);
      return null;
    }
  };

  const removeSafeExamState = (nisn: string | undefined) => {
    if (!nisn) return;
    const key = `exam_state_${nisn}`;
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    try {
      sessionStorage.removeItem(key);
    } catch (_) {}
  };

  const getSavedExamSession = () => {
    if (!student?.nisn) return null;
    const saved = getSafeExamState(student.nisn);
    if (saved && saved.activeExam && !saved.examResult) {
      return saved;
    }
    return null;
  };
  
  const savedExamSession = useMemo(() => getSavedExamSession(), [student?.nisn]);

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isSimulasiEnabled, setIsSimulasiEnabled] = useState(false);
  useEffect(() => {
    if (!isSimulasiEnabled && activeMenu === "simulasi") {
      setActiveMenu("dashboard");
    }
  }, [isSimulasiEnabled, activeMenu]);

  const [selectedSubject, setSelectedSubject] = useState("Informatika");
  const [taskFilter, setTaskFilter] = useState<"semua" | "selesai" | "belum_dikerjakan" | "ditolak">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleTasksCount, setVisibleTasksCount] = useState(5);
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);
  const [viewingTugas, setViewingTugas] = useState<any>(null);
  const [isFullscreenTugasModal, setIsFullscreenTugasModal] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const [direction, setDirection] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State for profile photo editing
  const [isEditing, setIsEditing] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPhotoWarning, setShowPhotoWarning] = useState(false);

  useEffect(() => {
    // Check if student exists and doesn't have a profilePhotoUrl
    if (student && !student.profilePhotoUrl) {
      // Show warning after a short delay (e.g., 2 seconds after initial load)
      const initialDelay = setTimeout(() => {
        setShowPhotoWarning(true);
      }, 2000);
      
      return () => clearTimeout(initialDelay);
    } else {
      setShowPhotoWarning(false);
    }
  }, [student?.profilePhotoUrl]);

  useEffect(() => {
    if (showPhotoWarning) {
      const hideTimer = setTimeout(() => {
        setShowPhotoWarning(false);
      }, 10000);
      return () => clearTimeout(hideTimer);
    }
  }, [showPhotoWarning]);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (!studentData?.id) return;
    const cacheKey = `firas_student_profile_${studentData.id}`;
    const cached = getLocalCache<any>(cacheKey, 60 * 60 * 1000);
    if (cached) {
      setStudent(cached);
      return;
    }
    const targetNisn = studentData.nisn || (studentData.id && !studentData.id.startsWith("IF") ? studentData.id : null);
    if (!targetNisn) return;

    const studentDoc = doc(db, "studentsByNisn", targetNisn);
    getDoc(studentDoc).then((snapshot) => {
      if (snapshot.exists()) {
        const fullData = { id: snapshot.id, ...snapshot.data() };
        setStudent(fullData);
        setLocalCache(cacheKey, fullData);
      }
    }).catch((error) => { console.warn('Firestore error:', error.message); dispatchIfQuotaError(error); });
  }, [studentData?.id, studentData?.nisn]);

  // Track online/offline status efficiently (once per session to avoid write quota burn)
  useEffect(() => {
    const targetNisn = studentData?.nisn || (studentData?.id && !studentData?.id.startsWith("IF") ? studentData?.id : null);
    if (!targetNisn) return;

    const lastPresence = Number(sessionStorage.getItem("firas_presence_time") || 0);
    // Only update presence once every 60 minutes per session
    if (Date.now() - lastPresence < 60 * 60 * 1000) return;

    const updatePresence = async () => {
      try {
        await setDoc(
          doc(db, "studentsByNisn", targetNisn),
          { lastActive: new Date().toISOString() },
          { merge: true }
        );
        sessionStorage.setItem("firas_presence_time", String(Date.now()));
        trackUsage(0, 1);
      } catch (err) {
        console.warn("Gagal memperbarui status online:", err);
      }
    };

    updatePresence();
  }, [studentData?.id]);

  useEffect(() => {
    if (!student?.kelas) return;
    
    // Only fetch absensi for student's own class with TTL cache to save 95% reads
    const cacheKey = `firas_cache_absensi_${student.kelas}`;
    const cached = getLocalCache<any[]>(cacheKey, 2 * 60 * 60 * 1000);
    if (cached) {
      setAbsensiList(cached);
      return;
    }

    const q = query(collection(db, "absensi"), where("kelasRef", "==", student.kelas));
    getDocs(q).then((snapshot) => {
      const abs: any[] = [];
      snapshot.forEach((doc) => {
        abs.push({ id: doc.id, ...doc.data() });
      });
      setAbsensiList(abs);
      setLocalCache(cacheKey, abs);
    }).catch((error) => { console.warn('Firestore error:', error.message); dispatchIfQuotaError(error); });
  }, [student?.kelas]);

  const [chaptersList, setChaptersList] = useState<any[]>([]);

  useEffect(() => {
    const cacheKey = 'firas_cache_chapters';
    const cached = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
    if (cached) {
      setChaptersList(cached);
      return;
    }
    getDocs(collection(db, 'chapters')).then((snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setChaptersList(list);
      setLocalCache(cacheKey, list);
    }).catch((error) => { console.warn('Firestore error:', error.message); dispatchIfQuotaError(error); });
  }, []);

  const handleMenuChange = (id: string, index: number) => {
    setIsSchoolInfoOpen(false);
    setIsGradedInfoOpen(false);
    const currentIndex = menus.findIndex((m) => m.id === activeMenu);
    setDirection(index > currentIndex ? 1 : -1);
    setActiveMenu(id);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    const targetNisn = studentData?.nisn || (studentData?.id && !studentData?.id.startsWith("IF") ? studentData?.id : null);
    if (targetNisn) {
      // Fire and forget Firestore update so slow or offline connections do not block the logout flow
      setDoc(
        doc(db, "studentsByNisn", targetNisn),
        { lastActive: null },
        { merge: true }
      ).catch((e) => {
        console.warn("Gagal membersihkan status online saat logout:", e);
      });
      try {
        trackUsage(0, 1);
      } catch (e) { console.warn("Error parsing stored data:", e); }
    }
    localStorage.removeItem("current_student");
    navigate("/", { replace: true });
  };
  
  const [tokenInput, setTokenInput] = useState("");
  const [selectedExamForToken, setSelectedExamForToken] = useState<any | null>(null);
  const [examTokenError, setExamTokenError] = useState("");
  
  // Custom dialogs/toasts for quick dashboard links
  const [isSchoolInfoOpen, setIsSchoolInfoOpen] = useState(false);
  const [isGradedInfoOpen, setIsGradedInfoOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState("");
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState("Sukses adalah hasil dari persiapan, kerja keras, dan belajar dari kegagalan.");
  const [academicPeriod, setAcademicPeriod] = useState({ academicYear: "2026/2027", semester: "Ganjil" });
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem("sipinter_teacher_photo_cache");
    } catch {
      return null;
    }
  });
  const [teacherProfileSettings, setTeacherProfileSettings] = useState<{
    subjectName?: string;
    teacherName?: string;
    teacherNip?: string;
    principalName?: string;
    principalNip?: string;
    academicYear?: string;
    semester?: string;
    updatedAt?: string;
  }>(() => {
    try {
      const raw =
        localStorage.getItem("sipinter_teacher_settings_cache") ||
        localStorage.getItem("sipinter_teacher_user_settings");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const teacherProfileSettingsRef = useRef(teacherProfileSettings);
  useEffect(() => {
    teacherProfileSettingsRef.current = teacherProfileSettings;
  }, [teacherProfileSettings]);

  const mergeTeacherSettingsPatch = (d: any) => {
    if (!d || typeof d !== "object") return teacherProfileSettingsRef.current;

    const currentUpdatedAt = teacherProfileSettingsRef.current.updatedAt
      ? new Date(teacherProfileSettingsRef.current.updatedAt).getTime()
      : 0;
    const incomingUpdatedAt = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    if (currentUpdatedAt > 0 && incomingUpdatedAt > 0 && incomingUpdatedAt < currentUpdatedAt) {
      return teacherProfileSettingsRef.current;
    }

    const patch: Record<string, string> = {};
    if (d.subjectName) patch.subjectName = String(d.subjectName);
    if (d.teacherName) patch.teacherName = String(d.teacherName);
    if (d.teacherNip) patch.teacherNip = String(d.teacherNip);
    if (d.principalName) patch.principalName = String(d.principalName);
    if (d.principalNip) patch.principalNip = String(d.principalNip);
    if (d.academicYear) patch.academicYear = String(d.academicYear);
    if (d.semester) patch.semester = String(d.semester);
    if (d.updatedAt) patch.updatedAt = String(d.updatedAt);

    if (Object.keys(patch).length === 0) return teacherProfileSettingsRef.current;

    const merged = { ...teacherProfileSettingsRef.current, ...patch };
    teacherProfileSettingsRef.current = merged;
    setTeacherProfileSettings(merged);
    try {
      localStorage.setItem("sipinter_teacher_settings_cache", JSON.stringify(merged));
    } catch (_) {}
    return merged;
  };

  const fetchLatestTeacherProfileSettings = async () => {
    let latestMerged = { ...teacherProfileSettingsRef.current };
    try {
      const [cfgSnap, periodSnap] = await Promise.all([
        getDoc(doc(db, "config", "teacher_profile")).catch(() => null),
        getDoc(doc(db, "config", "academic_period")).catch(() => null),
      ]);

      if (cfgSnap && cfgSnap.exists && cfgSnap.exists()) {
        const cfgData = cfgSnap.data();
        if (cfgData?.profilePhotoUrl) {
          setTeacherPhotoUrl(cfgData.profilePhotoUrl);
          try {
            localStorage.setItem("sipinter_teacher_photo_cache", cfgData.profilePhotoUrl);
          } catch (_) {}
        }
        latestMerged = mergeTeacherSettingsPatch(cfgData);
      }

      if (periodSnap && periodSnap.exists && periodSnap.exists()) {
        const pData = periodSnap.data();
        if (pData?.academicYear || pData?.semester) {
          setAcademicPeriod({
            academicYear: pData.academicYear || "2026/2027",
            semester: pData.semester || "Ganjil",
          });
          latestMerged = mergeTeacherSettingsPatch({
            academicYear: pData.academicYear,
            semester: pData.semester,
          });
        }
      }

      // Fallback langsung ke koleksi users jika config/teacher_profile belum terisi lengkap (misal guru belum buka ulang dashboard)
      if (!latestMerged.principalName || !latestMerged.teacherNip || !latestMerged.principalNip) {
        const defaultUserSnap = await getDoc(doc(db, "users", "default_teacher")).catch(() => null);
        if (defaultUserSnap && defaultUserSnap.exists && defaultUserSnap.exists() && defaultUserSnap.data()?.userSettings) {
          latestMerged = mergeTeacherSettingsPatch(defaultUserSnap.data().userSettings);
        } else {
          const usersSnap = await getDocs(collection(db, "users")).catch(() => null);
          if (usersSnap && !usersSnap.empty) {
            let foundSettings: any = null;
            usersSnap.forEach((uDoc: any) => {
              const uData = typeof uDoc.data === "function" ? uDoc.data() : uDoc;
              if (!foundSettings && uData?.userSettings && (uData.userSettings.principalName || uData.userSettings.teacherName)) {
                foundSettings = uData.userSettings;
              }
            });
            if (foundSettings) {
              latestMerged = mergeTeacherSettingsPatch(foundSettings);
            }
          }
        }
      }
    } catch (_) {}
    return latestMerged;
  };

  useEffect(() => {
    let isMounted = true;
    const applyTeacherProfile = (d: any) => {
      if (!isMounted || !d) return;
      if (d.profilePhotoUrl) {
        setTeacherPhotoUrl(d.profilePhotoUrl);
        try {
          localStorage.setItem("sipinter_teacher_photo_cache", d.profilePhotoUrl);
        } catch (_) {}
      } else if (d.profilePhotoUrl === null || d.profilePhotoUrl === "") {
        setTeacherPhotoUrl(null);
        try {
          localStorage.removeItem("sipinter_teacher_photo_cache");
        } catch (_) {}
      }
      mergeTeacherSettingsPatch(d);
    };

    const docRef = doc(db, "config", "motivational_quote");
    getDoc(docRef).then((snap: any) => {
      if (isMounted && snap && snap.exists() && snap.data()?.quote) {
        setMotivationalQuote(snap.data().quote);
      }
    }).catch(() => {});

    void fetchLatestTeacherProfileSettings();

    const periodDocRef = doc(db, "config", "academic_period");
    const teacherProfileDocRef = doc(db, "config", "teacher_profile");

    let unsubscribe: any = null;
    let unsubscribePeriod: any = null;
    let unsubscribeTeacherProfile: any = null;
    import("firebase/firestore").then(({ onSnapshot }) => {
      if (!isMounted) return;
      unsubscribe = onSnapshot(docRef, (snap: any) => {
        if (snap && snap.exists() && snap.data()?.quote) {
          setMotivationalQuote(snap.data().quote);
        }
      }, () => {});
      unsubscribePeriod = onSnapshot(periodDocRef, (snap: any) => {
        if (snap && snap.exists()) {
          const d = snap.data();
          if (d?.academicYear || d?.semester) {
            setAcademicPeriod({
              academicYear: d.academicYear || "2026/2027",
              semester: d.semester || "Ganjil",
            });
            mergeTeacherSettingsPatch({
              academicYear: d.academicYear,
              semester: d.semester,
            });
          }
        }
      }, () => {});
      unsubscribeTeacherProfile = onSnapshot(teacherProfileDocRef, (snap: any) => {
        if (snap && snap.exists()) {
          applyTeacherProfile(snap.data());
        }
      }, () => {});
    }).catch(() => {});

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (unsubscribePeriod) unsubscribePeriod();
      if (unsubscribeTeacherProfile) unsubscribeTeacherProfile();
    };
  }, []);

  const handleSyncData = async () => {
    if (isSyncingData) return;
    setIsSyncingData(true);
    try {
      if (student?.nisn) {
        clearStudentCaches(student.nisn, student?.kelas);
      }
      const syncTasks: Promise<any>[] = [fetchLatestTeacherProfileSettings()];
      if (typeof mutateAnnouncements === "function") syncTasks.push(Promise.resolve(mutateAnnouncements()));
      if (typeof mutateAssignments === "function") syncTasks.push(Promise.resolve(mutateAssignments()));
      if (typeof mutateSubmissions === "function") syncTasks.push(Promise.resolve(mutateSubmissions()));
      if (typeof mutateFinalGrades === "function") syncTasks.push(Promise.resolve(mutateFinalGrades()));
      if (typeof mutateAllStudents === "function") syncTasks.push(Promise.resolve(mutateAllStudents()));
      if (typeof mutateAllFinalGrades === "function") syncTasks.push(Promise.resolve(mutateAllFinalGrades()));
      if (typeof mutateExams === "function") syncTasks.push(Promise.resolve(mutateExams()));

      const minAnimationDelay = new Promise((resolve) => setTimeout(resolve, 900));
      const [results] = await Promise.all([Promise.allSettled(syncTasks), minAnimationDelay]);

      setIsSyncingData(false);
      if (results.length > 0 && results.every((r) => r.status === "rejected")) {
        showAlert("Gagal Sinkronisasi", "Gagal memperbarui data dari server. Periksa koneksi internet Anda.", "danger");
      } else {
        showAlert("Sinkronisasi Berhasil", "Semua data terbaru berhasil disinkronkan dengan server.", "alert");
      }
    } catch (err) {
      setIsSyncingData(false);
      showAlert("Gagal Sinkronisasi", "Gagal memperbarui data dari server.", "danger");
    }
  };

  // Profile edit form state variables
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Data Pribadi States
  const [isEditingPribadi, setIsEditingPribadi] = useState(false);
  const [editTempatLahir, setEditTempatLahir] = useState("");
  const [editTanggalLahir, setEditTanggalLahir] = useState("");
  const [editJenisKelamin, setEditJenisKelamin] = useState("");
  const [editAgama, setEditAgama] = useState("");
  const [editKewarganegaraan, setEditKewarganegaraan] = useState("");
  
  // Tentang Saya States
  const [isEditingTentang, setIsEditingTentang] = useState(false);
  const [editHobi, setEditHobi] = useState("");
  const [editCitaCita, setEditCitaCita] = useState("");
  const [editMotto, setEditMotto] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (student) {
      setEditName(student.displayName || student.name || "");
      setEditPhone(student.phoneNumber || "");
      setEditParentPhone(student.parentPhoneNumber || "");
      setEditAddress(student.alamat || "");
      setEditPhoto(student.profilePhotoUrl || "");
      
      setEditTempatLahir(student.tempatLahir || "");
      setEditTanggalLahir(student.tanggalLahir || "");
      setEditJenisKelamin(student.jenisKelamin || "");
      setEditAgama(student.agama || "");
      setEditKewarganegaraan(student.kewarganegaraan || "");
      
      setEditHobi(student.hobi || "");
      setEditCitaCita(student.citaCita || "");
      setEditMotto(student.motto || "");
      setEditDeskripsi(student.deskripsi || "");
    }
  }, [student]);

  const handleSaveProfileData = async (section: "pribadi" | "tentang" | "all") => {
    if (!student?.id) return;
    setIsSavingProfile(true);
    try {
      const updatedData: any = {};
      
      if (section === "pribadi" || section === "all") {
        updatedData.name = editName;
        updatedData.tempatLahir = editTempatLahir;
        updatedData.tanggalLahir = editTanggalLahir;
        updatedData.jenisKelamin = editJenisKelamin;
        updatedData.agama = editAgama;
        updatedData.kewarganegaraan = editKewarganegaraan;
      }
      
      if (section === "tentang" || section === "all") {
        updatedData.hobi = editHobi;
        updatedData.citaCita = editCitaCita;
        updatedData.motto = editMotto;
        updatedData.deskripsi = editDeskripsi;
      }

      await setDoc(doc(db, "studentsByNisn", student.id), updatedData, { merge: true });
      setStudent({ ...student, ...updatedData });
      setSyncToastMessage("Data profil berhasil diperbarui!");
      setTimeout(() => setSyncToastMessage(""), 3000);
      
      if (section === "pribadi") setIsEditingPribadi(false);
      if (section === "tentang") setIsEditingTentang(false);
    } catch (error) {
      console.warn("Gagal menyimpan profil:", error);
      alert("Gagal menyimpan profil. Silakan coba lagi.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // State for upload modal & multi-page scan
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [taskSubmitTab, setTaskSubmitTab] = useState<"drive" | "camera">("drive");
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  const [showDriveAuthNotice, setShowDriveAuthNotice] = useState(false);
  const [showDriveSuccessConnected, setShowDriveSuccessConnected] = useState(false);
  const [showJSONErrorExplain, setShowJSONErrorExplain] = useState(false);
  
  // Elegant Success Overlay State
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successTugasMateri, setSuccessTugasMateri] = useState<string>("");

  // Scanner helper functions (Image compression & Multi-page management)
  const compressScannedImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          // Optimal dimensions and quality to keep handwriting super sharp while keeping file under ~60-80KB to prevent upload hanging
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);
          }
          const compressed = canvas.toDataURL("image/jpeg", 0.72);
          resolve(compressed);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddScannedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingScan(true);
    setUploadMessage({ text: "Memproses gambar...", type: "warning" });
    try {
      const newPages: string[] = [];
      let hasVideoError = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Cek secara ketat agar tidak ada video yang lolos
        if (file.type.startsWith("video/") || file.name.toLowerCase().match(/\.(mp4|mov|avi|wmv|flv|mkv)$/)) {
          console.warn("Video ditolak:", file.name);
          hasVideoError = true;
          continue; // Lewati file video
        }

        // Allow empty type (some Android browsers) or any image type
        if (file.type.startsWith("image/") || file.type === "") {
          const compressed = await compressScannedImage(file);
          newPages.push(compressed);
        } else {
            console.warn("Tipe file tidak didukung:", file.type);
        }
      }
      
      if (hasVideoError) {
        setUploadMessage({
          text: "Format Video tidak diizinkan! Harap hanya memfoto lembar catatan.",
          type: "error",
        });
      } else if (newPages.length > 0) {
        setScannedPages((prev) => [...prev, ...newPages]);
        setUploadMessage({
          text: `✅ Berhasil menambahkan ${newPages.length} lembar catatan!`,
          type: "success",
        });
      } else {
        setUploadMessage({
          text: "Tidak ada gambar yang valid untuk diproses.",
          type: "error",
        });
      }
    } catch (err: any) {
      console.warn("Gagal memproses gambar catatan:", err);
      setUploadMessage({
        text: "Gagal memproses lembar catatan. Coba pilih foto lain.",
        type: "error",
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleRemoveScannedPage = (index: number) => {
    setScannedPages((prev) => prev.filter((_, i) => i !== index));
    if (previewModalIndex === index) {
      setPreviewModalIndex(null);
    }
  };

  const handleMoveScannedPage = (index: number, direction: "up" | "down") => {
    setScannedPages((prev) => {
      const updated = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  // No longer checking Google Drive auth for students as they submit via pasted links
  const [selectedTugas, setSelectedTugas] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Link Paste & Ref helper states
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteDialogText, setPasteDialogText] = useState("");

  const handlePasteClick = async () => {
    if (linkInputRef.current) {
      linkInputRef.current.focus();
    }

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSelectedFile(text.trim());
          setUploadMessage({ text: "Tautan berhasil ditempel!", type: "success" });
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard API readText blocked or permission denied:", err);
    }

    // Fallback if clipboard API is restricted by browser or iframe
    setPasteDialogText("");
    setShowPasteDialog(true);
  };

  // Link Access Checker State (Google Drive, CamScanner, Canva, OneDrive, Dropbox, Web)
  const [isCheckingDriveAccess, setIsCheckingDriveAccess] = useState<boolean>(false);
  const [driveAccessResult, setDriveAccessResult] = useState<{
    isDrive?: boolean;
    accessible: boolean;
    provider?: string;
    providerName?: string;
    message: string;
  } | null>(null);

  // Auto-detect link accessibility & provider permission when link changes
  useEffect(() => {
    if (!selectedFile || !selectedFile.trim() || !selectedFile.trim().startsWith("http")) {
      setDriveAccessResult(null);
      setIsCheckingDriveAccess(false);
      return;
    }

    const trimmedUrl = selectedFile.trim();

    setIsCheckingDriveAccess(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithRetry("/api/check-drive-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedUrl }),
        });
        const data = await res.json();
        setDriveAccessResult(data);
      } catch (err) {
        console.warn("Error checking link access:", err);
        setDriveAccessResult({
          accessible: true,
          providerName: "Tautan Web",
          message: "Periksa sambungan internet untuk verifikasi otomatis.",
        });
      } finally {
        setIsCheckingDriveAccess(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedFile]);
  
  // Profile Photo Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileLinkDisabled, setIsProfileLinkDisabled] = useState(false);
  
  // New State for Notifications Popup
  const [showNotifications, setShowNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [rubric, setRubric] = useState<any>({
    kehadiran: 20,
    tugas: 50,
    uts: 10,
    uas: 20,
  });

  // Fetch Grading Rubric from Firestore with cache
  useEffect(() => {
    const cacheKey = "firas_cache_rubric";
    const cached = getLocalCache<any>(cacheKey, 60 * 60 * 1000);
    if (cached) {
      setRubric(cached);
      return;
    }
    getDoc(doc(db, "config", "grading_rubric")).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const r = {
            kehadiran: Number(data.kehadiran) ?? 20,
            tugas: Number(data.tugas) ?? 50,
            uts: Number(data.uts) ?? 10,
            uas: Number(data.uas) ?? 20,
          };
          setRubric(r);
          setLocalCache(cacheKey, r);
        }
      }).catch((error) => { console.warn('Gagal mengambil rubrik:', error); dispatchIfQuotaError(error); });
  }, []);

  // Announcement interaction
  const [viewedAnnouncement, setViewedAnnouncement] = useState<any>(null);
  const announcementContentRef = useRef<HTMLDivElement>(null);

  // Load exam history from localStorage
  const [examHistoryList, setExamHistoryList] = useState<any[]>([]);

  // CBT Ujian Online States
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, number | string>>({});
  const [examFlags, setExamFlags] = useState<Record<number, boolean>>({});
  const [examTimer, setExamTimer] = useState<number>(0);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false);
  const [isQuestionNavOpen, setIsQuestionNavOpen] = useState<boolean>(window.innerWidth >= 1024);
  const [examFontSize, setExamFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [isViolationSirening, setIsViolationSirening] = useState<boolean>(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(true);
  const [examViolationCount, setExamViolationCount] = useState<number>(0);
  const [showExitWarningModal, setShowExitWarningModal] = useState<boolean>(false);
  const [pendingNavAction, setPendingNavAction] = useState<any>(null);
  const [unansweredWarningList, setUnansweredWarningList] = useState<number[] | null>(null);
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState<boolean>(false);
  const [zoomedQuestionImg, setZoomedQuestionImg] = useState<string | null>(null);
  const [isDownloadingRaporPdf, setIsDownloadingRaporPdf] = useState<boolean>(false);

  const isQuestionAnswered = (q: any, ans: any): boolean => {
    const qType = q?.type || "multiple_choice";
    if (qType === "multiple_choice") {
      return ans !== undefined && ans !== null && ans !== "" && typeof ans === "number";
    }
    return typeof ans === "string"
      ? ans.trim().length > 0
      : ans !== undefined && ans !== null && String(ans).trim().length > 0;
  };

  const handleTrySubmit = () => {
    if (!activeExam || !activeExam.questions) return;
    const unanswered: number[] = [];
    activeExam.questions.forEach((q: any, idx: number) => {
      if (!isQuestionAnswered(q, examAnswers[idx])) {
        unanswered.push(idx);
      }
    });
    if (unanswered.length > 0) {
      setUnansweredWarningList(unanswered);
    } else {
      setIsSubmitConfirmOpen(true);
    }
  };

  // WhatsApp Share Modal States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waParentPhone, setWaParentPhone] = useState("");
  const [waDraftMessage, setWaDraftMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(false);

  // Materials View States
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [materialsProgress, setMaterialsProgress] = useState<Record<string, any>>({});
  const [materiSearch, setMateriSearch] = useState("");
  const [materiTab, setMateriTab] = useState("semua"); // "semua", "bab", "favorit"
  const [isMateriFilterOpen, setIsMateriFilterOpen] = useState(false);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [activeMaterialPreview, setActiveMaterialPreview] = useState<any | null>(null);
  const [selectedInlineMaterial, setSelectedInlineMaterial] = useState<any | null>(null);
  const [materiViewerMode, setMateriViewerMode] = useState<"primary" | "compat">("primary");
  const inlineViewerRef = useRef<HTMLDivElement | null>(null);



  const [dismissedStatusDate, setDismissedStatusDate] = useState<string | null>(() => {
    const saved = localStorage.getItem("current_student");
    if (saved) {
      try {
        const studentObj = JSON.parse(saved);
        if (studentObj?.nisn) {
          return localStorage.getItem(`dismissed_status_date_${studentObj.nisn}`);
        }
      } catch (e) { console.warn("Error parsing stored data:", e); }
    }
    return null;
  });

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (student?.nisn) {
      setDismissedStatusDate(localStorage.getItem(`dismissed_status_date_${student.nisn}`));
    }
  }, [student?.nisn]);

  const handleDismissStatusBanner = (dateToDismiss: string) => {
    if (student?.nisn) {
      localStorage.setItem(`dismissed_status_date_${student.nisn}`, dateToDismiss);
      setDismissedStatusDate(dateToDismiss);
    }
  };

  const formattedToday = useMemo(() => {
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const d = new Date();
    const dayName = dayNames[d.getDay()];
    const dateNum = d.getDate();
    const monthName = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  }, []);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    const cacheKey = "firas_cache_materials";
    const cached = getLocalCache<any[]>(cacheKey, 4 * 60 * 60 * 1000);
    if (cached) {
      setMaterialsList(cached);
      return;
    }
    getDocs(collection(db, "materials")).then((snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      const sorted = list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setMaterialsList(sorted);
      setLocalCache(cacheKey, sorted);
    }).catch((error) => { dispatchIfQuotaError(error); handleFirestoreError(error, OperationType.LIST, "materials");
    });
  }, []);

  useEffect(() => {
    if (!student?.id) return;
    const cacheKey = `firas_cache_progress_${student.id}`;
    const cached = getLocalCache<Record<string, any>>(cacheKey, 1 * 60 * 60 * 1000);
    if (cached) {
      setMaterialsProgress(cached);
      return;
    }
    const q = query(collection(db, "material_progress"), where("studentId", "==", student.id));
    getDocs(q).then((snapshot) => {
      const progress: Record<string, any> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        progress[data.materialId] = { id: doc.id, ...data };
      });
      setMaterialsProgress(progress);
      setLocalCache(cacheKey, progress);
    }).catch((error) => { dispatchIfQuotaError(error); handleFirestoreError(error, OperationType.LIST, "material_progress");
    });
  }, [student?.id]);

  const handleToggleFavoriteMaterial = async (materialId: string) => {
    if (!student?.id) return;
    const progressId = `${student.id}_${materialId}`;
    const current = materialsProgress[materialId];
    try {
      await setDoc(doc(db, "material_progress", progressId), {
        studentId: student.id,
        materialId,
        isFavorite: !current?.isFavorite,
        status: current?.status || "Belum Dimulai",
        lastAccessed: new Date().toISOString()
      }, { merge: true });
      trackUsage(0, 1);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `material_progress/${progressId}`);
    }
  };

  const handleOpenMaterial = (materialId: string, driveUrl?: string, openInModal = false) => {
    // Find material in loaded list or construct basic item
    const foundMaterial = materialsList.find(m => m.id === materialId) || {
      id: materialId,
      driveUrl: driveUrl || "",
      title: "Materi Pembelajaran",
      bab: "Umum"
    };

    setMateriViewerMode("primary");
    if (openInModal || activeMenu !== "materi") {
      setActiveMaterialPreview(foundMaterial);
    } else {
      setSelectedInlineMaterial(foundMaterial);
      setTimeout(() => {
        inlineViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }

    if (!student?.id) return;
    const progressId = `${student.id}_${materialId}`;
    const current = materialsProgress[materialId];
    
    try {
      // Logic: Opening materi sets at least 40% initial progress, increments if already opened
      const currentPercentage = current?.percentage || 0;
      let nextPercentage = Math.max(currentPercentage, 40);
      if (currentPercentage >= 40 && currentPercentage < 100) {
        nextPercentage = Math.min(100, currentPercentage + 20);
      }
      
      let nextStatus = nextPercentage >= 100 ? "Selesai" : "Sedang Dipelajari";

      setMaterialsProgress((prev) => ({
        ...prev,
        [materialId]: {
          ...(prev[materialId] || {}),
          studentId: student.id,
          materialId,
          status: nextStatus,
          percentage: nextPercentage,
          lastAccessed: new Date().toISOString()
        }
      }));

      setDoc(doc(db, "material_progress", progressId), {
        studentId: student.id,
        materialId,
        status: nextStatus,
        percentage: nextPercentage,
        lastAccessed: new Date().toISOString()
      }, { merge: true }).catch((e) => {
        handleFirestoreError(e, OperationType.WRITE, `material_progress/${progressId}`);
      });

      trackUsage(0, 1);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `material_progress/${progressId}`);
    }
  };

  const handleCompleteMaterial = async (materialId: string) => {
    if (!student?.id) return;
    const progressId = `${student.id}_${materialId}`;
    try {
      setMaterialsProgress((prev) => ({
        ...prev,
        [materialId]: {
          ...(prev[materialId] || {}),
          studentId: student.id,
          materialId,
          status: "Selesai",
          percentage: 100,
          lastAccessed: new Date().toISOString()
        }
      }));

      await setDoc(doc(db, "material_progress", progressId), {
        studentId: student.id,
        materialId,
        status: "Selesai",
        percentage: 100,
        lastAccessed: new Date().toISOString()
      }, { merge: true });

      trackUsage(0, 1);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `material_progress/${progressId}`);
    }
  };

  const handleUpdateMaterialStatus = async (materialId: string, status: "Belum Dimulai" | "Sedang Dipelajari" | "Selesai") => {
    if (!student?.id) return;
    const progressId = `${student.id}_${materialId}`;
    try {
      const percentage = status === "Selesai" ? 100 : (status === "Sedang Dipelajari" ? (materialsProgress[materialId]?.percentage || 20) : 0);
      await setDoc(doc(db, "material_progress", progressId), {
        studentId: student.id,
        materialId,
        status,
        percentage: status === "Belum Dimulai" ? 0 : percentage,
        lastAccessed: new Date().toISOString()
      }, { merge: true });
      trackUsage(0, 1);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `material_progress/${progressId}`);
    }
  };

  const classMaterials = useMemo(() => {
    if (!student?.kelas) return materialsList;
    return materialsList.filter(m => !m.kelasRef || m.kelasRef === student.kelas);
  }, [materialsList, student?.kelas]);

  const materialStats = useMemo(() => {
    const total = classMaterials.length;
    const progressValues = Object.values(materialsProgress) as any[];
    const selesai = progressValues.filter(p => {
      const isClassMateri = classMaterials.some(m => m.id === p.materialId);
      return isClassMateri && p.status === "Selesai";
    }).length;
    const sedang = progressValues.filter(p => {
      const isClassMateri = classMaterials.some(m => m.id === p.materialId);
      return isClassMateri && p.status === "Sedang Dipelajari";
    }).length;
    const belum = total - selesai - sedang;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;
    
    return { total, selesai, sedang, belum, percentage };
  }, [classMaterials, materialsProgress]);

  const filteredMaterials = useMemo(() => {
    let list = [...classMaterials];
    
    if (materiTab === "favorit") {
      list = list.filter(m => materialsProgress[m.id]?.isFavorite);
    } else if (materiTab === "video") {
      list = list.filter(m => isYouTubeUrl(m.driveUrl));
    } else if (materiTab === "pdf") {
      list = list.filter(m => !isYouTubeUrl(m.driveUrl));
    }

    const q = materiSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(m =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.bab || "").toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [classMaterials, materiTab, materiSearch, materialsProgress]);

  const handleShareToWaParent = () => {
    if (!student) return;
    
    const stats = attendanceSummary || { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Dispen: 0, totalMeetings: 0, percentage: "0" };
    
    // Construct grades report
    const gradedItems = unifiedAcademicItems.filter(item => item.nilai !== "");
    const totalScore = gradedItems.reduce((acc, curr) => acc + Number(curr.nilai), 0);
    const avg = gradedItems.length > 0 ? (totalScore / gradedItems.length).toFixed(1) : "Belum ada Nilai";

    const gradesText = gradedItems.length > 0
      ? gradedItems.map(item => `• ${item.type} - ${item.title}: *${item.nilai}*`).join("\n")
      : "- Belum ada entri nilai tugas atau ujian";

    const text = `*LAPORAN PERKEMBANGAN BELAJAR SISWA*
*Portal Akademik SMAN Belajar*

Disampaikan Kepada Yth. Bapak/Ibu Orang Tua/Wali dari:
• *Nama Siswa:* ${student.displayName}
• *NIS:* ${student.nisn}
• *Kelas:* ${student.kelas}

*1. RINGKASAN KEHADIRAN (PRESENSI)*
• Total Hari Sekolah: ${stats.totalMeetings} Pertemuan
• Hadir: ${stats.Hadir} hari
• Sakit: ${stats.Sakit} hari
• Izin: ${stats.Izin} hari
• Alpa: ${stats.Alpa} hari
• Dispen: ${stats.Dispen} hari
• *Persentase Kehadiran:* *${stats.percentage}%*

*2. DETAIL NILAI TUGAS & UJIAN (CBT)*
${gradesText}

• *Rata-Rata Nilai (IPK):* *${avg}*

_Laporan dikirim secara mandiri oleh Siswa untuk berbagi progres belajar. Terima kasih atas dukungan dan doa Ayah/Bunda selalu._`;

    setWaDraftMessage(text);
    setWaParentPhone(student.parentPhone || "628"); // Pre-populate and allow edit
    setIsWaModalOpen(true);
    setCopiedIndex(false);
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncingResults, setIsSyncingResults] = useState(false);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncPendingResults = async () => {
    if (!student?.nisn || !isOnline || isSyncingResults) return;
    
    const syncKey = `pending_exam_sync_${student.nisn}`;
    const pending = JSON.parse(localStorage.getItem(syncKey) || "[]");
    if (pending.length === 0) return;

    setIsSyncingResults(true);
    const remaining = [];
    
    for (const result of pending) {
      try {
        const finalGradeRef = doc(db, "final_grades", `${result.examId}_${student.nisn}`);
        await setDoc(finalGradeRef, {
          ...result,
          assignmentId: result.examId,
          nisn: student.nisn,
          type: "exam",
        });
        trackUsage(0, 1);
      } catch (err) {
        console.warn("Gagal sinkronisasi nilai tertunda:", err);
        remaining.push(result);
      }
    }

    localStorage.setItem(syncKey, JSON.stringify(remaining));
    setIsSyncingResults(false);
  };

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (isOnline && student?.id) {
      syncPendingResults();
    }
  }, [isOnline, student?.id]);

  // Refs for audio / timer
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);
  const sirenTimeoutRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOsc1Ref = useRef<OscillatorNode | null>(null);
  const sirenOsc2Ref = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenIntervalRef = useRef<any>(null);
  const vibrationIntervalRef = useRef<any>(null);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (!student?.nisn) return;
    const historyKey = `ujian_history_${student.nisn}`;
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
      setExamHistoryList(stored);

      // Restore active exam if any
      const saved = getSafeExamState(student.nisn);
      if (saved && saved.activeExam && !saved.examResult) {
        setActiveExam(saved.activeExam);
        setCurrentQuestionIdx(saved.currentQuestionIdx || 0);
        setExamAnswers(saved.examAnswers || {});
        setExamFlags(saved.examFlags || {});
        setExamTimer(saved.examTimer);
        setExamViolationCount(saved.examViolationCount || 0);
      }
    } catch (e) {
      console.warn("Gagal memuat memory ujian:", e);
    }
  }, [student?.nisn]);

  // Sync CBT Exam state to local storage when active
  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (!student?.nisn || !activeExam || examResult) return;
    const stateToSave = {
      activeExam,
      currentQuestionIdx,
      examAnswers,
      examFlags,
      examTimer,
      examViolationCount,
    };
    saveSafeExamState(student.nisn, stateToSave);
  }, [activeExam, currentQuestionIdx, examAnswers, examFlags, examTimer, examResult, examViolationCount, student?.nisn]);

  const startSiren = () => {
    setExamViolationCount((prev) => {
      const updated = prev + 1;
      
      // Persist to storage safely
      if (student?.nisn && activeExam) {
        try {
          const parsed = getSafeExamState(student.nisn);
          if (parsed) {
            parsed.examViolationCount = updated;
            saveSafeExamState(student.nisn, parsed);
          }
        } catch (e) {
          console.warn("Gagal mengupdate storage exam_state:", e);
        }

        // Write directly to Firestore "final_grades" matching the teacher view as a Penalty / Pelanggaran
        const finalGradeRef = doc(db, "final_grades", `${activeExam.id}_${student.nisn}`);
        setDoc(finalGradeRef, {
          examId: activeExam.id,
          assignmentId: activeExam.id,
          examTitle: activeExam.title,
          subject: activeExam.subject,
          bab: activeExam.bab || "",
          violationCount: updated,
          violationsCount: updated,
          nisn: student.nisn || "",
          type: "exam",
          status: "melanggar", // mark status as violation / melanggar
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => {
          console.warn("Gagal mencatat penalti pelanggaran ke Firestore:", err);
        });

        // Update Live Proctoring session
        const sessionRef = doc(db, "exam_sessions", `${activeExam.id}_${student.nisn}`);
        setDoc(sessionRef, {
          examId: activeExam.id,
          examTitle: activeExam.title || "",
          nisn: student.nisn || "",
          studentName: student.displayName || student.studentName || student.name || "",
          kelas: student.kelas || "",
          status: "melanggar",
          violationCount: updated,
          lastViolationReason: "Terdeteksi keluar tab / layar penuh",
          lastActiveAt: new Date().toISOString(),
        }, { merge: true }).catch((err) => {
          console.warn("Gagal mencatat status proctoring:", err);
        });
      }

      return updated;
    });
    try {
      if (sirenIntervalRef.current) return;

      if (sirenTimeoutRef.current) {
        clearTimeout(sirenTimeoutRef.current);
        sirenTimeoutRef.current = null;
      }

      // Aktifkan getaran fisik berulang ekstrem untuk perangkat smartphone guna menerobos setting volume 0/senyap
      if (navigator.vibrate) {
        navigator.vibrate([1000, 300, 1000, 300, 1000]);
        vibrationIntervalRef.current = setInterval(() => {
          if (navigator.vibrate) {
            navigator.vibrate([1000, 300, 1000]);
          }
        }, 2500);
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      const gainNode = ctx.createGain();
      // Meningkatkan gain dari 5.0 ke 8.0 (800% kekuatan sinyal) agar suara sirine terdengar sangat lantang dan bising
      gainNode.gain.setValueAtTime(8.0, ctx.currentTime);
      gainNode.connect(ctx.destination);
      sirenGainRef.current = gainNode;

      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.connect(gainNode);
      osc1.start();
      sirenOsc1Ref.current = osc1;

      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(1200, ctx.currentTime);
      osc2.connect(gainNode);
      osc2.start();
      sirenOsc2Ref.current = osc2;

      let pitchState = false;
      sirenIntervalRef.current = setInterval(() => {
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        if (pitchState) {
          osc1.frequency.setValueAtTime(600, now);
          osc2.frequency.setValueAtTime(900, now);
        } else {
          osc1.frequency.setValueAtTime(1100, now);
          osc2.frequency.setValueAtTime(1400, now);
        }
        pitchState = !pitchState;
      }, 200);

      sirenTimeoutRef.current = setTimeout(() => {
        stopSiren();
        setIsViolationSirening(false);
      }, 5000);

    } catch (err) {
      console.warn("Gagal memulai sirine:", err);
    }
  };

  const stopSiren = () => {
    try {
      if (sirenTimeoutRef.current) {
        clearTimeout(sirenTimeoutRef.current);
        sirenTimeoutRef.current = null;
      }
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0); // Matikan semua getaran bising
      }
      if (sirenOsc1Ref.current) {
        sirenOsc1Ref.current.stop();
        sirenOsc1Ref.current.disconnect();
        sirenOsc1Ref.current = null;
      }
      if (sirenOsc2Ref.current) {
        sirenOsc2Ref.current.stop();
        sirenOsc2Ref.current.disconnect();
        sirenOsc2Ref.current = null;
      }
      if (sirenGainRef.current) {
        sirenGainRef.current.disconnect();
        sirenGainRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) { console.warn("Error parsing stored data:", e); }
  };

  const handleStartExam = (exam: any) => {
    setActiveExam(exam);
    setCurrentQuestionIdx(0);
    setExamAnswers({});
    setExamFlags({});
    setExamTimer(exam.duration);
    setExamResult(null);
    setExamViolationCount(0);
    setIsFullscreenActive(true);

    if (student?.nisn && exam?.id) {
      const nowIso = new Date().toISOString();
      setDoc(
        doc(db, "exam_sessions", `${exam.id}_${student.nisn}`),
        {
          examId: exam.id,
          examTitle: exam.title || "",
          nisn: student.nisn || "",
          studentName: student.displayName || student.studentName || student.name || "",
          kelas: student.kelas || "",
          status: "mengerjakan",
          answeredCount: 0,
          totalQuestions: exam.questions?.length || 0,
          currentQuestion: 1,
          violationCount: 0,
          startedAt: nowIso,
          lastActiveAt: nowIso,
        },
        { merge: true }
      ).catch((err) => console.warn("Gagal menginisialisasi sesi proctoring:", err));
    }
    
    // Request Fullscreen Mode automatically
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch((err) => console.log("Layar penuh ditolak:", err));
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
  };

  const handleAttemptStartExam = (exam: any) => {
    if (exam.token) {
      setSelectedExamForToken(exam);
      setTokenInput("");
      setExamTokenError("");
    } else {
      handleStartExam(exam);
    }
  };

  const handleVerifyExamToken = () => {
    if (!selectedExamForToken) return;
    if (tokenInput.trim().toUpperCase() === (selectedExamForToken?.token || "").toString().trim().toUpperCase()) {
      const examToStart = selectedExamForToken;
      setSelectedExamForToken(null);
      handleStartExam(examToStart);
    } else {
      setExamTokenError("Token ujian salah. Silakan minta pada Guru pengawas.");
    }
  };

  const handleStartRemedialExam = (exam: any) => {
    // Hapus backup state ujian agar pengerjaan remedial dimulai dari awal secara bersih
    removeSafeExamState(student?.nisn);
    
    if (student?.nisn) {
      const updatedHistory = examHistoryList.filter((h) => h.examId !== exam.id);
      setExamHistoryList(updatedHistory);
      try {
        localStorage.setItem(`ujian_history_${student.nisn}`, JSON.stringify(updatedHistory));
      } catch (_) {}
    }
    
    setExamViolationCount(0);
    setCurrentQuestionIdx(0);
    setExamAnswers({});
    setExamFlags({});
    setExamResult(null);

    handleAttemptStartExam(exam);
  };

  const examAnswersRef = useRef<Record<number, number | string>>({});
  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    examAnswersRef.current = examAnswers;
  }, [examAnswers]);

  // Live Proctoring progress sync + periodic heartbeat
  useEffect(() => {
    if (!student?.nisn || !activeExam?.id || examResult) return;

    const pushSessionUpdate = () => {
      const questionsArr = activeExam.questions || [];
      const currentAns = examAnswersRef.current;
      const answeredCount = questionsArr.filter((q: any, i: number) =>
        isQuestionAnswered(q, currentAns[i])
      ).length;
      setDoc(
        doc(db, "exam_sessions", `${activeExam.id}_${student.nisn}`),
        {
          examId: activeExam.id,
          examTitle: activeExam.title || "",
          nisn: student.nisn || "",
          studentName: student.displayName || student.studentName || student.name || "",
          kelas: student.kelas || "",
          status: examViolationCount > 0 ? "melanggar" : "mengerjakan",
          answeredCount,
          totalQuestions: questionsArr.length,
          currentQuestion: currentQuestionIdx + 1,
          violationCount: examViolationCount,
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    };

    const debounceTimer = setTimeout(pushSessionUpdate, 1500);
    const heartbeatTimer = setInterval(pushSessionUpdate, 20000);
    return () => {
      clearTimeout(debounceTimer);
      clearInterval(heartbeatTimer);
    };
  }, [activeExam?.id, student?.nisn, currentQuestionIdx, examAnswers, examViolationCount, examResult]);

  const handleFinishExam = async (isTimeOut = false, forcedViolationCount?: number) => {
    setIsSubmitConfirmOpen(false);
    const answersToUse = examAnswersRef.current;
    if (!student?.nisn || !activeExam) return;

    let correctCount = 0;
    let earnedSum = 0;
    let hasEssayQuestion = false;
    let answeredCount = 0;
    const answerItems: Record<
      number,
      { type: string; answer: number | string | null; isCorrect: boolean; earned: number }
    > = {};

    (activeExam.questions || []).forEach((q: any, idx: number) => {
      const qType = q?.type || "multiple_choice";
      const rawAns = answersToUse[idx];
      if (isQuestionAnswered(q, rawAns)) answeredCount++;

      if (qType === "multiple_choice") {
        const numAns =
          rawAns !== undefined && rawAns !== null && rawAns !== "" && !Number.isNaN(Number(rawAns))
            ? Number(rawAns)
            : null;
        const isCorr = numAns !== null && numAns === q.correctIndex;
        const earned = isCorr ? 1 : 0;
        if (isCorr) correctCount++;
        earnedSum += earned;
        answerItems[idx] = { type: qType, answer: numAns, isCorrect: isCorr, earned };
      } else if (qType === "short_answer") {
        const strAns = rawAns !== undefined && rawAns !== null ? String(rawAns) : "";
        const normalizedAns = strAns.trim().toLowerCase();
        const acceptedAnswers = String(q.correctAnswerText || "")
          .split(/[|;]/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const isCorr = normalizedAns.length > 0 && acceptedAnswers.includes(normalizedAns);
        const earned = isCorr ? 1 : 0;
        if (isCorr) correctCount++;
        earnedSum += earned;
        answerItems[idx] = { type: qType, answer: strAns, isCorrect: isCorr, earned };
      } else {
        hasEssayQuestion = true;
        const strAns = rawAns !== undefined && rawAns !== null ? String(rawAns) : "";
        answerItems[idx] = { type: "essay", answer: strAns, isCorrect: false, earned: 0 };
      }
    });

    const totalQuestions = Math.max(1, (activeExam.questions || []).length);
    const baseScore = Math.round((earnedSum / totalQuestions) * 100);
    const passed = baseScore >= activeExam.kkm;
    const nowIso = new Date().toISOString();
    const finalViolations =
      forcedViolationCount !== undefined ? forcedViolationCount : examViolationCount;

    const answersPayload = {
      items: answerItems,
      needsManualGrading: hasEssayQuestion,
    };

    const result = {
      examId: activeExam.id,
      examTitle: activeExam.title,
      subject: activeExam.subject,
      bab: activeExam.bab || "",
      correctCount,
      totalQuestions: (activeExam.questions || []).length,
      score: baseScore,
      kkm: activeExam.kkm,
      passed,
      needsManualGrading: hasEssayQuestion,
      submittedAt: nowIso,
      wasTimeOut: isTimeOut,
      violationCount: finalViolations,
      gradedAt: nowIso,
      nilai: baseScore,
    };

    setExamResult(result);

    // Update live proctoring session as selesai
    setDoc(
      doc(db, "exam_sessions", `${activeExam.id}_${student.nisn}`),
      {
        examId: activeExam.id,
        examTitle: activeExam.title || "",
        nisn: student.nisn || "",
        studentName: student.displayName || student.studentName || student.name || "",
        kelas: student.kelas || "",
        status: "selesai",
        answeredCount,
        totalQuestions: (activeExam.questions || []).length,
        violationCount: finalViolations,
        score: baseScore,
        finishedAt: nowIso,
        lastActiveAt: nowIso,
      },
      { merge: true }
    ).catch((err) => console.warn("Gagal memperbarui sesi proctoring selesai:", err));

    const saveToCloud = async () => {
      try {
        await saveFinalGrade({
          ...result,
          id: `${activeExam.id}_${student.nisn}`,
          examId: activeExam.id,
          assignmentId: activeExam.id,
          nisn: student.nisn || "",
          studentName: student.displayName || student.studentName || student.name || "",
          kelas: student.kelas || "",
          type: "exam",
          answers: answersPayload,
        });
        trackUsage(0, 1);
        if (typeof mutateFinalGrades === "function") mutateFinalGrades();
        if (typeof mutateAllFinalGrades === "function") mutateAllFinalGrades();
      } catch (err) {
        console.warn("Gagal mengupload nilai ujian, masuk ke antrean sinkronisasi:", err);
        try {
          const syncKey = `pending_exam_sync_${student.nisn}`;
          const pending = JSON.parse(localStorage.getItem(syncKey) || "[]");
          pending.push({ ...result, answers: answersPayload });
          localStorage.setItem(syncKey, JSON.stringify(pending));
        } catch (storageErr) {
          clearStudentCaches();
          try {
            const syncKey = `pending_exam_sync_${student.nisn}`;
            localStorage.setItem(syncKey, JSON.stringify([{ ...result, answers: answersPayload }]));
          } catch {
            console.warn("Could not queue pending exam sync:", storageErr);
          }
        }
      }
    };

    saveToCloud();

    try {
      const historyKey = `ujian_history_${student.nisn}`;
      const currentHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const updatedHistory = [result, ...currentHistory];
      try {
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      } catch (_) {}
      setExamHistoryList(updatedHistory);
      removeSafeExamState(student.nisn);
    } catch (e) { console.warn("Error parsing stored data:", e); }
  };

  const confirmCheatExit = async () => {
    if (!pendingNavAction) return;

    const latestViolationCount = examViolationCount + 1;
    setExamViolationCount(latestViolationCount);

    const action = pendingNavAction;
    setShowExitWarningModal(false);
    setPendingNavAction(null);

    // Auto finish active exam, passing the latest violation count with the recorded penalty
    await handleFinishExam(false, latestViolationCount);

    // Execute transition/logout
    setTimeout(async () => {
      if (action.type === "menu" && action.id !== undefined && action.index !== undefined) {
        handleMenuChange(action.id, action.index);
      } else if (action.type === "logout" || action.type === "logout_attempt") {
        await handleLogout();
      } else if (action.type === "popstate_attempt" || action.type === "sidebar_attempt") {
        handleMenuChange("dashboard", 0);
      }
    }, 300);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (!activeExam || examResult) return;
    if (examTimer <= 0) {
      handleFinishExam(true);
      return;
    }
    const timerId = setTimeout(() => {
      setExamTimer((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timerId);
  }, [activeExam, examTimer, examResult]);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (activeExam && !examResult) {
      window.history.pushState(null, "", window.location.href);
      
      const triggerViolation = () => {
        setIsViolationSirening(true);
        startSiren();
      };

      const handlePopState = () => {
        // Kunci secara paksa navigasi history agar tidak benar-benar kembali ke halaman sebelumnya
        window.history.pushState(null, "", window.location.href);
        // Tampilkan kotak dialog peringatan keras terlebih dahulu
        setPendingNavAction({ type: "popstate_attempt" });
        setShowExitWarningModal(true);
      };
      
      const handleVisibilityChange = () => {
        // Terjadi jika menekan menu tengah/home, ganti tab browser, mengunci telpon, dll
        if (document.hidden || document.visibilityState === "hidden") {
          triggerViolation();
        }
      };

      const handleFullscreenChange = () => {
        const isFS = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );
        setIsFullscreenActive(isFS);
        if (!isFS) {
          triggerViolation();
        }
      };

      const handleBlur = () => {
        // According to user request, we make the system more relaxed for minor interruptions
        // though we still track significant visibility changes via visibilitychange
        return;
      };

      const handlePageHide = () => {
        // No violation on page hide/refresh as per user request
        return;
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // According to user request, refresh should not affect the exam (no violation penalty)
        // Persistence is handled by localStorage syncing in useEffect
        const msg = "Ujian sedang aktif! Anda dapat memuat ulang halaman jika diperlukan, progres Anda akan tersimpan.";
        e.returnValue = msg;
        return msg;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.key === "PrintScreen" || 
          e.code === "PrintScreen" ||
          (e.ctrlKey && (e.key === "p" || e.key === "s" || e.key === "c")) ||
          (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5" || e.key === "s" || e.key === "S" || e.code?.includes("Digit")))
        ) {
          e.preventDefault();
          triggerViolation();
        }
      };

      // Blokir tombol navigasi kembali / hardware back gesture
      window.addEventListener("popstate", handlePopState);
      
      // Blokir minimizing / perpindahan tab browser / tombol Home
      document.addEventListener("visibilitychange", handleVisibilityChange);
      
      // Deteksi keluar layar penuh
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);
      
      // Blokir aktivitas overview screen (Recent Apps), split screen, panel notifikasi ditarik ke bawah
      window.addEventListener("blur", handleBlur);
      
      // Deteksi keluar instan
      window.addEventListener("pagehide", handlePageHide);
      
      // Cegah reload refresh manual atau menutup halaman browser
      window.addEventListener("beforeunload", handleBeforeUnload);

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("contextmenu", (e) => e.preventDefault());
      window.addEventListener("copy", (e) => { e.preventDefault(); triggerViolation(); });
      
      return () => {
        window.removeEventListener("popstate", handlePopState);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("keydown", handleKeyDown);
        stopSiren();
      };
    }
  }, [activeExam, examResult]);

  const fetchAnnouncements = async () => {
    const cacheKey = `firas_cache_announcements_${student?.nisn || 'guest'}`;
    const cached = getLocalCache<any[]>(cacheKey, 4 * 60 * 60 * 1000);
    if (cached) return cached;

    try {
      const snapshot = await getDocs(query(collection(db, "announcements")));
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      setIsOffline(false);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error announcements:`, e.message);
      dispatchIfQuotaError(e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: announcementsList = EMPTY_ARRAY, error: errAnnouncements, mutate: mutateAnnouncements } = useSWR(
    student ? 'announcements' : null,
    fetchAnnouncements,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const fetchAssignments = async () => {
    const cacheKey = `firas_cache_assignments_v2_${student?.nisn || 'guest'}`;
    const cached = getLocalCache<any[]>(cacheKey, 4 * 60 * 60 * 1000);
    if (cached) return cached;

    try {
      const snapshot = await getDocs(query(collection(db, "assignments")));
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      setIsOffline(false);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error assignments:`, e.message);
      dispatchIfQuotaError(e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: rawAssignments = EMPTY_ARRAY, error: errAssignments, mutate: mutateAssignments } = useSWR(
    student ? 'assignments' : null,
    fetchAssignments,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const assignmentsList = useMemo(() => {
    if (!student) return EMPTY_ARRAY;
    return rawAssignments.filter((assign: any) => isAssignmentForClass(assign, student.kelas));
  }, [rawAssignments, student]);

  const currentNisn = (student?.nisn || student?.nis || student?.id || "").toString().trim();

  const fetchSubmissions = async () => {
    if (!currentNisn) return [];
    const cacheKey = `firas_cache_submissions_${currentNisn}`;

    try {
      const rawNisn = currentNisn;
      const unpadded = rawNisn.replace(/^0+/, "");
      const padded = unpadded.padStart(10, "0");
      const variants = Array.from(new Set([rawNisn, unpadded, padded].filter(Boolean)));

      const snapshot = variants.length > 1
        ? await getDocs(query(collection(db, "submissions"), where("nisn", "in", variants)))
        : await getDocs(query(collection(db, "submissions"), where("nisn", "==", rawNisn)));

      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      setIsOffline(false);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error submissions:`, e.message);
      dispatchIfQuotaError(e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: rawSubmissionsList = EMPTY_ARRAY, error: errSubmissions, mutate: mutateSubmissions } = useSWR(
    currentNisn ? ['submissions', currentNisn] : null,
    fetchSubmissions,
    { 
      fallbackData: currentNisn ? (getLocalCache<any[]>(`firas_cache_submissions_${currentNisn}`, 24 * 60 * 60 * 1000) || undefined) : undefined,
      revalidateOnFocus: true,
      revalidateOnMount: true
    }
  );

  // Real-time listener for current student's submissions to ensure instantaneous updates
  const [realtimeSubmissions, setRealtimeSubmissions] = useState<any[] | null>(() => {
    if (!currentNisn) return null;
    return getLocalCache<any[]>(`firas_cache_submissions_${currentNisn}`, 24 * 60 * 60 * 1000) || null;
  });

  useEffect(() => {
    if (!currentNisn || isFirebaseQuotaExhausted()) return;
    const cacheKey = `firas_cache_submissions_${currentNisn}`;
    const unpadded = currentNisn.replace(/^0+/, "");
    const padded = unpadded.padStart(10, "0");
    const variants = Array.from(new Set([currentNisn, unpadded, padded].filter(Boolean)));

    const q = variants.length > 1
      ? query(collection(db, "submissions"), where("nisn", "in", variants))
      : query(collection(db, "submissions"), where("nisn", "==", currentNisn));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
        setRealtimeSubmissions(data);
        setLocalCache(cacheKey, data);
        mutateSubmissions(data, false);
      },
      (error) => {
        console.warn("Realtime student submissions snapshot error:", error);
        dispatchIfQuotaError(error);
      }
    );

    return () => unsubscribe();
  }, [currentNisn, mutateSubmissions]);

  const submissionsList = useMemo(() => {
    if (realtimeSubmissions && realtimeSubmissions.length > 0) return realtimeSubmissions;
    if (Array.isArray(rawSubmissionsList) && rawSubmissionsList.length > 0) return rawSubmissionsList;
    if (currentNisn) {
      const cached = getLocalCache<any[]>(`firas_cache_submissions_${currentNisn}`, 24 * 60 * 60 * 1000);
      if (cached && cached.length > 0) return cached;
    }
    return EMPTY_ARRAY;
  }, [realtimeSubmissions, rawSubmissionsList, currentNisn]);

  const [realtimeFinalGrades, setRealtimeFinalGrades] = useState<any[] | null>(() => {
    if (!currentNisn) return null;
    return getLocalCache<any[]>(`firas_cache_final_grades_${currentNisn}`, 24 * 60 * 60 * 1000) || null;
  });

  const fetchFinalGrades = async () => {
    if (!currentNisn) return [];
    const cacheKey = `firas_cache_final_grades_${currentNisn}`;

    const rawNisn = currentNisn;
    const unpadded = rawNisn.replace(/^0+/, "");
    const padded = unpadded.padStart(10, "0");
    const variants = Array.from(new Set([rawNisn, unpadded, padded].filter(Boolean)));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaData, error } = await supabase
          .from("final_grades")
          .select("*")
          .in("nisn", variants);
        if (!error && Array.isArray(supaData) && supaData.length > 0) {
          const data = supaData.map((d) => ({
            id: d.id,
            assignmentId: d.assignment_id || d.exam_id,
            examId: d.exam_id || d.assignment_id,
            nisn: d.nisn,
            studentName: d.student_name,
            kelas: d.kelas,
            nilai: d.nilai ?? d.score,
            score: d.score ?? d.nilai,
            submittedAt: d.submitted_at,
            violationCount: d.violation_count || 0,
            answers: d.answers || {},
            isRemedial: d.is_remedial,
            remedialScore: d.remedial_score,
          }));
          setLocalCache(cacheKey, data);
          setIsOffline(false);
          return data;
        }
      } catch (err) {
        console.warn("Supabase student final grades fallback:", err);
      }
    }

    try {
      const snapshot = variants.length > 1
        ? await getDocs(query(collection(db, "final_grades"), where("nisn", "in", variants)))
        : await getDocs(query(collection(db, "final_grades"), where("nisn", "==", rawNisn)));
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      setIsOffline(false);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error final grades:`, e.message);
      dispatchIfQuotaError(e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: rawFinalGradesList = EMPTY_ARRAY, error: errFinalGrades, mutate: mutateFinalGrades } = useSWR(
    currentNisn ? ['final_grades', currentNisn] : null,
    fetchFinalGrades,
    { 
      fallbackData: currentNisn ? (getLocalCache<any[]>(`firas_cache_final_grades_${currentNisn}`, 24 * 60 * 60 * 1000) || undefined) : undefined,
      revalidateOnFocus: true,
      revalidateOnMount: true,
      refreshInterval: 15000
    }
  );

  // Real-time listener for current student's final grades
  useEffect(() => {
    if (!currentNisn || isFirebaseQuotaExhausted()) return;
    const cacheKey = `firas_cache_final_grades_${currentNisn}`;
    const unpadded = currentNisn.replace(/^0+/, "");
    const padded = unpadded.padStart(10, "0");
    const variants = Array.from(new Set([currentNisn, unpadded, padded].filter(Boolean)));

    const q = variants.length > 1
      ? query(collection(db, "final_grades"), where("nisn", "in", variants))
      : query(collection(db, "final_grades"), where("nisn", "==", currentNisn));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
        setRealtimeFinalGrades(data);
        setLocalCache(cacheKey, data);
        mutateFinalGrades(data, false);
      },
      (error) => {
        console.warn("Realtime student final_grades snapshot error:", error);
        dispatchIfQuotaError(error);
      }
    );

    return () => unsubscribe();
  }, [currentNisn, mutateFinalGrades]);

  // Real-time listener for new assignments (tasks) notification
  useEffect(() => {
    if (!student?.kelas || isFirebaseQuotaExhausted()) return;

    const q = query(collection(db, "assignments"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Skip initial load documents to only catch truly new additions during session
        if (isFirstAssignmentsRun.current) {
          isFirstAssignmentsRun.current = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newTask = { id: change.doc.id, ...change.doc.data() as any };
            // Notify if the task is relevant to the student's class
            if (isAssignmentForClass(newTask, student.kelas)) {
              setNewAssignmentToast(newTask);
            }
          }
        });
      },
      (error) => {
        console.warn("Realtime assignments notification snapshot error:", error);
        // Only report fatal errors, common quota/auth issues are logged
        if (error.message.includes("permission")) {
          // Silent or report if critical
        }
      }
    );

    return () => unsubscribe();
  }, [student?.kelas]);

  // Safari / Apple device resume listener (visibilitychange & pageshow)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutateSubmissions();
        mutateFinalGrades();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handleVisibilityChange);
    };
  }, [mutateSubmissions, mutateFinalGrades]);

  const finalGradesList = useMemo(() => {
    if (realtimeFinalGrades && realtimeFinalGrades.length > 0) return realtimeFinalGrades;
    if (Array.isArray(rawFinalGradesList) && rawFinalGradesList.length > 0) return rawFinalGradesList;
    if (currentNisn) {
      const cached = getLocalCache<any[]>(`firas_cache_final_grades_${currentNisn}`, 24 * 60 * 60 * 1000);
      if (cached && cached.length > 0) return cached;
    }
    return EMPTY_ARRAY;
  }, [realtimeFinalGrades, rawFinalGradesList, currentNisn]);

  const fetchAllStudents = async () => {
    if (!student?.kelas) return [];
    const cacheKey = `firas_cache_all_students_${student.kelas}`;
    const cached = getLocalCache<any[]>(cacheKey, 12 * 60 * 60 * 1000);
    if (cached) return cached;

    try {
      // Query only classmates to save over 90% in Firestore read counts and ensure privacy
      const q = query(collection(db, "studentsByNisn"), where("kelas", "==", student.kelas));
      const snapshot = await getDocs(q);
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error all students:`, e.message);
      dispatchIfQuotaError(e);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: allStudentsList = EMPTY_ARRAY, mutate: mutateAllStudents } = useSWR(
    student?.kelas ? ['all_students_list', student.kelas] : null,
    fetchAllStudents,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const fetchAllFinalGrades = async () => {
    if (!student?.kelas) return [];
    const cacheKey = `firas_cache_all_final_grades_${student.kelas}`;
    const cached = getLocalCache<any[]>(cacheKey, 2 * 60 * 60 * 1000);
    if (cached) return cached;

    try {
      // Query only grades within student's class (kelas) to reduce reads dramatically
      const q = query(collection(db, "final_grades"), where("kelas", "==", student.kelas));
      const snapshot = await getDocs(q);
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error all final grades:`, e.message);
      dispatchIfQuotaError(e);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || [];
    }
  };

  const { data: allFinalGrades = EMPTY_ARRAY, mutate: mutateAllFinalGrades } = useSWR(
    student?.kelas ? ['all_final_grades', student.kelas] : null,
    fetchAllFinalGrades,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const fetchExams = async () => {
    const cacheKey = `firas_cache_exams_v2_${student?.nisn || 'guest'}`;
    const cached = getLocalCache<any[]>(cacheKey, 5 * 60 * 1000);
    if (cached) return cached;

    try {
      const snapshot = await getDocs(query(collection(db, "exams")));
      trackUsage(snapshot.size, 0);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
      setLocalCache(cacheKey, data);
      setIsOffline(false);
      return data;
    } catch (e: any) {
      console.warn(`SWR fetch error exams:`, e.message);
      dispatchIfQuotaError(e);
      if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true);
      const stale = getLocalCache<any[]>(cacheKey, 24 * 60 * 60 * 1000);
      return stale || MOCK_EXAMS;
    }
  };

  const { data: rawExams = EMPTY_ARRAY, error: errExams, mutate: mutateExams } = useSWR(
    student ? 'exams' : null,
    fetchExams,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const [isRefreshingData, setIsRefreshingData] = useState(false);

  const handleManualRefresh = async () => {
    if (isRefreshingData) return;
    setIsRefreshingData(true);
    try {
      if (student?.nisn) {
        clearStudentCaches(student.nisn, student?.kelas);
      }
      await Promise.allSettled([
        mutateAnnouncements(),
        mutateAssignments(),
        mutateSubmissions(),
        mutateFinalGrades(),
        mutateAllStudents(),
        mutateAllFinalGrades(),
        mutateExams(),
      ]);
      setSyncToastMessage("Data berhasil diperbarui!");
      setTimeout(() => setSyncToastMessage(""), 3000);
    } catch (e) {
      console.warn("Manual refresh error:", e);
    } finally {
      setTimeout(() => setIsRefreshingData(false), 500);
    }
  };

  const examsList = useMemo(() => {
    if (!student) return EMPTY_ARRAY;
    return rawExams.filter((exam: any) => isExamForClass(exam, student.kelas));
  }, [rawExams, student]);

  const combinedGrades = useMemo(() => {
    if (!student) return [];
    
    // Performance Optimization: Pre-filter once for current student
    const studentSubmissions = submissionsList.filter((s: any) => 
      isSameNisn(s.nisn, student.nisn) || isSameNisn(s.nis, student.nisn) || isSameNisn(s.nisn, student.nis) || isSameNisn(s.nis, student.nis) || !s.nisn
    );
    const studentFinalGrades = finalGradesList.filter((f: any) => 
      isSameNisn(f.nisn, student.nisn) || isSameNisn(f.nis, student.nisn) || isSameNisn(f.nisn, student.nis) || isSameNisn(f.nis, student.nis)
    );
    
    const list: any[] = [];
    
    assignmentsList.forEach((assign: any) => {
      const submission = studentSubmissions.find((s: any) => (s.assignmentId === assign.id || (s.id && s.id.includes(assign.id))));
      const fGrade = studentFinalGrades.find((f: any) => (f.assignmentId === assign.id || (f.id && f.id.startsWith(assign.id))));
      const gradeVal = (submission?.nilai !== undefined && submission?.nilai !== null && submission?.nilai !== "")
        ? submission.nilai
        : (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "" ? fGrade.nilai : null);

      if (gradeVal !== null && gradeVal !== undefined) {
        const isManual = Boolean(assign.isManualColumn || fGrade?.isManualColumn || !submission?.submittedAt);
        const startDateRaw = assign.startDate || assign.publishedAt || assign.createdAt || fGrade?.startDate || fGrade?.publishedAt;
        const formattedStartDate = startDateRaw ? new Date(startDateRaw).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }) : "-";

        const submitDateRaw = submission?.submittedAt;
        const formattedSubmitDate = submitDateRaw ? new Date(submitDateRaw).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }) : null;

        const displayDate = formattedSubmitDate || formattedStartDate;

        list.push({
          id: assign.id,
          title: assign.title || assign.materi,
          bab: assign.bab || fGrade?.bab || "Informatika",
          subtitle: assign.description || "Tugas Mandiri/Kelompok",
          type: "Tugas",
          nilai: Number(gradeVal),
          isManual,
          tanggalMulai: formattedStartDate,
          tanggalSubmit: formattedSubmitDate,
          tanggal: displayDate,
          rawDate: startDateRaw || submission?.submittedAt || fGrade?.gradedAt || ""
        });
      }
    });

    examsList.forEach((exam: any) => {
      const fGrade = studentFinalGrades.find((f: any) => (f.assignmentId === exam.id || f.examId === exam.id || (f.id && f.id.startsWith(exam.id))));
      if (fGrade && fGrade.nilai !== undefined && fGrade.nilai !== null && fGrade.nilai !== "") {
        const isManual = Boolean(exam.isManualColumn || fGrade?.isManualColumn || exam.isManual);
        const startDateRaw = exam.startDate || exam.publishedAt || exam.createdAt || fGrade?.startDate || fGrade?.publishedAt;
        const formattedStartDate = startDateRaw ? new Date(startDateRaw).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }) : "-";

        list.push({
          id: exam.id,
          title: exam.title || fGrade.title || "Ujian CBT",
          bab: exam.bab || fGrade.bab || "Informatika",
          subtitle: "Ujian / Evaluasi",
          type: "Ujian",
          nilai: Number(fGrade.nilai),
          isManual,
          tanggalMulai: formattedStartDate,
          tanggal: formattedStartDate,
          rawDate: startDateRaw || fGrade.gradedAt || ""
        });
      }
    });

    studentFinalGrades.forEach((fGrade: any) => {
      const targetId = fGrade.assignmentId || fGrade.examId || fGrade.id;
      const alreadyInList = list.some(item => item.id === targetId || item.id === fGrade.assignmentId || item.id === fGrade.id);
      if (!alreadyInList && fGrade.nilai !== undefined && fGrade.nilai !== null && fGrade.nilai !== "") {
        const isExam = (targetId && (targetId.startsWith("EXM-") || targetId.startsWith("ujian-") || fGrade.type === "CBT" || fGrade.type === "exam"));
        const asgMatch = assignmentsList.find(a => a.id === targetId || a.id === fGrade.assignmentId);
        const exmMatch = examsList.find(e => e.id === targetId || e.id === fGrade.assignmentId || e.id === fGrade.examId);

        const titleResolved = fGrade.title || fGrade.materi || fGrade.examTitle || asgMatch?.title || asgMatch?.materi || exmMatch?.title;
        if (titleResolved || asgMatch || exmMatch) {
          const startDateRaw = fGrade.startDate || fGrade.publishedAt || asgMatch?.startDate || asgMatch?.publishedAt || asgMatch?.createdAt || exmMatch?.startDate || exmMatch?.publishedAt || exmMatch?.createdAt;
          const formattedStartDate = startDateRaw ? new Date(startDateRaw).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
          }) : (fGrade.gradedAt ? new Date(fGrade.gradedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-");

          list.push({
            id: targetId,
            title: titleResolved || (isExam ? "Ujian CBT" : "Tugas"),
            bab: fGrade.bab || asgMatch?.bab || exmMatch?.bab || "Informatika",
            subtitle: isExam ? "Ujian / Evaluasi" : (fGrade.description || "Tugas / Penilaian"),
            type: isExam ? "Ujian" : "Tugas",
            nilai: Number(fGrade.nilai),
            isManual: true,
            tanggalMulai: formattedStartDate,
            tanggal: formattedStartDate,
            rawDate: startDateRaw || fGrade.gradedAt || ""
          });
        }
      }
    });

    return list.sort((a, b) => {
      if (!a.rawDate) return 1;
      if (!b.rawDate) return -1;
      return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
    });
  }, [assignmentsList, submissionsList, examsList, finalGradesList, student]);



  const nilaiTertinggi = useMemo(() => {
    if (combinedGrades.length === 0) return 0;
    return Math.max(...combinedGrades.map(g => g.nilai));
  }, [combinedGrades]);

  const nilaiTerendah = useMemo(() => {
    if (combinedGrades.length === 0) return 0;
    return Math.min(...combinedGrades.map(g => g.nilai));
  }, [combinedGrades]);

  const highestGradeTitle = useMemo(() => {
    if (combinedGrades.length === 0) return "Belum ada data";
    const highest = combinedGrades.reduce((prev, current) => (prev.nilai > current.nilai) ? prev : current);
    return highest.title;
  }, [combinedGrades]);

  const lowestGradeTitle = useMemo(() => {
    if (combinedGrades.length === 0) return "Belum ada data";
    const lowest = combinedGrades.reduce((prev, current) => (prev.nilai < current.nilai) ? prev : current);
    return lowest.title;
  }, [combinedGrades]);

  // Helpers for per-class assignment targets
  const getAssignmentTargetForStudent = (a: any, studentKelas?: string) => {
    if (!studentKelas) return null;
    if (a.targets && Array.isArray(a.targets) && a.targets.length > 0) {
      const target = a.targets.find((t: any) => 
        (t.kelas || "").toString().trim().toLowerCase() === (studentKelas || "").toString().trim().toLowerCase()
      );
      if (target) return target;
    }
    return null;
  };

  const getAssignmentPublishedAtForStudent = (a: any, studentKelas?: string) => {
    const target = getAssignmentTargetForStudent(a, studentKelas);
    if (target && target.publishedAt) return new Date(target.publishedAt);
    return new Date(a.publishedAt || a.createdAt || Date.now());
  };

  const getAssignmentDeadlineForStudent = (a: any, studentKelas?: string) => {
    const target = getAssignmentTargetForStudent(a, studentKelas);
    if (target && target.deadline) return target.deadline;
    return a.deadline;
  };

  // Calculate uncompleted tasks
  const uncompletedTasksCount = useMemo(() => {
    return assignmentsList.filter(a => {
      const pubDate = getAssignmentPublishedAtForStudent(a, student?.kelas);
      if (pubDate > new Date()) return false;
      const isSubmitted = submissionsList.some((s) => s.assignmentId === a.id);
      return !isSubmitted;
    }).length;
  }, [assignmentsList, submissionsList, student]);

  const rejectedSubmissionsCount = useMemo(() => {
    return submissionsList.filter(s => s.status === "ditolak").length;
  }, [submissionsList]);

  const rataRataNilaiUjian = useMemo(() => {
    const examGrades = finalGradesList.filter(
      (f) =>
        f.nisn === student?.nisn &&
        f.assignmentId && 
        (f.assignmentId.startsWith("EXM-") ||
          f.assignmentId.startsWith("ujian-") ||
          examsList.some((e) => e.id === f.assignmentId) ||
          MOCK_EXAMS.some((e) => e.id === f.assignmentId))
    );
    if (examGrades.length === 0) return 0;
    const total = examGrades.reduce((acc, curr) => acc + Number(curr.nilai || 0), 0);
    return Math.round(total / examGrades.length);
  }, [finalGradesList, student, examsList]);

  const rataRataNilaiTugas = useMemo(() => {
    const submitted = submissionsList.filter(s => s.nilai !== undefined && s.nilai !== null);
    if (submitted.length === 0) return 0;
    const total = submitted.reduce((acc, curr) => acc + Number(curr.nilai), 0);
    return Math.round(total / submitted.length);
  }, [submissionsList]);

  const menungguTugasDinilaiCount = useMemo(() => {
    return submissionsList.filter(s => s.status === "menunggu penilaian guru").length;
  }, [submissionsList]);

  const [readAnnIds, setReadAnnIds] = useState<string[]>([]);

  const attendanceSummary = useMemo(() => {
    if (!student || absensiList.length === 0) return null;
    const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Dispen: 0 };
    let totalMeetings = 0;

    absensiList.forEach(a => {
        const studentStatus = a.data[student.nisn];
        if (studentStatus) {
            stats[studentStatus as keyof typeof stats]++;
            totalMeetings++;
        }
    });

    const attended = stats.Hadir + stats.Dispen;
    const percentageNum = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
    const percentage = percentageNum.toString();

    // New Rubric Logic
    let rubricStatus: "Sangat Rajin" | "Rajin" | "Cukup Rajin" | "Kurang Rajin" = "Rajin";
    
    if (percentageNum >= 95 && stats.Alpa === 0 && (stats.Sakit + stats.Izin) <= 2) {
      rubricStatus = "Sangat Rajin";
    } else if (percentageNum >= 90 && stats.Alpa < 1) {
      rubricStatus = "Rajin";
    } else if (percentageNum >= 80 && stats.Alpa < 3) {
      rubricStatus = "Cukup Rajin";
    } else {
      rubricStatus = "Kurang Rajin";
    }

    // Logic for "Jarang Masuk" warning
    let warningLevel: "none" | "warning" | "critical" = "none";
    let remark = "Kehadiran Sangat Baik";
    
    if (stats.Alpa >= 3 || percentageNum < 80) {
      warningLevel = "critical";
      remark = "Peringatan: Kamu Sangat Jarang Masuk. Segera hubungi wali kelas.";
    } else if (stats.Alpa >= 1 || percentageNum < 90) {
      warningLevel = "warning";
      remark = "Perhatian: Kehadiranmu mulai menurun. Tingkatkan lagi ya!";
    }

    return { ...stats, totalMeetings, percentage, warningLevel, remark, rubricStatus };
  }, [absensiList, student]);

  const rataRataSemester = useMemo(() => {
    if (!student || !rubric) return 0;

    // 1. Nilai Kehadiran
    let stuHadirCount = 0;
    let stuTotalMeetings = 0;
    const myClass = String(student.kelas || "").trim().toLowerCase();
    absensiList.forEach((a: any) => {
      if (String(a.kelasRef || "").trim().toLowerCase() === myClass) {
        stuTotalMeetings++;
        if (a.data && a.data[student.nisn]) {
          const sStatus = String(a.data[student.nisn]).toLowerCase();
          if (sStatus === "hadir" || sStatus === "dispen") {
            stuHadirCount++;
          }
        }
      }
    });
    const nilaiKehadiran = stuTotalMeetings > 0 ? (stuHadirCount / stuTotalMeetings) * 100 : 0;

    // 2. Nilai Tugas & Harian
    const tugasItems = allFinalGrades.filter((g: any) => {
      if (g.nisn !== student.nisn) return false;
      if (g.type === "Tugas") return true;
      const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
      return !isPTSItem(exam || g) && !isPASItem(exam || g);
    });
    const avgTugas = tugasItems.length > 0 
      ? tugasItems.reduce((sum: number, item: any) => sum + (Number(item.nilai) || 0), 0) / tugasItems.length 
      : 0;

    // 3. Nilai UTS
    const utsItem = allFinalGrades.find((g: any) => {
      if (g.nisn !== student.nisn) return false;
      const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
      return isPTSItem(exam || g);
    });
    const nilaiUts = utsItem ? (Number(utsItem.nilai) || 0) : 0;

    // 4. Nilai UAS
    const uasItem = allFinalGrades.find((g: any) => {
      if (g.nisn !== student.nisn) return false;
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
    
    return Math.round(finalScore);
  }, [allFinalGrades, absensiList, examsList, student, rubric]);

  const rankings = useMemo(() => {
    if (!student || !rubric || allStudentsList.length === 0) {
      return { rank: "-", total: "-" };
    }
    
    // Normalize class names for more robust matching
    const myClass = String(student.kelas || "").trim().toLowerCase();
    const studentsInClass = allStudentsList.filter((s: any) => 
      String(s.kelas || "").trim().toLowerCase() === myClass
    );

    if (studentsInClass.length === 0) return { rank: 1, total: 1 };
    
    const studentPerformance = studentsInClass.map((stu: any) => {
      // 1. Nilai Kehadiran
      let stuHadirCount = 0;
      let stuTotalMeetings = 0;
      absensiList.forEach((a: any) => {
        if (String(a.kelasRef || "").trim().toLowerCase() === myClass) {
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
      const stuAllGrades = allFinalGrades.filter((g: any) => g.nisn === stu.nisn);
      const tugasItems = stuAllGrades.filter((g: any) => {
        if (g.type === "Tugas") return true;
        const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
        return !isPTSItem(exam || g) && !isPASItem(exam || g);
      });
      const avgTugas = tugasItems.length > 0 
        ? tugasItems.reduce((sum: number, item: any) => sum + (Number(item.nilai) || 0), 0) / tugasItems.length 
        : 0;

      // 3. Nilai UTS
      const utsItem = stuAllGrades.find((g: any) => {
        const exam = examsList.find((e: any) => e.id === g.assignmentId || e.id === g.id);
        return isPTSItem(exam || g);
      });
      const nilaiUts = utsItem ? (Number(utsItem.nilai) || 0) : 0;

      // 4. Nilai UAS
      const uasItem = stuAllGrades.find((g: any) => {
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

    const myIndex = studentPerformance.findIndex((item) => item.nisn === student.nisn);
    const rank = myIndex !== -1 ? myIndex + 1 : 1;
    const total = studentsInClass.length;

    return { rank, total };
  }, [allStudentsList, allFinalGrades, absensiList, examsList, student, rubric]);

  const predikatAkhir = useMemo(() => {
    const avg = rataRataSemester;
    if (avg === 0) return "-";
    if (avg >= 92) return "A";
    if (avg >= 84) return "B";
    if (avg >= 75) return "C";
    return "D";
  }, [rataRataSemester]);

  const predikatColor = useMemo(() => {
    const pred = predikatAkhir;
    if (pred === "A" || pred === "B") return "text-emerald-600";
    if (pred === "C") return "text-amber-600";
    if (pred === "D") return "text-rose-600";
    return "text-slate-400";
  }, [predikatAkhir]);

  const integrityStatus = useMemo(() => {
    if (examViolationCount === 0) return { text: "Sangat Berintegritas", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" };
    if (examViolationCount === 1) return { text: "Berintegritas", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" };
    if (examViolationCount === 2) return { text: "Cukup Berintegritas", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" };
    if (examViolationCount < 5) return { text: "Kurang Berintegritas", color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" };
    return { text: "Sangat Kurang Berintegritas", color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" };
  }, [examViolationCount]);

  const studentAttendanceData = useMemo(() => {
    if (!student || absensiList.length === 0) return [];
    return absensiList
      .filter(a => a.data && a.data[student.nisn])
      .map(a => ({
        id: a.id,
        date: a.date,
        subject: a.subject,
        status: a.data[student.nisn],
        keterangan: a.keterangan?.[student.nisn] || "-",
        teacher: a.teacherName || "Guru Mata Pelajaran"
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [absensiList, student]);

  const todayAttendance = useMemo(() => {
    if (studentAttendanceData.length === 0) return null;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const latest = studentAttendanceData[0];
    
    if (latest.date === today) {
      if (latest.status.toLowerCase() === "hadir" || latest.status.toLowerCase() === "sakit" || latest.status.toLowerCase() === "izin" || latest.status.toLowerCase() === "alpa" || latest.status.toLowerCase() === "dispen") {
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        
        let formattedDate = latest.date;
        try {
          const d = new Date(latest.date);
          const dayName = dayNames[d.getDay()];
          const dateNum = d.getDate();
          const monthName = monthNames[d.getMonth()];
          const year = d.getFullYear();
          formattedDate = `${dayName}, ${dateNum} ${monthName} ${year}`;
        } catch (e) {
          console.warn(e);
        }

        if (latest.status.toLowerCase() === "hadir") {
          return { 
            type: "hadir", 
            date: latest.date,
            title: "Status Kehadiran: Hadir",
            text: `Anda sekarang hadir di pembelajaran informatika pada hari ${formattedDate}. Terus tingkatkan kehadiranmu!` 
          };
        } else if (latest.status.toLowerCase() === "sakit") {
          return { 
            type: "sakit", 
            date: latest.date,
            title: "Status Kehadiran: Sakit",
            text: `Kamu terdeteksi sakit pada hari ${formattedDate}. Semoga lekas sembuh, kami mendoakan kesehatanmu.` 
          };
        } else if (latest.status.toLowerCase() === "izin") {
          return { 
            type: "izin", 
            date: latest.date,
            title: "Status Kehadiran: Izin",
            text: `Kamu izin hari ini (${formattedDate}). Semoga acaranya lancar.` 
          };
        } else if (latest.status.toLowerCase() === "alpa") {
          return {
            type: "alpa",
            date: latest.date,
            title: "Status Kehadiran: Alpa",
            text: `Kamu terdeteksi Alpa (tanpa keterangan) pada hari ${formattedDate}. Silakan segera hubungi wali kelas.`
          };
        } else if (latest.status.toLowerCase() === "dispen") {
          return {
            type: "dispen",
            date: latest.date,
            title: "Status Kehadiran: Dispensasi",
            text: `Kamu mendapatkan Dispensasi pada hari ${formattedDate}. Semoga bisa menyeimbangkan antara pembelajaran dan tugas sekolah.`
          };
        }
      }
    }
    return null;
  }, [studentAttendanceData]);

  const attendanceChartData = useMemo(() => {
    if (!attendanceSummary) return [];
    return [
      { name: "Hadir", value: attendanceSummary.Hadir, color: "#10b981" },
      { name: "Sakit", value: attendanceSummary.Sakit, color: "#3b82f6" },
      { name: "Izin", value: attendanceSummary.Izin, color: "#f59e0b" },
      { name: "Alpa", value: attendanceSummary.Alpa, color: "#ef4444" },
      { name: "Dispen", value: attendanceSummary.Dispen, color: "#8b5cf6" },
    ].filter(d => d.value > 0);
  }, [attendanceSummary]);

  const dashboardAnnouncements = useMemo(() => {
    if (!student) return EMPTY_ARRAY;
    return announcementsList.filter(ann => 
      (ann.kelasRef === student?.kelas || ann.kelasRef === "SEMUA_KELAS") &&
      !readAnnIds.includes(ann.id)
    );
  }, [announcementsList, student, readAnnIds]);

  const dashboardTasks = useMemo(() => {
    if (!student) return { today: [], comingSoon: [] };
    const now = new Date();
    
    const today = assignmentsList.filter((a) => {
      const pubDate = getAssignmentPublishedAtForStudent(a, student.kelas);
      const isToday =
        pubDate.getDate() === now.getDate() &&
        pubDate.getMonth() === now.getMonth() &&
        pubDate.getFullYear() === now.getFullYear();
      const isMengumpul = submissionsList.some((s) => 
        (String(s.assignmentId) === String(a.id) || s.id === `SUB-${student.nisn}-${a.id}`) &&
        (isSameNisn(s.nisn, student.nisn) || !s.nisn)
      );
      return isToday && !isMengumpul && pubDate <= now;
    });

    const comingSoon = assignmentsList.filter((a) => {
      const pubDate = getAssignmentPublishedAtForStudent(a, student.kelas);
      return pubDate > now;
    });

    return { today, comingSoon };
  }, [assignmentsList, submissionsList, student]);

  const activeAssignments = useMemo(() => {
    if (!student) return EMPTY_ARRAY;
    const now = new Date();
    return assignmentsList
      .filter((a) => getAssignmentPublishedAtForStudent(a, student.kelas) <= now)
      .sort((a, b) => {
        const dateA = getAssignmentPublishedAtForStudent(a, student.kelas).getTime();
        const dateB = getAssignmentPublishedAtForStudent(b, student.kelas).getTime();
        return dateB - dateA;
      })
      .filter((a) => {
        const isDinilaiEntry = finalGradesList.find(
          (f) => f.assignmentId === a.id && f.nisn === student.nisn
        );
        return !isDinilaiEntry?.hiddenByStudents?.includes(student.nisn);
      });
  }, [assignmentsList, finalGradesList, student]);

  const unifiedAcademicItems = useMemo(() => {
    if (!student) return EMPTY_ARRAY;
    
    const examGradeEntries = finalGradesList.filter(
      (f) =>
        f.nisn === student.nisn &&
        f.assignmentId && 
        (f.assignmentId.startsWith("EXM-") ||
          f.assignmentId.startsWith("ujian-") ||
          examsList.some((e) => e.id === f.assignmentId) ||
          MOCK_EXAMS.some((e) => e.id === f.assignmentId))
    );

    return [
      ...submissionsList
        .filter((sub) => {
          const isDinilaiEntry = finalGradesList.find(
            (f) => f.assignmentId === sub.assignmentId && f.nisn === student.nisn
          );
          return !isDinilaiEntry?.hiddenByStudents?.includes(student.nisn);
        })
        .map((sub) => {
          const assignment = assignmentsList.find((a) => String(a.id) === String(sub.assignmentId));
          return {
            id: sub.id,
            title: assignment ? assignment.materi : "Data Terhapus",
            bab: assignment ? assignment.bab : "-",
            submittedAt: sub.submittedAt,
            type: "Tugas Mandiri",
            status: sub.nilai ? "Sudah Dinilai" : "Menunggu Antrian",
            nilai: sub.nilai || "",
          };
        }),
      ...examGradeEntries.map((f) => {
        const exam = examsList.find((e) => e.id === f.assignmentId) || MOCK_EXAMS.find((e) => e.id === f.assignmentId);
        return {
          id: f.id,
          title: exam ? exam.title : (f.examTitle || `Ujian Online`),
          bab: f.bab || (exam ? (exam.bab || (exam.title?.includes(" - ") ? exam.title.split(" - ")[1] : "Informatika")) : "Informatika"),
          submittedAt: f.gradedAt || new Date().toISOString(),
          type: "Ujian CBT (Online)",
          status: "Selesai",
          nilai: f.nilai,
        };
      }),
    ].sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return dateB - dateA;
    });
  }, [submissionsList, finalGradesList, assignmentsList, examsList, student]);

  const reportCardGrade = useMemo(() => {
    if (!student || !rubric) return null;

    // 1. Nilai Kehadiran (Percentage of meetings attended/dispen)
    let studentHadirCount = 0;
    let studentTotalMeetings = 0;

    // Filter absensi by student's class and count meetings
    absensiList.forEach(a => {
      if (a.kelasRef === student.kelas) {
        studentTotalMeetings++;
        if (a.data && a.data[student.nisn]) {
          const sStatus = String(a.data[student.nisn]).toLowerCase();
          if (sStatus === "hadir" || sStatus === "dispen") {
            studentHadirCount++;
          }
        }
      }
    });

    const nilaiKehadiran = studentTotalMeetings > 0 ? (studentHadirCount / studentTotalMeetings) * 100 : 0;

    // 2. Nilai Tugas & Harian (Include Tasks and Exams that are NOT UTS/UAS)
    const tugasVals: number[] = [];
    let nilaiUts = 0;
    let nilaiUas = 0;

    const studentAssignments = assignmentsList.filter(a => isAssignmentForClass(a, student.kelas));
    studentAssignments.forEach(a => {
      const sub = submissionsList.find(s => 
        (String(s.assignmentId) === String(a.id) || s.id === `SUB-${student.nisn}-${a.id}`) && 
        (isSameNisn(s.nisn, student.nisn) || !s.nisn)
      );
      const fGrade = finalGradesList.find(f => (f.assignmentId === a.id || f.id === `${a.id}_${student.nisn}`) && isSameNisn(f.nisn, student.nisn));
      const val = sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" ? sub.nilai : fGrade?.nilai;
      if (val !== undefined && val !== null && val !== "") {
        tugasVals.push(Number(val));
      } else {
        tugasVals.push(0);
      }
    });

    const studentExams = examsList.filter(e => isExamForClass(e, student.kelas));
    studentExams.forEach(e => {
      const fGrade = finalGradesList.find(f => (f.alignmentId === e.id || f.assignmentId === e.id) && f.nisn === student.nisn);
      if (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "") {
        const n = Number(fGrade.nilai);
        if (isPTSItem(e)) nilaiUts = n;
        else if (isPASItem(e)) nilaiUas = n;
        else tugasVals.push(n);
      } else {
        if (isPTSItem(e)) nilaiUts = 0;
        else if (isPASItem(e)) nilaiUas = 0;
        else tugasVals.push(0);
      }
    });

    const avgTugas = tugasVals.length > 0 
      ? tugasVals.reduce((sum, item) => sum + item, 0) / tugasVals.length 
      : 0;

    // Final Calculation based on teacher's rubric
    const finalScore = (
      (nilaiKehadiran * (rubric.kehadiran / 100)) +
      (avgTugas * (rubric.tugas / 100)) +
      (nilaiUts * (rubric.uts / 100)) +
      (nilaiUas * (rubric.uas / 100))
    );

    return {
      nilaiKehadiran: Math.round(nilaiKehadiran),
      avgTugas: Math.round(avgTugas),
      nilaiUts: Math.round(nilaiUts),
      nilaiUas: Math.round(nilaiUas),
      finalScore: Math.round(finalScore),
      totalMeetings: studentTotalMeetings,
      hadirCount: studentHadirCount
    };
  }, [student, rubric, absensiList, combinedGrades, examsList]);

  const [taskSearch, setTaskSearch] = useState("");
  const [activeProfileTab, setActiveProfileTab] = useState("Data Pribadi");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"semua" | "selesai" | "tertunda" | "terlambat">("semua");

  const gradeTrendData = useMemo(() => {
    if (!student) return [];
    
    const gradedItems = unifiedAcademicItems
      .filter((item) => item.nilai !== undefined && item.nilai !== null && item.nilai !== "")
      .map((item) => ({
        title: item.title,
        type: item.type,
        score: Number(item.nilai),
        submittedAt: item.submittedAt,
      }))
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

    let runningSum = 0;
    return gradedItems.map((item, index) => {
      runningSum += item.score;
      const runningAvg = Math.round((runningSum / (index + 1)) * 10) / 10;
      return {
        name: item.title,
        type: item.type,
        score: item.score,
        avg: runningAvg,
        dateStr: new Date(item.submittedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
      };
    });
  }, [unifiedAcademicItems, student]);

  const allAssignedTasksWithStatus = useMemo(() => {
    if (!student) return [];
    
    return assignmentsList.map((assignment) => {
      let deadlineStr = assignment.deadline;
      let publishedAtStr = assignment.publishedAt || assignment.createdAt;

      if (assignment.targets && assignment.targets.length > 0) {
        const target = assignment.targets.find((t: any) => 
          (t.kelas || "").toString().trim().toLowerCase() === (student.kelas || "").toString().trim().toLowerCase()
        );
        if (target) {
          if (target.deadline) deadlineStr = target.deadline;
          if (target.publishedAt) publishedAtStr = target.publishedAt;
        }
      }

      const sub = submissionsList.find((s) => {
        const matchAsg = String(s.assignmentId).trim() === String(assignment.id).trim() ||
          s.id === `SUB-${student.nisn}-${assignment.id}` ||
          (s.id && (s.id.endsWith(`-${assignment.id}`) || s.id.includes(assignment.id)));
        const matchStudent = isSameNisn(s.nisn, student.nisn) || isSameNisn(s.nis, student.nisn) || !s.nisn;
        return matchAsg && matchStudent;
      });
      const fGrade = finalGradesList.find((f) => 
        (String(f.assignmentId).trim() === String(assignment.id).trim() || f.id === `${assignment.id}_${student.nisn}` || f.id === `FG-${student.nisn}-${assignment.id}` || (f.id && f.id.includes(assignment.id))) && 
        (isSameNisn(f.nisn, student.nisn) || isSameNisn(f.nis, student.nisn))
      );
      const gradeVal = sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== "" 
        ? sub.nilai 
        : (fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== "" ? fGrade.nilai : (fGrade?.score ?? null));
      
      const isGraded = gradeVal !== null && gradeVal !== undefined && gradeVal !== "";
      const isCompleted = isGraded || (!!sub && sub.status !== "ditolak");

      let status: "selesai" | "tertunda" | "terlambat" = "tertunda";
      if (isCompleted) {
        status = "selesai";
      } else if (assignment.isManualColumn) {
        status = "tertunda";
      } else if (deadlineStr) {
        const hasDeadlinePassed = new Date() > new Date(deadlineStr);
        if (hasDeadlinePassed) {
          status = "terlambat";
        } else {
          status = "tertunda";
        }
      }

      const effectiveSub = sub ? {
        ...sub,
        nilai: (sub.nilai !== undefined && sub.nilai !== null && sub.nilai !== "") ? sub.nilai : gradeVal,
        status: (sub.status === "ditolak") ? "ditolak" : (gradeVal !== null ? "sudah dinilai" : sub.status)
      } : (isGraded ? {
        id: `SUB-${student.nisn}-${assignment.id}`,
        assignmentId: assignment.id,
        nisn: student.nisn,
        nilai: Number(gradeVal),
        status: "sudah dinilai",
        submittedAt: fGrade?.gradedAt || fGrade?.submittedAt || assignment.publishedAt,
      } : null);

      return {
        id: assignment.id,
        title: assignment.materi || assignment.title,
        bab: assignment.bab || fGrade?.bab || "-",
        description: assignment.description || "",
        deadline: deadlineStr,
        publishedAt: publishedAtStr,
        status,
        submission: effectiveSub,
        gradeVal,
        nilai: gradeVal,
        taskLink: assignment.taskLink,
        linkTugas: assignment.linkTugas,
        fileUrl: assignment.fileUrl,
        driveUrl: assignment.driveUrl,
      };
    }).sort((a, b) => {
      // Prioritas 1: Tugas yang Ditolak (selalu di paling atas agar segera direvisi)
      // Prioritas 2: Tugas yang Belum Dikerjakan (posisi tepat di bawahnya agar siswa sadar)
      // Prioritas 3: Tugas yang Sudah Selesai / Menunggu Dinilai / Sudah Dinilai (di bawahnya lagi)
      const getPriorityRank = (item: any) => {
        if (item.submission?.status === "ditolak") return 1;
        const isDone = item.status === "selesai" || (!!item.submission && item.submission?.status !== "ditolak") || (item.gradeVal !== null && item.gradeVal !== undefined && item.gradeVal !== "");
        if (!isDone) return 2;
        return 3;
      };

      const rankA = getPriorityRank(a);
      const rankB = getPriorityRank(b);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Jika sama-sama berada di prioritas Belum Dikerjakan (rank 2), dahulukan deadline terdekat
      if (rankA === 2) {
        const deadA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const deadB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (deadA !== deadB) return deadA - deadB;
      }

      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [assignmentsList, submissionsList, finalGradesList, student]);

  const blendedTasks = useMemo(() => {
    return allAssignedTasksWithStatus.map(real => ({
      id: real.id,
      title: real.title || "Tugas Mandiri",
      materi: real.title || "Tugas Mandiri",
      bab: real.bab || "Informatika",
      description: real.description || "Silakan baca instruksi tugas dari Guru.",
      deadline: real.deadline || new Date().toISOString(),
      publishedAt: real.publishedAt || new Date().toISOString(),
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
      status: real.status,
      submission: real.submission,
      gradeVal: real.gradeVal,
      nilai: real.nilai,
      taskLink: real.taskLink,
      linkTugas: real.linkTugas,
      fileUrl: real.fileUrl,
      driveUrl: real.driveUrl,
    }));
  }, [allAssignedTasksWithStatus]);

  const rejectedTasks = useMemo(() => {
    return blendedTasks.filter((t) => t.submission?.status === "ditolak");
  }, [blendedTasks]);

  const filteredTasksBySubject = useMemo(() => {
    // Show all tasks assigned to the student's class.
    // The "bab" field is used by teachers to input specific chapters (e.g. "Bab 1", "Bab 2"),
    // so strictly matching "Informatika" against it hides the assignments.
    return blendedTasks;
  }, [blendedTasks]);

  const totalTasksCount = useMemo(() => filteredTasksBySubject.length, [filteredTasksBySubject]);
  const selesaiTasksCount = useMemo(() => filteredTasksBySubject.filter(t => (t.status === "selesai" || !!t.submission) && t.submission?.status !== "ditolak").length, [filteredTasksBySubject]);
  const belumDikerjakanTasksCount = useMemo(() => filteredTasksBySubject.filter(t => !t.submission && t.submission?.status !== "ditolak").length, [filteredTasksBySubject]);
  const ditolakTasksCount = useMemo(() => filteredTasksBySubject.filter(t => t.submission?.status === "ditolak").length, [filteredTasksBySubject]);

  const selesaiPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((selesaiTasksCount / totalTasksCount) * 100) : 0, [totalTasksCount, selesaiTasksCount]);
  const belumDikerjakanPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((belumDikerjakanTasksCount / totalTasksCount) * 100) : 0, [totalTasksCount, belumDikerjakanTasksCount]);
  const ditolakPercentage = useMemo(() => totalTasksCount > 0 ? Math.round((ditolakTasksCount / totalTasksCount) * 100) : 0, [totalTasksCount, ditolakTasksCount]);

  const [dismissedGradedAlerts, setDismissedGradedAlerts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("dismissed_graded_alerts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (student?.nisn) {
      try {
        const key = `dismissed_graded_alerts_${student.nisn}`;
        const stored = localStorage.getItem(key);
        setDismissedGradedAlerts(stored ? JSON.parse(stored) : []);
      } catch {
        setDismissedGradedAlerts([]);
      }
    }
  }, [student?.nisn]);

  const handleDismissGradedAlert = (alertId: string) => {
    if (!student?.nisn) return;
    const key = `dismissed_graded_alerts_${student.nisn}`;
    const updated = Array.from(new Set([...dismissedGradedAlerts, alertId]));
    setDismissedGradedAlerts(updated);
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save dismissed graded alert:", e);
    }
  };

  const gradedTaskAlerts = useMemo(() => {
    if (!student) return [];

    return assignmentsList
      .map((assignment) => {
        const sub = submissionsList.find(
          (s) => s.assignmentId === assignment.id && s.nisn === student.nisn
        );
        const fGrade = finalGradesList.find(
          (f) => f.assignmentId === assignment.id && f.nisn === student.nisn
        );

        const gradeVal =
          sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== ""
            ? sub.nilai
            : fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== ""
            ? fGrade.nilai
            : null;

        const isGraded =
          (sub && (sub.status === "sudah dinilai" || gradeVal !== null)) ||
          (fGrade && gradeVal !== null);

        if (!isGraded || gradeVal === null) return null;

        const alertId = `graded_alert_${assignment.id}_${gradeVal}`;

        if (dismissedGradedAlerts.includes(alertId)) return null;

        let pubDateObj = getAssignmentPublishedAtForStudent(assignment, student.kelas);
        const tanggalRilisStr = pubDateObj
          ? pubDateObj.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Tidak ditentukan";

        const submittedAtRaw = sub?.submittedAt || sub?.createdAt;
        const tanggalPenyerahanStr = submittedAtRaw
          ? new Date(submittedAtRaw).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Telah diserahkan";

        const numGrade = Number(gradeVal);
        let motivationalQuote =
          numGrade === 100 ? "Terimakasih sudah bekerja keras dan menjunjung tinggi integritas dengan tidak menggunakan AI." :
          numGrade >= 95 ? "Luar biasa! Hasil kerja yang sangat memuaskan." :
          numGrade >= 90 ? "Hebat! Terus pertahankan kualitas kerja Anda." :
          numGrade >= 85 ? "Bagus! Sedikit lagi menuju sempurna." :
          numGrade >= 80 ? "Cukup baik, mari tingkatkan lagi di tugas berikutnya." :
          numGrade >= 75 ? "Tuntas! Namun pastikan kedepannya untuk tidak terlambat mengumpulkan tugas ya." :
          "Mari terus belajar dan berusaha lebih baik lagi.";

        const rawTeacherNote = String(sub?.keterangan || sub?.feedback || fGrade?.catatan || "").trim();
        const isLeftoverRejectionNote =
          !rawTeacherNote ||
          (sub?.rejectionReason && rawTeacherNote === String(sub.rejectionReason).trim()) ||
          /belum ditambahkan nama|kurang jelas|buram|belum lengkap|tidak sesuai|kirim ulang|minta revisi|tugas ditolak|masih dibatasi|siapa saja yang memiliki link/i.test(rawTeacherNote);

        return {
          alertId,
          assignment,
          materi: assignment.materi || "Tugas Mandiri",
          bab: assignment.bab || "-",
          score: gradeVal,
          tanggalRilis: tanggalRilisStr,
          tanggalPenyerahan: tanggalPenyerahanStr,
          motivationalQuote,
          catatanGuru: isLeftoverRejectionNote ? "" : rawTeacherNote,
        };
      })
      .filter(Boolean) as Array<{
        alertId: string;
        assignment: any;
        materi: string;
        bab: string;
        score: any;
        tanggalRilis: string;
        tanggalPenyerahan: string;
        motivationalQuote: string;
        catatanGuru: string;
      }>;
  }, [assignmentsList, submissionsList, finalGradesList, student, dismissedGradedAlerts]);

  const [dismissedInfoNilaiIds, setDismissedInfoNilaiIds] = useState<string[]>(() => {
    try {
      const nisn = studentData?.nisn || studentData?.id || "";
      const stored = nisn ? localStorage.getItem(`dismissed_info_nilai_${nisn}`) : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [confirmClearAllInfoNilai, setConfirmClearAllInfoNilai] = useState(false);

  useEffect(() => {
    const nisn = student?.nisn || student?.id;
    if (!nisn) return;
    try {
      const key = `dismissed_info_nilai_${nisn}`;
      const localRaw = localStorage.getItem(key);
      const localIds: string[] = localRaw ? JSON.parse(localRaw) : [];
      const remoteIds: string[] = Array.isArray(student?.dismissedInfoNilaiIds)
        ? student.dismissedInfoNilaiIds
        : [];
      const merged = Array.from(new Set([...localIds, ...remoteIds]));
      setDismissedInfoNilaiIds(merged);
      if (merged.length > 0) {
        localStorage.setItem(key, JSON.stringify(merged));
      }
    } catch {
      setDismissedInfoNilaiIds([]);
    }
  }, [student?.nisn, student?.id, student?.dismissedInfoNilaiIds]);

  const saveDismissedInfoNilaiIds = (updatedIds: string[]) => {
    const nisn = student?.nisn || student?.id || "guest";
    const uniqueIds = Array.from(new Set(updatedIds));
    setDismissedInfoNilaiIds(uniqueIds);
    try {
      localStorage.setItem(`dismissed_info_nilai_${nisn}`, JSON.stringify(uniqueIds));
    } catch (e) {
      console.warn("Gagal menyimpan status hapus pesan info nilai:", e);
    }
    const docId = student?.id || student?.nisn;
    if (docId && !student?.isGuest) {
      setDoc(
        doc(db, "studentsByNisn", String(docId)),
        { dismissedInfoNilaiIds: uniqueIds },
        { merge: true }
      ).catch((e) => {
        console.warn("Sync hapus pesan info nilai ditunda lokal:", e);
      });
    }
  };

  const handleDeleteSingleInfoNilai = (dismissKey: string) => {
    saveDismissedInfoNilaiIds([...dismissedInfoNilaiIds, dismissKey]);
  };

  const visibleRejectedInfoTasks = useMemo(() => {
    return rejectedTasks.filter((t: any) => {
      const sub = t.submission;
      const dismissKey = `rejected-info-${t.id}__${sub?.updatedAt || sub?.createdAt || sub?.rejectionReason || sub?.keterangan || "v1"}`;
      return !dismissedInfoNilaiIds.includes(dismissKey);
    });
  }, [rejectedTasks, dismissedInfoNilaiIds]);

  const handleDeleteAllInfoNilai = (keysToDismiss: string[]) => {
    saveDismissedInfoNilaiIds([...dismissedInfoNilaiIds, ...keysToDismiss]);
    setConfirmClearAllInfoNilai(false);
  };

  const allGradedNotifications = useMemo(() => {
    if (!student) return [];
    const studentNisn = student.nisn || student.nis || student.id || "";

    const taskGrades = (assignmentsList || [])
      .map((assignment: any) => {
        const sub = (submissionsList || []).find(
          (s: any) =>
            (String(s.assignmentId) === String(assignment.id) || s.id === `SUB-${studentNisn}-${assignment.id}`) &&
            (isSameNisn(s.nisn, studentNisn) || isSameNisn(s.nis, studentNisn) || !s.nisn)
        );
        const fGrade = (finalGradesList || []).find(
          (f: any) =>
            (String(f.assignmentId) === String(assignment.id) || f.id === `${assignment.id}_${studentNisn}`) &&
            isSameNisn(f.nisn, studentNisn)
        );

        const gradeVal =
          sub?.nilai !== undefined && sub?.nilai !== null && sub?.nilai !== ""
            ? sub.nilai
            : fGrade?.nilai !== undefined && fGrade?.nilai !== null && fGrade?.nilai !== ""
            ? fGrade.nilai
            : null;

        const isGraded =
          (sub && (sub.status === "sudah dinilai" || gradeVal !== null)) ||
          (fGrade && gradeVal !== null);

        if (!isGraded || gradeVal === null || gradeVal === undefined) return null;

        const dateStr = sub?.updatedAt || fGrade?.createdAt || sub?.submittedAt || assignment.createdAt;
        const rawNote = String(sub?.keterangan || sub?.feedback || fGrade?.catatan || "").trim();
        const isLeftoverRejection =
          !rawNote ||
          (sub?.rejectionReason && rawNote === String(sub.rejectionReason).trim()) ||
          /belum ditambahkan nama|kurang jelas|buram|belum lengkap|tidak sesuai|kirim ulang|minta revisi|tugas ditolak|masih dibatasi|siapa saja yang memiliki link/i.test(rawNote);
        const catatanGuru = isLeftoverRejection ? "" : rawNote;

        const id = `graded-task-${assignment.id}`;
        const dismissKey = `${id}__${gradeVal}`;

        return {
          id,
          dismissKey,
          type: "tugas",
          title: assignment.materi || assignment.title || "Tugas Informatika",
          bab: assignment.bab || "-",
          score: gradeVal,
          dateStr,
          catatanGuru,
          assignment,
        };
      })
      .filter(Boolean);

    const examGrades = (examsList || [])
      .map((exam: any) => {
        const fGrade = (finalGradesList || []).find(
          (f: any) =>
            (String(f.assignmentId) === String(exam.id) || f.id === `${exam.id}_${studentNisn}`) &&
            isSameNisn(f.nisn, studentNisn)
        );
        if (!fGrade || fGrade.nilai === undefined || fGrade.nilai === null || fGrade.nilai === "") return null;

        const id = `graded-exam-${exam.id}`;
        const dismissKey = `${id}__${fGrade.nilai}`;

        return {
          id,
          dismissKey,
          type: "ujian",
          title: exam.title || exam.judul || "Ujian Online Informatika",
          bab: exam.materi || exam.bab || "-",
          score: fGrade.nilai,
          dateStr: fGrade.createdAt || exam.createdAt,
          catatanGuru: fGrade.catatan || "Hasil Ujian Online telah dinilai oleh Pak Agan.",
          exam,
        };
      })
      .filter(Boolean);

    return [...taskGrades, ...examGrades].filter(
      (item: any) => item && !dismissedInfoNilaiIds.includes(item.dismissKey)
    );
  }, [assignmentsList, submissionsList, finalGradesList, examsList, student, dismissedInfoNilaiIds]);

  const displayedTasks = useMemo(() => {
    let tasks = filteredTasksBySubject;
    
    // Search filter
    if (searchQuery.trim() !== "") {
      const queryStr = searchQuery.toLowerCase();
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(queryStr) || 
        t.description.toLowerCase().includes(queryStr) ||
        t.bab.toLowerCase().includes(queryStr) ||
        "agan parta".includes(queryStr) ||
        "pak agan".includes(queryStr) ||
        "informatika".includes(queryStr)
      );
    }
    
    // Pill Category filter
    if (taskFilter === "selesai") {
      tasks = tasks.filter(t => (t.status === "selesai" || !!t.submission) && t.submission?.status !== "ditolak");
    } else if (taskFilter === "belum_dikerjakan") {
      tasks = tasks.filter(t => !t.submission && t.submission?.status !== "ditolak");
    } else if (taskFilter === "ditolak") {
      tasks = tasks.filter(t => t.submission?.status === "ditolak");
    }
    
    // Pastikan urutan tugas di menu Tugas Siswa:
    // 1. Tugas Ditolak selalu di posisi paling atas (perlu revisi segera)
    // 2. Tugas Belum Dikerjakan di bawahnya (agar siswa sadar tugas yang belum selesai)
    // 3. Tugas Selesai / Menunggu Dinilai / Sudah Dinilai di posisi bawah
    return [...tasks].sort((a, b) => {
      const getPriorityRank = (item: any) => {
        if (item.submission?.status === "ditolak") return 1;
        const isDone = item.status === "selesai" || (!!item.submission && item.submission?.status !== "ditolak") || (item.gradeVal !== null && item.gradeVal !== undefined && item.gradeVal !== "");
        if (!isDone) return 2;
        return 3;
      };

      const rankA = getPriorityRank(a);
      const rankB = getPriorityRank(b);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      if (rankA === 2) {
        const deadA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const deadB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (deadA !== deadB) return deadA - deadB;
      }

      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredTasksBySubject, taskFilter, searchQuery]);

  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (student?.nisn) {
      setReadAnnIds(JSON.parse(localStorage.getItem(`read_anns_${student.nisn}`) || "[]"));
    }
  }, [student?.nisn]);

  // Check for new announcements
  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  // Teacher announcements are listed inside Menu Informasi per user preferences.
  useEffect(() => {
    // Keep announcements state synced without auto-popping modal on Beranda load
  }, [announcementsList, student, readAnnIds]);

  const handleDismissAnnouncement = (id?: string) => {
    if (id) {
      const updated = Array.from(new Set([...readAnnIds, id]));
      setReadAnnIds(updated);
      if (student?.nisn) {
        try {
          localStorage.setItem(`read_anns_${student.nisn}`, JSON.stringify(updated));
        } catch (err) {
          console.warn("Gagal menyimpan riwayat baca pengumuman:", err);
        }
      }
    }
    setViewedAnnouncement(null);
  };

  // Effect to process notifications automatically (including new assignments and deadlines under 24 hours)
  useEffect(() => {
    initAuth(
      () => setNeedsDriveAuth(false),
      () => setNeedsDriveAuth(true)
    );
  }, []);

  useEffect(() => {
    if (!student) return;
    const now = new Date();
    const studentKelas = student.kelas || "";

    // 1. Rejected tasks (Tugas Ditolak)
    const rejectedNotifications = submissionsList
      .filter((s) => s.status === "ditolak")
      .map((s) => {
        const assignment = assignmentsList.find((a) => a.id === s.assignmentId);
        return {
          id: `rejected_${s.id}`,
          type: "rejected",
          title: "Tugas Perlu Diperbaiki",
          message: `${assignment?.materi || "Tugas"}: Perlu diperbaiki untuk meningkatkan nilai.`,
          timestamp: s.updatedAt || s.createdAt || new Date().toISOString(),
          assignmentId: s.assignmentId,
        };
      });

    // 2. Graded tasks (Tugas Sudah Dinilai)
    const gradedNotifications = finalGradesList
      .filter((g) => g.nisn === student.nisn)
      .map((g) => {
        const assignment = assignmentsList.find((a) => a.id === g.assignmentId);
        return {
          id: `graded_${g.id}_${g.nilai}`,
          type: "graded",
          title: "Tugas Sudah Dinilai",
          message: `${assignment?.materi || "Tugas"}: Selamat, Anda mendapatkan skor ${g.nilai}.`,
          timestamp: g.updatedAt || g.createdAt || new Date().toISOString(),
          assignmentId: g.assignmentId,
        };
      });

    // 3. New assignments published in the last 24 hours (and not submitted yet)
    const newAssignmentNotifications = assignmentsList
      .filter((a) => {
        // check if already submitted
        const isSubmitted = submissionsList.some((s) => s.assignmentId === a.id);
        if (isSubmitted) return false;

        const pubDate = getAssignmentPublishedAtForStudent(a, student?.kelas);
        const isPublished = pubDate <= now;
        const hoursSincePublish = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
        return isPublished && hoursSincePublish >= 0 && hoursSincePublish <= 24;
      })
      .map((a) => {
        const pubDate = getAssignmentPublishedAtForStudent(a, student?.kelas);
        return {
          id: `new_assign_${a.id}`,
          type: "new_assignment",
          title: "Tugas Baru Diterbitkan",
          message: `Tugas "${a.materi}" (${a.bab}) baru saja diterbikan. Silakan kerjakan sebelum tenggat waktu.`,
          timestamp: pubDate.toISOString(),
          assignmentId: a.id,
        };
      });

    // 4. Assignments with deadline in less than 24 hours (and not submitted yet)
    const nearDeadlineNotifications = assignmentsList
      .filter((a) => {
        // check if already submitted
        const isSubmitted = submissionsList.some((s) => s.assignmentId === a.id);
        if (isSubmitted) return false;

        // get relevant deadline
        let deadlineStr = a.deadline;
        if (a.targets && a.targets.length > 0) {
          const tgt = a.targets.find((t: any) => t.kelas === studentKelas);
          if (tgt) deadlineStr = tgt.deadline;
        }
        if (!deadlineStr) return false;

        const dlDate = new Date(deadlineStr);
        const msLeft = dlDate.getTime() - now.getTime();
        const hoursLeft = msLeft / (1000 * 60 * 60);
        // within 24 hours in the future
        return hoursLeft > 0 && hoursLeft <= 24;
      })
      .map((a) => {
        let deadlineStr = a.deadline;
        if (a.targets && a.targets.length > 0) {
          const tgt = a.targets.find((t: any) => t.kelas === studentKelas);
          if (tgt) deadlineStr = tgt.deadline;
        }
        const isValidDeadline = deadlineStr && !isNaN(new Date(deadlineStr).getTime());
        const timeStr = isValidDeadline
          ? new Date(deadlineStr).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        const dateStr = isValidDeadline
          ? new Date(deadlineStr).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            })
          : "";
        return {
          id: `near_deadline_${a.id}`,
          type: "near_deadline",
          title: "Tenggat Kurang 24 Jam",
          message: `Sisa waktu kurang dari 24 jam untuk tugas "${a.materi}"! (${dateStr} pukul ${timeStr}).`,
          timestamp: deadlineStr || new Date().toISOString(),
          assignmentId: a.id,
        };
      });

    // Combine all notification types and ensure unique IDs
    const combinedMap = new Map();
    [
      ...rejectedNotifications,
      ...gradedNotifications,
      ...newAssignmentNotifications,
      ...nearDeadlineNotifications,
    ].forEach((n, idx) => {
      const uniqueId = `${n.id || 'notif'}_${idx}`;
      combinedMap.set(uniqueId, { ...n, id: uniqueId });
    });
    const combined = Array.from(combinedMap.values());

    // Read dismissed keys from localStorage
    const dismissedKey = `dismissed_notifications_${student.nisn}`;
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
    } catch (e) {
      console.warn("Error reading dismissed notifications:", e);
    }

    // Determine unread notifications list
    const unread = combined.filter((n) => !dismissed.includes(n.id));

    setAllNotifications(combined);
    setShowNotifications(unread);
  }, [assignmentsList, submissionsList, finalGradesList, student]);

  // Handle marking a single notification as read and deleting it directly
  const handleDismissNotification = (id: string) => {
    if (!student) return;
    const dismissedKey = `dismissed_notifications_${student.nisn}`;
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
    } catch (e) { console.warn("Error parsing stored data:", e); }

    const newDismissed = Array.from(new Set([...dismissed, id]));
    localStorage.setItem(dismissedKey, JSON.stringify(newDismissed));

    setShowNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Handle marking all current notifications as read
  const handleDismissAllNotifications = () => {
    if (!student) return;
    const dismissedKey = `dismissed_notifications_${student.nisn}`;
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
    } catch (e) { console.warn("Error parsing stored data:", e); }

    // Add currently visible notification IDs
    const newDismissed = Array.from(
      new Set([...dismissed, ...allNotifications.map((n) => n.id)]),
    );
    localStorage.setItem(dismissedKey, JSON.stringify(newDismissed));

    // Clear unread notifications list & close modal
    setShowNotifications([]);
    setIsNotificationsOpen(false);
  };

  const isDataError = errAnnouncements || errAssignments || errSubmissions || errFinalGrades || errExams;

  if (isLoadingInitialData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#85cc00] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyiapkan Dasbor...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-800 mb-4">
            Siswa tidak ditemukan, silakan login kembali.
          </p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="rounded-2xl bg-[#85cc00] px-4 py-2 text-slate-950 font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#85cc00]/20"
            >
            Kembali ke Login
          </button>
        </div>

      </div>
    );
  }

  const allMenus = [
    { id: "dashboard", label: "Beranda", icon: Home },
    { id: "simulasi", label: "Simulasi", icon: Gamepad2 },
    { id: "daftar-tugas", label: "Tugas Siswa", icon: FileText },
    { id: "nilai-siswa", label: "Nilai Siswa", icon: BarChart3 },
    { id: "kehadiran", label: "Kehadiran Siswa", icon: Clock },
    { id: "materi", label: "Materi Ajar", icon: BookOpen },
    { id: "ujian-online", label: "Ujian Online", icon: FileEdit },
  ];

  const menus = allMenus.filter(m => m.id !== "simulasi" || isSimulasiEnabled);

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
    type: "spring",
    stiffness: 180,
    damping: 24,
    mass: 1,
  };

  const handleFileChange = (e: any) => {
    const file: File | null = e.target.files?.[0] || null;
    setUploadMessage(null);
    if (file) {
      if (!file.type || !file.type.startsWith("image/")) {
        setUploadMessage({
          text: "Hanya menerima file gambar / foto (JPG/PNG).",
          type: "error",
        });
        setSelectedFile("");
        e.target.value = ""; // reset
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setUploadMessage({
          text: "Ukuran maksimal file adalah 2MB.",
          type: "error",
        });
        setSelectedFile("");
        e.target.value = ""; // reset
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedFile(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedTugas) {
      setUploadMessage({
        text: "Silakan pilih file gambar terlebih dahulu.",
        type: "error",
      });
      return;
    }

    setIsUploading(true);
    setUploadMessage({
      text: "Mengompresi dan mengunggah gambar...",
      type: "warning",
    });

    try {
      const base64Data = selectedFile;
      const submissionId = `SUB-${student.nisn}-${selectedTugas.id}`;
      const existingSub = submissionsList.find((s: any) => s.id === submissionId);
      const initialSubmittedAt = existingSub?.submittedAt || existingSub?.createdAt || new Date().toISOString();
      const nowIso = new Date().toISOString();

      const isPerbaikan = !!existingSub && (existingSub.status === "ditolak" || existingSub.wasRejected === true || !!existingSub.keterangan);

      const newSubmissionObj = {
        id: submissionId,
        assignmentId: selectedTugas.id,
        nisn: student.nisn,
        studentName: student.name || student.displayName || "Siswa",
        kelas: student.kelas || null,
        fileName: "tugas_gambar.jpg",
        fileUrl: base64Data, // Save Base64 data as the URL for demo
        submittedAt: initialSubmittedAt,
        updatedAt: nowIso,
        resubmittedAt: isPerbaikan ? nowIso : null,
        wasRejected: isPerbaikan || existingSub?.wasRejected || false,
        keterangan: "",
        status: "menunggu penilaian guru",
      };

      const cacheKey = `firas_cache_submissions_${student.nisn}`;
      const currentList = Array.isArray(submissionsList) ? submissionsList : [];
      const updatedList = [
        ...currentList.filter((s: any) => s.id !== submissionId && String(s.assignmentId) !== String(selectedTugas.id)),
        newSubmissionObj
      ];

      // Optimistic update
      setRealtimeSubmissions(updatedList);
      setLocalCache(cacheKey, updatedList);
      mutateSubmissions(updatedList, false);

      await setDoc(
        doc(db, "submissions", submissionId),
        newSubmissionObj,
        { merge: true },
      );

      trackUsage(0, 1); // Track write
      setRealtimeSubmissions(updatedList);
      setLocalCache(cacheKey, updatedList);
      mutateSubmissions(updatedList, false);

      setUploadMessage({
        text: "Tugas berhasil dikumpulkan!",
        type: "success",
      });
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadMessage(null);
        setSelectedFile(null);
      }, 2000);
    } catch (error: any) {
      if (error?.message?.includes("too large")) {
        setUploadMessage({
          text: "Ukuran file terlalu besar untuk database. Coba kecilkan ukuran foto.",
          type: "error",
        });
      } else {
        setUploadMessage({
          text: "Terjadi kesalahan saat mengumpulkan tugas.",
          type: "error",
        });
      }
      console.warn(error);
    } finally {
      setIsUploading(false);
    }
  };

  const isExamOn = activeExam && !examResult;

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-550 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#85cc00] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm font-medium">Memverifikasi Hak Akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-700 relative flex flex-col overflow-x-hidden">
      <NotificationModal
        {...modalConfig}
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
      {isAiChatOpen && (
        <Suspense fallback={null}>
          <AiChatModal
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            studentName={student?.displayName || student?.name || student?.nama || student?.studentName || "Siswa"}
            studentPhotoUrl={student?.profilePhotoUrl || ""}
          />
        </Suspense>
      )}

      {newAssignmentToast && (
        <Toast 
          message={`Tugas Baru Tersedia: ${newAssignmentToast.title}`}
          type="success"
          onClose={() => setNewAssignmentToast(null)}
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 pb-24 sm:pb-28">

      {/* Main Content */}
        {/* Notifications Modal */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <motion.div 
              key="notification-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
              onClick={() => {
                if (showNotifications.length > 0) {
                  handleDismissAllNotifications();
                } else {
                  setIsNotificationsOpen(false);
                }
              }}
            >
              <motion.div 
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 ring-1 ring-slate-900/5 p-8 max-w-md w-full shadow-2xl overflow-hidden"
              >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#85cc00]/10 rounded-xl">
                        <Bell className="w-5 h-5 text-[#85cc00]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-slate-900 tracking-tight">Pemberitahuan</h3>
                    </div>
                    <button 
                      onClick={() => {
                        if (showNotifications.length > 0) {
                          handleDismissAllNotifications();
                        } else {
                          setIsNotificationsOpen(false);
                        }
                      }} 
                      className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-50 rounded-xl active:scale-95 cursor-pointer"
                    >
                      <X className="w-5 h-5"/>
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1 mb-8">
                    {showNotifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-medium text-slate-500 italic">
                          Tidak ada pemberitahuan baru saat ini.
                        </p>
                      </div>
                    ) : (
                      showNotifications.map((n, i) => {
                        const isRejected = n.type === "rejected";
                        const isGraded = n.type === "graded";
                        const isNewAssignment = n.type === "new_assignment";
                        const isNearDeadline = n.type === "near_deadline";

                        let bgClass = "bg-slate-50 border-slate-100";
                        let iconClass = "bg-slate-100 text-slate-600";
                        let titleColor = "text-slate-950";
                        let icon = <Award className="w-5 h-5" />;

                        if (isRejected) {
                          bgClass = "bg-rose-50 border-rose-100";
                          iconClass = "bg-rose-100 text-rose-600";
                          titleColor = "text-rose-950";
                          icon = <AlertCircle className="w-5 h-5" />;
                        } else if (isGraded) {
                          bgClass = "bg-emerald-50 border-emerald-100";
                          iconClass = "bg-emerald-100 text-emerald-600";
                          titleColor = "text-emerald-950";
                          icon = <Award className="w-5 h-5" />;
                        } else if (isNewAssignment) {
                          bgClass = "bg-sky-50 border-sky-100";
                          iconClass = "bg-sky-100 text-sky-600";
                          titleColor = "text-sky-950";
                          icon = <Sparkles className="w-5 h-5" />;
                        } else if (isNearDeadline) {
                          bgClass = "bg-amber-50 border-amber-100";
                          iconClass = "bg-amber-100 text-amber-600";
                          titleColor = "text-amber-950";
                          icon = <Clock className="w-5 h-5" />;
                        }

                        return (
                          <div
                            key={`notif-${n.id || i}-${i}`}
                            onClick={() => {
                              if (n.assignmentId) {
                                const matchingTask = assignmentsList.find((a: any) => String(a.id || "").trim() === String(n.assignmentId || "").trim());
                                if (matchingTask) {
                                  const matchingSub = submissionsList.find((s: any) => String(s.assignmentId || "").trim() === String(n.assignmentId || "").trim());
                                  setViewingTugas({ ...matchingTask, submission: matchingSub });
                                  setIsNotificationsOpen(false);
                                }
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-2xl border-2 ${bgClass} flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-200 relative group ${n.assignmentId ? "cursor-pointer hover:border-emerald-300" : ""}`}
                          >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${iconClass}`}>
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-black tracking-tight ${titleColor}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed break-words">
                                  {n.message}
                                </p>
                                {n.assignmentId && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-2 hover:underline">
                                    <span>Lihat Detail Hasil →</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissNotification(n.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-white rounded-lg transition-all active:scale-95 cursor-pointer shrink-0 align-middle self-center"
                              title="Hapus pemberitahuan"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-3">
                    {showNotifications.length > 0 && (
                      <button
                        onClick={handleDismissAllNotifications}
                        className="flex-1 rounded-2xl bg-black px-4 py-3.5 text-center text-[12px] font-black uppercase tracking-wider text-white hover:bg-slate-850 active:scale-95 transition-all font-display cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (showNotifications.length > 0) {
                          handleDismissAllNotifications();
                        } else {
                          setIsNotificationsOpen(false);
                        }
                      }}
                      className={`rounded-2xl border-2 border-slate-200 px-5 py-3.5 text-center text-[12px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 hover:text-black active:scale-95 transition-all font-display cursor-pointer ${
                        showNotifications.length === 0 ? "w-full" : ""
                      }`}
                    >
                      Tutup
                    </button>
                  </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Photo Update Modal */}
        <AnimatePresence>
          {isProfileModalOpen && (
            <motion.div 
              key="profile-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            >
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
                   onClick={() => setIsProfileModalOpen(false)}></div>
              <motion.div 
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 ring-1 ring-slate-900/5 p-8 max-w-md w-full shadow-2xl overflow-hidden relative z-10"
              >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#85cc00]/10 rounded-xl">
                        <User className="w-5 h-5 text-[#85cc00]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-slate-900 tracking-tight">Update Profil</h3>
                    </div>
                    <button 
                      onClick={() => setIsProfileModalOpen(false)} 
                      className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-50 rounded-xl active:scale-95 cursor-pointer"
                    >
                      <X className="w-5 h-5"/>
                    </button>
                  </div>

                  <div className="space-y-4 mb-8">
                    {/* Live Preview Avatar */}
                    <div className="flex flex-col items-center justify-center my-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#85cc00] shadow-md bg-white flex items-center justify-center relative">
                        {tempPhotoUrl.trim() ? (
                          <img
                            src={getDriveImageUrl(tempPhotoUrl.trim())}
                            alt="Pratinjau Foto"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                        ) : (
                          <User className="w-12 h-12 text-slate-400" />
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Pratinjau Foto Profil</p>
                    </div>

                    {student.profilePhotoUrl && (
                      <div className="flex justify-end mb-1">
                        <button
                          onClick={() => {
                            showConfirm(
                              "Hapus Foto Profil",
                              "Apakah Anda yakin ingin menghapus foto profil saat ini?",
                              async () => {
                                setIsSaving(true);
                                try {
                                  const { id, ...dataToSave } = student;
                                  const updatedStudent = { ...dataToSave, profilePhotoUrl: "" };
                                  await setDoc(doc(db, "studentsByNisn", student.id), updatedStudent, { merge: true });
                                  setStudent({ id, ...updatedStudent });
                                  try {
                                    localStorage.setItem("current_student", JSON.stringify({ id, ...updatedStudent }));
                                  } catch (e) { console.warn("Error parsing stored data:", e); }
                                  setTempPhotoUrl("");
                                  setIsProfileLinkDisabled(false);
                                  showAlert("Berhasil", "Foto profil Anda telah dihapus.", "alert");
                                  setIsProfileModalOpen(false);
                                } catch (error) {
                                  showAlert("Kesalahan", "Gagal menghapus foto", "danger");
                                } finally {
                                  setIsSaving(false);
                                }
                              }
                            );
                          }}
                          disabled={isSaving}
                          className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" /> Hapus Foto
                        </button>
                      </div>
                    )}
                    
                    <input
                      type="url"
                      placeholder="Tempel Link Foto (Google Drive/Lainnya)"
                      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#85cc00]/20 disabled:bg-slate-100 disabled:opacity-50 font-sans"
                      value={tempPhotoUrl}
                      onChange={(e) => setTempPhotoUrl(e.target.value)}
                      disabled={isProfileLinkDisabled}
                    />
                  </div>

                  <div className="flex gap-3">
                    {isProfileLinkDisabled ? (
                      <button
                        onClick={() => setIsProfileLinkDisabled(false)}
                        className="flex-1 rounded-2xl bg-amber-500 text-white px-4 py-3.5 text-center text-[12px] font-black uppercase tracking-wider hover:bg-amber-600 active:scale-95 transition-all font-display cursor-pointer"
                      >
                        Edit Link
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const cleanUrl = tempPhotoUrl.trim();
                          if (!cleanUrl) {
                            showAlert("Perhatian", "Silakan masukkan URL foto terlebih dahulu", "danger");
                            return;
                          }
                          setIsSaving(true);
                          try {
                            const { id, ...dataToSave } = student;
                            const updatedStudent = { ...dataToSave, profilePhotoUrl: cleanUrl };
                            await setDoc(doc(db, "studentsByNisn", student.id), updatedStudent, { merge: true });
                            const fullUpdated = { id, ...updatedStudent };
                            setStudent(fullUpdated);
                            try {
                              localStorage.setItem("current_student", JSON.stringify(fullUpdated));
                            } catch (e) { console.warn("Error parsing stored data:", e); }
                            setIsProfileLinkDisabled(true);
                            showAlert("Berhasil", "Foto profil berhasil diperbarui", "alert");
                          } catch (e) {
                            showAlert("Kesalahan", "Gagal menyimpan foto profil", "danger");
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="flex-1 rounded-2xl bg-[#85cc00] text-slate-900 px-4 py-3.5 text-center text-[12px] font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all font-display cursor-pointer"
                      >
                        {isSaving ? "Menyimpan..." : "Simpan"}
                      </button>
                    )}
                  </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden relative z-0">
        {!isExamOn && (
          <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-xs shrink-0">
            {/* Left: Logo & Sipinter App */}
            <button
              type="button"
              onClick={() => {
                setIsSchoolInfoOpen(false);
                setIsGradedInfoOpen(false);
                setActiveMenu("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3 text-left cursor-pointer group"
              title="Kembali ke Beranda"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
                <img loading="lazy" 
                  src={getDriveImageUrl("https://drive.google.com/file/d/1P395tuZymxs3qero4XduMpHy7g2GJrdR/view?usp=sharing")}
                  alt="Logo Sipinter"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-[#85cc00] font-display uppercase group-hover:opacity-85 transition-opacity whitespace-nowrap">
                  SiPinter App
                </h1>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-[0.18em] leading-none whitespace-nowrap block">
                  INFORMATIKA
                </span>
              </div>
            </button>

            {/* Supabase Background Sync Status Indicator */}
            <div className={`hidden md:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-2xs border ${
              onlineStatus
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${onlineStatus ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="truncate">
                {onlineStatus ? "Supabase: Terhubung (Sync)" : "Mode Offline (Lokal)"}
              </span>
            </div>

            {/* Right: Sync, Refresh & Logout */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Tombol Sinkronisasi Data */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSyncData}
                  disabled={isSyncingData}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-2xs border ${
                    isSyncingData
                      ? "bg-[#85cc00] text-white border-[#85cc00] ring-4 ring-[#85cc00]/25 scale-95"
                      : "bg-[#85cc00]/10 hover:bg-[#85cc00]/20 active:scale-95 text-[#85cc00] border-[#85cc00]/30"
                  }`}
                  title="Sinkronkan Data Server"
                >
                  <RefreshCw className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isSyncingData ? "animate-spin" : ""}`} />
                </button>
                <span className={`text-[9px] sm:text-[10px] font-bold tracking-tight text-center mt-1 select-none whitespace-nowrap ${
                  isSyncingData ? "text-[#6ca600] animate-pulse" : "text-slate-500"
                }`}>
                  {isSyncingData ? "Sinkron..." : "Sinkron"}
                </span>
              </div>

              {/* Tombol Refresh Halaman */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs border border-slate-200/80"
                  title="Muat Ulang Halaman (Refresh)"
                >
                  <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
                </button>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-tight text-center mt-1 select-none whitespace-nowrap">
                  Refresh
                </span>
              </div>

              {/* Tombol Keluar */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center text-rose-600 cursor-pointer shadow-2xs border border-rose-200/50"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-tight text-center mt-1 select-none whitespace-nowrap">
                  Keluar
                </span>
              </div>
            </div>
          </header>
        )}

        <div 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 ${activeMenu === 'dashboard' || activeMenu === 'simulasi' ? 'p-0 pb-28 sm:pb-32' : 'p-4 sm:p-6 md:p-8 pb-28 sm:pb-32'} relative flex flex-col`}
        >
          <div className={`mx-auto w-full max-w-full ${activeMenu === 'dashboard' || activeMenu === 'simulasi' ? 'p-0' : 'px-4 sm:px-6 md:px-8 py-4'} relative z-10 flex-grow`}>
            {isOffline && (
              <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 text-xs font-semibold text-amber-800 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <div>
                  <p className="font-bold text-amber-950">Akses Data Terhambat (Mode Offline)</p>
                  <p className="text-amber-700/90 font-medium mt-0.5">Sistem memuat sinkronisasi tersimpan dari memori lokal karena koneksi server lambat.</p>
                </div>
              </div>
            )}
          {examResult ? (
            <div className="bg-white rounded-[2.5rem] p-8 md:p-16 border border-slate-200 text-center shadow-xl shadow-slate-200/50 w-full max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 mx-auto bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center shadow-inner mb-8">
                <CheckCircle2 className={`w-12 h-12 ${examResult.passed ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Hasil Evaluasi</p>
              <h2 className="text-4xl font-display font-medium text-slate-900 tracking-tight leading-none mb-6">
                Ujian Selesai
              </h2>
              {examResult.wasTimeOut && (
                <div className="inline-block px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 text-xs font-black uppercase mb-8 tracking-wider">
                  Waktu Ujian Habis
                </div>
              )}
              
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Judul Ujian</span>
                  <span className="text-sm font-bold text-slate-900">{examResult.examTitle || "Ujian"}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Bab Pelajaran</span>
                  <span className="text-sm font-bold text-slate-900">
                    {examResult.bab || (examResult.examTitle?.includes(" - ") ? examResult.examTitle.split(" - ")[1] : "Informatika")}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase">Nilai Akhir</span>
                  <span className="text-2xl font-black text-slate-900">{examResult.score}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-black text-slate-500 uppercase">Status</span>
                  <span className={`text-sm font-black uppercase tracking-widest ${examResult.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {examResult.passed ? 'Memenuhi KKM' : 'Belum Lulus'}
                  </span>
                </div>
                {examResult.needsManualGrading && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold text-left flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Nilai di atas merupakan skor otomatis sementara karena terdapat soal esai yang menunggu koreksi dari Guru mata pelajaran.
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-12">
                <button
                  onClick={() => {
                    setExamResult(null);
                    setActiveExam(null);
                    setActiveMenu("ujian-online");
                  }}
                  className="px-8 py-4 bg-[#85cc00] shadow-md shadow-[#85cc00]/20 hover:bg-[#72b000] active:scale-95 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all border border-slate-900/10"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : !isExamOn ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 15, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.995 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full bg-transparent border-none shadow-none p-0 relative"
              >
               {activeMenu === "dashboard" && (
                <div className="w-full animate-in fade-in duration-300">

                  {/* STUDENT PROFILE SECTION (Soft Background Matching Page Background) */}
                  <div className="w-full bg-gradient-to-b from-white via-slate-50/70 to-slate-50 pt-6 pb-6 px-4 sm:px-6">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                      {/* Photo Container - Square (Kotak) with rounded corners */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setTempPhotoUrl(student?.profilePhotoUrl || "");
                            setIsProfileLinkDisabled(!!student?.profilePhotoUrl);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl border-4 border-white shadow-lg shadow-emerald-950/5 ring-1 ring-slate-200/50 overflow-hidden shrink-0 bg-slate-50 relative block cursor-pointer hover:scale-[1.01] active:scale-95 transition-all"
                          title="Klik untuk melihat atau memperbarui foto profil"
                        >
                          {student?.profilePhotoUrl ? (
                            <img
                              loading="lazy"
                              src={getDriveImageUrl(student.profilePhotoUrl)}
                              alt={student?.displayName || "Siswa"}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-teal-50/60 to-slate-50 flex items-center justify-center text-emerald-800 font-black text-4xl sm:text-5xl">
                              {student?.displayName ? student.displayName.charAt(0).toUpperCase() : "S"}
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Student Name & NIS & Kelas Beneath the Photo */}
                      <div className="mt-4 text-center space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight font-display">
                          {student?.displayName || student?.name || "Nama Siswa"}
                        </h2>
                        <p className="text-xs font-bold text-emerald-700 tracking-wider">
                          {student?.nisn || "-"}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          {academicPeriod.academicYear} | {academicPeriod.semester}
                        </p>
                        <p className="text-xs font-bold text-slate-500 tracking-wider">
                          {student?.kelas || "-"}
                        </p>
                        <p className="text-xs sm:text-sm font-medium italic text-slate-600 mt-2.5 px-4 leading-relaxed max-w-md mx-auto">
                          &ldquo;{motivationalQuote}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BODY CONTAINER */}
                  <div className="pt-6 sm:pt-8 px-4 sm:px-6 max-w-4xl mx-auto space-y-7 pb-12">
                    {/* Status Banner (Sakit/Izin/Alpa Hari Ini) */}
                    <AnimatePresence>
                      {todayAttendance && dismissedStatusDate !== todayAttendance.date && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-5 rounded-3xl border flex items-start gap-4 shadow-lg ${
                            todayAttendance.type === "hadir"
                              ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                              : todayAttendance.type === "sakit" 
                              ? "bg-blue-50 border-blue-100 text-blue-900" 
                              : todayAttendance.type === "izin"
                              ? "bg-amber-50 border-amber-100 text-amber-900"
                              : todayAttendance.type === "dispen"
                              ? "bg-purple-50 border-purple-100 text-purple-900"
                              : "bg-rose-50 border-rose-100 text-rose-900"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            todayAttendance.type === "hadir"
                              ? "bg-emerald-500 text-white"
                              : todayAttendance.type === "sakit" 
                              ? "bg-blue-500 text-white" 
                              : todayAttendance.type === "izin"
                              ? "bg-amber-500 text-white"
                              : todayAttendance.type === "dispen"
                              ? "bg-purple-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}>
                            {todayAttendance.type === "hadir" ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : todayAttendance.type === "sakit" ? (
                              <HeartPulse className="w-6 h-6" />
                            ) : todayAttendance.type === "izin" ? (
                              <FileText className="w-6 h-6" />
                            ) : todayAttendance.type === "dispen" ? (
                              <ShieldCheck className="w-6 h-6" />
                            ) : (
                              <AlertOctagon className="w-6 h-6" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black uppercase tracking-widest mb-1">
                              {todayAttendance.title}
                            </h4>
                            <p className="text-sm font-bold opacity-80 leading-relaxed">
                              {todayAttendance.text}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDismissStatusBanner(todayAttendance.date)}
                            className="p-2 text-slate-500 hover:bg-white/50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            title="Tutup Peringatan"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Menu Utama Grid: Tugas, Nilai, Kehadiran, Materi, Ujian Online, Simulasi */}
                    <section className="space-y-4">
                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.05
                            }
                          }
                        }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4.5 transform-gpu"
                      >
                        {[
                          { 
                            id: "daftar-tugas", 
                            title: "Tugas Siswa", 
                            subtitle: "Daftar & kirim tugas", 
                            icon: ClipboardList, 
                            color: "amber",
                            badge: uncompletedTasksCount,
                            order: 2
                          },
                          { 
                            id: "nilai-siswa", 
                            title: "Nilai Siswa", 
                            subtitle: "Nilai Rapor & Rekap", 
                            icon: Award, 
                            color: "blue",
                            badge: reportCardGrade?.finalScore,
                            order: 3
                          },
                          { 
                            id: "kehadiran", 
                            title: "Kehadiran", 
                            subtitle: "Presensi harian siswa", 
                            icon: CheckCircle2, 
                            color: "emerald",
                            badge: attendanceSummary ? `${attendanceSummary.percentage}%` : null,
                            order: 4
                          },
                          { 
                            id: "materi", 
                            title: "Materi Ajar", 
                            subtitle: "Modul pembelajaran", 
                            icon: BookOpen, 
                            color: "sky",
                            order: 5
                          },
                          { 
                            id: "ujian-online", 
                            title: "Ujian Online", 
                            subtitle: "CBT & evaluasi", 
                            icon: MonitorPlay, 
                            color: "purple",
                            order: 6
                          },
                          { 
                            id: "simulasi", 
                            title: "Simulasi", 
                            subtitle: isSimulasiEnabled ? "BK & minat bakat" : "Belum diaktifkan", 
                            icon: Gamepad2, 
                            color: "fuchsia",
                            isDisabled: !isSimulasiEnabled,
                            order: 1
                          }
                        ].map((item, idx) => {
                          const Icon = item.icon;
                          const colorClasses: Record<string, string> = {
                            amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300 hover:bg-amber-50/60 group-hover:bg-amber-500 group-hover:text-white",
                            blue: "bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300 hover:bg-blue-50/60 group-hover:bg-blue-600 group-hover:text-white",
                            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/60 group-hover:bg-emerald-500 group-hover:text-white",
                            sky: "bg-sky-50 text-sky-600 border-sky-100 hover:border-sky-300 hover:bg-sky-50/60 group-hover:bg-sky-600 group-hover:text-white",
                            purple: "bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300 hover:bg-purple-50/60 group-hover:bg-purple-600 group-hover:text-white",
                            fuchsia: item.isDisabled ? "bg-slate-200 text-slate-400 border-slate-300" : "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 hover:border-fuchsia-300 hover:bg-fuchsia-50/60 group-hover:bg-fuchsia-600 group-hover:text-white"
                          };

                          const baseColorClass = colorClasses[item.color].split(' hover:')[0];
                          const hoverColorClass = colorClasses[item.color].split(' hover:')[1] ? 'hover:' + colorClasses[item.color].split(' hover:')[1] : '';
                          const iconBgHoverClass = colorClasses[item.color].split(' group-hover:')[1] ? 'group-hover:' + colorClasses[item.color].split(' group-hover:')[1] : '';

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              variants={{
                                hidden: { y: 20, opacity: 0 },
                                visible: { 
                                  y: 0, 
                                  opacity: 1,
                                  transition: { type: "spring", stiffness: 260, damping: 20 }
                                }
                              }}
                              whileHover={{ scale: 1.02, y: -4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                if (item.isDisabled) {
                                  alert("Menu Simulasi belum diaktifkan oleh Guru. Silakan tunggu hingga guru mengaktifkannya.");
                                  return;
                                }
                                handleMenuChange(item.id as any, item.order);
                              }}
                              className={`bg-white ${item.isDisabled ? 'opacity-60 grayscale cursor-not-allowed border-slate-200' : 'cursor-pointer ' + hoverColorClass + ' border-' + item.color + '-100'} border-2 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-colors duration-150 transform-gpu will-change-transform shadow-xs hover:shadow-md group relative min-h-[145px] sm:min-h-[160px]`}
                            >
                              {item.badge !== undefined && item.badge !== null && (
                                <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 bg-${item.color}-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs`}>
                                  {item.badge}
                                </span>
                              )}
                              {item.isDisabled && (
                                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-400 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-xs">
                                  Nonaktif
                                </span>
                              )}
                              <div className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center shadow-xs transition-all duration-200 transform-gpu ${baseColorClass.replace('bg-white ', '')} ${iconBgHoverClass.replace(' group-hover:bg-white', '')} group-hover:scale-110`}>
                                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <span className={`text-xs sm:text-sm font-black ${item.isDisabled ? 'text-slate-500' : 'text-slate-700 group-hover:text-' + item.color + '-700'} leading-tight mt-3 transition-colors`}>
                                {item.title}
                              </span>
                              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1">
                                {item.subtitle}
                              </span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </section>
                  </div>
                </div>
              )}
              
              {/* Profil Siswa */}
              {activeMenu === "profil" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-tight">Profil Siswa</h2>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Informasi lengkap mengenai data diri dan akademik Anda.</p>
                    </div>
                  </div>

                  {/* Main Card */}
                  <div className="bg-gradient-to-br from-white to-[#85cc00]/6 rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row gap-12 items-center md:items-start relative overflow-hidden">
                    {/* Photo & Basic Info */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 flex-1 w-full">
                      <div className="relative shrink-0">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl bg-emerald-50">
                          {student?.profilePhotoUrl ? (
                            <img loading="lazy" 
                              src={getDriveImageUrl(student.profilePhotoUrl)} 
                              alt="Profile" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#e4e6eb] flex items-center justify-center">
                              <User className="w-[120%] h-[120%] text-[#aeb4bb] translate-y-2" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setTempPhotoUrl(student?.profilePhotoUrl || ""); setIsProfileModalOpen(true); }} className="absolute bottom-4 right-2 w-10 h-10 bg-[#85cc00] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#74b300] transition-colors cursor-pointer">
                          <Camera className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col flex-1 text-center md:text-left w-full pt-2">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-1">
                          <h3 className="text-3xl font-bold text-slate-900">{student?.name || "Budi Santoso"}</h3>
                          <span className="px-3 py-1 bg-[#85cc00]/10 text-emerald-700 text-xs font-bold rounded-full border border-[#85cc00]/20">Siswa Aktif</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-8">NIS : {student?.nis || "2023001234"}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Tanggal Lahir</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">12 Maret 2008</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Kelas</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">{student?.class || "XI IPA 1"}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Jenis Kelamin</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">Laki-laki</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Sekolah</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">SMA Negeri 1 Bandung</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 shrink-0 border border-rose-100">
                              <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Golongan Darah</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">O</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs text-slate-500 font-medium">Tahun Ajaran</span>
                              <span className="text-sm font-semibold text-slate-900 mt-0.5">2024 / 2025</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quote Box */}
                    <div className="w-full md:w-72 shrink-0 bg-[#f4f7fb] rounded-3xl p-8 flex flex-col justify-center h-full min-h-[220px]">
                      <Quote className="w-8 h-8 text-blue-300 mb-6" />
                      <p className="text-sm font-medium text-slate-700 leading-relaxed mb-6">
                        Belajar hari ini, sukses esok hari.
                      </p>
                      <div className="font-['Dancing_Script',cursive] text-3xl text-blue-400 mt-auto opacity-80" style={{ fontFamily: "cursive" }}>
                        {student?.name || "Budi Santoso"}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-nowrap overflow-x-auto items-center gap-2 border-b border-slate-200 mt-8 pb-px custom-scrollbar">
                    {["Data Pribadi", "Kontak & Alamat", "Orang Tua / Wali", "Riwayat Akademik", "Dokumen"].map((tab, tabIdx) => (
                      <button 
                        key={`prof-tab-${tab}-${tabIdx}`}
                        onClick={() => setActiveProfileTab(tab)}
                        className={`px-4 py-4 text-sm font-semibold transition-colors relative whitespace-nowrap cursor-pointer ${activeProfileTab === tab ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {tab === "Data Pribadi" && <User className="w-4.5 h-4.5" />}
                          {tab === "Kontak & Alamat" && <Phone className="w-4.5 h-4.5" />}
                          {tab === "Orang Tua / Wali" && <Users className="w-4.5 h-4.5" />}
                          {tab === "Riwayat Akademik" && <GraduationCap className="w-4.5 h-4.5" />}
                          {tab === "Dokumen" && <FileText className="w-4.5 h-4.5" />}
                          {tab}
                        </div>
                        {activeProfileTab === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {activeProfileTab === "Data Pribadi" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Informasi Pribadi */}
                      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 flex flex-col h-full shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-bold text-slate-900">Informasi Pribadi</h4>
                          {isEditingPribadi && (
                            <button 
                              onClick={() => setIsEditingPribadi(false)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                          )}
                        </div>
                        <div className="space-y-0 flex-1">
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4 first:pt-0">
                            <div className="flex items-center gap-3 text-slate-500">
                              <User className="w-4 h-4" /> Nama Lengkap
                            </div>
                            {isEditingPribadi ? (
                              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2" />
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.name || "Budi Santoso"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <FileText className="w-4 h-4" /> NIS
                            </div>
                            <span className="font-semibold text-slate-900 text-right">{student?.nis || "2023001234"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <MapPin className="w-4 h-4" /> Tempat Lahir
                            </div>
                            {isEditingPribadi ? (
                              <input type="text" value={editTempatLahir} onChange={(e) => setEditTempatLahir(e.target.value)} placeholder="Contoh: Bandung" className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2" />
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.tempatLahir || "Bandung"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <Calendar className="w-4 h-4" /> Tanggal Lahir
                            </div>
                            {isEditingPribadi ? (
                              <input type="date" value={editTanggalLahir} onChange={(e) => setEditTanggalLahir(e.target.value)} className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2" />
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.tanggalLahir || "12 Maret 2008"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <Users className="w-4 h-4" /> Jenis Kelamin
                            </div>
                            {isEditingPribadi ? (
                              <select value={editJenisKelamin} onChange={(e) => setEditJenisKelamin(e.target.value)} className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2">
                                <option value="">Pilih...</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.jenisKelamin || "Laki-laki"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm border-b border-slate-100 py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <Moon className="w-4 h-4" /> Agama
                            </div>
                            {isEditingPribadi ? (
                              <input type="text" value={editAgama} onChange={(e) => setEditAgama(e.target.value)} placeholder="Contoh: Islam" className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2" />
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.agama || "Islam"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm py-4">
                            <div className="flex items-center gap-3 text-slate-500">
                              <Globe2 className="w-4 h-4" /> Kewarganegaraan
                            </div>
                            {isEditingPribadi ? (
                              <input type="text" value={editKewarganegaraan} onChange={(e) => setEditKewarganegaraan(e.target.value)} placeholder="Contoh: Indonesia" className="font-semibold text-slate-900 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-sky-400 w-1/2" />
                            ) : (
                              <span className="font-semibold text-slate-900 text-right">{student?.kewarganegaraan || "Indonesia"}</span>
                            )}
                          </div>
                        </div>
                        {isEditingPribadi ? (
                          <button onClick={() => handleSaveProfileData("pribadi")} disabled={isSavingProfile} className="w-full py-3 mt-4 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                            {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingPribadi(true)} className="w-full py-3 mt-4 text-blue-600 font-semibold text-sm rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <Edit3 className="w-4 h-4" /> Edit Data Pribadi
                          </button>
                        )}
                      </div>

                      {/* Tentang Saya */}
                      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 flex flex-col h-full shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-bold text-slate-900">Tentang Saya</h4>
                          {isEditingTentang && (
                            <button 
                              onClick={() => setIsEditingTentang(false)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                          )}
                        </div>
                        <div className="space-y-6 flex-1">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Gamepad2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-2 font-medium">Hobi <span className="text-slate-400 font-normal">(Pisahkan dengan koma)</span></p>
                              {isEditingTentang ? (
                                <input type="text" value={editHobi} onChange={(e) => setEditHobi(e.target.value)} placeholder="Membaca, Basket" className="font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-sky-400 w-full" />
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(student?.hobi || "Membaca, Basket").split(",").map((h: string, idx: number) => (
                                    <span key={`hobby-${idx}-${h.trim()}`} className="px-3 py-1 bg-slate-50 text-slate-700 text-xs rounded-full border border-slate-200 font-medium">{h.trim()}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Target className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-1 font-medium">Cita-cita</p>
                              {isEditingTentang ? (
                                <input type="text" value={editCitaCita} onChange={(e) => setEditCitaCita(e.target.value)} placeholder="Contoh: Software Engineer" className="font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-sky-400 w-full" />
                              ) : (
                                <span className="text-sm font-semibold text-slate-900">{student?.citaCita || "Software Engineer"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <Lightbulb className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-1 font-medium">Motto</p>
                              {isEditingTentang ? (
                                <textarea value={editMotto} onChange={(e) => setEditMotto(e.target.value)} rows={2} className="font-semibold text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-sky-400 w-full resize-none"></textarea>
                              ) : (
                                <span className="text-sm font-medium text-slate-700 leading-relaxed block">{student?.motto || "Terus belajar dan jangan menyerah"}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                              <AlignLeft className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-1 font-medium">Deskripsi</p>
                              {isEditingTentang ? (
                                <textarea value={editDeskripsi} onChange={(e) => setEditDeskripsi(e.target.value)} rows={3} className="font-semibold text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded px-3 py-2 outline-none focus:border-sky-400 w-full resize-none"></textarea>
                              ) : (
                                <span className="text-sm font-medium text-slate-700 leading-relaxed block">{student?.deskripsi || "Saya adalah siswa yang suka belajar hal baru dan berusaha memberikan yang terbaik."}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isEditingTentang ? (
                          <button onClick={() => handleSaveProfileData("tentang")} disabled={isSavingProfile} className="w-full py-3 mt-4 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                            {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingTentang(true)} className="w-full py-3 mt-4 text-blue-600 font-semibold text-sm rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <Edit3 className="w-4 h-4" /> Edit Tentang Saya
                          </button>
                        )}
                      </div>

                      {/* Statistik Singkat */}
                      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 flex flex-col h-full shadow-sm">
                        <h4 className="text-lg font-bold text-slate-900 mb-6">Statistik Singkat</h4>
                        <div className="space-y-4 flex-1">
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <BookOpen className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500">Kehadiran</p>
                                <p className="text-xl font-bold text-slate-900 mt-0.5">{attendanceSummary ? attendanceSummary.percentage : "92"}%</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-600">Baik</span>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500">Tugas Selesai</p>
                                <p className="text-xl font-bold text-slate-900 mt-0.5">18</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-purple-600">Dari 20</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alert Banner */}
                  <div className="bg-[#effef9] rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 justify-between mt-8 border border-[#c1ebd9]">
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-teal-100 to-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">Jaga data pribadimu dengan baik</h4>
                        <p className="text-sm font-medium text-slate-600 mt-1">Pastikan informasi yang kamu berikan benar dan selalu perbarui jika ada perubahan.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveProfileTab("Data Pribadi");
                        setIsEditingPribadi(true);
                      }}
                      className="whitespace-nowrap px-6 py-3.5 bg-white text-emerald-600 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer mt-4 sm:mt-0 w-full sm:w-auto justify-center"
                    >
                      <ShieldCheck className="w-4 h-4" /> Perbarui Data
                    </button>
                  </div>
                </div>
              )}

              {/* Tugas Siswa (Daftar Tugas) Menu */}
              {activeMenu === "daftar-tugas" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  {/* Title & Header Section */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight leading-tight">Daftar Tugas {selectedSubject}</h2>
                      <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                        Kelola dan pantau status pengumpulan tugas Anda secara real-time.
                      </p>
                    </div>
                  </div>

                  {/* FRAME INFORMASI (Tugas Ditolak / Petunjuk Informasi Tugas) */}
                  {rejectedTasks.length > 0 ? (
                    <div className="space-y-4">
                      {rejectedTasks.map((task, idx) => (
                        <div 
                          key={`rejected-alert-${task.id || idx}_${idx}`}
                          className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300"
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                              <AlertOctagon className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                                Informasi: Tugas Ditolak Guru ❌
                              </h4>
                              <p className="text-sm font-extrabold text-slate-800">
                                {task.materi} ({task.bab})
                              </p>
                              <div className="bg-white border border-rose-100 rounded-xl p-3 text-xs text-slate-700 mt-2 leading-relaxed shadow-3xs">
                                <span className="font-bold text-rose-600 block mb-0.5">Alasan Penolakan:</span>
                                &ldquo;{task.submission?.keterangan || task.submission?.feedback || "Tidak ada alasan spesifik yang dicantumkan."}&rdquo;
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            <button
                              onClick={() => {
                                setSelectedTugas(task);
                                setSelectedFile(task.submission?.fileUrl || "");
                                setIsUploadModalOpen(true);
                              }}
                              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-rose-500"
                            >
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              Unggah Ulang
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}




                  {/* Search Bar for Assignments (Title, Teacher Name, Subject) */}
                  <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari tugas berdasarkan judul, bab, atau pengampu (Agan Parta)..."
                      className="w-full bg-white border-2 border-slate-200 focus:border-[#85cc00] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm font-bold text-slate-800 outline-none shadow-3xs transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-xl cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pill Buttons */}
                  <div className="flex items-center gap-2.5 pb-2 overflow-x-auto custom-scrollbar border-b border-slate-200/80">
                    {[
                      { 
                        id: "semua", 
                        label: "Semua", 
                        count: totalTasksCount,
                        icon: <FileText className="w-3.5 h-3.5" />,
                        activeClass: "bg-slate-900 text-white border-slate-900 shadow-xs" 
                      },
                      { 
                        id: "selesai", 
                        label: "Selesai", 
                        count: selesaiTasksCount,
                        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                        activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                      },
                      { 
                        id: "belum_dikerjakan", 
                        label: "Belum Dikerjakan", 
                        count: belumDikerjakanTasksCount,
                        icon: <Hourglass className="w-3.5 h-3.5" />,
                        activeClass: "bg-amber-500 text-white border-amber-500 shadow-xs" 
                      },
                      { 
                        id: "ditolak", 
                        label: "Ditolak", 
                        count: ditolakTasksCount,
                        icon: <AlertOctagon className="w-3.5 h-3.5" />,
                        activeClass: "bg-rose-600 text-white border-rose-600 shadow-xs" 
                      }
                    ].map((tab) => {
                      const isActive = taskFilter === tab.id;
                      return (
                        <button
                          key={`filter-pill-${tab.id}`}
                          type="button"
                          onClick={() => {
                            setTaskFilter(tab.id as any);
                            setVisibleTasksCount(10);
                          }}
                          className={`px-4 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border active:scale-95 ${
                            isActive 
                              ? tab.activeClass 
                              : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200/90 shadow-3xs"
                          }`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* INDIVIDUAL WIDE COLOR-CODED TASK FRAMES (No Outer Container Frame) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-black text-slate-900">Daftar Tugas {selectedSubject}</h3>
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        {displayedTasks.length} Tugas Tersedia
                      </span>
                    </div>

                    {displayedTasks.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-3">
                        <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                          <FileText className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">Tidak ada tugas ditemukan</p>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Silakan pilih filter lain di atas.</p>
                      </div>
                    ) : (
                      /* Vertical Scroll Container for Individual Wide Task Frames */
                      <div className="overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar space-y-4 pr-1">
                        {displayedTasks.slice(0, visibleTasksCount).map((task, idx) => {
                          const currentSubmission = task.submission || submissionsList.find((s: any) => {
                            const matchAsg = String(s.assignmentId || "").trim() === String(task.id || "").trim() ||
                              s.id === `SUB-${student?.nisn}-${task.id}` ||
                              s.id === `SUB-${student?.nis}-${task.id}` ||
                              s.id === `SUB-${student?.id}-${task.id}` ||
                              (s.id && (s.id.endsWith(`-${task.id}`) || s.id.includes(task.id)));
                            const matchStudent = isSameNisn(s.nisn, student?.nisn) || isSameNisn(s.nis, student?.nisn) || !s.nisn;
                            return matchAsg && matchStudent;
                          }) || null;

                          const matchedGrade = finalGradesList.find((f: any) => {
                            const matchAsg = String(f.assignmentId || f.examId || "").trim() === String(task.id || "").trim();
                            const matchStudent = isSameNisn(f.nisn, student?.nisn) || isSameNisn(f.nis, student?.nisn);
                            return matchAsg && matchStudent;
                          });

                          const taskGrade = (currentSubmission?.nilai !== undefined && currentSubmission?.nilai !== null && currentSubmission?.nilai !== "")
                            ? currentSubmission.nilai
                            : (matchedGrade?.nilai ?? matchedGrade?.score ?? task.gradeVal ?? task.nilai ?? null);

                          const isGraded = taskGrade !== null && taskGrade !== undefined && taskGrade !== "";
                          const isSubmitted = !!currentSubmission || !!matchedGrade || isGraded;
                          const isRejected = currentSubmission?.status === "ditolak";

                          const babTasks = filteredTasksBySubject
                            .filter(t => t.bab === task.bab)
                            .sort((a, b) => new Date(a.publishedAt || "").getTime() - new Date(b.publishedAt || "").getTime());
                          const sequentialNo = babTasks.findIndex(t => t.id === task.id) + 1;

                          const publishedDate = task.publishedAt ? (
                            typeof task.publishedAt === "string" && task.publishedAt.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(task.publishedAt) ?
                              (() => {
                                const p = task.publishedAt.split("-");
                                return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                              })() :
                              new Date(task.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          ) : "-";

                          const subDate = currentSubmission?.submittedAt || task.submission?.submittedAt;
                          const submittedDate = subDate ? new Date(subDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          }) + ", " + new Date(subDate).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit"
                          }) + " WIB" : null;

                          return (
                            <div 
                              key={`task-wide-frame-${task.id || idx}-${idx}`}
                              className={`w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-[3px] transition-all duration-200 flex flex-col md:flex-row md:items-stretch gap-6 relative overflow-hidden ${
                                isRejected
                                  ? "bg-rose-50/90 border-rose-500 shadow-sm"
                                  : isSubmitted
                                  ? "bg-emerald-50/70 border-emerald-500 shadow-sm"
                                  : "bg-amber-50/50 border-amber-500 shadow-sm"
                              }`}
                            >
                              {/* Left & Center Info Section */}
                              <div className="space-y-3 flex-1 min-w-0">
                                {/* Header Badges Row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                                    {task.bab}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                    Tugas {sequentialNo}
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1 ml-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Tanggal Terbit Tugas: {publishedDate}</span>
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                                  {task.title}
                                </h3>

                                {/* Rejection Reason (If Status is Ditolak) */}
                                {isRejected && (
                                  <div className="p-3 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed shadow-2xs">
                                    <span className="font-extrabold text-rose-600 block mb-0.5">Alasan Penolakan dari Guru:</span>
                                    &ldquo;{currentSubmission?.keterangan || currentSubmission?.feedback || "Tugas perlu diperbaiki. Silakan unggah ulang tugas Anda."}&rdquo;
                                  </div>
                                )}

                                {/* Tanggal Kirim Info */}
                                <div className="flex items-center gap-3 flex-wrap text-xs pt-0.5 font-semibold text-slate-700">
                                  <div className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-3xs">
                                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-slate-500 font-bold">Tanggal Kirim:</span>
                                    {submittedDate ? (
                                      <span className="font-extrabold text-emerald-800">{submittedDate}</span>
                                    ) : (
                                       <span className="text-slate-400 italic font-bold">Belum Dikerjakan</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Side: Nilai (Besar, tanpa /100) & Tombol Instruksi Tugas */}
                              {/* 2. Middle Section: Nilai (Centered) */}
                              <div className="flex flex-col items-center justify-center shrink-0 md:px-8 py-4 md:py-0 border-y md:border-y-0 md:border-x border-slate-200/50 min-w-[140px]">
                                {/* Nilai dalam Ukuran Besar (Tanpa / 100) */}
                                <div className="flex flex-col items-start sm:items-center md:items-end">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                                    Nilai
                                  </span>
                                  {isGraded ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="px-3.5 py-1 bg-white border-2 border-emerald-300 rounded-2xl shadow-2xs text-center">
                                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none tracking-tight">
                                          {taskGrade}
                                        </span>
                                      </div>
                                      <p className="text-[9px] font-bold text-slate-500 text-center max-w-[120px] leading-snug mt-1">
                                        {Number(taskGrade) === 100 ? "Terimakasih sudah bekerja keras dan menjunjung tinggi integritas dengan tidak menggunakan AI." :
                                         Number(taskGrade) >= 95 ? "Luar biasa! Hasil kerja yang sangat memuaskan." :
                                         Number(taskGrade) >= 90 ? "Hebat! Terus pertahankan kualitas kerja Anda." :
                                         Number(taskGrade) >= 85 ? "Bagus! Sedikit lagi menuju sempurna." :
                                         Number(taskGrade) >= 80 ? "Cukup baik, mari tingkatkan lagi di tugas berikutnya." :
                                         Number(taskGrade) >= 75 ? "Tuntas! Namun pastikan kedepannya untuk tidak terlambat mengumpulkan tugas ya." :
                                         "Mari terus belajar dan berusaha lebih baik lagi."}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400 italic">
                                      {isSubmitted ? "Menunggu Dinilai Oleh Guru" : "Belum Ada Nilai"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 3. Right Section: Action Buttons */}
                              <div className="flex flex-col gap-2 shrink-0 min-w-[140px] justify-center">
                                {(() => {
                                  const rawLink = task.taskLink || task.linkTugas || task.fileUrl || task.driveUrl;
                                  const hrefUrl = rawLink
                                    ? (rawLink.startsWith("http://") || rawLink.startsWith("https://") ? rawLink : `https://${rawLink}`)
                                    : null;

                                  if (hrefUrl) {
                                    return (
                                      <a
                                        href={hrefUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-slate-200 shadow-3xs"
                                        title="Instruksi Tugas"
                                      >
                                        <BookOpen className="w-4 h-4 text-emerald-600" />
                                        <span>Instruksi Tugas</span>
                                      </a>
                                    );
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        alert(`Instruksi Tugas "${task.title}":\n${task.deskripsi || task.description || "Silakan pelajari instruksi yang telah diberikan oleh Guru."}`);
                                      }}
                                      className="w-full px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-slate-200 shadow-3xs"
                                    >
                                      <BookOpen className="w-4 h-4 text-emerald-600" />
                                      <span>Instruksi Tugas</span>
                                    </button>
                                  );
                                })()}

                                {isRejected ? (
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedTugas(task); setSelectedFile(""); setIsUploadModalOpen(true); }}
                                    className="w-full px-4 py-2.5 bg-rose-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all hover:bg-rose-700 active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-rose-200"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Kirim Ulang</span>
                                  </button>
                                ) : !isSubmitted ? (
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedTugas(task); setSelectedFile(""); setIsUploadModalOpen(true); }}
                                    className="w-full px-4 py-2.5 bg-slate-900 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all hover:bg-emerald-600 active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-slate-200"
                                  >
                                    <Upload className="w-4 h-4" />
                                    <span>Kumpulkan</span>
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                          {/* "Muat Lebih Banyak" / Collapse Button */}
                          {displayedTasks.length > 5 && (
                            <div className="pt-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (visibleTasksCount >= displayedTasks.length) {
                                    setVisibleTasksCount(5);
                                  } else {
                                    setVisibleTasksCount(displayedTasks.length);
                                  }
                                }}
                                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                              >
                                {visibleTasksCount >= displayedTasks.length ? (
                                  <>
                                    Sembunyikan <ChevronUp className="w-4 h-4 text-slate-400" />
                                  </>
                                ) : (
                                  <>
                                    Muat Lebih Banyak <ChevronDown className="w-4 h-4 text-slate-400" />
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                  </div>
                </div>
              )}

              {/* Nilai Siswa Menu */}
              {activeMenu === "nilai-siswa" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-6 gap-4">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-tight">Nilai Siswa</h2>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Kumpulan nilai dari setiap tugas yang telah Anda kerjakan.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isDownloadingRaporPdf}
                      onClick={async () => {
                        if (!student) return;
                        setIsDownloadingRaporPdf(true);
                        try {
                          const stats = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Dispen: 0 };
                          let totalMeetings = 0;
                          absensiList.forEach((a: any) => {
                            const s = a.data?.[student.nisn];
                            if (s) {
                              if (s === "Hadir") stats.Hadir++;
                              else if (s === "Sakit") stats.Sakit++;
                              else if (s === "Izin") stats.Izin++;
                              else if (s === "Alpa") stats.Alpa++;
                              else if (s === "Dispen") stats.Dispen++;
                              totalMeetings++;
                            }
                          });
                          const attended = stats.Hadir + stats.Dispen;
                          const persentase = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

                          const freshTeacherSettings = await fetchLatestTeacherProfileSettings();

                          await generateStudentRaporPdf({
                            student,
                            userSettings: {
                              ...teacherProfileSettings,
                              ...freshTeacherSettings,
                              academicYear:
                                freshTeacherSettings.academicYear ||
                                academicPeriod.academicYear ||
                                teacherProfileSettings.academicYear,
                              semester:
                                freshTeacherSettings.semester ||
                                academicPeriod.semester ||
                                teacherProfileSettings.semester,
                            },
                            rubric,
                            attendanceStats: {
                              hadir: stats.Hadir,
                              sakit: stats.Sakit,
                              izin: stats.Izin,
                              alpa: stats.Alpa,
                              dispen: stats.Dispen,
                              total: totalMeetings,
                              persentase,
                            },
                            gradeItems: combinedGrades.map((g: any) => ({
                              title: g.title || "-",
                              type: g.type || "-",
                              bab: g.bab || "-",
                              tanggal: g.tanggal || "-",
                              nilai: Number(g.nilai) || 0,
                            })),
                            componentScores: reportCardGrade
                              ? {
                                  nilaiKehadiran: reportCardGrade.nilaiKehadiran,
                                  avgTugas: reportCardGrade.avgTugas,
                                  nilaiUts: reportCardGrade.nilaiUts,
                                  nilaiUas: reportCardGrade.nilaiUas,
                                }
                              : undefined,
                            finalRaporScore: reportCardGrade?.finalScore ?? rataRataSemester ?? 0,
                            kkm: 75,
                          });
                          setSyncToastMessage("Rapor Nilai & Presensi PDF berhasil diunduh!");
                          setTimeout(() => setSyncToastMessage(""), 3000);
                        } catch (err) {
                          console.error("Gagal mencetak rapor siswa:", err);
                        } finally {
                          setIsDownloadingRaporPdf(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-900/15 active:scale-95 transition-all cursor-pointer disabled:opacity-60 self-start md:self-auto"
                    >
                      <Download className="w-4 h-4 text-[#85cc00]" />
                      <span>{isDownloadingRaporPdf ? "Membuat PDF..." : "Unduh Rapor PDF"}</span>
                    </button>
                  </div>
                  
                  {/* Filters & Controls */}

                  {/* Table & Stats Content Section */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                      <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-8 py-6 relative gap-4">
                        <div className="w-1.5 h-8 bg-[#85cc00] rounded-full"></div>
                        <div>
                          <span className="font-black text-slate-900 text-base tracking-widest uppercase block">Rubrik & Kalkulasi Nilai Rapor Akhir</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Informasi bobot penilaian & kalkulasi skor Anda secara real-time.</p>
                        </div>
                      </div>
                      <div className="p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                          {/* Rubrik Cards - 2 Columns x 2 Rows */}
                           <div className="md:col-span-7 grid grid-cols-2 gap-4">
                             <div className="p-5 rounded-3xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between group hover:bg-white hover:shadow-lg transition-all duration-300">
                               <div>
                                 <div className="flex justify-between items-start mb-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Kehadiran ({rubric.kehadiran}%)</span>
                                   <Users className="w-4 h-4 text-emerald-500 opacity-40" />
                                 </div>
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-3xl font-display font-black text-emerald-600">{reportCardGrade?.nilaiKehadiran || 0}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-2 font-medium">Presensi: {reportCardGrade?.hadirCount || 0} dari {reportCardGrade?.totalMeetings || 0}</p>
                               </div>
                             </div>

                             <div className="p-5 rounded-3xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between group hover:bg-white hover:shadow-lg transition-all duration-300">
                               <div>
                                 <div className="flex justify-between items-start mb-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Tugas ({rubric.tugas}%)</span>
                                   <BookOpen className="w-4 h-4 text-blue-500 opacity-40" />
                                 </div>
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-3xl font-display font-black text-blue-600">{reportCardGrade?.avgTugas || 0}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-2 font-medium">Rata-rata Tugas & Ujian Harian.</p>
                               </div>
                             </div>

                             <div className="p-5 rounded-3xl border border-amber-100 bg-amber-50/50 flex flex-col justify-between group hover:bg-white hover:shadow-lg transition-all duration-300">
                               <div>
                                 <div className="flex justify-between items-start mb-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">PTS / UTS ({rubric.uts}%)</span>
                                   <Star className="w-4 h-4 text-amber-500 opacity-40" />
                                 </div>
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-3xl font-display font-black text-amber-600">{reportCardGrade?.nilaiUts || 0}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-2 font-medium">Penilaian Tengah Semester (PTS / UTS).</p>
                                </div>
                             </div>

                             <div className="p-5 rounded-3xl border border-rose-100 bg-rose-50/50 flex flex-col justify-between group hover:bg-white hover:shadow-lg transition-all duration-300">
                               <div>
                                 <div className="flex justify-between items-start mb-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">PAS / SAS / UAS ({rubric.uas}%)</span>
                                   <Award className="w-4 h-4 text-rose-500 opacity-40" />
                                 </div>
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-3xl font-display font-black text-rose-600">{reportCardGrade?.nilaiUas || 0}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-2 font-medium">Penilaian Sumatif Akhir Semester.</p>
                               </div>
                             </div>
                          </div>

                          {/* Nilai Akhir Display - Right Column */}
                          <div className="md:col-span-5 flex flex-col h-full">
                            <div className="bg-gradient-to-br from-[#85cc00] to-[#74b300] rounded-[2rem] p-8 text-slate-950 flex flex-col items-center justify-center gap-6 relative overflow-hidden shadow-2xl shadow-[#85cc00]/20 flex-1 min-h-[300px]">
                              {/* Decorative Elements */}
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                              
                              <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2.5rem] bg-white flex flex-col items-center justify-center text-slate-950 shadow-2xl z-10 scale-110">
                                <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1 opacity-60">SKOR AKHIR</span>
                                <span className="text-4xl md:text-5xl font-display font-black leading-none">{reportCardGrade?.finalScore || 0}</span>
                              </div>

                              <div className="text-center z-10 flex flex-col items-center">
                                <h4 className="text-lg md:text-xl font-black tracking-tight leading-tight uppercase">ESTIMASI NILAI RAPOR</h4>
                                <p className="text-[10px] text-slate-900/60 font-black mt-1 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                  REAL-TIME CALCULATION
                                </p>
                                <p className="text-[11px] text-slate-900/80 font-medium bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl mt-2 max-w-[280px] text-center leading-snug border border-white/30">
                                  *Catatan: Nilai ini merupakan estimasi sementara sebelum seluruh tugas dan ujian selesai dilaksanakan.
                                </p>
                              </div>

                              <div className="flex flex-col items-center gap-3 z-10 w-full max-w-[280px]">
                                 {(() => {
                                   const score = reportCardGrade?.finalScore || 0;
                                   let label = "DI BAWAH KKM";
                                   let color = "text-rose-700";
                                   let bg = "bg-white/90";
                                   let border = "border-rose-200";
                                   
                                   if (score >= 92) {
                                     label = "SANGAT BAIK (A)";
                                     color = "text-emerald-700";
                                     border = "border-emerald-200";
                                   } else if (score >= 84) {
                                     label = "BAIK (B)";
                                     color = "text-blue-700";
                                     border = "border-blue-200";
                                   } else if (score >= 75) {
                                     label = "CUKUP / TUNTAS (C)";
                                     color = "text-slate-800";
                                     border = "border-slate-200";
                                   }
                                   
                                   return (
                                     <>
                                       <div className={`px-6 py-4 rounded-2xl border-2 ${bg} ${border} ${color} font-black text-sm tracking-[0.2em] whitespace-nowrap flex items-center justify-center text-center w-full shadow-sm`}>
                                         {label}
                                       </div>
                                       <p className="text-[10px] text-slate-900/40 font-bold uppercase tracking-widest text-center">KKM STANDAR: 75</p>
                                     </>
                                   );
                                 })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex border-b border-t border-slate-100 bg-slate-50/50 justify-center items-center px-8 py-5 relative">
                        <span className="font-extrabold text-slate-800 text-sm tracking-wider uppercase text-center">Rekapitulasi Nilai Tugas & Ujian</span>
                        <div className="absolute right-8 hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-xl">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                          <span>Informatika</span>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6 space-y-4">
                        {combinedGrades.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-3">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                              <Award className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest">Belum ada nilai yang terdata</p>
                          </div>
                        ) : (
                          combinedGrades.map((g, idx) => {
                            const score = g.nilai;
                            const isExcellent = score >= 92;
                            const isGood = score >= 84 && score < 92;
                            const isPassing = score >= 75 && score < 84;
                            
                            let predikatLabel = "Kurang (D)";
                            let cardBg = "bg-rose-50/70 border-rose-500 text-rose-900";
                            if (isExcellent) {
                              predikatLabel = "Sangat Baik (A)";
                              cardBg = "bg-emerald-50/70 border-emerald-500 text-emerald-900";
                            } else if (isGood) {
                              predikatLabel = "Baik (B)";
                              cardBg = "bg-blue-50/70 border-blue-500 text-blue-900";
                            } else if (isPassing) {
                              predikatLabel = "Cukup (C)";
                              cardBg = "bg-amber-50/70 border-amber-500 text-amber-900";
                            }

                            let sequentialText = "-";
                            if (g.type === "Tugas") {
                              const babTasks = assignmentsList
                                .filter((a: any) => (a.bab || "Informatika") === g.bab)
                                .sort((a: any, b: any) => new Date(a.publishedAt || a.createdAt || "").getTime() - new Date(b.publishedAt || b.createdAt || "").getTime());
                              const seqNo = babTasks.findIndex((a: any) => a.id === g.id) + 1;
                              sequentialText = seqNo > 0 ? `Tugas ${seqNo}` : "Tugas -";
                            } else {
                              sequentialText = "Ujian CBT";
                            }

                            return (
                              <div
                                key={`grade-frame-${g.type}-${g.id || idx}-${idx}`}
                                className={`w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-[3px] transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden ${cardBg} shadow-sm`}
                              >
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                                      {g.bab || "Informatika"}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                      {sequentialText}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${g.type === 'Ujian' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                      {g.type}
                                    </span>
                                  </div>
                                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                                    {g.title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-3xs">
                                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Tanggal: {g.tanggal || "-"}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm justify-between md:justify-center">
                                  <div className="text-center px-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Nilai Skor</span>
                                    <span className="text-3xl font-display font-black text-slate-900">{score}</span>
                                  </div>
                                  <div className="text-center px-4 border-l border-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Predikat</span>
                                    <span className="text-xs font-black uppercase text-slate-900 tracking-wider">{predikatLabel}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      

                  </div>

                  {/* Rubrik Penilaian Predikat */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Rubrik Penilaian Predikat</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center gap-2">
                        <span className="text-2xl font-black text-emerald-600">A</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-tight">Rentang Nilai</p>
                          <p className="text-xs font-bold text-slate-600">92 - 100</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase">Sangat Baik</span>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center text-center gap-2">
                        <span className="text-2xl font-black text-blue-600">B</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-blue-700 tracking-tight">Rentang Nilai</p>
                          <p className="text-xs font-bold text-slate-600">84 - 91</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-500 text-white text-[9px] font-black rounded-lg uppercase">Baik</span>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col items-center text-center gap-2">
                        <span className="text-2xl font-black text-amber-600">C</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-amber-700 tracking-tight">Rentang Nilai</p>
                          <p className="text-xs font-bold text-slate-600">75 - 83</p>
                        </div>
                        <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg uppercase">Cukup</span>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-2">
                        <span className="text-2xl font-black text-rose-600">D</span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase text-rose-700 tracking-tight">Rentang Nilai</p>
                          <p className="text-xs font-bold text-slate-600">{'<'} 75</p>
                        </div>
                        <span className="px-3 py-1 bg-rose-500 text-white text-[9px] font-black rounded-lg uppercase">Kurang</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Bento Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:border-emerald-200 transition-all group">
                         <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-7 h-7" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nilai Tertinggi</p>
                            <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent mt-1 leading-none pb-0.5">
                              {nilaiTertinggi > 0 ? nilaiTertinggi.toFixed(1) : "0"}
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 line-clamp-2 break-words whitespace-normal leading-tight" title={highestGradeTitle}>
                              {highestGradeTitle}
                            </p>
                         </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:border-amber-200 transition-all group">
                         <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-7 h-7" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nilai Terendah</p>
                            <p className="text-2xl font-extrabold bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent mt-1 leading-none pb-0.5">
                              {nilaiTerendah > 0 ? nilaiTerendah.toFixed(1) : "0"}
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 line-clamp-2 break-words whitespace-normal leading-tight" title={lowestGradeTitle}>
                              {lowestGradeTitle}
                            </p>
                         </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:border-purple-200 transition-all group">
                         <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-110 transition-transform">
                            <ClipboardList className="w-7 h-7" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tugas</p>
                            <p className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent mt-1 leading-none pb-0.5">{combinedGrades.length}</p>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 line-clamp-2 break-words whitespace-normal leading-tight">
                              {combinedGrades.length > 0 ? "Tugas & Ujian" : "Belum ada nilai"}
                            </p>
                         </div>
                      </div>
                  </div>
                </div>
              )}

              {/* Kehadiran Menu */}
              {activeMenu === "kehadiran" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-6 gap-4">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-tight">Kehadiran Siswa</h2>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Pantau kedisplinan dan riwayat kehadiran Anda.</p>
                    </div>
                  </div>

                  {/* Summary Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                      { label: "Hadir", value: attendanceSummary?.Hadir || 0, color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 },
                      { label: "Sakit", value: attendanceSummary?.Sakit || 0, color: "bg-blue-50 text-blue-600 border-blue-100", icon: HeartPulse },
                      { label: "Izin", value: attendanceSummary?.Izin || 0, color: "bg-amber-50 text-amber-600 border-amber-100", icon: FileText },
                      { label: "Alpa", value: attendanceSummary?.Alpa || 0, color: "bg-rose-50 text-rose-600 border-rose-100", icon: AlertCircle },
                      { label: "Dispen", value: attendanceSummary?.Dispen || 0, color: "bg-purple-50 text-purple-600 border-purple-100", icon: ShieldCheck },
                      { label: "Total Hadir", value: (attendanceSummary?.percentage || "0") + "%", color: "bg-indigo-50 text-indigo-600 border-indigo-100", icon: TrendingUp },
                    ].map((stat, idx) => (
                      <div key={`att-stat-item-${stat.label || idx}-${idx}`} className={`p-4 rounded-2xl border-2 shadow-sm flex flex-col items-center justify-center text-center gap-2 ${stat.color}`}>
                        <stat.icon className="w-5 h-5 opacity-80" />
                        <div className="flex flex-col">
                          <span className="text-2xl font-black">{stat.value}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Donut Chart Card */}
                    <div className="md:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-8 self-start">Distribusi Kehadiran</h3>
                      <AttendanceDonutChart
                        data={attendanceChartData}
                        centerPercentage={attendanceSummary?.percentage || 0}
                      />
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6">
                        {attendanceChartData.map((entry: any, idx: number) => (
                          <div key={`att-legend-${entry.name || idx}-${idx}`} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats Summary Card */}
                    <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-center relative group">
                       <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                       <div className="flex items-center gap-6 mb-8 relative z-10">
                          <div className="w-16 h-16 rounded-[1.75rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)]">
                             <Calendar className="w-8 h-8" />
                          </div>
                          <div>
                             <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Pertemuan Terdata</h3>
                             <div className="flex items-baseline gap-2">
                               <span className="text-5xl font-black text-slate-900 tracking-tight">
                                 {attendanceSummary?.totalMeetings || 0}
                               </span>
                               <span className="text-sm font-black text-blue-600 uppercase tracking-widest">Pertemuan</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Status Kehadiran</p>
                             <p className="text-lg font-black text-slate-900">{attendanceSummary?.rubricStatus || "Memuat..."}</p>
                             <p className="text-xs font-bold text-emerald-600/70 mt-1">Di atas rata-rata kelas</p>
                          </div>
                          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Update Terakhir</p>
                             <p className="text-lg font-black text-slate-900">Hari ini</p>
                             <p className="text-xs font-bold text-slate-400 mt-1">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* History Table */}
                  <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Log Kehadiran Mendalam</h3>
                    </div>
                    <div className="p-4 sm:p-8">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-200">
                              <th className="py-4 px-4 bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap rounded-tl-2xl">Tanggal / Hari</th>
                              <th className="py-4 px-4 text-center bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                              <th className="py-4 px-4 bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Keterangan</th>
                              <th className="py-4 px-4 text-right bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap rounded-tr-2xl">Diverifikasi Oleh</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {studentAttendanceData.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-20 text-center border-b border-slate-100">
                                  <div className="flex flex-col items-center gap-4 text-slate-300">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                      <Calendar className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Belum ada riwayat kehadiran</p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              studentAttendanceData.map((record, idx) => {
                                const dateObj = new Date(record.date);
                                const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
                                const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                const fullDateStr = `${dayName}, ${dateFormatted}`;
                                
                                let statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
                                if (record.status === "Hadir") statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                else if (record.status === "Sakit") statusBadge = "bg-blue-50 text-blue-700 border-blue-100";
                                else if (record.status === "Izin") statusBadge = "bg-amber-50 text-amber-700 border-amber-100";
                                else if (record.status === "Alpa") statusBadge = "bg-rose-50 text-rose-700 border-rose-100";
                                else if (record.status === "Dispen") statusBadge = "bg-purple-50 text-purple-700 border-purple-100";

                                return (
                                  <tr key={`record-${record.id || idx}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 capitalize">{fullDateStr}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-center whitespace-nowrap">
                                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${statusBadge}`}>
                                        {record.status}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <p className="text-[11px] font-bold text-slate-500 max-w-[200px] truncate" title={record.keterangan || "-"}>
                                        {record.keterangan || "-"}
                                      </p>
                                    </td>
                                    <td className="py-4 px-4 text-right whitespace-nowrap">
                                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{record.teacher}</span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                        {studentAttendanceData.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 font-medium">Belum ada riwayat kehadiran.</div>
                        ) : (
                          studentAttendanceData.map((record, idx) => {
                            const dateObj = new Date(record.date);
                            const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
                            const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                            const fullDateStr = `${dayName}, ${dateFormatted}`;
                            
                            let statusColor = "bg-slate-100 text-slate-600";
                            if (record.status === "Hadir") statusColor = "bg-emerald-50 text-emerald-700";
                            else if (record.status === "Sakit") statusColor = "bg-blue-50 text-blue-700";
                            else if (record.status === "Izin") statusColor = "bg-amber-50 text-amber-700";
                            else if (record.status === "Alpa") statusColor = "bg-rose-50 text-rose-700";
                            else if (record.status === "Dispen") statusColor = "bg-purple-50 text-purple-700";

                            return (
                              <div key={`record-card-${idx}`} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3 shadow-sm">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 font-bold capitalize tracking-wide">{fullDateStr}</span>
                                  <p className="text-xs font-bold text-slate-700 leading-tight truncate max-w-[150px]">{record.keterangan || "Tidak ada keterangan"}</p>
                                  <p className="text-[9px] text-slate-400 font-medium italic">Oleh: {record.teacher}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider border shadow-sm ${statusColor}`}>
                                  {record.status}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Materi Ajar Menu */}
              {activeMenu === "materi" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mt-4 mb-2 gap-4">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-tight">
                        Materi Ajar
                      </h2>
                      <p className="text-sm font-medium text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                        Baca modul PDF dan tonton video pembelajaran langsung di dalam dashboard SiPinter kapan saja.
                      </p>
                    </div>
                  </div>

                  {/* Subject Header Card */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#85cc00]/10 rounded-full -translate-y-1/2 translate-x-1/2 opacity-60 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center relative z-10 shrink-0">
                      <MonitorIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#649c00]" />
                    </div>
                    <div className="flex-1 relative z-10 text-center md:text-left min-w-0">
                      <p className="text-xs font-semibold text-slate-400 tracking-wide">
                        Kelas {student?.kelas || "Informatika"} · Pengampu: Agan Parta, S.Kom.
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight mt-1">
                        Informatika
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
                        {materialStats.total} materi tersedia untuk dipelajari langsung
                      </p>
                    </div>
                    <div className="w-full md:w-72 relative z-10 bg-slate-50/90 p-5 sm:p-6 rounded-3xl border border-slate-200/70 shrink-0">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-semibold text-slate-500">Progress Belajar</span>
                        <span className="text-xl font-display font-black text-slate-900 tabular-nums">{materialStats.percentage}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${materialStats.percentage}%` }}
                          className="h-full bg-[#85cc00] rounded-full"
                        />
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-2.5 tabular-nums">
                        {materialStats.selesai} dari {materialStats.total} materi selesai
                      </p>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Materi", value: materialStats.total, iconColor: "text-slate-700 bg-slate-100", icon: BookOpen },
                      { label: "Selesai", value: materialStats.selesai, iconColor: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
                      { label: "Sedang Dipelajari", value: materialStats.sedang, iconColor: "text-amber-700 bg-amber-50", icon: History },
                      { label: "Belum Dimulai", value: materialStats.belum, iconColor: "text-slate-600 bg-slate-100", icon: AlertCircle },
                    ].map((stat, idx) => (
                      <div key={`mat-stat-box-${stat.label || idx}-${idx}`} className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-3.5 sm:gap-4">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.iconColor}`}>
                          <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xl sm:text-2xl font-display font-black text-slate-900 leading-none tabular-nums">{stat.value}</p>
                          <p className="text-xs font-medium text-slate-500 leading-tight mt-1 truncate">
                            {stat.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Integrated In-App Video Player & PDF Viewer Container */}
                  <div ref={inlineViewerRef} className="scroll-mt-24">
                    <AnimatePresence mode="wait">
                      {selectedInlineMaterial && (() => {
                        const inlineMedia = getMediaEmbedUrl(selectedInlineMaterial.driveUrl, true);
                        const inlineProgress = materialsProgress[selectedInlineMaterial.id];
                        const isInlineDone = inlineProgress?.status === "Selesai" || inlineProgress?.percentage === 100;
                        const isInlineFav = Boolean(inlineProgress?.isFavorite);
                        const isInlineYt = inlineMedia.type === "youtube";
                        const externalOpenUrl = getExternalOpenUrl(selectedInlineMaterial.driveUrl);
                        const directDownloadUrl = getDirectDownloadUrl(selectedInlineMaterial.driveUrl);
                        const compatEmbedUrl = getAlternativePdfEmbedUrl(selectedInlineMaterial.driveUrl);
                        const effectiveEmbedUrl = !isInlineYt && materiViewerMode === "compat"
                          ? compatEmbedUrl
                          : inlineMedia.embedUrl;

                        return (
                          <motion.div
                            key={`inline-viewer-${selectedInlineMaterial.id}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden"
                          >
                            {/* Viewer Header */}
                            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isInlineYt ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                                  {isInlineYt ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <span>{isInlineYt ? "Video YouTube" : "Dokumen PDF / Modul"}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">{selectedInlineMaterial.bab || "Materi Pelajaran"}</span>
                                  </div>
                                  <h3 className="font-display font-bold text-base sm:text-xl text-slate-900 leading-snug mt-0.5 truncate">
                                    {selectedInlineMaterial.title}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavoriteMaterial(selectedInlineMaterial.id)}
                                  className={`h-10 px-3.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                                    isInlineFav
                                      ? "bg-amber-50 border-amber-200 text-amber-700"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <Star className={`w-4 h-4 ${isInlineFav ? "fill-amber-400 text-amber-500" : ""}`} />
                                  <span>{isInlineFav ? "Favorit" : "Simpan"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCompleteMaterial(selectedInlineMaterial.id)}
                                  disabled={isInlineDone}
                                  className={`h-10 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                    isInlineDone
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                                      : "bg-[#85cc00] hover:brightness-105 text-slate-950 shadow-sm active:scale-95 cursor-pointer"
                                  }`}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{isInlineDone ? "Selesai Dipelajari" : "Tandai Selesai"}</span>
                                </button>

                                {!isInlineYt && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMateriViewerMode((prev) => (prev === "primary" ? "compat" : "primary"))
                                    }
                                    className={`h-10 px-3.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                                      materiViewerMode === "compat"
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                    title="Beralih viewer alternatif jika halaman dokumen tidak tampil di iOS atau Android"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>{materiViewerMode === "compat" ? "Mode Utama" : "Mode Alternatif"}</span>
                                  </button>
                                )}

                                {!isInlineYt && (
                                  <a
                                    href={directDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-10 px-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                    title="Unduh file materi ke perangkat Anda"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>Unduh</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setActiveMaterialPreview(selectedInlineMaterial)}
                                  className="h-10 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                                  title="Mode Layar Penuh"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span className="hidden sm:inline">Layar Penuh</span>
                                </button>

                                <a
                                  href={externalOpenUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-10 px-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                  title="Buka langsung di browser/aplikasi perangkat"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>Buka Langsung</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => setSelectedInlineMaterial(null)}
                                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                  aria-label="Tutup pemutar materi"
                                  title="Tutup"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Responsive Media Embed Surface */}
                            <div className="p-4 sm:p-6 bg-slate-50/70 space-y-4">
                              {isInlineYt ? (
                                <div className="w-full max-w-5xl mx-auto aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm">
                                  <iframe
                                    src={effectiveEmbedUrl}
                                    title={selectedInlineMaterial.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                    allowFullScreen
                                    className="w-full h-full border-none"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div
                                    className="w-full h-[65vh] min-h-[420px] sm:h-[72vh] rounded-3xl overflow-auto border border-slate-200 bg-white shadow-sm"
                                    style={{ WebkitOverflowScrolling: "touch" }}
                                  >
                                    <iframe
                                      key={`inline-doc-${selectedInlineMaterial.id}-${materiViewerMode}`}
                                      src={effectiveEmbedUrl}
                                      title={selectedInlineMaterial.title}
                                      allow="autoplay; fullscreen"
                                      allowFullScreen
                                      className="w-full h-full border-none"
                                    />
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-2xl px-4 py-3 border border-slate-200/80 text-xs text-slate-600">
                                    <span className="leading-relaxed">
                                      Jika dokumen tidak bergulir penuh di iOS (iPhone/iPad) atau Android, gunakan <strong>Mode Alternatif</strong>, <strong>Buka Langsung</strong>, atau <strong>Unduh</strong>.
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <a
                                        href={externalOpenUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Buka Langsung</span>
                                      </a>
                                      <a
                                        href={directDownloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-[#85cc00]/15 hover:bg-[#85cc00]/25 text-slate-900 font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Unduh</span>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedInlineMaterial.description && (
                                <div className="bg-white rounded-3xl p-5 border border-slate-200/80">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Ringkasan & Petunjuk Belajar
                                  </h4>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                    {selectedInlineMaterial.description}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Viewer Footer Progress Bar */}
                            <div className="px-5 py-3.5 sm:px-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
                              <span className="text-xs font-medium text-slate-500">
                                Progres materi ini: <strong className="text-slate-900 tabular-nums">{inlineProgress?.percentage || 40}%</strong> · {inlineProgress?.status || "Sedang Dipelajari"}
                              </span>
                              <div className="w-32 sm:w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${isInlineDone ? "bg-emerald-500" : "bg-[#85cc00]"}`}
                                  style={{ width: `${inlineProgress?.percentage || 40}%` }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                  </div>

                  {/* Filter & Search Toolbar */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Segmented Filter Controls */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
                      {[
                        { id: "semua", label: "Semua Materi" },
                        { id: "video", label: "Video YouTube" },
                        { id: "pdf", label: "PDF / Dokumen" },
                        { id: "favorit", label: "Favorit" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMateriTab(tab.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            materiTab === tab.id
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 lg:max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={materiSearch}
                        onChange={(e) => setMateriSearch(e.target.value)}
                        placeholder="Cari judul materi atau bab..."
                        className="w-full h-10 pl-10 pr-9 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#85cc00] focus:ring-4 focus:ring-[#85cc00]/15 outline-none transition-all"
                      />
                      {materiSearch && (
                        <button
                          type="button"
                          onClick={() => setMateriSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          aria-label="Hapus pencarian"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Materials Card Grid Layout with 3xl Border Radius */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                        Koleksi Materi Pembelajaran
                      </h3>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        Menampilkan {filteredMaterials.length} materi
                      </span>
                    </div>

                    {filteredMaterials.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-14 sm:p-16 text-center space-y-3 shadow-sm">
                        <BookOpen className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
                        <p className="font-display font-bold text-base text-slate-700">
                          Materi ajar tidak ditemukan
                        </p>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                          {materiSearch || materiTab !== "semua"
                            ? "Coba ubah kata kunci pencarian atau pilih kategori materi lainnya."
                            : "Materi pembelajaran dari guru akan segera muncul di sini."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                        {filteredMaterials.map((material, idx) => {
                          const progress = materialsProgress[material.id];
                          const status = progress?.status || "Belum Dimulai";
                          const pct = progress?.percentage || 0;
                          const isFav = Boolean(progress?.isFavorite);
                          const isYt = isYouTubeUrl(material.driveUrl);
                          const ytThumb = isYt ? getYouTubeThumbnailUrl(material.driveUrl) : "";
                          const isActive = selectedInlineMaterial?.id === material.id;
                          const isDone = status === "Selesai" || pct === 100;

                          return (
                            <article
                              key={`mat-card-${material.id || idx}-${idx}`}
                              className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                                isActive ? "border-[#85cc00] ring-2 ring-[#85cc00]/25" : "border-slate-200/90 hover:border-slate-300"
                              }`}
                            >
                              <div>
                                {/* Visual Media Preview Header */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenMaterial(material.id, material.driveUrl)}
                                  className="w-full aspect-video relative overflow-hidden bg-slate-100 block text-left cursor-pointer border-b border-slate-100"
                                >
                                  {isYt && ytThumb ? (
                                    <>
                                      <img
                                        src={ytThumb}
                                        alt={material.title}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = "none";
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                                        <div className="w-13 h-13 rounded-full bg-white/95 text-slate-950 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                          <Play className="w-5 h-5 fill-current ml-0.5" />
                                        </div>
                                      </div>
                                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs font-semibold">
                                        <span className="flex items-center gap-1.5 drop-shadow">
                                          <Video className="w-3.5 h-3.5" />
                                          Tonton di Aplikasi
                                        </span>
                                        {isActive && (
                                          <span className="text-[#85cc00] font-bold drop-shadow">Sedang Diputar</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/60 flex flex-col items-center justify-center p-6 relative">
                                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform duration-200 mb-3">
                                        <FileText className="w-7 h-7" />
                                      </div>
                                      <span className="text-xs font-bold text-slate-700">
                                        {isActive ? "Sedang Dibuka" : "Klik untuk Membaca Modul PDF"}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                                        Tampil langsung di dashboard
                                      </span>
                                    </div>
                                  )}
                                </button>

                                {/* Card Body */}
                                <div className="p-6 pb-4">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 min-w-0">
                                      <span className="truncate">{material.bab || "Materi Umum"}</span>
                                      <span aria-hidden="true">·</span>
                                      <span className="shrink-0">{isYt ? "Video" : "PDF"}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFavoriteMaterial(material.id)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                                      aria-label={isFav ? "Hapus dari favorit" : "Simpan ke favorit"}
                                      title={isFav ? "Hapus Favorit" : "Tandai Favorit"}
                                    >
                                      <Star className={`w-4 h-4 ${isFav ? "fill-amber-400 text-amber-500" : ""}`} />
                                    </button>
                                  </div>

                                  <h4 className="font-display font-bold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2">
                                    {material.title}
                                  </h4>

                                  {material.description && (
                                    <p className="text-xs sm:text-sm text-slate-500 font-normal line-clamp-2 leading-relaxed mt-2">
                                      {material.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Card Footer */}
                              <div className="px-6 pb-6 pt-3 border-t border-slate-100 space-y-4">
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                    <span>{status}</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{pct}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-[#85cc00]"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMaterial(material.id, material.driveUrl)}
                                    className="flex-1 h-11 px-4 bg-[#85cc00] hover:brightness-105 text-slate-950 font-bold text-xs rounded-2xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                                  >
                                    {isYt ? <Play className="w-4 h-4 fill-current" /> : <Eye className="w-4 h-4" />}
                                    <span>{isYt ? "Tonton Video" : "Baca PDF"}</span>
                                  </button>

                                  <a
                                    href={getExternalOpenUrl(material.driveUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-11 w-11 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center shrink-0"
                                    title="Buka langsung di browser / aplikasi perangkat (Android & iOS)"
                                    aria-label={`Buka langsung ${material.title}`}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>

                                  {isDone ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMaterialStatus(material.id, "Belum Dimulai")}
                                      className="h-11 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                                      title="Ulangi Progres Belajar"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Ulangi</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteMaterial(material.id)}
                                      className="h-11 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Selesai</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ujian Online Menu */}
              {activeMenu === "ujian-online" && (
                <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-4 pb-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-6 gap-4">
                    <div>
                      <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-tight">Pusat Ujian CBT</h2>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Selesaikan ujian tepat waktu dan jaga integritas.</p>
                    </div>
                  </div>

                  <div className="w-full space-y-6">
                      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
                        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                           <div className="flex items-center gap-3">
                              <MonitorIcon className="w-5 h-5 text-blue-600" />
                              <h3 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-slate-900">Daftar Ujian Aktif & Tersedia</h3>
                           </div>
                        </div>
                        
                        <div className="p-6 sm:p-8">
                          {examsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                              <div className="w-20 h-20 sm:w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                                <FileEdit className="w-10 h-10 sm:w-12 h-12" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-base sm:text-lg font-black text-slate-900">Tidak Ada Ujian Aktif</h4>
                                <p className="text-xs sm:text-sm font-bold text-slate-400 max-w-xs mx-auto">Saat ini belum ada jadwal ujian yang tersedia untuk kelas Anda. Silakan hubungi wali kelas jika ada kekeliruan.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Mobile View */}
                              <div className="md:hidden space-y-4">
                                {examsList.map((exam: any, idx: number) => {
                                  const finalGrade = finalGradesList.find(f => f.assignmentId === exam.id && f.nisn === student?.nisn);
                                  const isFinished = !!finalGrade;
                                  const violations = finalGrade?.violationCount || finalGrade?.violationsCount || 0;
                                  const nilai = finalGrade?.nilai !== undefined ? finalGrade.nilai : "-";
                                  
                                  const getIntegrityStatus = (v: number) => {
                                    if (v === 0) return { text: "Sangat Berintegritas", color: "text-emerald-700 font-extrabold" };
                                    if (v <= 2) return { text: "Berintegritas", color: "text-blue-700 font-extrabold" };
                                    if (v <= 4) return { text: "Cukup Berintegritas", color: "text-amber-700 font-extrabold" };
                                    return { text: "Kurang Berintegritas", color: "text-rose-700 font-extrabold" };
                                  };
                                  
                                  const integrity = getIntegrityStatus(violations);

                                  return (
                                    <div key={`exam-card-${exam.id || "ex"}-${idx}`} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">{idx + 1}</span>
                                            <p className="font-black text-slate-900 text-sm leading-tight">{exam.title}</p>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-8">{exam.bab || "BAB BELUM DIATUR"}</p>
                                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider pl-8">{exam.subject}</p>
                                        </div>
                                        {isFinished && (
                                           <div className="text-right">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nilai</p>
                                              <p className="text-xl font-black text-slate-900 leading-none">{nilai}</p>
                                           </div>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
                                        <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jenis Ujian</p>
                                          <p className="text-[11px] font-bold text-slate-600">{exam.category || exam.type || "Pilihan Ganda"}</p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pelanggaran</p>
                                          <p className="text-[11px] font-bold text-slate-600">{isFinished ? `${violations} Kali` : "-"}</p>
                                        </div>
                                      </div>

                                      {isFinished && (
                                        <div className="pt-1">
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status Integritas</p>
                                          <span className={`inline-flex items-center text-[10px] ${integrity.color}`}>
                                            {integrity.text}
                                          </span>
                                        </div>
                                      )}

                                      <div className="pt-2">
                                        {isFinished ? (
                                          <button disabled className="w-full py-3 bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed border border-slate-200">
                                            Ujian Selesai
                                          </button>
                                        ) : (
                                          <button 
                                            onClick={() => {
                                              setSelectedExamForToken(exam);
                                              setTokenInput("");
                                              setExamTokenError("");
                                            }}
                                            className="w-full py-3 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg active:scale-95 transition-all"
                                          >
                                            Mulai Ujian Sekarang
                                          </button>
                                        )}
                                      </div>

                                      {exam.externalQuizUrl && (
                                        <a
                                          href={exam.externalQuizUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Unduh Soal PDF
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Desktop View */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-slate-200">
                                      <th className="py-4 px-4 text-center w-16 bg-slate-50 rounded-tl-2xl font-black text-xs text-slate-500 uppercase tracking-widest">No</th>
                                      <th className="py-4 px-4 bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Nama Bab</th>
                                      <th className="py-4 px-4 text-center bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Jenis Ujian</th>
                                      <th className="py-4 px-4 text-center bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Pelanggaran</th>
                                      <th className="py-4 px-4 text-center bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Status Integritas</th>
                                      <th className="py-4 px-4 text-center bg-slate-50 font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Nilai</th>
                                      <th className="py-4 px-4 text-center bg-slate-50 rounded-tr-2xl font-black text-xs text-slate-500 uppercase tracking-widest whitespace-nowrap">Status Ujian</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {examsList.map((exam: any, idx: number) => {
                                      const finalGrade = finalGradesList.find(f => f.assignmentId === exam.id && f.nisn === student?.nisn);
                                      const isFinished = !!finalGrade;
                                      const violations = finalGrade?.violationCount || finalGrade?.violationsCount || 0;
                                      const nilai = finalGrade?.nilai !== undefined ? finalGrade.nilai : "-";
                                      
                                      const getIntegrityStatus = (v: number) => {
                                        if (v === 0) return { text: "Sangat Berintegritas", color: "text-emerald-700 font-extrabold" };
                                        if (v <= 2) return { text: "Berintegritas", color: "text-blue-700 font-extrabold" };
                                        if (v <= 4) return { text: "Cukup Berintegritas", color: "text-amber-700 font-extrabold" };
                                        return { text: "Kurang Berintegritas", color: "text-rose-700 font-extrabold" };
                                      };
                                      
                                      const integrity = getIntegrityStatus(violations);
                                      
                                      return (
                                        <tr key={`exam-${exam.id || idx}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                          <td className="py-4 px-4 text-center font-black text-slate-400">{idx + 1}</td>
                                          <td className="py-4 px-4 whitespace-nowrap">
                                            <p className="font-bold text-slate-900">{exam.title}</p>
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{exam.bab || "BAB BELUM DIATUR"} • {exam.subject}</p>
                                            {exam.externalQuizUrl && (
                                              <a
                                                href={exam.externalQuizUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                Soal PDF / Notebook LM
                                              </a>
                                            )}
                                          </td>
                                          <td className="py-4 px-4 text-center font-bold text-slate-600 whitespace-nowrap">
                                            {exam.category || exam.type || "Pilihan Ganda"}
                                          </td>
                                          <td className="py-4 px-4 text-center whitespace-nowrap">
                                            {isFinished ? (
                                              <span className="font-bold text-slate-700">{violations} Kali</span>
                                            ) : "-"}
                                          </td>
                                          <td className="py-4 px-4 text-center whitespace-nowrap">
                                            {isFinished ? (
                                              <span className={`inline-flex items-center text-[10px] ${integrity.color}`}>
                                                {integrity.text}
                                              </span>
                                            ) : "-"}
                                          </td>
                                          <td className="py-4 px-4 text-center whitespace-nowrap">
                                            {isFinished ? (
                                              <span className="font-black text-slate-900">{nilai}</span>
                                            ) : "-"}
                                          </td>
                                          <td className="py-4 px-4 text-center whitespace-nowrap">
                                            {isFinished ? (
                                              <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[10px] rounded-lg cursor-not-allowed">
                                                Selesai
                                              </button>
                                            ) : (
                                              <button 
                                                onClick={() => {
                                                  setSelectedExamForToken(exam);
                                                  setTokenInput("");
                                                  setExamTokenError("");
                                                }}
                                                className="px-4 py-2 bg-slate-900 text-white hover:bg-[#85cc00] hover:text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
                                              >
                                                Mulai Ujian
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                  </div>
                </div>
              )}

              {/* Simulasi Berpikir Komputasional Menu */}
              {activeMenu === "simulasi" && (
                <div className="space-y-6 w-full mx-auto pb-12 animate-in fade-in duration-300">
                  <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-400">Memuat modul simulasi...</div>}>
                    <SimulasiChapterMenu
                      userRole="student"
                      currentUser={{
                        name: student?.displayName || student?.name || student?.nama,
                        nisn: student?.nisn,
                        kelas: student?.kelas,
                      }}
                      simConfig={simConfig}
                      onBackToDashboard={() => setActiveMenu("dashboard")}
                    />
                  </Suspense>
                </div>
              )}
              
              
              </motion.div>
            </AnimatePresence>
        ) : (
            /* ACTIVE EXAM UI (CBT) */
            <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
              {/* CBT Header */}
              <header className="h-16 bg-gradient-to-r from-white via-white to-emerald-50 text-slate-800 border-b border-emerald-100 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm relative z-20">
                {/* Left: No Urut Soal Toggle Button */}
                <div className="flex items-center">
                  <button
                    onClick={() => setIsQuestionNavOpen(!isQuestionNavOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 border border-emerald-200/80 rounded-xl transition-all font-black text-xs cursor-pointer shadow-sm shrink-0 active:scale-95"
                    title={isQuestionNavOpen ? "Sembunyikan Nomor Soal" : "Tampilkan Nomor Soal"}
                  >
                    <LayoutGrid className="w-4 h-4 text-emerald-600" />
                    <span>No. Urut Soal</span>
                  </button>
                </div>

                {/* Center: Waktu Ujian perfectly centered with light emerald theme */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl shadow-sm shrink-0">
                  <Timer className={`w-3.5 h-3.5 md:w-4 md:h-4 ${examTimer < 300 ? "text-rose-500 animate-pulse" : "text-emerald-600"}`} />
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-[9px] md:text-[11px] font-black text-emerald-800/70 uppercase tracking-widest hidden xs:inline">Sisa Waktu:</span>
                    <span className={`text-xs md:text-base font-mono font-black tracking-wider ${examTimer < 300 ? "text-rose-600 animate-pulse" : "text-emerald-700"}`}>
                      {formatTime(examTimer)}
                    </span>
                  </div>
                </div>

                {/* Right: Tombol Selesai */}
                <div className="flex items-center">
                  <button 
                    onClick={handleTrySubmit}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/25 cursor-pointer border border-rose-500/10 shrink-0"
                  >
                    <span>Selesai</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </header>

              <div className="flex-1 flex overflow-hidden relative">
                
                {/* Mobile Overlay */}
                <AnimatePresence>
                  {isQuestionNavOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/50 backdrop-blur-md z-20 md:hidden"
                      onClick={() => setIsQuestionNavOpen(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Left Sidebar: Question Numbers Grid */}
                <aside className={`absolute lg:static inset-y-0 left-0 z-30 w-72 md:w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shrink-0 custom-scrollbar transition-all duration-300 ease-in-out ${isQuestionNavOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden border-none"}`}>
                  <div className="p-6 md:p-6 space-y-6 flex flex-col h-full justify-between">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Navigasi Soal</h3>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          {(activeExam.questions || []).filter((q: any, i: number) => isQuestionAnswered(q, examAnswers[i])).length} / {activeExam.questions?.length || 0} Selesai
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {activeExam.questions?.map((qItem: any, idx: number) => {
                          const isCurrent = currentQuestionIdx === idx;
                          const isAnswered = isQuestionAnswered(qItem, examAnswers[idx]);
                          const isFlagged = examFlags[idx];
                          
                          let bgColor = "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500";
                          if (isCurrent) bgColor = "bg-blue-600 border-blue-600 text-white shadow-md font-black";
                          else if (isFlagged) bgColor = "bg-amber-400 border-amber-400 text-white shadow-md";
                          else if (isAnswered) bgColor = "bg-emerald-500 border-emerald-500 text-white shadow-md";

                          return (
                            <button
                              key={`cbt-nav-btn-q-${idx}`}
                              onClick={() => {
                                setCurrentQuestionIdx(idx);
                                if (window.innerWidth < 1024) {
                                  setIsQuestionNavOpen(false);
                                }
                              }}
                              className={`w-full aspect-square rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${bgColor} cursor-pointer`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2.5 pt-4 border-t border-slate-100">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keterangan</h4>
                         <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <div className="w-3 h-3 rounded bg-blue-600 shrink-0"></div>
                              <span className="text-[10px] font-bold text-slate-600">Aktif</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <div className="w-3 h-3 rounded bg-emerald-500 shrink-0"></div>
                              <span className="text-[10px] font-bold text-slate-600">Terisi</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <div className="w-3 h-3 rounded bg-amber-400 shrink-0"></div>
                              <span className="text-[10px] font-bold text-slate-600">Ragu</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <div className="w-3 h-3 rounded bg-white border border-slate-200 shrink-0"></div>
                              <span className="text-[10px] font-bold text-slate-600">Kosong</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    {/* Selesai Ujian button at bottom of sidebar */}
                    <div className="pt-6 border-t border-slate-100">
                      <button
                        onClick={handleTrySubmit}
                        className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer border border-rose-500/10 flex items-center justify-center gap-2"
                      >
                        <span>Selesai Ujian</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar relative">
                  <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
                    {/* Dokumen / Kuis Soal Eksternal (PDF Drive / Notebook LM) */}
                    {activeExam.externalQuizUrl && (
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border-2 border-blue-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 text-sm md:text-base">
                                  Lembar Soal Luar (PDF / Kuis Notebook LM)
                                </h4>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded-md">
                                  Tersedia
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium mt-0.5">
                                Baca butir soal pada dokumen PDF atau buka kuis Notebook LM, lalu tentukan jawaban A, B, C, D, E pada lembar jawaban di bawah.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                                showEmbeddedPdf
                                  ? "bg-slate-800 text-white hover:bg-slate-900"
                                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                              }`}
                            >
                              <Eye className="w-4 h-4" />
                              <span>{showEmbeddedPdf ? "Tutup Pratinjau PDF" : "Tampilkan PDF di Layar"}</span>
                            </button>
                            <a
                              href={activeExam.externalQuizUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                              <span>Buka di Tab Baru</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Embedded PDF Viewer Frame */}
                        {showEmbeddedPdf && (
                          <div className="rounded-2xl border-2 border-blue-200 overflow-hidden bg-white shadow-inner">
                            <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-white text-xs">
                              <span className="font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-400" /> Pratinjau Dokumen Soal (Google Drive PDF / Notebook LM)
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowEmbeddedPdf(false)}
                                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                              >
                                ✕ Tutup
                              </button>
                            </div>
                            <div className="w-full h-[500px] md:h-[650px] bg-slate-100">
                              <iframe
                                src={getDrivePdfEmbedUrl(activeExam.externalQuizUrl)}
                                className="w-full h-full border-none"
                                title="Dokumen Soal PDF"
                                allow="autoplay"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top Control Bar of Exam (Font size & Smartphone status: Battery & Network) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">
                          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{onlineStatus ? `Jaringan: ${networkType}` : "Offline"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700">
                          <Battery className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Baterai: {deviceBattery ? `${deviceBattery.level}%${deviceBattery.charging ? " ⚡" : ""}` : "95%"}</span>
                        </div>
                      </div>

                      {/* Font Size Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mr-1">Ukuran Soal:</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                          <button
                            onClick={() => setExamFontSize("normal")}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${examFontSize === "normal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Kecil
                          </button>
                          <button
                            onClick={() => setExamFontSize("large")}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${examFontSize === "large" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Sedang
                          </button>
                          <button
                            onClick={() => setExamFontSize("xlarge")}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${examFontSize === "xlarge" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Besar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 relative min-h-[400px] flex flex-col justify-between">
                      <div>
                        {/* Question Badge & Status Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-5 bg-blue-600 rounded-full"></span>
                            <h4 className="font-display font-black text-xs md:text-sm text-slate-800 tracking-wider uppercase">
                              SOAL NOMOR {currentQuestionIdx + 1} DARI {activeExam.questions?.length}
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {examFlags[currentQuestionIdx] && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Flag className="w-3 h-3 fill-current" /> Ragu-Ragu
                              </span>
                            )}
                            {isQuestionAnswered(activeExam.questions?.[currentQuestionIdx], examAnswers[currentQuestionIdx]) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" /> Terjawab
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Belum Dijawab
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Text Box with justify alignment (rata kiri rata kanan) */}
                        <div className="py-2 md:py-4 space-y-4">
                          <p className={`font-sans leading-[1.8] text-slate-800 tracking-normal text-justify whitespace-pre-line select-text hyphens-auto ${
                            examFontSize === "normal" ? "text-base md:text-lg" :
                            examFontSize === "large" ? "text-lg md:text-xl" : "text-xl md:text-2xl"
                          }`}>
                            {activeExam.questions[currentQuestionIdx]?.text}
                          </p>

                          {activeExam.questions[currentQuestionIdx]?.imageUrl && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-2">
                              <img
                                src={getDriveImageUrl(activeExam.questions[currentQuestionIdx].imageUrl)}
                                alt={`Gambar Soal ${currentQuestionIdx + 1}`}
                                onClick={() =>
                                  setZoomedQuestionImg(
                                    getDriveImageUrl(activeExam.questions[currentQuestionIdx].imageUrl)
                                  )
                                }
                                className="max-h-72 w-auto rounded-xl object-contain cursor-zoom-in border border-slate-200 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedQuestionImg(
                                    getDriveImageUrl(activeExam.questions[currentQuestionIdx].imageUrl)
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Klik gambar untuk memperbesar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options / Input Answer Block */}
                      <div className="mt-8 pt-8 border-t border-slate-100">
                        {(() => {
                          const currentQ = activeExam.questions?.[currentQuestionIdx];
                          const qType = currentQ?.type || "multiple_choice";

                          if (qType === "short_answer") {
                            const val =
                              typeof examAnswers[currentQuestionIdx] === "string"
                                ? (examAnswers[currentQuestionIdx] as string)
                                : "";
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Isian Singkat:
                                  </span>
                                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                                    Ketik Jawaban Singkat
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setExamAnswers((prev) => ({
                                      ...prev,
                                      [currentQuestionIdx]: e.target.value,
                                    }))
                                  }
                                  placeholder="Ketik jawaban singkat Anda dengan tepat..."
                                  className={`w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50/50 focus:bg-white font-bold text-slate-900 transition-all ${
                                    examFontSize === "normal"
                                      ? "text-base"
                                      : examFontSize === "large"
                                      ? "text-lg"
                                      : "text-xl"
                                  }`}
                                />
                                <p className="text-[11px] font-medium text-slate-500">
                                  Pastikan ejaan kata atau angka sudah sesuai sebelum melanjutkan ke soal berikutnya.
                                </p>
                              </div>
                            );
                          }

                          if (qType === "essay") {
                            const val =
                              typeof examAnswers[currentQuestionIdx] === "string"
                                ? (examAnswers[currentQuestionIdx] as string)
                                : "";
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Jawaban Esai / Uraian:
                                  </span>
                                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg">
                                    {val.length} karakter
                                  </span>
                                </div>
                                <textarea
                                  rows={5}
                                  value={val}
                                  onChange={(e) =>
                                    setExamAnswers((prev) => ({
                                      ...prev,
                                      [currentQuestionIdx]: e.target.value,
                                    }))
                                  }
                                  placeholder="Tuliskan uraian jawaban Anda secara jelas, terstruktur, dan lengkap di sini..."
                                  className={`w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50/50 focus:bg-white font-medium text-slate-900 leading-relaxed transition-all resize-y ${
                                    examFontSize === "normal"
                                      ? "text-sm md:text-base"
                                      : examFontSize === "large"
                                      ? "text-base md:text-lg"
                                      : "text-lg md:text-xl"
                                  }`}
                                />
                                <p className="text-[11px] font-medium text-slate-500">
                                  Jawaban uraian akan diperiksa dan dinilai langsung oleh Guru mata pelajaran.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                                Pilihan Jawaban:
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {(currentQ?.options || []).map((option: string, optIdx: number) => {
                                  const isSelected = examAnswers[currentQuestionIdx] === optIdx;
                                  const optionLabels = ["A", "B", "C", "D", "E"];

                                  return (
                                    <button
                                      key={`cbt-q-${currentQuestionIdx}-opt-${optIdx}`}
                                      onClick={() =>
                                        setExamAnswers((prev) => ({ ...prev, [currentQuestionIdx]: optIdx }))
                                      }
                                      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
                                        isSelected
                                          ? "bg-gradient-to-r from-blue-50/60 to-indigo-50/20 border-blue-600 ring-2 ring-blue-600/10 shadow-md shadow-blue-600/5"
                                          : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-sm"
                                      } cursor-pointer`}
                                    >
                                      <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border transition-all ${
                                          isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm font-extrabold"
                                            : "bg-slate-50 text-slate-600 border-slate-200 group-hover:border-blue-200 group-hover:bg-white"
                                        }`}
                                      >
                                        {optionLabels[optIdx]}
                                      </div>

                                      <div
                                        className={`flex-1 pr-2 ${
                                          examFontSize === "normal"
                                            ? "text-sm md:text-base"
                                            : examFontSize === "large"
                                            ? "text-base md:text-lg"
                                            : "text-lg md:text-xl"
                                        }`}
                                      >
                                        <span
                                          className={`leading-relaxed transition-colors ${
                                            isSelected
                                              ? "text-blue-900 font-extrabold"
                                              : "text-slate-700 font-medium group-hover:text-slate-900"
                                          }`}
                                        >
                                          {option}
                                        </span>
                                      </div>

                                      <div className="shrink-0 flex items-center justify-center h-8">
                                        <div
                                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                            isSelected
                                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                              : "border-slate-300 bg-white group-hover:border-slate-400"
                                          }`}
                                        >
                                          {isSelected && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-scaleIn"></div>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}

                        {/* Navigasi CBT Tepat di Bawah Pilihan Jawaban E (Sejajar Horizontal & Responsif) */}
                        <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-4 pt-6 mt-6 border-t border-slate-100">
                          {/* Tombol Kembali / Sebelumnya */}
                          <button
                            type="button"
                            disabled={currentQuestionIdx === 0}
                            onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                            className="flex-1 min-w-0 h-12 sm:h-13 px-2 sm:px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold tracking-tight sm:tracking-wider disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow-sm cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4 shrink-0" />
                            <span>Kembali</span>
                          </button>
                          
                          {/* Tombol Ragu-Ragu */}
                          <button 
                            type="button"
                            onClick={() => setExamFlags(prev => ({ ...prev, [currentQuestionIdx]: !prev[currentQuestionIdx] }))}
                            className={`flex-1 min-w-0 h-12 sm:h-13 px-2 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold tracking-tight sm:tracking-wider border active:scale-95 transition-all cursor-pointer ${
                              examFlags[currentQuestionIdx]
                                ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/20"
                                : "bg-amber-50/70 hover:bg-amber-100/70 text-amber-700 border-amber-300/80"
                            }`}
                          >
                            <Flag className={`w-4 h-4 shrink-0 ${examFlags[currentQuestionIdx] ? "fill-white text-white" : "fill-amber-500/30 text-amber-600"}`} />
                            <span>Ragu-Ragu</span>
                          </button>

                          {/* Tombol Lanjutkan / Selesai Ujian */}
                          <button
                            type="button"
                            onClick={() => {
                              if (currentQuestionIdx < activeExam.questions.length - 1) {
                                setCurrentQuestionIdx(prev => prev + 1);
                              } else {
                                handleTrySubmit();
                              }
                            }}
                            className={`flex-[1.2] sm:flex-[1.3] min-w-0 h-12 sm:h-13 px-2.5 sm:px-4 text-white rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black tracking-tight sm:tracking-wider shadow-md active:scale-95 transition-all cursor-pointer border border-transparent ${
                              currentQuestionIdx === activeExam.questions.length - 1
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 ring-2 ring-emerald-500/20"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 ring-2 ring-blue-500/20"
                            }`}
                          >
                            <span>{currentQuestionIdx === activeExam.questions.length - 1 ? "Selesai Ujian" : "Lanjutkan"}</span>
                            {currentQuestionIdx === activeExam.questions.length - 1 ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <ArrowRight className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Keterangan Bab & Jenis Tes yang diujikan (saved Bab metadata box) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Materi Ujian Box */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">Mata Pelajaran / Bab</span>
                            <span className="text-xs md:text-sm font-extrabold text-slate-700 mt-1 truncate max-w-[200px]">
                              {activeExam.bab || activeExam.subject || "Umum / Semua Bab"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Jenis Tes Box (Pretest/Posttest/Ulangan Harian) */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">Jenis Tes / Ujian</span>
                            <span className="text-xs md:text-sm font-extrabold text-emerald-700 mt-1 uppercase">
                              {activeExam.category && activeExam.category !== "Pilihan Ganda" 
                                ? activeExam.category 
                                : activeExam.title?.toLowerCase().includes("pretest") ? "Pretest"
                                : activeExam.title?.toLowerCase().includes("posttest") ? "Posttest"
                                : activeExam.title?.toLowerCase().includes("latihan") ? "Latihan Ujian"
                                : activeExam.title?.toLowerCase().includes("pat") ? "Penilaian Akhir Tahun (PAT)"
                                : activeExam.title?.toLowerCase().includes("ulangan") ? "Ulangan Harian"
                                : "Ulangan Harian / Sumatif CBT"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Padding for scroll breathing room */}
                    <div className="pb-8" />
                  </div>
                </main>
              </div>
            </div>
          )}
      
      {/* Upload Modal for Google Drive Link Submission */}
      <AnimatePresence>
        {isUploadModalOpen && selectedTugas && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-20 sm:pb-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => !isUploading && !isProcessingScan && setIsUploadModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-auto max-h-[80vh] sm:max-h-[85vh] flex flex-col"
            >
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Link className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                    PENGUMPULAN TUGAS SISWA
                  </h4>
                  <p className="text-[10px] font-bold text-emerald-700 truncate max-w-[200px] sm:max-w-xs">
                    {selectedTugas.title || selectedTugas.materi || "Materi Pelajaran"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isUploading && !isProcessingScan && setIsUploadModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-900 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {(isUploading || uploadMessage) && (
                <div className="w-full p-3 border border-slate-200/80 rounded-2xl bg-slate-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1 rounded-md ${isUploading ? 'bg-sky-100 text-sky-600 animate-spin' : (uploadMessage?.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')}`}>
                      {isUploading ? <RefreshCw className="w-3.5 h-3.5" /> : (uploadMessage?.type === 'error' ? <AlertOctagon className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />)}
                    </div>
                    <h4 className="font-black text-[10px] uppercase tracking-wider text-slate-700">
                      {isUploading ? "MENYIMPAN TUGAS..." : "INFORMASI PENGUMPULAN"}
                    </h4>
                  </div>

                  {isUploading && (
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <span>{uploadMessage?.text || "Menyimpan ke database..."}</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <motion.div 
                          className="bg-emerald-600 h-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  {uploadMessage && !isUploading && (
                    <div className={`text-xs font-bold ${uploadMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {uploadMessage.text}
                    </div>
                  )}
                </div>
              )}

              {/* Centered Drive Link Input Box */}
              <div className="py-2 space-y-3 flex flex-col items-center justify-center text-center">
                <label className="block text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider text-center">
                  Tautan / Link Google Drive Tugas:
                </label>
                <div className="w-full flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Link className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      ref={linkInputRef}
                      type="url"
                      value={selectedFile}
                      onChange={(e) => {
                        setSelectedFile(e.target.value);
                        setUploadMessage(null);
                      }}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full pl-10 pr-8 py-3.5 bg-slate-50 border-2 border-emerald-400 focus:border-emerald-600 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 text-center placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all shadow-2xs"
                    />
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tempel Link Button */}
                  <button
                    type="button"
                    onClick={handlePasteClick}
                    className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Clipboard className="w-4 h-4" />
                    <span>Tempel</span>
                  </button>
                </div>
              </div>

              {/* Link Validation Preview */}
              {selectedFile && selectedFile.trim() && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    {isCheckingDriveAccess ? (
                      <RefreshCw className="w-4 h-4 text-sky-500 animate-spin shrink-0" />
                    ) : (selectedFile.toLowerCase().includes("drive.google.com") || selectedFile.toLowerCase().includes("docs.google.com")) ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-bold text-slate-700 truncate">{selectedFile}</span>
                  </div>
                  <a
                    href={selectedFile.startsWith("http") ? selectedFile : `https://${selectedFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer shadow-3xs"
                  >
                    <span>Uji Coba Tautan</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer Action Buttons (Batal & Kirim Tugas) - Unblocked above mobile footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/90 grid grid-cols-2 gap-3 shrink-0">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setIsUploading(false);
                  setIsUploadModalOpen(false);
                  setUploadProgress(0);
                  setSelectedFile("");
                }}
                className="h-11 rounded-2xl bg-slate-200 hover:bg-slate-300 border border-slate-300 font-black text-xs text-slate-700 uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isUploading || !selectedFile || !selectedFile.trim()}
                onClick={async () => {
                  if (!selectedFile || !selectedFile.trim()) {
                    setUploadMessage({
                      text: "Harap masukkan tautan Google Drive tugas Anda terlebih dahulu.",
                      type: "error",
                    });
                    return;
                  }
                  if (!selectedTugas) return;

                  const trimmedUrl = selectedFile.trim();
                  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
                    setUploadMessage({
                      text: "Tautan harus diawali dengan https:// atau http://",
                      type: "error",
                    });
                    return;
                  }

                  setIsUploading(true);
                  setUploadProgress(30);
                  setUploadMessage({ text: "Menyimpan tautan tugas ke database...", type: "warning" });

                  try {
                    const submissionId = `SUB-${student.nisn}-${selectedTugas.id}`;
                    const existingSub = submissionsList.find((s: any) => s.id === submissionId);
                      const initialSubmittedAt = existingSub?.submittedAt || existingSub?.createdAt || new Date().toISOString();
                      const nowIso = new Date().toISOString();
                      const isPerbaikan = !!existingSub && (existingSub.status === "ditolak" || existingSub.wasRejected === true || !!existingSub.keterangan);
                      const cleanName = (student.name || student.displayName || "Siswa").replace(/[^a-zA-Z0-9]/g, "_");

                      const newSubmissionObj = {
                        id: submissionId,
                        assignmentId: selectedTugas.id,
                        nisn: student.nisn,
                        studentName: student.name || student.displayName || "Siswa",
                        kelas: student.kelas || null,
                        fileName: `Link_Drive_${cleanName}.url`,
                        fileUrl: trimmedUrl,
                        pageCount: 1,
                        isPdfScan: false,
                        isDriveLink: true,
                        submittedAt: initialSubmittedAt,
                        updatedAt: nowIso,
                        resubmittedAt: isPerbaikan ? nowIso : null,
                        wasRejected: isPerbaikan || existingSub?.wasRejected || false,
                        keterangan: "",
                        status: "menunggu penilaian guru",
                      };

                      const cacheKey = `firas_cache_submissions_${student.nisn}`;
                      const currentList = Array.isArray(submissionsList) ? submissionsList : [];
                      const updatedList = [
                        ...currentList.filter((s: any) => s.id !== submissionId && String(s.assignmentId) !== String(selectedTugas.id)),
                        newSubmissionObj
                      ];

                      setUploadProgress(70);

                      try {
                        setRealtimeSubmissions(updatedList);
                        setLocalCache(cacheKey, updatedList);
                        mutateSubmissions(updatedList, false);
                      } catch (e) {
                        console.warn("Optimistic update error:", e);
                      }

                      await setDoc(
                        doc(db, "submissions", submissionId),
                        newSubmissionObj,
                        { merge: true },
                      );

                      setSuccessTugasMateri(selectedTugas?.materi || "Materi Pelajaran");
                      setUploadProgress(100);
                      trackUsage(0, 1);
                      setRealtimeSubmissions(updatedList);
                      setLocalCache(cacheKey, updatedList);
                      mutateSubmissions(updatedList, false);

                      setIsUploadModalOpen(false);
                      setShowSuccessOverlay(true);
                      setScannedPages([]);
                      setUploadMessage(null);
                      setUploadProgress(0);
                      setSelectedFile("");
                    } catch (error: any) {
                      console.warn("Gagal mengirim tautan drive:", error);
                      setUploadMessage({
                        text: error?.message || "Terjadi kesalahan saat menyimpan tautan Google Drive.",
                        type: "error",
                      });
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <span>Kirim Tugas</span>
                </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Image Preview Modal for Scanned Page */}
      <AnimatePresence>
        {previewModalIndex !== null && scannedPages[previewModalIndex] && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setPreviewModalIndex(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 max-w-2xl max-h-[90vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl flex flex-col p-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
              <span className="text-xs font-black uppercase tracking-wider">
                Pratinjau Lembar {previewModalIndex + 1} dari {scannedPages.length}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalIndex(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center">
              <img
                src={scannedPages[previewModalIndex]}
                alt={`Pratinjau Lembar ${previewModalIndex + 1}`}
                className="max-h-[70vh] object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={previewModalIndex === 0}
                onClick={() => setPreviewModalIndex(previewModalIndex - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                &larr; Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveScannedPage(previewModalIndex);
                }}
                className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Lembar Ini</span>
              </button>
              <button
                type="button"
                disabled={previewModalIndex === scannedPages.length - 1}
                onClick={() => setPreviewModalIndex(previewModalIndex + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Berikutnya &rarr;
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drive Auth Notice Modal */}
      <AnimatePresence>
        {showDriveAuthNotice && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowDriveAuthNotice(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 p-8 text-center"
            >
            {/* Elegant Icon Header */}
            <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100 shadow-inner">
              <Link className="w-8 h-8 animate-pulse text-[#85cc00]" />
            </div>

            {/* Title */}
            <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-wider mb-2">
              Hubungkan Google Drive
            </h3>
            
            {/* Subtitle / Description */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
              Sistem Pengumpulan Tugas Sekolah
            </p>

            <div className="text-xs font-medium text-slate-600 leading-relaxed mb-6 space-y-3">
              <p>
                Untuk dapat mengirimkan berkas tugas sekolah Anda langsung ke folder Guru, Anda perlu menghubungkan aplikasi ini dengan akun Google Drive Anda terlebih dahulu.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 text-left flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-amber-800 font-bold uppercase tracking-wider">
                  Sangat Aman: File Anda akan tersimpan di akun Google Drive Anda sendiri dan tautannya akan dikirim otomatis ke sistem Guru.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  setShowDriveAuthNotice(false);
                  try {
                    const res = await googleSignIn();
                    if (res && res.accessToken) {
                      setNeedsDriveAuth(false);
                      setShowDriveSuccessConnected(true);
                    }
                  } catch (err) {
                    console.warn("Gagal menghubungkan:", err);
                  }
                }}
                className="w-full h-12 rounded-2xl bg-[#85cc00] hover:brightness-110 text-slate-900 font-black text-xs uppercase tracking-widest shadow-lg shadow-[#85cc00]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                <Link className="w-4 h-4" />
                Hubungkan Sekarang
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowDriveAuthNotice(false);
                }}
                className="w-full h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-slate-200"
              >
                Nanti Saja
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drive Auth Success Modal */}
      <AnimatePresence>
        {showDriveSuccessConnected && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowDriveSuccessConnected(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 p-8 text-center"
            >
            {/* Elegant Checkmark Header with Pulse */}
            <div className="mx-auto w-16 h-16 bg-[#85cc00]/10 text-[#85cc00] rounded-full flex items-center justify-center mb-6 border border-[#85cc00]/20 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-[#85cc00] animate-bounce" />
            </div>

            {/* Title */}
            <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-wider mb-2">
              Drive Berhasil Terhubung
            </h3>
            
            {/* Subtitle / Description */}
            <p className="text-[10px] font-black text-[#85cc00] uppercase tracking-widest mb-6">
              Google Drive Terkoneksi
            </p>

            <div className="text-xs font-medium text-slate-600 leading-relaxed mb-6 space-y-3">
              <p>
                Selamat! Akun Google Drive Anda telah berhasil terhubung dengan sistem pengumpulan tugas sekolah. 
              </p>
              <p>
                Kini Anda dapat langsung memilih file atau memotret lembar tugas dari perangkat, dan sistem akan mengunggahnya secara otomatis ke folder aman Anda.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDriveSuccessConnected(false);
                  if (selectedTugas) {
                    setIsUploadModalOpen(true);
                  }
                }}
                className="w-full h-12 rounded-2xl bg-[#85cc00] hover:brightness-110 text-slate-900 font-black text-xs uppercase tracking-widest shadow-lg shadow-[#85cc00]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                {selectedTugas ? "Lanjutkan Kumpulkan Tugas" : "Selesai"}
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JSON Response Error Explanation Modal */}
      <AnimatePresence>
        {showJSONErrorExplain && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowJSONErrorExplain(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 p-8"
            >
            {/* Header Icon */}
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5 border border-rose-100 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-rose-600 animate-pulse" />
            </div>

            {/* Title */}
            <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-wider text-center mb-1">
              Panduan Mengatasi Kendala
            </h3>
            
            {/* Subtitle / Error code */}
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest text-center mb-6">
              RESPON SERVER TIDAK VALID (NON-JSON ERROR)
            </p>

            {/* Explanations */}
            <div className="space-y-4 mb-6">
              <p className="text-xs font-semibold text-slate-600 text-center leading-relaxed">
                Sistem tidak dapat memproses berkas Anda karena server mengirimkan respon berupa halaman web biasa, bukan format data terstruktur (JSON). Jangan khawatir, hal ini biasanya disebabkan oleh salah satu hal berikut:
              </p>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {/* Cause 1: File Size */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 items-start">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5 animate-pulse">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                      1. Ukuran Berkas Terlalu Besar (Maks 10MB)
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Foto tugas dari kamera HP langsung biasanya memiliki resolusi tinggi dan berukuran sangat besar (10MB+).
                    </p>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1.5">
                      💡 SOLUSI: Kompres foto, ubah resolusi ke sedang, atau konversi berkas Anda ke PDF sebelum mengunggah kembali.
                    </p>
                  </div>
                </div>

                {/* Cause 2: Connection / Timeout */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 items-start">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                      2. Gangguan Koneksi Internet (Timeout)
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Koneksi internet Anda sempat terputus secara tidak terduga di tengah jalan saat proses mengirim berkas ke Google Drive.
                    </p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-1.5">
                      💡 SOLUSI: Pastikan sinyal internet Anda kuat dan stabil, lalu coba kirimkan kembali berkas Anda.
                    </p>
                  </div>
                </div>

                {/* Cause 3: Server Busy */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 items-start">
                  <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
                      3. Server Mengalami Antrean Padat
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Banyak rekan-rekan siswa lainnya sedang mengumpulkan tugas secara bersamaan, sehingga antrean pengunggahan ke server sangat padat.
                    </p>
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-1.5">
                      💡 SOLUSI: Tunggu sekitar 1 hingga 2 menit, kemudian silakan klik tombol Kumpulkan kembali.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowJSONErrorExplain(false);
                }}
                className="w-full h-12 rounded-2xl bg-[#85cc00] hover:brightness-110 text-slate-900 font-black text-xs uppercase tracking-widest shadow-lg shadow-[#85cc00]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                Coba Unggah Kembali
              </button>
              
              <button
                type="button"
                onClick={() => setShowJSONErrorExplain(false)}
                className="w-full h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-slate-200"
              >
                Mengerti & Tutup
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewing Feedback Modal (Lihat Hasil) */}
      <AnimatePresence>
        {viewingTugas && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setViewingTugas(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-4 flex flex-col ${isFullscreenTugasModal ? 'max-w-[95vw] h-[95vh]' : 'max-w-lg max-h-[90vh]'}`}
            >
            {/* Header */}
            <div className="bg-white p-6 px-8 flex justify-between items-center shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-widest text-slate-900">
                    DETAIL EVALUASI TUGAS
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    SISTEM EVALUASI SISWA DIGITAL
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenTugasModal(!isFullscreenTugasModal)}
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
                  title="Perbesar / Perkecil"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingTugas(null);
                    setIsFullscreenTugasModal(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mx-auto text-blue-600">
                  <Award className="w-5 h-5" />
                </div>
                <h5 className="font-display font-black text-sm text-slate-900 leading-tight">
                  {viewingTugas.title}
                </h5>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  {viewingTugas.bab}
                </p>
              </div>

              {/* Evaluation Info */}
              <div className={`p-4 rounded-2xl border ${
                viewingTugas.submission?.nilai 
                  ? "bg-slate-50 border-slate-100" 
                  : "bg-amber-50/50 border-amber-100"
              }`}>
                {viewingTugas.submission?.nilai ? (
                  /* Graded View - Compact Score */
                  <div className="flex items-center gap-5">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="10" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke="#10b981" 
                          strokeWidth="10" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * Number(viewingTugas.submission.nilai)) / 100} 
                          strokeLinecap="round" 
                          className="transition-all duration-1000 ease-out" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 bg-clip-text text-transparent animate-pulse">
                          {viewingTugas.submission.nilai}
                        </span>
                        <span className="text-[7px] text-slate-400 font-bold uppercase">Skor</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Sudah Dinilai
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Waktu</span>
                          <span className="text-[10px] font-bold text-slate-600">
                            {new Date(viewingTugas.submission.submittedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })} • {new Date(viewingTugas.submission.submittedAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Ungraded View - Very Compact */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Evaluasi</span>
                      {viewingTugas.submission?.status === "ditolak" ? (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-md uppercase tracking-wider border border-rose-200">
                          Ditolak ❌
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-md uppercase tracking-wider border border-amber-200">
                          Menunggu Penilaian
                        </span>
                      )}
                    </div>
                    <div className="h-px bg-amber-200/20 w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Kirim</span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {viewingTugas.submission?.submittedAt ? (
                          new Date(viewingTugas.submission.submittedAt).toLocaleDateString("id-ID", { 
                            day: 'numeric', 
                            month: 'short'
                          }) + " • " + new Date(viewingTugas.submission.submittedAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })
                        ) : "-"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback Section - Show only if rejected as per request */}
              {viewingTugas.submission?.status === "ditolak" && (viewingTugas.submission?.keterangan || viewingTugas.submission?.feedback) && (
                <div className="p-5 rounded-3xl space-y-2 bg-rose-50/50 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                      Catatan Guru (Alasan Penolakan)
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                    &ldquo;{viewingTugas.submission.keterangan || viewingTugas.submission.feedback}&rdquo;
                  </p>
                </div>
              )}

              {/* Task Link from Teacher */}
              {(viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl) && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">
                      File / Link Tugas Dari Guru
                    </span>
                    <p className="text-xs font-bold text-emerald-950 truncate">
                      {viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl}
                    </p>
                  </div>
                  <a
                    href={(viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl).startsWith("http") ? (viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl) : `https://${viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleOpenFileLink(viewingTugas.taskLink || viewingTugas.linkTugas || viewingTugas.fileUrl, e)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Link ↗</span>
                  </a>
                </div>
              )}

              {/* Submitted File Info with Live Preview */}
              {viewingTugas.submission?.fileUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      File / Link Tugas yang Dikumpulkan
                    </span>
                    <a 
                      href={viewingTugas.submission.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => handleOpenFileLink(viewingTugas.submission.fileUrl, e)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 border border-blue-100 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buka Tautan Utama ↗
                    </a>
                  </div>

                  {(() => {
                    const previewUrl = getPreviewEmbedUrl(viewingTugas.submission.fileUrl);
                    if (!previewUrl) return null;

                    return (
                      <div className="w-full h-60 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
                        <iframe
                          src={previewUrl}
                          title="Pratinjau Berkas Terkumpul"
                          className="w-full h-full border-0"
                          allow="autoplay"
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setViewingTugas(null)}
                  className={`h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-extrabold text-xs text-slate-700 uppercase tracking-widest active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer ${viewingTugas.submission?.nilai ? "w-full" : "w-32"}`}
                >
                  Tutup
                </button>
                {!viewingTugas.submission?.nilai && (
                  <button
                    type="button"
                    onClick={() => {
                      const task = viewingTugas;
                      setViewingTugas(null);
                      setSelectedTugas(task);
                      if (task.submission?.fileUrl) {
                        setSelectedFile(task.submission.fileUrl);
                      } else {
                        setSelectedFile("");
                      }
                      setIsUploadModalOpen(true);
                    }}
                    className="h-12 rounded-2xl px-6 bg-blue-600 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer border border-transparent"
                  >
                    {viewingTugas.submission ? "Kumpulkan Ulang" : "Kumpulkan"}
                  </button>
                )}
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide / Panduan Tugas Modal */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setIsGuideModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-4"
            >
            {/* Header */}
            <div className="bg-white p-6 px-8 flex justify-between items-center shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-widest text-slate-900">
                    PANDUAN TUGAS DIGITAL
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    SISTEM EDUKASI DIGITAL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 sm:p-10 space-y-6">
              {(() => {
                const guides = [
                  {
                    title: "Pengumpulan Berkas via Tautan Digital",
                    desc: "Tugas dapat dikumpulkan berupa Tautan / Link publik dari Google Drive, CamScanner, Canva, OneDrive, Dropbox, atau Link Web dokumen PDF/foto. Cukup salin tautan berbagi dan tempelkan ke kolom tugas.",
                    icon: ShieldCheck
                  },
                  {
                    title: "Atur Hak Akses Berbagi Publik (PENTING)",
                    desc: "Sebelum menyalin tautan, pastikan izin berbagi disetel ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with link). Jika dikunci/dibatasi, Pak Agan tidak bisa membaca atau menilai tugas Anda!",
                    icon: FileText
                  },
                  {
                    title: "Cara Salin Tautan yang Benar",
                    desc: "Gunakan tombol 'Salin Link' / 'Bagikan' di Google Drive, CamScanner, Canva, atau cloud storage Anda. Tempelkan (paste) langsung ke dalam kolom pengumpulan.",
                    icon: Link
                  },
                  {
                    title: "Pantau Status Penilaian",
                    desc: "Setelah tautan dikirim, status tugas akan otomatis berubah menjadi 'Menunggu Penilaian'. Anda dapat memantau perolehan nilai, masukan guru, atau instruksi kumpul ulang langsung dari dashboard ini.",
                    icon: Clock
                  }
                ];
                
                const currentGuide = guides[currentTipIdx];
                const GuideIcon = currentGuide.icon;
                
                return (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600">
                      <GuideIcon className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-display font-black text-lg text-slate-900">
                        {currentGuide.title}
                      </h5>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Langkah {currentTipIdx + 1} dari {guides.length}
                      </p>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-sm mx-auto">
                        {currentGuide.desc}
                      </p>
                    </div>

                    {/* Step indicator dots */}
                    <div className="flex justify-center gap-1.5">
                      {guides.map((_, i) => (
                        <span 
                          key={`guide-nav-indicator-${i}`} 
                          onClick={() => setCurrentTipIdx(i)}
                          className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${i === currentTipIdx ? "bg-blue-600 w-6" : "bg-slate-200"}`}
                        ></span>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentTipIdx > 0) {
                            setCurrentTipIdx(currentTipIdx - 1);
                          } else {
                            setIsGuideModalOpen(false);
                          }
                        }}
                        className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-extrabold text-xs text-slate-700 uppercase tracking-widest active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer"
                      >
                        {currentTipIdx === 0 ? "Batal" : "Sebelumnya"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentTipIdx < guides.length - 1) {
                            setCurrentTipIdx(currentTipIdx + 1);
                          } else {
                            setIsGuideModalOpen(false);
                          }
                        }}
                        className="h-12 rounded-2xl bg-blue-600 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer border border-transparent"
                      >
                        {currentTipIdx === guides.length - 1 ? "Selesai" : "Selanjutnya"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant & Professional Floating Success Overlay with Backdrop Blur */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowSuccessOverlay(false)}
            />
            
            {/* Elegant Floating Dialog box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-4"
            >
              {/* Pattern Header Accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-[#85cc00] to-teal-400"></div>

              <div className="p-8 flex flex-col items-center text-center">
                {/* Elegant 3D-like Glowing Checked Circle Icon Container */}
                <div className="relative mb-6">
                  {/* Outer glowing pulsing aura */}
                  <div className="absolute inset-0 bg-[#85cc00]/20 rounded-full blur-xl scale-125"></div>
                  
                  {/* Central premium circle */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-white to-slate-50 border-4 border-white shadow-xl rounded-full flex items-center justify-center text-[#85cc00]">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                </div>

                {/* Sparkling accent */}
                <div className="flex items-center gap-1.5 mb-1.5 bg-[#85cc00]/10 text-[#6ea800] px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-wider">BERHASIL DIKIRIM</span>
                </div>

                {/* Typography */}
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight leading-tight mb-2">
                  Tugas Anda Diterima!
                </h3>
                
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  SISTEM PEMBELAJARAN DIGITAL
                </p>

                {/* Task Details Box - Clean Glassmorphism style */}
                <div className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl p-4 mb-6 text-left space-y-3 shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Materi Tugas</span>
                    <span className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-snug">
                      {successTugasMateri}
                    </span>
                  </div>
                  
                  <div className="h-px bg-slate-100"></div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Metode Pengiriman</span>
                      <span className="text-xs font-bold text-slate-700">Link Google Drive</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        MENUNGGU PENILAIAN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Soft encouraging message */}
                <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">
                  Terima kasih! Tautan tugas telah terkirim secara otomatis ke Dashboard Pak Agan. Pastikan link Drive Anda dapat diakses.
                </p>

                {/* Elegant Close Button */}
                <button
                  type="button"
                  onClick={() => setShowSuccessOverlay(false)}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#85cc00] to-[#74b300] hover:brightness-110 text-slate-900 font-black text-xs uppercase tracking-widest shadow-lg shadow-[#85cc00]/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  <Check className="w-4 h-4" /> Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Token Modal */}
      <AnimatePresence>
        {selectedExamForToken && (
          <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-6 sm:pt-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setSelectedExamForToken(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto sm:my-0"
            >
            {/* Header */}
            <div className="bg-slate-50/90 px-4 py-3 sm:px-6 sm:py-3.5 flex justify-between items-center border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                    Token Akses Ujian
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-[260px]">
                    {selectedExamForToken.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExamForToken(null)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {selectedExamForToken.externalQuizUrl && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[10px] sm:text-xs font-semibold w-full justify-center">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Terhubung Dokumen Soal Eksternal (PDF / Notebook LM)</span>
                </div>
              )}

              {examTokenError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{examTokenError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Masukkan Kode Token Pengawas:
                </label>
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="TOKEN"
                  maxLength={10}
                  className="w-full text-center tracking-[0.25em] font-mono rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white p-3 font-black uppercase text-2xl sm:text-3xl text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyExamToken()}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedExamForToken(null)}
                  className="h-11 sm:h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleVerifyExamToken}
                  className="h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer border border-transparent"
                >
                  Mulai Ujian
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Materi Ajar Viewer Modal (PDF & Video YouTube) */}
      <AnimatePresence>
        {activeMaterialPreview && (() => {
          const media = getMediaEmbedUrl(activeMaterialPreview.driveUrl, true);
          const progress = materialsProgress[activeMaterialPreview.id];
          const isDone = progress?.status === "Selesai" || progress?.percentage === 100;
          const isYt = media.type === "youtube";
          const externalOpenUrl = getExternalOpenUrl(activeMaterialPreview.driveUrl);
          const directDownloadUrl = getDirectDownloadUrl(activeMaterialPreview.driveUrl);
          const compatEmbedUrl = getAlternativePdfEmbedUrl(activeMaterialPreview.driveUrl);
          const effectiveModalEmbedUrl = !isYt && materiViewerMode === "compat"
            ? compatEmbedUrl
            : media.embedUrl;

          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
                onClick={() => setActiveMaterialPreview(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10"
              >
                {/* Header */}
                <div className="bg-white text-slate-900 px-5 py-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isYt ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                      {isYt ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <span>{isYt ? "Video YouTube" : "Dokumen PDF / Modul"}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{activeMaterialPreview.bab || "Materi Pelajaran"}</span>
                      </div>
                      <h3 className="font-display font-bold text-sm sm:text-lg text-slate-900 truncate max-w-[200px] sm:max-w-md md:max-w-xl">
                        {activeMaterialPreview.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                    {!isYt && (
                      <button
                        type="button"
                        onClick={() =>
                          setMateriViewerMode((prev) => (prev === "primary" ? "compat" : "primary"))
                        }
                        className={`px-3 py-2 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          materiViewerMode === "compat"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                        }`}
                        title="Ganti viewer alternatif untuk iOS atau Android"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{materiViewerMode === "compat" ? "Mode Utama" : "Mode Alternatif"}</span>
                      </button>
                    )}
                    {!isYt && (
                      <a
                        href={directDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
                        title="Unduh Materi"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Unduh</span>
                      </a>
                    )}
                    <a
                      href={externalOpenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
                      title="Buka Langsung di Browser / Aplikasi"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Buka Langsung</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveMaterialPreview(null)}
                      className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Tutup"
                      title="Tutup"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Media Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 flex flex-col gap-4">
                  {isYt ? (
                    <div className="space-y-4">
                      {/* Responsive 16:9 YouTube Video Player */}
                      <div className="w-full aspect-video rounded-3xl overflow-hidden bg-slate-950 shadow-sm border border-slate-200 relative">
                        <iframe
                          src={effectiveModalEmbedUrl}
                          title={activeMaterialPreview.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                          allowFullScreen
                          className="w-full h-full border-none"
                        />
                      </div>

                      {/* Deskripsi / Petunjuk Belajar */}
                      {activeMaterialPreview.description && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Petunjuk Belajar & Ringkasan Materi
                          </h4>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {activeMaterialPreview.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PDF / Document Embed Reader */
                    <div className="space-y-3">
                      <div
                        className="w-full h-[60vh] sm:h-[68vh] rounded-3xl overflow-auto border border-slate-200 bg-white shadow-sm flex flex-col"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        <iframe
                          key={`modal-doc-${activeMaterialPreview.id}-${materiViewerMode}`}
                          src={effectiveModalEmbedUrl}
                          title={activeMaterialPreview.title}
                          allow="autoplay; fullscreen"
                          allowFullScreen
                          className="w-full h-full border-none"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-2xl px-4 py-2.5 border border-slate-200/80 text-xs text-slate-600">
                        <span>Kendala tampil di iPhone/iPad atau Android? Ketuk Mode Alternatif, Buka Langsung, atau Unduh.</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={externalOpenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka</span>
                          </a>
                          <a
                            href={directDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#85cc00]/15 hover:bg-[#85cc00]/25 text-slate-900 font-semibold inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Progress & Completion Control */}
                <div className="bg-white px-5 py-3.5 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-400">
                        Progress Belajar
                      </span>
                      <span className="text-xs font-bold text-slate-800 tabular-nums">
                        {progress?.percentage || 40}% · {progress?.status || "Sedang Dipelajari"}
                      </span>
                    </div>
                    <div className="w-24 sm:w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-[#85cc00]"}`}
                        style={{ width: `${progress?.percentage || 40}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleCompleteMaterial(activeMaterialPreview.id)}
                      disabled={isDone}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                          : "bg-[#85cc00] hover:brightness-105 text-slate-950 shadow-sm active:scale-95 cursor-pointer"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isDone ? "Sudah Selesai Dipelajari" : "Tandai Selesai"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMaterialPreview(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Submit Confirm Modal */}
      <AnimatePresence>
        {isSubmitConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setIsSubmitConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-4"
            >
            {/* Header */}
            <div className="bg-white p-6 px-8 flex justify-between items-center shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-black text-xs uppercase tracking-widest text-[#10b981]">
                    KONFIRMASI AKHIR
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    REKAP PROSES EVALUASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 sm:p-10 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h5 className="font-display font-black text-xl text-slate-900">
                  Selesaikan Ujian Sekarang?
                </h5>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-relaxed">
                  VALIDASI DAN KALKULASI JAWABAN
                </p>
              </div>

              {/* Informative recap box */}
              <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl text-left space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Pengecekan Integritas</span>
                </div>
                <p className="text-[12px] font-semibold text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin mengakhiri sesi pengerjaan ujian? Setelah lembar jawaban dikirim, lembar pengerjaan akan dikunci secara permanen dan nilai Anda akan langsung terkirim secara otomatis.
                </p>
                <div className="text-[10px] bg-white border border-emerald-100/60 p-3 rounded-xl font-mono text-emerald-950">
                  ✓ Seluruh pilihan tersimpan aman<br/>
                  ✓ Skor langsung diukur otomatis<br/>
                  ✓ Riwayat pengerjaan dicatat digital
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => handleFinishExam(false)}
                  className="w-full h-14 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer border border-transparent"
                >
                  Ya, Kumpulkan Jawaban Sekarang
                </button>
                <button
                  onClick={() => setIsSubmitConfirmOpen(false)}
                  className="w-full h-14 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-extrabold text-xs uppercase tracking-widest rounded-2xl border border-slate-200 hover:border-slate-300 transition-all text-center flex items-center justify-center cursor-pointer"
                >
                  Belum Selesai, Tinjau Kembali
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unanswered Questions Warning Modal */}
      <AnimatePresence>
        {unansweredWarningList && unansweredWarningList.length > 0 && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setUnansweredWarningList(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-auto max-h-[90vh] flex flex-col"
            >
            {/* Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-black text-xs uppercase tracking-widest text-rose-700">
                    Lembar Jawaban Belum Lengkap
                  </h4>
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    Sistem Deteksi Presisi Ujian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnansweredWarningList(null)}
                className="w-8 h-8 rounded-lg bg-white text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
              <div className="text-center space-y-1">
                <h5 className="font-sans font-extrabold text-base text-slate-800">
                  Wajib Menyelesaikan Semua Soal
                </h5>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Ditemukan <span className="text-rose-600 font-extrabold">{unansweredWarningList.length} soal</span> yang belum dijawab. Selesaikan semua soal terlebih dahulu sebelum mengumpulkan ujian.
                </p>
              </div>

              {/* Grid of unanswered question numbers */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Klik nomor soal di bawah untuk langsung menjawab:
                </p>
                <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
                  {unansweredWarningList.map((idx, warnIdx) => (
                    <button
                      key={`unanswered-q-item-${idx}-${warnIdx}`}
                      onClick={() => {
                        setCurrentQuestionIdx(idx);
                        setUnansweredWarningList(null);
                      }}
                      className="w-full aspect-square bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-400 font-mono font-black text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100/60 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-blue-800 leading-relaxed">
                  Tips: Klik salah satu nomor soal di atas untuk langsung menjawab pertanyaan tersebut secara instan.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  if (unansweredWarningList.length > 0) {
                    setCurrentQuestionIdx(unansweredWarningList[0]);
                  }
                  setUnansweredWarningList(null);
                }}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all text-center flex items-center justify-center cursor-pointer"
              >
                Lengkapi Soal Pertama Yang Belum Terjawab
              </button>
              <button
                onClick={() => setUnansweredWarningList(null)}
                className="w-full h-10 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-extrabold text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 transition-all text-center flex items-center justify-center cursor-pointer"
              >
                Tutup Peringatan
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Violation Overlay */}
      <AnimatePresence>
        {isViolationSirening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 bg-black pointer-events-auto"
          >
             <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
               transition={{ duration: 0.3, repeat: Infinity }}
               className="text-center"
             >
                <div className="w-48 h-48 mx-auto mb-8 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl">
                  <AlertOctagon className="w-24 h-24 text-white" />
                </div>
                <h1 className="text-5xl md:text-7xl font-display font-black text-rose-500 uppercase tracking-tighter mb-4 shadow-rose-900 drop-shadow-2xl">
                  Peringatan!
                </h1>
                <p className="text-xl md:text-3xl font-black text-white uppercase tracking-widest max-w-3xl leading-snug">
                  Aktivitas mencurigakan terdeteksi.<br/>Tindakan ini direkam oleh sistem pengawas aplikasi ujian.
                </p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Modal */}
      <AnimatePresence>
        {viewedAnnouncement && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => handleDismissAnnouncement(viewedAnnouncement.id)}
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-4 max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Clean Simple Header */}
              <div className="shrink-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#85cc00] flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {viewedAnnouncement.title || "Pengumuman"}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {viewedAnnouncement.author || "Guru"} &bull; {(() => {
                        const dateStr = viewedAnnouncement.publishDate || viewedAnnouncement.createdAt;
                        if (!dateStr) return "-";
                        if (typeof dateStr === "string" && dateStr.includes("-") && dateStr.length === 10) {
                          const [y, m, d] = dateStr.split("-");
                          const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                          return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
                        }
                        const d = new Date(dateStr);
                        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
                      })()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissAnnouncement(viewedAnnouncement.id)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Clean Focused Content Area */}
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-slate-800 leading-relaxed font-normal whitespace-pre-wrap text-sm sm:text-base selection:bg-emerald-100">
                  {viewedAnnouncement.content}
                </p>
              </div>

              {/* Clean Single Action */}
              <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDismissAnnouncement(viewedAnnouncement.id)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Luxurious Cheat Exit Warning Modal */}
      <AnimatePresence>
        {showExitWarningModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowExitWarningModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-white p-4 sm:p-6 px-6 sm:px-8 flex justify-between items-center shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 sm:p-2 bg-rose-50 rounded-xl text-rose-500">
                    <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-xs sm:text-sm uppercase tracking-widest text-rose-600">
                      INTEGRITAS SISTEM CBT
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      DEWAN PENGAWAS DIGITAL SMA
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowExitWarningModal(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content Body */}
              <div className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-sm">
                    <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-display font-black text-lg sm:text-xl text-slate-900 px-2 leading-tight">
                      Apakah Anda benar-benar mau berbuat curang?
                    </h5>
                    <p className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-widest">
                      PERINGATAN KERAS: UPAYA MENINGGALKAN UJIAN
                    </p>
                  </div>
                </div>

                {/* Elegant dynamic warn explanation box */}
                <div className="p-4 sm:p-6 bg-rose-50/50 border border-rose-100 rounded-2xl sm:rounded-3xl text-left space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                    <span className="text-[9px] sm:text-[10px] font-black text-rose-800 uppercase tracking-wider">STATUS: KOORDINASI PENGAWAS</span>
                  </div>
                  
                  <p className="text-[11px] sm:text-[12px] font-semibold text-slate-700 leading-relaxed">
                    Sistem mendeteksi upaya penekanan menu atau keluar dari navigasi lembar ujian yang sedang aktif. Tindakan meninggalkan halaman secara sengaja dikategorikan sebagai <strong className="text-rose-600 font-black">Tindakan Pelanggaran (Kecurangan)</strong>.
                  </p>

                  <div className="text-[10px] sm:text-[11px] text-rose-900 bg-white border border-rose-100 p-3 sm:p-4 rounded-xl leading-relaxed font-mono">
                    <strong className="text-slate-800 font-black">KONSEKUENSI NILAI & CATATAN:</strong><br/>
                    ✓ Setiap pelanggaran terekam di dashboard Guru.<br/>
                    ✓ Jika klik <strong className="text-rose-600">YA</strong>, lembar ujian akan langsung dikirim & ditutup paksa!<br/>
                    ✓ Nilai pengerjaan Anda saat ini akan dibatalkan/didiskualifikasi.
                  </div>
                </div>

                {/* Confirm Buttons Column */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExitWarningModal(false)}
                    className="w-full h-12 sm:h-14 bg-[#85cc00] hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-[11px] sm:text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-lg shadow-[#85cc00]/20 transition-all text-center flex items-center justify-center cursor-pointer"
                  >
                    Tidak, Saya Tidak Akan Curang
                  </button>
                  <button
                    type="button"
                    onClick={confirmCheatExit}
                    className="w-full h-12 sm:h-14 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-extrabold text-[11px] sm:text-xs uppercase tracking-widest rounded-xl sm:rounded-2xl border-2 border-slate-200 hover:border-rose-200 transition-all text-center flex items-center justify-center cursor-pointer"
                  >
                    Ya, Saya Akan Curang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Share Modal for Student */}
      <AnimatePresence>
        {isWaModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setIsWaModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white/95 backdrop-blur-xl w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200/80 ring-1 ring-slate-900/5"
            >
            {/* Header */}
            <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">Kirim Laporan via WhatsApp</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Orang Tua / Wali Murid</p>
                </div>
              </div>
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-150 rounded-xl active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Siswa</label>
                  <p className="font-bold text-sm text-slate-900">{student?.displayName}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">NIS / Kelas</label>
                  <p className="font-bold text-sm text-slate-900">{student?.nisn} (Kl. {student?.kelas || "-"})</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block ml-1">Nomor WA Orang Tua</label>
                <input
                  type="text"
                  value={waParentPhone}
                  onChange={(e) => setWaParentPhone(e.target.value)}
                  placeholder="Contoh: 628123456789"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold tracking-wider text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-400 font-bold block ml-1 leading-relaxed">
                  *Gunakan kode negara di awal (misal *62* untuk Indonesia, jangan gunakan spasi atau tanda hubung).
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block ml-1">Preview Memo Laporan</label>
                <div className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-emerald-950 whitespace-pre-wrap select-text max-h-[220px] overflow-y-auto custom-scrollbar shadow-inner">
                  {waDraftMessage}
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(waDraftMessage);
                  setCopiedIndex(true);
                  setTimeout(() => setCopiedIndex(false), 2000);
                }}
                className={`flex-1 py-4 text-center rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all outline-none border cursor-pointer ${
                  copiedIndex
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {copiedIndex ? "Tersalin!" : "Salin Teks"}
              </button>
              <button
                onClick={() => {
                  const cleanedPhone = waParentPhone.replace(/[^0-9]/g, "");
                  const finalPhone = cleanedPhone.startsWith("0") 
                    ? "62" + cleanedPhone.slice(1) 
                    : cleanedPhone;
                  
                  const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(waDraftMessage)}`;
                  window.open(waUrl, "_blank", "noopener,noreferrer");
                }}
                className="flex-1 py-4 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all text-center rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                Kirim via WhatsApp
              </button>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Menu Pesan Modal (WhatsApp Style Chat) */}
      <AnimatePresence>
        {isSchoolInfoOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => {
                setIsSchoolInfoOpen(false);
                setActiveMenu("dashboard");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md h-full sm:h-[80vh] sm:max-h-[700px] bg-[#efe7de] sm:rounded-3xl border border-slate-200/70 shadow-2xl z-10 flex flex-col overflow-hidden"
              style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}
            >
              {/* WhatsApp Header */}
              <div className="shrink-0 p-3 bg-[#075e54] text-white flex items-center gap-3 shadow-md">
                <button 
                  onClick={() => {
                    setIsSchoolInfoOpen(false);
                    setActiveMenu("dashboard");
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Kembali ke Beranda"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-white/40 shadow-sm">
                   <img 
                    src={teacherPhotoUrl || "/assets/aistudio/faceu_20230225135623_f97f0c29.jpg"} 
                    alt="Pak Agan" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                   />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold truncate">Pak Agan</h3>
                  <p className="text-xs text-[#dcf8c6] flex items-center gap-1.5 font-medium leading-tight mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse shrink-0"></span>
                    online
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSchoolInfoOpen(false);
                    setActiveMenu("dashboard");
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="flex justify-center mb-6">
                   <span className="px-3 py-1 bg-[#d1e4fc] text-[#54656f] text-[11px] font-bold rounded-lg shadow-sm uppercase tracking-wider">
                     Pesan Pengumuman
                   </span>
                </div>

                {(() => {
                  // Merge announcements and attendance records into a single chat feed sorted by date (newest first)
                  const studentAnnouncements = (announcementsList || [])
                    .filter((ann: any) => ann.kelasRef === student?.kelas || ann.kelasRef === "SEMUA_KELAS")
                    .map((ann: any) => ({
                      type: "announcement",
                      id: ann.id,
                      timestamp: new Date(ann.publishDate || ann.createdAt || 0).getTime(),
                      dateRaw: ann.publishDate || ann.createdAt,
                      title: ann.title || "Pengumuman",
                      content: ann.content,
                      kelasRef: ann.kelasRef
                    }));

                  const attendanceMessages = (studentAttendanceData || []).map((att: any, aIdx: number) => {
                    const dateObj = new Date(att.date);
                    const dateFormatted = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                      : att.date;
                    const studentName = student?.studentName || student?.displayName || "Siswa";
                    const status = att.status || "Hadir";
                    let contentSentence = "";
                    let motivationalText = "";

                    if (status === "Hadir") {
                      contentSentence = `Halo ${studentName}, terima kasih sudah hadir tepat waktu mengikuti pembelajaran pada pertemuan tanggal ${dateFormatted}. Tetap konsisten dan pertahankan semangat belajarmu!`;
                      motivationalText = `✨ "Kehadiran dan kesungguhanmu hari ini adalah pondasi suksesmu di masa depan!"`;
                    } else if (status === "Sakit") {
                      contentSentence = `Halo ${studentName}, tercatat keterangan Sakit pada pertemuan tanggal ${dateFormatted}. Semoga lekas sembuh dan bisa segera bergabung kembali belajar bersama Pak Agan.`;
                      motivationalText = `🌸 "Kesehatan adalah nikmat utama. Istirahatlah dengan cukup agar kembali bugar!"`;
                    } else if (status === "Izin") {
                      contentSentence = `Halo ${studentName}, tercatat keterangan Izin pada pertemuan tanggal ${dateFormatted}. Semoga urusanmu berjalan lancar dan pastikan untuk menyimak materi serta tugas yang tertinggal ya.`;
                      motivationalText = `📝 "Komunikasi yang baik dan tanggung jawab adalah cermin karakter siswa unggul."`;
                    } else if (status === "Alpa") {
                      contentSentence = `Halo ${studentName}, kamu tercatat Tanpa Keterangan (Alpa) pada pertemuan tanggal ${dateFormatted}. Mohon segera konfirmasi ke Pak Agan dan tingkatkan kedisiplinan kehadiranmu.`;
                      motivationalText = `⚠️ "Setiap hari adalah kesempatan baru. Jadikan hari ini awal untuk lebih disiplin!"`;
                    } else if (status === "Dispen") {
                      contentSentence = `Halo ${studentName}, kamu tercatat Dispensation (Dispen) pada pertemuan tanggal ${dateFormatted} untuk tugas/kegiatan sekolah. Selamat bertugas dan sukses selalu!`;
                      motivationalText = `🏆 "Laksanakan tugas sekolah dengan penuh dedikasi dan jadilah kebanggaan!"`;
                    } else {
                      contentSentence = `Halo ${studentName}, tercatat keterangan ${status} pada pertemuan tanggal ${dateFormatted}.`;
                      motivationalText = `💪 "Tetap semangat dan raih prestasi terbaikmu!"`;
                    }

                    return {
                      type: "attendance",
                      id: att.id || `att-${aIdx}`,
                      timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
                      dateRaw: att.date,
                      status: status,
                      contentSentence,
                      motivationalText,
                      keterangan: att.keterangan,
                      teacher: att.teacher || "Pak Agan",
                      kelasRef: student?.kelas || "X"
                    };
                  });

                  const mergedMessages = [...studentAnnouncements, ...attendanceMessages].sort(
                    (a, b) => b.timestamp - a.timestamp
                  );

                  if (mergedMessages.length === 0) {
                    return (
                      <div className="flex justify-center mt-20 text-slate-500 italic text-sm bg-white/50 p-4 rounded-2xl mx-10 text-center backdrop-blur-xs">
                        Belum ada pesan pengumuman atau presensi.
                      </div>
                    );
                  }

                  return mergedMessages.map((msg: any, idx: number) => {
                    const dateStr = msg.dateRaw;
                    let dateFormatted = "Hari ini";
                    let timeFormatted = "08:00";
                    if (dateStr) {
                      try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                          dateFormatted = d.toLocaleDateString("id-ID", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          });
                          timeFormatted = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
                        }
                      } catch (_) {}
                    }

                    const targetKelasLabel = (!msg.kelasRef || msg.kelasRef === "SEMUA_KELAS" || msg.kelasRef === "Semua Kelas")
                      ? "Semua Kelas"
                      : `Kelas ${msg.kelasRef}`;

                    if (msg.type === "attendance") {
                      let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      if (msg.status === "Sakit") badgeBg = "bg-blue-50 text-blue-700 border-blue-200";
                      else if (msg.status === "Izin") badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                      else if (msg.status === "Alpa") badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
                      else if (msg.status === "Dispen") badgeBg = "bg-purple-50 text-purple-700 border-purple-200";

                      return (
                        <React.Fragment key={`att-chat-${msg.id || "att"}-${idx}`}>
                          {/* Teacher Incoming Attendance Chat Bubble */}
                          <div className="flex justify-start max-w-[88%] animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm relative border border-slate-200 space-y-2">
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                <h5 className="font-bold text-[#075e54] text-xs uppercase tracking-tight truncate">
                                  Laporan Kehadiran
                                </h5>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                    {msg.status}
                                  </span>
                                  <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    🎯 {targetKelasLabel}
                                  </span>
                                </div>
                              </div>

                              {/* WhatsApp Chat Sentence */}
                              <p className="text-sm text-slate-800 leading-relaxed">
                                {msg.contentSentence}
                              </p>

                              {/* Motivational Quote corresponding to status */}
                              <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs font-medium text-amber-950 italic">
                                {msg.motivationalText}
                              </div>

                              {/* Footer with Full Date & Time */}
                              <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
                                <span>📅 {dateFormatted}</span>
                                <span>•</span>
                                <span>{timeFormatted}</span>
                              </div>

                              {/* Tail */}
                              <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                            </div>
                          </div>

                          {/* Student Reply Bubble */}
                          <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                            <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] relative border border-[#c6e9a7]">
                              <p className="text-sm text-slate-800 leading-relaxed">
                                Baik Pak Agan, siap dan terima kasih atas informasinya! 🙏
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-slate-500 font-medium">Dibaca</span>
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                              </div>
                              <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    // Standard Announcement
                    return (
                      <React.Fragment key={`chat-group-${msg.id || "msg"}-${idx}`}>
                        {/* Teacher Bubble (Incoming) */}
                        <div className="flex justify-start max-w-[88%] animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm relative border border-slate-200 space-y-2">
                            {/* Header with Title and Target Class */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              <h5 className="font-bold text-[#075e54] text-xs uppercase tracking-tight truncate">
                                {msg.title}
                              </h5>
                              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                                🎯 {targetKelasLabel}
                              </span>
                            </div>

                            {/* Message Content */}
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>

                            {/* Footer with Full Date & Time */}
                            <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
                              <span>📅 {dateFormatted}</span>
                              <span>•</span>
                              <span>{timeFormatted}</span>
                            </div>

                            {/* Tail */}
                            <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                          </div>
                        </div>

                        {/* Student Reply Bubble (Outgoing) */}
                        <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                          <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] relative border border-[#c6e9a7]">
                            <p className="text-sm text-slate-800 leading-relaxed">
                              Siap Pak Agan, terima kasih informasinya! 🙏
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-slate-500 font-medium">Dibaca</span>
                              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                            </div>
                            <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>

              {/* Fake WhatsApp Input */}
              <div className="shrink-0 p-2 bg-[#f0f2f5] flex items-center gap-2 border-t border-slate-200">
                <div className="flex items-center gap-3 p-2 text-slate-500">
                  <Smile className="w-6 h-6" />
                  <Paperclip className="w-5 h-5 rotate-45" />
                </div>
                <div className="flex-1 bg-white rounded-full py-2 px-4 text-sm text-slate-400 border border-slate-100 shadow-3xs">
                  Ketik pesan...
                </div>
                <div className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md cursor-not-allowed opacity-80">
                  <Mic className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Nilai Modal (Merged: Rejected Tasks + Graded Tasks & Exams in WhatsApp Style Chat) */}
      <AnimatePresence>
        {isGradedInfoOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => {
                setIsGradedInfoOpen(false);
                setActiveMenu("dashboard");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md h-full sm:h-[85vh] sm:max-h-[720px] bg-[#efe7de] sm:rounded-3xl border border-slate-200/70 shadow-2xl z-10 flex flex-col overflow-hidden"
              style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}
            >
              {/* WhatsApp Header */}
              <div className="shrink-0 p-3 bg-[#075e54] text-white flex items-center gap-2.5 shadow-md">
                <button 
                  onClick={() => {
                    setConfirmClearAllInfoNilai(false);
                    setIsGradedInfoOpen(false);
                    setActiveMenu("dashboard");
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Kembali ke Beranda"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-white/40 shadow-sm">
                   <img 
                    src={teacherPhotoUrl || "/assets/aistudio/faceu_20230225135623_f97f0c29.jpg"} 
                    alt="Pak Agan" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                   />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold truncate">Pak Agan • Info Nilai</h3>
                  <p className="text-xs text-[#dcf8c6] flex items-center gap-1.5 font-medium leading-tight mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse shrink-0"></span>
                    online
                  </p>
                </div>
                {(visibleRejectedInfoTasks.length > 0 || allGradedNotifications.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAllInfoNilai((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                    title="Hapus semua pesan informasi nilai"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setConfirmClearAllInfoNilai(false);
                    setIsGradedInfoOpen(false);
                    setActiveMenu("dashboard");
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Inline Confirmation Bar for Deleting All Messages */}
              {confirmClearAllInfoNilai && (visibleRejectedInfoTasks.length > 0 || allGradedNotifications.length > 0) && (
                <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-3.5 py-2.5 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-bold text-rose-900 leading-snug">
                    Hapus semua ({visibleRejectedInfoTasks.length + allGradedNotifications.length}) pesan info nilai?
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmClearAllInfoNilai(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rejectedKeys = visibleRejectedInfoTasks.map((t: any) => {
                          const sub = t.submission;
                          return `rejected-info-${t.id}__${sub?.updatedAt || sub?.createdAt || sub?.rejectionReason || sub?.keterangan || "v1"}`;
                        });
                        const gradedKeys = allGradedNotifications.map((n: any) => n.dismissKey);
                        handleDeleteAllInfoNilai([...rejectedKeys, ...gradedKeys]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Ya, Hapus Semua
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {(() => {
                  const sortedRejectedTasks = [...visibleRejectedInfoTasks].sort((a: any, b: any) => {
                    const timeA = new Date(a.submission?.updatedAt || a.submission?.createdAt || a.deadline || 0).getTime();
                    const timeB = new Date(b.submission?.updatedAt || b.submission?.createdAt || b.deadline || 0).getTime();
                    return timeB - timeA;
                  });

                  const sortedGradedNotifications = [...allGradedNotifications].sort((a: any, b: any) => {
                    const timeA = new Date(a.dateStr || 0).getTime();
                    const timeB = new Date(b.dateStr || 0).getTime();
                    return timeB - timeA;
                  });

                  if (sortedRejectedTasks.length === 0 && sortedGradedNotifications.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center mt-12 bg-white/85 p-6 rounded-3xl mx-4 text-center backdrop-blur-xs border border-white shadow-sm space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                          <Award className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Belum Ada Informasi Nilai</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Tugas atau ujian kamu sedang diproses dan dikoreksi oleh Pak Agan. Informasi nilai maupun catatan perbaikan akan muncul di sini secara otomatis.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsGradedInfoOpen(false);
                            setActiveMenu("dashboard");
                          }}
                          className="mt-2 px-4 py-2 bg-[#85cc00] hover:bg-[#7bc000] text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Kembali ke Beranda
                        </button>
                      </div>
                    );
                  }

                  const studentName = student?.nama || student?.name || student?.displayName || "Siswa";

                  return (
                    <>
                      {/* 1. Tugas Ditolak Section (Red Alert inside Nilai) */}
                      {sortedRejectedTasks.length > 0 && (
                        <>
                          <div className="flex justify-center mb-2">
                            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg shadow-xs uppercase tracking-wider border border-rose-200/80">
                              Tugas Ditolak • Perlu Perbaikan ({sortedRejectedTasks.length})
                            </span>
                          </div>
                          {sortedRejectedTasks.map((t: any, idx: number) => {
                            const sub = t.submission;
                            const rejectDismissKey = `rejected-info-${t.id}__${sub?.updatedAt || sub?.createdAt || sub?.rejectionReason || sub?.keterangan || "v1"}`;
                            const dateStr = sub?.updatedAt || sub?.createdAt || t.deadline;
                            let dateFormatted = "Hari ini";
                            let timeFormatted = "08:00";
                            if (dateStr) {
                              try {
                                const d = new Date(dateStr);
                                if (!isNaN(d.getTime())) {
                                  dateFormatted = d.toLocaleDateString("id-ID", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  });
                                  timeFormatted = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
                                }
                              } catch (_) {}
                            }

                            const alasan = sub?.keterangan || sub?.feedback || "Tugas belum memenuhi instruksi atau belum lengkap, silakan periksa kembali dan kirimkan perbaikan.";

                            return (
                              <React.Fragment key={`rejected-chat-${t.id || "rej"}-${idx}`}>
                                <div className="flex justify-start max-w-[90%] animate-in fade-in slide-in-from-left-4 duration-300">
                                  <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm relative border-2 border-rose-300 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                                        <AlertOctagon className="w-3 h-3" />
                                        Tugas Ditolak
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSingleInfoNilai(rejectDismissKey)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Hapus pesan ini"
                                        aria-label="Hapus pesan ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                      Halo <span className="font-bold text-slate-900">{studentName}</span>, tugas <span className="font-bold text-slate-900">{t.materi || t.title || "Tugas Informatika"}</span> ({t.bab || "-"}) kamu perlu diperbaiki dengan catatan dari Pak Agan: <span className="italic font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">&ldquo;{alasan}&rdquo;</span>. Silakan segera diperbaiki dan dikirimkan kembali ya!
                                    </p>

                                    <div className="pt-0.5">
                                      <button
                                        onClick={() => {
                                          setIsGradedInfoOpen(false);
                                          setActiveMenu("daftar-tugas");
                                          setTaskFilter("ditolak");
                                          setSelectedTugas(t);
                                          setIsUploadModalOpen(true);
                                        }}
                                        className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        Perbaiki & Kirim Ulang Tugas Ini
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
                                      <span>📅 {dateFormatted}</span>
                                      <span>•</span>
                                      <span>{timeFormatted}</span>
                                    </div>

                                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                                  </div>
                                </div>

                                <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                                  <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] relative border border-[#c6e9a7] space-y-1">
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                      Baik Pak Agan, terima kasih informasinya. Saya akan segera memperbaiki tugas <span className="font-bold">{t.materi || t.title}</span> dan mengirimkannya kembali.
                                    </p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                      <span className="text-[10px] text-slate-500 font-medium">Baru saja</span>
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                                    </div>
                                    <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}

                      {/* 2. Tugas & Ujian Selesai Dinilai Section */}
                      {sortedGradedNotifications.length > 0 && (
                        <>
                          <div className="flex justify-center pt-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-bold rounded-lg shadow-xs uppercase tracking-wider border border-emerald-200/60">
                              Tugas & Ujian Selesai Dinilai ({sortedGradedNotifications.length})
                            </span>
                          </div>

                          {sortedGradedNotifications.map((item: any, idx: number) => {
                            const dateStr = item.dateStr;
                            let dateFormatted = "Hari ini";
                            let timeFormatted = "08:00";
                            if (dateStr) {
                              try {
                                const d = new Date(dateStr);
                                if (!isNaN(d.getTime())) {
                                  dateFormatted = d.toLocaleDateString("id-ID", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  });
                                  timeFormatted = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
                                }
                              } catch (_) {}
                            }

                            return (
                              <React.Fragment key={`graded-chat-${item.id || "grd"}-${idx}`}>
                                <div className="flex justify-start max-w-[90%] animate-in fade-in slide-in-from-left-4 duration-300">
                                  <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm relative border border-emerald-200 space-y-2">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                        <Award className="w-3 h-3" />
                                        Info Nilai {item.type === "ujian" ? "Ujian" : "Tugas"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSingleInfoNilai(item.dismissKey)}
                                        className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Hapus pesan ini"
                                        aria-label="Hapus pesan ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                      Halo <span className="font-bold text-slate-900">{studentName}</span>, {item.type === "ujian" ? "ujian online" : "tugas"} <span className="font-bold text-slate-900">{item.title}</span> ({item.bab}) kamu sudah dinilai oleh Pak Agan dengan perolehan nilai <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{item.score}</span>.{item.catatanGuru ? ` Catatan dari Pak Agan: "${item.catatanGuru}".` : " Tetap pertahankan prestasimu!"}
                                    </p>

                                    <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
                                      <span>📅 {dateFormatted}</span>
                                      <span>•</span>
                                      <span>{timeFormatted}</span>
                                    </div>

                                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                                  </div>
                                </div>

                                <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                                  <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] relative border border-[#c6e9a7] space-y-1">
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                      Terima kasih Pak Agan atas penilaiannya! 🙏
                                    </p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                      <span className="text-[10px] text-slate-500 font-medium">Baru saja</span>
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                                    </div>
                                    <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] border-r-[10px] border-r-transparent"></div>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Fake WhatsApp Input */}
              <div className="shrink-0 p-2 bg-[#f0f2f5] flex items-center gap-2 border-t border-slate-200">
                <div className="flex items-center gap-3 p-2 text-slate-500">
                  <Smile className="w-6 h-6" />
                  <Paperclip className="w-5 h-5 rotate-45" />
                </div>
                <div className="flex-1 bg-white rounded-full py-2 px-4 text-sm text-slate-400 border border-slate-100 shadow-3xs truncate">
                  Ketik pesan atau konfirmasi...
                </div>
                <div className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md cursor-not-allowed opacity-80">
                  <Mic className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ganti Password Modal */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setIsChangePasswordOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-auto"
            >
              <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-slate-900 font-bold">Keamanan Akun</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Ganti Password Siswa</p>
                </div>
              </div>
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
                <p>
                  Untuk alasan keamanan dan keselarasan data sekolah, penggantian password akun siswa dilayani langsung oleh **Admin Kurikulum & Operator Dapodik SMAN 1 Cililin**.
                </p>
                <p className="p-4 bg-amber-50/50 text-amber-900 rounded-2xl text-[11px] leading-relaxed font-mono border border-amber-100">
                  Silakan hubungi Wali Kelas atau Tim Teknis IT Sekolah di ruang ICT untuk mengajukan reset sandi/password secara aman.
                </p>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="w-full mt-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tips Belajar Modal */}
      <AnimatePresence>
        {isTipsModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setIsTipsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 z-10 mx-auto overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black leading-tight">Panduan & Tips Belajar</h3>
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mt-0.5">Strategi Sukses Belajar Informatika</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTipsModalOpen(false)}
                  className="text-white/85 hover:text-white transition-all p-2 hover:bg-white/10 rounded-xl active:scale-95 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 overflow-y-auto max-h-[55vh] custom-scrollbar">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Kiat Sukses Menguasai Materi</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Literasi Digital Mandiri",
                      desc: "Gunakan menu Literasi untuk mengakses modul PDF dan video pembelajaran. Belajar secara mandiri adalah kunci sukses Kurikulum Merdeka.",
                      icon: BookOpen,
                      color: "text-blue-600 bg-blue-50 border-blue-100",
                    },
                    {
                      title: "Pantau Tugas & Progres",
                      desc: "Pastikan status tugasmu 'Sudah Dinilai'. Gunakan riwayat pengiriman untuk meninjau kembali feedback dari Guru Pembimbing.",
                      icon: Target,
                      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                    },
                    {
                      title: "Integritas Ujian CBT",
                      desc: "Saat Ujian Online aktif, sistem akan memantau fokus Anda. Jaga status integritas tetap 'Sangat Berintegritas' untuk hasil yang valid.",
                      icon: ShieldCheck,
                      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                    },
                    {
                      title: "Kehadiran & Kedisiplinan",
                      desc: "Kehadiran harian mencerminkan kedisiplinan Anda. Pastikan Anda selalu hadir tepat waktu di setiap pertemuan kelas.",
                      icon: Clock,
                      color: "text-amber-600 bg-amber-50 border-amber-100",
                    },
                    {
                      title: "Informasi Terintegrasi",
                      desc: "Selalu periksa menu 'Pengumuman' di dasbor untuk mendapatkan update terbaru mengenai jadwal ujian atau info sekolah lainnya.",
                      icon: Sparkles,
                      color: "text-rose-600 bg-rose-50 border-rose-100",
                    }
                  ].map((tip, i) => (
                    <div key={`cbt-tips-card-${tip.title || i}-${i}`} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${tip.color}`}>
                        <tip.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{tip.title}</h4>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setIsTipsModalOpen(false)}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Mulai Belajar Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful Dynamic Toast for Sync Notifications */}
      <AnimatePresence>
        {syncToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 z-[100] max-w-sm bg-slate-900 text-white p-4.5 rounded-2xl shadow-xl flex items-center gap-3.5 border border-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              {syncToastMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5"
            >
              {/* Header close button */}
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 shadow-sm border border-rose-100/50">
                  <LogOut className="w-8 h-8 text-rose-500" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                  Konfirmasi Keluar
                </h3>
                <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed px-2">
                  Apakah Anda yakin ingin mengakhiri sesi belajar Anda sekarang?
                </p>

                <div className="flex flex-col w-full gap-2.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#85cc00] text-slate-900 font-bold hover:brightness-105 transition-all cursor-pointer text-sm shadow-lg shadow-[#85cc00]/20 active:scale-[0.98]"
                  >
                    Ya, Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(false)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-all cursor-pointer text-sm active:scale-[0.98]"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
      </div>
      </main>
      </div> {/* Close Main Content Viewport */}
      {/* Floating Photo Warning */}
      <AnimatePresence>
        {showPhotoWarning && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-md"
          >
            <div className="bg-white border-2 border-[#85cc00] rounded-2xl p-5 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#85cc00]/20 flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6 text-[#85cc00]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Segera Tambahkan Foto Profil Anda</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Silakan salin (copy) dan tempel (paste) <strong>link Google Drive</strong> foto Anda melalui menu Profil agar mudah dikenali oleh Guru.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoWarning(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paste Helper Dialog Modal */}
      <AnimatePresence>
        {showPasteDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
              onClick={() => setShowPasteDialog(false)}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200/80 ring-1 ring-slate-900/5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                    <Clipboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Tempelkan (Paste) Tautan Tugas</h3>
                    <p className="text-[11px] font-semibold text-slate-500">Izin clipboard otomatis dibatasi oleh browser/iFrame.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteDialog(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Klik kolom di bawah ini lalu tekan <span className="font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Ctrl + V</span> atau <span className="font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Tahan &amp; Tempel</span>:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={pasteDialogText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasteDialogText(val);
                    if (val.trim().startsWith("http")) {
                      setSelectedFile(val.trim());
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted) {
                      setPasteDialogText(pasted);
                      setSelectedFile(pasted.trim());
                    }
                  }}
                  placeholder="Klik di sini, lalu tekan Ctrl + V..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-2xl text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteDialog(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pasteDialogText.trim()) {
                      setSelectedFile(pasteDialogText.trim());
                    }
                    setShowPasteDialog(false);
                  }}
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#85cc00] hover:bg-[#72b000] rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  Gunakan Tautan Ini
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar (Unified Styling: Pesan, Nilai, Beranda, Si Pinter, Pengguna) */}
      {!isExamOn && (
        <nav
          aria-label="Student Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-[80] bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.06)] px-2 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] min-h-[72px] flex items-center justify-center overflow-visible"
        >
          <div className="w-full max-w-lg md:max-w-xl grid grid-cols-5 items-center overflow-visible">
            {/* 1. Ujung Kiri: Pesan */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setIsGradedInfoOpen(false);
                  setIsSchoolInfoOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[#85cc00] transition-all cursor-pointer group active:scale-95"
              >
                <div className="relative w-8 h-8 rounded-xl bg-[#85cc00]/10 text-[#85cc00] flex items-center justify-center group-hover:bg-[#85cc00] group-hover:text-white transition-all shadow-3xs">
                  <MessageSquare className="w-4.5 h-4.5" />
                  {dashboardAnnouncements.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
                  )}
                </div>
                <span className="text-[10px] font-extrabold tracking-tight text-[#85cc00] leading-none whitespace-nowrap">Pesan</span>
              </button>
            </div>

            {/* 2. Kiri Tengah: Nilai (Gabungan Tugas Ditolak & Tugas/Ujian Dinilai) */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setIsSchoolInfoOpen(false);
                  setConfirmClearAllInfoNilai(false);
                  setIsGradedInfoOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[#85cc00] transition-all cursor-pointer group active:scale-95"
              >
                <div className="relative w-8 h-8 rounded-xl bg-[#85cc00]/10 text-[#85cc00] flex items-center justify-center group-hover:bg-[#85cc00] group-hover:text-white transition-all shadow-3xs">
                  <Award className="w-4.5 h-4.5" />
                  {visibleRejectedInfoTasks.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-sm"
                      title={`${visibleRejectedInfoTasks.length} Tugas Ditolak`}
                    >
                      {visibleRejectedInfoTasks.length}
                    </span>
                  )}
                  {allGradedNotifications.length > 0 && (
                    <span
                      className={`absolute -top-1 ${rejectedTasks.length > 0 ? "-left-1" : "-right-1"} min-w-[16px] h-4 px-1 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white shadow-sm animate-pulse`}
                      title={`${allGradedNotifications.length} Tugas/Ujian Dinilai`}
                    >
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                      <span className="relative z-10">{allGradedNotifications.length}</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold tracking-tight text-[#85cc00] leading-none whitespace-nowrap">Nilai</span>
              </button>
            </div>

            {/* 3. Tepat di Tengah (Item #3 dari 5): Beranda */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setIsSchoolInfoOpen(false);
                  setIsGradedInfoOpen(false);
                  setActiveMenu("dashboard");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 transition-all cursor-pointer group"
                title="Beranda"
              >
                <div className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-[#85cc00] to-emerald-600 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center border-4 border-white active:scale-95 transition-all hover:scale-105 shrink-0">
                  <Home className="w-5 h-5 fill-white" />
                </div>
                <span className="text-[10px] font-black tracking-tight text-[#85cc00] leading-none whitespace-nowrap">Beranda</span>
              </button>
            </div>

            {/* 4. Kanan Tengah: Si Pinter */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setIsSchoolInfoOpen(false);
                  setIsGradedInfoOpen(false);
                  setIsAiChatOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[#85cc00] transition-all cursor-pointer group active:scale-95"
                title="Tanya Si Pinter"
              >
                <div className="relative w-8 h-8 rounded-xl bg-[#85cc00]/10 text-[#85cc00] flex items-center justify-center group-hover:bg-[#85cc00] group-hover:text-white transition-all shadow-3xs">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-extrabold tracking-tight text-[#85cc00] leading-none whitespace-nowrap">Si Pinter</span>
              </button>
            </div>

            {/* 5. Paling Kanan: Pengguna */}
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setIsSchoolInfoOpen(false);
                  setIsGradedInfoOpen(false);
                  setTempPhotoUrl(student?.profilePhotoUrl || "");
                  setIsProfileLinkDisabled(!!student?.profilePhotoUrl);
                  setIsProfileModalOpen(true);
                }}
                className="flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[#85cc00] transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-8 h-8 rounded-xl bg-[#85cc00]/10 text-[#85cc00] flex items-center justify-center group-hover:bg-[#85cc00] group-hover:text-white transition-all shadow-3xs">
                  <User className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-extrabold tracking-tight text-[#85cc00] leading-none whitespace-nowrap">Pengguna</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Lightbox Zoom Gambar Soal CBT */}
      {zoomedQuestionImg && (
        <div
          onClick={() => setZoomedQuestionImg(null)}
          className="fixed inset-0 z-[500] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setZoomedQuestionImg(null)}
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedQuestionImg}
            alt="Pratinjau Gambar Soal Diperbesar"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl border border-white/20 bg-white"
          />
        </div>
      )}

    </div>
  );
}
