import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Play, RotateCcw, Pause, StepForward, Search, ListFilter, 
  BarChart3, Binary, ArrowRight, BookOpen, Lightbulb, CheckCircle2, 
  Trophy, Star, Timer, Heart, Zap, AlertCircle, Gamepad2, Volume2, VolumeX
} from 'lucide-react';
import { sound } from './soundEffects';

interface AlgorithmVisualizerProps {
  onBack: () => void;
}

type Mode = 'visualizer' | 'game';
type AlgorithmType = 'searching' | 'sorting';
type SearchingAlgo = 'linear' | 'binary';
type SortingAlgo = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick';

interface AlgoStep {
  id: number;
  text: string;
}

const ALGO_GUIDES: Record<SearchingAlgo | SortingAlgo, AlgoStep[]> = {
  linear: [
    { id: 1, text: "Mulai dari elemen pertama." },
    { id: 2, text: "Bandingkan elemen saat ini dengan target." },
    { id: 3, text: "Jika sama, target ditemukan! Berhenti." },
    { id: 4, text: "Jika tidak sama, lanjut ke elemen berikutnya." },
    { id: 5, text: "Ulangi sampai akhir data." }
  ],
  binary: [
    { id: 1, text: "Tentukan rentang pencarian (awal & akhir)." },
    { id: 2, text: "Cari titik tengah dari rentang tersebut." },
    { id: 3, text: "Bandingkan nilai tengah dengan target." },
    { id: 4, text: "Jika sama, selesai!" },
    { id: 5, text: "Jika target lebih kecil, cari di sebelah kiri." },
    { id: 6, text: "Jika target lebih besar, cari di sebelah kanan." }
  ],
  bubble: [
    { id: 1, text: "Bandingkan dua angka yang berdampingan." },
    { id: 2, text: "Jika angka kiri > kanan, tukar posisinya." },
    { id: 3, text: "Geser ke pasangan berikutnya." },
    { id: 4, text: "Ulangi proses ini sampai akhir baris." },
    { id: 5, text: "Angka terbesar akan 'mengapung' ke ujung." }
  ],
  selection: [
    { id: 1, text: "Cari angka terkecil di seluruh baris." },
    { id: 2, text: "Tukar angka terkecil dengan posisi pertama." },
    { id: 3, text: "Ulangi pencarian untuk posisi kedua, dst." },
    { id: 4, text: "Data terurut secara bertahap dari depan." }
  ],
  insertion: [
    { id: 1, text: "Ambil angka kedua sebagai angka aktif." },
    { id: 2, text: "Bandingkan dengan angka-angka di kirinya." },
    { id: 3, text: "Geser angka yang lebih besar ke kanan." },
    { id: 4, text: "Sisipkan angka aktif di posisi yang kosong." },
    { id: 5, text: "Ulangi untuk angka-angka berikutnya." }
  ],
  merge: [
    { id: 1, text: "Bagi data menjadi dua bagian terus-menerus." },
    { id: 2, text: "Hingga setiap bagian hanya berisi satu angka." },
    { id: 3, text: "Gabungkan (merge) dua bagian secara terurut." },
    { id: 4, text: "Ulangi penggabungan sampai data utuh kembali." }
  ],
  quick: [
    { id: 1, text: "Pilih satu angka sebagai poros (pivot)." },
    { id: 2, text: "Pindahkan angka < pivot ke sebelah kiri." },
    { id: 3, text: "Pindahkan angka > pivot ke sebelah kanan." },
    { id: 4, text: "Letakkan pivot di tengah (posisi final)." },
    { id: 5, text: "Lakukan proses yang sama untuk sisi kiri & kanan." }
  ]
};

const ALGO_DETAILS: Record<SearchingAlgo | SortingAlgo, { title: string, desc: string, apply: string, pros: string, cons: string }> = {
  linear: {
    title: "Linear Search",
    desc: "Mencari data satu per satu dari awal sampai akhir secara berurutan.",
    apply: "Penerapannya adalah dengan mengecek elemen pertama, lalu kedua, dan seterusnya sampai data ditemukan atau mencapai akhir kumpulan data.",
    pros: "Sederhana dan bisa digunakan pada data yang acak (tidak terurut).",
    cons: "Lambat jika jumlah data sangat banyak karena harus mengecek satu-satu."
  },
  binary: {
    title: "Binary Search",
    desc: "Mencari data dengan membagi rentang data menjadi dua bagian secara berulang.",
    apply: "Penerapannya adalah dengan menentukan titik tengah. Jika target lebih kecil cari di kiri, jika lebih besar cari di kanan.",
    pros: "Sangat cepat untuk menemukan data meskipun jumlahnya jutaan.",
    cons: "Data wajib dalam keadaan terurut (sorted) sebelum dicari."
  },
  bubble: {
    title: "Bubble Sort",
    desc: "Membandingkan dua angka yang berdekatan dan menukarnya jika urutannya salah.",
    apply: "Penerapannya adalah dengan menyisir seluruh data dan mengapungkan nilai terbesar ke posisi paling belakang secara bertahap.",
    pros: "Sangat mudah dipelajari dan dipahami cara kerjanya.",
    cons: "Paling lambat untuk data banyak karena banyak proses tukar-menukar."
  },
  selection: {
    title: "Selection Sort",
    desc: "Mencari angka terkecil di seluruh data lalu menukarnya ke posisi paling depan.",
    apply: "Penerapannya adalah dengan menandai posisi pertama sebagai yang terkecil sementara, lalu mencari yang benar-benar terkecil di sisa data untuk ditukar.",
    pros: "Proses penukaran data (swaps) lebih sedikit dibandingkan Bubble Sort.",
    cons: "Tetap lambat meskipun datanya sudah hampir terurut."
  },
  insertion: {
    title: "Insertion Sort",
    desc: "Menyisipkan setiap angka ke posisi yang tepat seperti menyusun kartu di tangan.",
    apply: "Penerapannya adalah dengan mengambil satu angka lalu menyisipkannya ke barisan angka di kirinya yang sudah terurut.",
    pros: "Sangat cepat dan efisien untuk data yang sudah hampir terurut.",
    cons: "Kurang efisien jika data awalnya sangat acak atau terbalik."
  },
  merge: {
    title: "Merge Sort",
    desc: "Membagi data menjadi bagian kecil, lalu menggabungkannya kembali secara terurut.",
    apply: "Penerapannya adalah menggunakan teknik pecah dan gabung. Data dibagi sampai terkecil lalu digabungkan kembali secara terurut.",
    pros: "Stabil dan kinerjanya konsisten untuk data dalam skala besar.",
    cons: "Membutuhkan memori tambahan untuk proses penggabungan datanya."
  },
  quick: {
    title: "Quick Sort",
    desc: "Menggunakan angka poros (pivot) untuk membagi data menjadi dua kelompok besar.",
    apply: "Penerapannya adalah dengan memilih satu angka poros, lalu mengatur agar angka yang lebih kecil ada di kiri dan yang lebih besar ada di kanan poros tersebut.",
    pros: "Algoritma pengurutan tercepat dalam banyak kasus praktis di dunia nyata.",
    cons: "Kinerjanya bisa menurun jika pemilihan angka porosnya tidak tepat."
  }
};

export const AlgorithmVisualizer: React.FC<AlgorithmVisualizerProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AlgorithmType>('searching');
  const [selectedAlgo, setSelectedAlgo] = useState<SearchingAlgo | SortingAlgo | null>(null);
  const [mode, setMode] = useState<Mode>('visualizer');
  
  // Visualizer State
  const [data, setData] = useState<number[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [isExecuting, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [explanation, setExplanation] = useState("");
  const [speed, setSpeed] = useState(3000);
  const [dataSize, setDataSize] = useState(10);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const isExecutingRef = useRef(false);
  const timerRef = useRef<any>(null);

  // Game State
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'success' | 'verifying' | 'won' | 'lost'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameTimer, setGameTimer] = useState(60);
  const [gameTimeLimit, setGameTimeLimit] = useState(60);
  const [gameTarget, setGameTarget] = useState<number | null>(null);
  const [gameData, setGameData] = useState<number[]>([]);
  const [gameMessage, setGameMessage] = useState("Siap menguji logika?");
  const [manualSelection, setManualSelection] = useState<number[]>([]);
  const [gameBinaryRange, setGameBinaryRange] = useState<{l: number, r: number}>({l: 0, r: 0});
  const [iterationsCount, setIterationsCount] = useState(0);
  const [correctFoundIndex, setCorrectFoundIndex] = useState(-1);
  const [currentKey, setCurrentKey] = useState<number | null>(null); 
  const [currentBase, setCurrentBase] = useState(0);
  const [minIdx, setMinIdx] = useState(0);
  
  // Verification Form State
  const [userIterInput, setUserIterInput] = useState("");
  const [userIdxInput, setUserIdxInput] = useState("");
  const [isVerificationWrong, setIsVerificationWrong] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  
  const gameIntervalRef = useRef<any>(null);

   // Generate random data
  const generateData = (type: AlgorithmType, algo?: string) => {
    let size = dataSize;
    if (type === 'sorting' && size > 15) size = 15;
    
    let newData = Array.from({ length: size }, () => Math.floor(Math.random() * 190) + 5);
    if (algo === 'binary') newData.sort((a, b) => a - b);
    
    setData(newData);
    setTarget(newData[Math.floor(Math.random() * newData.length)]);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
    setShowSummary(false);
    setExplanation("Siap untuk memulai simulasi.");
  };

  useEffect(() => {
    if (selectedAlgo && mode === 'visualizer') {
      generateData(activeTab, selectedAlgo);
    }
  }, [selectedAlgo, activeTab, mode, dataSize]);

  // -- VISUALIZER GENERATORS --
  const generateLinearSearchSteps = (arr: number[], target: number) => {
    const s = [];
    const d_intro = ALGO_DETAILS.linear;
    s.push({ isIntro: true, explanation: `Mari belajar ${d_intro.title}. ${d_intro.desc} ${d_intro.apply}` });
    s.push({ guideStepId: 1, explanation: "Memulai pencarian linier." });
    for (let i = 0; i < arr.length; i++) {
      const match = arr[i] === target;
      s.push({ index: i, iteration: i + 1, explanation: `Cek angka di indeks ${i} dengan angka yang dicari.`, compareIndices: [i], guideStepId: 2 });
      if (match) {
        s.push({ index: i, found: true, iteration: i + 1, explanation: `Hore data yang anda cari telah di temukan di iterasi ke ${i + 1} Indek ke ${i}`, compareIndices: [i], foundIndex: i, guideStepId: 3 });
        break;
      } else {
        s.push({ index: i, iteration: i + 1, explanation: "Bukan data yang dicari.", compareIndices: [i], guideStepId: 2 });
      }
    }
    const wasFound = s.some(step => step.found);
    if (!wasFound) {
      s.push({ explanation: "Maaf data yang anda cari tidak ditemukan di kumpulan data.", guideStepId: 5 });
    }
    const d_summary = ALGO_DETAILS.linear;
    s.push({ isSummary: true, explanation: `Pencarian Selesai. ${d_summary.title} adalah ${d_summary.desc}. Kelebihannya: ${d_summary.pros}. Kekurangannya: ${d_summary.cons}` });
    return s;
  };

  const generateBinarySearchSteps = (arr: number[], target: number) => {
    const s = []; let l = 0, r = arr.length - 1;
    const d_intro = ALGO_DETAILS.binary;
    s.push({ isIntro: true, explanation: `Mari belajar ${d_intro.title}. ${d_intro.desc} ${d_intro.apply}` });
    s.push({ left: l, right: r, guideStepId: 1, explanation: "Tentukan rentang awal pencarian." });
    let iter = 0;
    while (l <= r) {
      iter++;
      let m = Math.floor((l + r) / 2);
      s.push({ left: l, right: r, mid: m, iteration: iter, explanation: `Cek titik tengah di indeks ${m} dengan angka yang dicari.`, compareIndices: [m], activeRange: [l, r], guideStepId: 2 });
      if (arr[m] === target) { 
        s.push({ guideStepId: 4, iteration: iter, foundIndex: m, explanation: `Hore data yang anda cari telah di temukan di iterasi ke ${iter} Indek ke ${m}` }); 
        break; 
      }
      if (arr[m] < target) { 
        s.push({ guideStepId: 6, explanation: "Bukan data yang dicari. Target lebih besar, maka kita cari di sebelah kanan.", activeRange: [l, r], compareIndices: [m] }); 
        l = m + 1; 
      } else { 
        s.push({ guideStepId: 5, explanation: "Bukan data yang dicari. Target lebih kecil, maka kita cari di sebelah kiri.", activeRange: [l, r], compareIndices: [m] }); 
        r = m - 1; 
      }
    }
    const wasFound = s.some(step => step.foundIndex !== undefined && step.foundIndex !== -1);
    if (!wasFound) {
      s.push({ explanation: "Maaf data yang anda cari tidak ditemukan di kumpulan data.", guideStepId: 5 });
    }
    const d_summary = ALGO_DETAILS.binary;
    s.push({ isSummary: true, explanation: `Pencarian Selesai. ${d_summary.title} adalah ${d_summary.desc}. Kelebihannya: ${d_summary.pros}. Kekurangannya: ${d_summary.cons}` });
    return s;
  };

  const generateBubbleSortSteps = (arr: number[]) => {
    const s = []; let a = [...arr], n = a.length;
    const d_intro = ALGO_DETAILS.bubble;
    s.push({ isIntro: true, explanation: `Mari belajar ${d_intro.title}. ${d_intro.desc} ${d_intro.apply}` });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        s.push({ array: [...a], compareIndices: [j, j + 1], explanation: `Bandingkan angka di indeks ${j} dengan indeks ${j + 1}.`, guideStepId: 1 });
        if (a[j] > a[j + 1]) {
          s.push({ array: [...a], compareIndices: [j, j + 1], explanation: "Angka sebelah kiri lebih besar, maka kita tukar posisinya.", guideStepId: 2, swappedIndices: [j, j+1] });
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
        } else {
          s.push({ array: [...a], compareIndices: [j, j + 1], explanation: "Angka sudah sesuai urutan, tidak perlu ditukar.", guideStepId: 3 });
        }
      }
    }
    s.push({ explanation: "Hore data sudah berurutan", guideStepId: 5 });
    const d_summary = ALGO_DETAILS.bubble;
    s.push({ isSummary: true, explanation: `Pengurutan Selesai. ${d_summary.title} adalah ${d_summary.desc}. Kelebihannya: ${d_summary.pros}. Kekurangannya: ${d_summary.cons}` });
    return s;
  };

  const startSimulation = () => {
    if (steps.length > 0 && currentStep < steps.length) { setIsPlaying(true); return; }
    setShowSummary(false);
    let newSteps: any[] = [];
    if (selectedAlgo === 'linear') newSteps = generateLinearSearchSteps(data, target!);
    else if (selectedAlgo === 'binary') newSteps = generateBinarySearchSteps(data, target!);
    else if (selectedAlgo === 'bubble') newSteps = generateBubbleSortSteps(data);
    else if (selectedAlgo === 'selection') {
        const d_i = ALGO_DETAILS.selection;
        newSteps.push({ isIntro: true, explanation: `Mari belajar ${d_i.title}. ${d_i.desc} ${d_i.apply}` });
        let a = [...data], n = a.length;
        for (let i = 0; i < n - 1; i++) {
            let min = i; 
            newSteps.push({ array: [...a], currentBase: i, minIdx: min, guideStepId: 1, explanation: `Cari angka terkecil mulai dari indeks ${i}.` });
            for (let j = i + 1; j < n; j++) {
                newSteps.push({ array: [...a], compareIndices: [j], minIdx: min, explanation: `Bandingkan dengan angka di indeks ${j}.` });
                if (a[j] < a[min]) { min = j; newSteps.push({ array: [...a], minIdx: min, explanation: `Ditemukan angka yang lebih kecil di indeks ${min}.` }); }
            }
            if (min !== i) { 
              newSteps.push({ array: [...a], currentBase: i, minIdx: min, swapped: true, guideStepId: 2, explanation: `Tukar angka terkecil di indeks ${min} dengan indeks ${i}.` });
              [a[i], a[min]] = [a[min], a[i]]; 
            } else { newSteps.push({ array: [...a], currentBase: i, explanation: `Angka di indeks ${i} sudah merupakan yang terkecil.`, guideStepId: 4 }); }
        }
        newSteps.push({ explanation: "Hore data sudah berurutan", guideStepId: 4 });
        const d_s = ALGO_DETAILS.selection;
        newSteps.push({ isSummary: true, explanation: `Pengurutan Selesai. ${d_s.title} adalah ${d_s.desc}. Kelebihannya: ${d_s.pros}. Kekurangannya: ${d_s.cons}` });
    }
    else if (selectedAlgo === 'insertion') {
        const d_i = ALGO_DETAILS.insertion;
        newSteps.push({ isIntro: true, explanation: `Mari belajar ${d_i.title}. ${d_i.desc} ${d_i.apply}` });
        let a = [...data], n = a.length;
        for (let i = 1; i < n; i++) {
            let key = a[i], j = i - 1; 
            newSteps.push({ array: [...a], activeIdx: i, guideStepId: 1, explanation: `Ambil angka di indeks ${i} sebagai kunci.` });
            while (j >= 0 && a[j] > key) { 
                newSteps.push({ array: [...a], activeIdx: j+1, compareIndices: [j], explanation: `Geser angka ${a[j]} ke kanan karena lebih besar dari kunci.` });
                a[j+1] = a[j]; j--; 
            }
            a[j+1] = key; newSteps.push({ array: [...a], activeIdx: j+1, guideStepId: 4, explanation: `Sisipkan kunci di posisi yang benar, yaitu indeks ${j+1}.` });
        }
        newSteps.push({ explanation: "Hore data sudah berurutan", guideStepId: 4 });
        const d_s = ALGO_DETAILS.insertion;
        newSteps.push({ isSummary: true, explanation: `Pengurutan Selesai. ${d_s.title} adalah ${d_s.desc}. Kelebihannya: ${d_s.pros}. Kekurangannya: ${d_s.cons}` });
    }
    else if (selectedAlgo === 'merge') {
        const d_i = ALGO_DETAILS.merge;
        newSteps.push({ isIntro: true, explanation: `Mari belajar ${d_i.title}. ${d_i.desc} ${d_i.apply}` });
        let a = [...data];
        const merge = (arr: number[], l: number, m: number, r: number) => {
            let left = arr.slice(l, m + 1), right = arr.slice(m + 1, r + 1);
            let i = 0, j = 0, k = l;
            while (i < left.length && j < right.length) {
                newSteps.push({ array: [...arr], compareIndices: [l + i, m + 1 + j], explanation: `Bandingkan bagian kiri (${left[i]}) dengan bagian kanan (${right[j]}).` });
                if (left[i] <= right[j]) { arr[k] = left[i]; i++; } 
                else { arr[k] = right[j]; j++; }
                k++;
                newSteps.push({ array: [...arr], activeIdx: k-1, explanation: "Gabungkan kembali data secara terurut." });
            }
            while (i < left.length) { arr[k] = left[i]; i++; k++; newSteps.push({ array: [...arr], activeIdx: k-1, explanation: "Salin sisa data dari bagian kiri." }); }
            while (j < right.length) { arr[k] = right[j]; j++; k++; newSteps.push({ array: [...arr], activeIdx: k-1, explanation: "Salin sisa data dari bagian kanan." }); }
        };
        const sort = (arr: number[], l: number, r: number) => {
            if (l >= r) return;
            let m = Math.floor((l + r) / 2);
            newSteps.push({ activeRange: [l, r], explanation: `Bagi data dari indeks ${l} sampai ${r} menjadi dua bagian.` });
            sort(arr, l, m); sort(arr, m + 1, r);
            merge(arr, l, m, r);
        };
        sort(a, 0, a.length - 1);
        newSteps.push({ explanation: "Hore data sudah berurutan", guideStepId: 4 });
        const d_s = ALGO_DETAILS.merge;
        newSteps.push({ isSummary: true, explanation: `Pengurutan Selesai. ${d_s.title} adalah ${d_s.desc}. Kelebihannya: ${d_s.pros}. Kekurangannya: ${d_s.cons}` });
    }
    else if (selectedAlgo === 'quick') {
        const d_i = ALGO_DETAILS.quick;
        newSteps.push({ isIntro: true, explanation: `Mari belajar ${d_i.title}. ${d_i.desc} ${d_i.apply}` });
        let a = [...data];
        const partition = (arr: number[], low: number, high: number) => {
            let pivot = arr[high], i = low - 1;
            newSteps.push({ array: [...arr], compareIndices: [high], explanation: `Pilih angka ${pivot} di indeks ${high} sebagai poros (pivot).` });
            for (let j = low; j < high; j++) {
                newSteps.push({ array: [...arr], compareIndices: [j, high], explanation: `Bandingkan angka ${arr[j]} dengan poros ${pivot}.` });
                if (arr[j] < pivot) { i++; [arr[i], arr[j]] = [arr[j], arr[i]]; newSteps.push({ array: [...arr], swappedIndices: [i, j], explanation: `Karena ${arr[j]} lebih kecil dari poros, kita geser ke kelompok kiri.` }); }
            }
            [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
            newSteps.push({ array: [...arr], swappedIndices: [i+1, high], explanation: "Letakkan poros di posisi tengah yang benar." });
            return i + 1;
        };
        const sort = (arr: number[], low: number, high: number) => { if (low < high) { let pi = partition(arr, low, high); sort(arr, low, pi - 1); sort(arr, pi + 1, high); } };
        sort(a, 0, a.length - 1);
        newSteps.push({ explanation: "Hore data sudah berurutan", guideStepId: 4 });
        const d_s = ALGO_DETAILS.quick;
        newSteps.push({ isSummary: true, explanation: `Pengurutan Selesai. ${d_s.title} adalah ${d_s.desc}. Kelebihannya: ${d_s.pros}. Kekurangannya: ${d_s.cons}` });
    }
    
    setSteps(newSteps); setCurrentStep(0); setIsPlaying(true);
  };

  useEffect(() => {
    isExecutingRef.current = isExecuting;
    if (isExecuting && currentStep < steps.length) {
      const runStep = async () => {
        const step = steps[currentStep];
        if (step.array) setData(step.array);
        setExplanation(step.explanation);
        if (step.isSummary) setShowSummary(true);
        const voicePromise = isVoiceEnabled ? sound.speak(step.explanation) : Promise.resolve();
        const delayPromise = new Promise(resolve => {
          let waitTime = speed;
          if (step.isIntro) waitTime = 12000;
          if (step.isSummary) waitTime = 10000;
          timerRef.current = setTimeout(resolve, waitTime);
        });
        await Promise.all([voicePromise, delayPromise]);
        if (isExecutingRef.current) { setCurrentStep(prev => prev + 1); }
      };
      runStep();
    } else if (currentStep >= steps.length && steps.length > 0) { setIsPlaying(false); }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isExecuting, currentStep, steps, speed, isVoiceEnabled]);

  const reset = () => {
    setIsPlaying(false); clearTimeout(timerRef.current);
    setShowSummary(false);
    generateData(activeTab, selectedAlgo || undefined);
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.array) setData(step.array);
      setExplanation(step.explanation);
      setCurrentStep(prev => prev + 1);
    }
  };

  // -- GAME LOGIC --
  const initGame = (algo: string) => {
    setGameState('playing'); setScore(0); setLives(3); setGameTimer(gameTimeLimit); 
    setManualSelection([]); setIterationsCount(0); setCorrectFoundIndex(-1);
    setUserIterInput(""); setUserIdxInput(""); setIsVerificationWrong(false);
    setVerificationAttempts(0);
    setCurrentKey(null);

    const size = activeTab === 'searching' ? 12 : 6;
    let newData = Array.from({ length: size }, () => Math.floor(Math.random() * 190) + 5);
    if (algo === 'binary') newData.sort((a, b) => a - b);
    setGameData(newData); setGameTarget(newData[Math.floor(Math.random() * newData.length)]);
    setGameBinaryRange({ l: 0, r: newData.length - 1 });
    
    if (activeTab === 'sorting') {
        if (algo === 'insertion') {
            setCurrentKey(newData[1]);
            setManualSelection([1, 0]); // i, j
            setGameMessage("Geser atau Sisipkan?");
        } else if (algo === 'selection') {
            setCurrentBase(0);
            setMinIdx(0);
            setManualSelection([0]);
            setGameMessage("Pilih angka terkecil!");
        } else {
            setManualSelection([0, 1]);
            setGameMessage("Tukar atau Lanjut?");
        }
    }
    
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    gameIntervalRef.current = setInterval(() => {
      setGameTimer(t => {
        if (t <= 1) { endGame(false); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleLinearClick = (idx: number) => {
    if (gameState !== 'playing' || selectedAlgo !== 'linear') return;
    if (idx !== manualSelection.length) { 
      const msg = "Harus urut dari indeks 0!";
      setLives(l => l - 1); 
      setGameMessage(msg); 
      if (isVoiceEnabled) sound.speak(msg);
      if (lives <= 1) endGame(false); 
      return; 
    }
    setManualSelection([...manualSelection, idx]);
    setIterationsCount(prev => prev + 1);
    
    const val = gameData[idx];
    const match = val === gameTarget;
    
    if (match) { 
      const msg = "Selamat! Data yang anda cari berhasil ditemukan.";
      setScore(s => s + 100); 
      setCorrectFoundIndex(idx);
      setGameMessage(msg); 
      if (isVoiceEnabled) sound.speak(msg);
      endGame(true); 
    } else {
      const msg = `${val} tidak sama dengan ${gameTarget}. Lanjut ke elemen berikutnya.`;
      setGameMessage(msg);
      if (isVoiceEnabled) sound.speak(msg);
    }
  };

  const handleBinaryClick = (idx: number) => {
    if (gameState !== 'playing' || selectedAlgo !== 'binary') return;
    const mid = Math.floor((gameBinaryRange.l + gameBinaryRange.r) / 2);
    if (idx !== mid) { 
      const msg = "Salah! Gunakan rumus titik tengah: awal tambah akhir dibagi dua.";
      setLives(l => l - 1); 
      setGameMessage(msg); 
      if (isVoiceEnabled) sound.speak(msg);
      if (lives <= 1) endGame(false); 
      return; 
    }
    setIterationsCount(prev => prev + 1);
    const val = gameData[idx];
    if (val === gameTarget) { 
      const msg = "Hebat! Titik tengah tepat pada data yang dicari.";
      setScore(s => s + 200); 
      setCorrectFoundIndex(idx);
      if (isVoiceEnabled) sound.speak(msg);
      endGame(true); 
    }
    else if (val < gameTarget!) { 
      const msg = `${val} lebih kecil dari ${gameTarget}. Mari cari di sebelah kanan.`;
      setGameBinaryRange({ l: idx + 1, r: gameBinaryRange.r }); 
      setGameMessage(msg); 
      if (isVoiceEnabled) sound.speak(msg);
    }
    else { 
      const msg = `${val} lebih besar dari ${gameTarget}. Mari cari di sebelah kiri.`;
      setGameBinaryRange({ l: gameBinaryRange.l, r: idx - 1 }); 
      setGameMessage(msg); 
      if (isVoiceEnabled) sound.speak(msg);
    }
  };

  const handleSortStep = (type: 'tukar' | 'lanjut') => {
    if (gameState !== 'playing' || activeTab !== 'sorting') return;
    setIterationsCount(prev => prev + 1);
    
    if (selectedAlgo === 'insertion') {
        // ... (Insertion logic remains same as previous turn) ...
        let i = manualSelection[0], j = manualSelection[1];
        let key = currentKey!;
        
        if (type === 'tukar') { // Geser
            if (gameData[j] > key) {
                const msg = `Angka ${gameData[j]} lebih besar, geser ke kanan.`;
                if (isVoiceEnabled) sound.speak(msg);
                const newData = [...gameData];
                newData[j+1] = newData[j];
                setGameData(newData);
                setScore(s => s + 20);
                if (j > 0) {
                    setManualSelection([i, j - 1]);
                } else {
                    setGameData(d => { d[0] = key; return d; });
                    const msg = "Sudah di ujung, sisipkan angka sekarang.";
                    if (isVoiceEnabled) sound.speak(msg);
                    let nextI = i + 1;
                    if (nextI < gameData.length) {
                        setCurrentKey(gameData[nextI]);
                        setManualSelection([nextI, nextI - 1]);
                    } else { endGame(true); }
                }
            } else { 
                const msg = "Data tidak lebih besar, tidak bisa digeser.";
                setLives(l => l - 1); setGameMessage(msg); 
                if (isVoiceEnabled) sound.speak(msg);
            }
        } else { // Sisipkan (Lanjut)
            if (gameData[j] <= key) {
                const msg = "Posisi tepat, angka berhasil disisipkan.";
                if (isVoiceEnabled) sound.speak(msg);
                const newData = [...gameData];
                newData[j+1] = key;
                setGameData(newData);
                setScore(s => s + 30);
                let nextI = i + 1;
                if (nextI < gameData.length) {
                    setCurrentKey(gameData[nextI]);
                    setManualSelection([nextI, nextI - 1]);
                } else { endGame(true); }
            } else { 
                const msg = "Posisi belum tepat.";
                setLives(l => l - 1); setGameMessage(msg); 
                if (isVoiceEnabled) sound.speak(msg);
            }
        }
    } else if (selectedAlgo === 'selection') {
        if (type === 'tukar') { // Swap Min with Base
            const newData = [...gameData];
            [newData[currentBase], newData[minIdx]] = [newData[minIdx], newData[currentBase]];
            setGameData(newData);
            setScore(s => s + 50);
            const msg = `Tukar angka terkecil dengan posisi ${currentBase}.`;
            if (isVoiceEnabled) sound.speak(msg);
            
            let nextBase = currentBase + 1;
            if (nextBase < gameData.length - 1) {
                setCurrentBase(nextBase);
                setMinIdx(nextBase);
                setManualSelection([nextBase]);
                setGameMessage("Pilih angka terkecil!");
            } else { 
                setGameMessage("Selesai!");
                endGame(true); 
            }
        } else { // Lanjut - Just for interaction, doesn't do much in selection
            setGameMessage("Tukar untuk menempatkan angka terkecil.");
        }
    } else { // Bubble logic
        const i = manualSelection[0], j = manualSelection[1];
        const shouldSwap = gameData[i] > gameData[j];
        if ((type === 'tukar' && shouldSwap) || (type === 'lanjut' && !shouldSwap)) {
            if (type === 'tukar') {
                const msg = `Benar! ${gameData[i]} lebih besar dari ${gameData[j]}, maka kita tukar.`;
                const newData = [...gameData]; [newData[i], newData[j]] = [newData[j], newData[i]];
                setGameData(newData); setScore(s => s + 20); setGameMessage(msg);
                if (isVoiceEnabled) sound.speak(msg);
            } else { 
                const msg = "Benar! Posisi sudah sesuai urutan.";
                setScore(s => s + 10); setGameMessage(msg); 
                if (isVoiceEnabled) sound.speak(msg);
            }
        } else { 
            const msg = "Ups! Langkahmu kurang tepat.";
            setLives(l => l - 1); setGameMessage(msg); 
            if (isVoiceEnabled) sound.speak(msg);
            if (lives <= 1) endGame(false); return; 
        }
        
        let nextI = i + 1;
        if (nextI >= gameData.length - 1) nextI = 0;
        setManualSelection([nextI, nextI + 1]);
        const isSorted = gameData.every((v, k) => k === 0 || v >= gameData[k-1]);
        if (isSorted && type === 'lanjut') { 
          const msg = "Selamat! Data yang acak telah anda urutkan dengan sempurna.";
          setScore(s => s + 200); 
          setCorrectFoundIndex(0);
          if (isVoiceEnabled) sound.speak(msg);
          endGame(true); 
        }
    }
  };

  const endGame = (win: boolean) => { 
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    if (win) {
      setGameState('success');
      if (isVoiceEnabled) sound.speak("Selamat! Kamu berhasil menyelesaikan tantangan.");
    } else {
      setGameState('lost');
      if (isVoiceEnabled) sound.speak("Waktu habis atau nyawa habis. Coba lagi ya!");
    }
  };

  const verifyResults = () => {
    const iterMatch = parseInt(userIterInput) === iterationsCount;
    const idxMatch = activeTab === 'sorting' ? true : parseInt(userIdxInput) === correctFoundIndex;
    
    if (iterMatch && idxMatch) {
      const msg = "Luar biasa! Analisis kamu sangat akurat. Kamu menang!";
      setGameState('won');
      setScore(s => s + 100);
      if (isVoiceEnabled) sound.speak(msg);
    } else {
      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        const msg = `Kesempatan habis. Jawaban yang benar adalah ${iterationsCount} iterasi ${activeTab === 'searching' ? `dan indeks ke ${correctFoundIndex}` : ''}. Silahkan pelajari lagi!`;
        setGameMessage(msg);
        if (isVoiceEnabled) sound.speak(msg);
        setGameState('lost');
      } else {
        const msg = `Maaf, analisis masih belum tepat. Sisa kesempatan: ${3 - newAttempts}.`;
        setIsVerificationWrong(true);
        setGameMessage(msg);
        if (isVoiceEnabled) sound.speak(msg);
      }
    }
  };

  const renderGameMode = () => {
    if (!selectedAlgo) return <div className="text-center py-20 text-slate-400 flex-1 flex flex-col justify-center"><Gamepad2 className="w-16 h-16 mx-auto opacity-10 mb-4"/><h3 className="text-lg font-black uppercase">Siap Bermain?</h3><p className="text-[10px] tracking-widest">Pilih materi pengurutan atau pencarian</p></div>;
    
    if (gameState === 'idle') return (
      <div className="text-center py-10 flex-1 flex flex-col justify-center gap-6">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2"/>
        <div>
          <h3 className="text-xl font-black mb-1 uppercase">{selectedAlgo.toUpperCase()} CHALLENGE</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atur Waktu Permainan</p>
        </div>
        
        <div className="flex justify-center gap-2 items-center">
          <input 
            type="number" 
            min="0" 
            max="10" 
            value={gameTimeLimit === 0 ? "" : Math.floor(gameTimeLimit / 60)} 
            onChange={(e) => {
                const val = e.target.value;
                setGameTimeLimit(val === "" ? 0 : Math.min(10, Math.max(0, parseInt(val))) * 60);
            }}
            placeholder="1-10"
            className="w-16 px-3 py-2 rounded-xl border-2 border-slate-200 font-black text-center text-sm"
          />
          <span className="text-[10px] font-black text-slate-500 uppercase">Menit (0=Tanpa Batas)</span>
        </div>

        <button onClick={() => initGame(selectedAlgo)} className="mx-auto px-10 py-4 bg-[#85cc00] rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">MULAI GAME</button>
      </div>
    );

    if (gameState === 'success') return (
      <div className="text-center py-10 flex-1 flex flex-col justify-center gap-4 bg-white rounded-3xl p-6 shadow-inner">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10 text-emerald-600"/>
        </div>
        <h3 className="text-xl font-black uppercase text-slate-800">Selamat!</h3>
        <p className="text-xs font-bold text-slate-500 px-6">{gameMessage}</p>
        <button 
          onClick={() => setGameState('verifying')}
          className="mx-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform mt-4"
        >
          LANJUT ANALISIS
        </button>
      </div>
    );

    if (gameState === 'verifying') return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2">
        <div className="text-center py-6 flex flex-col justify-center gap-4 bg-slate-50 rounded-3xl p-6 border-2 border-indigo-100 min-h-full">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-8 h-8 text-indigo-600"/>
          </div>
          <h3 className="text-xl font-black uppercase">Analisis Hasil</h3>
          <p className="text-xs font-bold text-slate-500">Hebat! Sekarang isi analisis algoritmanya:</p>
          
          <div className="space-y-4 max-w-xs mx-auto w-full mt-4">
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Berapa jumlah iterasi?</label>
              <input 
                type="number" 
                value={userIterInput} 
                onChange={(e) => setUserIterInput(e.target.value)}
                placeholder="Contoh: 5"
                className={`w-full px-4 py-3 rounded-xl border-2 font-black transition-all outline-none ${isVerificationWrong ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-500'}`}
              />
            </div>

            {activeTab === 'searching' && (
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Data ditemukan di Indeks?</label>
                <input 
                  type="number" 
                  value={userIdxInput} 
                  onChange={(e) => setUserIdxInput(e.target.value)}
                  placeholder="Indeks (mulai 0)"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-black transition-all outline-none ${isVerificationWrong ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-500'}`}
                />
              </div>
            )}

            <button 
              onClick={verifyResults}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform mt-2"
            >
              VERIFIKASI
            </button>
          </div>
        </div>
      </div>
    );

    if (gameState === 'won' || gameState === 'lost') return <div className="text-center py-10 flex-1 flex flex-col justify-center"><div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${gameState === 'won' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{gameState === 'won' ? <Trophy className="w-10 h-10"/> : <AlertCircle className="w-10 h-10"/>}</div><h3 className="text-2xl font-black uppercase">{gameState === 'won' ? 'BERHASIL!' : 'COBA LAGI'}</h3><p className="font-bold text-slate-500 mt-1">Skor: {score}</p><div className="flex justify-center gap-3 mt-6"><button onClick={() => initGame(selectedAlgo)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">MAIN LAGI</button><button onClick={() => setGameState('idle')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px]">MENU</button></div></div>;

    return (
      <div className="flex-1 flex flex-col h-full gap-2 overflow-hidden">
        {/* Game Board (Top) */}
        <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-2 flex flex-col justify-center gap-1 overflow-hidden">
           <div className="flex flex-wrap items-center justify-center gap-2 overflow-y-auto scrollbar-hide p-1">
             {gameData.map((val, idx) => {
                const isChecked = manualSelection.includes(idx);
                const isMin = idx === minIdx;
                const isBase = idx === currentBase;
                const isOutRange = selectedAlgo === 'binary' && (idx < gameBinaryRange.l || idx > gameBinaryRange.r);
                
                let style = "bg-white border-slate-200 text-slate-800";
                if (selectedAlgo === 'selection') {
                    if (isBase) style = "bg-indigo-600 text-white border-indigo-700";
                    else if (isMin) style = "bg-amber-400 text-slate-950 border-amber-500 scale-105";
                } else if (selectedAlgo === 'linear' && isChecked) style = "bg-indigo-600 border-indigo-700 text-white";
                else if (activeTab === 'sorting' && isChecked) style = "bg-amber-400 border-amber-500 text-slate-950 scale-105";
                
                if (isOutRange) style = "bg-slate-100 border-slate-100 text-slate-300 opacity-30 pointer-events-none";
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-0.5">
                    <motion.button layout onClick={() => {
                        if (selectedAlgo === 'selection' && idx >= currentBase) {
                            setMinIdx(idx);
                            const msg = `Angka ${val} dipilih sebagai terkecil.`;
                            if (isVoiceEnabled) sound.speak(msg);
                        } else if (selectedAlgo === 'linear') {
                            handleLinearClick(idx);
                        } else if (selectedAlgo === 'binary') {
                            handleBinaryClick(idx);
                        }
                    }} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center text-xs font-black transition-all ${style}`}>{val}</motion.button>
                    <span className="text-[7px] font-bold text-slate-400">Idx {idx}</span>
                  </div>
                );
             })}
           </div>
        </div>

        {/* Footer / Controls (Bottom) */}
        <div className="flex flex-col gap-1 shrink-0 pb-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 shrink-0">
             <StatBox icon={<Timer className="w-3 h-3" />} label="Waktu" value={`${Math.floor(gameTimer / 60)}m ${gameTimer % 60}s`} color="text-sky-600" />
             <StatBox icon={<Trophy className="w-3 h-3" />} label="Skor" value={score.toString()} color="text-amber-600" />
             <StatBox icon={<Heart className="w-3 h-3" />} label="Nyawa" value={lives.toString()} color="text-rose-600" />
             <StatBox icon={<Zap className="w-3 h-3" />} label="Iterasi" value={iterationsCount.toString()} color="text-indigo-600" />
          </div>
          <div className="p-1.5 bg-slate-900 rounded-xl text-white shadow-lg flex items-center gap-2 shrink-0"><div className="w-5 h-5 bg-[#85cc00] rounded-lg flex items-center justify-center shrink-0"><Zap className="w-2.5 h-2.5 text-slate-950"/></div><p className="text-[9px] font-bold leading-tight truncate">{gameMessage}</p></div>
          
        {activeTab === 'sorting' && (
            <div className="flex justify-center gap-2 shrink-0">
                <button onClick={() => handleSortStep('tukar')} className="px-5 py-2 bg-rose-600 text-white rounded-lg font-black text-[9px] uppercase shadow">
                  {selectedAlgo === 'insertion' ? 'GESER' : (selectedAlgo === 'selection' ? 'TUKAR' : 'TUKAR')}
                </button>
                <button onClick={() => handleSortStep('lanjut')} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase shadow">
                  {selectedAlgo === 'insertion' ? 'SISIPKAN' : (selectedAlgo === 'selection' ? 'PILIH' : 'LANJUT')}
                </button>
            </div>
        )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[92vh] w-[95vw] sm:w-[90vw] md:w-[85vw] mx-auto bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-xl text-white group"><ArrowLeft className="w-5 h-5"/></button>
          <div className="min-w-0"><h2 className="text-lg sm:text-2xl font-black text-white uppercase truncate flex items-center gap-2"><Binary className="w-6 h-6 text-indigo-400"/>Simulator</h2><p className="text-[10px] text-slate-400 font-medium truncate">Berpikir Komputasional</p></div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto items-center gap-2">
           <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className={`p-2.5 rounded-lg transition-all ${isVoiceEnabled ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-400'}`}>{isVoiceEnabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}</button>
           <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>
           <button onClick={() => setMode('visualizer')} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-2 ${mode === 'visualizer' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><Search className="w-4 h-4"/> VISUAL</button>
           <button onClick={() => { setMode('game'); setGameState('idle'); }} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-2 ${mode === 'game' ? 'bg-[#85cc00] text-slate-950' : 'text-slate-400'}`}><Gamepad2 className="w-4 h-4"/> GAME</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className={`w-full lg:w-72 bg-slate-50 lg:border-r border-slate-100 p-4 flex flex-col gap-3 shrink-0 ${selectedAlgo && 'hidden lg:flex'}`}>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Algoritma</h4>
          <div className="flex bg-slate-200/50 p-1.5 rounded-xl mb-2">
              <button onClick={() => { setActiveTab('searching'); setSelectedAlgo(null); }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black ${activeTab === 'searching' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>SEARCHING</button>
              <button onClick={() => { setActiveTab('sorting'); setSelectedAlgo(null); }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black ${activeTab === 'sorting' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>SORTING</button>
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
            {activeTab === 'searching' ? (
              <><AlgoButton id="linear" label="Linear Search" icon={<ListFilter className="w-5 h-5"/>} active={selectedAlgo === 'linear'} onClick={() => setSelectedAlgo('linear')}/><AlgoButton id="binary" label="Binary Search" icon={<Binary className="w-5 h-5"/>} active={selectedAlgo === 'binary'} onClick={() => setSelectedAlgo('binary')}/></>
            ) : (
              <><AlgoButton id="bubble" label="Bubble Sort" icon={<BarChart3 className="w-5 h-5"/>} active={selectedAlgo === 'bubble'} onClick={() => setSelectedAlgo('bubble')}/><AlgoButton id="selection" label="Selection Sort" icon={<BarChart3 className="w-5 h-5"/>} active={selectedAlgo === 'selection'} onClick={() => setSelectedAlgo('selection')}/><AlgoButton id="insertion" label="Insertion Sort" icon={<BarChart3 className="w-5 h-5"/>} active={selectedAlgo === 'insertion'} onClick={() => setSelectedAlgo('insertion')}/><AlgoButton id="merge" label="Merge Sort" icon={<BarChart3 className="w-5 h-5"/>} active={selectedAlgo === 'merge'} onClick={() => setSelectedAlgo('merge')}/><AlgoButton id="quick" label="Quick Sort" icon={<BarChart3 className="w-5 h-5"/>} active={selectedAlgo === 'quick'} onClick={() => setSelectedAlgo('quick')}/></>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-8 overflow-hidden bg-white flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div key={selectedAlgo || mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
              {mode === 'game' ? renderGameMode() : (selectedAlgo ? <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div className="lg:hidden flex justify-between items-center bg-slate-100 p-2 rounded-xl shrink-0">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{selectedAlgo}</span>
                  <button onClick={() => setSelectedAlgo(null)} className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-slate-200 uppercase">Ganti</button>
                </div>
                <div className="flex flex-col xl:flex-row items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 shrink-0">
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
                    <button onClick={reset} className="p-1.5 rounded-lg hover:bg-white"><RotateCcw className="w-4 h-4"/></button>
                    <button onClick={startSimulation} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-black text-[9px] uppercase shadow-md flex items-center gap-2">{isExecuting ? <Pause className="w-3 h-3 fill-white"/> : <Play className="w-3 h-3 fill-white"/>}{isExecuting ? 'Pause' : 'Mulai'}</button>
                    <button onClick={stepForward} disabled={isExecuting} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30"><StepForward className="w-4 h-4"/></button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase">Cari</span>
                      {activeTab === 'searching' ? <input type="number" value={target ?? ''} onChange={(e) => setTarget(parseInt(e.target.value))} disabled={isExecuting} className="w-10 bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] font-black text-indigo-600" /> : <div className="w-10 h-4 bg-slate-100 rounded"></div>}
                    </div>
                    <div className="flex flex-col flex-1 sm:flex-none">
                      <span className="text-[7px] font-black text-slate-400 uppercase">Data: {dataSize}</span>
                      <input type="range" min="5" max="30" step="1" value={dataSize} onChange={(e) => setDataSize(parseInt(e.target.value))} disabled={isExecuting} className="w-full sm:w-20 accent-indigo-600 h-1"/>
                    </div>
                    <div className="flex flex-col flex-1 sm:flex-none">
                      <span className="text-[7px] font-black text-slate-400 uppercase">Kec</span>
                      <input type="range" min="100" max="5000" step="100" value={5100 - speed} onChange={(e) => setSpeed(5100 - parseInt(e.target.value))} className="w-full sm:w-20 accent-indigo-600 h-1"/>
                    </div>
                    <div className="text-right"><div className="text-[7px] font-black text-slate-400 uppercase">Step</div><div className="text-[10px] font-black text-indigo-600">{currentStep}/{steps.length || '?'}</div></div>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl text-white shadow-md flex items-start gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><Lightbulb className="w-3 h-3"/></div>
                  <div className="min-w-0 flex-1"><h4 className="text-[7px] font-black uppercase opacity-70">Status</h4><p className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-2">{explanation}</p></div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="relative flex-1 w-full flex items-end justify-between gap-0.5 sm:gap-1 px-1 sm:px-2 border-b-2 border-slate-100 pb-1 bg-slate-50/30 rounded-xl p-2 sm:p-4 overflow-hidden">
                    {data.map((val, idx) => { 
                      let color = "bg-indigo-500";
                      if (activeTab === 'searching') { 
                        if (steps[currentStep-1]?.foundIndex === idx) color = "bg-emerald-500 scale-105 ring-2 ring-emerald-100"; 
                        else if (steps[currentStep-1]?.compareIndices?.includes(idx)) color = "bg-amber-500 scale-105"; 
                        else if (steps[currentStep-1]?.activeRange && (idx < steps[currentStep-1].left || idx > steps[currentStep-1].right)) color = "bg-slate-200 opacity-20"; 
                      } else { 
                        if (steps[currentStep-1]?.compareIndices?.includes(idx)) color = "bg-amber-500"; 
                        else if (steps[currentStep-1]?.swappedIndices?.includes(idx) || steps[currentStep-1]?.swapped) color = "bg-rose-500 scale-105"; 
                        else if (steps[currentStep-1]?.activeIdx === idx || steps[currentStep-1]?.currentBase === idx) color = "bg-indigo-700 ring-2 ring-indigo-100"; 
                      } 
                      return (<motion.div key={idx} layout className={`flex-1 rounded-t relative ${color} transition-all duration-300`} style={{ height: `${(val / 200) * 85 + 10}%` }}><div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 text-[6px] sm:text-[8px] font-black text-slate-800 bg-white/90 px-0.5 rounded border border-slate-100">{val}</div></motion.div>); 
                    })}
                  </div>
                  <div className="flex justify-between gap-0.5 sm:gap-1 px-1 sm:px-2 mt-1 shrink-0">
                    {data.map((_, idx) => (<div key={idx} className="flex-1 text-center text-[6px] font-bold text-slate-400">{idx}</div>))}
                  </div>
                </div>
                <div className="h-24 sm:h-32 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden">
                  <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden h-full">
                    <div className="p-1.5 bg-slate-50 border-b border-slate-100 font-black text-[7px] sm:text-[8px] uppercase tracking-widest text-slate-800 flex items-center gap-2 shrink-0"><BookOpen className="w-3 h-3 text-indigo-600"/>Langkah</div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-hide">
                      {ALGO_GUIDES[selectedAlgo].map(s => { 
                        const active = steps[currentStep-1]?.guideStepId === s.id; 
                        return (<div key={s.id} className={`flex items-start gap-1.5 p-1.5 rounded-lg transition-all ${active ? 'bg-indigo-50 border border-indigo-100' : 'opacity-40'}`}><div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[6px] font-black shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{s.id}</div><p className={`text-[7px] sm:text-[9px] font-bold ${active ? 'text-indigo-900' : 'text-slate-600'} leading-tight`}>{s.text}</p></div>); 
                      })}
                    </div>
                  </div>
                  <div className="relative">
                    {showSummary ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-indigo-900 text-white p-2 rounded-xl shadow-lg overflow-y-auto scrollbar-hide">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-[#85cc00] rounded flex items-center justify-center shrink-0"><BookOpen className="w-3 h-3 text-slate-900"/></div><h3 className="text-[9px] font-black uppercase">Rangkuman</h3></div>
                          <div className="px-2 py-0.5 bg-white/10 rounded text-[6px] font-black uppercase text-amber-400 border border-white/5">💡 Tip: Indeks Mulai 0</div>
                        </div>
                        <p className="text-[8px] font-bold text-slate-100 mb-1 leading-tight">{ALGO_DETAILS[selectedAlgo].desc}</p>
                        <div className="bg-white/10 p-1.5 rounded-lg mb-1.5 border border-white/5">
                          <h5 className="text-[6px] font-black text-[#85cc00] uppercase mb-0.5">Kenapa Indeks Mulai 0?</h5>
                          <p className="text-[6px] font-medium text-slate-300 leading-tight">Di komputer, indeks adalah "jarak" dari awal data. Data pertama jaraknya 0, data kedua jaraknya 1, dst. Itulah kenapa indeks selalu (Urutan - 1).</p>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-white/5 p-1.5 rounded-lg"><h5 className="text-[6px] font-black text-emerald-400 uppercase">Pro</h5><p className="text-[6px] font-bold text-slate-200 leading-tight">{ALGO_DETAILS[selectedAlgo].pros}</p></div>
                          <div className="bg-white/5 p-1.5 rounded-lg"><h5 className="text-[6px] font-black text-rose-400 uppercase">Con</h5><p className="text-[6px] font-bold text-slate-200 leading-tight">{ALGO_DETAILS[selectedAlgo].cons}</p></div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center p-2">
                        {currentStep >= steps.length && steps.length > 0 ? (<div className="space-y-1.5"><Trophy className="w-5 h-5 text-emerald-600 mx-auto"/><p className="text-[8px] font-black uppercase">Selesai!</p><button onClick={reset} className="px-3 py-1 bg-emerald-600 text-white rounded font-black uppercase text-[7px]">Ulangi</button></div>) : (<div className="opacity-20 flex flex-col items-center"><Binary className="w-6 h-6 text-slate-400 mb-0.5"/><p className="text-[7px] font-black uppercase tracking-widest">Siap</p></div>)}
                      </div>
                    )}
                  </div>
                </div>
              </div> : <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10"><Binary className="w-10 h-10 opacity-10 mb-2"/><h3 className="text-sm font-black text-slate-300 uppercase">Pilih Algoritma</h3><p className="text-[8px] font-medium opacity-60 tracking-widest uppercase">Klik menu di samping</p></div>)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const AlgoButton = ({ id, label, icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex-shrink-0 lg:w-full flex items-center gap-2 p-2 rounded-lg text-[9px] font-black transition-all group ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 bg-white lg:bg-transparent lg:hover:bg-white'}`}><div className={`p-1.5 rounded-md ${active ? 'bg-white/20' : 'bg-slate-200/50'}`}>{icon}</div><span className="flex-1 text-left">{label}</span>{active && <ArrowRight className="hidden lg:block w-3 h-3 animate-pulse"/>}</button>
);

const StatBox = ({ icon, label, value, color }: any) => (
    <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5">
        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
        <div className="min-w-0">
            <div className="text-[6px] font-black text-slate-400 uppercase truncate">{label}</div>
            <div className={`text-[10px] font-black ${color} truncate`}>{value}</div>
        </div>
    </div>
);
