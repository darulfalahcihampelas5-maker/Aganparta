import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  AlertCircle,
  Trash2,
  MessageSquare,
  BookOpen,
  Search,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Upload,
  Award,
  MonitorPlay,
  ClipboardList,
  UserCheck,
  Sparkles,
  User,
  ShieldAlert,
} from "lucide-react";
import smartTeacherAvatar from "../../assets/images/sipinter_sma_avatar_1794657225547.jpg";
import { getDriveImageUrl, getDriveImageFallbackUrl } from "../../lib/driveUtils";
import { EtikaDigitalModal } from "./EtikaDigitalModal";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { OperationType, handleFirestoreError } from "../../lib/firestoreUtils";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentPhotoUrl?: string;
}

interface GuideArticle {
  id: string;
  number: string;
  category: "Tugas" | "Ujian & Nilai" | "Fitur Lain" | "Dasar";
  readTime: string;
  title: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: {
    title: string;
    detail: string;
  }[];
  tip?: string;
  checklist?: string[];
  askPrompt: string;
}

const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: "mengenal-sipinter",
    number: "01",
    category: "Dasar",
    readTime: "2 menit baca",
    title: "Mengenal Menu & Fitur Utama Si-Pinter App",
    summary: "Panduan cepat memahami seluruh menu di Dasbor Siswa agar aktivitas belajar Informatika lebih terarah.",
    icon: Sparkles,
    steps: [
      {
        title: "Beranda (Dashboard Utama)",
        detail: "Menampilkan ringkasan progres belajar, kartu akses cepat (Tugas, Nilai, Kehadiran, Materi, Ujian Online, Simulasi), dan pengumuman terbaru."
      },
      {
        title: "Navigasi Bawah Layar (Mobile)",
        detail: "Tersedia 5 tombol cepat: Pesan (pengumuman Pak Agan), Nilai (gabungan info nilai & tugas ditolak), Beranda, Si Pinter (AI & Panduan), dan Pengguna (foto & kata sandi)."
      },
      {
        title: "Materi Ajar & Simulasi",
        detail: "Pelajari modul per bab pada menu Materi Ajar serta jalankan praktik interaktif (seperti Berpikir Komputasional atau Sorting) di menu Simulasi bila telah diaktifkan guru."
      }
    ],
    tip: "Gunakan tombol Sinkron di pojok kanan atas apabila ada tugas atau nilai terbaru yang belum langsung terlihat.",
    askPrompt: "Jelaskan secara singkat fungsi masing-masing menu yang ada di Dasbor Siswa Si-Pinter App."
  },
  {
    id: "upload-tugas",
    number: "02",
    category: "Tugas",
    readTime: "3 menit baca",
    title: "Cara Mengumpulkan Tugas via Link & Kamera (Anti-Ditolak)",
    summary: "Langkah benar mengunggah tautan Google Drive, Canva, atau CamScanner agar langsung bisa dibuka dan dinilai guru.",
    icon: Upload,
    steps: [
      {
        title: "Buka Menu Tugas Siswa",
        detail: "Pilih kartu Tugas Siswa di Beranda, lalu lihat daftar tugas yang berstatus Belum Dikerjakan. Klik tombol Lihat Tugas untuk membaca instruksi dan soal dari Pak Agan."
      },
      {
        title: "Siapkan File & Atur Akses Berbagi Publik",
        detail: "Jika memakai Google Drive, CamScanner, Canva, atau OneDrive, pastikan setelan berbagi diubah menjadi 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link)."
      },
      {
        title: "Tempel Link atau Gunakan Kamera",
        detail: "Salin tautan tersebut lalu tempel ke kolom pengumpulan tugas di Si-Pinter App (atau gunakan opsi unggah foto kamera bila tersedia) kemudian klik Kirim."
      },
      {
        title: "Pantau Status Penilaian",
        detail: "Setelah terkirim, status tugas otomatis berubah menjadi Menunggu Penilaian hingga Pak Agan memberikan nilai atau catatan revisi."
      }
    ],
    tip: "Penyebab utama tugas ditolak adalah link Google Drive masih terkunci (Restricted). Selalu uji buka link di mode penyamaran (Incognito) sebelum dikirim.",
    checklist: [
      "Nama file & tugas sudah sesuai instruksi Pak Agan",
      "Izin link Google Drive/Cloud sudah 'Siapa saja yang memiliki link dapat melihat'",
      "Link yang ditempel sudah lengkap dan tidak terpotong",
      "Status berubah menjadi Menunggu Penilaian setelah dikirim"
    ],
    askPrompt: "Bagaimana cara mengatur akses Google Drive agar tugas saya bisa dibuka oleh Pak Agan dan tidak ditolak?"
  },
  {
    id: "tugas-ditolak",
    number: "03",
    category: "Ujian & Nilai",
    readTime: "2 menit baca",
    title: "Memahami Notifikasi Nilai & Memperbaiki Tugas Ditolak",
    summary: "Arti notifikasi merah dan hijau berkedip di menu Nilai serta cara cepat mengirim ulang perbaikan tugas.",
    icon: Award,
    steps: [
      {
        title: "Cek Warna Lencana pada Menu Nilai",
        detail: "Lencana merah menandakan ada tugas yang ditolak dan perlu revisi. Lencana hijau berkedip menandakan ada hasil tugas atau ujian CBT yang sudah dinilai."
      },
      {
        title: "Baca Catatan Guru di Menu Nilai",
        detail: "Buka menu Nilai untuk melihat semua pemberitahuan dalam tampilan percakapan yang rapi. Tugas yang ditolak tampil paling atas agar tidak terlewat."
      },
      {
        title: "Klik Tombol Perbaiki & Kirim Ulang",
        detail: "Langsung tekan tombol 'Perbaiki & Kirim Ulang Tugas Ini' di dalam pesan penolakan untuk membuka form unggah ulang tugas tersebut."
      }
    ],
    tip: "Jika lencana merah dan hijau muncul bersamaan di ikon Nilai, artinya ada tugas yang perlu diperbaiki sekaligus ada nilai baru yang sudah masuk.",
    askPrompt: "Apa perbedaan notifikasi merah dan hijau berkedip di menu Nilai, dan bagaimana cara memperbaiki tugas yang ditolak?"
  },
  {
    id: "ujian-cbt",
    number: "04",
    category: "Ujian & Nilai",
    readTime: "2 menit baca",
    title: "Aturan & Tips Mengikuti Ujian Online (CBT)",
    summary: "Persiapan penting agar ujian berjalan lancar dengan mode layar penuh dan terhindar dari pelanggaran sistem.",
    icon: MonitorPlay,
    steps: [
      {
        title: "Masukkan Token Ujian dari Guru",
        detail: "Buka menu Ujian Online, pilih ujian yang aktif untuk kelasmu, lalu masukkan token resmi yang dibagikan oleh Pak Agan."
      },
      {
        title: "Kerjakan dalam Mode Layar Penuh (Fullscreen)",
        detail: "Selama ujian berlangsung, aplikasi mengaktifkan mode layar penuh. Jangan berpindah tab, membuka aplikasi lain, atau keluar dari layar penuh."
      },
      {
        title: "Progres Tersimpan Otomatis",
        detail: "Jawabanmu tersimpan secara berkala. Jika koneksi sempat terganggu, tetap tenang dan jangan menutup paksa browser."
      }
    ],
    tip: "Berpindah tab atau keluar dari mode fullscreen saat ujian aktif dapat tercatat sebagai pelanggaran integritas oleh sistem.",
    askPrompt: "Apa saja hal yang harus diperhatikan saat mengerjakan Ujian Online CBT di Si-Pinter App?"
  },
  {
    id: "kehadiran-materi",
    number: "05",
    category: "Fitur Lain",
    readTime: "2 menit baca",
    title: "Memantau Kehadiran & Progres Materi Ajar",
    summary: "Cara mengecek rekap presensi harian serta menandai materi favorit dan status belajar per bab.",
    icon: ClipboardList,
    steps: [
      {
        title: "Menu Kehadiran Siswa",
        detail: "Pantau jumlah Hadir, Sakit, Izin, Alpa, dan Dispensasi beserta persentase kehadiranmu secara real-time."
      },
      {
        title: "Menu Materi Ajar",
        detail: "Filter modul berdasarkan Semua, per Bab, atau Favorit. Kamu juga dapat memperbarui progres setiap materi ke 'Sedang Dipelajari' atau 'Selesai'."
      }
    ],
    tip: "Apabila menemukan ketidaksesuaian catatan presensi (misal tercatat Alpa padahal sedang sakit/izin), segera konfirmasi secara sopan kepada Pak Agan atau wali kelas.",
    askPrompt: "Bagaimana cara memantau persentase kehadiran dan menandai materi favorit di Si-Pinter App?"
  },
  {
    id: "profil-akun",
    number: "06",
    category: "Fitur Lain",
    readTime: "1 menit baca",
    title: "Mengatur Foto Profil & Mengganti Kata Sandi",
    summary: "Panduan menjaga keamanan akun siswa dan memperbarui foto profil melalui menu Pengguna.",
    icon: UserCheck,
    steps: [
      {
        title: "Buka Menu Pengguna",
        detail: "Ketuk ikon Pengguna di pojok kanan bawah (mobile) untuk membuka panel informasi akun siswa."
      },
      {
        title: "Perbarui Tautan Foto Profil",
        detail: "Tempelkan tautan foto yang dapat diakses publik, lalu tekan Simpan. Jika ingin mengganti, klik Edit Link."
      },
      {
        title: "Ganti Password Secara Berkala",
        detail: "Gunakan tombol Ganti Password di panel profil untuk memperbarui kata sandi akun agar tetap aman."
      }
    ],
    askPrompt: "Bagaimana cara mengganti foto profil dan kata sandi akun siswa di Si-Pinter App?"
  }
];

function getFirstName(name?: string): string {
  if (!name || typeof name !== "string" || !name.trim()) return "Siswa";
  const firstWord = name.trim().split(/\s+/)[0] || "Siswa";
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

function renderFormattedLine(line: string, lineIdx: number): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <React.Fragment key={`line-${lineIdx}`}>
      {parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={`b-${lineIdx}-${pIdx}`} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={`t-${lineIdx}-${pIdx}`}>{part}</React.Fragment>;
      })}
    </React.Fragment>
  );
}

function renderFormattedMessage(text: string, isUser: boolean, isStreaming: boolean): React.ReactNode {
  if (isUser) {
    return <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">{text}</p>;
  }
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed text-slate-700">
      {lines.map((line, idx) => {
        const isLastLine = idx === lines.length - 1;
        if (!line.trim()) {
          return <div key={`sp-${idx}`} className="h-1" />;
        }
        return (
          <p key={`p-${idx}`}>
            {renderFormattedLine(line, idx)}
            {isStreaming && isLastLine && (
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#075e54]/75 rounded-xs animate-pulse"
              />
            )}
          </p>
        );
      })}
    </div>
  );
}

export const AiChatModal: React.FC<AiChatModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentPhotoUrl
}) => {
  const firstName = getFirstName(studentName);
  const assistantName = "Si Pinter";

  const [activeTab, setActiveTab] = useState<"chat" | "guide">("chat");
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [guideSearch, setGuideSearch] = useState("");
  const [guideCategory, setGuideCategory] = useState<string>("Semua");
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [studentAvatarStage, setStudentAvatarStage] = useState<"primary" | "fallback" | "initials">("primary");

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEtikaModalOpen, setIsEtikaModalOpen] = useState(false);
  const [isEtikaMandatory, setIsEtikaMandatory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wordTimerRef = useRef<number | null>(null);
  const sessionCacheRef = useRef<Map<string, string>>(new Map());

  // Otomatis tampilkan Modal Etika Digital pada akses pertama siswa
  useEffect(() => {
    if (!isOpen) return;
    try {
      const studentKey = encodeURIComponent((studentName || "siswa").trim().toLowerCase());
      const accepted =
        localStorage.getItem(`sipinter_etika_accepted_${studentKey}`) === "true" ||
        localStorage.getItem("sipinter_etika_accepted_global") === "true";
      if (!accepted) {
        setIsEtikaMandatory(true);
        setIsEtikaModalOpen(true);
      }
    } catch {
      // safe fallback
    }
  }, [isOpen, studentName]);

  useEffect(() => {
    setStudentAvatarStage(studentPhotoUrl ? "primary" : "initials");
  }, [studentPhotoUrl]);

  const stopActiveStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (wordTimerRef.current !== null) {
      window.clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    setStreamingMsgId(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopActiveStream();
    }
    return () => {
      stopActiveStream();
    };
  }, [isOpen]);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (!isOpen) return;
    const greetingText = `Halo **${firstName}**, selamat datang! Saya **${assistantName}**, asisten cerdas resmi dari aplikasi **Si-Pinter App** SMAN 1 Cililin.\n\nDengan senang hati saya siap membantu ${firstName} mendalami materi **Informatika Kelas X** maupun menjawab pertanyaan seputar penggunaan aplikasi ini. Silakan ketik pertanyaan Anda atau buka tab **Panduan Aplikasi** di atas.`;

    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: "msg-greeting",
            role: "bot",
            content: greetingText,
            timestamp: new Date()
          }
        ];
      }
      if (prev.length === 1 && prev[0].role === "bot" && prev[0].content !== greetingText) {
        return [
          {
            ...prev[0],
            content: greetingText
          }
        ];
      }
      return prev;
    });
  }, [isOpen, firstName, assistantName]);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom(Boolean(streamingMsgId));
    }
  }, [messages, isLoading, activeTab, streamingMsgId]);

  const filteredGuides = useMemo(() => {
    const q = guideSearch.trim().toLowerCase();
    return GUIDE_ARTICLES.filter((article) => {
      const matchCat = guideCategory === "Semua" || article.category === guideCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.steps.some(
          (s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
        )
      );
    });
  }, [guideSearch, guideCategory]);

  const activeGuide = useMemo(
    () => GUIDE_ARTICLES.find((g) => g.id === selectedGuideId) || null,
    [selectedGuideId]
  );

  const resolvedStudentAvatarSrc = useMemo(() => {
    if (!studentPhotoUrl || studentAvatarStage === "initials") return "";
    if (studentAvatarStage === "fallback") return getDriveImageFallbackUrl(studentPhotoUrl);
    return getDriveImageUrl(studentPhotoUrl);
  }, [studentPhotoUrl, studentAvatarStage]);

  const sendMessageText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isLoading || streamingMsgId) return;

    stopActiveStream();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: trimmed,
      timestamp: new Date()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    const logAiInteraction = async (questionText: string, replyText: string, durationMs: number) => {
      try {
        const isProfanityWarning = replyText.includes("Peringatan Etika Digital");
        const flaggedMatch = isProfanityWarning
          ? replyText.match(/terdeteksi kata:\s*"([^"]+)"/i)
          : null;
        const flaggedWord = flaggedMatch?.[1] || "";
        const nowIso = new Date().toISOString();

        try {
          await addDoc(collection(db, "aiChatLogs"), {
            studentName: studentName || firstName || "Siswa",
            questionText,
            durationMs: Math.max(1, Math.round(durationMs)),
            flagged: isProfanityWarning,
            ...(flaggedWord ? { flaggedWord } : {}),
            timestamp: nowIso,
          });
        } catch (err: any) {
          if (err?.code === "permission-denied" || String(err?.message || "").includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.CREATE, "aiChatLogs");
          }
        }

        if (isProfanityWarning) {
          try {
            await addDoc(collection(db, "aiViolations"), {
              studentName: studentName || firstName || "Siswa",
              questionText,
              flaggedWord: flaggedWord || "kata terlarang",
              status: "Belum Ditindaklanjuti",
              timestamp: nowIso,
            });
          } catch (err: any) {
            if (err?.code === "permission-denied" || String(err?.message || "").includes("Missing or insufficient permissions")) {
              handleFirestoreError(err, OperationType.CREATE, "aiViolations");
            }
          }
        }
      } catch {
        // Ignore non-fatal telemetry logging errors so chat experience stays smooth
      }
    };

    const reqStartTime = performance.now();

    // Microsecond client-side cache hit for repeated standalone questions
    const normalizedKey = trimmed.toLowerCase().replace(/\s+/g, " ");
    const hasPriorUserTurn = messages.some((m) => m.role === "user");
    const cachedSessionAnswer = !hasPriorUserTurn ? sessionCacheRef.current.get(normalizedKey) : undefined;

    if (cachedSessionAnswer) {
      const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: "bot",
          content: cachedSessionAnswer,
          timestamp: new Date()
        }
      ]);
      void logAiInteraction(trimmed, cachedSessionAnswer, performance.now() - reqStartTime);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${window.location.origin}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          studentName,
          stream: true,
          messages: nextMessages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content
          }))
        })
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || `Gagal mendapatkan respon dari ${assistantName}.`);
        }
        const textErr = await response.text();
        throw new Error(textErr || `Gagal mendapatkan respon valid dari ${assistantName}.`);
      }

      if (contentType.includes("text/event-stream") && response.body) {
        // Consume ReadableStream via Web TextDecoderStream (with byte-reader fallback)
        const textStream =
          typeof TextDecoderStream !== "undefined"
            ? response.body.pipeThrough(new TextDecoderStream())
            : new ReadableStream<string>({
                async start(streamController) {
                  const byteReader = response.body!.getReader();
                  const decoder = new TextDecoder();
                  try {
                    while (true) {
                      const { done, value } = await byteReader.read();
                      if (done) {
                        const tail = decoder.decode();
                        if (tail) streamController.enqueue(tail);
                        streamController.close();
                        break;
                      }
                      streamController.enqueue(decoder.decode(value, { stream: true }));
                    }
                  } catch (err) {
                    streamController.error(err);
                  }
                }
              });

        const reader = textStream.getReader();
        const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const wordQueue: string[] = [];
        let sseBuffer = "";
        let displayedText = "";
        let hasCreatedBotMessage = false;
        let streamDone = false;
        let streamError: Error | null = null;

        const ensureBotBubble = () => {
          if (!hasCreatedBotMessage) {
            hasCreatedBotMessage = true;
            setIsLoading(false);
            setStreamingMsgId(botMsgId);
            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                role: "bot",
                content: "",
                timestamp: new Date()
              }
            ]);
          }
        };

        const enqueueTextWords = (chunk: string) => {
          const tokens = chunk.match(/\S+\s*|\n+/g);
          if (tokens && tokens.length > 0) {
            wordQueue.push(...tokens);
          } else if (chunk) {
            wordQueue.push(chunk);
          }
        };

        const drainFinishedPromise = new Promise<void>((resolve, reject) => {
          // Ultra-fast 8ms word flush eliminates artificial client-side delay
          wordTimerRef.current = window.setInterval(() => {
            if (controller.signal.aborted) {
              if (wordTimerRef.current !== null) {
                window.clearInterval(wordTimerRef.current);
                wordTimerRef.current = null;
              }
              resolve();
              return;
            }

            if (wordQueue.length > 0) {
              ensureBotBubble();
              const wordsPerTick = Math.max(1, Math.ceil(wordQueue.length / 5));
              const nextSlice = wordQueue.splice(0, wordsPerTick).join("");
              displayedText += nextSlice;

              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, content: displayedText } : m))
              );
            }

            if (streamDone && wordQueue.length === 0) {
              if (wordTimerRef.current !== null) {
                window.clearInterval(wordTimerRef.current);
                wordTimerRef.current = null;
              }
              setStreamingMsgId(null);
              if (streamError) {
                reject(streamError);
              } else {
                resolve();
              }
            }
          }, 8);
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += value;
            const events = sseBuffer.split(/\r?\n\r?\n/);
            sseBuffer = events.pop() || "";

            for (const evt of events) {
              const lines = evt.split(/\r?\n/);
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const rawPayload = line.slice(5).trim();
                if (!rawPayload) continue;

                let parsed: any;
                try {
                  parsed = JSON.parse(rawPayload);
                } catch {
                  continue;
                }

                if (parsed.error) {
                  streamError = new Error(parsed.error);
                  break;
                }

                if (parsed.text) {
                  enqueueTextWords(parsed.text);
                }
              }
              if (streamError) break;
            }
            if (streamError) break;
          }
        } catch (readErr: any) {
          if (readErr?.name !== "AbortError") {
            streamError = readErr;
          }
        } finally {
          streamDone = true;
        }

        try {
          await drainFinishedPromise;
          if (!controller.signal.aborted && !displayedText.trim()) {
            throw new Error(`Respon ${assistantName} kosong.`);
          }
        } catch (streamFailure: any) {
          if (controller.signal.aborted) return;
          // Automatic one-shot fallback to standard JSON endpoint if SSE failed or emitted no text
          if (!displayedText.trim()) {
            const fallbackRes = await fetch(`${window.location.origin}/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                studentName,
                stream: false,
                messages: nextMessages.map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: m.content
                }))
              })
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData?.text) {
                if (!hasPriorUserTurn) {
                  sessionCacheRef.current.set(normalizedKey, fallbackData.text);
                }
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: "bot",
                    content: fallbackData.text,
                    timestamp: new Date()
                  }
                ]);
                void logAiInteraction(trimmed, fallbackData.text, performance.now() - reqStartTime);
                return;
              }
            } else {
              const errJson = await fallbackRes.json().catch(() => null);
              if (errJson?.error) {
                throw new Error(errJson.error);
              }
            }
          }
          throw streamFailure;
        }

        if (!controller.signal.aborted && displayedText.trim()) {
          if (!hasPriorUserTurn) {
            sessionCacheRef.current.set(normalizedKey, displayedText);
          }
          void logAiInteraction(trimmed, displayedText, performance.now() - reqStartTime);
        }
        return;
      }

      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (!data.text) {
          throw new Error(`Respon ${assistantName} kosong.`);
        }
        if (!hasPriorUserTurn) {
          sessionCacheRef.current.set(normalizedKey, data.text);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "bot",
            content: data.text,
            timestamp: new Date()
          }
        ]);
        void logAiInteraction(trimmed, data.text, performance.now() - reqStartTime);
      } else {
        const textErr = await response.text();
        throw new Error(textErr || "Gagal mendapatkan respon valid dari server.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Chat Error:", err);
      const rawMsg = String(err?.message || "").trim();
      const lowerMsg = rawMsg.toLowerCase();

      let naturalChatReply = rawMsg;
      const isQuotaLike =
        lowerMsg.includes("429") ||
        lowerMsg.includes("resource_exhausted") ||
        lowerMsg.includes("quota") ||
        lowerMsg.includes("kuota") ||
        lowerMsg.includes("limit") ||
        lowerMsg.includes("jatah gratisan");

      if (!rawMsg || lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror")) {
        naturalChatReply =
          `Aduh ${firstName}, maaf ya koneksinya ke server lagi putus nyambung nih 😅 Cek sinyal internetmu sebentar terus coba tanya lagi ya!`;
      } else if (
        isQuotaLike &&
        !rawMsg.includes("jatah gratisan AI aku")
      ) {
        naturalChatReply =
          `Eh ${firstName}, jujur nih jatah gratisan AI aku buat hari ini kebetulan lagi habis kepake bareng temen-temen yang lain 😅\n\n` +
          `Jadi buat pertanyaan bebas yang perlu mikir panjang, aku istirahat dulu sebentar sampai kuotanya ke-reset lagi ya. Tapi santai aja, kamu masih bisa buka tab **Panduan Aplikasi** di atas atau tanya seputar **cara upload tugas, info nilai/CBT, sama rangkuman materi Informatika Bab 1–9**—itu masih aman dan langsung aku bantu kok! 😊`;
      } else if (
        lowerMsg.includes("500") ||
        lowerMsg.includes("kunci api") ||
        lowerMsg.includes("permission_denied")
      ) {
        naturalChatReply =
          `Eh ${firstName}, kayaknya akses AI aku di server lagi ada kendala teknis sebentar nih 🙏 Nanti kabarin Pak Agan ya biar dicek. Sementara itu, kamu masih bisa tanya soal cara kirim tugas, aturan CBT, atau rangkuman materi Bab 1–9 di sini!`;
      }

      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-info-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: "bot",
          content: naturalChatReply,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingMsgId(null);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleSend = () => {
    void sendMessageText(input);
  };

  const clearChat = () => {
    stopActiveStream();
    setIsLoading(false);
    setError(null);
    setMessages([
      {
        id: `greeting-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "bot",
        content: `Halo **${firstName}**, sesi percakapan telah dibersihkan. Silakan ajukan pertanyaan seputar fitur aplikasi **Si-Pinter** atau materi **Informatika Kelas X**.`,
        timestamp: new Date()
      }
    ]);
  };

  const handleAskFromGuide = (promptText: string) => {
    setActiveTab("chat");
    setSelectedGuideId(null);
    void sendMessageText(promptText);
  };

  const renderTeacherAvatar = (sizeClass: string) => (
    <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 bg-sky-100 border border-slate-200/80 shadow-xs flex items-center justify-center`}>
      {!avatarFailed ? (
        <img
          src={smartTeacherAvatar}
          alt={assistantName}
          referrerPolicy="no-referrer"
          onError={() => setAvatarFailed(true)}
          className="w-full h-full object-cover object-[50%_15%]"
        />
      ) : (
        <span className="text-xs font-bold text-[#075e54]">SP</span>
      )}
    </div>
  );

  const renderStudentAvatar = (sizeClass: string) => (
    <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 bg-[#0d7c66] text-white border border-emerald-200/70 shadow-xs flex items-center justify-center`}>
      {resolvedStudentAvatarSrc ? (
        <img
          src={resolvedStudentAvatarSrc}
          alt={firstName}
          referrerPolicy="no-referrer"
          onError={() => {
            setStudentAvatarStage((prev) => (prev === "primary" ? "fallback" : "initials"));
          }}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <span className="text-[11px] font-bold tracking-tight">
          {firstName !== "Siswa" ? firstName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
        </span>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="ai-chat-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg h-full sm:h-[86vh] sm:max-h-[760px] bg-white/95 backdrop-blur-xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5"
          >
            {/* Modern Header */}
            <div className="shrink-0 px-4 pt-3.5 pb-3 bg-gradient-to-r from-[#075e54] via-[#0b6b5f] to-[#0f766e] text-white shadow-sm z-10 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarPreviewOpen(true)}
                  className="shrink-0 rounded-full cursor-pointer transition-transform active:scale-95 hover:scale-105"
                  title="Lihat Foto Profil Si Pinter"
                >
                  {renderTeacherAvatar("w-11 h-11 border-2 border-white/60 shadow-sm")}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold tracking-tight truncate">{assistantName}</h3>
                  <p className="text-[11px] text-emerald-100/90 font-medium truncate">
                    Chat {firstName} · Informatika & Panduan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEtikaMandatory(false);
                    setIsEtikaModalOpen(true);
                  }}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Etika Digital & Tata Tertib"
                >
                  <ShieldAlert className="w-4.5 h-4.5" />
                </button>
                {activeTab === "chat" && (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    title="Bersihkan Chat"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Tutup Jendela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Interactive Tab Bar: Chat SiPinter & Panduan Aplikasi */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/15 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "chat"
                      ? "bg-white text-[#075e54] shadow-sm"
                      : "text-emerald-50/90 hover:bg-white/10"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>Chat Si Pinter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "guide"
                      ? "bg-white text-[#075e54] shadow-sm"
                      : "text-emerald-50/90 hover:bg-white/10"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Panduan Aplikasi</span>
                </button>
              </div>
            </div>

            {activeTab === "chat" ? (
              <>
                {/* Modern Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 custom-scrollbar bg-[#f3f6f4]">
                  {messages.map((msg, mIdx) => {
                    const isUser = msg.role === "user";
                    const timeText = msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    if (isUser) {
                      return (
                        <div key={`msg-${msg.id || mIdx}-${mIdx}`} className="flex items-end gap-2.5 justify-end">
                          <div className="max-w-[80%] space-y-1 flex flex-col items-end">
                            <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
                              <span className="tabular-nums">{timeText}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-slate-700">{firstName}</span>
                            </div>
                            <div className="bg-gradient-to-br from-[#0f766e] to-[#075e54] text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-[0_6px_18px_-6px_rgba(7,94,84,0.45)]">
                              {renderFormattedMessage(msg.content, true, false)}
                            </div>
                          </div>
                          {renderStudentAvatar("w-8 h-8 mb-0.5 border border-emerald-200")}
                        </div>
                      );
                    }

                    const isCurrentlyStreaming = msg.id === streamingMsgId;

                    return (
                      <div key={`msg-${msg.id || mIdx}-${mIdx}`} className="flex items-end gap-2.5 justify-start">
                        {renderTeacherAvatar("w-8 h-8 mb-0.5")}
                        <div className="max-w-[80%] space-y-1">
                          <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">{assistantName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{timeText}</span>
                          </div>
                          <div className="bg-white text-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200/80 shadow-[0_3px_12px_-4px_rgba(15,23,42,0.08)]">
                            {renderFormattedMessage(msg.content, false, isCurrentlyStreaming)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick Prompt Suggestions on Initial Greeting */}
                  {messages.length === 1 && !isLoading && !streamingMsgId && (
                    <div className="pl-10 space-y-2 pt-1">
                      <p className="text-[11px] font-medium text-slate-500 px-0.5">
                        Contoh pertanyaan cepat:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Cara upload tugas Google Drive agar tidak ditolak",
                          "Bagaimana aturan Ujian Online CBT?",
                          "Jelaskan materi Berpikir Komputasional"
                        ].map((prompt, pIdx) => (
                          <button
                            key={`prompt-${pIdx}`}
                            type="button"
                            onClick={() => void sendMessageText(prompt)}
                            className="text-left text-xs font-medium text-[#075e54] bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-3 py-2 rounded-xl shadow-2xs transition-colors cursor-pointer"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex items-end gap-2.5 justify-start">
                      {renderTeacherAvatar("w-8 h-8 mb-0.5")}
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200/80 shadow-xs flex items-center gap-2.5">
                        <span className="text-xs text-slate-500 font-medium">
                          {assistantName} sedang mengetik
                        </span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-[#0f766e]/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-[#0f766e]/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-[#0f766e]/60 rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-center py-2">
                      <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold shadow-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Modern Input Area */}
                <div className="shrink-0 p-3 bg-white border-t border-slate-200/80">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    {renderStudentAvatar("w-9 h-9 border border-slate-200")}
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Tanyakan materi Informatika atau cara pakai aplikasi..."
                      className="flex-1 min-h-[44px] bg-slate-50 border border-slate-200 focus:border-[#0f766e] focus:bg-white rounded-2xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading || Boolean(streamingMsgId)}
                      className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all ${
                        !input.trim() || isLoading || Boolean(streamingMsgId)
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-[#075e54] text-white hover:bg-[#0b7a6d] shadow-md shadow-[#075e54]/20 active:scale-95 cursor-pointer"
                      }`}
                      title="Kirim Pesan"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* Tab 2: Interactive Panduan Aplikasi */
              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5 custom-scrollbar">
                {activeGuide ? (
                  <div className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setSelectedGuideId(null)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#075e54] hover:text-[#0b7a6d] py-1.5 px-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Daftar Panduan</span>
                    </button>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#075e54]">{activeGuide.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{activeGuide.readTime}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 leading-snug">
                          {activeGuide.number}. {activeGuide.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {activeGuide.summary}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        {activeGuide.steps.map((step, sIdx) => (
                          <div key={`step-${sIdx}`} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-[#075e54] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                              {sIdx + 1}
                            </span>
                            <div className="space-y-0.5">
                              <h5 className="text-sm font-bold text-slate-800">{step.title}</h5>
                              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activeGuide.checklist && activeGuide.checklist.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
                          <p className="text-xs font-bold text-slate-800">
                            Checklist Interaktif Sebelum Kirim Tugas:
                          </p>
                          <div className="space-y-2">
                            {activeGuide.checklist.map((item, cIdx) => {
                              const key = `${activeGuide.id}-chk-${cIdx}`;
                              const isChecked = !!checkedSteps[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() =>
                                    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }))
                                  }
                                  className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                >
                                  {isChecked ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                  )}
                                  <span
                                    className={`text-xs leading-relaxed ${
                                      isChecked ? "text-slate-400 line-through" : "text-slate-700 font-medium"
                                    }`}
                                  >
                                    {item}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeGuide.tip && (
                        <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 space-y-1">
                          <p className="text-xs font-bold text-amber-900">Catatan Penting</p>
                          <p className="text-xs text-amber-800 leading-relaxed">{activeGuide.tip}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAskFromGuide(activeGuide.askPrompt)}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-[#075e54] hover:bg-[#0b7a6d] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Tanyakan Lebih Lanjut ke Si Pinter</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900">
                        Panduan Aplikasi Si-Pinter
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pelajari cara menggunakan fitur, mengumpulkan tugas, mengikuti ujian CBT, dan memantau nilai dengan mudah.
                      </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={guideSearch}
                        onChange={(e) => setGuideSearch(e.target.value)}
                        placeholder="Cari panduan (misal: Drive, Ujian, Nilai)..."
                        className="w-full min-h-[42px] bg-white border border-slate-200 focus:border-[#0f766e] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Category Filter Controls */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {["Semua", "Dasar", "Tugas", "Ujian & Nilai", "Fitur Lain"].map((cat, catIdx) => (
                        <button
                          key={`guide-cat-${cat}-${catIdx}`}
                          type="button"
                          onClick={() => setGuideCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            guideCategory === cat
                              ? "bg-[#075e54] text-white shadow-2xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Guide Article List */}
                    <div className="space-y-2.5">
                      {filteredGuides.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-1.5">
                          <p className="text-sm font-semibold text-slate-700">
                            Panduan tidak ditemukan
                          </p>
                          <p className="text-xs text-slate-500">
                            Coba kata kunci lain atau tanyakan langsung kepada Si Pinter di tab Chat.
                          </p>
                        </div>
                      ) : (
                        filteredGuides.map((article, artIdx) => {
                          const Icon = article.icon;
                          return (
                            <button
                              key={`guide-art-${article.id}-${artIdx}`}
                              type="button"
                              onClick={() => setSelectedGuideId(article.id)}
                              className="w-full text-left bg-white hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 transition-all shadow-2xs flex items-center gap-3.5 cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#075e54] flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <span className="font-semibold text-[#075e54]">{article.category}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{article.readTime}</span>
                                </div>
                                <h5 className="text-sm font-bold text-slate-900 group-hover:text-[#075e54] transition-colors leading-snug">
                                  {article.number}. {article.title}
                                </h5>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                  {article.summary}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#075e54] shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>
      <EtikaDigitalModal
        isOpen={isEtikaModalOpen}
        onClose={() => setIsEtikaModalOpen(false)}
        studentName={studentName}
        isMandatoryFirstTime={isEtikaMandatory}
      />

      <AnimatePresence>
        {isAvatarPreviewOpen && (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
            onClick={() => setIsAvatarPreviewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setIsAvatarPreviewOpen(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup pratinjau foto"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="aspect-[3/4] w-full bg-sky-100 overflow-hidden">
                <img
                  src={smartTeacherAvatar}
                  alt="Foto Profil Si Pinter"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="p-4 text-center bg-white border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-base">Si Pinter</h4>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Asisten Belajar Informatika · SMAN 1 Cililin
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
