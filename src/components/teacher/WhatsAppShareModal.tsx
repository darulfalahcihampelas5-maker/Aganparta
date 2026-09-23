import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, X } from "lucide-react";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  waStudent: any;
  waDraftMessage: string;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  waStudent,
  waDraftMessage,
  onClose,
}) => {
  const [waParentPhone, setWaParentPhone] = useState(waStudent?.parentPhone || "");
  const [copiedIndex, setCopiedIndex] = useState(false);

  if (!isOpen || !waStudent) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/80 bg-white/95 p-4 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border-2 border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">Kirim Laporan via WhatsApp</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Orang Tua / Wali Murid</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-all p-2 hover:bg-slate-150 rounded-xl active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Siswa</label>
              <p className="font-bold text-sm text-slate-900">{waStudent.displayName || waStudent.studentName}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">NIS / Kelas</label>
              <p className="font-bold text-sm text-slate-900">{waStudent.nisn} (Kl. {waStudent.kelas || "-"})</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block ml-1">Nomor WA Orang Tua</label>
            <input
              type="text"
              value={waParentPhone}
              onChange={(e) => setWaParentPhone(e.target.value)}
              placeholder="Contoh: 628123456789"
              className="w-full bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold tracking-wider text-slate-900 outline-none transition-all placeholder:text-slate-400"
            />
            <span className="text-[10px] text-slate-400 font-bold block ml-1 leading-relaxed">
              *Gunakan kode negara di awal (misal *62* untuk Indonesia, jangan gunakan spasi atau tanda hubung).
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block ml-1">Preview Memo Laporan</label>
            <div className="w-full bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-emerald-950 whitespace-pre-wrap select-text max-h-[220px] overflow-y-auto custom-scrollbar shadow-inner">
              {waDraftMessage}
            </div>
          </div>
        </div>

        {/* Sticky Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 shrink-0">
          <button
            onClick={() => {
              navigator.clipboard.writeText(waDraftMessage);
              setCopiedIndex(true);
              setTimeout(() => setCopiedIndex(false), 2000);
            }}
            className={`flex-1 py-4 text-center rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all outline-none border cursor-pointer ${
              copiedIndex
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            {copiedIndex ? "Tersalin!" : "Salin Teks"}
          </button>
          <button
            onClick={() => {
              const cleanedPhone = waParentPhone.replace(/[^0-9]/g, "");
              const finalPhone = cleanedPhone.startsWith("0")
                ? "62" + cleanedPhone.slice(1)
                : cleanedPhone;

              const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(waDraftMessage)}`;
              window.open(waUrl, "_blank", "noopener,noreferrer");
            }}
            className="flex-1 py-4 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all text-center rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            Kirim via WhatsApp
          </button>
        </div>
      </motion.div>
    </div>
  );
};
