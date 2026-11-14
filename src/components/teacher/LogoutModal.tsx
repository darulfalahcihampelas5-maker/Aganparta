import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, X } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Keluar",
  description = "Apakah Anda yakin ingin mengakhiri sesi guru ini?",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[360px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 ring-1 ring-slate-900/5"
          >
            {/* Header close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6 shadow-sm border border-rose-100/50">
                <LogOut className="w-8 h-8 text-rose-500" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed px-2">
                {description}
              </p>

              <div className="flex flex-col w-full gap-2.5">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all cursor-pointer text-sm shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                  Keluar Sekarang
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-all cursor-pointer text-sm active:scale-[0.98]"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
