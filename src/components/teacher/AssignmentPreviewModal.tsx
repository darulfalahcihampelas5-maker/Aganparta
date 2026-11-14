import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  FileText, 
  Calendar, 
  Users, 
  ExternalLink, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface AssignmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  onToggleComplete?: (id: string, currentStatus: boolean) => void;
}

export const AssignmentPreviewModal: React.FC<AssignmentPreviewModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onToggleComplete
}) => {
  const getStatusInfo = () => {
    if (!assignment) {
      return { text: "Aktif", color: "bg-blue-50 text-blue-600 border-blue-100", icon: AlertCircle };
    }
    if (assignment.isCompleted) {
      return { text: "Selesai", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 };
    }
    const now = new Date();
    const deadlines = assignment.targets?.map((t: any) => new Date(t.deadline)) || [];
    const allExpired = deadlines.length > 0 && deadlines.every((d: Date) => d <= now);
    
    if (allExpired) {
      return { text: "Kedaluwarsa", color: "bg-rose-50 text-rose-600 border-rose-100", icon: Clock };
    }
    return { text: "Aktif", color: "bg-blue-50 text-blue-600 border-blue-100", icon: AlertCircle };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <AnimatePresence>
      {isOpen && assignment && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-200/70 flex items-center justify-between sticky top-0 bg-slate-50/80 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#85cc00] border border-slate-100 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-2">
                    Pratinjau Tugas
                  </h3>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.text}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* Title & Bab */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Materi & Bab</span>
                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{assignment.materi}</h2>
                <p className="text-sm font-bold text-[#85cc00] uppercase tracking-tighter">{assignment.bab}</p>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Instruksi Tugas</span>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {assignment.description || "Tidak ada deskripsi instruksi."}
                </p>
              </div>

              {/* Targets Table */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Target Kelas & Tenggat Waktu</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {assignment.targets?.map((tgt: any, idx: number) => (
                    <div key={`preview-tgt-${idx}`} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-700">Kelas {tgt.kelas}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase justify-end mb-1">
                          <Clock className="w-3 h-3" />
                          Deadline
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {tgt.deadline ? new Date(tgt.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link */}
              {(assignment.taskLink || assignment.linkTugas || assignment.fileUrl) && (
                <div className="pt-4">
                  <a
                    href={(assignment.taskLink || assignment.linkTugas || assignment.fileUrl).startsWith("http") ? (assignment.taskLink || assignment.linkTugas || assignment.fileUrl) : `https://${assignment.taskLink || assignment.linkTugas || assignment.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Buka Berkas / Link Tugas
                  </a>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-sm"
              >
                Tutup
              </button>
              {onToggleComplete && (
                <button
                  onClick={() => onToggleComplete(assignment.id, !!assignment.isCompleted)}
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all text-sm shadow-lg ${
                    assignment.isCompleted 
                      ? "bg-amber-500 text-white shadow-amber-200" 
                      : "bg-[#85cc00] text-slate-900 shadow-[#85cc00]/20"
                  }`}
                >
                  {assignment.isCompleted ? "Tandai Belum Selesai" : "Tandai Sudah Selesai"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
