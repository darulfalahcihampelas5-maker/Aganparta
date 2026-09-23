import React, { useState, useEffect } from "react";
import {
  DAILY_LIFE_SIMULATORS,
  SimulatorItem,
  PillarType,
  DifficultyLevel,
} from "./dailyLifeSimulatorsData";
import {
  getAllSimulatedStudents,
  resetStudentProgress,
  resetSpecificLevelProgress,
  resetAllStudentsProgress,
  StudentSimOverview,
} from "./simulationStorage";
import { sound } from "./soundEffects";
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Key,
  Trash2,
  Users,
  Sparkles,
  Star,
  Boxes,
  Code2,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

interface TeacherSimulationViewProps {
  onSelectSimulatorToPlay?: (simulator: SimulatorItem) => void;
}

export const TeacherSimulationView: React.FC<TeacherSimulationViewProps> = ({
  onSelectSimulatorToPlay,
}) => {
  // Tab: "reset_students" or "answer_keys"
  const [activeTeacherTab, setActiveTeacherTab] = useState<"reset_students" | "answer_keys">("reset_students");

  // ==========================================
  // STATE: MANAJEMEN RESET SISWA
  // ==========================================
  const [students, setStudents] = useState<StudentSimOverview[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentSimOverview | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Confirmation Modals
  const [confirmResetStudent, setConfirmResetStudent] = useState<StudentSimOverview | null>(null);
  const [isConfirmMassResetOpen, setIsConfirmMassResetOpen] = useState(false);
  const [massResetConfirmText, setMassResetConfirmText] = useState("");

  const loadStudentsData = async () => {
    setIsLoadingStudents(true);
    try {
      const data = await getAllSimulatedStudents();
      setStudents(data);
    } catch (err) {
      console.warn("Gagal memuat data simulasi siswa:", err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudentsData();
  }, []);

  const handleResetSingleStudent = async (student: StudentSimOverview) => {
    sound.playClick();
    const success = await resetStudentProgress(student.nisn);
    if (success) {
      sound.playSuccess();
      setNotification({
        type: "success",
        message: `Progres simulasi seluruh pilar untuk ${student.studentName} (NISN: ${student.nisn}) berhasil di-reset ke awal. Siswa dapat mengulang simulasi sekarang.`,
      });
      setConfirmResetStudent(null);
      if (selectedStudentForDetail?.nisn === student.nisn) {
        setSelectedStudentForDetail(null);
      }
      loadStudentsData();
    }
  };

  const handleResetSingleSimulatorLevel = async (student: StudentSimOverview, simId: string) => {
    sound.playClick();
    const updated = await resetSpecificLevelProgress(student.nisn, simId);
    sound.playSuccess();
    const simTitle = DAILY_LIFE_SIMULATORS.find((s) => s.id === simId)?.title || simId;
    setNotification({
      type: "success",
      message: `Tantangan "${simTitle}" untuk ${student.studentName} berhasil di-reset. Tantangan lainnya tetap tersimpan.`,
    });

    // Refresh selected student detail
    setSelectedStudentForDetail({
      ...student,
      completedCount: updated.completedIds.length,
      totalStars: updated.totalStars,
      avgScore: updated.completedIds.length > 0 ? Math.round(updated.totalScore / updated.completedIds.length) : 0,
      progress: updated,
    });
    loadStudentsData();
  };

  const handleExecuteMassReset = async () => {
    if (massResetConfirmText.trim().toUpperCase() !== "RESET") {
      setNotification({
        type: "error",
        message: 'Ketik kata "RESET" dengan tepat untuk mengonfirmasi penghapusan massal.',
      });
      return;
    }

    sound.playClick();
    const success = await resetAllStudentsProgress();
    if (success) {
      sound.playSuccess();
      setNotification({
        type: "success",
        message: "Seluruh data progres dan nilai simulasi BK untuk semua siswa berhasil diinisialisasi ulang!",
      });
      setIsConfirmMassResetOpen(false);
      setMassResetConfirmText("");
      setSelectedStudentForDetail(null);
      loadStudentsData();
    }
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.studentName.toLowerCase().includes(q) || s.nisn.includes(q);
  });

  // ==========================================
  // STATE: KUNCI JAWABAN & PANDUAN GURU (40 SIMULATOR)
  // ==========================================
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<PillarType | "all">("all");
  const [selectedDiffFilter, setSelectedDiffFilter] = useState<DifficultyLevel | "all">("all");
  const [guideSearch, setGuideSearch] = useState("");
  const [expandedSimId, setExpandedSimId] = useState<string | null>("dek-1");

  const filteredGuideSimulators = DAILY_LIFE_SIMULATORS.filter((sim) => {
    if (selectedPillarFilter !== "all" && sim.pillar !== selectedPillarFilter) return false;
    if (selectedDiffFilter !== "all" && sim.difficulty !== selectedDiffFilter) return false;
    if (guideSearch.trim()) {
      const q = guideSearch.toLowerCase();
      return (
        sim.title.toLowerCase().includes(q) ||
        sim.subtitle.toLowerCase().includes(q) ||
        sim.storyContext.toLowerCase().includes(q) ||
        sim.ctExplanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Helper formatting for answer display
  const renderAnswerDetails = (sim: SimulatorItem) => {
    switch (sim.gameType) {
      case "categorize": {
        const categories = sim.categories || [];
        return (
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kunci Pengelompokan Kategori yang Benar:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat, idx) => {
                const itemsInCat = sim.items.filter((i) => i.category === cat);
                return (
                  <div key={idx} className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                    <div className="font-bold text-xs text-emerald-950 border-b border-emerald-200/80 pb-1.5 mb-2 flex items-center justify-between">
                      <span>{cat}</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-bold">
                        {itemsInCat.length} Item
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {itemsInCat.map((item) => (
                        <li key={item.id} className="flex items-start gap-1.5 font-medium">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "sequence": {
        const targetSeq = sim.targetSequence || [];
        return (
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Kunci Urutan Langkah Algoritma yang Tepat (Satu demi Satu):
            </h5>
            <div className="space-y-2">
              {targetSeq.map((itemId, idx) => {
                const itm = sim.items.find((i) => i.id === itemId);
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">{itm?.label || itemId}</p>
                      {itm?.details && <p className="text-[11px] text-slate-500 font-medium">{itm.details}</p>}
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest px-2 py-0.5 bg-indigo-100 rounded-md">
                      Langkah {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "filter_essential": {
        const essentialItems = sim.items.filter((i) => i.isEssential);
        const noiseItems = sim.items.filter((i) => !i.isEssential);
        return (
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              Kunci Pemilahan Abstraksi (Data Esensial vs Distraktor):
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                <div className="font-bold text-xs text-emerald-900 pb-1.5 mb-2 border-b border-emerald-200 flex items-center justify-between">
                  <span>✓ Data Esensial (Wajib Dipilih Siswa):</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                    {essentialItems.length} Poin
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-800">
                  {essentialItems.map((item) => (
                    <li key={item.id} className="p-1.5 rounded-lg bg-white/70 border border-emerald-100">
                      <span className="font-bold text-emerald-950 block">{item.label}</span>
                      {item.details && <span className="text-[11px] text-slate-500 block">{item.details}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
                <div className="font-bold text-xs text-rose-900 pb-1.5 mb-2 border-b border-rose-200 flex items-center justify-between">
                  <span>✗ Data Distraktor / Noise (Harus Diabaikan Siswa):</span>
                  <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full font-bold">
                    {noiseItems.length} Poin
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-800">
                  {noiseItems.map((item) => (
                    <li key={item.id} className="p-1.5 rounded-lg bg-white/70 border border-rose-100">
                      <span className="font-medium text-slate-700 block line-through">{item.label}</span>
                      {item.details && <span className="text-[11px] text-rose-600 block italic">{item.details}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      }

      case "pattern_detect": {
        const correctOpt = sim.items.find((i) => i.isCorrect);
        return (
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              Kunci Pilihan Jawaban Pola yang Benar:
            </h5>
            <div className="p-3.5 rounded-xl bg-sky-50 border-2 border-sky-300">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-sky-600 text-white rounded text-[10px] font-black uppercase tracking-wider">
                  Jawaban Benar
                </span>
                <span className="font-black text-sm text-sky-950">{correctOpt?.label}</span>
              </div>
              {correctOpt?.details && (
                <p className="text-xs text-sky-800 font-semibold mt-1.5 bg-white/60 p-2 rounded-lg border border-sky-100">
                  Rumus / Logika Pola: {correctOpt.details}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {sim.items
                .filter((i) => !i.isCorrect)
                .map((itm) => (
                  <div key={itm.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    <span className="font-bold block text-slate-600">{itm.label}</span>
                    <span className="text-[10px] text-rose-500 font-medium">Bukan jawaban yang tepat</span>
                  </div>
                ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Kunci jawaban disesuaikan dengan instruksi pada tantangan.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card for Teacher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              Menu Khusus Guru • Simulasi Berpikir Komputasional (BK)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Panel Pengawas Guru: Reset Siswa &amp; Kunci Jawaban 40 Simulator
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Pantau pengerjaan siswa, reset progres siswa yang mengalami kekeliruan langkah atau ingin remedial,
              serta lihat penjelasan rinci beserta kunci jawaban akurat untuk seluruh 40 simulator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTeacherTab("reset_students");
              }}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                activeTeacherTab === "reset_students"
                  ? "bg-amber-400 text-slate-950 shadow-amber-400/30 scale-102"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kelola &amp; Reset Siswa</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-mono">
                {students.length} Siswa
              </span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTeacherTab("answer_keys");
              }}
              className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                activeTeacherTab === "answer_keys"
                  ? "bg-[#85cc00] text-slate-950 shadow-[#85cc00]/30 scale-102"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Kunci Jawaban &amp; Panduan Guru</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-mono">
                40 Simulator
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-300 border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : notification.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-sky-50 text-sky-800 border-sky-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-sky-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded text-xs cursor-pointer"
          >
            ✕ Tutup
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: KELOLA & RESET SISWA YANG SALAH DALAM SIMULASI                    */}
      {/* ========================================================================= */}
      {activeTeacherTab === "reset_students" && (
        <div className="space-y-6">
          {/* Action Bar & Controls */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari siswa berdasarkan nama atau NISN..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={loadStudentsData}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0 transition-all"
                title="Muat ulang data siswa"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? "animate-spin" : ""}`} />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmMassResetOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Semua Siswa</span>
              </button>
            </div>
          </div>

          {/* Student Overview Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-800">
                  Daftar Siswa &amp; Progres Pengerjaan Simulasi BK
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Menampilkan {filteredStudents.length} dari {students.length} Siswa Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-black text-[10px] border-b border-slate-200">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Siswa &amp; NISN</th>
                    <th className="py-3.5 px-4 text-center">Tantangan Selesai</th>
                    <th className="py-3.5 px-4 text-center">Rata-rata Nilai</th>
                    <th className="py-3.5 px-4 text-center">Bintang ⭐</th>
                    <th className="py-3.5 px-4 text-right pr-6">Aksi Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-8 h-8 opacity-40" />
                          <p className="font-bold">Belum ada data pengerjaan siswa</p>
                          <p className="text-[11px]">
                            Ketika siswa mengerjakan tantangan di dashboard siswa, progres mereka akan otomatis muncul di sini.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      const isCompleteAll = st.completedCount >= 40;
                      return (
                        <tr key={st.nisn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">{st.studentName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">NISN: {st.nisn}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={`font-black px-2.5 py-1 rounded-full text-[11px] ${
                                  isCompleteAll
                                    ? "bg-emerald-100 text-emerald-800"
                                    : st.completedCount > 0
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {st.completedCount} / 40
                              </span>
                            </div>
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full mx-auto mt-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, (st.completedCount / 40) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-800">
                            {st.avgScore > 0 ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                {st.avgScore}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-amber-600">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{st.totalStars}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForDetail(st)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Lihat detail pengerjaan & reset level tertentu"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Rincian &amp; Reset Level</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmResetStudent(st)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Reset seluruh progres siswa ini"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Siswa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer / Modal: Detail Per-Level Siswa untuk Reset Spesifik */}
          {selectedStudentForDetail && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-indigo-600" />
                      Detail &amp; Reset Tantangan Siswa: {selectedStudentForDetail.studentName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      NISN: {selectedStudentForDetail.nisn} • Selesai: {selectedStudentForDetail.completedCount}/40 Tantangan
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudentForDetail(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Petunjuk Guru:</strong> Jika siswa membuat kekeliruan pada satu level tertentu (misal salah memilih opsi atau ingin remedial),
                      Anda cukup mengklik tombol <strong>"Reset Level Ini"</strong> pada tantangan yang bersangkutan. Nilai dan progres level lain tetap aman.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {DAILY_LIFE_SIMULATORS.map((sim, index) => {
                      const isCompleted = selectedStudentForDetail.progress.completedIds.includes(sim.id);
                      const score = selectedStudentForDetail.progress.scores[sim.id];
                      const stars = selectedStudentForDetail.progress.stars[sim.id] || 0;

                      return (
                        <div
                          key={sim.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isCompleted ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <span>{sim.title}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase font-black">
                                  {sim.pillar}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {isCompleted ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Nilai: {score} • {stars} Bintang ⭐
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Belum dikerjakan oleh siswa</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleResetSingleSimulatorLevel(selectedStudentForDetail, sim.id)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Level Ini</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                                Kosong
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setConfirmResetStudent(selectedStudentForDetail)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Seluruh 40 Level Siswa Ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentForDetail(null)}
                    className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all cursor-pointer"
                  >
                    Selesai &amp; Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi: Reset Siswa Tunggal */}
          {confirmResetStudent && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-black text-slate-900 text-base">Konfirmasi Reset Progres Siswa</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Apakah Anda yakin ingin mereset seluruh progres dan riwayat jawaban untuk{" "}
                    <strong>{confirmResetStudent.studentName}</strong> (NISN: {confirmResetStudent.nisn})?
                  </p>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    Siswa akan dapat mengulang simulasi dari awal dengan nilai baru.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetStudent(null)}
                    className="py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetSingleStudent(confirmResetStudent)}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    Ya, Reset Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Konfirmasi: Reset Massal Semua Siswa */}
          {isConfirmMassResetOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-black text-slate-900 text-base">PERINGATAN: Reset Massal Seluruh Siswa</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tindakan ini akan menghapus nilai dan riwayat pengerjaan simulasi BK untuk <strong>SEMUA</strong> siswa di kelas ini.
                  </p>
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    Ketik kata <strong>RESET</strong> di bawah ini untuk mengonfirmasi tindakan ini:
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    value={massResetConfirmText}
                    onChange={(e) => setMassResetConfirmText(e.target.value)}
                    placeholder="Ketik RESET"
                    className="w-full text-center font-black tracking-widest uppercase py-2.5 rounded-xl border-2 border-rose-300 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmMassResetOpen(false);
                      setMassResetConfirmText("");
                    }}
                    className="py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={massResetConfirmText.trim().toUpperCase() !== "RESET"}
                    onClick={handleExecuteMassReset}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs transition-all cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    Reset Semua Siswa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KUNCI JAWABAN & PANDUAN GURU (40 SIMULATOR RINCI)                  */}
      {/* ========================================================================= */}
      {activeTeacherTab === "answer_keys" && (
        <div className="space-y-6">
          {/* Navigation & Filter Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#85cc00]" />
                  Buku Kunci Jawaban &amp; Penjelasan Pedagogis (40 Simulator)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rujukan resmi guru untuk membimbing siswa dan memvalidasi penyelesaian masalah kehidupan nyata.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={guideSearch}
                  onChange={(e) => setGuideSearch(e.target.value)}
                  placeholder="Cari simulator / topik..."
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Pillar Selector Pills in strict order 1 through 4 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("all")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  selectedPillarFilter === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua (40 Simulator)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("dekomposisi")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPillarFilter === "dekomposisi"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>1. Dekomposisi (10)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("pola")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPillarFilter === "pola"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Pengenalan Pola (10)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("abstraksi")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPillarFilter === "abstraksi"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>3. Abstraksi (10)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPillarFilter("algoritma")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPillarFilter === "algoritma"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>4. Algoritma (10)</span>
              </button>
            </div>
          </div>

          {/* List of 40 Simulators with Detailed Answers */}
          <div className="space-y-4">
            {filteredGuideSimulators.map((sim, idx) => {
              const isExpanded = expandedSimId === sim.id;

              return (
                <div
                  key={sim.id}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                    isExpanded ? "border-indigo-300 shadow-md ring-2 ring-indigo-500/10" : "border-slate-200 shadow-xs"
                  }`}
                >
                  {/* Header Button */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setExpandedSimId(isExpanded ? null : sim.id);
                    }}
                    className="w-full p-5 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          sim.pillar === "dekomposisi"
                            ? "bg-emerald-600 text-white"
                            : sim.pillar === "pola"
                            ? "bg-sky-600 text-white"
                            : sim.pillar === "abstraksi"
                            ? "bg-amber-500 text-white"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        #{sim.pillarNumber}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              sim.pillar === "dekomposisi"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : sim.pillar === "pola"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : sim.pillar === "abstraksi"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-indigo-50 text-indigo-800 border-indigo-200"
                            }`}
                          >
                            Pilar {sim.pillar.toUpperCase()} #{sim.pillarNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {sim.difficultyBadge}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            ID: {sim.id}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-sm sm:text-base mt-1">
                          {sim.title}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{sim.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline-block text-xs font-bold text-indigo-600">
                        {isExpanded ? "Tutup Kunci" : "Buka Kunci Jawaban"}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Body: Complete Answer Key & Teacher Guide */}
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-100 space-y-6 bg-slate-50/40">
                      {/* Context & Challenge */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Konteks Masalah Siswa (Kehidupan Nyata):
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{sim.storyContext}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            Tantangan &amp; Tugas Siswa:
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-bold">{sim.studentChallenge}</p>
                          <p className="text-[11px] text-slate-500 mt-1 italic">Instruksi: {sim.instruction}</p>
                        </div>
                      </div>

                      {/* DETAILED ANSWER KEY SECTION */}
                      <div className="p-5 rounded-2xl bg-white border-2 border-emerald-400 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-emerald-950">
                              KUNCI JAWABAN BENAR &amp; PENYELESAIAN SIMULATOR
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Skor Maksimal: 100 • 3 Bintang
                          </span>
                        </div>

                        {renderAnswerDetails(sim)}
                      </div>

                      {/* Computational Thinking Concept Explanation */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span>Penjelasan Konsep Berpikir Komputasional (Informatika Fase E):</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium pl-6">
                          {sim.ctExplanation}
                        </p>
                      </div>

                      {/* Real Life Benefit & Teacher Guidance Tips */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            <span>Manfaat Penerapan Siswa Sehari-hari:</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium pl-6">
                            {sim.dailyLifeBenefit}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Petunjuk Intervensi Guru (Jika Siswa Bingung):</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium pl-6">
                            Petunjuk Hint untuk siswa: &ldquo;{sim.hint}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Action to test play */}
                      {onSelectSimulatorToPlay && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => onSelectSimulatorToPlay(sim)}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                          >
                            <span>Buka Langsung di Mode Simulator</span>
                            <span>→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
