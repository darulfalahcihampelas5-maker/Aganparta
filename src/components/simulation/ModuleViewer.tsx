import React, { useState } from "react";
import {
  BookOpen,
  Boxes,
  Sparkles,
  Filter,
  Code2,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  School,
  Play,
  HelpCircle,
} from "lucide-react";
import { MaterialSection, LevelConfig } from "./simulationData";
import { sound } from "./soundEffects";

interface ModuleViewerProps {
  level: LevelConfig;
  onStartSimulator: () => void;
  onStartQuiz: () => void;
}

export const ModuleViewer: React.FC<ModuleViewerProps> = ({
  level,
  onStartSimulator,
  onStartQuiz,
}) => {
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const section = level.modules[activeSectionIdx] || level.modules[0];

  const getPillarBadge = (pillar: string) => {
    switch (pillar) {
      case "dekomposisi":
        return {
          icon: Boxes,
          label: "Dekomposisi",
          style: "bg-emerald-100 text-emerald-800 border-emerald-300",
        };
      case "pola":
        return {
          icon: Sparkles,
          label: "Pengenalan Pola",
          style: "bg-sky-100 text-sky-800 border-sky-300",
        };
      case "abstraksi":
        return {
          icon: Filter,
          label: "Abstraksi",
          style: "bg-amber-100 text-amber-800 border-amber-300",
        };
      default:
        return {
          icon: Code2,
          label: "Algoritma",
          style: "bg-indigo-100 text-indigo-800 border-indigo-300",
        };
    }
  };

  const badgeInfo = getPillarBadge(section.pillar);
  const PillarIcon = badgeInfo.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Module Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
              Modul Materi Pembelajaran
            </span>
            <span className="text-xs text-slate-300">{level.difficultyBadge}</span>
          </div>
          <h2 className="text-xl font-black text-white">{level.title}</h2>
          <p className="text-xs text-slate-300 mt-0.5">{level.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onStartSimulator();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Buka Simulator</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onStartQuiz();
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-600/20 active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Mulai Kuis</span>
          </button>
        </div>
      </div>

      {/* Module Body: Navigation sidebar + content panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
        {/* Left Navigation: Sub-topics */}
        <div className="md:col-span-4 p-4 border-r border-slate-200 bg-slate-50/70 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-2">
            Daftar Topik Modul
          </span>
          {level.modules.map((m, idx) => {
            const isCurrent = idx === activeSectionIdx;
            const b = getPillarBadge(m.pillar);
            const Icon = b.icon;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveSectionIdx(idx);
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                  isCurrent
                    ? "bg-white border-indigo-300 text-slate-900 shadow-md shadow-indigo-100"
                    : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isCurrent ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block truncate">
                    Bagian {idx + 1}
                  </span>
                  <h4 className="text-xs font-black truncate">{m.title}</h4>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isCurrent ? "text-indigo-600 translate-x-1" : "text-slate-300"
                  }`}
                />
              </button>
            );
          })}

          {/* Target Goals Box */}
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-2">
              🎯 Capaian Pembelajaran (CP):
            </span>
            <ul className="space-y-1.5 text-xs text-indigo-950">
              {level.targetGoals.map((g, gi) => (
                <li key={gi} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Topic Pillar badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badgeInfo.style}`}
              >
                <PillarIcon className="w-3.5 h-3.5" />
                <span>{badgeInfo.label}</span>
              </span>
              <span className="text-xs text-slate-400">Informatika Fase E (Kelas X)</span>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
              {section.title}
            </h3>

            {/* Core Theory Paragraph */}
            <div className="prose prose-slate max-w-none text-xs md:text-sm text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <p>{section.content}</p>
            </div>

            {/* Daily & SMA Context Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Contoh Dunia Komputasi</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900">{section.example}</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                  <School className="w-4 h-4 text-emerald-600" />
                  <span>Konteks Siswa Kelas X SMA</span>
                </div>
                <p className="text-xs leading-relaxed text-emerald-900">{section.smaContext}</p>
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Intisari Berpikir Komputasional:</span>
              </span>
              <ul className="space-y-1 text-xs text-slate-200">
                {section.keyTakeaways.map((point, pi) => (
                  <li key={pi} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-black">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Next/Simulator Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Topik {activeSectionIdx + 1} dari {level.modules.length}
            </span>

            <div className="flex items-center gap-2">
              {activeSectionIdx < level.modules.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    sound.playStep();
                    setActiveSectionIdx((prev) => prev + 1);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Topik Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    onStartSimulator();
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Praktikkan di Simulator</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
