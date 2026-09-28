import React, { useState } from 'react';
import { ComputationalThinkingSimulation } from './ComputationalThinkingSimulation';
import { GenericInformaticsSimulator, ComputerSystemSimulator, DataAnalysisSimulator, AlgoProgrammingSimulator } from './MiniSimulators';
import { BookOpen, Gamepad2, Settings, ArrowLeft, Brain, Cpu, BarChart, Code, Network } from "lucide-react";

interface SimulasiChapterMenuProps {
  userRole: "student" | "teacher";
  currentUser?: {
    name?: string;
    nisn?: string;
    kelas?: string;
  };
  onBackToDashboard?: () => void;
  simConfig?: any;
  children?: React.ReactNode;
}

export const SimulasiChapterMenu: React.FC<SimulasiChapterMenuProps> = ({ 
  userRole, 
  currentUser, 
  onBackToDashboard, 
  simConfig,
  children 
}) => {
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const chapters = [
    {
      id: "informatika_generik",
      title: "Informatika Dan Keterampilan Generik",
      description: "Pemahaman dasar informatika, kolaborasi, dan komunikasi digital.",
      icon: Network,
      color: "bg-blue-500",
      isReady: true
    },
    {
      id: "berpikir_komputasional",
      title: "Berpikir Komputasional",
      description: "Dekomposisi, pengenalan pola, abstraksi, dan algoritma.",
      icon: Brain,
      color: "bg-purple-500",
      isReady: true
    },
    {
      id: "sistem_komputer",
      title: "Sistem Komputer",
      description: "Perangkat keras, perangkat lunak, dan interaksi di dalamnya.",
      icon: Cpu,
      color: "bg-emerald-500",
      isReady: true
    },
    {
      id: "analisis_data",
      title: "Analisis Data",
      description: "Pengumpulan, pengolahan, dan visualisasi data.",
      icon: BarChart,
      color: "bg-orange-500",
      isReady: true
    },
    {
      id: "algoritma_pemrograman",
      title: "Algoritma dan Pemrograman",
      description: "Konsep dasar pemrograman dan alur logika.",
      icon: Code,
      color: "bg-rose-500",
      isReady: true
    }
  ];

  if (selectedChapter === "berpikir_komputasional") {
    return (
      <ComputationalThinkingSimulation 
        userRole={userRole} 
        currentUser={currentUser} 
        simConfig={simConfig}
        onBackToDashboard={() => setSelectedChapter(null)} 
      />
    );
  }
  if (selectedChapter === "informatika_generik") {
    return <GenericInformaticsSimulator onBack={() => setSelectedChapter(null)} />;
  }
  if (selectedChapter === "sistem_komputer") {
    return <ComputerSystemSimulator onBack={() => setSelectedChapter(null)} />;
  }
  if (selectedChapter === "analisis_data") {
    return <DataAnalysisSimulator onBack={() => setSelectedChapter(null)} />;
  }
  if (selectedChapter === "algoritma_pemrograman") {
    return <AlgoProgrammingSimulator onBack={() => setSelectedChapter(null)} />;
  }

  const availableChapters = chapters.filter(chapter => {
    if (userRole === "teacher") return true;
    if (chapter.id === "berpikir_komputasional") {
      return ["dekomposisi", "pola", "abstraksi", "algoritma", "classic_sim", "modul_kuis"].some(id => 
        simConfig?.chapters?.includes(id)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {children}
      
      <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-5 border-b border-slate-100">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl w-fit shadow-sm border border-emerald-100">
               <Brain className="w-7 h-7" />
            </div>
            <div>
               <h2 className="text-xl font-black text-emerald-950 uppercase tracking-wider leading-tight break-words whitespace-normal">
                  Simulator Berpikir Komputasional
               </h2>
               <p className="text-sm font-medium text-emerald-700 mt-1">
                  Laboratorium virtual mandiri untuk melatih logika dan pilar BK.
               </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {availableChapters.map(chapter => (
               <button
                 key={chapter.id}
                 onClick={() => setSelectedChapter(chapter.id)}
                 className="relative overflow-hidden group p-6 bg-white border border-slate-200 rounded-3xl hover:border-[#85cc00]/50 hover:shadow-xl hover:shadow-[#85cc00]/5 transition-all text-left flex flex-col cursor-pointer min-h-[220px]"
               >
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-5 transition-transform group-hover:scale-150 ${chapter.color}`}></div>
                  
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${chapter.color} shadow-${chapter.color.split('-')[1]}-500/20`}>
                       <chapter.icon className="w-7 h-7" />
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                        chapter.isReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                     }`}>
                        {chapter.isReady ? 'Tersedia' : 'Segera'}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-black text-emerald-950 uppercase tracking-tight mb-2 group-hover:text-[#85cc00] transition-colors break-words whitespace-normal">
                     {chapter.title}
                  </h3>
                  
                  <p className="text-xs font-medium text-emerald-700 leading-relaxed mb-4 line-clamp-3 break-words">
                     {chapter.description}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 group-hover:text-[#85cc00] transition-colors flex items-center gap-1.5 uppercase tracking-widest">
                        MULAI SEKARANG <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                     </span>
                  </div>
               </button>
            ))}
          </div>
      </div>
    </div>
  );
}
