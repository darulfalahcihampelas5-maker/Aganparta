import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Scale,
  X,
  Lock,
} from "lucide-react";

interface EtikaDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  isMandatoryFirstTime?: boolean;
}

export const EtikaDigitalModal: React.FC<EtikaDigitalModalProps> = ({
  isOpen,
  onClose,
  studentName = "Siswa",
  isMandatoryFirstTime = false,
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleConfirm = () => {
    try {
      const storageKey = `sipinter_etika_accepted_${encodeURIComponent(studentName.trim().toLowerCase())}`;
      localStorage.setItem(storageKey, "true");
      // Fallback global key in case studentName is empty or dynamic
      localStorage.setItem("sipinter_etika_accepted_global", "true");
    } catch {
      // Ignore localStorage exceptions in restrictive sandbox
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => {
              if (!isMandatoryFirstTime) onClose();
            }}
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5 max-h-[92vh]"
          >
            {/* Header banner */}
            <div className="shrink-0 px-6 py-5 bg-gradient-to-r from-[#075e54] via-[#0b6b5f] to-[#0f766e] text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-emerald-200 shadow-sm border border-white/20">
                    <ShieldCheck className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
                      Etika Digital & Adab Chat Si Pinter
                    </h3>
                    <p className="text-xs text-emerald-100/90 font-medium">
                      Aturan Interaksi Resmi Siswa SMAN 1 Cililin
                    </p>
                  </div>
                </div>

                {!isMandatoryFirstTime && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar text-slate-700 text-sm">
              <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-bold">Halo, {studentName}!</span> Si Pinter adalah asisten cerdas resmi mata pelajaran Informatika. Demi terciptanya lingkungan belajar yang sehat, aman, dan bermartabat, setiap siswa wajib mematuhi aturan etika digital berikut.
                </div>
              </div>

              {/* 4 Core Rules */}
              <div className="space-y-3">
                {/* Rule 1: Kesantunan Bahasa */}
                <div className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        1. Gunakan Bahasa Sopan & Beradab
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Tanyakan materi atau panduan menggunakan bahasa Indonesia yang santun. Dilarang keras mengetik kata-kata kotor, makian, celaan, penghinaan, atau konten tidak pantas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rule 2: Fokus Akademik */}
                <div className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-100/70 text-sky-800 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        2. Fokus Pada Pembelajaran Informatika
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Manfaatkan asisten untuk mendalami materi Informatika Kelas X (Berpikir Komputasional, Algoritma, Jaringan, DPK) serta panduan tugas dan penggunaan Si-Pinter App.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rule 3: Sistem Filter Teks Real-Time */}
                <div className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        3. Pengawasan Filter Sensor Otomatis
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Chat Si Pinter diawasi sistem filter kata terlarang. Pesan bernada kasar tidak akan dijawab oleh AI dan sistem langsung mengeluarkan teguran etika digital.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rule 4: Konsekuensi & Pelaporan */}
                <div className="p-3.5 bg-rose-50/60 hover:bg-rose-50 rounded-2xl border border-rose-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                        <span>4. Pencatatan Server & Terusan ke Pak Agan & Kesiswaan</span>
                      </h4>
                      <p className="text-xs text-rose-800/90 leading-relaxed font-medium">
                        Setiap kata terlarang yang terdeteksi otomatis tersimpan dalam database server dan diteruskan secara berkala kepada <strong>Pak Agan (Guru Mapel)</strong> serta pihak <strong>Kesiswaan SMAN 1 Cililin</strong> sebagai catatan pelanggaran tata tertib sekolah.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox agreement */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 bg-slate-100/80 hover:bg-slate-100 rounded-2xl cursor-pointer select-none transition-colors border border-slate-200">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => setHasAgreed(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-[#075e54]"
                  />
                  <span className="text-xs font-semibold text-slate-800 leading-snug">
                    Saya telah membaca, memahami, dan berikrar untuk senantiasa menjaga kesantunan serta mematuhi aturan etika digital dalam berinteraksi dengan Si Pinter.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Kedisiplinan mencerminkan integritas siswa.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isMandatoryFirstTime && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasAgreed && isMandatoryFirstTime}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    hasAgreed || !isMandatoryFirstTime
                      ? "bg-gradient-to-r from-[#075e54] to-[#0f766e] text-white hover:brightness-110 active:scale-95 shadow-[#075e54]/25"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Saya Mengerti & Siap Mematuhi</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
