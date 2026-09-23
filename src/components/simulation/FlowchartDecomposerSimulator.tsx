import React, { useState } from "react";
import {
  GitMerge,
  CheckCircle2,
  RotateCcw,
  Trophy,
  Sparkles,
  ArrowDown,
  Layers,
  MoveUp,
  MoveDown,
  HelpCircle,
  Boxes,
} from "lucide-react";
import { sound } from "./soundEffects";

interface FlowchartDecomposerSimulatorProps {
  onSuccessScore?: (score: number, stars: number) => void;
  isTeacherMode?: boolean;
}

interface ProcessBlock {
  id: string;
  label: string;
  type: "START" | "PROCESS" | "DECISION" | "END";
}

interface FlowchartPuzzle {
  id: number;
  title: string;
  systemName: string;
  desc: string;
  correctOrder: string[]; // array of block IDs in correct order
  blocks: ProcessBlock[];
  explanation: string;
}

const FLOWCHART_PUZZLES: FlowchartPuzzle[] = [
  {
    id: 1,
    title: "Misi 1: Dekomposisi Kasir Koperasi Sekolah",
    systemName: "Sistem Transaksi Otomatis Koperasi",
    desc: "Susun kembali tahapan dekomposisi sistem transaksi kasir agar alur proses berjalan terurut!",
    correctOrder: ["b1", "b2", "b3", "b4", "b5"],
    blocks: [
      { id: "b1", label: "START: Scan Barcode Barang Siswa", type: "START" },
      { id: "b2", label: "PROSES 1: Cek Stok Barang di Database", type: "PROCESS" },
      { id: "b3", label: "KEPUTUSAN: Apakah Saldo Kartu Cukup?", type: "DECISION" },
      { id: "b4", label: "PROSES 2: Potong Saldo & Cetak Struk Bukti", type: "PROCESS" },
      { id: "b5", label: "END: Selesai & Beri Barang ke Siswa", type: "END" },
    ],
    explanation:
      "Dekomposisi alur transaksi harus diawali dari scan input data, pengecekan stok, keputusan kecukupan saldo, pemotongan saldo, hingga serah terima barang.",
  },
  {
    id: 2,
    title: "Misi 2: Dekomposisi Sistem Otentikasi Login CBT Ujian",
    systemName: "Sistem Keamanan Ujian CBT Komputer",
    desc: "Urutkan blok dekomposisi keamanan login ujian siswa hingga token terverifikasi!",
    correctOrder: ["c1", "c2", "c3", "c4", "c5"],
    blocks: [
      { id: "c1", label: "START: Siswa Membuka Browser CBT Ujian", type: "START" },
      { id: "c2", label: "PROSES 1: Input NISN & Token dari Guru", type: "PROCESS" },
      { id: "c3", label: "KEPUTUSAN: Apakah Token Sesuai Jadwal?", type: "DECISION" },
      { id: "c4", label: "PROSES 2: Load Soal & Mulai Timer Ujian", type: "PROCESS" },
      { id: "c5", label: "END: Siswa Siap Mengerjakan Ujian", type: "END" },
    ],
    explanation:
      "Memecah sistem login membutuhkan validasi bertahap: buka aplikasi -> kirim kredensial -> kecocokan token -> muat dataset soal -> mulai sesi ujian.",
  },
  {
    id: 3,
    title: "Misi 3: Dekomposisi Lampu Lalu Lintas Cerdas (IoT)",
    systemName: "Sistem Sensor Penyeberangan Sekolah",
    desc: "Susun alur algoritma sensor kamera IoT penyeberangan jalan depan sekolah!",
    correctOrder: ["d1", "d2", "d3", "d4", "d5"],
    blocks: [
      { id: "d1", label: "START: Sensor Deteksi Kerumunan Siswa", type: "START" },
      { id: "d2", label: "PROSES 1: Hitung Jumlah Siswa di Area Zebra Cross", type: "PROCESS" },
      { id: "d3", label: "KEPUTUSAN: Apakah Jumlah Siswa >= 5 Orang?", type: "DECISION" },
      { id: "d4", label: "PROSES 2: Ubah Lampu Jalan Menjadi MERAH", type: "PROCESS" },
      { id: "d5", label: "END: Berikan Sinyal Hijau Aman Menyeberang", type: "END" },
    ],
    explanation:
      "Sistem IoT penyeberangan pintar menggunakan pengenalan citra untuk mendeteksi kerumunan sebelum mengaktifkan sirine & sinyal stop otomatis.",
  },
];

export const FlowchartDecomposerSimulator: React.FC<FlowchartDecomposerSimulatorProps> = ({
  onSuccessScore,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const puzzle = FLOWCHART_PUZZLES[currentIdx];

  // Randomize initial block order for the puzzle
  const [userBlocks, setUserBlocks] = useState<ProcessBlock[]>(() => {
    return [...FLOWCHART_PUZZLES[0].blocks].sort(() => Math.random() - 0.5);
  });

  const [evaluated, setEvaluated] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");

  const handleSelectPuzzle = (idx: number) => {
    sound.playClick();
    setCurrentIdx(idx);
    const selected = FLOWCHART_PUZZLES[idx];
    setUserBlocks([...selected.blocks].sort(() => Math.random() - 0.5));
    setEvaluated(false);
    setMessage("");
  };

  const moveBlock = (fromIndex: number, direction: "UP" | "DOWN") => {
    sound.playStep();
    const toIndex = direction === "UP" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= userBlocks.length) return;

    const updated = [...userBlocks];
    const temp = updated[fromIndex];
    updated[fromIndex] = updated[toIndex];
    updated[toIndex] = temp;

    setUserBlocks(updated);
    setEvaluated(false);
  };

  const handleVerify = () => {
    sound.playClick();
    setEvaluated(true);

    const currentOrderIds = userBlocks.map((b) => b.id);
    let matchCount = 0;

    currentOrderIds.forEach((id, idx) => {
      if (id === puzzle.correctOrder[idx]) {
        matchCount++;
      }
    });

    const isTotalMatch = matchCount === puzzle.correctOrder.length;

    if (isTotalMatch) {
      sound.playSuccess();
      setIsSuccess(true);
      setScore(100);
      setStars(3);
      setMessage(`SEMPURNA! Susunan Dekomposisi Sistem Tepat 100%! ${puzzle.explanation}`);
      if (onSuccessScore) onSuccessScore(100, 3);
    } else if (matchCount >= 3) {
      sound.playCoin();
      setIsSuccess(false);
      setScore(75);
      setStars(2);
      setMessage(
        `BAGUS! Ada ${matchCount} dari ${puzzle.correctOrder.length} blok posisi yang sudah tepat. Tukar posisi blok sisanya agar urutan sistem menjadi logis.`
      );
      if (onSuccessScore) onSuccessScore(75, 2);
    } else {
      sound.playFail();
      setIsSuccess(false);
      setScore(45);
      setStars(1);
      setMessage(`BELUM LOGIS. ${puzzle.explanation}`);
      if (onSuccessScore) onSuccessScore(45, 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <GitMerge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Pilar: Dekomposisi & Diagram Alir
              </span>
              <span className="text-xs text-slate-300">Lab Virtual Klasik</span>
            </div>
            <h3 className="font-black text-lg text-white mt-0.5">
              Simulator Dekomposisi Diagram Alir Sistem (Flowchart)
            </h3>
            <p className="text-xs text-slate-300">
              Pecah masalah besar menjadi urutan blok sub-proses yang terstruktur dan teratur.
            </p>
          </div>
        </div>

        {/* Mission Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {FLOWCHART_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPuzzle(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentIdx === idx
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              Misi {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="p-6 bg-slate-950 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-white">
          <h4 className="font-black text-emerald-400 text-sm flex items-center gap-2">
            <Boxes className="w-4 h-4" /> {puzzle.title} - [{puzzle.systemName}]
          </h4>
          <p className="text-xs text-slate-300 mt-1">{puzzle.desc}</p>
        </div>

        {/* Flowchart Reordering Canvas */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" /> Urutan Alokasi Blok Proses Sistem
            </span>
            <span className="text-[11px] text-slate-400">Gunakan tombol Panah Naik/Turun</span>
          </div>

          <div className="space-y-2.5">
            {userBlocks.map((block, idx) => (
              <React.Fragment key={block.id}>
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    block.type === "START"
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-200"
                      : block.type === "END"
                      ? "bg-purple-950/70 border-purple-500/60 text-purple-200"
                      : block.type === "DECISION"
                      ? "bg-amber-950/70 border-amber-500/60 text-amber-200"
                      : "bg-slate-900 border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-black/40 flex items-center justify-center font-mono text-xs font-black text-slate-300 border border-white/10">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/30 border border-white/10 mr-2">
                        {block.type}
                      </span>
                      <span className="text-xs font-bold">{block.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, "UP")}
                      disabled={idx === 0}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-all cursor-pointer"
                      title="Geser Ke Atas"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, "DOWN")}
                      disabled={idx === userBlocks.length - 1}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-all cursor-pointer"
                      title="Geser Ke Bawah"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {idx < userBlocks.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <ArrowDown className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleSelectPuzzle(currentIdx)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Acak Ulang Blok
          </button>

          <button
            type="button"
            onClick={handleVerify}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verifikasi Alur Sistem</span>
          </button>
        </div>

        {/* Result alert */}
        {evaluated && (
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 animate-fadeIn ${
              isSuccess
                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
                : "bg-amber-950/80 border-amber-500/60 text-amber-200"
            }`}
          >
            <div className="flex items-center justify-between font-black text-sm">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Hasil Uji Dekomposisi: Nilai {score}/100
              </span>
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <Sparkles
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= stars ? "text-amber-400 fill-amber-400" : "text-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
