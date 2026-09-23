import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Gamepad2, Settings, Check, Lock, Unlock, Users, AlertCircle } from "lucide-react";

interface SimulasiBKSettingsProps {
  classesList: any[];
}

export const SimulasiBKSettings: React.FC<SimulasiBKSettingsProps> = ({ classesList }) => {
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const docRef = doc(db, "config", "simulasiBK");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setActiveClasses(snap.data().activeClasses || []);
      } else {
        setActiveClasses([]);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch simulasiBK config", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleClass = (className: string) => {
    setActiveClasses((prev) => 
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      await setDoc(doc(db, "config", "simulasiBK"), { activeClasses });
      setSaveMessage("Pengaturan akses berhasil disimpan!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save simulasiBK config", err);
      setSaveMessage("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAll = () => {
    if (activeClasses.length === classesList.length) {
      setActiveClasses([]);
    } else {
      setActiveClasses(classesList.map(c => c.name));
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
            Pilih kelas mana saja yang diizinkan untuk melihat dan mengakses menu <b>Simulasi</b> di Dasbor Siswa.
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
        >
          {isSaving ? "Menyimpan..." : (
            <>
              <Check className="w-4 h-4" />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${saveMessage.includes("Gagal") ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          <AlertCircle className="w-4 h-4" />
          {saveMessage}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse bg-slate-100 h-24 rounded-2xl w-full"></div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Daftar Kelas ({activeClasses.length}/{classesList.length} Aktif)
            </span>
            <button 
              type="button" 
              onClick={toggleAll}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {activeClasses.length === classesList.length ? "Nonaktifkan Semua" : "Aktifkan Semua"}
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {classesList.map((cls) => {
              const isActive = activeClasses.includes(cls.name);
              return (
                <button
                  key={cls.id || cls.name}
                  type="button"
                  onClick={() => toggleClass(cls.name)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                    isActive 
                      ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${isActive ? "text-emerald-900" : "text-slate-600"}`}>
                      {cls.name}
                    </span>
                    {isActive ? (
                      <Unlock className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit ${
                    isActive ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-500"
                  }`}>
                    {isActive ? "AKTIF" : "NONAKTIF"}
                  </span>
                </button>
              );
            })}
            
            {classesList.length === 0 && (
              <div className="col-span-full p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Belum ada data kelas yang terdaftar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
