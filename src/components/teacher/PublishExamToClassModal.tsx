import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Share2,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle2,
  Users,
  MessageCircle,
  KeyRound,
  ArrowRight,
} from "lucide-react";

interface PublishExamToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  classesList: any[];
  publishOtherClasses: string[];
  setPublishOtherClasses: React.Dispatch<React.SetStateAction<string[]>>;
  newPublishToken: string;
  setNewPublishToken: (token: string) => void;
  isSavingDuplicateExam: boolean;
  onPublish: () => void;
  onOpenWhatsAppShare?: (exam: any, customToken?: string, targetClasses?: string[]) => void;
}

export const PublishExamToClassModal: React.FC<PublishExamToClassModalProps> = ({
  isOpen,
  onClose,
  exam,
  classesList,
  publishOtherClasses,
  setPublishOtherClasses,
  newPublishToken,
  setNewPublishToken,
  isSavingDuplicateExam,
  onPublish,
  onOpenWhatsAppShare,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen || !exam) return null;

  const generateRandomToken = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const isAllSelected =
    publishOtherClasses.includes("SEMUA_KELAS") ||
    (classesList.length > 0 && publishOtherClasses.length === classesList.length);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setPublishOtherClasses(["SEMUA_KELAS", ...classesList.map((c) => c.name)]);
    } else {
      setPublishOtherClasses([]);
    }
  };

  const toggleClass = (clsName: string, checked: boolean) => {
    let updated: string[];
    if (checked) {
      const filtered = publishOtherClasses.filter((c) => c !== "SEMUA_KELAS");
      updated = [...filtered, clsName];
      if (classesList.length > 0 && updated.length === classesList.length) {
        updated = ["SEMUA_KELAS", ...updated];
      }
    } else {
      updated = publishOtherClasses.filter((c) => c !== clsName && c !== "SEMUA_KELAS");
    }
    setPublishOtherClasses(updated);
  };

  const effectiveClasses = publishOtherClasses.filter((c) => c !== "SEMUA_KELAS");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border-2 border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 flex justify-between items-center border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#85cc00]/15 text-[#85cc00] border border-[#85cc00]/30 rounded-2xl">
              <Share2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                Terbitkan ke Kelas Lain / Tambah Kelas Sasaran
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Ujian CBT Online • {exam.subject || "Informatika"}
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
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Exam Summary Banner */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#85cc00] bg-[#85cc00]/10 px-2 py-0.5 rounded-md">
                  {exam.subject}
                </span>
                <h4 className="font-display font-black text-slate-900 text-base mt-1">
                  {exam.title}
                </h4>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-slate-500 block">
                  {exam.questions?.length || 0} Soal • {exam.duration ? exam.duration / 60 : 0} Menit
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  KKM: {exam.kkm || 75}
                </span>
              </div>
            </div>
            {exam.kelasRef && (
              <p className="text-xs text-slate-500 font-medium">
                Kelas saat ini: <strong className="text-slate-800">{exam.kelasRef}</strong> (Token: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-mono font-bold">{exam.token}</code>)
              </p>
            )}
          </div>

          {/* Target Classes Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#85cc00]" />
                1. Pilih Kelas Target Tambahan (Checkbox)
              </label>
              <span className="text-xs font-bold text-[#85cc00]">
                {effectiveClasses.length} Kelas Dipilih
              </span>
            </div>

            <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-3">
                <input
                  id="pub-exam-all"
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                />
                <label
                  htmlFor="pub-exam-all"
                  className="text-sm font-black text-slate-900 cursor-pointer select-none"
                >
                  Pilih Semua Kelas
                </label>
              </div>

              <div className="h-[1px] bg-slate-200" />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {classesList.map((cls, idx) => {
                  const isChecked =
                    publishOtherClasses.includes(cls.name) ||
                    publishOtherClasses.includes("SEMUA_KELAS");
                  return (
                    <div
                      key={`pub-cls-${cls.id || cls.name || idx}-${idx}`}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-white border-[#85cc00] shadow-sm text-slate-900"
                          : "bg-transparent border-slate-200 hover:bg-white text-slate-600"
                      }`}
                      onClick={() => toggleClass(cls.name, !isChecked)}
                    >
                      <input
                        id={`pub-chk-cls-${cls.id || idx}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleClass(cls.name, e.target.checked);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#85cc00] focus:ring-[#85cc00] cursor-pointer"
                      />
                      <label
                        htmlFor={`pub-chk-cls-${cls.id || idx}`}
                        className="text-xs font-bold cursor-pointer select-none truncate"
                      >
                        Kelas {cls.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Token Access Config */}
          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#85cc00]" />
              2. Token Akses Ujian Baru untuk Kelas Terpilih
            </label>

            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-700">Kode Token Siswa</div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Siswa di kelas terpilih harus memasukkan token ini sebelum dapat mulai mengerjakan ujian.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={newPublishToken}
                    onChange={(e) => setNewPublishToken(e.target.value.toUpperCase())}
                    className="w-36 text-center text-xl font-mono font-black tracking-widest border-2 border-slate-900 rounded-xl bg-slate-950 text-[#85cc00] py-2.5 uppercase outline-none focus:border-[#85cc00] transition-all pr-10"
                    placeholder="TOKEN"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPublishToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="absolute right-2 p-1 text-slate-400 hover:text-[#85cc00] transition-colors cursor-pointer"
                    title="Salin Token"
                  >
                    {copiedToken ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setNewPublishToken(generateRandomToken())}
                  className="p-3 border-2 border-slate-900 bg-white rounded-xl text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 shadow-sm active:scale-95"
                  title="Acak Token Baru"
                >
                  <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Share to WhatsApp Preview */}
          {onOpenWhatsAppShare && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-emerald-950">
                    Bagikan Token ke WhatsApp Grup Kelas
                  </h5>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Kirim pesan pengumuman ujian & token langsung ke grup WhatsApp siswa/wali.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetClassesList = effectiveClasses.length > 0 ? effectiveClasses : classesList.map(c => c.name);
                  onOpenWhatsAppShare(exam, newPublishToken, targetClassesList);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                Bagikan WA
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200/60 transition-all border border-slate-200 cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={isSavingDuplicateExam || effectiveClasses.length === 0 || !newPublishToken.trim()}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#85cc00] hover:bg-[#74b300] active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#85cc00]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSavingDuplicateExam ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Menerbitkan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                Terbitkan ke {effectiveClasses.length} Kelas Terpilih
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
