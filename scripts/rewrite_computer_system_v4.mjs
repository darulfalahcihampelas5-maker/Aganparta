import fs from "fs";

let content = fs.readFileSync("src/components/simulation/MiniSimulators.tsx", "utf8");

const startMatch = "export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";
const endMatch = "export const DataAnalysisSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";

const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch);

if (startIndex !== -1 && endIndex !== -1) {
  const newComponent = `// -- HELPER: Interactive 3D Wrapper --
const Interactive3DView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [rot, setRot] = useState({ x: 20, y: -30 });
   const [isDragging, setIsDragging] = useState(false);
   const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

   const handlePointerDown = (e: React.PointerEvent) => {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
   };
   const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setRot(prev => ({ x: prev.x - dy * 0.6, y: prev.y + dx * 0.6 }));
      setLastPos({ x: e.clientX, y: e.clientY });
   };
   const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
   };

   return (
      <div className="w-full h-full relative" style={{ perspective: 1200 }}>
         <div className="absolute top-4 w-full flex justify-center z-20 pointer-events-none">
            <span className="bg-slate-800/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-emerald-400 font-bold tracking-widest animate-pulse border border-emerald-500/30">
               Sentuh & Geser Untuk Memutar 3D
            </span>
         </div>
         <div 
            className="w-full h-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ transform: \`rotateX(\${rot.x}deg) rotateY(\${rot.y}deg)\`, transformStyle: 'preserve-3d' }}
         >
            {children}
         </div>
      </div>
   );
};

// -- HELPER: Realistic CSS 3D Components --
const RealisticComponent: React.FC<{ type: string }> = ({ type }) => {
   if (type === 'cpu') {
      return (
         <div className="w-32 h-32 bg-slate-300 rounded border-b-4 border-r-4 border-slate-400 shadow-2xl relative flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 bg-yellow-600 rounded opacity-20 transform translate-z-[-2px]"></div>
            <div className="w-20 h-20 bg-slate-200 border border-slate-400 rounded-sm flex items-center justify-center shadow-inner relative overflow-hidden transform translate-z-4">
               <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#000_2px,#000_4px)]"></div>
               <span className="font-black text-slate-500 text-xs tracking-tighter z-10">CORE i9</span>
            </div>
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600 shadow-sm transform translate-z-2"></div>
         </div>
      );
   }
   if (type === 'ram') {
      return (
         <div className="w-48 h-12 bg-emerald-800 rounded-sm shadow-2xl relative border-b-4 border-yellow-500 flex items-center justify-evenly px-2" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute top-0 left-2 w-2 h-1 bg-emerald-900 rounded-b-sm transform translate-z-2"></div>
            <div className="absolute top-0 right-2 w-2 h-1 bg-emerald-900 rounded-b-sm transform translate-z-2"></div>
            {[...Array(8)].map((_, i) => (
               <div key={i} className="w-4 h-6 bg-slate-900 rounded-sm shadow-sm border border-slate-700 transform translate-z-4"></div>
            ))}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-white/90 text-[6px] font-mono flex items-center justify-center rounded-sm shadow-lg transform translate-z-6">16GB DDR4</div>
         </div>
      );
   }
   if (type === 'gpu') {
      return (
         <div className="w-56 h-20 bg-slate-900 rounded-md shadow-2xl relative flex items-center justify-around border-t-4 border-b-[8px] border-slate-800 border-b-slate-950" style={{ transformStyle: 'preserve-3d' }}>
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-800 relative overflow-hidden shadow-inner transform translate-z-4">
               <div className="absolute inset-0 flex items-center justify-center animate-[spin_3s_linear_infinite]"><div className="w-full h-1.5 bg-slate-700/50 absolute"></div><div className="w-1.5 h-full bg-slate-700/50 absolute"></div></div>
               <div className="w-6 h-6 bg-slate-950 rounded-full border border-slate-600 z-10"></div>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-800 relative overflow-hidden shadow-inner transform translate-z-4">
               <div className="absolute inset-0 flex items-center justify-center animate-[spin_3s_linear_infinite]"><div className="w-full h-1.5 bg-slate-700/50 absolute"></div><div className="w-1.5 h-full bg-slate-700/50 absolute"></div></div>
               <div className="w-6 h-6 bg-slate-950 rounded-full border border-slate-600 z-10"></div>
            </div>
            <div className="absolute -bottom-2 left-6 w-16 h-2 bg-yellow-500 rounded-b-sm transform translate-z-2"></div>
            <div className="absolute -top-1 right-4 w-12 h-1 bg-red-500 rounded-t-lg transform translate-z-2"></div>
            <div className="absolute right-[-10px] top-4 w-2 h-12 bg-slate-700 shadow-md transform rotate-y-90 origin-left"></div>
         </div>
      );
   }
   if (type === 'storage') {
      return (
         <div className="w-24 h-32 bg-slate-900 border-2 border-slate-700 rounded-sm shadow-2xl flex flex-col items-center justify-center relative" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute left-[-4px] top-0 w-1 h-full bg-slate-800 transform rotate-y-90 origin-right"></div>
            <div className="w-20 h-24 bg-blue-600 rounded-sm border border-blue-400 flex flex-col items-center p-2 shadow-inner transform translate-z-2">
               <div className="w-full h-2 bg-white/20 mb-2"></div>
               <span className="text-white font-black text-[12px]">SSD NAND</span>
               <span className="text-white/80 font-bold text-[8px] mt-1">1TB</span>
            </div>
            <div className="absolute bottom-0 left-3 w-6 h-2 bg-yellow-500 transform translate-z-1"></div>
         </div>
      );
   }
   if (type === 'motherboard') {
      return (
         <div className="w-72 h-72 bg-slate-800 border-4 border-emerald-900 rounded shadow-2xl relative overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,#10b981_10px,#10b981_11px),repeating-linear-gradient(0deg,transparent,transparent_10px,#10b981_10px,#10b981_11px)]"></div>
            <div className="absolute top-8 left-8 w-28 h-28 border-4 border-slate-600 bg-slate-900 flex items-center justify-center rounded-sm transform translate-z-4 shadow-lg">
               <div className="w-20 h-20 border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
                  <span className="text-[8px] text-slate-500 font-mono">CPU SOCKET</span>
               </div>
            </div>
            <div className="absolute top-8 right-12 w-4 h-32 border-2 border-slate-600 bg-slate-700 rounded-sm transform translate-z-4 shadow-md flex flex-col justify-between py-1"><div className="w-full h-1 bg-slate-900"></div></div>
            <div className="absolute top-8 right-6 w-4 h-32 border-2 border-slate-600 bg-slate-700 rounded-sm transform translate-z-4 shadow-md flex flex-col justify-between py-1"><div className="w-full h-1 bg-slate-900"></div></div>
            <div className="absolute bottom-20 left-8 w-36 h-6 border-2 border-slate-700 bg-slate-900 rounded-sm flex items-center px-1 transform translate-z-6 shadow-md">
               <div className="w-full h-1 bg-yellow-600/50"></div>
            </div>
            <div className="absolute bottom-6 right-12 w-16 h-16 border-2 border-slate-600 bg-slate-950 flex items-center justify-center shadow-xl transform translate-z-6">
               <div className="w-10 h-10 border border-slate-700 bg-slate-800 transform rotate-45"></div>
            </div>
         </div>
      );
   }
   if (type === 'keyboard') {
      return (
         <div className="w-80 h-28 bg-slate-800 rounded-lg shadow-2xl relative border-b-[6px] border-slate-950 p-2" style={{ transformStyle: 'preserve-3d' }}>
            <div className="w-full h-full border border-slate-700 rounded-md grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 p-1 bg-slate-900 transform translate-z-2 shadow-inner">
               {[...Array(60)].map((_, i) => (
                  <div key={i} className="bg-slate-700 rounded-sm border-b-2 border-slate-950 hover:bg-slate-600 transition-colors"></div>
               ))}
            </div>
         </div>
      );
   }
   if (type === 'mouse') {
      return (
         <div className="w-16 h-28 bg-slate-800 rounded-full shadow-2xl relative border-b-4 border-slate-950 flex flex-col items-center pt-2" style={{ transformStyle: 'preserve-3d' }}>
            <div className="w-full h-10 flex gap-1 px-1 transform translate-z-2">
               <div className="flex-1 bg-slate-700 rounded-tl-full border-b border-r border-slate-900"></div>
               <div className="w-2 h-6 bg-slate-900 rounded-full mt-2 shadow-inner flex-shrink-0"></div>
               <div className="flex-1 bg-slate-700 rounded-tr-full border-b border-l border-slate-900"></div>
            </div>
            <div className="absolute bottom-4 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center blur-sm"><div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div></div>
         </div>
      );
   }
   if (type === 'monitor') {
      return (
         <div className="flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
            <div className="w-64 h-40 bg-slate-900 rounded-sm border-4 border-slate-800 shadow-2xl relative overflow-hidden transform translate-z-10">
               <div className="absolute inset-1 bg-[url('https://images.unsplash.com/photo-1614624532983-4ce03382d63d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80')] bg-cover bg-center border border-slate-700"></div>
               <div className="absolute bottom-0 w-full h-1 bg-blue-500/50 shadow-[0_0_10px_blue]"></div>
            </div>
            <div className="w-8 h-12 bg-slate-800 transform translate-z-6 border-x-4 border-slate-900"></div>
            <div className="w-32 h-4 bg-slate-700 rounded-t-lg transform translate-z-2 border-b-4 border-slate-900"></div>
         </div>
      );
   }
   if (type === 'printer') {
      return (
         <div className="w-48 h-32 bg-slate-200 rounded-lg shadow-2xl relative border-b-8 border-slate-400 flex flex-col items-center justify-end" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute top-0 w-32 h-12 bg-white border border-slate-300 shadow-sm transform -translate-y-8 translate-z-[-2] flex justify-center pt-2">
               <div className="w-24 h-1 bg-slate-200"></div>
            </div>
            <div className="w-full h-8 bg-slate-300 border-t border-slate-400 flex justify-center items-center gap-4">
               <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
               <div className="w-6 h-2 bg-slate-400 rounded-full"></div>
            </div>
            <div className="absolute bottom-2 w-32 h-6 bg-slate-800 rounded-sm shadow-inner flex justify-center transform translate-z-4">
               <div className="w-24 h-8 bg-white border border-slate-300 shadow-md transform translate-y-2"></div>
            </div>
         </div>
      );
   }
   return null;
}

export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const [activeTab, setActiveTab] = useState<'menu' | 'hardware' | 'software' | 'brainware' | 'assembly'>('menu');
   
   if (activeTab === 'hardware') return <HardwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'software') return <SoftwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'brainware') return <BrainwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'assembly') return <AssemblyAndOSSimulator onBack={() => setActiveTab('menu')} />;

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
               <Monitor className="w-5 h-5 text-indigo-400" />
               Sistem Komputer
            </h2>
            <div className="w-full sm:w-[100px]"></div>
         </div>

         <p className="text-xs sm:text-sm font-medium text-slate-400 mb-8 text-center max-w-xl">
            Sistem Komputer terdiri dari 3 elemen utama. Pilih salah satu elemen untuk eksplorasi 3D, atau coba simulasi interaktif Merakit PC & Booting OS Windows 10.
         </p>

         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-6xl">
            <button onClick={() => setActiveTab('hardware')} className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all text-left flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"><Cpu className="w-8 h-8 text-emerald-400" /></div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Hardware</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Perangkat Keras. Eksplorasi 3D komponen Input, Process, Output, dan Storage.</p>
            </button>
            <button onClick={() => setActiveTab('software')} className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all text-left flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"><Monitor className="w-8 h-8 text-blue-400" /></div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Software</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Perangkat Lunak. Pelajari OS, Aplikasi, dan Utilitas.</p>
            </button>
            <button onClick={() => setActiveTab('brainware')} className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 transition-all text-left flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"><MousePointer2 className="w-8 h-8 text-purple-400" /></div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Brainware</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Pengguna. Kenali tingkatan pengguna seperti System Analyst hingga End User.</p>
            </button>
            <button onClick={() => setActiveTab('assembly')} className="group relative overflow-hidden p-6 bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-700/50 rounded-3xl hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/20 transition-all text-left flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"><Zap className="w-8 h-8 text-amber-400" /></div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Merakit PC & OS</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Simulasi Drag & Drop Merakit PC & Tampilan Desktop Windows 10 Realistis.</p>
            </button>
         </div>
      </div>
   );
}

const HardwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [selectedComp, setSelectedComp] = useState(0);

   const components = [
      { id: 'keyboard', cat: 'Input', name: 'Keyboard', subtitle: 'Perangkat Masukan', desc: 'Digunakan untuk memasukkan data berupa huruf, angka, dan simbol.', color: 'from-pink-600 to-pink-800', icon: Keyboard },
      { id: 'mouse', cat: 'Input', name: 'Mouse', subtitle: 'Perangkat Masukan', desc: 'Alat penunjuk (pointing device) untuk menggerakkan kursor di layar.', color: 'from-pink-600 to-pink-800', icon: Mouse },
      { id: 'cpu', cat: 'Process', name: 'Prosesor (CPU)', subtitle: 'Central Processing Unit', desc: 'Otak komputer yang memproses semua instruksi dan operasi logika.', color: 'from-emerald-600 to-emerald-800', icon: Cpu },
      { id: 'ram', cat: 'Process', name: 'RAM', subtitle: 'Random Access Memory', desc: 'Penyimpanan data sementara yang sangat cepat.', color: 'from-blue-600 to-blue-800', icon: HardDrive },
      { id: 'motherboard', cat: 'Process', name: 'Motherboard', subtitle: 'Papan Induk', desc: 'Papan sirkuit utama yang menghubungkan semua komponen perangkat keras.', color: 'from-amber-600 to-amber-800', icon: Monitor },
      { id: 'gpu', cat: 'Process', name: 'Kartu Grafis (GPU)', subtitle: 'Graphics Processing Unit', desc: 'Memproses gambar dan video untuk ditampilkan di layar.', color: 'from-rose-600 to-rose-800', icon: Monitor },
      { id: 'monitor', cat: 'Output', name: 'Monitor', subtitle: 'Perangkat Keluaran', desc: 'Menampilkan hasil pemrosesan komputer dalam bentuk visual.', color: 'from-cyan-600 to-cyan-800', icon: Monitor },
      { id: 'printer', cat: 'Output', name: 'Printer', subtitle: 'Perangkat Keluaran', desc: 'Mencetak dokumen atau gambar digital ke media kertas.', color: 'from-cyan-600 to-cyan-800', icon: Printer },
      { id: 'storage', cat: 'Storage', name: 'Penyimpanan (SSD)', subtitle: 'Solid State Drive', desc: 'Tempat penyimpanan data, OS, dan aplikasi secara permanen.', color: 'from-purple-600 to-purple-800', icon: HardDrive },
   ];

   const active = components[selectedComp];

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-emerald-400">Hardware (Perangkat Keras)</h2>
            <div className="w-full sm:w-[100px]"></div>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 flex-1">
            {/* 3D Viewport */}
            <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden min-h-[300px]">
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               <Interactive3DView>
                  <RealisticComponent type={active.id} />
               </Interactive3DView>
            </div>

            {/* List & Info */}
            <div className="w-full lg:w-[350px] flex flex-col gap-4">
               <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <div className="inline-block px-2 py-1 bg-slate-900 text-[10px] font-bold text-white rounded uppercase tracking-widest mb-2 border border-slate-600">{active.cat} DEVICE</div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{active.name}</h3>
                  <div className="text-xs font-bold text-emerald-400 mb-4">{active.subtitle}</div>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed">{active.desc}</p>
               </div>

               <div className="bg-slate-800 rounded-3xl border border-slate-700 p-4 overflow-y-auto max-h-[300px] grid grid-cols-2 gap-2">
                  {components.map((comp, idx) => (
                     <button
                        key={comp.id}
                        onClick={() => setSelectedComp(idx)}
                        className={\`p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center text-center gap-2 border \${selectedComp === idx ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'}\`}
                     >
                        {comp.name}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}

const SoftwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [selectedType, setSelectedType] = useState(0);

   const softwareTypes = [
      { name: "Sistem Operasi", desc: "Perangkat lunak dasar yang mengelola perangkat keras dan menyediakan layanan umum untuk program komputer. Tanpa OS, komputer tidak bisa dijalankan.", examples: ["Windows", "macOS", "Linux", "Android", "iOS"], icon: Layers, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
      { name: "Perangkat Lunak Aplikasi", desc: "Program yang dirancang untuk membantu pengguna melakukan tugas spesifik, seperti mengetik, mendesain, atau berselancar di internet.", examples: ["Microsoft Word", "Google Chrome", "Adobe Photoshop", "WhatsApp"], icon: Monitor, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
      { name: "Perangkat Lunak Utilitas", desc: "Program yang membantu mengelola, memelihara, dan mengendalikan sumber daya komputer.", examples: ["Antivirus", "WinRAR", "Disk Defragmenter", "Task Manager"], icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
      { name: "Bahasa Pemrograman", desc: "Perangkat lunak yang digunakan oleh programmer untuk menulis instruksi (kode) yang akan dieksekusi oleh komputer.", examples: ["Python", "JavaScript", "C++", "Java", "PHP"], icon: Code, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" }
   ];

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-blue-400">Software (Perangkat Lunak)</h2>
            <div className="w-full sm:w-[100px]"></div>
         </div>

         <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3 flex flex-col gap-3">
               {softwareTypes.map((sw, idx) => (
                  <button key={idx} onClick={() => setSelectedType(idx)} className={\`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all \${selectedType === idx ? sw.bg + ' ' + sw.border + ' shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-700'}\`}>
                     <div className={\`p-2 rounded-xl shrink-0 \${selectedType === idx ? 'bg-slate-900' : 'bg-slate-700'}\`}><sw.icon className={\`w-5 h-5 \${selectedType === idx ? sw.color : 'text-slate-400'}\`} /></div>
                     <span className={\`text-sm font-black uppercase tracking-wider \${selectedType === idx ? 'text-white' : 'text-slate-300'}\`}>{sw.name}</span>
                  </button>
               ))}
            </div>
            <div className="flex-1 bg-slate-800 rounded-3xl border border-slate-700 p-6 sm:p-8 flex flex-col">
               <div className="flex items-center gap-4 mb-6">
                  <div className={\`p-4 rounded-2xl \${softwareTypes[selectedType].bg}\`}>{React.createElement(softwareTypes[selectedType].icon, { className: \`w-8 h-8 \${softwareTypes[selectedType].color}\` })}</div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest">{softwareTypes[selectedType].name}</h3>
               </div>
               <p className="text-sm font-medium text-slate-300 leading-relaxed mb-8 flex-1">{softwareTypes[selectedType].desc}</p>
               <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contoh {softwareTypes[selectedType].name}:</h4>
                  <div className="flex flex-wrap gap-2">
                     {softwareTypes[selectedType].examples.map((ex, i) => (
                        <span key={i} className={\`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold border \${softwareTypes[selectedType].border} \${softwareTypes[selectedType].color} bg-slate-900 shadow-sm\`}>{ex}</span>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

const BrainwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const levels = [
      { title: "System Analyst", subtitle: "Arsitek Sistem", desc: "Orang yang menganalisis, merancang, dan mengimplementasikan sistem untuk memenuhi kebutuhan pengguna.", color: "from-purple-500 to-indigo-600", icon: Brain },
      { title: "Programmer", subtitle: "Pengembang Kode", desc: "Orang yang menulis, menguji, dan memelihara kode instruksi komputer berdasarkan desain yang dibuat.", color: "from-blue-500 to-cyan-600", icon: Code },
      { title: "Administrator", subtitle: "Pengelola Sistem", desc: "Orang yang bertugas mengelola, mengatur, dan menjaga keamanan sebuah sistem komputer atau jaringan.", color: "from-emerald-500 to-teal-600", icon: Settings },
      { title: "End User / Operator", subtitle: "Pengguna Akhir", desc: "Orang yang menggunakan komputer atau perangkat lunak untuk menyelesaikan tugas sehari-hari.", color: "from-orange-500 to-amber-600", icon: Users }
   ];

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-purple-400">Brainware (Pengguna)</h2>
            <div className="w-full sm:w-[100px]"></div>
         </div>
         <div className="w-full max-w-3xl flex flex-col gap-4">
            {levels.map((level, idx) => (
               <div key={idx} className="group relative bg-slate-800 border border-slate-700 p-6 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-6 hover:bg-slate-800/80 transition-all overflow-hidden">
                  <div className={\`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br \${level.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity\`}></div>
                  <div className={\`w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br \${level.color} flex items-center justify-center shadow-lg shadow-black/20\`}>
                     <level.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 text-center sm:text-left z-10">
                     <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">{level.title}</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">{level.subtitle}</span>
                     </div>
                     <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">{level.desc}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

const AssemblyAndOSSimulator: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [phase, setPhase] = useState<'assembly' | 'pc-case' | 'booting' | 'windows' | 'shutting-down'>('assembly');
   const [installed, setInstalled] = useState<string[]>([]);
   
   // Windows OS States
   const [showStart, setShowStart] = useState(false);
   const [showPower, setShowPower] = useState(false);
   const [time, setTime] = useState(new Date());

   useEffect(() => {
      let interval: NodeJS.Timeout;
      if (phase === 'windows') {
         interval = setInterval(() => setTime(new Date()), 1000);
      }
      return () => clearInterval(interval);
   }, [phase]);

   useEffect(() => {
      if (phase === 'booting') {
         const t = setTimeout(() => setPhase('windows'), 4000);
         return () => clearTimeout(t);
      }
      if (phase === 'shutting-down') {
         const t = setTimeout(() => {
            setPhase('pc-case');
            setShowStart(false);
            setShowPower(false);
            setInstalled([]); // reset to allow assembly again if needed, or leave assembled. Let's keep assembled.
         }, 3500);
         return () => clearTimeout(t);
      }
   }, [phase]);

   const handleInstall = (id: string) => {
      if (id === 'motherboard' && !installed.includes('motherboard')) {
         setInstalled(['motherboard']);
      } else if (installed.includes('motherboard') && !installed.includes(id)) {
         setInstalled([...installed, id]);
      }
   };

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[600px] flex flex-col items-center relative overflow-hidden">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 z-50 relative">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Keluar Simulasi
            </button>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest text-amber-400">Simulasi Merakit & OS Windows 10</h2>
            <div className="w-full sm:w-[150px]"></div>
         </div>

         {/* PHASE 1: ASSEMBLY */}
         {phase === 'assembly' && (
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl h-full flex-1">
               <div className="w-full lg:w-[300px] bg-slate-800 p-4 rounded-3xl border border-slate-700 flex flex-col gap-2 overflow-y-auto max-h-[300px] lg:max-h-none">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2 px-2 sticky top-0 bg-slate-800 py-1 z-10">Pasang Komponen</h3>
                  {['motherboard', 'cpu', 'ram', 'gpu', 'storage'].map(id => {
                     const isInstalled = installed.includes(id);
                     const labels: Record<string, string> = { motherboard: "Motherboard", cpu: "CPU", ram: "RAM", gpu: "Kartu Grafis", storage: "Penyimpanan SSD" };
                     const disabled = !installed.includes('motherboard') && id !== 'motherboard';
                     return (
                        <button
                           key={id}
                           onClick={() => handleInstall(id)}
                           disabled={isInstalled || disabled}
                           className={\`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all \${isInstalled ? 'bg-emerald-900/30 border-emerald-500/30 opacity-50' : disabled ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 cursor-pointer shadow-md'}\`}
                        >
                           <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                              <div className="scale-[0.35] origin-center"><RealisticComponent type={id} /></div>
                           </div>
                           <span className="text-xs sm:text-sm font-bold text-white flex-1">{labels[id]}</span>
                           {isInstalled && <Check className="w-4 h-4 text-emerald-500" />}
                        </button>
                     );
                  })}
                  
                  {installed.length === 5 && (
                     <button onClick={() => setPhase('pc-case')} className="mt-4 lg:mt-auto py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 animate-bounce">
                        <Power className="w-4 h-4 sm:w-5 sm:h-5" /> Tutup Casing PC
                     </button>
                  )}
               </div>

               <div className="flex-1 bg-slate-950 rounded-3xl border-4 border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xl min-h-[350px]">
                  {installed.length === 0 && <span className="text-slate-600 text-xs sm:text-sm font-bold uppercase tracking-widest px-4 text-center">Tap / Klik Komponen di Kiri untuk Merakit</span>}
                  
                  {installed.includes('motherboard') && (
                     <div className="relative scale-75 sm:scale-100 transition-transform duration-500 ease-out">
                        <RealisticComponent type="motherboard" />
                        
                        {installed.includes('cpu') && (
                           <div className="absolute top-[32px] left-[32px] scale-[0.4] z-10 drop-shadow-2xl animate-in zoom-in duration-300">
                              <RealisticComponent type="cpu" />
                           </div>
                        )}
                        {installed.includes('ram') && (
                           <div className="absolute top-[32px] right-[48px] scale-[0.4] rotate-90 z-20 drop-shadow-2xl animate-in zoom-in duration-300 delay-100">
                              <RealisticComponent type="ram" />
                           </div>
                        )}
                        {installed.includes('gpu') && (
                           <div className="absolute bottom-[44px] left-[32px] scale-[0.7] z-30 drop-shadow-2xl animate-in zoom-in duration-300 delay-100">
                              <RealisticComponent type="gpu" />
                           </div>
                        )}
                        {installed.includes('storage') && (
                           <div className="absolute bottom-[20px] right-[20px] scale-[0.6] z-10 drop-shadow-2xl animate-in zoom-in duration-300 delay-100">
                              <RealisticComponent type="storage" />
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* PHASE 2: PC CASE (OFF) */}
         {phase === 'pc-case' && (
            <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in duration-500 min-h-[400px]">
               <div className="w-56 h-80 sm:w-64 sm:h-96 bg-slate-950 border-[6px] sm:border-[8px] border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center py-8 relative">
                  <div className="w-40 sm:w-48 h-2 bg-slate-900 rounded mb-16 border border-slate-800 shadow-inner"></div>
                  
                  <button 
                     onClick={() => setPhase('booting')}
                     className="w-16 h-16 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center group hover:bg-slate-700 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] cursor-pointer"
                  >
                     <Power className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest text-center px-4 animate-pulse">Tekan Power Untuk Menyalakan</span>
                  
                  <div className="absolute bottom-8 w-full px-12 flex justify-between">
                     <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                     <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                  </div>
               </div>
            </div>
         )}

         {/* PHASE 3 & 4: MONITOR / OS */}
         {(phase === 'booting' || phase === 'windows' || phase === 'shutting-down') && (
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center animate-in fade-in duration-1000 p-2 sm:p-4">
               {/* Monitor Frame */}
               <div className="w-full aspect-[16/10] sm:aspect-video bg-black border-[8px] sm:border-[12px] border-slate-950 rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
                  
                  {/* Boot Screen */}
                  {(phase === 'booting' || phase === 'shutting-down') && (
                     <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
                        {phase === 'booting' ? (
                           <div className="flex flex-col items-center">
                              <div className="grid grid-cols-2 gap-1 mb-12 sm:mb-16 transform -skew-x-12 -skew-y-6">
                                 <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7]"></div><div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7]"></div>
                                 <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7]"></div><div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7]"></div>
                              </div>
                              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/80" />
                           </div>
                        ) : (
                           <div className="flex flex-col items-center gap-4 sm:gap-6">
                              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-[#0078D7]" />
                              <span className="text-lg sm:text-xl font-sans tracking-wide">Shutting down</span>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Windows 10 Desktop */}
                  {phase === 'windows' && (
                     <div className="absolute inset-0 flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-1000 bg-black">
                        {/* Realistic Windows 10 Wallpaper Replica using CSS */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#003b70] via-[#005a9e] to-[#001020]">
                           {/* Light Beams */}
                           <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-l from-cyan-400/20 via-transparent to-transparent transform -rotate-45 origin-top-right blur-3xl pointer-events-none"></div>
                           <div className="absolute bottom-0 left-0 w-full h-[50%] bg-gradient-to-t from-blue-900/50 to-transparent blur-2xl pointer-events-none"></div>
                        </div>

                        {/* Desktop Icons */}
                        <div className="p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 z-0 h-full w-20 sm:w-24">
                           <div className="flex flex-col items-center p-1 sm:p-2 hover:bg-white/10 rounded border border-transparent hover:border-white/20 cursor-default group">
                              <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white/20 mb-1 drop-shadow-md" />
                              <span className="text-white text-[10px] sm:text-xs text-center leading-tight drop-shadow-md group-hover:bg-blue-600/50 rounded px-1">This PC</span>
                           </div>
                           <div className="flex flex-col items-center p-1 sm:p-2 hover:bg-white/10 rounded border border-transparent hover:border-white/20 cursor-default group">
                              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-md mb-1" />
                              <span className="text-white text-[10px] sm:text-xs text-center leading-tight drop-shadow-md group-hover:bg-blue-600/50 rounded px-1">Recycle Bin</span>
                           </div>
                        </div>

                        {/* Start Menu */}
                        {showStart && (
                           <div className="absolute bottom-[36px] sm:bottom-[40px] left-0 w-[280px] sm:w-[320px] h-[350px] sm:h-[400px] bg-[#1f1f1f]/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-20 flex text-white font-sans animate-in slide-in-from-bottom-2 duration-200">
                              {/* Left thin rail */}
                              <div className="w-10 sm:w-12 flex flex-col justify-between items-center py-2 bg-black/20">
                                 <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center mt-2"><Menu className="w-4 h-4 text-white" /></button>
                                 <div className="w-full flex flex-col items-center gap-1 mb-2">
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center"><Users className="w-4 h-4 text-white" /></button>
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center"><FileText className="w-4 h-4 text-white" /></button>
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center"><Settings className="w-4 h-4 text-white" /></button>
                                    <div className="relative group w-full flex justify-center">
                                       <button onClick={() => setShowPower(!showPower)} className="p-2 hover:bg-white/10 rounded w-full flex justify-center bg-white/5"><Power className="w-4 h-4 text-white" /></button>
                                       {showPower && (
                                          <div className="absolute bottom-0 left-full ml-1 w-32 sm:w-40 bg-[#1f1f1f] border border-white/10 rounded shadow-2xl py-1 z-30">
                                             <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-2 sm:py-3 hover:bg-white/10 text-xs sm:text-sm transition-colors flex items-center gap-3"><PowerOff className="w-4 h-4"/> Shut down</button>
                                             <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-2 sm:py-3 hover:bg-white/10 text-xs sm:text-sm transition-colors flex items-center gap-3"><RefreshCw className="w-4 h-4"/> Restart</button>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              {/* Middle apps list */}
                              <div className="w-32 sm:w-40 border-r border-white/5 p-2 overflow-y-auto hidden sm:block">
                                 <div className="text-[10px] text-white/50 mb-2 px-2">A</div>
                                 <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded cursor-default"><Calculator className="w-4 h-4 text-blue-400"/><span className="text-xs">Calculator</span></div>
                                 <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded cursor-default"><ImageIcon className="w-4 h-4 text-blue-400"/><span className="text-xs">Camera</span></div>
                                 <div className="text-[10px] text-white/50 mt-2 mb-2 px-2">E</div>
                                 <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 rounded cursor-default"><Chrome className="w-4 h-4 text-[#0078D7]"/><span className="text-xs">Edge</span></div>
                              </div>
                              {/* Right Tiles */}
                              <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                                 <div className="text-[10px] text-white/80 font-bold mb-3">Productivity</div>
                                 <div className="grid grid-cols-2 gap-1 sm:gap-2">
                                    <div className="aspect-square bg-[#0078D7] rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer"><Chrome className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1 sm:mb-2"/><span className="text-[8px] sm:text-[10px]">Edge</span></div>
                                    <div className="aspect-square bg-[#0078D7] rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer"><FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1 sm:mb-2"/><span className="text-[8px] sm:text-[10px]">Office</span></div>
                                    <div className="aspect-square bg-emerald-600 rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer"><CloudRain className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1 sm:mb-2"/><span className="text-[8px] sm:text-[10px]">Weather</span></div>
                                    <div className="aspect-square bg-blue-800 rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer"><Music className="w-6 h-6 sm:w-8 sm:h-8 text-white mb-1 sm:mb-2"/><span className="text-[8px] sm:text-[10px]">Groove</span></div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Taskbar */}
                        <div className="absolute bottom-0 w-full h-[36px] sm:h-[40px] bg-[#101010]/95 backdrop-blur-xl border-t border-white/10 z-30 flex items-center justify-between px-1">
                           <div className="flex items-center gap-0 sm:gap-1 h-full">
                              {/* Start Button */}
                              <button onClick={() => {setShowStart(!showStart); setShowPower(false);}} className={\`h-full px-2 sm:px-3 hover:bg-white/10 flex items-center justify-center transition-colors \${showStart ? 'bg-white/10' : ''}\`}>
                                 <div className="grid grid-cols-2 gap-[1px] transform -skew-x-6 -skew-y-3">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white"></div><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white"></div>
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white"></div><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white"></div>
                                 </div>
                              </button>
                              
                              {/* Search Bar */}
                              <div className="hidden md:flex w-48 h-7 sm:h-8 bg-white/10 hover:bg-white/20 border border-white/5 rounded px-3 items-center text-white/50 text-[11px] sm:text-xs mx-1 cursor-text gap-2 transition-colors">
                                 <Search className="w-3.5 h-3.5" /> Type here to search
                              </div>
                              <button className="md:hidden h-full px-2 sm:px-3 hover:bg-white/10 flex items-center justify-center"><Search className="w-4 h-4 text-white" /></button>

                              {/* Cortana Circle */}
                              <button className="hidden sm:flex h-full px-3 hover:bg-white/10 items-center justify-center">
                                 <div className="w-3.5 h-3.5 rounded-full border-[2px] border-white/80"></div>
                              </button>

                              {/* Task View */}
                              <button className="h-full px-2 sm:px-3 hover:bg-white/10 flex items-center justify-center">
                                 <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                              </button>
                           </div>

                           <div className="flex items-center h-full text-white">
                              {/* System Tray Icons */}
                              <div className="hidden sm:flex h-full px-2 hover:bg-white/10 items-center justify-center cursor-default">
                                 <ArrowLeft className="w-3 h-3 transform rotate-90 text-white/80" />
                              </div>
                              <div className="h-full px-1.5 sm:px-2 hover:bg-white/10 flex items-center justify-center cursor-default">
                                 <Battery className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                              </div>
                              <div className="h-full px-1.5 sm:px-2 hover:bg-white/10 flex items-center justify-center cursor-default">
                                 <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                              </div>
                              <div className="h-full px-1.5 sm:px-2 hover:bg-white/10 flex items-center justify-center cursor-default">
                                 <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                              </div>

                              {/* Clock */}
                              <div className="h-full px-2 sm:px-3 hover:bg-white/10 flex flex-col justify-center cursor-default text-right">
                                 <span className="text-[9px] sm:text-[10px] leading-tight">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 <span className="text-[9px] sm:text-[10px] leading-tight">{time.toLocaleDateString()}</span>
                              </div>

                              {/* Action Center */}
                              <div className="h-full px-2 hover:bg-white/10 flex items-center justify-center cursor-default border-l border-white/10 ml-1">
                                 <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Monitor Stand (Decorative) */}
                  <div className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-800 rounded-b-xl -z-10"></div>
               </div>
            </div>
         )}
      </div>
   );
}
`;

  const finalContent = content.substring(0, startIndex) + newComponent + content.substring(endIndex);
  fs.writeFileSync("src/components/simulation/MiniSimulators.tsx", finalContent, "utf8");
  console.log("Successfully replaced ComputerSystemSimulator with updated 3D components and Windows 10 UI.");
} else {
  console.error("Could not find start or end match.");
}
