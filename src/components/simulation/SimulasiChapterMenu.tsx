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
  children?: React.ReactNode;
}

export const SimulasiChapterMenu: React.FC<SimulasiChapterMenuProps> = ({ userRole, currentUser, onBackToDashboard, children }) => {
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
    return <ComputationalThinkingSimulation userRole={userRole} currentUser={currentUser} onBackToDashboard={() => setSelectedChapter(null)} />;
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

  return (
    <div className="space-y-6">
      {children}
      
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
         <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-indigo-50 rounded-xl">
               <Gamepad2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
               <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                  Menu Simulasi Interaktif
               </h2>
               <p className="text-sm font-medium text-slate-500">
                  Pilih bab pembelajaran untuk memulai simulasi.
               </p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chapters.map(chapter => (
               <button
                 key={chapter.id}
                 onClick={() => setSelectedChapter(chapter.id)}
                 className="relative overflow-hidden group p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all text-left flex flex-col cursor-pointer"
               >
                  <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-150 ${chapter.color}`}></div>
                  
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white shadow-sm ${chapter.color}`}>
                     <chapter.icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">
                     {chapter.title}
                  </h3>
                  
                  <p className="text-xs font-medium text-slate-500 leading-relaxed flex-1 mb-4">
                     {chapter.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                     <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        chapter.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                     }`}>
                        {chapter.isReady ? 'Tersedia' : 'Segera Hadir'}
                     </span>
                     <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                        Mulai <ArrowLeft className="w-3 h-3 rotate-180" />
                     </span>
                  </div>
               </button>
            ))}
         </div>
      </div>
    </div>
  );
}
