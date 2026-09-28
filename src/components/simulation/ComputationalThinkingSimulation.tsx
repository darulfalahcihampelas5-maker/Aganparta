import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Gamepad2,
  BookOpen,
  HelpCircle,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Network,
  Brain,
  CheckCircle2,
  Award,
  Layers,
  Printer,
  RotateCcw,
  GraduationCap,
  Users,
  Compass,
  Boxes,
} from "lucide-react";
import { SIMULATION_LEVELS, LevelConfig, LevelDifficulty } from "./simulationData";
import { GridRoverSimulator } from "./GridRoverSimulator";
import { GraphAbstractionSimulator } from "./GraphAbstractionSimulator";
import { SortingDecompositionSimulator } from "./SortingDecompositionSimulator";
import { LogicGatePatternSimulator } from "./LogicGatePatternSimulator";
import { FlowchartDecomposerSimulator } from "./FlowchartDecomposerSimulator";
import { QuizInteractive } from "./QuizInteractive";
import { ModuleViewer } from "./ModuleViewer";
import { sound } from "./soundEffects";
import { DailyLifeSimulatorEngine } from "./DailyLifeSimulatorEngine";
import { TeacherSimulationView } from "./TeacherSimulationView";

interface UserProgress {
  scores: Record<LevelDifficulty, { simScore: number; quizScore: number; stars: number; passed: boolean }>;
}

interface ComputationalThinkingSimulationProps {
  userRole: "student" | "teacher";
  currentUser?: {
    name?: string;
    nisn?: string;
    kelas?: string;
  };
  simConfig?: {
    active: boolean;
    chapters: string[];
  };
  onBackToDashboard?: () => void;
}

export const ComputationalThinkingSimulation: React.FC<ComputationalThinkingSimulationProps> = ({
  userRole,
  currentUser,
  simConfig,
  onBackToDashboard,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<LevelDifficulty>("pemula");
  const [activeTab, setActiveTab] = useState<"daily_life" | "classic_sim" | "modul" | "kuis" | "raport" | "teacher_mgmt">("daily_life");
  const [classicGameTab, setClassicGameTab] = useState<"rover" | "graph" | "sorting" | "logic" | "flowchart">("rover");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Storage key based on NISN or default
  const storageKey = currentUser?.nisn
    ? `sipinter_sim_progress_${currentUser.nisn}`
    : "sipinter_sim_progress_default";

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      scores: {
        pemula: { simScore: 0, quizScore: 0, stars: 0, passed: false },
        menengah: { simScore: 0, quizScore: 0, stars: 0, passed: false },
        lanjutan: { simScore: 0, quizScore: 0, stars: 0, passed: false },
      },
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {}
  }, [progress, storageKey]);

  const currentLevel = SIMULATION_LEVELS.find((l) => l.id === selectedLevelId)!;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const handleSimulatorScore = (score: number, stars: number) => {
    setProgress((prev) => {
      const old = prev.scores[selectedLevelId];
      const newSimScore = Math.max(old.simScore, score);
      const newStars = Math.max(old.stars, stars);
      return {
        ...prev,
        scores: {
          ...prev.scores,
          [selectedLevelId]: {
            ...old,
            simScore: newSimScore,
            stars: newStars,
          },
        },
      };
    });
  };

  const handleQuizFinish = (quizScore: number, passed: boolean) => {
    setProgress((prev) => {
      const old = prev.scores[selectedLevelId];
      const newQuizScore = Math.max(old.quizScore, quizScore);
      return {
        ...prev,
        scores: {
          ...prev.scores,
          [selectedLevelId]: {
            ...old,
            quizScore: newQuizScore,
            passed: passed || old.passed,
          },
        },
      };
    });
  };

  const handlePrintRaport = () => {
    window.print();
  };

  // Overall statistics
  const totalStars = Object.values(progress.scores).reduce((acc, s) => acc + s.stars, 0);
  const totalLevelsPassed = Object.values(progress.scores).filter((s) => s.passed).length;
  const overallAverageScore = Math.round(
    Object.values(progress.scores).reduce((acc, s) => acc + (s.simScore + s.quizScore) / 2, 0) / 3
  );

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Green Frame Container for Mobile Portrait */}
      <div className="md:border-none border-[12px] border-[#85cc00] rounded-[2.5rem] overflow-hidden md:rounded-none">
        <div className="bg-white md:bg-transparent rounded-[2rem] md:rounded-none shadow-xl md:shadow-none border border-emerald-200/50 md:border-none p-2 sm:p-4 md:p-0">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-white hover:bg-emerald-50/50 text-emerald-800 text-sm font-bold rounded-xl flex items-center gap-2 border border-emerald-200/50 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Bab
            </button>
          )}
      
      {/* Unified Header Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 mb-8 gap-4 px-1">
        <div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-emerald-950 to-emerald-800 bg-clip-text text-transparent tracking-tight leading-tight">
            Simulasi Berpikir Komputasional
          </h2>
          <p className="text-sm font-semibold text-emerald-700 mt-1 break-words whitespace-normal">
            Laboratorium virtual interaktif untuk melatih 4 pilar Computational Thinking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-emerald-200/50 flex items-center gap-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-xs">
              <Sparkles className="w-4 h-4 fill-amber-500" />
              <span>{totalStars} / 9 ★</span>
            </div>
            <div className="h-4 w-px bg-emerald-200/50" />
            <div className="text-emerald-600 font-black text-xs">
              <span>Skor: {overallAverageScore}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-sm"
            title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#85cc00]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

        {/* Primary Mode Selector - Distinct Prominent Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {(userRole === "teacher" || ["dekomposisi", "pola", "abstraksi", "algoritma"].some(p => simConfig?.chapters.includes(p))) && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab("daily_life");
              }}
              className={`p-6 rounded-[2rem] text-left transition-all cursor-pointer border-2 relative overflow-hidden group bg-white ${
                activeTab === "daily_life"
                  ? "border-[#85cc00] shadow-xl shadow-[#85cc00]/20 scale-[1.02]"
                  : "border-emerald-100 hover:border-[#85cc00]/50 hover:bg-emerald-50/10"
              }`}
            >
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeTab === 'daily_life' ? 'bg-[#85cc00]/20 text-[#85cc00]' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Boxes className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-emerald-950">
                  Katalog 40 Simulator Siswa SMA
                </h3>
                <span className="text-xs font-bold text-[#85cc00] uppercase tracking-widest block mb-2">
                  Simulasi Berpikir Komputasional
                </span>
                <p className="text-sm font-medium text-emerald-700 leading-relaxed max-w-md">
                  Pecahkan 40 studi kasus nyata kehidupan siswa menggunakan 4 pilar BK: Dekomposisi, Pola, Abstraksi, dan Algoritma.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${activeTab === 'daily_life' ? 'bg-[#85cc00]/10 text-[#85cc00]' : 'bg-emerald-100 text-emerald-700'}`}>
                    40 Level Mandiri
                  </span>
                </div>
              </div>
              
              {/* Green Transition Background Decoration */}
              <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full opacity-[0.08] transition-transform duration-700 group-hover:scale-125 ${activeTab === 'daily_life' ? 'bg-[#85cc00]' : 'bg-emerald-400'}`}></div>
              <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-[#85cc00]/5 transition-opacity duration-500 ${activeTab === 'daily_life' ? 'opacity-100' : 'opacity-0'}`}></div>
            </button>
          )}

          {(userRole === "teacher" || simConfig?.chapters.includes("classic_sim")) && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab("classic_sim");
              }}
              className={`p-6 rounded-[2rem] text-left transition-all cursor-pointer border-2 relative overflow-hidden group bg-white ${
                activeTab === "classic_sim"
                  ? "border-indigo-600 shadow-xl shadow-indigo-600/20 scale-[1.02]"
                  : "border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50/10"
              }`}
            >
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeTab === 'classic_sim' ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Gamepad2 className="w-7 h-7" />
                </div>
                <h3 className={`text-xl font-black uppercase tracking-tight ${activeTab === 'classic_sim' ? 'text-indigo-950' : 'text-indigo-900'}`}>
                  Lab Virtual Klasik
                </h3>
                <p className={`text-sm font-medium mt-1 ${activeTab === 'classic_sim' ? 'text-indigo-700' : 'text-indigo-600'}`}>
                  Permainan Logika Klasik (Grid Rover, Graph, Sorting, dll).
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${activeTab === 'classic_sim' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                    Multi-Misi Interaktif
                  </span>
                </div>
              </div>
              <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-5 transition-transform group-hover:scale-150 bg-indigo-400`}></div>
            </button>
          )}
        </div>

        {/* Support & Evaluation Tabs */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 mb-8">
          {(userRole === "teacher" || simConfig?.chapters.includes("modul_kuis")) && (
            <>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab("modul");
                }}
                className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer border uppercase tracking-wider ${
                  activeTab === "modul"
                    ? "bg-emerald-800 text-white border-emerald-700 shadow-md"
                    : "bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Modul Materi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab("kuis");
                }}
                className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer border uppercase tracking-wider ${
                  activeTab === "kuis"
                    ? "bg-emerald-800 text-white border-emerald-700 shadow-md"
                    : "bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Kuis Interaktif</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab("raport");
            }}
            className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer border uppercase tracking-wider ${
              activeTab === "raport"
                ? "bg-amber-500 text-white border-amber-400 shadow-md"
                : "bg-white border-amber-100 text-amber-700 hover:bg-amber-50"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Raport Nilai</span>
          </button>

          {userRole === "teacher" && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab("teacher_mgmt");
              }}
              className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer border uppercase tracking-wider lg:ml-auto ${
                activeTab === "teacher_mgmt"
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                  : "bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Menu Guru</span>
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Main Tab Panels */}
      <div>
        {/* Render classical level selectors ONLY if not on daily_life and not on teacher_mgmt */}
        {activeTab !== "daily_life" && activeTab !== "teacher_mgmt" && (
          <div className="mb-6 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3">
            {SIMULATION_LEVELS.map((lvl) => {
              const isSelected = selectedLevelId === lvl.id;
              const lvlProgress = progress.scores[lvl.id];

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedLevelId(lvl.id);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-800 border-emerald-400/80 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        lvl.id === "pemula"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : lvl.id === "menengah"
                          ? "bg-sky-100 text-sky-700 border-sky-200"
                          : "bg-purple-100 text-purple-700 border-purple-200"
                      }`}
                    >
                      {lvl.difficultyBadge}
                    </span>
                  </div>

                  <h3 className={`font-black text-sm break-words whitespace-normal ${isSelected ? "text-white" : "text-emerald-900"}`}>
                    {lvl.title}
                  </h3>
                  <p className={`text-[11px] line-clamp-1 mt-0.5 ${isSelected ? "text-emerald-400" : "text-emerald-600"}`}>{lvl.subtitle}</p>

                  <div className={`mt-2.5 flex items-center justify-between text-[10px] font-bold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    <span>Sim: {lvlProgress.simScore}</span>
                    <span>Kuis: {lvlProgress.quizScore}</span>
                    <span className={lvlProgress.passed ? "text-emerald-500" : ""}>
                      {lvlProgress.passed ? "✓ Lulus" : "Belum Lulus"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 0. Teacher Management View: Reset Siswa & Kunci Jawaban Lengkap 40 Kasus */}
        {activeTab === "teacher_mgmt" && userRole === "teacher" && (
          <TeacherSimulationView
            onSelectSimulatorToPlay={() => {
              setActiveTab("daily_life");
            }}
          />
        )}

        {/* 1. 40 Daily Life Simulators (10 Dekomposisi, 10 Pola, 10 Abstraksi, 10 Algoritma) */}
        {activeTab === "daily_life" && (
          <DailyLifeSimulatorEngine
            userRole={userRole}
            currentUser={currentUser}
            simConfig={simConfig}
          />
        )}

        {/* 2. Classical Virtual Lab Simulators (5 Games & Multi-Missions) */}
        {activeTab === "classic_sim" && (
          <div className="space-y-6">
            {/* Game Selection Grid - Uniform, Symmetric, White Background */}
            <div className="bg-white p-6 rounded-3xl border border-emerald-200/50 shadow-md">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-100">
                <Gamepad2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-black uppercase tracking-wider text-emerald-950">
                  Pilih Tantangan Lab Virtual Klasik:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setClassicGameTab("rover");
                  }}
                  className={`px-4 py-6 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                    classicGameTab === "rover"
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${classicGameTab === 'rover' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-indigo-500'}`}>
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-center">1. GRID ROVER</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setClassicGameTab("graph");
                  }}
                  className={`px-4 py-6 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                    classicGameTab === "graph"
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${classicGameTab === 'graph' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-emerald-500'}`}>
                    <Network className="w-6 h-6" />
                  </div>
                  <span className="text-center">2. TOPOLOGI GRAF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setClassicGameTab("sorting");
                  }}
                  className={`px-4 py-6 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                    classicGameTab === "sorting"
                      ? "bg-sky-50 border-sky-400 text-sky-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-sky-200 hover:bg-sky-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${classicGameTab === 'sorting' ? 'bg-sky-600 text-white' : 'bg-slate-50 text-sky-500'}`}>
                    <Brain className="w-6 h-6" />
                  </div>
                  <span className="text-center">3. SORTING</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setClassicGameTab("logic");
                  }}
                  className={`px-4 py-6 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                    classicGameTab === "logic"
                      ? "bg-purple-50 border-purple-400 text-purple-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-purple-200 hover:bg-purple-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${classicGameTab === 'logic' ? 'bg-purple-600 text-white' : 'bg-slate-50 text-purple-500'}`}>
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-center">4. GERBANG LOGIKA</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setClassicGameTab("flowchart");
                  }}
                  className={`px-4 py-6 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border-2 ${
                    classicGameTab === "flowchart"
                      ? "bg-teal-50 border-teal-400 text-teal-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-teal-200 hover:bg-teal-50/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${classicGameTab === 'flowchart' ? 'bg-teal-600 text-white' : 'bg-slate-50 text-teal-500'}`}>
                    <Boxes className="w-6 h-6" />
                  </div>
                  <span className="text-center">5. FLOWCHART</span>
                </button>
              </div>
            </div>

            {/* Render Active Game */}
            {classicGameTab === "rover" && (
              <GridRoverSimulator
                onSuccessScore={handleSimulatorScore}
                isTeacherMode={userRole === "teacher"}
              />
            )}
            {classicGameTab === "graph" && (
              <GraphAbstractionSimulator
                onSuccessScore={handleSimulatorScore}
                isTeacherMode={userRole === "teacher"}
              />
            )}
            {classicGameTab === "sorting" && (
              <SortingDecompositionSimulator
                onSuccessScore={handleSimulatorScore}
                isTeacherMode={userRole === "teacher"}
              />
            )}
            {classicGameTab === "logic" && (
              <LogicGatePatternSimulator
                onSuccessScore={handleSimulatorScore}
                isTeacherMode={userRole === "teacher"}
              />
            )}
            {classicGameTab === "flowchart" && (
              <FlowchartDecomposerSimulator
                onSuccessScore={handleSimulatorScore}
                isTeacherMode={userRole === "teacher"}
              />
            )}
          </div>
        )}

        {activeTab === "modul" && (
          <ModuleViewer
            level={currentLevel}
            onStartSimulator={() => setActiveTab("daily_life")}
            onStartQuiz={() => setActiveTab("kuis")}
          />
        )}

        {activeTab === "kuis" && (
          <QuizInteractive
            key={`quiz-${selectedLevelId}`}
            questions={currentLevel.quizQuestions}
            levelTitle={currentLevel.title}
            passingScore={currentLevel.passingScore}
            onFinishQuiz={handleQuizFinish}
            onOpenModule={() => setActiveTab("modul")}
            isTeacherMode={userRole === "teacher"}
          />
        )}

        {activeTab === "raport" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Laporan Evaluasi Pembelajaran
                </span>
                <h3 className="text-xl font-black text-emerald-950 mt-1">
                  Raport & Sertifikat Capaian Berpikir Komputasional
                </h3>
                <p className="text-xs text-emerald-700">
                  Akumulasi nilai simulator dan kuis materi Informatika Fase E (Kelas X SMA).
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrintRaport}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-emerald-600 font-medium block">Nama Siswa:</span>
                <span className="font-bold text-emerald-900 text-sm break-words whitespace-normal">
                  {currentUser?.name || "Siswa Kelas X SMA"}
                </span>
              </div>
              <div>
                <span className="text-emerald-600 font-medium block">NISN / Identitas:</span>
                <span className="font-bold text-emerald-900 text-sm">
                  {currentUser?.nisn || "3201XXXXXXXX"}
                </span>
              </div>
              <div>
                <span className="text-emerald-600 font-medium block">Kelas & Rombel:</span>
                <span className="font-bold text-emerald-900 text-sm">
                  {currentUser?.kelas || "Kelas X (Fase E)"}
                </span>
              </div>
            </div>

            {/* Level Score Breakdown Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Level Kesulitan</th>
                    <th className="p-4">Fokus Pilar BK</th>
                    <th className="p-4 text-center">Skor Simulator</th>
                    <th className="p-4 text-center">Skor Kuis</th>
                    <th className="p-4 text-center">Rata-Rata</th>
                    <th className="p-4 text-center">Bintang</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {SIMULATION_LEVELS.map((lvl) => {
                    const st = progress.scores[lvl.id];
                    const avg = Math.round((st.simScore + st.quizScore) / 2);
                    return (
                      <tr key={lvl.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-emerald-900">
                          {lvl.title}
                        </td>
                        <td className="p-4 text-slate-500">
                          {lvl.id === "pemula"
                            ? "Dekomposisi & Algoritma Dasar"
                            : lvl.id === "menengah"
                            ? "Abstraksi Graf & Perulangan"
                            : "Sorting & Binary Search"}
                        </td>
                        <td className="p-4 text-center font-bold text-emerald-700">
                          {st.simScore} / 100
                        </td>
                        <td className="p-4 text-center font-bold text-sky-700">
                          {st.quizScore} / 100
                        </td>
                        <td className="p-4 text-center font-black text-emerald-950 text-sm">
                          {avg}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map((s) => (
                              <Sparkles
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= st.stars ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              st.passed
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {st.passed ? "LULUS" : "BELUM LULUS"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Printable Certificate Box if passed all or user wants to preview */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-indigo-50/60 border-2 border-amber-300 shadow-md flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-lg shadow-amber-400/30">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-800 block">
                  Piagam Penghargaan Eksplorasi
                </span>
                <h4 className="text-2xl font-black text-emerald-950 mt-1 break-words whitespace-normal">
                  Master Berpikir Komputasional Fase E
                </h4>
                <p className="text-xs text-emerald-700 max-w-lg mt-1 break-words whitespace-normal">
                  Diberikan atas keberhasilan menyelesaikan simulasi permainan logika, pemecahan masalah algoritma,
                  dan kuis penguasaan 4 pilar computational thinking.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl border border-amber-200 flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block">Skor Kumulatif</span>
                  <b className="text-lg text-emerald-700 font-mono">{overallAverageScore} / 100</b>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block">Koleksi Bintang</span>
                  <b className="text-lg text-amber-500 font-mono">{totalStars} ★</b>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block">Predikat Capaian</span>
                  <b className="text-sm text-indigo-700">
                    {overallAverageScore >= 85 ? "Sangat Memuaskan (A)" : overallAverageScore >= 75 ? "Baik (B)" : "Cukup"}
                  </b>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
