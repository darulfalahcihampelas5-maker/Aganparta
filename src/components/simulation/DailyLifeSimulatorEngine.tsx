import React, { useState, useEffect } from "react";
import {
  DAILY_LIFE_SIMULATORS,
  SimulatorItem,
  PillarType,
  DifficultyLevel,
} from "./dailyLifeSimulatorsData";
import {
  loadLocalProgress,
  saveSimulationProgress,
  SimulationProgress,
} from "./simulationStorage";
import { sound } from "./soundEffects";
import {
  Boxes,
  Sparkles,
  Filter,
  Code2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Star,
  ChevronRight,
  ShieldCheck,
  Search,
  BookOpen,
  Trophy,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
  Sparkle,
  Gamepad2,
  Key,
  Lock,
} from "lucide-react";

interface DailyLifeSimulatorEngineProps {
  userRole?: "student" | "teacher";
  currentUser?: {
    nisn?: string;
    name?: string;
    kelas?: string;
  };
}

export const DailyLifeSimulatorEngine: React.FC<DailyLifeSimulatorEngineProps> = ({
  userRole = "student",
  currentUser,
}) => {
  const currentNisn = currentUser?.nisn || "guest_student";
  const currentStudentName = currentUser?.name || "Siswa Informatika";

  // Navigation & Filtering (Default to Dekomposisi for clean 1st pillar focus)
  const [selectedPillar, setSelectedPillar] = useState<PillarType | "all">("dekomposisi");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<SimulatorItem>(DAILY_LIFE_SIMULATORS[0]);

  // Mobile View Switcher: "list" (pilihan level) or "arena" (main tantangan)
  const [mobileViewMode, setMobileViewMode] = useState<"list" | "arena">("list");
  const [showTeacherInlineKey, setShowTeacherInlineKey] = useState(false);

  // Player Progress
  const [progress, setProgress] = useState<SimulationProgress>(() =>
    loadLocalProgress(currentNisn)
  );

  // Interactive Game State
  const [userCategorization, setUserCategorization] = useState<Record<string, string>>({});
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const [userSelectedFilters, setUserSelectedFilters] = useState<string[]>([]);
  const [userSelectedPatternOpt, setUserSelectedPatternOpt] = useState<string | null>(null);

  // Status & Feedback
  const [showHint, setShowHint] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    status: "idle" | "success" | "wrong";
    score: number;
    stars: number;
    message: string;
    details?: string;
  }>({
    status: "idle",
    score: 0,
    stars: 0,
    message: "",
  });

  // When active simulator item changes, reset local game state
  useEffect(() => {
    setShowHint(false);
    setShowTeacherInlineKey(false);
    setEvaluationResult({ status: "idle", score: 0, stars: 0, message: "" });
    setUserCategorization({});
    setUserSelectedPatternOpt(null);
    setUserSelectedFilters([]);

    if (activeItem.gameType === "sequence") {
      // Shuffle sequence or start in reverse order so student arranges it
      const ids = activeItem.items.map((i) => i.id);
      const shuffled = [...ids].reverse();
      setUserSequence(shuffled);
    }
  }, [activeItem]);

  // Load progress when current user changes
  useEffect(() => {
    setProgress(loadLocalProgress(currentNisn));
  }, [currentNisn]);

  // Handler for pillar tab click
  const handleSelectPillar = (pillar: PillarType | "all") => {
    sound.playClick();
    setSelectedPillar(pillar);
    if (pillar !== "all") {
      const firstInPillar = DAILY_LIFE_SIMULATORS.find((s) => s.pillar === pillar);
      if (firstInPillar) {
        setActiveItem(firstInPillar);
      }
    }
  };

  // Handler for selecting an item from the list
  const handleSelectItem = (sim: SimulatorItem) => {
    sound.playClick();
    setActiveItem(sim);
    setMobileViewMode("arena");
    if (typeof window !== "undefined") {
      const arenaEl = document.getElementById("active-sim-arena");
      if (arenaEl) {
        arenaEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Filter list
  const filteredSimulators = DAILY_LIFE_SIMULATORS.filter((sim) => {
    if (selectedPillar !== "all" && sim.pillar !== selectedPillar) return false;
    if (selectedDifficulty !== "all" && sim.difficulty !== selectedDifficulty) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sim.title.toLowerCase().includes(q) ||
        sim.subtitle.toLowerCase().includes(q) ||
        sim.storyContext.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Current index in filtered list
  const currentFilteredIndex = filteredSimulators.findIndex((s) => s.id === activeItem.id);
  const prevChallengeItem = currentFilteredIndex > 0 ? filteredSimulators[currentFilteredIndex - 1] : null;
  const nextChallengeItem = currentFilteredIndex < filteredSimulators.length - 1 ? filteredSimulators[currentFilteredIndex + 1] : null;

  // Global Progression Lock Logic
  const allPemulaIds = DAILY_LIFE_SIMULATORS.filter(s => s.difficulty === "pemula").map(s => s.id);
  const allMenengahIds = DAILY_LIFE_SIMULATORS.filter(s => s.difficulty === "menengah").map(s => s.id);
  const isPemulaCompletedAll = allPemulaIds.every(id => progress.completedIds.includes(id));
  const isMenengahCompletedAll = allMenengahIds.every(id => progress.completedIds.includes(id));

  // Pillar counters
  const pillarCounts = {
    dekomposisi: DAILY_LIFE_SIMULATORS.filter((s) => s.pillar === "dekomposisi").length,
    pola: DAILY_LIFE_SIMULATORS.filter((s) => s.pillar === "pola").length,
    abstraksi: DAILY_LIFE_SIMULATORS.filter((s) => s.pillar === "abstraksi").length,
    algoritma: DAILY_LIFE_SIMULATORS.filter((s) => s.pillar === "algoritma").length,
  };

  const pillarCompleted = {
    dekomposisi: DAILY_LIFE_SIMULATORS.filter(
      (s) => s.pillar === "dekomposisi" && progress.completedIds.includes(s.id)
    ).length,
    pola: DAILY_LIFE_SIMULATORS.filter(
      (s) => s.pillar === "pola" && progress.completedIds.includes(s.id)
    ).length,
    abstraksi: DAILY_LIFE_SIMULATORS.filter(
      (s) => s.pillar === "abstraksi" && progress.completedIds.includes(s.id)
    ).length,
    algoritma: DAILY_LIFE_SIMULATORS.filter(
      (s) => s.pillar === "algoritma" && progress.completedIds.includes(s.id)
    ).length,
  };

  // Reordering handler for sequence game
  const moveSequenceItem = (index: number, direction: "up" | "down") => {
    sound.playClick();
    const newSeq = [...userSequence];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSeq.length) return;
    const temp = newSeq[index];
    newSeq[index] = newSeq[targetIdx];
    newSeq[targetIdx] = temp;
    setUserSequence(newSeq);
  };

  // Toggle filter item
  const toggleFilterItem = (id: string) => {
    sound.playClick();
    if (userSelectedFilters.includes(id)) {
      setUserSelectedFilters(userSelectedFilters.filter((x) => x !== id));
    } else {
      setUserSelectedFilters([...userSelectedFilters, id]);
    }
  };

  // Set category for an item
  const setItemCategory = (itemId: string, category: string) => {
    sound.playClick();
    setUserCategorization((prev) => ({
      ...prev,
      [itemId]: category,
    }));
  };

  // Check Solution
  const handleCheckSolution = async () => {
    let isCorrect = false;
    let score = 0;
    let stars = 0;
    let message = "";
    let details = "";

    if (activeItem.gameType === "categorize") {
      const items = activeItem.items;
      let correctCount = 0;
      items.forEach((item) => {
        if (userCategorization[item.id] === item.category) {
          correctCount++;
        }
      });

      const ratio = correctCount / items.length;
      if (ratio === 1) {
        isCorrect = true;
        score = 100;
        stars = 3;
        message = "Luar biasa! Dekomposisi kamu sempurna!";
        details = "Semua komponen masalah berhasil dipetakan ke dalam kategori yang tepat.";
      } else if (ratio >= 0.65) {
        score = Math.round(ratio * 100);
        stars = 2;
        message = `Cukup baik (${correctCount}/${items.length} tepat), namun masih ada komponen yang kurang pas.`;
        details = "Perhatikan petunjuk konteks untuk membedakan fungsi masing-masing komponen.";
      } else {
        score = Math.round(ratio * 100);
        stars = 1;
        message = `Masih perlu latihan (${correctCount}/${items.length} tepat).`;
        details = "Coba telaah kembali tujuan dari masing-masing kategori.";
      }
    } else if (activeItem.gameType === "sequence") {
      const target = activeItem.targetSequence || [];
      const match = userSequence.every((id, idx) => id === target[idx]);

      if (match) {
        isCorrect = true;
        score = 100;
        stars = 3;
        message = "Hebat! Urutan algoritma sekuensial berjalan mulus!";
        details = "Instruksi dieksekusi langkah demi langkah tanpa cacat logika.";
      } else {
        // partial match
        let correctPositions = 0;
        userSequence.forEach((id, idx) => {
          if (id === target[idx]) correctPositions++;
        });
        score = Math.round((correctPositions / target.length) * 100);
        stars = score > 60 ? 2 : 1;
        message = `Urutan belum sepenuhnya tepat (${correctPositions}/${target.length} di posisi benar).`;
        details = "Ingat, algoritma mengharuskan syarat awal terpenuhi sebelum mengeksekusi langkah selanjutnya.";
      }
    } else if (activeItem.gameType === "filter_essential") {
      const correctIds = activeItem.correctAnswers || [];
      const isExactMatch =
        userSelectedFilters.length === correctIds.length &&
        userSelectedFilters.every((id) => correctIds.includes(id));

      if (isExactMatch) {
        isCorrect = true;
        score = 100;
        stars = 3;
        message = "Sempurna! Abstraksi berhasil menyaring informasi esensial!";
        details = "Kamu berhasil membuang kebisingan data dekoratif dan hanya menyimpan atribut kunci.";
      } else {
        const truePositives = userSelectedFilters.filter((id) => correctIds.includes(id)).length;
        score = Math.round((truePositives / Math.max(1, correctIds.length)) * 75);
        stars = truePositives >= 2 ? 2 : 1;
        message = "Pilihan abstraksi masih belum optimal.";
        details = `Kamu memilih ${userSelectedFilters.length} atribut, sementara hanya ${correctIds.length} yang paling esensial.`;
      }
    } else if (activeItem.gameType === "pattern_detect") {
      const chosenOpt = activeItem.items.find((i) => i.id === userSelectedPatternOpt);
      if (chosenOpt && chosenOpt.isCorrect) {
        isCorrect = true;
        score = 100;
        stars = 3;
        message = "Tepat sekali! Pola berhasil kamu pecahkan!";
        details = chosenOpt.details || "Penalaran polamu sangat akurat dan terbukti secara logika matematis.";
      } else {
        score = 30;
        stars = 1;
        message = "Pola yang kamu pilih belum tepat.";
        details = "Perhatikan keteraturan angka atau selisih siklus yang terjadi pada persoalan.";
      }
    }

    if (isCorrect) {
      sound.playSuccess();
    } else {
      sound.playFail();
    }

    setEvaluationResult({
      status: isCorrect ? "success" : "wrong",
      score,
      stars,
      message,
      details,
    });

    // Save progress to LocalStorage + Supabase
    if (score >= 60) {
      const updated = await saveSimulationProgress(
        currentNisn,
        currentStudentName,
        activeItem.id,
        score,
        stars
      );
      setProgress(updated);
    }
  };

  // Reset current challenge
  const handleResetChallenge = () => {
    sound.playClick();
    setUserCategorization({});
    setUserSelectedPatternOpt(null);
    setUserSelectedFilters([]);
    setShowHint(false);
    setEvaluationResult({ status: "idle", score: 0, stars: 0, message: "" });
    if (activeItem.gameType === "sequence") {
      setUserSequence([...activeItem.items.map((i) => i.id)].reverse());
    }
  };

  // Next challenge
  const handleNextChallenge = () => {
    sound.playCoin();
    const currentIndex = DAILY_LIFE_SIMULATORS.findIndex((s) => s.id === activeItem.id);
    if (currentIndex < DAILY_LIFE_SIMULATORS.length - 1) {
      setActiveItem(DAILY_LIFE_SIMULATORS[currentIndex + 1]);
    }
  };

  const getPillarBadge = (pillar: PillarType) => {
    switch (pillar) {
      case "dekomposisi":
        return {
          name: "Dekomposisi",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: Boxes,
        };
      case "pola":
        return {
          name: "Pengenalan Pola",
          bg: "bg-sky-100 text-sky-800 border-sky-300",
          icon: Sparkles,
        };
      case "abstraksi":
        return {
          name: "Abstraksi",
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          icon: Filter,
        };
      case "algoritma":
        return {
          name: "Algoritma",
          bg: "bg-indigo-100 text-indigo-800 border-indigo-300",
          icon: Code2,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Statistics */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Sparkle className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              Katalog 40 Simulator • Aplikasi Kehidupan Siswa SMA Sehari-hari
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Simulasi Berpikir Komputasional Berbasis Masalah Nyata
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Pecahkan 40 studi kasus nyata kehidupan siswa (menyiapkan tas, mengatur jadwal PAS,
              rute angkot, kantin, pemilahan sampah, dan pemilihan ketua OSIS) menggunakan 4 pilar BK.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                {progress.totalStars}
              </div>
              <div className="text-xs text-slate-400 font-medium">Total Bintang</div>
            </div>
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-black text-emerald-400">
                {progress.completedIds.length}/40
              </div>
              <div className="text-xs text-slate-400 font-medium">Terselesaikan</div>
            </div>
            <div className="text-center px-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Aman Cloud & Offline
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Supabase & LocalStorage</div>
            </div>
          </div>
        </div>

        {/* Pillar Progress Bars - Orderly 1 through 4 */}
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-bold">
            <span className="uppercase tracking-wider text-indigo-300">
              Pondasi Berpikir Komputasional (Pilih 1 dari 4 Pilar):
            </span>
            <button
              onClick={() => handleSelectPillar(selectedPillar === "all" ? "dekomposisi" : "all")}
              className="text-xs font-bold text-amber-300 hover:text-white underline cursor-pointer"
            >
              {selectedPillar === "all" ? "Fokuskan per Pilar (10)" : "Tampilkan Semua 40 Kasus"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleSelectPillar("dekomposisi")}
              className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                selectedPillar === "dekomposisi"
                  ? "bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg scale-101"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-black text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                  <span>Dekomposisi</span>
                </span>
                <span className="text-slate-300 font-mono text-[11px] font-bold">
                  {pillarCompleted.dekomposisi}/10
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${(pillarCompleted.dekomposisi / 10) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-emerald-400/80 font-medium mt-1">
                Studi Kasus #1 s.d #10
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPillar("pola")}
              className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                selectedPillar === "pola"
                  ? "bg-sky-950/80 border-sky-400 ring-2 ring-sky-500/40 shadow-lg scale-101"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-black text-sky-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-sky-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                  <span>Pengenalan Pola</span>
                </span>
                <span className="text-slate-300 font-mono text-[11px] font-bold">
                  {pillarCompleted.pola}/10
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full transition-all"
                  style={{ width: `${(pillarCompleted.pola / 10) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-sky-400/80 font-medium mt-1">
                Studi Kasus #11 s.d #20
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPillar("abstraksi")}
              className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                selectedPillar === "abstraksi"
                  ? "bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/40 shadow-lg scale-101"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">3</span>
                  <span>Abstraksi</span>
                </span>
                <span className="text-slate-300 font-mono text-[11px] font-bold">
                  {pillarCompleted.abstraksi}/10
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{ width: `${(pillarCompleted.abstraksi / 10) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-amber-400/80 font-medium mt-1">
                Studi Kasus #21 s.d #30
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPillar("algoritma")}
              className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                selectedPillar === "algoritma"
                  ? "bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg scale-101"
                  : "bg-slate-800/60 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-black text-indigo-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">4</span>
                  <span>Algoritma</span>
                </span>
                <span className="text-slate-300 font-mono text-[11px] font-bold">
                  {pillarCompleted.algoritma}/10
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-400 h-full rounded-full transition-all"
                  style={{ width: `${(pillarCompleted.algoritma / 10) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-indigo-400/80 font-medium mt-1">
                Studi Kasus #31 s.d #40
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Portrait Mode Segmented Switcher (Layar Smartphone Portrait) */}
      <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setMobileViewMode("list");
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileViewMode === "list"
              ? "bg-white text-indigo-950 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Daftar {filteredSimulators.length} Level</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setMobileViewMode("arena");
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileViewMode === "arena"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Arena: {activeItem.title.slice(0, 18)}...</span>
        </button>
      </div>

      {/* Main Grid: Sidebar Selector & Arena Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 40 Simulator List Navigation (4 cols on desktop, responsive on mobile) */}
        <div
          className={`lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 ${
            mobileViewMode === "arena" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>
                  {selectedPillar === "all"
                    ? "Daftar 40 Tantangan BK"
                    : `10 Tantangan ${getPillarBadge(selectedPillar).name}`}
                </span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {filteredSimulators.length} Level
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari studi kasus siswa..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
              />
            </div>

            {/* Difficulty Tabs */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-[11px] font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setSelectedDifficulty("all")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedDifficulty === "all"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("pemula")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedDifficulty === "pemula"
                    ? "bg-white text-emerald-700 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Pemula
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("menengah")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedDifficulty === "menengah"
                    ? "bg-white text-sky-700 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Menengah
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("mahir")}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedDifficulty === "mahir"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Mahir
              </button>
            </div>
          </div>

          {/* List of Challenges */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredSimulators.map((sim) => {
              const isCompleted = progress.completedIds.includes(sim.id);
              const stars = progress.stars[sim.id] || 0;
              const isSelected = activeItem.id === sim.id;
              const badge = getPillarBadge(sim.pillar);
              const IconComp = badge.icon;
              
              // Progression Lock Calculation
              const isLockedMenengah = sim.difficulty === "menengah" && !isPemulaCompletedAll;
              const isLockedMahir = sim.difficulty === "mahir" && (!isPemulaCompletedAll || !isMenengahCompletedAll);
              const isLocked = isLockedMenengah || isLockedMahir;

              return (
                <button
                  key={sim.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) handleSelectItem(sim);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 border ${
                    isLocked
                      ? "bg-slate-100/50 border-slate-200 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm cursor-pointer"
                      : isCompleted
                      ? "bg-slate-50/80 border-slate-200 hover:bg-slate-100 cursor-pointer"
                      : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50 cursor-pointer"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                      isLocked
                        ? "bg-slate-200 text-slate-400"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700 font-black"
                        : isSelected
                        ? "bg-indigo-600 text-white font-black"
                        : "bg-slate-100 text-slate-600 font-bold"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <span className="text-xs">#{sim.pillarNumber}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isLocked ? "bg-slate-100 border-slate-200 text-slate-400" : badge.bg}`}
                      >
                        {badge.name} #{sim.pillarNumber}
                      </span>
                      <span className={`text-[10px] font-medium ml-auto ${isLocked ? "text-slate-400" : "text-slate-500"}`}>
                        {sim.difficultyBadge}
                      </span>
                    </div>

                    <div className={`text-xs sm:text-sm font-bold truncate ${isLocked ? "text-slate-500" : "text-slate-900"}`}>
                      {sim.title}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isLocked ? "text-slate-400" : "text-slate-500"}`}>
                      {sim.subtitle}
                    </div>

                    <div className={`flex items-center justify-between mt-2 pt-1 border-t ${isLocked ? "border-slate-200/50" : "border-slate-100"}`}>
                      {isCompleted ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center">
                            {[1, 2, 3].map((starIdx) => (
                              <Star
                                key={starIdx}
                                className={`w-3 h-3 ${
                                  starIdx <= stars
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 ml-1">
                            Nilai: {progress.scores[sim.id] || 100}
                          </span>
                        </div>
                      ) : isLocked ? (
                        <span className="text-[10px] font-bold text-rose-500 italic flex items-center gap-1">
                          Tahap sebelumnya belum tuntas
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum dikerjakan</span>
                      )}

                      {!isLocked && (
                        <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                          Buka →
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Simulation Arena (8 cols on desktop, full on mobile arena mode) */}
        <div
          id="active-sim-arena"
          className={`lg:col-span-8 space-y-6 ${
            mobileViewMode === "list" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
            {/* Top Navigation Bar on Mobile */}
            <div className="flex lg:hidden items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMobileViewMode("list");
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                ← Kembali ke Pilihan Level
              </button>

              <div className="flex items-center gap-1">
                {prevChallengeItem && (
                  <button
                    type="button"
                    disabled={
                      (prevChallengeItem.difficulty === "menengah" && !isPemulaCompletedAll) ||
                      (prevChallengeItem.difficulty === "mahir" && (!isPemulaCompletedAll || !isMenengahCompletedAll))
                    }
                    onClick={() => handleSelectItem(prevChallengeItem)}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold cursor-pointer"
                    title="Tantangan sebelumnya"
                  >
                    ← Level #{prevChallengeItem.pillarNumber}
                  </button>
                )}
                {nextChallengeItem && (
                  <button
                    type="button"
                    disabled={
                      (nextChallengeItem.difficulty === "menengah" && !isPemulaCompletedAll) ||
                      (nextChallengeItem.difficulty === "mahir" && (!isPemulaCompletedAll || !isMenengahCompletedAll))
                    }
                    onClick={() => handleSelectItem(nextChallengeItem)}
                    className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-indigo-700 text-xs font-bold cursor-pointer"
                    title="Tantangan selanjutnya"
                  >
                    Level #{nextChallengeItem.pillarNumber} →
                  </button>
                )}
              </div>
            </div>

            {/* Arena Header */}
            <div className="space-y-3 pb-5 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      getPillarBadge(activeItem.pillar).bg
                    }`}
                  >
                    {getPillarBadge(activeItem.pillar).name} • Level {activeItem.pillarNumber}/10
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Tingkat: {activeItem.difficultyBadge}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {userRole === "teacher" && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setShowTeacherInlineKey(!showTeacherInlineKey);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        showTeacherInlineKey
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{showTeacherInlineKey ? "Tutup Kunci" : "Kunci Jawaban Guru"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowHint(!showHint);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      showHint
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    {showHint ? "Sembunyikan Hint" : "Petunjuk Hint"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetChallenge}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ulangi
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeItem.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">{activeItem.subtitle}</p>
              </div>

              {/* Story Context (Kehidupan Siswa Sehari-hari) */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Konteks Nyata Kehidupan Siswa SMA:
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeItem.storyContext}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-indigo-900">
                    Tantanganmu: {activeItem.studentChallenge}
                  </p>
                </div>
              </div>

              {/* Hint Box */}
              {showHint && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Tips Berpikir Komputasional:</div>
                    <div className="mt-0.5 leading-relaxed">{activeItem.hint}</div>
                  </div>
                </div>
              )}

              {/* Teacher Inline Solution Key Box */}
              {userRole === "teacher" && showTeacherInlineKey && (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-700" />
                      Kunci Jawaban Guru untuk Level #{activeItem.pillarNumber} ({activeItem.title})
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                      Mode Guru
                    </span>
                  </div>

                  {activeItem.gameType === "categorize" && (
                    <div className="space-y-2">
                      <div className="font-bold text-emerald-900">Pengelompokan Benar:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeItem.categories?.map((cat) => (
                          <div key={cat} className="p-2 rounded-lg bg-white/80 border border-emerald-200">
                            <span className="font-black text-emerald-950 block">{cat}:</span>
                            <span className="text-slate-700">
                              {activeItem.items.filter((i) => i.category === cat).map((i) => i.label).join(", ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeItem.gameType === "sequence" && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-indigo-950">Urutan Langkah Benar:</div>
                      <ol className="list-decimal list-inside space-y-1 bg-white/80 p-2.5 rounded-lg border border-indigo-200 text-slate-800">
                        {activeItem.targetSequence?.map((tid) => (
                          <li key={tid} className="font-medium">
                            {activeItem.items.find((i) => i.id === tid)?.label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {activeItem.gameType === "filter_essential" && (
                    <div className="space-y-2">
                      <div className="font-bold text-amber-950">Data Esensial yang Harus Dipilih:</div>
                      <ul className="list-disc list-inside space-y-1 bg-white/80 p-2.5 rounded-lg border border-amber-200 text-slate-800">
                        {activeItem.items.filter((i) => i.isEssential).map((i) => (
                          <li key={i.id} className="font-medium">{i.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeItem.gameType === "pattern_detect" && (
                    <div className="p-2.5 rounded-lg bg-white/80 border border-sky-300">
                      <span className="font-bold text-sky-950">Opsi Benar: </span>
                      <span className="font-black text-emerald-700">
                        {activeItem.items.find((i) => i.isCorrect)?.label}
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 italic border-t border-emerald-200/80 pt-2">
                    💡 <strong>Logika Informatika:</strong> {activeItem.ctExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* INTERACTIVE GAME AREA BY TYPE */}

            {/* 1. Categorization Game (Dekomposisi) */}
            {activeItem.gameType === "categorize" && (
              <div className="space-y-6">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Instruksi: Pilih kategori untuk setiap barang/tugas di bawah ini:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeItem.items.map((item) => {
                    const chosenCat = userCategorization[item.id];
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-2.5"
                      >
                        <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>{item.label}</span>
                          {chosenCat && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {chosenCat}
                            </span>
                          )}
                        </div>

                        {/* Category Buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activeItem.categories?.map((cat) => {
                            const isSelected = chosenCat === cat;
                            return (
                              <button
                                key={cat}
                                onClick={() => setItemCategory(item.id, cat)}
                                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all border ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Sequence Game (Algoritma sekuensial) */}
            {activeItem.gameType === "sequence" && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Urutkan Langkah-Langkah Algoritma (1 s.d {userSequence.length}):</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Gunakan tombol Panah Atas / Bawah untuk menggeser posisi langkah
                  </span>
                </div>

                <div className="space-y-2">
                  {userSequence.map((id, index) => {
                    const item = activeItem.items.find((i) => i.id === id);
                    if (!item) return null;

                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-indigo-300 transition-all"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex-1 text-xs sm:text-sm font-medium text-slate-800">
                          {item.label}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={index === 0}
                            onClick={() => moveSequenceItem(index, "up")}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Pindah ke atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                          <button
                            disabled={index === userSequence.length - 1}
                            onClick={() => moveSequenceItem(index, "down")}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Pindah ke bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Essential Filter Game (Abstraksi) */}
            {activeItem.gameType === "filter_essential" && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Instruksi: Klik dan pilih informasi mana yang PALING PENTING (ESENSIAL) untuk
                  disimpan!
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeItem.items.map((item) => {
                    const isSelected = userSelectedFilters.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleFilterItem(item.id)}
                        className={`p-4 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                            isSelected
                              ? "bg-amber-600 border-amber-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                          {item.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>
                    Jumlah terpilih:{" "}
                    <strong className="text-indigo-700">{userSelectedFilters.length}</strong> dari{" "}
                    {activeItem.correctAnswers?.length || 3} informasi esensial
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Abaikan informasi dekoratif / sepele
                  </span>
                </div>
              </div>
            )}

            {/* 4. Pattern Detection Game (Pengenalan Pola & Optimasi Algoritma) */}
            {activeItem.gameType === "pattern_detect" && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Instruksi: Analisis data dan pilih opsi jawaban yang sesuai dengan pola:
                </div>

                <div className="space-y-2.5">
                  {activeItem.items.map((opt) => {
                    const isSelected = userSelectedPatternOpt === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          sound.playClick();
                          setUserSelectedPatternOpt(opt.id);
                        }}
                        className={`w-full p-3.5 sm:p-4 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                            isSelected
                              ? "border-sky-600 bg-sky-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                          {opt.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evaluation Result Banner */}
            {evaluationResult.status !== "idle" && (
              <div
                className={`p-4 rounded-xl border text-sm space-y-2 animate-in fade-in zoom-in-95 duration-200 ${
                  evaluationResult.status === "success"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-rose-50 border-rose-300 text-rose-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base flex items-center gap-2">
                    {evaluationResult.status === "success" ? (
                      <>
                        <Trophy className="w-5 h-5 text-emerald-600" />
                        {evaluationResult.message}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        {evaluationResult.message}
                      </>
                    )}
                  </div>

                  {evaluationResult.status === "success" && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-4 h-4 ${
                            starIdx <= evaluationResult.stars
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {evaluationResult.details && (
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {evaluationResult.details}
                  </p>
                )}

                {evaluationResult.status === "success" && (
                  <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                    <span className="text-emerald-700 font-medium">
                      Nilai tersimpan: <strong>{evaluationResult.score}/100</strong> (Aman tersinkron
                      Cloud & Offline)
                    </span>
                    <button
                      onClick={handleNextChallenge}
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 underline"
                    >
                      Lanjut Tantangan Berikutnya <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CT Pedagogical Explanation */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                Refleksi Berpikir Komputasional & Manfaat Nyata:
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>Pondasi Logika:</strong> {activeItem.ctExplanation}
              </p>
              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                <strong>Manfaat bagi Siswa:</strong> {activeItem.dailyLifeBenefit}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Pilar: <strong>{getPillarBadge(activeItem.pillar).name}</strong> • Studi Kasus{" "}
                <strong>#{activeItem.pillarNumber}</strong> dari 10
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCheckSolution}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Periksa Solusi Logika
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
