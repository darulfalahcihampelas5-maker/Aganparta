import React, { useState } from "react";
import {
  ArrowUpDown,
  Search,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Trophy,
  ArrowRight,
  TrendingUp,
  Brain,
  Zap,
} from "lucide-react";
import { sound } from "./soundEffects";

interface SortingDecompositionSimulatorProps {
  onSuccessScore?: (score: number, stars: number) => void;
  isTeacherMode?: boolean;
}

export const SortingDecompositionSimulator: React.FC<SortingDecompositionSimulatorProps> = ({
  onSuccessScore,
}) => {
  const [activeTab, setActiveTab] = useState<"binary-search" | "sorting-swap">("binary-search");

  // --- Binary Search Game State ---
  const [targetNumber, setTargetNumber] = useState<number>(() => Math.floor(Math.random() * 99) + 1);
  const [lowBound, setLowBound] = useState<number>(1);
  const [highBound, setHighBound] = useState<number>(100);
  const [guessInput, setGuessInput] = useState<string>("");
  const [guessHistory, setGuessHistory] = useState<{ guess: number; feedback: string }[]>([]);
  const [isBinaryWon, setIsBinaryWon] = useState<boolean>(false);
  const [binaryScore, setBinaryScore] = useState<number>(0);

  // --- Sorting Swap Game State ---
  const [cards, setCards] = useState<number[]>([42, 17, 89, 5, 23, 61]);
  const [swapCount, setSwapCount] = useState<number>(0);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [isSortedWon, setIsSortedWon] = useState<boolean>(false);
  const [sortScore, setSortScore] = useState<number>(0);

  // Check if cards are sorted
  const checkIfSorted = (arr: number[]) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  };

  // Binary Search Guess Action
  const handleBinaryGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(guessInput, 10);
    if (isNaN(val) || val < 1 || val > 100) return;

    sound.playStep();
    const newHistory = [...guessHistory];

    if (val === targetNumber) {
      sound.playSuccess();
      setIsBinaryWon(true);
      newHistory.push({ guess: val, feedback: "TEPAT! Angka Rahasia Ditemukan!" });
      setGuessHistory(newHistory);

      // Max 7 steps for optimal binary search in 1-100
      const steps = newHistory.length;
      let calcScore = 100;
      if (steps <= 7) calcScore = 100;
      else if (steps <= 10) calcScore = 85;
      else calcScore = 70;

      setBinaryScore(calcScore);
      if (onSuccessScore) {
        onSuccessScore(calcScore, calcScore === 100 ? 3 : 2);
      }
    } else if (val < targetNumber) {
      sound.playCoin();
      newHistory.push({ guess: val, feedback: "Terlalu KECIL! Naikkan tebakan." });
      setGuessHistory(newHistory);
      if (val >= lowBound) setLowBound(val + 1);
    } else {
      sound.playCoin();
      newHistory.push({ guess: val, feedback: "Terlalu BESAR! Turunkan tebakan." });
      setGuessHistory(newHistory);
      if (val <= highBound) setHighBound(val - 1);
    }

    setGuessInput("");
  };

  const handleResetBinary = () => {
    sound.playClick();
    setTargetNumber(Math.floor(Math.random() * 99) + 1);
    setLowBound(1);
    setHighBound(100);
    setGuessInput("");
    setGuessHistory([]);
    setIsBinaryWon(false);
    setBinaryScore(0);
  };

  // Sorting Swap Action
  const handleSelectCard = (idx: number) => {
    if (isSortedWon) return;
    sound.playClick();

    if (selectedCardIdx === null) {
      setSelectedCardIdx(idx);
    } else if (selectedCardIdx === idx) {
      setSelectedCardIdx(null);
    } else {
      // Swap card elements
      const newCards = [...cards];
      const temp = newCards[selectedCardIdx];
      newCards[selectedCardIdx] = newCards[idx];
      newCards[idx] = temp;

      const newSwap = swapCount + 1;
      setCards(newCards);
      setSwapCount(newSwap);
      setSelectedCardIdx(null);
      sound.playStep();

      // Check if finished
      if (checkIfSorted(newCards)) {
        sound.playSuccess();
        setIsSortedWon(true);
        const calcScore = Math.max(75, 100 - Math.max(0, newSwap - 6) * 4);
        setSortScore(calcScore);
        if (onSuccessScore) {
          onSuccessScore(calcScore, calcScore >= 90 ? 3 : 2);
        }
      }
    }
  };

  const handleResetSort = () => {
    sound.playClick();
    setCards([42, 17, 89, 5, 23, 61]);
    setSwapCount(0);
    setSelectedCardIdx(null);
    setIsSortedWon(false);
    setSortScore(0);
  };

  const recommendedMid = Math.floor((lowBound + highBound) / 2);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Banner */}
      <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40">
                Pilar: Algoritma Pencarian & Pengurutan
              </span>
              <span className="text-xs text-slate-300">Level 3 Lanjutan</span>
            </div>
            <h3 className="font-black text-lg text-white mt-0.5">
              Arena Simulasi: Binary Search & Sorting Algorithm
            </h3>
            <p className="text-xs text-slate-300">
              Pelajari efisiensi divide-and-conquer serta mekanisme perbandingan memori komputer.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab("binary-search");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "binary-search"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tebak Biner (1 - 100)
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab("sorting-swap");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sorting-swap"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Urutkan Kartu (Sorting Swap)
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 bg-slate-50/50">
        {activeTab === "binary-search" ? (
          <div className="space-y-6">
            {/* Visual Number Range Bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Rentang Pencarian Tersisa: <b>[{lowBound} ... {highBound}]</b></span>
                <span className="font-bold text-purple-700">
                  Target: {highBound - lowBound + 1} kemungkinan
                </span>
              </div>

              {/* Progress visualizer */}
              <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden relative flex border border-slate-200">
                <div
                  style={{ width: `${lowBound - 1}%` }}
                  className="h-full bg-slate-300 transition-all duration-300"
                  title="Diabaikan (terlalu kecil)"
                />
                <div
                  style={{ width: `${highBound - lowBound + 1}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300 flex items-center justify-center text-[10px] font-black text-white"
                >
                  Area Aktif
                </div>
                <div
                  style={{ width: `${100 - highBound}%` }}
                  className="h-full bg-slate-300 transition-all duration-300"
                  title="Diabaikan (terlalu besar)"
                />
              </div>

              {/* CT Hint */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>
                  💡 <b>Tips Berpikir Komputasional:</b> Tebak titik tengah nilai{" "}
                  <button
                    type="button"
                    onClick={() => setGuessInput(String(recommendedMid))}
                    className="underline text-purple-700 font-black cursor-pointer ml-1 hover:text-purple-900"
                  >
                    {recommendedMid}
                  </button>{" "}
                  untuk memotong 50% data secara optimal!
                </span>
                <span className="font-mono text-slate-400">
                  Tebakan ke: {guessHistory.length}
                </span>
              </div>
            </div>

            {/* Input & Guess History */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <form onSubmit={handleBinaryGuess} className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Masukkan Angka Tebakan (1 - 100)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      disabled={isBinaryWon}
                      placeholder={`Contoh: ${recommendedMid}`}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl text-center text-lg font-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={isBinaryWon || !guessInput}
                      className="px-6 py-3 bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-purple-600/20"
                    >
                      Tebak
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetBinary}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mulai Angka Baru</span>
                  </button>

                  {isBinaryWon && (
                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                      <Trophy className="w-4 h-4" /> Skor: {binaryScore}
                    </span>
                  )}
                </div>
              </div>

              <div className="md:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Riwayat Nalar Komputasional
                </span>
                <div className="flex-1 max-h-48 overflow-y-auto custom-scrollbar space-y-2 p-1">
                  {guessHistory.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Search className="w-6 h-6 mb-1 text-slate-300" />
                      <span>Belum ada tebakan. Masukkan angka untuk memulai pencarian.</span>
                    </div>
                  ) : (
                    guessHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border ${
                          item.feedback.includes("TEPAT")
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : item.feedback.includes("KECIL")
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-sky-50 border-sky-200 text-sky-900"
                        }`}
                      >
                        <span>Tebakan #{idx + 1}: <b>{item.guess}</b></span>
                        <span className="text-[11px]">{item.feedback}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sorting Swap Game */
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">
                    Urutkan Kartu dari Terkecil ke Terbesar (Ascending)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Klik kartu pertama, lalu klik kartu kedua untuk menukar posisinya (Swap).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-50 text-purple-800 px-3 py-1 rounded-xl text-xs font-bold border border-purple-200">
                    Jumlah Tukar (Swap): <b>{swapCount}</b>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetSort}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Acak Ulang"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cards Array Display */}
              <div className="grid grid-cols-6 gap-3 py-4">
                {cards.map((val, idx) => {
                  const isSelected = selectedCardIdx === idx;
                  const isCorrectPos =
                    idx > 0 && val >= cards[idx - 1] && (idx === cards.length - 1 || val <= cards[idx + 1]);

                  return (
                    <button
                      key={`card-${idx}-${val}`}
                      type="button"
                      onClick={() => handleSelectCard(idx)}
                      disabled={isSortedWon}
                      className={`h-28 rounded-2xl flex flex-col items-center justify-between p-3 border-2 transition-all duration-300 font-black cursor-pointer ${
                        isSelected
                          ? "bg-amber-400 border-amber-500 text-slate-950 scale-105 shadow-xl shadow-amber-400/30"
                          : isSortedWon
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-lg"
                          : "bg-white border-slate-200 text-slate-800 hover:border-purple-400 hover:shadow-md"
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 font-mono">Idx: {idx}</span>
                      <span className="text-2xl font-black">{val}</span>
                      <div className="w-full flex justify-center">
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Win message */}
              {isSortedWon && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">
                        Luar Biasa! Kartu berhasil terurut dengan {swapCount} langkah pertukaran!
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Inilah konsep kerja algoritma pengurutan (Sorting) dalam sistem komputer.
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-700">
                    Skor: {sortScore} / 100
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
