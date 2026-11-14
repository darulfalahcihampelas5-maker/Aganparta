import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface ZoomPhotoModalProps {
  zoomedPhotoUrl: string | null;
  zoomedStudentName: string;
  onClose: () => void;
}

export const ZoomPhotoModal: React.FC<ZoomPhotoModalProps> = ({
  zoomedPhotoUrl,
  zoomedStudentName,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl max-w-3xl max-h-[95vh] flex flex-col border border-slate-200/80 ring-1 ring-slate-900/5"
          >
            {/* Header */}
            <div className="bg-slate-50/80 px-6 py-4 flex justify-center items-center border-b border-slate-200/70 shrink-0">
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider text-center truncate">
                {zoomedStudentName}
              </span>
            </div>

            {/* Content with natural image sizing */}
            <div className="p-6 overflow-auto flex items-center justify-center bg-slate-100/40 max-h-[calc(95vh-140px)]">
              <img
                loading="lazy"
                src={zoomedPhotoUrl}
                alt={zoomedStudentName}
                className="max-w-full max-h-[60vh] rounded-2xl object-contain shadow-lg border border-slate-200"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes("thumbnail")) {
                    const idMatch = zoomedPhotoUrl.match(/[-\w]{25,}/);
                    if (idMatch) {
                      target.src = `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
                    }
                  }
                }}
              />
            </div>

            {/* Footer */}
            <div className="bg-slate-50/80 px-6 py-4 flex justify-center items-center border-t border-slate-200/70 shrink-0">
              <button
                onClick={onClose}
                className="bg-rose-500 hover:bg-rose-600 text-white transition-all px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer shadow-md shadow-rose-500/20 active:scale-95 font-sans"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
