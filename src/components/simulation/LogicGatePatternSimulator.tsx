import React, { useState } from "react";
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Zap,
  HelpCircle,
  Key,
  Clock,
  ArrowRight,
  Code2,
} from "lucide-react";
import { sound } from "./soundEffects";

interface LogicGatePatternSimulatorProps {
  onSuccessScore?: (score: number, stars: number) => void;
  isTeacherMode?: boolean;
}

interface GatePuzzle {
  id: number;
  title: string;
  desc: string;
  pillar: "Pengenalan Pola & Logika Biner";
  inputs: { A: number; B: number };
  gateType: "AND" | "OR" | "XOR" | "NAND";
  targetOutput: number;
  patternSequence: number[];
  missingPatternIdx: number;
  correctPatternVal: number;
  patternOptions: number[];
  explanation: string;
}

const LOGIC_PUZZLES: GatePuzzle[] = [
  {
    id: 1,
    title: "Misi 1: Gerbang Logika AND & Aliran Biner",
    desc: "Tentukan output dari gerbang AND berikut dan lengkapi deret pola sinyal biner!",
    pillar: "Pengenalan Pola & Logika Biner",
    inputs: { A: 1, B: 1 },
    gateType: "AND",
    targetOutput: 1,
    patternSequence: [2, 4, 8, 16, 32, 64],
    missingPatternIdx: 3, // index of 16
    correctPatternVal: 16,
    patternOptions: [12, 14, 16, 18],
    explanation: "Gerbang AND bernilai 1 HANYA JIKA kedua input (A dan B) bernilai 1. Pola deret biner merupakan kelipatan 2 (2^n).",
  },
  {
    id: 2,
    title: "Misi 2: Matriks XOR & Deteksi Pola Ganjil-Genap",
    desc: "Sinyal biner XOR menghasilkan 1 jika input berbeda. Temukan nilai tersembunyi pada matriks pola biner!",
    pillar: "Pengenalan Pola & Logika Biner",
    inputs: { A: 1, B: 0 },
    gateType: "XOR",
    targetOutput: 1,
    patternSequence: [1, 3, 7, 15, 31, 63],
    missingPatternIdx: 4, // index of 31
    correctPatternVal: 31,
    patternOptions: [25, 29, 31, 33],
    explanation: "Gerbang XOR (Exclusive OR) bernilai 1 jika salah satu input aktif. Pola angka adalah (2^n - 1).",
  },
  {
    id: 3,
    title: "Misi 3: Gerbang NAND & Anomali Sinyal Jaringan",
    desc: "NAND adalah kebalikan dari AND. Analisis pola sinyal biner yang bocor di server sekolah!",
    pillar: "Pengenalan Pola & Logika Biner",
    inputs: { A: 1, B: 1 },
    gateType: "NAND",
    targetOutput: 0,
    patternSequence: [100, 50, 25, 12.5],
    missingPatternIdx: 2, // index of 25
    correctPatternVal: 25,
    patternOptions: [20, 25, 30, 35],
    explanation: "NAND menghasilkan 0 jika A=1 dan B=1. Pola angka adalah pembagian konsisten 2 (halving pattern).",
  },
  {
    id: 4,
    title: "Misi 4: Enkripsi Matriks Biner & Sinyal Komputer",
    desc: "Pecahkan sandi enkripsi pola biner untuk membuka pintu masuk server rahasia!",
    pillar: "Pengenalan Pola & Logika Biner",
    inputs: { A: 0, B: 1 },
    gateType: "OR",
    targetOutput: 1,
    patternSequence: [3, 9, 27, 81, 243],
    missingPatternIdx: 3, // index of 81
    correctPatternVal: 81,
    patternOptions: [72, 81, 90, 108],
    explanation: "Gerbang OR bernilai 1 jika salah satu atau kedua input bernilai 1. Pola deret matematika dikali 3 secara beruntun.",
  },
];

export const LogicGatePatternSimulator: React.FC<LogicGatePatternSimulatorProps> = ({
  onSuccessScore,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const puzzle = LOGIC_PUZZLES[currentIdx];

  const [selectedGateOutput, setSelectedGateOutput] = useState<number | null>(null);
  const [selectedPatternVal, setSelectedPatternVal] = useState<number | null>(null);

  const [evaluated, setEvaluated] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");

  const handleVerify = () => {
    if (selectedGateOutput === null || selectedPatternVal === null) return;

    sound.playClick();
    setEvaluated(true);

    const gateCorrect = selectedGateOutput === puzzle.targetOutput;
    const patternCorrect = selectedPatternVal === puzzle.correctPatternVal;

    if (gateCorrect && patternCorrect) {
      sound.playSuccess();
      setIsSuccess(true);
      setScore(100);
      setStars(3);
      setMessage(`LUAR BIASA! Analisis Gerbang Logika & Pola Biner Tepat! ${puzzle.explanation}`);
      if (onSuccessScore) onSuccessScore(100, 3);
    } else if (gateCorrect || patternCorrect) {
      sound.playCoin();
      setIsSuccess(false);
      setScore(70);
      setStars(2);
      setMessage(
        `HAMPIR BENAR! Salah satu jawabanmu sudah tepat (${gateCorrect ? "Gerbang Logika Benar" : "Pola Biner Benar"}). Periksa kembali logika biner yang belum sesuai.`
      );
      if (onSuccessScore) onSuccessScore(70, 2);
    } else {
      sound.playFail();
      setIsSuccess(false);
      setScore(40);
      setStars(1);
      setMessage(`BELUM TEPAT. ${puzzle.explanation}`);
      if (onSuccessScore) onSuccessScore(40, 1);
    }
  };

  const handleReset = () => {
    sound.playClick();
    setSelectedGateOutput(null);
    setSelectedPatternVal(null);
    setEvaluated(false);
    setIsSuccess(false);
    setMessage("");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40">
                Pilar: Pengenalan Pola & Logika Biner
              </span>
              <span className="text-xs text-slate-300">Lab Virtual Klasik</span>
            </div>
            <h3 className="font-black text-lg text-white mt-0.5">
              Simulator Gerbang Logika & Matriks Biner
            </h3>
            <p className="text-xs text-slate-300">
              Pahami pengenalan pola sinyal biner dan operasi logika komputer (AND, OR, XOR, NAND).
            </p>
          </div>
        </div>

        {/* Mission Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {LOGIC_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setCurrentIdx(idx);
                setSelectedGateOutput(null);
                setSelectedPatternVal(null);
                setEvaluated(false);
                setMessage("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentIdx === idx
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              Misi {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Game Board */}
      <div className="p-6 bg-slate-950 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-white">
          <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" /> {puzzle.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1">{puzzle.desc}</p>
        </div>

        {/* Part 1: Logic Gate Diagram */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4" /> Bagian 1: Analisis Gerbang Logika [{puzzle.gateType}]
            </span>
            <span className="text-[11px] text-slate-400">Pilih nilai Output (0 atau 1)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            {/* Input A & B */}
            <div className="flex flex-col gap-3 text-xs font-bold">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400">Input A:</span>
                <span className="text-amber-400 font-mono text-sm">{puzzle.inputs.A}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-slate-400">Input B:</span>
                <span className="text-amber-400 font-mono text-sm">{puzzle.inputs.B}</span>
              </div>
            </div>

            {/* Gate Box */}
            <div className="px-6 py-4 bg-gradient-to-br from-indigo-900 to-slate-900 border-2 border-indigo-500 rounded-2xl text-center shadow-lg shadow-indigo-500/20">
              <span className="text-xs text-indigo-300 font-bold block">GERBANG LOGIKA</span>
              <span className="text-xl font-black text-white tracking-widest">{puzzle.gateType}</span>
            </div>

            <ArrowRight className="w-6 h-6 text-indigo-400" />

            {/* Output Selector */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Hasil Output:</span>
              <div className="flex gap-2">
                {[0, 1].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedGateOutput(val);
                    }}
                    className={`w-12 h-12 rounded-xl font-mono text-lg font-black transition-all cursor-pointer ${
                      selectedGateOutput === val
                        ? "bg-indigo-500 text-white ring-4 ring-indigo-400/40 scale-105 shadow-lg shadow-indigo-500/30"
                        : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Part 2: Pattern Recognition Sequence */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Bagian 2: Pengenalan Pola Deret Angka Komputer
            </span>
            <span className="text-[11px] text-slate-400">Pilih angka yang mengisi tanda tanya [ ? ]</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            {puzzle.patternSequence.map((num, idx) => {
              const isMissing = idx === puzzle.missingPatternIdx;
              return (
                <div
                  key={idx}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono text-base font-black border transition-all ${
                    isMissing
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/60 ring-2 ring-amber-500/30 animate-pulse"
                      : "bg-slate-900 text-slate-200 border-slate-800"
                  }`}
                >
                  {isMissing ? (selectedPatternVal !== null ? selectedPatternVal : "?") : num}
                </div>
              );
            })}
          </div>

          {/* Options for Pattern */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-slate-400 w-full text-center font-semibold mb-1">
              Pilihan Jawaban Pola:
            </span>
            {puzzle.patternOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedPatternVal(opt);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedPatternVal === opt
                    ? "bg-amber-500 text-slate-950 font-black scale-105 shadow-md shadow-amber-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reset Pilihan
          </button>

          <button
            type="button"
            onClick={handleVerify}
            disabled={selectedGateOutput === null || selectedPatternVal === null}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedGateOutput !== null && selectedPatternVal !== null
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Uji & Verifikasi Analisis</span>
          </button>
        </div>

        {/* Evaluation Result Alert */}
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
                Hasil Uji: Score {score}/100
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
