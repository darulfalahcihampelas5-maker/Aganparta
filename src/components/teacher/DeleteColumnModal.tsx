import React, { useState } from "react";
import { Trash2, X, Search, FileText, MonitorPlay, AlertTriangle, CheckCircle2, Pencil, ShieldAlert } from "lucide-react";

export interface RekapColumnItem {
  id: string;
  title: string;
  type: "assignment" | "exam";
  bab?: string;
  date?: string;
  targetClasses?: string[];
  kelasRef?: string;
  kelas?: string;
}

interface DeleteColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: RekapColumnItem[];
  onDeleteColumn: (id: string, title: string, type: "assignment" | "exam", scope?: "class_only" | "all_classes") => Promise<void> | void;
  onEditColumn?: (col: RekapColumnItem) => void;
  selectedClass?: string;
}

export const DeleteColumnModal: React.FC<DeleteColumnModalProps> = ({
  isOpen,
  onClose,
  columns,
  onDeleteColumn,
  onEditColumn,
  selectedClass,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "assignment" | "exam">("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSpecificClassActive =
    !!selectedClass &&
    selectedClass !== "SEMUA_KELAS" &&
    selectedClass !== "ALL" &&
    selectedClass !== "Semua Kelas";

  const filteredColumns = columns.filter((col) => {
    const matchesSearch =
      col.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (col.bab && col.bab.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "ALL" || col.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (col: RekapColumnItem, scope?: "class_only" | "all_classes") => {
    setDeletingId(col.id);
    try {
      await onDeleteColumn(col.id, col.title, col.type, scope);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-900 via-slate-900 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Hapus Kolom Buku Nilai
                {isSpecificClassActive && (
                  <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold">
                    Filter: {selectedClass}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                {isSpecificClassActive
                  ? `Menghapus kolom hanya akan melepaskan penilaian dari Kelas ${selectedClass} tanpa menghapus data kelas lain`
                  : "Pilih kolom penilaian (Tugas atau CBT) yang ingin dihapus dari tabel Rekap"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul kolom..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Semua ({columns.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("assignment")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                typeFilter === "assignment"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Tugas ({columns.filter((c) => c.type === "assignment").length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("exam")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                typeFilter === "exam"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              CBT ({columns.filter((c) => c.type === "exam").length})
            </button>
          </div>
        </div>

        {/* Warning Callout */}
        <div className={`px-5 py-3 border-b flex items-start gap-2.5 text-xs ${
          isSpecificClassActive
            ? "bg-blue-50/80 border-blue-200/60 text-blue-900"
            : "bg-amber-50/80 border-amber-200/60 text-amber-800"
        }`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isSpecificClassActive ? "text-blue-600" : "text-amber-600"}`} />
          <p className="leading-relaxed">
            {isSpecificClassActive
              ? `Saat ini Anda memfilter Kelas ${selectedClass}. Tombol "Hapus" hanya akan menghapus kolom dari Kelas ${selectedClass}. Nilai dan tugas kelas lain tetap terjaga aman.`
              : "Menghapus kolom saat mode 'Semua Kelas' akan menghapus kolom dan seluruh data penilaian terkait secara permanen."}
          </p>
        </div>

        {/* Column List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[450px]">
          {filteredColumns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada kolom penilaian yang cocok dengan pencarian.
            </div>
          ) : (
            filteredColumns.map((col, idx) => {
              const isExam = col.type === "exam";
              const isDeleting = deletingId === col.id;
              const formattedDate = col.date
                ? new Date(col.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

              const classDisplay =
                col.targetClasses && col.targetClasses.length > 0
                  ? col.targetClasses.join(", ")
                  : col.kelasRef || col.kelas || "Semua Kelas";

              const isMultiClass =
                (col.targetClasses && col.targetClasses.length > 1) ||
                (col.kelas && col.kelas.includes(",")) ||
                !col.targetClasses;

              return (
                <div
                  key={`del-col-${col.type}-${col.id}-${idx}`}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isExam
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {isExam ? <MonitorPlay className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            isExam
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                        >
                          {isExam ? "CBT" : "Tugas"}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={col.title}>
                          {col.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span>Bab: <strong className="text-slate-700">{col.bab || "Informatika"}</strong></span>
                        <span>•</span>
                        <span>Mulai: <strong className="text-slate-700">{formattedDate}</strong></span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">Kelas: <strong className="text-slate-700">{classDisplay}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onEditColumn && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditColumn(col);
                        }}
                        disabled={isDeleting}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                        title="Edit Identitas Kolom"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {isSpecificClassActive && isMultiClass ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(col, "class_only")}
                          disabled={isDeleting}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                          title={`Hapus kolom hanya untuk ${selectedClass}`}
                        >
                          {isDeleting ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Hapus ({selectedClass})</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(col, "all_classes")}
                        disabled={isDeleting}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Total {columns.length} kolom terdata</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

