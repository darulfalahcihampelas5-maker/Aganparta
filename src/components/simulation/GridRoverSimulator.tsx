import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Trophy,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Flag,
  Sparkles,
  ChevronRight,
  ArrowUp,
  RotateCw,
  StepForward,
  Coins,
  Bot,
  Compass,
} from "lucide-react";
import { sound } from "./soundEffects";

export type CommandType = "FORWARD" | "TURN_LEFT" | "TURN_RIGHT" | "COLLECT";

interface CommandItem {
  id: string;
  type: CommandType;
}

interface GridCell {
  x: number;
  y: number;
  type: "empty" | "wall" | "coin" | "target" | "start";
}

interface GridRoverSimulatorProps {
  onSuccessScore?: (score: number, stars: number) => void;
  isTeacherMode?: boolean;
}

const GRID_SIZE = 5;

// Sample levels for the Rover
const ROVER_PUZZLES = [
  {
    id: 1,
    name: "Tantangan 1: Jalur Lurus & Belok Pertama",
    desc: "Arahkan Rover maju, kumpulkan Data Chip, lalu capai stasiun data finis!",
    start: { x: 0, y: 4, dir: "NORTH" as const },
    target: { x: 2, y: 1 },
    walls: [
      { x: 1, y: 3 },
      { x: 1, y: 4 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
    ],
    coins: [
      { x: 0, y: 2 },
      { x: 2, y: 2 },
    ],
    parMoves: 7,
  },
  {
    id: 2,
    name: "Tantangan 2: Labirin Lab Komputer",
    desc: "Kumpulkan 3 Data Chip yang tersebar di balik sekat dinding sebelum mencapai stasiun!",
    start: { x: 0, y: 4, dir: "NORTH" as const },
    target: { x: 4, y: 0 },
    walls: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    ],
    coins: [
      { x: 0, y: 0 },
      { x: 2, y: 4 },
      { x: 4, y: 3 },
    ],
    parMoves: 14,
  },
  {
    id: 3,
    name: "Tantangan 3: Koleksi Chip Zig-Zag",
    desc: "Lintasi lorong zig-zag untuk mengambil chip kuantum komputer!",
    start: { x: 0, y: 0, dir: "EAST" as const },
    target: { x: 4, y: 4 },
    walls: [
      { x: 1, y: 0 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 3, y: 3 },
      { x: 1, y: 4 },
    ],
    coins: [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
    ],
    parMoves: 16,
  },
  {
    id: 4,
    name: "Tantangan 4: Peta Server Cloud & Rintangan Dinding",
    desc: "Temukan celah di tengah dinding benteng server tanpa menabrak!",
    start: { x: 4, y: 4, dir: "NORTH" as const },
    target: { x: 0, y: 0 },
    walls: [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 4 },
    ],
    coins: [
      { x: 2, y: 2 },
      { x: 0, y: 1 },
    ],
    parMoves: 12,
  },
  {
    id: 5,
    name: "Tantangan 5: Rute Terpendek & Hindari Loop",
    desc: "Navigasikan robot melewati koridor melingkar secara efisien!",
    start: { x: 2, y: 4, dir: "NORTH" as const },
    target: { x: 2, y: 0 },
    walls: [
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
    ],
    coins: [
      { x: 0, y: 2 },
      { x: 4, y: 2 },
    ],
    parMoves: 15,
  },
  {
    id: 6,
    name: "Tantangan 6: Ekspedisi Rover Planet Mars (Master)",
    desc: "Misi tingkat lanjut! Ambil sampel data berharga di segala sudut medan Mars!",
    start: { x: 0, y: 4, dir: "EAST" as const },
    target: { x: 4, y: 0 },
    walls: [
      { x: 1, y: 4 },
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    coins: [
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 2, y: 2 },
      { x: 3, y: 0 },
    ],
    parMoves: 20,
  },
];

type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

export const GridRoverSimulator: React.FC<GridRoverSimulatorProps> = ({
  onSuccessScore,
  isTeacherMode,
}) => {
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0);
  const puzzle = ROVER_PUZZLES[currentPuzzleIdx];

  const [commands, setCommands] = useState<CommandItem[]>([
    { id: "1", type: "FORWARD" },
    { id: "2", type: "FORWARD" },
    { id: "3", type: "COLLECT" },
    { id: "4", type: "TURN_RIGHT" },
    { id: "5", type: "FORWARD" },
  ]);

  const [roverPos, setRoverPos] = useState({ x: puzzle.start.x, y: puzzle.start.y });
  const [roverDir, setRoverDir] = useState<Direction>(puzzle.start.dir);
  const [collectedCoins, setCollectedCoins] = useState<{ x: number; y: number }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [gameStatus, setGameStatus] = useState<"IDLE" | "RUNNING" | "WIN" | "CRASH" | "FAILED">("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when puzzle changes
  const resetBoard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setCurrentStep(-1);
    setRoverPos({ x: puzzle.start.x, y: puzzle.start.y });
    setRoverDir(puzzle.start.dir);
    setCollectedCoins([]);
    setGameStatus("IDLE");
    setStatusMessage("");
  };

  useEffect(() => {
    resetBoard();
  }, [currentPuzzleIdx]);

  const addCommand = (type: CommandType) => {
    if (isRunning) return;
    sound.playClick();
    setCommands((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, type },
    ]);
  };

  const removeCommand = (idx: number) => {
    if (isRunning) return;
    sound.playClick();
    setCommands((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAllCommands = () => {
    if (isRunning) return;
    sound.playClick();
    setCommands([]);
  };

  const getNextDir = (current: Direction, turn: "LEFT" | "RIGHT"): Direction => {
    const dirs: Direction[] = ["NORTH", "EAST", "SOUTH", "WEST"];
    const idx = dirs.indexOf(current);
    if (turn === "LEFT") {
      return dirs[(idx + 3) % 4];
    } else {
      return dirs[(idx + 1) % 4];
    }
  };

  const executeStep = (
    cmdIdx: number,
    curPos: { x: number; y: number },
    curDir: Direction,
    curCoins: { x: number; y: number }[]
  ): {
    nextPos: { x: number; y: number };
    nextDir: Direction;
    nextCoins: { x: number; y: number }[];
    crashed: boolean;
    reachedTarget: boolean;
    msg: string;
  } => {
    const cmd = commands[cmdIdx];
    let nextPos = { ...curPos };
    let nextDir = curDir;
    let nextCoins = [...curCoins];
    let crashed = false;
    let reachedTarget = false;
    let msg = "";

    if (cmd.type === "TURN_LEFT") {
      nextDir = getNextDir(curDir, "LEFT");
      sound.playStep();
    } else if (cmd.type === "TURN_RIGHT") {
      nextDir = getNextDir(curDir, "RIGHT");
      sound.playStep();
    } else if (cmd.type === "FORWARD") {
      let dx = 0;
      let dy = 0;
      if (curDir === "NORTH") dy = -1;
      if (curDir === "SOUTH") dy = 1;
      if (curDir === "EAST") dx = 1;
      if (curDir === "WEST") dx = -1;

      const targetX = curPos.x + dx;
      const targetY = curPos.y + dy;

      // Check boundaries
      if (targetX < 0 || targetX >= GRID_SIZE || targetY < 0 || targetY >= GRID_SIZE) {
        crashed = true;
        msg = "Tabrakan! Rover keluar dari batas arena petak.";
      } else if (puzzle.walls.some((w) => w.x === targetX && w.y === targetY)) {
        crashed = true;
        msg = "Tabrakan! Rover menabrak rintangan tembok.";
      } else {
        nextPos = { x: targetX, y: targetY };
        sound.playStep();
      }
    } else if (cmd.type === "COLLECT") {
      const foundCoin = puzzle.coins.find(
        (c) => c.x === curPos.x && c.y === curPos.y && !curCoins.some((co) => co.x === c.x && co.y === c.y)
      );
      if (foundCoin) {
        nextCoins.push(foundCoin);
        sound.playCoin();
        msg = "Berhasil mengoleksi 1 Data Chip!";
      } else {
        msg = "Tidak ada Data Chip di petak ini.";
      }
    }

    if (!crashed && nextPos.x === puzzle.target.x && nextPos.y === puzzle.target.y) {
      reachedTarget = true;
    }

    return { nextPos, nextDir, nextCoins, crashed, reachedTarget, msg };
  };

  const runSimulation = () => {
    if (commands.length === 0) {
      setStatusMessage("Tambahkan minimal 1 blok perintah terlebih dahulu!");
      return;
    }

    resetBoard();
    setIsRunning(true);
    setGameStatus("RUNNING");
    setStatusMessage("Menjalankan instruksi algoritma...");

    let stepIdx = 0;
    let pos = { x: puzzle.start.x, y: puzzle.start.y };
    let dir: Direction = puzzle.start.dir;
    let coins: { x: number; y: number }[] = [];

    timerRef.current = setInterval(() => {
      if (stepIdx >= commands.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRunning(false);

        // Check outcome
        if (pos.x === puzzle.target.x && pos.y === puzzle.target.y) {
          handleWin(coins.length, commands.length);
        } else {
          sound.playFail();
          setGameStatus("FAILED");
          setStatusMessage("Program selesai, tetapi Rover belum sampai di Stasiun Finis.");
        }
        return;
      }

      setCurrentStep(stepIdx);
      const res = executeStep(stepIdx, pos, dir, coins);

      pos = res.nextPos;
      dir = res.nextDir;
      coins = res.nextCoins;

      setRoverPos(pos);
      setRoverDir(dir);
      setCollectedCoins(coins);

      if (res.crashed) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRunning(false);
        sound.playFail();
        setGameStatus("CRASH");
        setStatusMessage(res.msg);
        return;
      }

      stepIdx++;
    }, 450);
  };

  const handleWin = (coinCount: number, totalMoves: number) => {
    sound.playSuccess();
    setGameStatus("WIN");

    // Scoring formula: Base 60 for reaching target + 25 for coins + 15 for par moves efficiency
    const coinPoints = Math.round((coinCount / puzzle.coins.length) * 25);
    const parBonus = totalMoves <= puzzle.parMoves ? 15 : Math.max(5, 15 - (totalMoves - puzzle.parMoves) * 2);
    const calculatedScore = Math.min(100, 60 + coinPoints + parBonus);

    let starCount = 1;
    if (calculatedScore >= 90 && coinCount === puzzle.coins.length) starCount = 3;
    else if (calculatedScore >= 75) starCount = 2;

    setScore(calculatedScore);
    setStars(starCount);
    setStatusMessage(`Hebat! Rover berhasil mencapai stasiun finis dengan efisiensi nalar yang baik.`);

    if (onSuccessScore) {
      onSuccessScore(calculatedScore, starCount);
    }
  };

  const getDirArrow = (dir: Direction) => {
    switch (dir) {
      case "NORTH":
        return <ArrowUp className="w-5 h-5 text-amber-300 stroke-[3]" />;
      case "EAST":
        return <ArrowUp className="w-5 h-5 text-amber-300 stroke-[3] rotate-90" />;
      case "SOUTH":
        return <ArrowUp className="w-5 h-5 text-amber-300 stroke-[3] rotate-180" />;
      case "WEST":
        return <ArrowUp className="w-5 h-5 text-amber-300 stroke-[3] -rotate-90" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-800 via-slate-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                Pilar: Algoritma & Dekomposisi
              </span>
              <span className="text-xs text-slate-300">Level 1 Pemula</span>
            </div>
            <h3 className="font-black text-lg text-white mt-0.5">{puzzle.name}</h3>
            <p className="text-xs text-slate-300 line-clamp-1">{puzzle.desc}</p>
          </div>
        </div>

        {/* Puzzle Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
          {ROVER_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (isRunning) return;
                setCurrentPuzzleIdx(idx);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentPuzzleIdx === idx
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Misi {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Play Area */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
        {/* Left: 2D Grid Board */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-5 border-4 border-slate-800 shadow-2xl relative">
            {/* Status bar inside board */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-2">
              <div className="flex items-center gap-1.5 font-mono">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Posisi: [{roverPos.x}, {roverPos.y}]</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Coins className="w-4 h-4" />
                <span>
                  Chip: {collectedCoins.length} / {puzzle.coins.length}
                </span>
              </div>
            </div>

            {/* 5x5 Grid */}
            <div className="grid grid-cols-5 gap-2 aspect-square bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
              {Array.from({ length: GRID_SIZE }).map((_, y) =>
                Array.from({ length: GRID_SIZE }).map((_, x) => {
                  const isRover = roverPos.x === x && roverPos.y === y;
                  const isWall = puzzle.walls.some((w) => w.x === x && w.y === y);
                  const isTarget = puzzle.target.x === x && puzzle.target.y === y;
                  const isCoin =
                    puzzle.coins.some((c) => c.x === x && c.y === y) &&
                    !collectedCoins.some((c) => c.x === x && c.y === y);

                  return (
                    <div
                      key={`cell-${x}-${y}`}
                      className={`relative rounded-xl flex items-center justify-center border transition-all duration-300 ${
                        isWall
                          ? "bg-slate-800 border-slate-700 shadow-inner"
                          : "bg-slate-900/90 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      {/* Grid coordinates label subtle */}
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono text-slate-600 select-none">
                        {x},{y}
                      </span>

                      {/* Target Flag */}
                      {isTarget && (
                        <div className="flex flex-col items-center animate-bounce">
                          <Flag className="w-6 h-6 text-rose-500 fill-rose-500" />
                          <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
                            FINIS
                          </span>
                        </div>
                      )}

                      {/* Coin / Data Chip */}
                      {isCoin && !isRover && (
                        <div className="w-6 h-6 rounded-full bg-amber-400 border-2 border-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/40 animate-pulse">
                          <Coins className="w-3.5 h-3.5 text-amber-900" />
                        </div>
                      )}

                      {/* Wall Icon */}
                      {isWall && (
                        <div className="w-full h-full rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 font-bold text-xs select-none">
                          ▓▓
                        </div>
                      )}

                      {/* Rover Agent */}
                      {isRover && (
                        <div className="relative z-10 w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-white shadow-xl shadow-emerald-500/50 flex flex-col items-center justify-center transition-all duration-300 scale-110">
                          {getDirArrow(roverDir)}
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Outcome Modal Overlay */}
            {gameStatus === "WIN" && (
              <div className="absolute inset-0 bg-slate-950/90 rounded-3xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                  <Trophy className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-white">Misi Selesai!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">{statusMessage}</p>

                <div className="flex items-center gap-1 my-3">
                  {[1, 2, 3].map((s) => (
                    <Sparkles
                      key={s}
                      className={`w-6 h-6 ${
                        s <= stars ? "text-amber-400 fill-amber-400" : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>

                <div className="bg-emerald-950/60 border border-emerald-500/30 px-4 py-2 rounded-2xl mb-4">
                  <span className="text-xs font-bold text-emerald-300">
                    Nilai Performa Simulasi: <b className="text-lg text-white">{score} / 100</b>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetBoard}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Ulangi Misi
                  </button>
                  {currentPuzzleIdx < ROVER_PUZZLES.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentPuzzleIdx((prev) => prev + 1)}
                      className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      Misi Berikutnya
                    </button>
                  )}
                </div>
              </div>
            )}

            {gameStatus === "CRASH" && (
              <div className="absolute inset-0 bg-slate-950/90 rounded-3xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 mb-3 animate-shake">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">Rover Mengalami Tabrakan!</h4>
                <p className="text-xs text-rose-300 mt-1 max-w-xs">{statusMessage}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Dekomposisikan kembali langkah algoritma untuk menghindari rintangan.
                </p>
                <button
                  type="button"
                  onClick={resetBoard}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  Coba Lagi (Reset)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Commands & Algorithmic Builder */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          {/* Action Palette */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between mb-2.5">
              <span>Palet Perintah Algoritma</span>
              <span className="text-[10px] text-slate-400 font-normal">Klik untuk menyusun ke urutan</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => addCommand("FORWARD")}
                disabled={isRunning}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <ArrowUp className="w-5 h-5 text-emerald-600" />
                <span>Maju 1 Petak</span>
              </button>

              <button
                type="button"
                onClick={() => addCommand("TURN_LEFT")}
                disabled={isRunning}
                className="p-2.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5 text-sky-600" />
                <span>Putar Kiri</span>
              </button>

              <button
                type="button"
                onClick={() => addCommand("TURN_RIGHT")}
                disabled={isRunning}
                className="p-2.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className="w-5 h-5 text-sky-600" />
                <span>Putar Kanan</span>
              </button>

              <button
                type="button"
                onClick={() => addCommand("COLLECT")}
                disabled={isRunning}
                className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Coins className="w-5 h-5 text-amber-600" />
                <span>Ambil Chip</span>
              </button>
            </div>
          </div>

          {/* Sequence Script List */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Urutan Algoritma Instruksi
                </span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  {commands.length} Langkah
                </span>
              </div>
              <button
                type="button"
                onClick={clearAllCommands}
                disabled={isRunning || commands.length === 0}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            </div>

            {/* List of blocks */}
            <div className="flex-1 max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 p-1 bg-slate-50/70 rounded-xl border border-slate-100">
              {commands.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Bot className="w-8 h-8 mb-1.5 text-slate-300" />
                  <span>Belum ada perintah. Klik tombol di atas untuk menyusun langkah.</span>
                </div>
              ) : (
                commands.map((cmd, idx) => {
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={cmd.id || idx}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isCurrent
                          ? "bg-amber-400 border-amber-500 text-slate-950 scale-[1.02] shadow-md shadow-amber-400/20"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono font-black">
                          {idx + 1}
                        </span>
                        {cmd.type === "FORWARD" && (
                          <span className="flex items-center gap-1 text-emerald-700">
                            <ArrowUp className="w-3.5 h-3.5" /> Maju 1 Petak
                          </span>
                        )}
                        {cmd.type === "TURN_LEFT" && (
                          <span className="flex items-center gap-1 text-sky-700">
                            <RotateCcw className="w-3.5 h-3.5" /> Putar Kiri 90°
                          </span>
                        )}
                        {cmd.type === "TURN_RIGHT" && (
                          <span className="flex items-center gap-1 text-sky-700">
                            <RotateCw className="w-3.5 h-3.5" /> Putar Kanan 90°
                          </span>
                        )}
                        {cmd.type === "COLLECT" && (
                          <span className="flex items-center gap-1 text-amber-700">
                            <Coins className="w-3.5 h-3.5" /> Ambil Data Chip
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCommand(idx)}
                        disabled={isRunning}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Run Controls */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={runSimulation}
                disabled={isRunning || commands.length === 0}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mengeksekusi...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Jalankan Algoritma</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetBoard}
                disabled={isRunning}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Reset Posisi Rover"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
