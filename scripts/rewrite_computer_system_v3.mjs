import fs from "fs";

let content = fs.readFileSync("src/components/simulation/MiniSimulators.tsx", "utf8");

const startMatch = "export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";
const endMatch = "export const DataAnalysisSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";

const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch);

if (startIndex !== -1 && endIndex !== -1) {
  const newComponent = `export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const [activeTab, setActiveTab] = useState<'menu' | 'hardware' | 'software' | 'brainware' | 'assembly'>('menu');
   
   if (activeTab === 'hardware') return <HardwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'software') return <SoftwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'brainware') return <BrainwareExplorer onBack={() => setActiveTab('menu')} />;
   if (activeTab === 'assembly') return <AssemblyAndOSSimulator onBack={() => setActiveTab('menu')} />;

   return (
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-10">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Bab
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
               <Monitor className="w-5 h-5 text-indigo-400" />
               Sistem Komputer
            </h2>
            <div className="w-[150px]"></div>
         </div>

         <p className="text-sm font-medium text-slate-400 mb-8 text-center max-w-xl">
            Sistem Komputer terdiri dari 3 elemen utama agar dapat berfungsi: Hardware (Perangkat Keras), Software (Perangkat Lunak), dan Brainware (Pengguna). Pilih salah satu elemen atau coba merakit PC.
         </p>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
            <button 
               onClick={() => setActiveTab('hardware')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Cpu className="w-8 h-8 text-emerald-400" />
               </div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Hardware</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Perangkat Keras. Eksplorasi komponen fisik komputer seperti Motherboard, CPU, RAM dalam bentuk 3D realistis.
               </p>
            </button>

            <button 
               onClick={() => setActiveTab('software')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Monitor className="w-8 h-8 text-blue-400" />
               </div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Software</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Perangkat Lunak. Pelajari berbagai macam sistem operasi, aplikasi, dan utilitas beserta fungsinya.
               </p>
            </button>

            <button 
               onClick={() => setActiveTab('brainware')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <MousePointer2 className="w-8 h-8 text-purple-400" />
               </div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Brainware</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Pengguna. Kenali tingkatan pengguna komputer mulai dari System Analyst hingga End User.
               </p>
            </button>
            
            <button 
               onClick={() => setActiveTab('assembly')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-700/50 rounded-3xl hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Zap className="w-8 h-8 text-amber-400" />
               </div>
               <h3 className="text-base font-black text-white uppercase tracking-widest mb-2">Merakit PC & OS</h3>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Simulasi interaktif merakit komponen ke Motherboard dan menyalakan Sistem Operasi Windows 10.
               </p>
            </button>
         </div>
      </div>
   );
}

const RealisticComponent: React.FC<{ type: string }> = ({ type }) => {
   if (type === 'cpu') {
      return (
         <div className="w-24 h-24 bg-slate-300 rounded border-2 border-slate-400 shadow-xl relative flex items-center justify-center transform transition-transform group-hover:scale-110 group-hover:rotate-6">
            <div className="w-14 h-14 bg-slate-200 border border-slate-400 rounded-sm flex items-center justify-center shadow-inner relative overflow-hidden">
               <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#000_2px,#000_4px)]"></div>
               <span className="font-black text-slate-500 text-[10px] tracking-tighter z-10">CPU</span>
            </div>
            <div className="absolute bottom-1.5 left-1.5 w-2 h-2 bg-yellow-400 rounded-full border border-yellow-600 shadow-sm"></div>
         </div>
      );
   }
   if (type === 'ram') {
      return (
         <div className="w-40 h-10 bg-emerald-700 rounded-sm shadow-xl relative border-b-4 border-yellow-500 flex items-center justify-evenly px-2 transform transition-transform group-hover:scale-110 group-hover:-rotate-3">
            <div className="absolute top-0 left-2 w-2 h-1 bg-emerald-800 rounded-b-sm"></div>
            <div className="absolute top-0 right-2 w-2 h-1 bg-emerald-800 rounded-b-sm"></div>
            {[...Array(8)].map((_, i) => (
               <div key={i} className="w-2.5 h-4 bg-slate-900 rounded-sm shadow-sm border border-slate-700"></div>
            ))}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-white/90 text-[5px] font-mono flex items-center justify-center rounded-sm">16GB DDR4</div>
         </div>
      );
   }
   if (type === 'gpu') {
      return (
         <div className="w-48 h-16 bg-slate-900 rounded-md shadow-2xl relative flex items-center justify-around border-t-2 border-slate-700 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
            <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-800 relative overflow-hidden shadow-inner">
               <div className="absolute inset-0 flex items-center justify-center animate-[spin_5s_linear_infinite]"><div className="w-full h-1 bg-slate-700/50 absolute"></div><div className="w-1 h-full bg-slate-700/50 absolute"></div></div>
               <div className="w-4 h-4 bg-slate-950 rounded-full border border-slate-600 z-10"></div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-800 relative overflow-hidden shadow-inner">
               <div className="absolute inset-0 flex items-center justify-center animate-[spin_5s_linear_infinite]"><div className="w-full h-1 bg-slate-700/50 absolute"></div><div className="w-1 h-full bg-slate-700/50 absolute"></div></div>
               <div className="w-4 h-4 bg-slate-950 rounded-full border border-slate-600 z-10"></div>
            </div>
            <div className="absolute -bottom-1 left-6 w-12 h-1.5 bg-yellow-500 rounded-b-sm"></div>
            <div className="absolute -top-0.5 right-4 w-8 h-1 bg-orange-300/80 rounded-t-lg"></div>
         </div>
      );
   }
   if (type === 'storage') {
      return (
         <div className="w-16 h-24 bg-slate-900 border-2 border-slate-700 rounded-sm shadow-xl flex flex-col items-center justify-center relative transform transition-transform group-hover:scale-110 group-hover:-rotate-6">
            <div className="w-12 h-16 bg-blue-600 rounded-sm border border-blue-400 flex flex-col items-center p-1.5 shadow-inner">
               <div className="w-full h-1.5 bg-white/20 mb-1"></div>
               <span className="text-white font-black text-[8px]">SSD</span>
               <span className="text-white/80 font-bold text-[6px]">1TB NAND</span>
            </div>
            <div className="absolute bottom-0 left-2 w-4 h-1.5 bg-yellow-500"></div>
         </div>
      );
   }
   if (type === 'motherboard') {
      return (
         <div className="w-64 h-64 bg-slate-800 border-2 border-emerald-900 rounded shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,#10b981_10px,#10b981_11px),repeating-linear-gradient(0deg,transparent,transparent_10px,#10b981_10px,#10b981_11px)]"></div>
            {/* CPU Socket */}
            <div className="absolute top-6 left-6 w-24 h-24 border-2 border-slate-600 bg-slate-900 flex items-center justify-center rounded-sm">
               <div className="w-16 h-16 border border-slate-700 bg-slate-800 flex items-center justify-center">
                  <span className="text-[8px] text-slate-500 font-mono">CPU SOCKET</span>
               </div>
            </div>
            {/* RAM Slots */}
            <div className="absolute top-6 right-8 w-3 h-28 border border-slate-600 bg-slate-700 rounded-sm flex flex-col justify-between py-1"><div className="w-full h-1 bg-slate-900"></div></div>
            <div className="absolute top-6 right-3 w-3 h-28 border border-slate-600 bg-slate-700 rounded-sm flex flex-col justify-between py-1"><div className="w-full h-1 bg-slate-900"></div></div>
            {/* PCIe Slot */}
            <div className="absolute bottom-16 left-6 w-32 h-4 border border-slate-700 bg-slate-900 rounded-sm flex items-center px-1">
               <div className="w-full h-0.5 bg-yellow-600/50"></div>
            </div>
            {/* Chipset */}
            <div className="absolute bottom-6 right-8 w-12 h-12 border border-slate-600 bg-slate-950 flex items-center justify-center shadow-lg">
               <div className="w-6 h-6 border border-slate-700 bg-slate-800 transform rotate-45"></div>
            </div>
            {/* CMOS */}
            <div className="absolute bottom-8 left-8 w-5 h-5 rounded-full bg-slate-300 border-2 border-slate-400 shadow-inner flex items-center justify-center"><div className="w-3 h-3 rounded-full border border-slate-400"></div></div>
         </div>
      );
   }
   return null;
}

const HardwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [selectedComp, setSelectedComp] = useState(0);

   const components = [
      { id: 'cpu', name: 'Prosesor (CPU)', subtitle: 'Central Processing Unit', desc: 'Otak dari komputer. Bertugas memproses semua instruksi dan operasi logika maupun matematika.', color: 'from-emerald-600 to-emerald-800', icon: Cpu },
      { id: 'ram', name: 'RAM', subtitle: 'Random Access Memory', desc: 'Penyimpanan data sementara yang sangat cepat. Membantu CPU menyimpan data aplikasi yang sedang berjalan.', color: 'from-blue-600 to-blue-800', icon: HardDrive },
      { id: 'motherboard', name: 'Motherboard', subtitle: 'Papan Induk', desc: 'Papan sirkuit utama yang menghubungkan dan menjadi tulang punggung komunikasi semua komponen perangkat keras.', color: 'from-amber-600 to-amber-800', icon: Monitor },
      { id: 'gpu', name: 'Kartu Grafis (GPU)', subtitle: 'Graphics Processing Unit', desc: 'Memproses dan menghasilkan gambar, video, dan grafik 3D untuk ditampilkan di layar monitor.', color: 'from-rose-600 to-rose-800', icon: Monitor },
      { id: 'storage', name: 'Penyimpanan (SSD/HDD)', subtitle: 'Solid State Drive', desc: 'Tempat penyimpanan data permanen. Semua sistem operasi, aplikasi, dan file Anda disimpan di sini.', color: 'from-purple-600 to-purple-800', icon: HardDrive },
   ];

   const active = components[selectedComp];

   return (
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-emerald-400">Hardware (Perangkat Keras)</h2>
            <div className="w-[100px]"></div>
         </div>

         <div className="flex flex-col md:flex-row gap-8 flex-1">
            <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden py-12">
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               
               <div className="relative z-10 transform-gpu transition-all duration-700 hover:scale-110 group cursor-pointer" style={{ transform: 'perspective(1000px) rotateX(15deg) rotateY(-20deg)' }}>
                  <div className="absolute bottom-[-30px] left-0 w-full h-8 bg-black/60 blur-xl rounded-full"></div>
                  <RealisticComponent type={active.id} />
               </div>
            </div>

            <div className="w-full md:w-[350px] flex flex-col gap-4">
               <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{active.name}</h3>
                  <div className="text-xs font-bold text-emerald-400 mb-4">{active.subtitle}</div>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed">{active.desc}</p>
               </div>

               <div className="grid grid-cols-2 gap-2">
                  {components.map((comp, idx) => (
                     <button
                        key={comp.id}
                        onClick={() => setSelectedComp(idx)}
                        className={\`p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center text-center gap-2 border \${selectedComp === idx ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}\`}
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
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-blue-400">Software (Perangkat Lunak)</h2>
            <div className="w-[100px]"></div>
         </div>

         <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 flex flex-col gap-3">
               {softwareTypes.map((sw, idx) => (
                  <button key={idx} onClick={() => setSelectedType(idx)} className={\`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all \${selectedType === idx ? sw.bg + ' ' + sw.border + ' shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-700'}\`}>
                     <div className={\`p-2 rounded-xl \${selectedType === idx ? 'bg-slate-900' : 'bg-slate-700'}\`}><sw.icon className={\`w-5 h-5 \${selectedType === idx ? sw.color : 'text-slate-400'}\`} /></div>
                     <span className={\`text-sm font-black uppercase tracking-wider \${selectedType === idx ? 'text-white' : 'text-slate-300'}\`}>{sw.name}</span>
                  </button>
               ))}
            </div>
            <div className="flex-1 bg-slate-800 rounded-3xl border border-slate-700 p-8 flex flex-col">
               <div className="flex items-center gap-4 mb-6">
                  <div className={\`p-4 rounded-2xl \${softwareTypes[selectedType].bg}\`}>{React.createElement(softwareTypes[selectedType].icon, { className: \`w-8 h-8 \${softwareTypes[selectedType].color}\` })}</div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest">{softwareTypes[selectedType].name}</h3>
               </div>
               <p className="text-sm font-medium text-slate-300 leading-relaxed mb-8 flex-1">{softwareTypes[selectedType].desc}</p>
               <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contoh {softwareTypes[selectedType].name}:</h4>
                  <div className="flex flex-wrap gap-2">
                     {softwareTypes[selectedType].examples.map((ex, i) => (
                        <span key={i} className={\`px-4 py-2 rounded-xl text-xs font-bold border \${softwareTypes[selectedType].border} \${softwareTypes[selectedType].color} bg-slate-900 shadow-sm\`}>{ex}</span>
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
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-purple-400">Brainware (Pengguna)</h2>
            <div className="w-[100px]"></div>
         </div>
         <div className="w-full max-w-3xl flex flex-col gap-4">
            {levels.map((level, idx) => (
               <div key={idx} className="group relative bg-slate-800 border border-slate-700 p-6 rounded-3xl flex flex-col md:flex-row items-center md:items-start gap-6 hover:bg-slate-800/80 transition-all overflow-hidden">
                  <div className={\`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br \${level.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity\`}></div>
                  <div className={\`w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br \${level.color} flex items-center justify-center shadow-lg shadow-black/20\`}>
                     <level.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left z-10">
                     <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">{level.title}</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">{level.subtitle}</span>
                     </div>
                     <p className="text-sm font-medium text-slate-300 leading-relaxed">{level.desc}</p>
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
         const t = setTimeout(() => setPhase('windows'), 3500);
         return () => clearTimeout(t);
      }
      if (phase === 'shutting-down') {
         const t = setTimeout(() => {
            setPhase('pc-case');
            setShowStart(false);
            setShowPower(false);
         }, 3000);
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
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[600px] flex flex-col items-center relative overflow-hidden">
         <div className="w-full flex justify-between items-center mb-6 z-50 relative">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Keluar Simulasi
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-amber-400">Simulasi Merakit & OS</h2>
            <div className="w-[150px]"></div>
         </div>

         {/* PHASE 1: ASSEMBLY */}
         {phase === 'assembly' && (
            <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl h-full flex-1">
               {/* Inventory List */}
               <div className="w-full md:w-[300px] bg-slate-800 p-4 rounded-3xl border border-slate-700 flex flex-col gap-3">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2 px-2">Komponen Tersedia</h3>
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
                           <div className="w-10 h-10 shrink-0 scale-50 origin-left flex items-center justify-center">
                              <RealisticComponent type={id} />
                           </div>
                           <span className="text-sm font-bold text-white flex-1">{labels[id]}</span>
                           {isInstalled && <Check className="w-5 h-5 text-emerald-500" />}
                        </button>
                     );
                  })}
                  
                  {installed.length === 5 && (
                     <button onClick={() => setPhase('pc-case')} className="mt-auto py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                        <Power className="w-5 h-5" /> Tutup Casing PC
                     </button>
                  )}
               </div>

               {/* Assembly Canvas */}
               <div className="flex-1 bg-slate-950 rounded-3xl border-4 border-slate-800 flex items-center justify-center relative overflow-hidden shadow-2xl">
                  {installed.length === 0 && <span className="text-slate-600 font-bold uppercase tracking-widest">Mulai dengan memasang Motherboard</span>}
                  
                  {installed.includes('motherboard') && (
                     <div className="relative scale-110">
                        <RealisticComponent type="motherboard" />
                        
                        {/* Overlay components directly on motherboard slots */}
                        {installed.includes('cpu') && (
                           <div className="absolute top-[26px] left-[26px] scale-[0.4] z-10 drop-shadow-2xl">
                              <RealisticComponent type="cpu" />
                           </div>
                        )}
                        {installed.includes('ram') && (
                           <div className="absolute top-[32px] right-[40px] scale-[0.4] rotate-90 z-20 drop-shadow-2xl">
                              <RealisticComponent type="ram" />
                           </div>
                        )}
                        {installed.includes('gpu') && (
                           <div className="absolute bottom-[44px] left-[32px] scale-[0.7] z-30 drop-shadow-2xl">
                              <RealisticComponent type="gpu" />
                           </div>
                        )}
                        {installed.includes('storage') && (
                           <div className="absolute bottom-[20px] right-[20px] scale-[0.6] z-10 drop-shadow-2xl">
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
            <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in duration-500">
               <div className="w-64 h-96 bg-slate-950 border-[8px] border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center py-8 relative">
                  {/* CD Drive line */}
                  <div className="w-48 h-2 bg-slate-900 rounded mb-16 border border-slate-800 shadow-inner"></div>
                  
                  {/* Power Button */}
                  <button 
                     onClick={() => setPhase('booting')}
                     className="w-16 h-16 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center group hover:bg-slate-700 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] cursor-pointer"
                  >
                     <Power className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest">Tekan Untuk Menyalakan</span>
                  
                  <div className="absolute bottom-12 w-full px-12 flex justify-between">
                     <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                     <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                  </div>
               </div>
            </div>
         )}

         {/* PHASE 3 & 4: MONITOR / OS */}
         {(phase === 'booting' || phase === 'windows' || phase === 'shutting-down') && (
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center animate-in fade-in duration-1000">
               {/* Monitor Frame */}
               <div className="w-full aspect-video bg-black border-[12px] border-slate-950 rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
                  
                  {/* Boot Screen */}
                  {(phase === 'booting' || phase === 'shutting-down') && (
                     <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
                        {phase === 'booting' ? (
                           <>
                              <div className="grid grid-cols-2 gap-1 mb-16 transform -skew-x-12 -skew-y-6">
                                 <div className="w-16 h-16 bg-[#0078D7]"></div><div className="w-16 h-16 bg-[#0078D7]"></div>
                                 <div className="w-16 h-16 bg-[#0078D7]"></div><div className="w-16 h-16 bg-[#0078D7]"></div>
                              </div>
                              <Loader2 className="w-8 h-8 animate-spin text-white/80" />
                           </>
                        ) : (
                           <div className="flex flex-col items-center gap-6">
                              <Loader2 className="w-8 h-8 animate-spin text-white/80" />
                              <span className="text-xl font-sans tracking-wide">Shutting down</span>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Windows 10 Desktop */}
                  {phase === 'windows' && (
                     <div className="absolute inset-0 bg-[#0078D7] flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-1000">
                        {/* Windows Wallpaper styling */}
                        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-400 via-blue-900 to-black"></div>

                        {/* Desktop Icons */}
                        <div className="p-2 flex flex-col gap-2 z-0 h-full w-24">
                           <div className="flex flex-col items-center p-1 hover:bg-white/10 rounded border border-transparent hover:border-white/20 cursor-default">
                              <Monitor className="w-8 h-8 text-white fill-white/20 mb-1" />
                              <span className="text-white text-[11px] text-center leading-tight drop-shadow-md">This PC</span>
                           </div>
                           <div className="flex flex-col items-center p-1 hover:bg-white/10 rounded border border-transparent hover:border-white/20 cursor-default">
                              <RefreshCw className="w-8 h-8 text-white mb-1" />
                              <span className="text-white text-[11px] text-center leading-tight drop-shadow-md">Recycle Bin</span>
                           </div>
                        </div>

                        {/* Start Menu */}
                        {showStart && (
                           <div className="absolute bottom-[40px] left-0 w-[320px] h-[400px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl z-20 flex text-white font-sans animate-in slide-in-from-bottom-2 duration-200">
                              <div className="w-12 border-r border-slate-700/50 flex flex-col justify-end items-center pb-2">
                                 <div className="relative group w-full flex justify-center">
                                    <button onClick={() => setShowPower(!showPower)} className="p-2 hover:bg-white/10 rounded transition-colors w-full flex justify-center">
                                       <Power className="w-4 h-4 text-white" />
                                    </button>
                                    {showPower && (
                                       <div className="absolute bottom-0 left-full ml-1 w-32 bg-slate-800 border border-slate-600 rounded shadow-2xl py-1 z-30">
                                          <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm transition-colors flex items-center gap-2"><PowerOff className="w-4 h-4"/> Shut down</button>
                                          <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Restart</button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                              <div className="flex-1 p-4 overflow-y-auto">
                                 <div className="text-xs text-white/50 font-bold mb-4">Productivity</div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <div className="aspect-square bg-[#0078D7] rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer shadow-sm border border-white/10"><Layers className="w-8 h-8 text-white mb-2"/><span className="text-[10px]">Edge</span></div>
                                    <div className="aspect-square bg-emerald-600 rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer shadow-sm border border-white/10"><HardDrive className="w-8 h-8 text-white mb-2"/><span className="text-[10px]">Files</span></div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Taskbar */}
                        <div className="absolute bottom-0 w-full h-[40px] bg-slate-900/90 backdrop-blur-md border-t border-slate-700 z-30 flex items-center justify-between px-1">
                           <div className="flex items-center gap-1 h-full">
                              <button onClick={() => {setShowStart(!showStart); setShowPower(false);}} className={\`h-full px-3 hover:bg-white/10 flex items-center justify-center transition-colors \${showStart ? 'bg-white/10' : ''}\`}>
                                 <div className="grid grid-cols-2 gap-[1px] transform -skew-x-6 -skew-y-3">
                                    <div className="w-2.5 h-2.5 bg-white"></div><div className="w-2.5 h-2.5 bg-white"></div>
                                    <div className="w-2.5 h-2.5 bg-white"></div><div className="w-2.5 h-2.5 bg-white"></div>
                                 </div>
                              </button>
                              <div className="w-48 h-7 bg-white/5 border border-white/10 rounded px-3 flex items-center text-white/40 text-[11px]">Type here to search</div>
                           </div>
                           <div className="flex items-center h-full text-white text-[10px] text-right px-3 hover:bg-white/10 cursor-default transition-colors">
                              <div className="flex flex-col">
                                 <span>{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 <span>{time.toLocaleDateString()}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Monitor Stand (Decorative) */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-800 rounded-b-xl -z-10"></div>
               </div>
            </div>
         )}
      </div>
   );
}
`;

  const finalContent = content.substring(0, startIndex) + newComponent + content.substring(endIndex);
  fs.writeFileSync("src/components/simulation/MiniSimulators.tsx", finalContent, "utf8");
  console.log("Successfully replaced ComputerSystemSimulator with Assembly capabilities.");
} else {
  console.error("Could not find start or end match.");
}
