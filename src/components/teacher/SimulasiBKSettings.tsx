import React, { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
  Settings, 
  Check, 
  Lock, 
  Unlock, 
  Users, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Boxes,
  Sparkles,
  Filter,
  Code2,
  Gamepad2,
  BookOpen,
  HelpCircle
} from "lucide-react";

interface SimulasiBKSettingsProps {
  classesList: any[];
}

interface ClassConfig {
  active: boolean;
  chapters: string[]; // ids of active chapters/pillars
}

const AVAILABLE_CHAPTERS = [
  { id: "dekomposisi", name: "Pilar 1: Dekomposisi", icon: Boxes, color: "text-emerald-600" },
  { id: "pola", name: "Pilar 2: Pengenalan Pola", icon: Sparkles, color: "text-sky-600" },
  { id: "abstraksi", name: "Pilar 3: Abstraksi", icon: Filter, color: "text-amber-600" },
  { id: "algoritma", name: "Pilar 4: Algoritma", icon: Code2, color: "text-indigo-600" },
  { id: "classic_sim", name: "Lab Virtual Klasik", icon: Gamepad2, color: "text-purple-600" },
  { id: "modul_kuis", name: "Modul & Kuis", icon: BookOpen, color: "text-rose-600" },
];

export const SimulasiBKSettings: React.FC<SimulasiBKSettingsProps> = ({ classesList }) => {
  const [classConfigs, setClassConfigs] = useState<Record<string, ClassConfig>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, "config", "simulasiBK");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Support old format (activeClasses array) for backward compatibility during migration
        if (data.activeClasses && !data.classConfigs) {
          const initialConfigs: Record<string, ClassConfig> = {};
          data.activeClasses.forEach((className: string) => {
            initialConfigs[className] = {
              active: true,
              chapters: AVAILABLE_CHAPTERS.map(c => c.id)
            };
          });
          setClassConfigs(initialConfigs);
        } else {
          setClassConfigs(data.classConfigs || {});
        }
      } else {
        setClassConfigs({});
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch simulasiBK config", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleClass = (className: string) => {
    setClassConfigs((prev) => {
      const current = prev[className] || { active: false, chapters: AVAILABLE_CHAPTERS.map(c => c.id) };
      return {
        ...prev,
        [className]: {
          ...current,
          active: !current.active
        }
      };
    });
  };

  const toggleChapter = (className: string, chapterId: string) => {
    setClassConfigs((prev) => {
      const current = prev[className] || { active: true, chapters: AVAILABLE_CHAPTERS.map(c => c.id) };
      const newChapters = current.chapters.includes(chapterId)
        ? current.chapters.filter(id => id !== chapterId)
        : [...current.chapters, chapterId];
      
      return {
        ...prev,
        [className]: {
          ...current,
          chapters: newChapters
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      // Clean up configs: only save classes that exist in classesList
      const filteredConfigs: Record<string, ClassConfig> = {};
      classesList.forEach(cls => {
        if (classConfigs[cls.name]) {
          filteredConfigs[cls.name] = classConfigs[cls.name];
        }
      });

      // Also keep a flat list of active class names for easier querying in the app
      const activeClasses = Object.entries(filteredConfigs)
        .filter(([_, conf]) => conf.active)
        .map(([name, _]) => name);

      await setDoc(doc(db, "config", "simulasiBK"), { 
        classConfigs: filteredConfigs,
        activeClasses,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSaveMessage("Pengaturan akses berhasil disimpan!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save simulasiBK config", err);
      setSaveMessage("Gagal menyimpan pengaturan. Periksa koneksi internet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-500" />
            Pengaturan Akses Menu Simulasi
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Atur kelas dan <b>Bab/Pilar</b> mana saja yang aktif di menu Simulasi Siswa.
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
        >
          {isSaving ? "Menyimpan..." : (
            <>
              <Check className="w-4 h-4" />
              SIMPAN PENGATURAN
            </>
          )}
        </button>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${saveMessage.includes("Gagal") ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          <AlertCircle className="w-4 h-4" />
          {saveMessage}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="bg-slate-100 h-10 rounded-xl w-full"></div>
          <div className="bg-slate-100 h-10 rounded-xl w-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Daftar Kelas & Konfigurasi Bab
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {classesList.map((cls) => {
              const config = classConfigs[cls.name] || { active: false, chapters: AVAILABLE_CHAPTERS.map(c => c.id) };
              const isActive = config.active;
              const isExpanded = expandedClass === cls.name;

              return (
                <div 
                  key={cls.id || cls.name}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isActive 
                      ? "border-emerald-200 bg-emerald-50/30" 
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleClass(cls.name)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                          isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                          isActive ? "translate-x-6" : ""
                        }`} />
                      </button>
                      
                      <div>
                        <span className={`text-sm font-black block ${isActive ? "text-emerald-900" : "text-slate-600"}`}>
                          {cls.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {isActive ? `${config.chapters.length} Bab Aktif` : "Seluruh Menu Simulasi Terkunci"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedClass(isExpanded ? null : cls.name)}
                        disabled={!isActive}
                        className={`p-2 rounded-lg transition-all ${
                          !isActive 
                            ? "text-slate-300 cursor-not-allowed" 
                            : "text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                        }`}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {isActive && isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-emerald-100 animate-in slide-in-from-top-2 duration-200">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-3">
                        Pilih Bab/Menu yang ingin diaktifkan untuk {cls.name}:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {AVAILABLE_CHAPTERS.map((chap) => {
                          const isChapActive = config.chapters.includes(chap.id);
                          const Icon = chap.icon;
                          return (
                            <button
                              key={chap.id}
                              type="button"
                              onClick={() => toggleChapter(cls.name, chap.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                                isChapActive
                                  ? "bg-white border-emerald-400 shadow-sm ring-1 ring-emerald-400/20"
                                  : "bg-slate-100/50 border-slate-200 opacity-60 grayscale"
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg ${isChapActive ? chap.color + " bg-slate-50" : "text-slate-400"}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-bold block truncate ${isChapActive ? "text-slate-900" : "text-slate-500"}`}>
                                  {chap.name}
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                isChapActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                              }`}>
                                {isChapActive && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {classesList.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                Belum ada data kelas yang terdaftar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
