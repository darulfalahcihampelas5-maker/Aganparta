import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Plus,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

export interface ImportedExamQuestion {
  type: "multiple_choice" | "short_answer" | "essay";
  text: string;
  options: string[];
  correctIndex: number;
  correctAnswerText?: string;
  imageUrl?: string;
}

interface BulkImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCount: number;
  onApplyQuestions: (questions: ImportedExamQuestion[], mode: "append" | "replace") => void;
}

const SAMPLE_WORD_TEXT = `1. Komponen komputer yang berfungsi sebagai otak pemrosesan instruksi adalah ...
A. RAM
B. Harddisk
C. CPU
D. Monitor
E. Keyboard
Kunci: C

2. [ISIAN] Sebutkan singkatan dari Central Processing Unit!
Kunci: CPU

3. [ESAI] Jelaskan perbedaan antara memori volatil (RAM) dan penyimpanan non-volatil (SSD/HDD)!
Kunci: RAM bersifat sementara (data hilang saat daya mati) dan berkecepatan tinggi untuk proses aktif, sedangkan SSD/HDD bersifat permanen untuk menyimpan file sistem dan data pengguna.`;

function normalizeType(rawType?: string, options?: string[]): "multiple_choice" | "short_answer" | "essay" {
  const val = (rawType || "").toString().trim().toLowerCase();
  if (val.includes("isian") || val.includes("short") || val.includes("singkat")) return "short_answer";
  if (val.includes("esai") || val.includes("essay") || val.includes("uraian")) return "essay";
  if (val.includes("pg") || val.includes("ganda") || val.includes("multiple")) return "multiple_choice";
  if (options && options.some((o) => o.trim().length > 0)) return "multiple_choice";
  return "essay";
}

function parseAnswerKeyToIndex(rawKey: string, options: string[]): number {
  const cleaned = (rawKey || "").toString().trim();
  const upper = cleaned.toUpperCase();
  const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  if (upper in letterMap) return letterMap[upper];
  if (/^[0-4]$/.test(upper)) return Number(upper);
  if (/^[1-5]$/.test(upper)) return Number(upper) - 1;
  const matchedIdx = options.findIndex(
    (opt) => opt.trim().toLowerCase() === cleaned.toLowerCase()
  );
  return matchedIdx >= 0 ? matchedIdx : 0;
}

function parseTextQuestions(rawText: string): ImportedExamQuestion[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n(?=(?:Soal\s+)?\d+[\.\)]\s+)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: ImportedExamQuestion[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let firstLine = lines[0].replace(/^(?:Soal\s+)?\d+[\.\)]\s*/i, "").trim();
    let explicitType: "multiple_choice" | "short_answer" | "essay" | null = null;
    if (/^\[(ISIAN|SHORT(?:_ANSWER)?|SINGKAT)\]/i.test(firstLine)) {
      explicitType = "short_answer";
      firstLine = firstLine.replace(/^\[(ISIAN|SHORT(?:_ANSWER)?|SINGKAT)\]\s*/i, "");
    } else if (/^\[(ESAI|ESSAY|URAIAN)\]/i.test(firstLine)) {
      explicitType = "essay";
      firstLine = firstLine.replace(/^\[(ESAI|ESSAY|URAIAN)\]\s*/i, "");
    } else if (/^\[(PG|PILIHAN GANDA)\]/i.test(firstLine)) {
      explicitType = "multiple_choice";
      firstLine = firstLine.replace(/^\[(PG|PILIHAN GANDA)\]\s*/i, "");
    }

    const questionLines: string[] = [firstLine];
    const optionsMap: Record<string, string> = {};
    let keyStr = "";
    let imageUrl = "";

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const imgMatch = line.match(/^\[?(?:GAMBAR|IMAGE|IMG)\s*:\s*([^\]\s]+)\]?$/i);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        continue;
      }

      const optMatch = line.match(/^([A-Ea-e])[\.\)\:]\s+(.+)$/);
      if (optMatch) {
        optionsMap[optMatch[1].toUpperCase()] = optMatch[2].trim();
        continue;
      }

      const keyMatch = line.match(/^(?:Kunci(?:\s+Jawaban)?|Jawaban|Key)\s*[:=]\s*(.+)$/i);
      if (keyMatch) {
        keyStr = keyMatch[1].trim();
        continue;
      }

      if (Object.keys(optionsMap).length === 0 && !keyStr) {
        questionLines.push(line);
      }
    }

    const optionsList = ["A", "B", "C", "D", "E"].map((k) => optionsMap[k] || "");
    const hasOptions = optionsList.some((o) => o.trim().length > 0);
    const qType = explicitType || (hasOptions ? "multiple_choice" : keyStr.length > 45 || !keyStr ? "essay" : "short_answer");

    const text = questionLines.join("\n").trim();
    if (!text) continue;

    if (qType === "multiple_choice") {
      results.push({
        type: "multiple_choice",
        text,
        options: optionsList.map((o, idx) => o || `Pilihan ${String.fromCharCode(65 + idx)}`),
        correctIndex: parseAnswerKeyToIndex(keyStr || "A", optionsList),
        correctAnswerText: "",
        ...(imageUrl ? { imageUrl } : {}),
      });
    } else {
      results.push({
        type: qType,
        text,
        options: [],
        correctIndex: 0,
        correctAnswerText: keyStr,
        ...(imageUrl ? { imageUrl } : {}),
      });
    }
  }

  return results;
}

export const BulkImportQuestionsModal: React.FC<BulkImportQuestionsModalProps> = ({
  isOpen,
  onClose,
  existingCount,
  onApplyQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<"excel" | "word">("excel");
  const [parsedQuestions, setParsedQuestions] = useState<ImportedExamQuestion[]>([]);
  const [rawWordText, setRawWordText] = useState("");
  const [importError, setImportError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      {
        "Tipe Soal": "PG",
        "Pertanyaan": "Perangkat keras komputer yang berfungsi mengolah data dan menjalankan instruksi program adalah ...",
        "Opsi A": "Monitor",
        "Opsi B": "Printer",
        "Opsi C": "CPU (Processor)",
        "Opsi D": "Keyboard",
        "Opsi E": "Speaker",
        "Kunci Jawaban": "C",
        "URL Gambar (Opsional)": "",
      },
      {
        "Tipe Soal": "ISIAN",
        "Pertanyaan": "Sebutkan kepanjangan dari RAM dalam sistem komputer!",
        "Opsi A": "",
        "Opsi B": "",
        "Opsi C": "",
        "Opsi D": "",
        "Opsi E": "",
        "Kunci Jawaban": "Random Access Memory|RAM",
        "URL Gambar (Opsional)": "",
      },
      {
        "Tipe Soal": "ESAI",
        "Pertanyaan": "Jelaskan fungsi sistem operasi pada komputer!",
        "Opsi A": "",
        "Opsi B": "",
        "Opsi C": "",
        "Opsi D": "",
        "Opsi E": "",
        "Kunci Jawaban": "Mengelola perangkat keras, sumber daya memori/CPU, dan menjembatani pengguna dengan aplikasi.",
        "URL Gambar (Opsional)": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 48 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 28 },
      { wch: 30 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");
    XLSX.writeFile(workbook, "Template_Soal_SiPinter.xlsx");
  };

  const handleExcelUpload = async (file: File) => {
    setIsParsing(true);
    setImportError("");
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

      const imported: ImportedExamQuestion[] = [];
      for (const row of rows) {
        const getCol = (candidates: string[]) => {
          for (const key of Object.keys(row)) {
            const normKey = key.trim().toLowerCase();
            if (candidates.some((c) => normKey.includes(c))) {
              return String(row[key] ?? "").trim();
            }
          }
          return "";
        };

        const text = getCol(["pertanyaan", "soal", "question", "teks"]);
        if (!text) continue;

        const opsiA = getCol(["opsi a", "pilihan a", "a"]);
        const opsiB = getCol(["opsi b", "pilihan b", "b"]);
        const opsiC = getCol(["opsi c", "pilihan c", "c"]);
        const opsiD = getCol(["opsi d", "pilihan d", "d"]);
        const opsiE = getCol(["opsi e", "pilihan e", "e"]);
        const rawKey = getCol(["kunci", "jawaban", "answer", "key"]);
        const rawType = getCol(["tipe", "jenis", "type"]);
        const imageUrl = getCol(["gambar", "image", "img", "foto"]);

        const rawOpts = [opsiA, opsiB, opsiC, opsiD, opsiE];
        const qType = normalizeType(rawType, rawOpts);

        if (qType === "multiple_choice") {
          imported.push({
            type: "multiple_choice",
            text,
            options: rawOpts.map((o, idx) => o || `Pilihan ${String.fromCharCode(65 + idx)}`),
            correctIndex: parseAnswerKeyToIndex(rawKey || "A", rawOpts),
            correctAnswerText: "",
            ...(imageUrl ? { imageUrl } : {}),
          });
        } else {
          imported.push({
            type: qType,
            text,
            options: [],
            correctIndex: 0,
            correctAnswerText: rawKey,
            ...(imageUrl ? { imageUrl } : {}),
          });
        }
      }

      if (imported.length === 0) {
        setImportError("Tidak ditemukan baris soal yang valid. Pastikan menggunakan kolom 'Pertanyaan' sesuai template Excel.");
      }
      setParsedQuestions(imported);
    } catch (err: any) {
      setImportError(`Gagal membaca file Excel: ${err.message || err}`);
      setParsedQuestions([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleWordUpload = async (file: File) => {
    setIsParsing(true);
    setImportError("");
    setFileName(file.name);
    try {
      let extracted = "";
      if (file.name.toLowerCase().endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer });
        extracted = res.value || "";
      } else {
        extracted = await file.text();
      }
      setRawWordText(extracted);
      const parsed = parseTextQuestions(extracted);
      if (parsed.length === 0) {
        setImportError("Format teks tidak terbaca sebagai soal bernomor. Gunakan format bernomor (1. ... A. ... B. ... Kunci: A).");
      }
      setParsedQuestions(parsed);
    } catch (err: any) {
      setImportError(`Gagal membaca dokumen Word: ${err.message || err}`);
      setParsedQuestions([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseManualWordText = () => {
    setImportError("");
    const parsed = parseTextQuestions(rawWordText);
    if (parsed.length === 0) {
      setImportError("Belum ada soal valid yang terbaca. Pastikan setiap soal diawali nomor (contoh: 1. Pertanyaan...).");
    }
    setParsedQuestions(parsed);
  };

  const resetAndClose = () => {
    setParsedQuestions([]);
    setImportError("");
    setFileName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
            onClick={resetAndClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-slate-50 px-6 sm:px-8 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#85cc00]/20 text-slate-900 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
                    Impor Soal Massal (Excel & Word)
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Mendukung Pilihan Ganda, Isian Singkat, Esai, serta URL Gambar soal secara otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Format Tabs */}
            <div className="px-6 sm:px-8 pt-4 bg-white border-b border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("excel");
                  setImportError("");
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "excel"
                    ? "border-[#85cc00] text-slate-950 bg-[#85cc00]/10"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Dari Excel / CSV (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("word");
                  setImportError("");
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === "word"
                    ? "border-[#85cc00] text-slate-950 bg-[#85cc00]/10"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Dari Word / Teks (.docx / Paste)</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              {activeTab === "excel" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                        1. Unduh Template Excel SiPinter
                      </h4>
                      <p className="text-xs text-emerald-800/80 font-medium mt-0.5">
                        Sudah berisi contoh format kolom PG, Isian Singkat (`|`), Esai, dan URL Gambar.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Template (.xlsx)</span>
                    </button>
                  </div>

                  <label className="block border-2 border-dashed border-slate-300 hover:border-[#85cc00] rounded-2xl p-8 text-center bg-slate-50/60 hover:bg-white transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExcelUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-black text-slate-900">
                      {isParsing ? "Membaca file Excel..." : fileName || "Klik untuk pilih file Excel (.xlsx / .xls / .csv)"}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Mendukung ratusan soal sekaligus secara instan di browser
                    </p>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl bg-blue-50/50 hover:bg-blue-50 text-xs font-bold text-blue-700 cursor-pointer transition-all">
                      <input
                        type="file"
                        accept=".docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleWordUpload(f);
                          e.target.value = "";
                        }}
                      />
                      <Upload className="w-4 h-4" />
                      <span>{fileName ? `File dimuat: ${fileName}` : "Unggah File Word (.docx) atau .txt"}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRawWordText(SAMPLE_WORD_TEXT);
                        setParsedQuestions(parseTextQuestions(SAMPLE_WORD_TEXT));
                        setImportError("");
                      }}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold cursor-pointer shrink-0"
                    >
                      Muat Contoh Format
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Atau Tempel Teks Soal Langsung dari Microsoft Word:
                      </span>
                      <button
                        type="button"
                        onClick={handleParseManualWordText}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Proses Teks</span>
                      </button>
                    </div>
                    <textarea
                      value={rawWordText}
                      onChange={(e) => setRawWordText(e.target.value)}
                      rows={6}
                      placeholder={"1. Pertanyaan pilihan ganda...\nA. Opsi A\nB. Opsi B\nC. Opsi C\nD. Opsi D\nE. Opsi E\nKunci: C\n\n2. [ISIAN] Pertanyaan isian singkat...\nKunci: Jawaban"}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-900 p-4 text-xs font-mono text-slate-800 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview Parsed Questions */}
              {parsedQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pratinjau Hasil Impor ({parsedQuestions.length} Soal Terbaca)
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                      <span>PG: {parsedQuestions.filter((q) => q.type === "multiple_choice").length}</span>
                      <span>•</span>
                      <span>Isian: {parsedQuestions.filter((q) => q.type === "short_answer").length}</span>
                      <span>•</span>
                      <span>Esai: {parsedQuestions.filter((q) => q.type === "essay").length}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {parsedQuestions.map((q, idx) => (
                      <div key={`imp-prev-${idx}`} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                            No. {idx + 1} —{" "}
                            {q.type === "multiple_choice"
                              ? "Pilihan Ganda"
                              : q.type === "short_answer"
                              ? "Isian Singkat"
                              : "Esai"}
                          </span>
                          {q.imageUrl && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                              <ImageIcon className="w-3 h-3" /> Bergambar
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-900 line-clamp-2">{q.text}</p>
                        {q.type === "multiple_choice" ? (
                          <p className="text-[11px] text-emerald-700 font-bold">
                            Kunci: {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                          </p>
                        ) : (
                          <p className="text-[11px] text-blue-700 font-bold">
                            Kunci / Rubrik: {q.correctAnswerText || "(Dinilai Manual Guru)"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                {existingCount > 0 && (
                  <button
                    type="button"
                    disabled={parsedQuestions.length === 0}
                    onClick={() => {
                      onApplyQuestions(parsedQuestions, "replace");
                      resetAndClose();
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    Ganti Soal ({parsedQuestions.length})
                  </button>
                )}
                <button
                  type="button"
                  disabled={parsedQuestions.length === 0}
                  onClick={() => {
                    onApplyQuestions(parsedQuestions, "append");
                    resetAndClose();
                  }}
                  className="px-5 py-3 rounded-xl bg-[#85cc00] hover:brightness-105 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Bank Soal ({parsedQuestions.length})</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
