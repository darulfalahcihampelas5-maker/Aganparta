import React, { useState } from "react";
import { motion } from "motion/react";
import {
  MessageCircle,
  X,
  Copy,
  CheckCircle2,
  Share2,
  Send,
  Sparkles,
} from "lucide-react";

interface ShareCbtExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  customToken?: string;
  customClasses?: string[];
}

export const ShareCbtExamModal: React.FC<ShareCbtExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  customToken,
  customClasses,
}) => {
  const [copied, setCopied] = useState(false);
  const [targetPhone, setTargetPhone] = useState("");

  if (!isOpen || !exam) return null;

  const effectiveToken = customToken || exam.token || "TOKEN";
  const effectiveClassesStr = customClasses && customClasses.length > 0
    ? customClasses.join(", ")
    : (exam.kelasRef || "Seluruh Kelas");

  const durationMin = exam.duration ? exam.duration / 60 : 60;
  const questionCount = exam.questions?.length || 0;
  const kkmVal = exam.kkm || 75;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://app.sman1cililin.sch.id";

  const draftMessage = `📢 *PEMBERITAHUAN UJIAN CBT ONLINE (SMAN 1 CILILIN)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 *Mata Pelajaran:* ${exam.subject || "Informatika"}
📝 *Judul Ujian:* ${exam.title}
🏫 *Kelas Sasaran:* Kelas ${effectiveClassesStr}
⏱️ *Durasi Waktu:* ${durationMin} Menit (${questionCount} Soal Pilihan Ganda)
🎯 *Nilai KKM:* ${kkmVal}

🔑 *KODE TOKEN UJIAN:*
👉 *${effectiveToken}* 👈

🌐 *Akses Portal Ujian CBT Siswa:*
${appUrl}

⚠️ *Petunjuk & Tata Tertib Pengerjaan Ujian:*
1. Buka link aplikasi di atas dan masuk menggunakan Akun/NISN Anda.
2. Masuk ke menu *Ujian CBT Online*.
3. Masukkan Kode Token *${effectiveToken}* di atas lalu klik *Mulai Ujian*.
4. *DILARANG* berpindah tab browser / membuka aplikasi lain selama ujian. Sistem anti-curang akan otomatis merekam pelanggaran layar dan mengirimkan notifikasi ke Guru!
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Junjung tinggi kejujuran dan semoga sukses!_`;

  const handleSendWa = () => {
    let waUrl = "";
    if (targetPhone.trim()) {
      const cleaned = targetPhone.replace(/[^0-9]/g, "");
      const finalPhone = cleaned.startsWith("0") ? "62" + cleaned.slice(1) : cleaned;
      waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(draftMessage)}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(draftMessage)}`;
    }
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border-2 border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                Bagikan Token & Info Ujian ke WhatsApp
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Grup WhatsApp Kelas / Siswa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-200/50 rounded-xl active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Token Highlight Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                Token Akses Ujian
              </span>
              <span className="text-2xl font-mono font-black text-emerald-950 tracking-widest">
                {effectiveToken}
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl">
              Kelas: {effectiveClassesStr}
            </span>
          </div>

          {/* Optional phone number */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block">
              Nomor WhatsApp Tujuan (Opsional):
            </label>
            <input
              type="text"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="Kosongkan untuk memilih grup/kontak di WhatsApp langsung"
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-5 py-3 text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
            />
            <span className="text-[10px] text-slate-400 font-medium block">
              *Jika dikosongkan, WhatsApp akan membuka daftar chat/grup sehingga Anda bebas memilih grup kelas yang diinginkan.
            </span>
          </div>

          {/* Draft Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Pratinjau Pesan Siap Kirim:
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(draftMessage);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin ke Clipboard!" : "Salin Format Pesan"}
              </button>
            </div>

            <div className="w-full bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text max-h-[220px] overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
              {draftMessage}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(draftMessage);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 cursor-pointer transition-all flex items-center gap-2"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin!" : "Salin Teks"}
          </button>

          <button
            type="button"
            onClick={handleSendWa}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            Buka & Kirim di WhatsApp
          </button>
        </div>
      </motion.div>
    </div>
  );
};
