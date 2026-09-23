import React from "react";
import { motion } from "motion/react";

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
  if (!zoomedPhotoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 bg-white/95 p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-3xl max-h-[95vh] flex flex-col border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 flex justify-center items-center border-b border-slate-100 shrink-0">
          <span className="text-sm font-black text-slate-800 uppercase tracking-wider text-center truncate">
            {zoomedStudentName}
          </span>
        </div>

        {/* Content with natural image sizing */}
        <div className="p-6 overflow-auto flex items-center justify-center bg-slate-100/50 max-h-[calc(95vh-140px)]">
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
        <div className="bg-slate-50 px-6 py-4 flex justify-center items-center border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="bg-rose-500 hover:bg-rose-600 text-white transition-all px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer shadow-md shadow-rose-500/20 active:scale-95 font-sans"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
