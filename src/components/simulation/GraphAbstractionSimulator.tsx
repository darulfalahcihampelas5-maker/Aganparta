import React, { useState } from "react";
import {
  Network,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  Info,
  ArrowRight,
  Server,
  Zap,
} from "lucide-react";
import { sound } from "./soundEffects";

interface GraphNode {
  id: string;
  name: string;
  role: string;
  x: number; // percentage
  y: number; // percentage
}

interface GraphEdge {
  from: string;
  to: string;
  latency: number; // in ms
}

interface GraphMission {
  id: number;
  title: string;
  subtitle: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNode: string;
  targetNode: string;
  optimalPath: string[];
  optimalLatency: number;
  conceptNote: string;
}

const GRAPH_MISSIONS: GraphMission[] = [
  {
    id: 1,
    title: "Misi 1: Jaringan Lab Komputer Sekolah",
    subtitle: "Peta Server Cloud Pusat -> Server Lab Sekolah",
    nodes: [
      { id: "A", name: "Server Cloud Pusat", role: "Start", x: 12, y: 50 },
      { id: "B", name: "Router Transit Utara", role: "Node B", x: 38, y: 20 },
      { id: "C", name: "Router Backbone Selatan", role: "Node C", x: 38, y: 80 },
      { id: "D", name: "Gateway Distribusi", role: "Node D", x: 65, y: 35 },
      { id: "E", name: "Edge Caching Regional", role: "Node E", x: 65, y: 75 },
      { id: "F", name: "Server Lab Sekolah", role: "Target", x: 88, y: 50 },
    ],
    edges: [
      { from: "A", to: "B", latency: 14 },
      { from: "A", to: "C", latency: 6 },
      { from: "B", to: "D", latency: 8 },
      { from: "B", to: "F", latency: 25 },
      { from: "C", to: "D", latency: 9 },
      { from: "C", to: "E", latency: 7 },
      { from: "D", to: "F", latency: 11 },
      { from: "E", to: "F", latency: 16 },
    ],
    startNode: "A",
    targetNode: "F",
    optimalPath: ["A", "C", "D", "F"],
    optimalLatency: 26,
    conceptNote: "Peta jaringan menyaring merek router & kabel fisik, berfokus hanya pada simpul & latensi.",
  },
  {
    id: 2,
    title: "Misi 2: Ring Fiber Optik Antar Kota",
    subtitle: "Pengiriman Data Dari Server Jakarta -> Surabaya",
    nodes: [
      { id: "J", name: "DC Jakarta Pusat", role: "Start", x: 12, y: 50 },
      { id: "B", name: "Hub Bandung", role: "Node B", x: 35, y: 25 },
      { id: "C", name: "Hub Cirebon", role: "Node C", x: 35, y: 75 },
      { id: "S", name: "Hub Semarang", role: "Node S", x: 65, y: 35 },
      { id: "Y", name: "Hub Yogyakarta", role: "Node Y", x: 65, y: 75 },
      { id: "SUB", name: "DC Surabaya", role: "Target", x: 88, y: 50 },
    ],
    edges: [
      { from: "J", to: "B", latency: 10 },
      { from: "J", to: "C", latency: 18 },
      { from: "B", to: "S", latency: 15 },
      { from: "C", to: "Y", latency: 12 },
      { from: "S", to: "SUB", latency: 14 },
      { from: "Y", to: "SUB", latency: 20 },
      { from: "B", to: "C", latency: 8 },
      { from: "S", to: "Y", latency: 7 },
    ],
    startNode: "J",
    targetNode: "SUB",
    optimalPath: ["J", "B", "S", "SUB"],
    optimalLatency: 39,
    conceptNote: "Abstraksi memungkinkan insinyur memilih jaringan tercepat tanpa pusing melihat peta geografis riil.",
  },
  {
    id: 3,
    title: "Misi 3: Logistik Rute Kurir Koperasi Sekolah",
    subtitle: "Rute Pengiriman Barang Dari Gudang -> Toko Sekolah",
    nodes: [
      { id: "G", name: "Gudang Utama", role: "Start", x: 12, y: 50 },
      { id: "P1", name: "Pos Transit Utara", role: "Node P1", x: 38, y: 20 },
      { id: "P2", name: "Pos Transit Barat", role: "Node P2", x: 38, y: 80 },
      { id: "P3", name: "Pos Distribusi", role: "Node P3", x: 65, y: 50 },
      { id: "T", name: "Kantin & Toko Sekolah", role: "Target", x: 88, y: 50 },
    ],
    edges: [
      { from: "G", to: "P1", latency: 12 },
      { from: "G", to: "P2", latency: 8 },
      { from: "P1", to: "P3", latency: 10 },
      { from: "P2", to: "P3", latency: 6 },
      { from: "P3", to: "T", latency: 9 },
      { from: "P1", to: "T", latency: 22 },
    ],
    startNode: "G",
    targetNode: "T",
    optimalPath: ["G", "P2", "P3", "T"],
    optimalLatency: 23,
    conceptNote: "Menggunakan abstraksi graf untuk meminimalkan durasi dan biaya bensin kurir.",
  },
  {
    id: 4,
    title: "Misi 4: Satelit Space & Edge Server Global",
    subtitle: "Rute Sinyal Satelit Orbit -> Stasiun Earth Gateway",
    nodes: [
      { id: "SAT", name: "Satelit Orbit LEO", role: "Start", x: 12, y: 50 },
      { id: "R1", name: "Relay Antariksa 1", role: "Node R1", x: 35, y: 20 },
      { id: "R2", name: "Relay Antariksa 2", role: "Node R2", x: 35, y: 80 },
      { id: "E1", name: "Ground Station A", role: "Node E1", x: 65, y: 35 },
      { id: "E2", name: "Ground Station B", role: "Node E2", x: 65, y: 75 },
      { id: "EARTH", name: "Data Center Pusat", role: "Target", x: 88, y: 50 },
    ],
    edges: [
      { from: "SAT", to: "R1", latency: 25 },
      { from: "SAT", to: "R2", latency: 20 },
      { from: "R1", to: "E1", latency: 18 },
      { from: "R2", to: "E2", latency: 30 },
      { from: "R2", to: "E1", latency: 12 },
      { from: "E1", to: "EARTH", latency: 10 },
      { from: "E2", to: "EARTH", latency: 15 },
    ],
    startNode: "SAT",
    targetNode: "EARTH",
    optimalPath: ["SAT", "R2", "E1", "EARTH"],
    optimalLatency: 42,
    conceptNote: "Mengabaikan gravitasi & cuaca fisik, hanya memodelkan graf topologi transfer sinyal.",
  },
];

interface GraphAbstractionSimulatorProps {
  onSuccessScore?: (score: number, stars: number) => void;
  isTeacherMode?: boolean;
}

export const GraphAbstractionSimulator: React.FC<GraphAbstractionSimulatorProps> = ({
  onSuccessScore,
}) => {
  const [missionIdx, setMissionIdx] = useState(0);
  const mission = GRAPH_MISSIONS[missionIdx];

  const [selectedPath, setSelectedPath] = useState<string[]>([mission.startNode]);
  const [evaluated, setEvaluated] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const currentLastNode = selectedPath[selectedPath.length - 1];

  const handleSwitchMission = (idx: number) => {
    sound.playClick();
    setMissionIdx(idx);
    const newMission = GRAPH_MISSIONS[idx];
    setSelectedPath([newMission.startNode]);
    setEvaluated(false);
    setMessage("");
  };

  const getNextAvailableNodes = (nodeId: string): { to: string; latency: number }[] => {
    return mission.edges
      .filter((e) => e.from === nodeId && !selectedPath.includes(e.to))
      .map((e) => ({
        to: e.to,
        latency: e.latency,
      }));
  };

  const handleSelectNode = (nodeId: string) => {
    if (evaluated) return;
    const available = getNextAvailableNodes(currentLastNode);
    if (!available.some((a) => a.to === nodeId)) return;

    sound.playStep();
    const newPath = [...selectedPath, nodeId];
    setSelectedPath(newPath);

    if (nodeId === mission.targetNode) {
      evaluatePath(newPath);
    }
  };

  const calculateTotalLatency = (path: string[]): number => {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = mission.edges.find((e) => e.from === from && e.to === to);
      if (edge) total += edge.latency;
    }
    return total;
  };

  const evaluatePath = (path: string[]) => {
    const totalLatency = calculateTotalLatency(path);
    setEvaluated(true);

    if (totalLatency === mission.optimalLatency) {
      sound.playSuccess();
      setScore(100);
      setStars(3);
      setMessage(
        `SEMPURNA! Rute Abstraksi Paling Optimal (${totalLatency} ms: ${path.join(" -> ")}). ${mission.conceptNote}`
      );
      if (onSuccessScore) onSuccessScore(100, 3);
    } else {
      sound.playCoin();
      const diff = totalLatency - mission.optimalLatency;
      const calcScore = Math.max(70, 100 - diff * 3);
      const starCount = calcScore >= 85 ? 2 : 1;
      setScore(calcScore);
      setStars(starCount);
      setMessage(
        `Rute terhubung (${totalLatency} ms), tetapi ada rute lebih cepat (${mission.optimalLatency} ms). Coba eksplorasi simpul lain!`
      );
      if (onSuccessScore) onSuccessScore(calcScore, starCount);
    }
  };

  const handleReset = () => {
    sound.playClick();
    setSelectedPath([mission.startNode]);
    setEvaluated(false);
    setMessage("");
  };

  const currentTotal = calculateTotalLatency(selectedPath);
  const availableNext = getNextAvailableNodes(currentLastNode);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
      {/* Banner & Mission Switcher */}
      <div className="p-5 bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">
                Pilar: Abstraksi & Graf
              </span>
              <span className="text-xs text-slate-300">Lab Virtual Klasik</span>
            </div>
            <h3 className="font-black text-lg text-white mt-0.5">{mission.title}</h3>
            <p className="text-xs text-slate-300">{mission.subtitle}</p>
          </div>
        </div>

        {/* Mission Select Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {GRAPH_MISSIONS.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSwitchMission(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                missionIdx === idx
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              Misi {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Graph Canvas */}
      <div className="p-6 bg-slate-950 flex flex-col items-center justify-center relative min-h-[420px]">
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* SVG lines for edges */}
        <svg className="w-full h-80 max-w-3xl overflow-visible relative z-0">
          {mission.edges.map((edge) => {
            const fromNode = mission.nodes.find((n) => n.id === edge.from)!;
            const toNode = mission.nodes.find((n) => n.id === edge.to)!;

            const isEdgeInPath = selectedPath.some((nodeId, idx) => {
              if (idx < selectedPath.length - 1) {
                return (
                  (selectedPath[idx] === edge.from && selectedPath[idx + 1] === edge.to) ||
                  (selectedPath[idx] === edge.to && selectedPath[idx + 1] === edge.from)
                );
              }
              return false;
            });

            const x1 = fromNode.x * 10;
            const y1 = fromNode.y * 4;
            const x2 = toNode.x * 10;
            const y2 = toNode.y * 4;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isEdgeInPath ? "#38bdf8" : "#334155"}
                  strokeWidth={isEdgeInPath ? 5 : 2}
                  strokeDasharray={isEdgeInPath ? "none" : "4 4"}
                  className="transition-all duration-300"
                />
                <rect
                  x={midX - 18}
                  y={midY - 12}
                  width="36"
                  height="22"
                  rx="6"
                  fill={isEdgeInPath ? "#0284c7" : "#1e293b"}
                  stroke={isEdgeInPath ? "#38bdf8" : "#475569"}
                  strokeWidth="1.5"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fill={isEdgeInPath ? "#ffffff" : "#94a3b8"}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {edge.latency}ms
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes layer on top */}
        <div className="w-full max-w-3xl h-80 relative -mt-80 z-10 pointer-events-none">
          {mission.nodes.map((node) => {
            const isSelected = selectedPath.includes(node.id);
            const isCurrent = currentLastNode === node.id;
            const isClickable = availableNext.some((a) => a.to === node.id);

            return (
              <div
                key={node.id}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className="absolute pointer-events-auto flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => handleSelectNode(node.id)}
                  disabled={!isClickable || evaluated}
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black transition-all duration-300 shadow-xl cursor-pointer ${
                    isCurrent
                      ? "bg-amber-400 text-slate-950 ring-4 ring-amber-300/50 scale-110 shadow-amber-400/40"
                      : isSelected
                      ? "bg-sky-500 text-white border-2 border-white shadow-sky-500/40"
                      : isClickable
                      ? "bg-slate-800 text-sky-400 border-2 border-sky-400/80 hover:bg-sky-950 hover:scale-105 animate-pulse"
                      : "bg-slate-900 text-slate-500 border border-slate-800 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span className="text-sm font-black">{node.id}</span>
                  {node.id === mission.startNode && <Server className="w-3.5 h-3.5 mt-0.5 text-emerald-300" />}
                  {node.id === mission.targetNode && <Zap className="w-3.5 h-3.5 mt-0.5 text-amber-300" />}
                </button>

                <span className="mt-1.5 text-[10px] font-bold text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 whitespace-nowrap shadow-sm">
                  {node.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control & Latency Stats Bar */}
      <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rute:
            </span>
            <div className="flex items-center gap-1 font-black text-xs text-slate-800">
              {selectedPath.map((node, i) => (
                <React.Fragment key={node}>
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                    {node}
                  </span>
                  {i < selectedPath.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Latensi:
            </span>
            <span className="text-lg font-black font-mono text-indigo-600">{currentTotal} ms</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Rute
          </button>
        </div>

        {/* Guidance / Status */}
        <div className="text-xs text-slate-600 flex items-center gap-2">
          {!evaluated ? (
            <span>Hubungkan simpul hingga mencapai <b>Node {mission.targetNode}</b>!</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-700">Skor: {score} / 100</span>
              <div className="flex items-center">
                {[1, 2, 3].map((s) => (
                  <Sparkles
                    key={s}
                    className={`w-4 h-4 ${s <= stars ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {evaluated && (
        <div
          className={`p-4 border-t flex items-start gap-3 ${
            score === 100
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          {score === 100 ? (
            <Trophy className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-bold">{message}</p>
            <p className="mt-1 text-slate-600">
              <b>Pelajaran Abstraksi:</b> Graf menyaring informasi yang tidak penting dan fokus pada data berbobot (latensi/jarak) untuk menentukan jalur tercepat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
