import fs from "fs";

let content = fs.readFileSync("src/components/simulation/MiniSimulators.tsx", "utf8");

const startMatch = "// -- HELPER: Photorealistic CSS 3D Box --";
const endMatch = "export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {";

let startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch);

if (startIndex !== -1 && endIndex !== -1) {
  const newComponent = `// -- HELPER: Solid CSS 3D Box --
const SolidBox: React.FC<{ w: number | string, h: number | string, d: number, colorTop?: string, colorFront?: string, colorSide?: string, className?: string, children?: React.ReactNode }> = ({ w, h, d, colorTop = '#475569', colorFront = '#334155', colorSide = '#1e293b', className = '', children }) => {
   return (
      <div className={\`absolute \${className}\`} style={{ width: w, height: h, transformStyle: 'preserve-3d', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
         <div className="absolute flex items-center justify-center overflow-hidden" style={{ width: '100%', height: '100%', backgroundColor: colorFront, transform: \`translateZ(\${d/2}px)\` }}>{children}</div>
         <div className="absolute" style={{ width: '100%', height: '100%', backgroundColor: colorSide, transform: \`rotateY(180deg) translateZ(\${d/2}px)\` }}></div>
         <div className="absolute" style={{ width: d, height: '100%', backgroundColor: colorSide, transform: \`rotateY(90deg) translateZ(calc(\${typeof w === 'number' ? w : w.replace('px','')}px / 2))\` }}></div>
         <div className="absolute" style={{ width: d, height: '100%', backgroundColor: colorSide, transform: \`rotateY(-90deg) translateZ(calc(\${typeof w === 'number' ? w : w.replace('px','')}px / 2))\` }}></div>
         <div className="absolute" style={{ width: '100%', height: d, backgroundColor: colorTop, transform: \`rotateX(90deg) translateZ(calc(\${typeof h === 'number' ? h : h.replace('px','')}px / 2))\` }}></div>
         <div className="absolute" style={{ width: '100%', height: d, backgroundColor: colorSide, transform: \`rotateX(-90deg) translateZ(calc(\${typeof h === 'number' ? h : h.replace('px','')}px / 2))\` }}></div>
      </div>
   );
}

const RealisticComponent: React.FC<{ type: string }> = ({ type }) => {
   switch(type) {
      case 'cpu': 
         return (
            <div className="relative" style={{ width: 100, height: 100, transformStyle: 'preserve-3d' }}>
               <SolidBox w={100} h={100} d={4} colorFront="#226622" colorSide="#114411" colorTop="#114411">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #ffd700 2px, #ffd700 4px)' }}></div>
               </SolidBox>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translateZ(2px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={70} h={70} d={8} colorFront="#e2e8f0" colorSide="#94a3b8" colorTop="#cbd5e1">
                     <div className="w-full h-full flex items-center justify-center border-t-2 border-l-2 border-white/50">
                        <span className="text-[10px] font-black text-slate-500 opacity-60 uppercase text-center">CORE i9<br/>14900K</span>
                     </div>
                  </SolidBox>
               </div>
            </div>
         );
      case 'ram': 
         return (
            <div className="relative" style={{ width: 220, height: 40, transformStyle: 'preserve-3d' }}>
               <SolidBox w={220} h={40} d={3} colorFront="#064e3b" colorSide="#022c22" colorTop="#065f46">
                  <div className="absolute bottom-0 left-4 right-4 h-3 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#fbbf24_2px,#fbbf24_4px)]"></div>
                  <div className="absolute bottom-0 left-[110px] w-4 h-4 bg-transparent border-t-4 border-slate-900 rounded-full"></div>
               </SolidBox>
               <div className="absolute" style={{ top: 10, left: 15, transform: 'translateZ(1.5px)', transformStyle: 'preserve-3d' }}>
                  <div className="flex gap-2.5">
                     {[1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="relative" style={{ width: 15, height: 20, transformStyle: 'preserve-3d' }}>
                           <SolidBox w={15} h={20} d={2} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b" />
                        </div>
                     ))}
                  </div>
               </div>
               <div className="absolute" style={{ top: 16, left: 70, transform: 'translateZ(3px)' }}>
                  <div className="w-24 h-6 bg-white flex items-center justify-center text-[7px] font-bold border border-slate-300 shadow-sm text-slate-800">
                     DDR4 16GB 3200MHz
                  </div>
               </div>
            </div>
         );
      case 'gpu': 
         return (
            <div className="relative" style={{ width: 260, height: 110, transformStyle: 'preserve-3d' }}>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(-15px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={260} h={110} d={4} colorFront="#1e293b" colorSide="#0f172a" colorTop="#0f172a" />
               </div>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(-11px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={250} h={100} d={20} colorFront="#64748b" colorSide="#475569" colorTop="#94a3b8">
                     <div className="w-full h-full opacity-50 bg-[repeating-linear-gradient(90deg,transparent,transparent_3px,#000_3px,#000_5px)]"></div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(9px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={260} h={110} d={12} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b">
                     <div className="absolute top-2 right-12 w-24 h-2 bg-red-600"></div>
                     <div className="absolute bottom-2 left-12 w-24 h-2 bg-red-600"></div>
                  </SolidBox>
               </div>
               <div className="absolute w-full h-full flex items-center justify-around px-4" style={{ transform: 'translateZ(16px)', transformStyle: 'preserve-3d' }}>
                  {[1, 2, 3].map(i => (
                     <div key={i} className="relative w-20 h-20 rounded-full bg-slate-900 border-4 border-slate-700 flex items-center justify-center shadow-[inset_0_0_10px_black] overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center animate-[spin_1s_linear_infinite]">
                           {[1,2,3,4,5,6,7,8,9,10,11].map(j => (
                              <div key={j} className="absolute w-full h-2 bg-slate-800 opacity-90" style={{ transform: \`rotate(\${j*30}deg)\` }}></div>
                           ))}
                        </div>
                        <div className="w-6 h-6 bg-slate-950 rounded-full z-10 border border-slate-700 flex items-center justify-center">
                           <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                     </div>
                  ))}
               </div>
               <div className="absolute" style={{ bottom: -5, left: 110, transform: 'translateZ(-15px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={120} h={10} d={2} colorFront="#fbbf24" colorSide="#b45309" colorTop="#fbbf24" />
               </div>
            </div>
         );
      case 'motherboard': 
         return (
            <div className="relative" style={{ width: 280, height: 280, transformStyle: 'preserve-3d' }}>
               <SolidBox w={280} h={280} d={6} colorFront="#1e293b" colorSide="#0f172a" colorTop="#0f172a">
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
               </SolidBox>
               <div className="absolute" style={{ top: 95, left: 95, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={90} h={90} d={6} colorFront="#cbd5e1" colorSide="#94a3b8" colorTop="#94a3b8">
                     <div className="w-full h-full flex items-center justify-center border-4 border-slate-400 bg-slate-300">
                        <div className="w-16 h-16 bg-slate-800 rounded-sm"></div>
                     </div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: 95, left: 166, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={12} h={110} d={12} colorFront="#111" colorSide="#000" colorTop="#333" />
               </div>
               <div className="absolute" style={{ top: 95, left: 186, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={12} h={110} d={12} colorFront="#444" colorSide="#222" colorTop="#555" />
               </div>
               <div className="absolute" style={{ top: 95, left: 206, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={12} h={110} d={12} colorFront="#111" colorSide="#000" colorTop="#333" />
               </div>
               <div className="absolute" style={{ top: 95, left: 226, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={12} h={110} d={12} colorFront="#444" colorSide="#222" colorTop="#555" />
               </div>
               <div className="absolute" style={{ bottom: 97, left: 130, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={160} h={14} d={14} colorFront="#111" colorSide="#000" colorTop="#333">
                     <div className="w-full h-1 bg-yellow-500 mt-1"></div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ bottom: 57, left: 130, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={160} h={14} d={14} colorFront="#111" colorSide="#000" colorTop="#333">
                     <div className="w-full h-1 bg-yellow-500 mt-1"></div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ bottom: 70, right: 70, transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={60} h={60} d={15} colorFront="#b91c1c" colorSide="#7f1d1d" colorTop="#ef4444">
                     <div className="w-full h-full flex flex-col justify-between p-1">
                        {[1,2,3,4,5].map(i => <div key={i} className="w-full h-1 bg-black/40"></div>)}
                     </div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: 200, left: 80, transform: 'translateZ(4px)' }}>
                  <div className="w-10 h-10 rounded-full bg-slate-300 border-4 border-slate-400 shadow-xl flex items-center justify-center">
                     <span className="text-[6px] font-bold text-slate-500">CR2032</span>
                  </div>
               </div>
            </div>
         );
      case 'storage': 
         return (
            <div className="relative" style={{ width: 100, height: 140, transformStyle: 'preserve-3d' }}>
               <SolidBox w={100} h={140} d={18} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155">
                  <div className="w-full h-full p-2">
                     <div className="w-full h-full bg-slate-900 border-2 border-slate-700 flex flex-col items-center p-3 relative overflow-hidden">
                        <div className="absolute top-0 w-full h-6 bg-blue-600 mb-2 border-b-4 border-blue-800"></div>
                        <span className="text-white font-black text-[14px] uppercase mt-4 z-10">SSD</span>
                        <span className="text-white/70 font-bold text-[10px] mt-1 z-10">1TB / SATA III</span>
                        <div className="w-full mt-auto h-10 bg-white/10 flex flex-col gap-1.5 p-1.5 rounded border border-white/5">
                           <div className="w-full h-1.5 bg-white/20 rounded"></div>
                           <div className="w-3/4 h-1.5 bg-white/20 rounded"></div>
                        </div>
                     </div>
                  </div>
               </SolidBox>
               <div className="absolute" style={{ bottom: 12, left: 0, transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={4} h={24} d={10} colorFront="#000" colorSide="#000" colorTop="#222" />
               </div>
            </div>
         );
      case 'keyboard': 
         return (
            <div className="relative" style={{ width: 300, height: 110, transformStyle: 'preserve-3d' }}>
               <SolidBox w={300} h={110} d={8} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155">
                  <div className="w-full h-full p-2 grid grid-cols-[repeat(16,minmax(0,1fr))] grid-rows-5 gap-1">
                     {[...Array(80)].map((_, i) => (
                        <div key={i} className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                           <SolidBox w="100%" h="100%" d={6} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b" />
                        </div>
                     ))}
                  </div>
               </SolidBox>
            </div>
         );
      case 'mouse': 
         return (
            <div className="relative" style={{ width: 70, height: 110, transformStyle: 'preserve-3d' }}>
               <SolidBox w={70} h={110} d={24} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155" className="rounded-full shadow-2xl">
                  <div className="w-full h-1/2 flex justify-center gap-1 p-1 border-b-2 border-slate-900 mt-2">
                     <div className="flex-1 bg-slate-800 rounded-tl-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
                     <div className="w-5 h-12 bg-slate-950 rounded-full shadow-inner flex items-center justify-center">
                        <div className="w-2.5 h-6 bg-slate-700 rounded-full border border-slate-600"></div>
                     </div>
                     <div className="flex-1 bg-slate-800 rounded-tr-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
                  </div>
                  <div className="w-full flex justify-center mt-4">
                     <div className="w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-900">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_red]"></div>
                     </div>
                  </div>
               </SolidBox>
            </div>
         );
      case 'monitor': 
         return (
            <div className="relative" style={{ width: 280, height: 180, transformStyle: 'preserve-3d' }}>
               <div className="absolute" style={{ top: 80, left: 140, transform: 'translateZ(10px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={280} h={160} d={12} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b">
                     <div className="absolute inset-3 bg-blue-900 overflow-hidden rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-slate-800">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/40 to-blue-800/40"></div>
                        <div className="absolute bottom-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_cyan]"></div>
                     </div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ bottom: 25, left: 140, transform: 'translateZ(2px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={20} h={50} d={14} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155" />
               </div>
               <div className="absolute" style={{ bottom: 15, left: 140, transform: 'rotateX(90deg) translateZ(-20px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={100} h={70} d={8} colorFront="#334155" colorSide="#1e293b" colorTop="#475569" />
               </div>
            </div>
         );
      case 'printer': 
         return (
            <div className="relative" style={{ width: 200, height: 140, transformStyle: 'preserve-3d' }}>
               <div className="absolute" style={{ top: 70, left: 100, transformStyle: 'preserve-3d' }}>
                  <SolidBox w={200} h={140} d={120} colorFront="#e2e8f0" colorSide="#cbd5e1" colorTop="#f8fafc">
                     <div className="absolute bottom-4 left-10 w-[120px] h-6 bg-slate-900 flex justify-center rounded-sm">
                        <div className="w-24 h-2 bg-white shadow-md transform translate-y-2 border border-slate-200"></div>
                     </div>
                     <div className="absolute top-4 right-4 w-14 h-24 bg-slate-800 rounded flex flex-col items-center py-3 gap-3">
                        <div className="w-10 h-6 bg-green-500 rounded-sm shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] flex items-center justify-center">
                           <span className="text-[6px] text-black/50 font-bold">READY</span>
                        </div>
                        <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                     </div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: -5, left: 100, transform: 'rotateX(-25deg) translateZ(40px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={140} h={70} d={6} colorFront="#cbd5e1" colorSide="#94a3b8" colorTop="#e2e8f0">
                     <div className="w-[120px] h-[60px] bg-white mx-auto mt-2 shadow-sm border border-slate-200"></div>
                  </SolidBox>
               </div>
            </div>
         );
      default: return null;
   }
}
`;

  const finalContent = content.substring(0, startIndex) + newComponent + content.substring(endIndex);
  fs.writeFileSync("src/components/simulation/MiniSimulators.tsx", finalContent, "utf8");
  console.log("Successfully replaced Box3D with SolidBox and rebuilt all components as pure CSS 3D.");
} else {
  console.error("Could not find start or end match.");
}
