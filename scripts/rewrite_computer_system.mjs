import fs from "fs";

let content = fs.readFileSync("src/components/simulation/MiniSimulators.tsx", "utf8");

const startMatch = "export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";
const endMatch = "export const DataAnalysisSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";

const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch);

if (startIndex !== -1 && endIndex !== -1) {
  const newComponent = `export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const [activeTab, setActiveTab] = useState<'menu' | 'hardware' | 'software' | 'brainware'>('menu');
   
   if (activeTab === 'hardware') {
      return <HardwareExplorer onBack={() => setActiveTab('menu')} />;
   }
   if (activeTab === 'software') {
      return <SoftwareExplorer onBack={() => setActiveTab('menu')} />;
   }
   if (activeTab === 'brainware') {
      return <BrainwareExplorer onBack={() => setActiveTab('menu')} />;
   }

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
            <div className="w-[150px]"></div>{/* spacer */}
         </div>

         <p className="text-sm font-medium text-slate-400 mb-12 text-center max-w-xl">
            Sistem Komputer terdiri dari 3 elemen utama agar dapat berfungsi: Hardware (Perangkat Keras), Software (Perangkat Lunak), dan Brainware (Pengguna). Pilih salah satu elemen untuk menjelajahi lebih lanjut.
         </p>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            {/* Hardware Card */}
            <button 
               onClick={() => setActiveTab('hardware')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Cpu className="w-10 h-10 text-emerald-400" />
               </div>
               <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3">Hardware</h3>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Perangkat Keras. Eksplorasi komponen fisik komputer seperti Motherboard, CPU, RAM, dan lainnya dalam bentuk 3D realistis.
               </p>
            </button>

            {/* Software Card */}
            <button 
               onClick={() => setActiveTab('software')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Monitor className="w-10 h-10 text-blue-400" />
               </div>
               <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3">Software</h3>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Perangkat Lunak. Pelajari berbagai macam sistem operasi, aplikasi, dan utilitas beserta fungsinya.
               </p>
            </button>

            {/* Brainware Card */}
            <button 
               onClick={() => setActiveTab('brainware')}
               className="group relative overflow-hidden p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 transition-all text-left flex flex-col items-center text-center"
            >
               <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <MousePointer2 className="w-10 h-10 text-purple-400" />
               </div>
               <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3">Brainware</h3>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Pengguna. Kenali tingkatan pengguna komputer mulai dari System Analyst, Programmer, hingga End User.
               </p>
            </button>
         </div>
      </div>
   );
}

const HardwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [selectedComp, setSelectedComp] = useState(0);

   const components = [
      { 
         id: 'cpu', 
         name: 'Prosesor (CPU)', 
         subtitle: 'Central Processing Unit',
         desc: 'Otak dari komputer. Bertugas memproses semua instruksi dan operasi logika maupun matematika.', 
         color: 'from-emerald-600 to-emerald-800',
         icon: Cpu
      },
      { 
         id: 'ram', 
         name: 'RAM', 
         subtitle: 'Random Access Memory',
         desc: 'Penyimpanan data sementara yang sangat cepat. Membantu CPU menyimpan data aplikasi yang sedang berjalan.', 
         color: 'from-blue-600 to-blue-800',
         icon: HardDrive
      },
      { 
         id: 'motherboard', 
         name: 'Motherboard', 
         subtitle: 'Papan Induk',
         desc: 'Papan sirkuit utama yang menghubungkan dan menjadi tulang punggung komunikasi semua komponen perangkat keras.', 
         color: 'from-amber-600 to-amber-800',
         icon: Monitor
      },
      { 
         id: 'gpu', 
         name: 'Kartu Grafis (GPU)', 
         subtitle: 'Graphics Processing Unit',
         desc: 'Memproses dan menghasilkan gambar, video, dan grafik 3D untuk ditampilkan di layar monitor.', 
         color: 'from-rose-600 to-rose-800',
         icon: Monitor
      },
      { 
         id: 'storage', 
         name: 'Penyimpanan (SSD/HDD)', 
         subtitle: 'Solid State Drive / Hard Disk',
         desc: 'Tempat penyimpanan data permanen. Semua sistem operasi, aplikasi, dan file Anda disimpan di sini.', 
         color: 'from-purple-600 to-purple-800',
         icon: HardDrive
      },
   ];

   const active = components[selectedComp];

   return (
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Menu
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-emerald-400">Hardware (Perangkat Keras)</h2>
            <div className="w-[150px]"></div>
         </div>

         <div className="flex flex-col md:flex-row gap-8 flex-1">
            {/* 3D Viewer Area */}
            <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden perspective-1000">
               {/* Grid Background */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               
               {/* 3D Simulated Object */}
               <div className="relative z-10 w-64 h-64 transition-all duration-700 transform-style-3d hover:scale-110" style={{ transform: 'rotateX(20deg) rotateY(-30deg)' }}>
                  {/* Layer 1 - Shadow */}
                  <div className="absolute bottom-[-40px] left-0 w-full h-10 bg-black/60 blur-xl transform rotateX(90deg)"></div>
                  
                  {/* Layer 2 - Body */}
                  <div className={\`absolute inset-0 bg-gradient-to-br \${active.color} rounded-2xl shadow-2xl border border-white/10 flex flex-col items-center justify-center transform translate-z-10\`}>
                     <active.icon className="w-24 h-24 text-white/80 drop-shadow-lg mb-4" />
                     <div className="text-white font-black text-xl tracking-wider drop-shadow-md">{active.name}</div>
                  </div>
                  
                  {/* Layer 3 - Floating accents (pseudo 3D depth) */}
                  <div className="absolute inset-4 border-2 border-white/20 rounded-xl transform translate-z-20 pointer-events-none"></div>
                  <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-white/30 transform translate-z-30 pointer-events-none"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-white/30 transform translate-z-30 pointer-events-none"></div>
               </div>
            </div>

            {/* Info & Selectors */}
            <div className="w-full md:w-[350px] flex flex-col gap-4">
               <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{active.name}</h3>
                  <div className="text-xs font-bold text-emerald-400 mb-4">{active.subtitle}</div>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed">
                     {active.desc}
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-2">
                  {components.map((comp, idx) => (
                     <button
                        key={comp.id}
                        onClick={() => setSelectedComp(idx)}
                        className={\`p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center text-center gap-2 border \${selectedComp === idx ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}\`}
                     >
                        <comp.icon className="w-5 h-5" />
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
      {
         name: "Sistem Operasi",
         desc: "Perangkat lunak dasar yang mengelola perangkat keras dan menyediakan layanan umum untuk program komputer. Tanpa OS, komputer tidak bisa dijalankan.",
         examples: ["Windows", "macOS", "Linux", "Android", "iOS"],
         icon: Layers,
         color: "text-blue-400",
         bg: "bg-blue-500/10",
         border: "border-blue-500/30"
      },
      {
         name: "Perangkat Lunak Aplikasi",
         desc: "Program yang dirancang untuk membantu pengguna melakukan tugas spesifik, seperti mengetik, mendesain, atau berselancar di internet.",
         examples: ["Microsoft Word", "Google Chrome", "Adobe Photoshop", "WhatsApp"],
         icon: Monitor,
         color: "text-emerald-400",
         bg: "bg-emerald-500/10",
         border: "border-emerald-500/30"
      },
      {
         name: "Perangkat Lunak Utilitas",
         desc: "Program yang membantu mengelola, memelihara, dan mengendalikan sumber daya komputer.",
         examples: ["Antivirus", "WinRAR", "Disk Defragmenter", "Task Manager"],
         icon: Settings,
         color: "text-amber-400",
         bg: "bg-amber-500/10",
         border: "border-amber-500/30"
      },
      {
         name: "Bahasa Pemrograman",
         desc: "Perangkat lunak yang digunakan oleh programmer untuk menulis instruksi (kode) yang akan dieksekusi oleh komputer.",
         examples: ["Python", "JavaScript", "C++", "Java", "PHP"],
         icon: Code,
         color: "text-purple-400",
         bg: "bg-purple-500/10",
         border: "border-purple-500/30"
      }
   ];

   return (
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Menu
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-blue-400">Software (Perangkat Lunak)</h2>
            <div className="w-[150px]"></div>
         </div>

         <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 flex flex-col gap-3">
               {softwareTypes.map((sw, idx) => (
                  <button
                     key={idx}
                     onClick={() => setSelectedType(idx)}
                     className={\`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all \${selectedType === idx ? sw.bg + ' ' + sw.border + ' shadow-lg' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100 hover:bg-slate-700'}\`}
                  >
                     <div className={\`p-2 rounded-xl \${selectedType === idx ? 'bg-slate-900' : 'bg-slate-700'}\`}>
                        <sw.icon className={\`w-5 h-5 \${selectedType === idx ? sw.color : 'text-slate-400'}\`} />
                     </div>
                     <span className={\`text-sm font-black uppercase tracking-wider \${selectedType === idx ? 'text-white' : 'text-slate-300'}\`}>
                        {sw.name}
                     </span>
                  </button>
               ))}
            </div>

            <div className="flex-1 bg-slate-800 rounded-3xl border border-slate-700 p-8 flex flex-col">
               <div className="flex items-center gap-4 mb-6">
                  <div className={\`p-4 rounded-2xl \${softwareTypes[selectedType].bg}\`}>
                     {React.createElement(softwareTypes[selectedType].icon, { className: \`w-8 h-8 \${softwareTypes[selectedType].color}\` })}
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest">{softwareTypes[selectedType].name}</h3>
               </div>
               
               <p className="text-sm font-medium text-slate-300 leading-relaxed mb-8 flex-1">
                  {softwareTypes[selectedType].desc}
               </p>

               <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contoh {softwareTypes[selectedType].name}:</h4>
                  <div className="flex flex-wrap gap-2">
                     {softwareTypes[selectedType].examples.map((ex, i) => (
                        <span key={i} className={\`px-4 py-2 rounded-xl text-xs font-bold border \${softwareTypes[selectedType].border} \${softwareTypes[selectedType].color} bg-slate-900 shadow-sm\`}>
                           {ex}
                        </span>
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
      {
         title: "System Analyst",
         subtitle: "Arsitek Sistem",
         desc: "Orang yang menganalisis, merancang, dan mengimplementasikan sistem untuk memenuhi kebutuhan pengguna. Mereka adalah jembatan antara masalah bisnis dan solusi teknologi.",
         color: "from-purple-500 to-indigo-600",
         icon: Brain
      },
      {
         title: "Programmer",
         subtitle: "Pengembang Kode",
         desc: "Orang yang menulis, menguji, dan memelihara kode instruksi komputer (software) berdasarkan desain yang dibuat oleh System Analyst.",
         color: "from-blue-500 to-cyan-600",
         icon: Code
      },
      {
         title: "Administrator",
         subtitle: "Pengelola Sistem",
         desc: "Orang yang bertugas mengelola, mengatur, dan menjaga keamanan sebuah sistem komputer atau jaringan agar berjalan dengan baik dan stabil.",
         color: "from-emerald-500 to-teal-600",
         icon: Settings
      },
      {
         title: "End User / Operator",
         subtitle: "Pengguna Akhir",
         desc: "Orang yang menggunakan komputer atau perangkat lunak untuk menyelesaikan tugas sehari-hari. Contohnya: staf admin, kasir, atau Anda saat menggunakan aplikasi.",
         color: "from-orange-500 to-amber-600",
         icon: Users
      }
   ];

   return (
      <div className="p-6 bg-slate-900 rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-8">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Menu
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-widest text-purple-400">Brainware (Pengguna)</h2>
            <div className="w-[150px]"></div>
         </div>

         <div className="w-full max-w-3xl flex flex-col gap-4">
            {levels.map((level, idx) => (
               <div key={idx} className="group relative bg-slate-800 border border-slate-700 p-6 rounded-3xl flex flex-col md:flex-row items-center md:items-start gap-6 hover:bg-slate-800/80 transition-all overflow-hidden">
                  {/* Decorative background blur */}
                  <div className={\`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br \${level.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity\`}></div>

                  <div className={\`w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br \${level.color} flex items-center justify-center shadow-lg shadow-black/20\`}>
                     <level.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left z-10">
                     <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">{level.title}</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">{level.subtitle}</span>
                     </div>
                     <p className="text-sm font-medium text-slate-300 leading-relaxed">
                        {level.desc}
                     </p>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

`;

  const finalContent = content.substring(0, startIndex) + newComponent + content.substring(endIndex);
  fs.writeFileSync("src/components/simulation/MiniSimulators.tsx", finalContent, "utf8");
  console.log("Successfully replaced ComputerSystemSimulator.");
} else {
  console.error("Could not find start or end match.");
}
