import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Power } from "lucide-react";

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
  description = "Apakah Anda yakin ingin keluar dari sesi guru ini?",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500" />
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6 border border-rose-100 shadow-inner">
                <Power className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                {description}
              </p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-xs uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all cursor-pointer text-xs uppercase tracking-wider active:scale-95"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
