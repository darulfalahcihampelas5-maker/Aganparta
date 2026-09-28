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
  X,
} from "lucide-react";

interface DailyLifeSimulatorEngineProps {
  userRole?: "student" | "teacher";
  currentUser?: {
    nisn?: string;
    name?: string;
    kelas?: string;
  };
  simConfig?: {
    active: boolean;
    chapters: string[];
  };
}

export const DailyLifeSimulatorEngine: React.FC<DailyLifeSimulatorEngineProps> = ({
  userRole = "student",
  currentUser,
  simConfig,
}) => {
  const currentNisn = currentUser?.nisn || "guest_student";
  const currentStudentName = currentUser?.name || "Siswa Informatika";

  // Filter global simulators based on teacher settings (only for students)
  const availableSimulators = userRole === "teacher" 
    ? DAILY_LIFE_SIMULATORS 
    : DAILY_LIFE_SIMULATORS.filter(s => simConfig?.chapters.includes(s.pillar));

  // Navigation & Filtering (Default to first available pillar or "all")
  const initialPillar = availableSimulators.length > 0 ? availableSimulators[0].pillar : "dekomposisi";
  const [selectedPillar, setSelectedPillar] = useState<PillarType | "all">(initialPillar);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<SimulatorItem>(availableSimulators[0] || DAILY_LIFE_SIMULATORS[0]);

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

    // If already attempted, show "attempted" state
    if (progress.attemptedIds.includes(activeItem.id)) {
      const isCorrect = progress.scores[activeItem.id] > 0;
      setEvaluationResult({
        status: isCorrect ? "success" : "wrong",
        score: progress.scores[activeItem.id] || 0,
        stars: progress.stars[activeItem.id] || 0,
        message: isCorrect ? "Tantangan ini telah diselesaikan dengan benar." : "Tantangan ini telah dikerjakan namun kurang tepat.",
        details: "Kesempatan pengerjaan simulasi ini telah habis (1x kesempatan)."
      });
    }
  }, [activeItem, progress.attemptedIds, progress.scores, progress.stars]);

  // Load progress when current user changes
  useEffect(() => {
    setProgress(loadLocalProgress(currentNisn));
  }, [currentNisn]);

  // Handler for pillar tab click
  const handleSelectPillar = (pillar: PillarType | "all") => {
    sound.playClick();
    setSelectedPillar(pillar);
    if (pillar !== "all") {
      const firstInPillar = availableSimulators.find((s) => s.pillar === pillar);
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
  const filteredSimulators = availableSimulators.filter((sim) => {
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

  // Sequential progression logic is now handled directly in the list and navigation buttons.

  // Pillar counters
  const pillarCounts = {
    dekomposisi: availableSimulators.filter((s) => s.pillar === "dekomposisi").length,
    pola: availableSimulators.filter((s) => s.pillar === "pola").length,
    abstraksi: availableSimulators.filter((s) => s.pillar === "abstraksi").length,
    algoritma: availableSimulators.filter((s) => s.pillar === "algoritma").length,
  };

  const pillarCompleted = {
    dekomposisi: availableSimulators.filter(
      (s) => s.pillar === "dekomposisi" && progress.attemptedIds.includes(s.id)
    ).length,
    pola: availableSimulators.filter(
      (s) => s.pillar === "pola" && progress.attemptedIds.includes(s.id)
    ).length,
    abstraksi: availableSimulators.filter(
      (s) => s.pillar === "abstraksi" && progress.attemptedIds.includes(s.id)
    ).length,
    algoritma: availableSimulators.filter(
      (s) => s.pillar === "algoritma" && progress.attemptedIds.includes(s.id)
    ).length,
  };

  // Pillar scores (10 points per question)
  const pillarScores = {
    dekomposisi: Object.entries(progress.scores)
      .filter(([id, _]) => availableSimulators.find(s => s.id === id)?.pillar === "dekomposisi")
      .reduce((sum, [_, score]) => sum + score, 0),
    pola: Object.entries(progress.scores)
      .filter(([id, _]) => availableSimulators.find(s => s.id === id)?.pillar === "pola")
      .reduce((sum, [_, score]) => sum + score, 0),
    abstraksi: Object.entries(progress.scores)
      .filter(([id, _]) => availableSimulators.find(s => s.id === id)?.pillar === "abstraksi")
      .reduce((sum, [_, score]) => sum + score, 0),
    algoritma: Object.entries(progress.scores)
      .filter(([id, _]) => availableSimulators.find(s => s.id === id)?.pillar === "algoritma")
      .reduce((sum, [_, score]) => sum + score, 0),
  };

  // Reordering handler for sequence game
  const moveSequenceItem = (index: number, direction: "up" | "down") => {
    if (progress.attemptedIds.includes(activeItem.id)) return;
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
    if (progress.attemptedIds.includes(activeItem.id)) return;
    sound.playClick();
    if (userSelectedFilters.includes(id)) {
      setUserSelectedFilters(userSelectedFilters.filter((x) => x !== id));
    } else {
      setUserSelectedFilters([...userSelectedFilters, id]);
    }
  };

  // Set category for an item
  const setItemCategory = (itemId: string, category: string) => {
    if (progress.attemptedIds.includes(activeItem.id)) return;
    sound.playClick();
    setUserCategorization((prev) => ({
      ...prev,
      [itemId]: category,
    }));
  };

  // Check Solution
  const handleCheckSolution = async () => {
    // If already attempted, don't allow re-submit
    if (progress.attemptedIds.includes(activeItem.id)) {
      return;
    }

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

    // Save progress to LocalStorage + Supabase
    // Each question is worth exactly 10 points if fully correct, else 0 (per user request)
    const actualScore = isCorrect ? 10 : 0;
    
    setEvaluationResult({
      status: isCorrect ? "success" : "wrong",
      score: actualScore,
      stars: isCorrect ? 3 : 0,
      message,
      details,
    });

    const updated = await saveSimulationProgress(
      currentNisn,
      currentStudentName,
      activeItem.id,
      actualScore,
      isCorrect ? 3 : 0
    );
    setProgress(updated);
  };

  // Reset current challenge
  const handleResetChallenge = () => {
    if (progress.attemptedIds.includes(activeItem.id)) return;
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
    const currentIndex = availableSimulators.findIndex((s) => s.id === activeItem.id);
    if (currentIndex < availableSimulators.length - 1) {
      setActiveItem(availableSimulators[currentIndex + 1]);
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
      <div className="bg-gradient-to-r from-emerald-900 via-[#85cc00]/20 to-emerald-900 text-white rounded-[2rem] p-5 sm:p-8 shadow-xl border border-[#85cc00]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#85cc00]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#85cc00]/20 border border-[#85cc00]/30 text-[#85cc00] text-[10px] font-black uppercase tracking-wider">
              <Sparkle className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              Katalog 40 Simulator Siswa SMA
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight break-words">
              Simulasi Berpikir Komputasional
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed opacity-90 break-words">
              Pecahkan 40 studi kasus nyata kehidupan siswa menggunakan 4 pilar BK: Dekomposisi, Pola, Abstraksi, dan Algoritma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-emerald-800/80 p-4 rounded-3xl border border-emerald-700 shadow-inner">
            <div className="text-center px-3 border-r border-emerald-700">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                {progress.totalStars}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Total Bintang</div>
            </div>
            <div className="text-center px-3 border-r border-emerald-700">
              <div className="text-2xl font-black text-[#85cc00]">
                {pillarScores[activeItem.pillar]}/100
              </div>
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-tight">Skor Pilar</div>
            </div>
            <div className="text-center px-2">
              <div className="text-2xl font-black text-sky-400">
                {progress.attemptedIds.length}/{availableSimulators.length}
              </div>
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-tight">Selesai</div>
            </div>
          </div>
        </div>

        {/* Pillar Progress Bars - Orderly 1 through 4 */}
        <div className="mt-8 pt-6 border-t border-emerald-800 space-y-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-300 font-black uppercase tracking-widest">
            <span className="text-[#85cc00]">Pondasi Computational Thinking:</span>
            <button
              onClick={() => handleSelectPillar(selectedPillar === "all" ? "dekomposisi" : "all")}
              className="text-amber-300 hover:text-white underline cursor-pointer"
            >
              {selectedPillar === "all" ? "Fokus per Pilar" : "Lihat Semua"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'dekomposisi', name: 'Dekomposisi', num: 1, color: 'emerald' },
              { id: 'pola', name: 'Pengenalan Pola', num: 2, color: 'sky' },
              { id: 'abstraksi', name: 'Abstraksi', num: 3, color: 'amber' },
              { id: 'algoritma', name: 'Algoritma', num: 4, color: 'indigo' },
            ].map(p => {
              const isChapterActive = userRole === "teacher" || simConfig?.chapters.includes(p.id);
              const isSelected = selectedPillar === p.id;
              
              if (!isChapterActive) {
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl text-left border bg-emerald-100/50/50 border-emerald-200/50 opacity-60 grayscale cursor-not-allowed flex flex-col justify-between min-h-[90px]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-black text-slate-400 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-300 text-white font-black text-[11px] flex items-center justify-center">?</span>
                        <span>{p.name}</span>
                      </span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic mt-auto">
                      Dinonaktifkan Guru
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPillar(p.id as PillarType)}
                  className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between min-h-[90px] ${
                    isSelected
                      ? `bg-[#85cc00]/10 border-[#85cc00] ring-2 ring-[#85cc00]/20 shadow-lg scale-102`
                      : `bg-emerald-800/60 border-emerald-700 hover:bg-emerald-800`
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 w-full">
                    <span className={`font-black flex items-center gap-1.5 ${isSelected ? 'text-[#85cc00]' : `text-${p.color}-300`}`}>
                      <span className={`w-5 h-5 rounded-md text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#85cc00]' : `bg-${p.color}-500`}`}>{p.num}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="text-emerald-100 font-mono text-[11px] font-bold">
                      {pillarCompleted[p.id as PillarType]}/10
                    </span>
                  </div>
                  <div className="w-full bg-emerald-700 rounded-full h-2 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#85cc00]' : `bg-${p.color}-400`}`}
                      style={{ width: `${(pillarCompleted[p.id as PillarType] / 10) * 100}%` }}
                    />
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight mt-1.5 ${isSelected ? 'text-[#85cc00]' : `text-${p.color}-400/80`}`}>
                    #{p.num * 10 - 9} s.d #{p.num * 10}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Portrait Mode Segmented Switcher (Layar Smartphone Portrait) */}
      <div className="flex lg:hidden items-center bg-emerald-100/50 p-1.5 rounded-2xl border border-emerald-200/50 shadow-xs mx-1">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setMobileViewMode("list");
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-tight ${
            mobileViewMode === "list"
              ? "bg-white text-emerald-950 shadow-sm border border-emerald-200/50"
              : "text-emerald-700 hover:text-emerald-950"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#85cc00]" />
          <span>Daftar Tantangan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setMobileViewMode("arena");
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-tight ${
            mobileViewMode === "arena"
              ? "bg-[#85cc00] text-emerald-950 shadow-sm"
              : "text-emerald-700 hover:text-emerald-950"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span className="truncate">Arena: {activeItem.title.slice(0, 10)}...</span>
        </button>
      </div>

      {/* Main Grid: Sidebar Selector & Arena Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 40 Simulator List Navigation (4 cols on desktop, responsive on mobile) */}
        <div
          className={`lg:col-span-4 bg-white rounded-3xl border border-emerald-200/50 shadow-sm p-4 sm:p-5 space-y-4 ${
            mobileViewMode === "arena" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#85cc00]" />
                <span>
                  {selectedPillar === "all"
                    ? "Daftar Tantangan"
                    : `Level ${getPillarBadge(selectedPillar).name}`}
                </span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {filteredSimulators.length} Kasus
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari studi kasus..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-[#85cc00]/20 focus:border-[#85cc00] bg-emerald-50/50 font-medium"
              />
            </div>

            {/* Difficulty Tabs */}
            <div className="flex gap-1.5 p-1 bg-emerald-50/50 rounded-2xl text-[10px] font-black uppercase tracking-tighter">
              <button
                type="button"
                onClick={() => setSelectedDifficulty("all")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  selectedDifficulty === "all"
                    ? "bg-white text-emerald-950 shadow-xs border border-emerald-100/50"
                    : "text-slate-400 hover:text-emerald-700"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("pemula")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  selectedDifficulty === "pemula"
                    ? "bg-white text-emerald-600 shadow-xs border border-emerald-100/50"
                    : "text-slate-400 hover:text-emerald-700"
                }`}
              >
                Pemula
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("menengah")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  selectedDifficulty === "menengah"
                    ? "bg-white text-sky-600 shadow-xs border border-emerald-100/50"
                    : "text-slate-400 hover:text-emerald-700"
                }`}
              >
                Menengah
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty("mahir")}
                className={`flex-1 py-2 rounded-xl text-center transition-all cursor-pointer ${
                  selectedDifficulty === "mahir"
                    ? "bg-white text-indigo-600 shadow-xs border border-emerald-100/50"
                    : "text-slate-400 hover:text-emerald-700"
                }`}
              >
                Mahir
              </button>
            </div>
          </div>

          {/* List of Challenges */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredSimulators.map((sim) => {
              const score = progress.scores[sim.id] || 0;
              const isAttempted = progress.attemptedIds.includes(sim.id);
              const isSuccess = isAttempted && score > 0;
              const isFailed = isAttempted && score === 0;
              const stars = progress.stars[sim.id] || 0;
              const isSelected = activeItem.id === sim.id;
              const badge = getPillarBadge(sim.pillar);
              const IconComp = badge.icon;
              
              // Progression Lock Calculation (Sequential across available simulators)
              const globalIndex = availableSimulators.findIndex(s => s.id === sim.id);
              const globalPrevSim = globalIndex > 0 ? availableSimulators[globalIndex - 1] : null;
              
              // Teachers see everything unlocked. Students unlock Level N+1 after attempting Level N.
              const isLocked = userRole !== "teacher" && globalPrevSim && !progress.attemptedIds.includes(globalPrevSim.id);

              return (
                <button
                  key={sim.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) handleSelectItem(sim);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 border group ${
                    isLocked
                      ? "bg-emerald-50/50 border-emerald-100/50 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-[#85cc00]/5 border-[#85cc00] ring-1 ring-[#85cc00]/20 shadow-sm cursor-pointer"
                      : isFailed
                      ? "bg-rose-50 border-rose-100 hover:bg-rose-100 cursor-pointer"
                      : isSuccess
                      ? "bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-50 cursor-pointer"
                      : "bg-white border-emerald-100/50 hover:border-[#85cc00]/30 hover:bg-emerald-50/50/50 cursor-pointer"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-110 ${
                      isLocked
                        ? "bg-emerald-100/50 text-slate-300"
                        : isFailed
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : isSuccess
                        ? "bg-emerald-600 text-white font-black"
                        : isSelected
                        ? "bg-[#85cc00] text-emerald-950 font-black"
                        : "bg-emerald-100/50 text-emerald-700 font-bold"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : isFailed ? (
                      <X className="w-5 h-5 text-rose-600" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className={`text-[11px] ${isLocked ? 'text-rose-400' : ''}`}>#{sim.pillarNumber}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${
                          isLocked 
                            ? "bg-rose-50 border-rose-100 text-rose-400" 
                            : isFailed
                            ? "bg-rose-100 border-rose-200 text-rose-700"
                            : isSelected
                            ? "bg-[#85cc00]/20 border-[#85cc00]/30 text-emerald-900"
                            : badge.bg
                        }`}
                      >
                        {badge.name}
                      </span>
                      <span className={`text-[9px] font-bold ml-auto uppercase tracking-tighter ${isLocked ? "text-slate-300" : "text-slate-400"}`}>
                        {sim.difficultyBadge}
                      </span>
                    </div>

                    <div className={`text-xs font-black leading-tight break-words whitespace-normal ${isLocked ? "text-rose-500" : "text-emerald-950"}`}>
                      {sim.title}
                    </div>
                    <div className={`text-[10px] mt-1 leading-snug break-words whitespace-normal line-clamp-2 ${isLocked ? "text-rose-400" : "text-emerald-700"}`}>
                      {sim.subtitle}
                    </div>

                    <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isLocked ? "border-slate-50" : "border-emerald-100/50"}`}>
                      {isAttempted ? (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center">
                            {[1, 2, 3].map((starIdx) => (
                              <Star
                                key={starIdx}
                                className={`w-3 h-3 ${
                                  starIdx <= (progress.stars[sim.id] || 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-[10px] font-black ml-1 ${score > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            Skor: {score}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-black flex items-center gap-1 text-rose-500`}>
                          Nilai: 0
                        </span>
                      )}

                      {!isLocked && (
                        <span className={`text-[10px] font-black flex items-center gap-0.5 ${isSelected ? 'text-[#85cc00]' : 'text-slate-400 group-hover:text-emerald-700'}`}>
                          {isAttempted ? 'Buka' : 'Mulai'} →
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
          <div className="bg-white rounded-2xl border border-emerald-200/50 shadow-sm p-5 sm:p-7 space-y-6">
            {/* Top Navigation Bar on Mobile */}
            <div className="flex lg:hidden items-center justify-between gap-2 pb-4 border-b border-emerald-100/50">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMobileViewMode("list");
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-100/50 hover:bg-emerald-200/50 text-emerald-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                ← Kembali ke Pilihan Level
              </button>

              <div className="flex items-center gap-1">
                {prevChallengeItem && (
                  <button
                    type="button"
                    onClick={() => handleSelectItem(prevChallengeItem)}
                    className="px-2.5 py-2 rounded-xl bg-emerald-100/50 hover:bg-emerald-200/50 text-emerald-800 text-xs font-bold cursor-pointer"
                    title="Tantangan sebelumnya"
                  >
                    ← Level #{prevChallengeItem.pillarNumber}
                  </button>
                )}
                {nextChallengeItem && (
                  <button
                    type="button"
                    disabled={userRole !== 'teacher' && !progress.attemptedIds.includes(activeItem.id)}
                    onClick={() => handleSelectItem(nextChallengeItem)}
                    className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-emerald-100/50 disabled:text-slate-400 disabled:cursor-not-allowed text-indigo-700 text-xs font-bold cursor-pointer"
                    title={userRole !== 'teacher' && !progress.attemptedIds.includes(activeItem.id) ? "Selesaikan tantangan ini untuk lanjut" : "Tantangan selanjutnya"}
                  >
                    Level #{nextChallengeItem.pillarNumber} →
                  </button>
                )}
              </div>
            </div>

            {/* Arena Header */}
            <div className="space-y-3 pb-5 border-b border-emerald-200/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      getPillarBadge(activeItem.pillar).bg
                    }`}
                  >
                    {getPillarBadge(activeItem.pillar).name} • Level {activeItem.pillarNumber}/10
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100/50 text-emerald-800 border border-emerald-200/50">
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
                        : "bg-emerald-50/50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    {showHint ? "Sembunyikan Hint" : "Petunjuk Hint"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetChallenge}
                    disabled={progress.attemptedIds.includes(activeItem.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      progress.attemptedIds.includes(activeItem.id)
                        ? "bg-emerald-100/50 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-50/50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50 cursor-pointer"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ulangi
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 break-words whitespace-normal">
                  {activeItem.title}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-700 mt-1 break-words whitespace-normal">{activeItem.subtitle}</p>
              </div>

              {/* Story Context (Kehidupan Siswa Sehari-hari) */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Konteks Nyata Kehidupan Siswa SMA:
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed break-words whitespace-normal">
                  {activeItem.storyContext}
                </p>
                <div className="pt-2 border-t border-emerald-200/50/60 flex items-start gap-2">
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
                            <span className="text-emerald-800">
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
                      <ol className="list-decimal list-inside space-y-1 bg-white/80 p-2.5 rounded-lg border border-indigo-200 text-emerald-900">
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
                      <ul className="list-disc list-inside space-y-1 bg-white/80 p-2.5 rounded-lg border border-amber-200 text-emerald-900">
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

                  <p className="text-[11px] text-emerald-700 italic border-t border-emerald-200/80 pt-2">
                    💡 <strong>Logika Informatika:</strong> {activeItem.ctExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* INTERACTIVE GAME AREA BY TYPE */}

            {/* 1. Categorization Game (Dekomposisi) */}
            {activeItem.gameType === "categorize" && (
              <div className="space-y-6">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Instruksi: Pilih kategori untuk setiap barang/tugas di bawah ini:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeItem.items.map((item) => {
                    const chosenCat = userCategorization[item.id];
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-emerald-200/50 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-2.5"
                      >
                        <div className={`text-xs font-bold flex items-center justify-between ${
                          progress.attemptedIds.includes(activeItem.id) && chosenCat !== item.category
                            ? "text-rose-600"
                            : "text-emerald-900"
                        }`}>
                          <span>{item.label}</span>
                          {chosenCat && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              progress.attemptedIds.includes(activeItem.id) && chosenCat !== item.category
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}>
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
                                    : "bg-emerald-50/50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50"
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
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
                  <span>Urutkan Langkah-Langkah Algoritma (1 s.d {userSequence.length}):</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Gunakan tombol Panah Atas / Bawah untuk menggeser posisi langkah
                  </span>
                </div>

                <div className="space-y-2">
                  {userSequence.map((id, index) => {
                    const item = activeItem.items.find((i) => i.id === id);
                    const isAttempted = progress.attemptedIds.includes(activeItem.id);
                    const isPosCorrect = activeItem.targetSequence && activeItem.targetSequence[index] === id;

                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all shadow-xs ${
                          isAttempted 
                            ? (isPosCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50 animate-shake") 
                            : "border-emerald-200/50 bg-white hover:border-indigo-300"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                          isAttempted && !isPosCorrect
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {index + 1}
                        </div>

                        <div className={`flex-1 text-xs sm:text-sm font-medium ${
                          progress.attemptedIds.includes(activeItem.id) && activeItem.targetSequence && activeItem.targetSequence[index] !== id
                            ? "text-rose-600"
                            : "text-emerald-900"
                        }`}>
                          {item.label}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={index === 0}
                            onClick={() => moveSequenceItem(index, "up")}
                            className="p-1.5 rounded-lg border border-emerald-200/50 bg-emerald-50/50 hover:bg-emerald-100/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Pindah ke atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-800" />
                          </button>
                          <button
                            disabled={index === userSequence.length - 1}
                            onClick={() => moveSequenceItem(index, "down")}
                            className="p-1.5 rounded-lg border border-emerald-200/50 bg-emerald-50/50 hover:bg-emerald-100/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Pindah ke bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-800" />
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
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
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
                            : "bg-white border-emerald-200/50 hover:border-slate-300 hover:bg-emerald-50/50"
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
                        <div className={`flex-1 text-xs sm:text-sm font-medium leading-relaxed ${
                          progress.attemptedIds.includes(activeItem.id) && isSelected && !item.isEssential
                            ? "text-rose-600"
                            : "text-emerald-900"
                        }`}>
                          {item.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/50 text-xs text-emerald-700 flex items-center justify-between">
                  <span>
                    Jumlah terpilih:{" "}
                    <strong className="text-indigo-700">{userSelectedFilters.length}</strong> dari{" "}
                    {activeItem.correctAnswers?.length || 3} informasi esensial
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Abaikan informasi dekoratif / sepele
                  </span>
                </div>
              </div>
            )}

            {/* 4. Pattern Detection Game (Pengenalan Pola & Optimasi Algoritma) */}
            {activeItem.gameType === "pattern_detect" && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Instruksi: Analisis data dan pilih opsi jawaban yang sesuai dengan pola:
                </div>

                <div className="space-y-2.5">
                  {activeItem.items.map((opt) => {
                    const isSelected = userSelectedPatternOpt === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (progress.attemptedIds.includes(activeItem.id)) return;
                          sound.playClick();
                          setUserSelectedPatternOpt(opt.id);
                        }}
                        className={`w-full p-3.5 sm:p-4 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs"
                            : "bg-white border-emerald-200/50 hover:border-slate-300 hover:bg-emerald-50/50"
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
                        <div className={`flex-1 text-xs sm:text-sm font-medium leading-relaxed ${
                          progress.attemptedIds.includes(activeItem.id) && isSelected && !opt.isCorrect
                            ? "text-rose-600"
                            : "text-emerald-900"
                        }`}>
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
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {evaluationResult.details}
                  </p>
                )}

                {/* Student Identity and Pillar Score (Shown for any attempt) */}
                <div className="mt-3 p-3 bg-white/60 rounded-xl border border-emerald-200/50 shadow-inner flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-700">Nama Lengkap Siswa:</span>
                    <span className="font-black text-emerald-950 uppercase">{currentStudentName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-700">NIS / NISN:</span>
                    <span className="font-black text-emerald-950">{currentNisn}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-700">Kelas:</span>
                    <span className="font-black text-emerald-950">{currentUser?.kelas || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-emerald-200/50">
                    <span className="font-bold text-emerald-800">Nilai Akumulasi {getPillarBadge(activeItem.pillar).name}:</span>
                    <span className={`font-black text-lg ${pillarScores[activeItem.pillar] >= 75 ? "text-emerald-700" : "text-indigo-700"}`}>
                      {pillarScores[activeItem.pillar]} / 100
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between text-xs mt-2">
                  <span className="text-emerald-700 font-medium italic">
                    {evaluationResult.status === "success" ? "✅ Jawaban Benar (+10 Poin)" : "❌ Jawaban Kurang Tepat (0 Poin)"} • 1x Kesempatan
                  </span>
                  
                  {nextChallengeItem && (
                    <button
                      onClick={handleNextChallenge}
                      className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                    >
                      Lanjut Tantangan Berikutnya <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Pillar Completion Milestone */}
                {pillarCompleted[activeItem.pillar] === pillarCounts[activeItem.pillar] && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Trophy className="w-6 h-6 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">Pilar Selesai!</h4>
                        <p className="text-[10px] text-indigo-100">Kamu telah menyelesaikan 10 tantangan {getPillarBadge(activeItem.pillar).name}.</p>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 rounded-xl p-4 space-y-3 border border-white/10 text-left">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase opacity-70">Laporan Hasil Pilar</span>
                        <div className="grid grid-cols-1 gap-1 text-[11px]">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="opacity-80">Nama Lengkap:</span>
                            <span className="font-black uppercase">{currentStudentName}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="opacity-80">NIS / NISN:</span>
                            <span className="font-black">{currentNisn}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="opacity-80">Kelas:</span>
                            <span className="font-black">{currentUser?.kelas || "-"}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="font-bold text-amber-300 uppercase">Nilai {getPillarBadge(activeItem.pillar).name}:</span>
                            <span className="font-black text-lg text-amber-300">{pillarScores[activeItem.pillar]} / 100</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => window.print()}
                        className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Cetak Laporan Pilar Ini
                      </button>
                    </div>
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
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>Pondasi Logika:</strong> {activeItem.ctExplanation}
              </p>
              <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                <strong>Manfaat bagi Siswa:</strong> {activeItem.dailyLifeBenefit}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-emerald-200/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-700">
                Pilar: <strong>{getPillarBadge(activeItem.pillar).name}</strong> • Studi Kasus{" "}
                <strong>#{activeItem.pillarNumber}</strong> dari 10
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCheckSolution}
                  disabled={evaluationResult.status !== "idle" || progress.attemptedIds.includes(activeItem.id)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 ${
                    progress.attemptedIds.includes(activeItem.id)
                      ? "bg-emerald-200/50 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg cursor-pointer"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {progress.attemptedIds.includes(activeItem.id) ? "Sudah Dikerjakan" : "Periksa Solusi Logika (+10)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Final Report Card - Show when all available are attempted */}
      {availableSimulators.length > 0 && progress.attemptedIds.length >= availableSimulators.length && (
        <div className="bg-white rounded-3xl border-4 border-amber-400 shadow-2xl p-8 text-center space-y-8 animate-in zoom-in-95 duration-500 print:shadow-none print:border-slate-300 print:m-0 print:p-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-inner">
              <Trophy className="w-12 h-12 text-amber-600" />
            </div>
          </div>
          
          <div>
            <h2 className="text-4xl font-black text-emerald-950 uppercase tracking-tight">Raport Hasil Simulasi</h2>
            <div className="h-1.5 w-24 bg-indigo-600 mx-auto mt-2 rounded-full"></div>
            <p className="text-emerald-700 font-bold tracking-widest mt-3 uppercase text-xs">Berpikir Komputasional (CT) Simulator</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left bg-emerald-50/50 p-8 rounded-3xl border border-emerald-200/50">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</p>
              <p className="text-lg font-black text-emerald-950 border-b-2 border-emerald-200/50 pb-1">{currentStudentName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Induk Siswa (NIS)</p>
              <p className="text-lg font-black text-emerald-950 border-b-2 border-emerald-200/50 pb-1">{currentNisn}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas / Rombel</p>
              <p className="text-lg font-black text-emerald-950 border-b-2 border-emerald-200/50 pb-1">{currentUser?.kelas || "X SMA"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'dekomposisi', name: 'Dekomposisi', score: pillarScores.dekomposisi, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { id: 'pola', name: 'Pengenalan Pola', score: pillarScores.pola, color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
              { id: 'abstraksi', name: 'Abstraksi', score: pillarScores.abstraksi, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
              { id: 'algoritma', name: 'Algoritma', score: pillarScores.algoritma, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
            ].map(pillar => (
              <div key={pillar.id} className={`${pillar.bg} p-5 rounded-2xl border-2 ${pillar.border} shadow-sm transform transition-transform hover:scale-105`}>
                <p className="text-[10px] font-black text-emerald-700 uppercase mb-2 tracking-tighter">{pillar.name}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-3xl font-black ${pillar.color}`}>{pillar.score}</span>
                  <span className="text-xs font-bold text-slate-400">/ 100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t-2 border-dashed border-emerald-200/50 flex flex-col items-center gap-6">
            <div className="text-center relative">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Nilai Akumulasi Akhir</p>
              <div className="inline-flex items-baseline gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-indigo-200">
                <span className="text-6xl font-black leading-none">{progress.totalScore}</span>
                <span className="text-xl font-bold opacity-70">/ 400</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-black text-emerald-800">Total {progress.totalStars} Bintang Diperoleh</span>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 w-full">
              <button
                onClick={() => window.print()}
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/30 flex items-center gap-3 cursor-pointer group"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:animate-pulse" />
                CETAK RAPORT HASIL SIMULASI
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium max-w-sm italic">
              * Raport ini dihasilkan secara otomatis oleh Sistem Simulasi Informatika. Simpan atau cetak hasil ini sebagai bukti penyelesaian materi Berpikir Komputasional.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
