import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Lock, Volume2, Keyboard, Printer, Search, Wifi, Battery, MessageSquare, Menu, LayoutGrid, FileText, Image as ImageIcon, Video, Chrome, Music, Calculator, CloudRain, Power, Loader2, Play, PowerOff, ShieldCheck, Zap, Brain, Code, Layers, Settings, Users, Check, RefreshCw, Cpu, Monitor, HardDrive, Mouse, MousePointer2, Database, X, Share2, Type, Box, Command, Terminal, Server } from 'lucide-react';

interface SimulatorProps {
  onBack: () => void;
}

// -- HELPER: Interactive 3D Viewport --
const Interactive3DView: React.FC<{children: React.ReactNode, initialRot?: {x: number, y: number}}> = ({ children, initialRot = {x: 20, y: -30} }) => {
   const [rot, setRot] = useState(initialRot);
   const [isDragging, setIsDragging] = useState(false);
   const [lastPos, setLastPos] = useState({x:0, y:0});

   // Auto-rotate
   useEffect(() => {
      if (isDragging) return;
      const t = setInterval(() => {
         setRot(prev => ({ ...prev, y: prev.y + 0.5 }));
      }, 30);
      return () => clearInterval(t);
   }, [isDragging]);

   const onMouseDown = (e: any) => { setIsDragging(true); setLastPos({x: e.clientX, y: e.clientY}); };
   const onMouseUp = () => setIsDragging(false);
   const onMouseMove = (e: any) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setRot(prev => ({ x: prev.x - dy * 0.5, y: prev.y + dx * 0.5 }));
      setLastPos({x: e.clientX, y: e.clientY});
   };

   return (
      <div 
         className="w-full h-full perspective-[1000px] cursor-grab active:cursor-grabbing absolute inset-0 flex items-center justify-center z-10"
         onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onMouseMove={onMouseMove}
         onTouchStart={(e) => { setIsDragging(true); setLastPos({x: e.touches[0].clientX, y: e.touches[0].clientY}); }}
         onTouchEnd={onMouseUp}
         onTouchMove={(e) => {
            if (!isDragging) return;
            const dx = e.touches[0].clientX - lastPos.x;
            const dy = e.touches[0].clientY - lastPos.y;
            setRot(prev => ({ x: prev.x - dy * 0.5, y: prev.y + dx * 0.5 }));
            setLastPos({x: e.touches[0].clientX, y: e.touches[0].clientY});
         }}
      >
         <div style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`, transformStyle: 'preserve-3d', transition: isDragging ? 'none' : 'transform 0.05s linear' }} className="relative w-full h-full flex items-center justify-center">
            {children}
         </div>
      </div>
   );
}

// -- HELPER: Solid CSS 3D Box --
const SolidBox: React.FC<{ w: number | string, h: number | string, d: number, colorTop?: string, colorFront?: string, colorSide?: string, className?: string, children?: React.ReactNode, imgFront?: string, imgTop?: string, imgSide?: string }> = ({ w, h, d, colorTop = '#475569', colorFront = '#334155', colorSide = '#1e293b', className = '', children, imgFront, imgTop, imgSide }) => {
   return (
      <div className={`absolute ${className}`} style={{ width: w, height: h, transformStyle: 'preserve-3d', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
         <div className="absolute flex items-center justify-center overflow-hidden" style={{ width: '100%', height: '100%', backgroundColor: colorFront, backgroundImage: imgFront ? `url(${imgFront})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `translateZ(${d/2}px)` }}>{children}</div>
         <div className="absolute" style={{ width: '100%', height: '100%', backgroundColor: colorSide, backgroundImage: imgSide ? `url(${imgSide})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `rotateY(180deg) translateZ(${d/2}px)` }}></div>
         <div className="absolute" style={{ width: d, height: '100%', backgroundColor: colorSide, backgroundImage: imgSide ? `url(${imgSide})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `rotateY(90deg) translateZ(calc(${typeof w === 'number' ? w : w.replace('px','')}px / 2))` }}></div>
         <div className="absolute" style={{ width: d, height: '100%', backgroundColor: colorSide, backgroundImage: imgSide ? `url(${imgSide})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `rotateY(-90deg) translateZ(calc(${typeof w === 'number' ? w : w.replace('px','')}px / 2))` }}></div>
         <div className="absolute" style={{ width: '100%', height: d, backgroundColor: colorTop, backgroundImage: imgTop ? `url(${imgTop})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `rotateX(90deg) translateZ(calc(${typeof h === 'number' ? h : h.replace('px','')}px / 2))` }}></div>
         <div className="absolute" style={{ width: '100%', height: d, backgroundColor: colorSide, backgroundImage: imgSide ? `url(${imgSide})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', transform: `rotateX(-90deg) translateZ(calc(${typeof h === 'number' ? h : h.replace('px','')}px / 2))` }}></div>
      </div>
   );
}

const RealisticComponent: React.FC<{ type: string }> = ({ type }) => {
   switch(type) {
      case 'cpu': 
         return (
            <div className="relative" style={{ width: 100, height: 100, transformStyle: 'preserve-3d' }}>
               <SolidBox w={100} h={100} d={6} colorFront="#226622" colorSide="#114411" colorTop="#114411" imgTop="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=200&q=80">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #ffd700 2px, #ffd700 4px)' }}></div>
               </SolidBox>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translateZ(3px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={70} h={70} d={8} colorFront="#e2e8f0" colorSide="#94a3b8" colorTop="#cbd5e1" imgFront="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=200&q=80">
                     <div className="w-full h-full flex items-center justify-center border-t-2 border-l-2 border-white/50 bg-black/30 backdrop-blur-sm">
                        <span className="text-[10px] font-black text-white uppercase text-center drop-shadow-md">CORE i9<br/>14900K</span>
                     </div>
                  </SolidBox>
               </div>
            </div>
         );
      case 'ram': 
         return (
            <div className="relative" style={{ width: 220, height: 40, transformStyle: 'preserve-3d' }}>
               <SolidBox w={220} h={40} d={4} colorFront="#064e3b" colorSide="#022c22" colorTop="#065f46" imgFront="https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80">
                  <div className="absolute bottom-0 left-4 right-4 h-3 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#fbbf24_2px,#fbbf24_4px)] opacity-90"></div>
                  <div className="absolute bottom-0 left-[110px] w-4 h-4 bg-transparent border-t-4 border-slate-900 rounded-full"></div>
               </SolidBox>
               <div className="absolute" style={{ top: 10, left: 15, transform: 'translateZ(2px)', transformStyle: 'preserve-3d' }}>
                  <div className="flex gap-2.5">
                     {[1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="relative" style={{ width: 15, height: 20, transformStyle: 'preserve-3d' }}>
                           <SolidBox w={15} h={20} d={3} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b" />
                        </div>
                     ))}
                  </div>
               </div>
               <div className="absolute" style={{ top: 16, left: 70, transform: 'translateZ(4px)' }}>
                  <div className="w-24 h-6 bg-white/90 backdrop-blur-sm flex items-center justify-center text-[7px] font-bold border border-slate-300 shadow-lg text-slate-800">
                     DDR4 16GB 3200MHz
                  </div>
               </div>
            </div>
         );
      case 'gpu': 
         return (
            <div className="relative" style={{ width: 260, height: 110, transformStyle: 'preserve-3d' }}>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(-15px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={260} h={110} d={4} colorFront="#1e293b" colorSide="#0f172a" colorTop="#0f172a" imgFront="https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80" />
               </div>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(-11px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={250} h={100} d={20} colorFront="#64748b" colorSide="#475569" colorTop="#94a3b8">
                     <div className="w-full h-full opacity-50 bg-[repeating-linear-gradient(90deg,transparent,transparent_3px,#000_3px,#000_5px)]"></div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: 55, left: 130, transform: 'translateZ(9px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={260} h={110} d={12} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b">
                     <div className="absolute top-2 right-12 w-24 h-2 bg-red-600 shadow-[0_0_10px_red]"></div>
                     <div className="absolute bottom-2 left-12 w-24 h-2 bg-red-600 shadow-[0_0_10px_red]"></div>
                  </SolidBox>
               </div>
               <div className="absolute w-full h-full flex items-center justify-around px-4" style={{ transform: 'translateZ(16px)', transformStyle: 'preserve-3d' }}>
                  {[1, 2, 3].map(i => (
                     <div key={i} className="relative w-20 h-20 rounded-full bg-slate-900 border-4 border-slate-700 flex items-center justify-center shadow-[inset_0_0_10px_black] overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center animate-[spin_1s_linear_infinite]">
                           {[1,2,3,4,5,6,7,8,9,10,11].map(j => (
                              <div key={j} className="absolute w-full h-2 bg-slate-800 opacity-90" style={{ transform: `rotate(${j*30}deg)` }}></div>
                           ))}
                        </div>
                        <div className="w-6 h-6 bg-slate-950 rounded-full z-10 border border-slate-700 flex items-center justify-center shadow-lg">
                           <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]"></div>
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
               <SolidBox w={280} h={280} d={6} colorFront="#1e293b" colorSide="#0f172a" colorTop="#0f172a" imgFront="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
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
               <SolidBox w={100} h={140} d={18} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155" imgFront="https://images.unsplash.com/photo-1531492746076-161ca9bcad58?auto=format&fit=crop&w=200&q=80">
                  <div className="w-full h-full p-2 bg-black/20 backdrop-blur-sm">
                     <div className="w-full h-full bg-slate-900/90 border-2 border-slate-700 flex flex-col items-center p-3 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 w-full h-6 bg-blue-600 mb-2 border-b-4 border-blue-800"></div>
                        <span className="text-white font-black text-[14px] uppercase mt-4 z-10 drop-shadow-md">SSD / HDD</span>
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
      case 'psu': 
         return (
            <div className="relative" style={{ width: 150, height: 150, transformStyle: 'preserve-3d' }}>
               <SolidBox w={150} h={150} d={140} colorFront="#111" colorSide="#222" colorTop="#1a1a1a" imgFront="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full border-4 border-slate-700 flex items-center justify-center bg-black/60 shadow-[inset_0_0_20px_black]">
                     <div className="absolute w-full h-full animate-[spin_2s_linear_infinite] flex items-center justify-center">
                        {[1,2,3,4,5,6,7].map(i => (
                           <div key={i} className="absolute w-full h-6 bg-slate-800/80 rounded-full" style={{ transform: `rotate(${i*25}deg)` }}></div>
                        ))}
                     </div>
                     <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-600 z-10 flex items-center justify-center">
                        <span className="text-[6px] font-bold text-white">750W</span>
                     </div>
                  </div>
               </SolidBox>
               <div className="absolute" style={{ bottom: 20, right: -10, transform: 'rotateY(90deg) translateZ(70px)', transformStyle: 'preserve-3d' }}>
                  <div className="flex flex-col gap-2">
                     <div className="w-12 h-6 bg-black border border-slate-700 rounded-sm flex items-center justify-center shadow-lg"><div className="w-8 h-2 bg-slate-800 rounded-sm"></div></div>
                     <div className="w-10 h-6 bg-black border border-slate-700 rounded-sm flex items-center justify-center shadow-lg"><div className="w-6 h-2 bg-slate-800 rounded-sm"></div></div>
                     <div className="w-4 h-6 bg-red-600 rounded-sm shadow-[0_0_5px_red] mt-2 border border-red-800"></div>
                  </div>
               </div>
            </div>
         );
      case 'cooling': 
         return (
            <div className="relative" style={{ width: 120, height: 120, transformStyle: 'preserve-3d' }}>
               <SolidBox w={120} h={120} d={40} colorFront="#cbd5e1" colorSide="#94a3b8" colorTop="#e2e8f0">
                  <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#475569_2px,#475569_4px)] opacity-50"></div>
               </SolidBox>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={120} h={120} d={10} colorFront="#111" colorSide="#222" colorTop="#0a0a0a">
                     <div className="w-full h-full flex items-center justify-center">
                        <div className="w-[110px] h-[110px] rounded-full border-2 border-slate-700 bg-black overflow-hidden flex items-center justify-center relative shadow-[inset_0_0_15px_black]">
                           <div className="absolute inset-0 flex items-center justify-center animate-[spin_0.5s_linear_infinite]">
                              {[1,2,3,4,5,6,7,8,9].map(i => (
                                 <div key={i} className="absolute w-full h-4 bg-blue-500/80 shadow-[0_0_15px_blue]" style={{ transform: `rotate(${i*20}deg)` }}></div>
                              ))}
                           </div>
                           <div className="w-10 h-10 bg-slate-900 rounded-full z-10 border border-slate-600 flex items-center justify-center">
                              <span className="text-[6px] font-bold text-white shadow-lg">COOLER</span>
                           </div>
                        </div>
                     </div>
                  </SolidBox>
               </div>
            </div>
         );
      case 'keyboard': 
         return (
            <div className="relative" style={{ width: 300, height: 110, transformStyle: 'preserve-3d' }}>
               <SolidBox w={300} h={110} d={8} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155" imgFront="https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80">
                  <div className="w-full h-full p-2 grid grid-cols-[repeat(16,minmax(0,1fr))] grid-rows-5 gap-1 bg-black/50 backdrop-blur-sm">
                     {[...Array(80)].map((_, i) => (
                        <div key={i} className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                           <SolidBox w="100%" h="100%" d={6} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b" className="shadow-lg hover:translate-z-[-2px] transition-transform cursor-pointer" />
                        </div>
                     ))}
                  </div>
               </SolidBox>
            </div>
         );
      case 'mouse': 
         return (
            <div className="relative" style={{ width: 70, height: 110, transformStyle: 'preserve-3d' }}>
               <SolidBox w={70} h={110} d={24} colorFront="#1e293b" colorSide="#0f172a" colorTop="#334155" className="rounded-full shadow-2xl" imgFront="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=200&q=80">
                  <div className="w-full h-1/2 flex justify-center gap-1 p-1 border-b-2 border-slate-900 mt-2 bg-black/20 backdrop-blur-sm">
                     <div className="flex-1 bg-slate-800 rounded-tl-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] hover:bg-slate-700 cursor-pointer transition-colors"></div>
                     <div className="w-5 h-12 bg-slate-950 rounded-full shadow-inner flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors">
                        <div className="w-2.5 h-6 bg-slate-700 rounded-full border border-slate-600 shadow-[0_0_5px_cyan]"></div>
                     </div>
                     <div className="flex-1 bg-slate-800 rounded-tr-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] hover:bg-slate-700 cursor-pointer transition-colors"></div>
                  </div>
                  <div className="w-full flex justify-center mt-4">
                     <div className="w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-900 shadow-[inset_0_0_10px_black]">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_red] animate-pulse"></div>
                     </div>
                  </div>
               </SolidBox>
            </div>
         );
      case 'monitor': 
         return (
            <div className="relative" style={{ width: 280, height: 180, transformStyle: 'preserve-3d' }}>
               <div className="absolute" style={{ top: 80, left: 140, transform: 'translateZ(10px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={280} h={160} d={12} colorFront="#0f172a" colorSide="#020617" colorTop="#1e293b" imgFront="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80">
                     <div className="absolute inset-2 bg-blue-900 overflow-hidden rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-slate-800">
                        <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1617042375876-a13e36732a04?auto=format&fit=crop&w=600&q=80')"}}></div>
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
                  <SolidBox w={200} h={140} d={120} colorFront="#e2e8f0" colorSide="#cbd5e1" colorTop="#f8fafc" imgFront="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=400&q=80">
                     <div className="absolute bottom-4 left-10 w-[120px] h-6 bg-slate-900 flex justify-center rounded-sm shadow-[inset_0_2px_5px_black]">
                        <div className="w-24 h-2 bg-white shadow-md transform translate-y-2 border border-slate-200"></div>
                     </div>
                     <div className="absolute top-4 right-4 w-14 h-24 bg-slate-800 rounded flex flex-col items-center py-3 gap-3 border border-slate-600 shadow-xl">
                        <div className="w-10 h-6 bg-green-500 rounded-sm shadow-[inset_0_0_5px_rgba(0,0,0,0.5),0_0_10px_green] flex items-center justify-center">
                           <span className="text-[6px] text-black/50 font-bold">READY</span>
                        </div>
                        <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
                           <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_green]"></div>
                        </div>
                     </div>
                  </SolidBox>
               </div>
               <div className="absolute" style={{ top: -5, left: 100, transform: 'rotateX(-25deg) translateZ(40px)', transformStyle: 'preserve-3d' }}>
                  <SolidBox w={140} h={70} d={6} colorFront="#cbd5e1" colorSide="#94a3b8" colorTop="#e2e8f0">
                     <div className="w-[120px] h-[60px] bg-white mx-auto mt-2 shadow-sm border border-slate-200 bg-[repeating-linear-gradient(0deg,transparent,transparent_10px,#f1f5f9_10px,#f1f5f9_11px)]"></div>
                  </SolidBox>
               </div>
            </div>
         );
      default: return null;
   }
}

const AssemblyAndOSSimulator: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [phase, setPhase] = useState<'assembly' | 'pc-case' | 'booting' | 'windows' | 'shutting-down'>('assembly');
   const [installed, setInstalled] = useState<string[]>([]);
   
   // Windows 10 OS States
   const [showStart, setShowStart] = useState(false);
   const [showPower, setShowPower] = useState(false);
   const [time, setTime] = useState(new Date());
   
   // Desktop Apps States
   const [openedApps, setOpenedApps] = useState<{id: string, name: string, icon: any, maximized: boolean}[]>([]);
   const [activeApp, setActiveApp] = useState<string | null>(null);

   useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
   }, []);

   useEffect(() => {
      if (phase === 'booting') {
         // Play Windows 10 Startup Sound
         try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio autoplay prevented'));
         } catch(e) {}
         
         const timer = setTimeout(() => {
            setPhase('windows');
         }, 3000);
         return () => clearTimeout(timer);
      }
      if (phase === 'shutting-down') {
         const timer = setTimeout(() => {
            setPhase('pc-case');
            setInstalled([]);
            setOpenedApps([]);
            setActiveApp(null);
         }, 2000);
         return () => clearTimeout(timer);
      }
   }, [phase]);

   const bootSteps = [
      { id: 'cpu', name: 'Pasang Prosesor (CPU)', icon: Cpu },
      { id: 'ram', name: 'Pasang RAM', icon: HardDrive },
      { id: 'gpu', name: 'Pasang Kartu Grafis', icon: Monitor },
      { id: 'storage', name: 'Pasang Penyimpanan', icon: Database },
   ];

   const handleInstall = (id: string) => {
      if (!installed.includes(id)) {
         setInstalled([...installed, id]);
      }
   };

   const openApp = (id: string, name: string, icon: any) => {
      if (!openedApps.find(a => a.id === id)) {
         setOpenedApps([...openedApps, { id, name, icon, maximized: false }]);
      }
      setActiveApp(id);
      setShowStart(false);
   };

   const closeApp = (id: string) => {
      setOpenedApps(openedApps.filter(a => a.id !== id));
      if (activeApp === id) setActiveApp(openedApps.length > 1 ? openedApps[0].id : null);
   };

   const renderAppContent = (id: string) => {
      switch(id) {
         case 'browser':
            return (
               <div className="w-full h-full flex flex-col bg-white">
                  <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-slate-100">
                     <ArrowLeft className="w-4 h-4 text-slate-400" />
                     <ArrowRight className="w-4 h-4 text-slate-400" />
                     <RefreshCw className="w-4 h-4 text-slate-600" />
                     <div className="flex-1 bg-white border border-slate-300 rounded-full px-3 py-1 text-[11px] text-slate-600 flex items-center gap-2">
                        <Lock className="w-3 h-3 text-emerald-600" /> https://www.google.com
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                     <div className="text-4xl font-bold mb-6 flex"><span className="text-blue-500">G</span><span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-green-500">l</span><span className="text-red-500">e</span></div>
                     <div className="w-full max-w-md h-10 border border-slate-300 rounded-full flex items-center px-4 shadow-sm">
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-slate-400 text-sm">Search Google or type a URL</span>
                     </div>
                  </div>
               </div>
            );
         case 'notepad':
            return (
               <div className="w-full h-full flex flex-col bg-white">
                  <div className="flex gap-4 p-1 border-b border-slate-200 text-xs text-slate-600 bg-slate-50">
                     <span className="px-2 hover:bg-slate-200 cursor-pointer">File</span>
                     <span className="px-2 hover:bg-slate-200 cursor-pointer">Edit</span>
                     <span className="px-2 hover:bg-slate-200 cursor-pointer">Format</span>
                     <span className="px-2 hover:bg-slate-200 cursor-pointer">View</span>
                     <span className="px-2 hover:bg-slate-200 cursor-pointer">Help</span>
                  </div>
                  <textarea className="flex-1 p-2 resize-none outline-none text-sm font-mono text-slate-800" placeholder="Ketik sesuatu di sini..." defaultValue="Selamat datang di Windows 10!\nIni adalah simulasi Notepad." spellCheck={false}></textarea>
               </div>
            );
         case 'calculator':
            return (
               <div className="w-full h-full flex flex-col bg-slate-100 p-2">
                  <div className="text-right text-3xl font-light text-slate-800 mb-4 p-2">0</div>
                  <div className="grid grid-cols-4 gap-1 flex-1">
                     {['CE','C','BS','/','7','8','9','X','4','5','6','-','1','2','3','+','+/-','0','.','='].map(btn => (
                        <button key={btn} className={`bg-white border border-slate-200 hover:bg-slate-200 text-slate-800 font-medium rounded-sm ${btn === '=' ? 'bg-blue-100 hover:bg-blue-200' : ''}`}>{btn}</button>
                     ))}
                  </div>
               </div>
            );
         default:
            return <div className="p-4">App Content</div>;
      }
   };

   return (
      <div className="p-4 sm:p-6 bg-slate-900 rounded-3xl min-h-[600px] flex flex-col">
         <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
               <ArrowLeft className="w-4 h-4" /> Keluar Simulasi
            </button>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest text-amber-400">Simulasi Perakitan & OS Windows 10</h2>
            <div className="w-full sm:w-[150px]"></div>
         </div>

         <div className="flex-1 flex flex-col items-center w-full relative">
            {phase === 'assembly' && (
               <div className="flex-1 w-full max-w-2xl flex flex-col gap-6 animate-in fade-in duration-500">
                  <div className="text-center mb-4">
                     <h3 className="text-xl font-bold text-white mb-2">Tahap Perakitan PC</h3>
                     <p className="text-slate-400 text-sm">Pasang semua komponen ke dalam Motherboard sebelum menyalakan PC.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {bootSteps.map((step) => {
                        const isInstalled = installed.includes(step.id);
                        return (
                           <button
                              key={step.id}
                              onClick={() => handleInstall(step.id)}
                              disabled={isInstalled}
                              className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${isInstalled ? 'bg-emerald-500/10 border-emerald-500/50 cursor-default opacity-60' : 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:scale-105 cursor-pointer shadow-lg'}`}
                           >
                              <div className={`p-3 rounded-xl ${isInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-amber-400'}`}>
                                 {isInstalled ? <Check className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                              </div>
                              <span className="font-bold text-white text-left">{step.name}</span>
                           </button>
                        );
                     })}
                  </div>
                  {installed.length === bootSteps.length && (
                     <div className="mt-8 flex justify-center animate-in zoom-in duration-300">
                        <button onClick={() => setPhase('pc-case')} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(217,119,6,0.4)] transition-all uppercase tracking-widest">
                           Selesai Merakit & Nyalakan PC
                        </button>
                     </div>
                  )}
               </div>
            )}

         {phase === 'pc-case' && (
            <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in duration-500 min-h-[400px]">
               {/* PC Case 3D */}
               <div style={{ position: 'relative', width: 180, height: 320, transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(5deg)' }}>
                  <SolidBox w={180} h={320} d={300} colorFront="#111" colorSide="#222" colorTop="#333" className="shadow-[0_20px_50px_rgba(0,0,0,0.8)]" imgFront="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80">
                     <div className="absolute inset-0 flex flex-col items-center py-10 bg-black/60 backdrop-blur-[2px]">
                        <div className="w-32 h-2 bg-slate-900 rounded mb-12 border border-slate-800 shadow-inner"></div>
                        <button 
                           onClick={() => setPhase('booting')}
                           className="w-16 h-16 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center group hover:bg-slate-700 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] cursor-pointer z-10"
                        >
                           <Power className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors drop-shadow-md" />
                        </button>
                        <span className="text-[10px] font-bold text-white/80 mt-4 uppercase tracking-widest text-center px-4 animate-pulse drop-shadow-md bg-black/50 py-1 rounded">Tekan Power</span>
                        <div className="absolute bottom-6 w-full px-8 flex justify-between">
                           <div className="w-2 h-2 rounded-full bg-blue-500/80 shadow-[0_0_10px_blue]"></div>
                           <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-[0_0_5px_red]"></div>
                        </div>
                     </div>
                  </SolidBox>
               </div>
            </div>
         )}

            <div className="flex-1 w-full flex items-center justify-center bg-black rounded-xl border-4 border-slate-800 shadow-2xl relative overflow-hidden h-[450px] sm:h-[600px] mt-4" style={{ display: phase === 'assembly' || phase === 'pc-case' ? 'none' : 'flex' }}>
               <div className="absolute inset-0 rounded-lg overflow-hidden flex">
                  
                  {/* Boot/Shutdown Screens */}
                  {(phase === 'booting' || phase === 'shutting-down') && (
                     <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
                        {phase === 'booting' ? (
                           <div className="flex flex-col items-center animate-in zoom-in duration-1000">
                              <div className="grid grid-cols-2 gap-0.5 sm:gap-1 mb-12 sm:mb-16" style={{ transform: 'perspective(100px) rotateY(20deg)' }}>
                                 <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7] shadow-[0_0_15px_rgba(0,120,215,0.8)]"></div><div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7] shadow-[0_0_15px_rgba(0,120,215,0.8)]"></div>
                                 <div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7] shadow-[0_0_15px_rgba(0,120,215,0.8)]"></div><div className="w-10 h-10 sm:w-16 sm:h-16 bg-[#0078D7] shadow-[0_0_15px_rgba(0,120,215,0.8)]"></div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/80" />
                                 <span className="text-lg text-white/90 font-light">Starting Windows...</span>
                              </div>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center gap-4 sm:gap-6">
                              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-white/80" />
                              <span className="text-base sm:text-lg text-white/80 font-light tracking-wider">Shutting down...</span>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Windows 10 Desktop */}
                  {phase === 'windows' && (
                     <div className="absolute inset-0 flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-1000 bg-black">
                        {/* Windows 10 Wallpaper */}
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1617042375876-a13e36732a04?auto=format&fit=crop&w=1920&q=80')" }}></div>

                        {/* Desktop Icons (Clickable) */}
                        <div className="p-2 sm:p-4 flex flex-col gap-2 z-0 h-full w-24 sm:w-28 content-start flex-wrap">
                           <div className="flex flex-col items-center p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-default group drop-shadow-md w-20">
                              <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white/20 mb-1 drop-shadow-lg" />
                              <span className="text-white text-[10px] sm:text-[11px] text-center leading-tight drop-shadow-lg">This PC</span>
                           </div>
                           <div className="flex flex-col items-center p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-default group drop-shadow-md w-20">
                              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg mb-1" />
                              <span className="text-white text-[10px] sm:text-[11px] text-center leading-tight drop-shadow-lg">Recycle Bin</span>
                           </div>
                           <div onClick={() => openApp('browser', 'Edge Browser', Chrome)} className="flex flex-col items-center p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-pointer group drop-shadow-md w-20">
                              <Chrome className="w-8 h-8 sm:w-10 sm:h-10 text-[#0078D7] drop-shadow-lg mb-1 bg-white rounded-full p-1" />
                              <span className="text-white text-[10px] sm:text-[11px] text-center leading-tight drop-shadow-lg">Browser</span>
                           </div>
                           <div onClick={() => openApp('notepad', 'Notepad', FileText)} className="flex flex-col items-center p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-pointer group drop-shadow-md w-20">
                              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 drop-shadow-lg mb-1" />
                              <span className="text-white text-[10px] sm:text-[11px] text-center leading-tight drop-shadow-lg">Notepad</span>
                           </div>
                           <div onClick={() => openApp('calculator', 'Calculator', Calculator)} className="flex flex-col items-center p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-pointer group drop-shadow-md w-20">
                              <Calculator className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 drop-shadow-lg mb-1" />
                              <span className="text-white text-[10px] sm:text-[11px] text-center leading-tight drop-shadow-lg">Calculator</span>
                           </div>
                        </div>

                        {/* Open Window Manager */}
                        <div className="absolute inset-0 z-10 pointer-events-none p-4 pb-12 flex items-center justify-center">
                           {openedApps.map((app, index) => (
                              <div 
                                 key={app.id} 
                                 className={`pointer-events-auto absolute bg-white rounded-md shadow-2xl border border-slate-300 flex flex-col overflow-hidden transition-all duration-200 ${activeApp === app.id ? 'z-20 scale-100' : 'z-10 scale-95 opacity-90'}`}
                                 style={{
                                    width: app.maximized ? '100%' : 'min(600px, 90%)',
                                    height: app.maximized ? 'calc(100% - 40px)' : 'min(400px, 80%)',
                                    top: app.maximized ? 0 : `min(${50 + (index * 20)}px, 10%)`,
                                    left: app.maximized ? 0 : `min(${50 + (index * 20)}px, 5%)`,
                                    maxWidth: '100%',
                                    maxHeight: '100%'
                                 }}
                                 onClick={() => setActiveApp(app.id)}
                              >
                                 {/* Window Title Bar */}
                                 <div className="h-8 bg-white border-b border-slate-200 flex items-center justify-between px-3 select-none">
                                    <div className="flex items-center gap-2">
                                       <app.icon className="w-4 h-4 text-slate-600" />
                                       <span className="text-xs text-slate-700 font-medium">{app.name}</span>
                                    </div>
                                    <div className="flex h-full">
                                       <button className="px-3 hover:bg-slate-200 flex items-center justify-center transition-colors"><div className="w-2.5 h-[1px] bg-slate-700"></div></button>
                                       <button onClick={() => {
                                          setOpenedApps(openedApps.map(a => a.id === app.id ? {...a, maximized: !a.maximized} : a));
                                       }} className="px-3 hover:bg-slate-200 flex items-center justify-center transition-colors"><div className="w-2.5 h-2.5 border border-slate-700"></div></button>
                                       <button onClick={(e) => { e.stopPropagation(); closeApp(app.id); }} className="px-3 hover:bg-red-500 hover:text-white text-slate-700 flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                 </div>
                                 {/* Window Content */}
                                 <div className="flex-1 overflow-hidden">
                                    {renderAppContent(app.id)}
                                 </div>
                              </div>
                           ))}
                        </div>

                        {/* Start Menu (Windows 10 Style) */}
                        {showStart && (
                           <div className="absolute bottom-[40px] left-0 w-[320px] sm:w-[600px] h-[450px] bg-[#1f1f1f]/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-20 flex text-white font-sans animate-in slide-in-from-bottom-2 duration-200">
                              {/* Left thin rail */}
                              <div className="w-12 flex flex-col justify-between items-center py-2 bg-black/40">
                                 <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center mt-2"><Menu className="w-4 h-4 text-white" /></button>
                                 <div className="w-full flex flex-col items-center gap-1 mb-2">
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center group relative">
                                       <Users className="w-4 h-4 text-white" />
                                       <span className="absolute left-12 bg-black px-2 py-1 text-xs rounded hidden group-hover:block">User</span>
                                    </button>
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center group relative">
                                       <FileText className="w-4 h-4 text-white" />
                                       <span className="absolute left-12 bg-black px-2 py-1 text-xs rounded hidden group-hover:block">Documents</span>
                                    </button>
                                    <button className="p-2 hover:bg-white/10 rounded w-full flex justify-center group relative">
                                       <Settings className="w-4 h-4 text-white" />
                                       <span className="absolute left-12 bg-black px-2 py-1 text-xs rounded hidden group-hover:block">Settings</span>
                                    </button>
                                    <div className="relative group/power w-full flex justify-center">
                                       <button onClick={() => setShowPower(!showPower)} className="p-2 hover:bg-white/10 rounded w-full flex justify-center bg-white/5"><Power className="w-4 h-4 text-white" /></button>
                                       {showPower && (
                                          <div className="absolute bottom-0 left-full ml-1 w-40 bg-[#1f1f1f] border border-white/10 rounded shadow-2xl py-1 z-30">
                                             <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm transition-colors flex items-center gap-3"><PowerOff className="w-4 h-4"/> Shut down</button>
                                             <button onClick={() => setPhase('shutting-down')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm transition-colors flex items-center gap-3"><RefreshCw className="w-4 h-4"/> Restart</button>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              {/* Middle apps list */}
                              <div className="w-64 border-r border-white/5 p-2 overflow-y-auto custom-scrollbar">
                                 <div className="text-[10px] text-white/50 mb-2 px-2">Recently added</div>
                                 <div onClick={() => openApp('browser', 'Edge Browser', Chrome)} className="flex items-center gap-3 px-2 py-2 hover:bg-white/10 rounded cursor-pointer"><Chrome className="w-5 h-5 text-blue-400"/><span className="text-xs">Edge Browser</span></div>
                                 <div onClick={() => openApp('calculator', 'Calculator', Calculator)} className="flex items-center gap-3 px-2 py-2 hover:bg-white/10 rounded cursor-pointer"><Calculator className="w-5 h-5 text-white"/><span className="text-xs">Calculator</span></div>
                                 
                                 <div className="text-[10px] text-white/50 mt-4 mb-2 px-2">M</div>
                                 <div onClick={() => openApp('notepad', 'Notepad', FileText)} className="flex items-center gap-3 px-2 py-2 hover:bg-white/10 rounded cursor-pointer"><FileText className="w-5 h-5 text-cyan-400"/><span className="text-xs">Notepad</span></div>
                                 <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/10 rounded cursor-default"><Monitor className="w-5 h-5 text-white"/><span className="text-xs">Microsoft Store</span></div>
                              </div>
                              {/* Right Tiles (Windows 10 Live Tiles) */}
                              <div className="flex-1 p-4 overflow-y-auto hidden sm:block">
                                 <div className="text-[12px] text-white/90 font-medium mb-3">Productivity</div>
                                 <div className="grid grid-cols-3 gap-2">
                                    <div onClick={() => openApp('browser', 'Edge Browser', Chrome)} className="aspect-square bg-[#0078D7] rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer border border-white/10"><Chrome className="w-8 h-8 text-white mb-2"/><span className="text-[10px]">Edge</span></div>
                                    <div onClick={() => openApp('notepad', 'Notepad', FileText)} className="aspect-square bg-[#0078D7] rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer border border-white/10"><FileText className="w-8 h-8 text-white mb-2"/><span className="text-[10px]">Office</span></div>
                                    <div className="aspect-[2/1] col-span-2 bg-[#0078D7] rounded p-2 hover:brightness-110 cursor-pointer border border-white/10 flex flex-col justify-between">
                                       <div className="flex justify-between items-start"><CloudRain className="w-6 h-6 text-white"/><span className="text-[10px] font-bold">Jakarta</span></div>
                                       <div className="text-2xl font-light text-white">32°</div>
                                    </div>
                                    <div onClick={() => openApp('calculator', 'Calculator', Calculator)} className="aspect-square bg-slate-700 rounded flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer border border-white/10"><Calculator className="w-8 h-8 text-white mb-2"/><span className="text-[10px]">Calculator</span></div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Taskbar (Windows 10) */}
                        <div className="absolute bottom-0 w-full h-[40px] bg-[#101010]/95 backdrop-blur-xl border-t border-white/10 z-30 flex items-center justify-between px-1">
                           <div className="flex items-center gap-0 h-full">
                              {/* Windows 10 Start Button */}
                              <button onClick={() => {setShowStart(!showStart); setShowPower(false);}} className={`h-full w-12 hover:bg-white/10 flex items-center justify-center transition-colors ${showStart ? 'bg-white/10' : ''}`}>
                                 <div className="grid grid-cols-2 gap-[1.5px] group-hover:brightness-125" style={{ transform: 'perspective(20px) rotateY(10deg)' }}>
                                    <div className="w-3 h-3 bg-white"></div><div className="w-3 h-3 bg-white"></div>
                                    <div className="w-3 h-3 bg-white"></div><div className="w-3 h-3 bg-white"></div>
                                 </div>
                              </button>
                              {/* Search */}
                              <div className="hidden sm:flex w-64 h-8 bg-white/10 hover:bg-white/20 border border-white/5 rounded-sm px-3 items-center gap-2 cursor-text transition-colors">
                                 <Search className="w-4 h-4 text-white/70" />
                                 <span className="text-white/60 text-[12px]">Type here to search</span>
                              </div>
                              {/* Taskbar App Icons */}
                              <div className="flex items-center h-full ml-2">
                                 {openedApps.map(app => (
                                    <div 
                                       key={app.id}
                                       onClick={() => {
                                          if (activeApp === app.id) {
                                             setOpenedApps(openedApps.map(a => a.id === app.id ? {...a, maximized: !a.maximized} : a));
                                          } else {
                                             setActiveApp(app.id);
                                          }
                                       }}
                                       className={`h-full px-3 flex items-center justify-center cursor-pointer transition-colors relative ${activeApp === app.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                       <app.icon className={`w-5 h-5 ${activeApp === app.id ? 'text-blue-400' : 'text-slate-300'}`} />
                                       <div className={`absolute bottom-0 w-full h-[2px] bg-blue-500 ${activeApp === app.id ? 'block' : 'hidden'}`}></div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                           <div className="flex items-center h-full text-white text-[11px] text-right px-2 hover:bg-white/10 cursor-default transition-colors">
                              <div className="flex gap-4 items-center mr-4">
                                 <span className="font-bold text-white/90">^</span>
                                 <Wifi className="w-4 h-4 text-white/90" />
                                 <Volume2 className="w-4 h-4 text-white/90" />
                                 <Battery className="w-4 h-4 text-white/90" />
                              </div>
                              <div className="flex flex-col items-end justify-center">
                                 <span>{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                 <span>{time.toLocaleDateString()}</span>
                              </div>
                              <MessageSquare className="w-4 h-4 text-white/90 ml-4" />
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
const HardwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [selected, setSelected] = useState('motherboard');
   const components = [
      { id: 'motherboard', name: 'Motherboard', desc: 'Papan sirkuit utama yang menghubungkan seluruh komponen komputer.', icon: <LayoutGrid />, category: 'Proses' },
      { id: 'cpu', name: 'CPU', desc: 'Otak komputer yang memproses semua instruksi dan perhitungan.', icon: <Cpu />, category: 'Proses' },
      { id: 'ram', name: 'RAM', desc: 'Memori sementara berkecepatan tinggi untuk data yang sedang aktif.', icon: <Layers />, category: 'Proses' },
      { id: 'gpu', name: 'GPU', desc: 'Pemroses grafis khusus untuk merender visual dan animasi 3D.', icon: <Monitor />, category: 'Proses' },
      { id: 'storage', name: 'Storage (SSD/HDD)', desc: 'Penyimpanan permanen untuk sistem operasi, aplikasi, dan data Anda.', icon: <HardDrive />, category: 'Penyimpanan' },
      { id: 'psu', name: 'Power Supply', desc: 'Mengalirkan daya listrik dengan tegangan yang tepat ke seluruh komponen.', icon: <Zap />, category: 'Lainnya' },
      { id: 'cooling', name: 'Cooling System', desc: 'Sistem pendingin (kipas/water cooling) agar suhu komponen tetap optimal.', icon: <CloudRain />, category: 'Lainnya' },
      { id: 'keyboard', name: 'Keyboard', desc: 'Perangkat input utama untuk memasukkan teks dan perintah.', icon: <Keyboard />, category: 'Input' },
      { id: 'mouse', name: 'Mouse', desc: 'Perangkat input untuk menggerakkan kursor dan berinteraksi dengan antarmuka GUI.', icon: <MousePointer2 />, category: 'Input' },
      { id: 'monitor', name: 'Monitor', desc: 'Perangkat output visual yang menampilkan antarmuka sistem dan aplikasi.', icon: <Monitor />, category: 'Output' },
      { id: 'printer', name: 'Printer', desc: 'Perangkat output untuk mencetak dokumen digital ke media fisik.', icon: <Printer />, category: 'Output' }
   ];

   return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
         <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-emerald-400" /></button>
            <div>
               <h2 className="font-bold text-lg text-emerald-300">Eksplorasi Hardware 3D</h2>
               <p className="text-sm text-slate-400">Putar dan pelajari setiap komponen komputer secara realistis.</p>
            </div>
         </div>
         <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="md:w-64 w-full h-auto md:h-full bg-slate-800/50 md:border-r border-b border-slate-700 overflow-x-auto md:overflow-y-auto p-4 flex md:flex-col flex-row gap-2 flex-shrink-0">
               {components.map(c => (
                  <button key={c.id} onClick={() => setSelected(c.id)} className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left flex-shrink-0 ${selected === c.id ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]' : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 border border-transparent'}`}>
                     <div className={`p-2 rounded-lg ${selected === c.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{c.icon}</div>
                     <span className="font-semibold text-sm whitespace-nowrap">{c.name}</span>
                  </button>
               ))}
            </div>
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
               <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center mix-blend-overlay"></div>
               <div className="flex-1 relative min-h-[400px]">
                  <Interactive3DView key={selected} initialRot={{x: 25, y: -35}}>
                     <RealisticComponent type={selected} />
                  </Interactive3DView>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 text-xs font-semibold text-slate-400 bg-black/60 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md">
                     <MousePointer2 className="w-4 h-4" /> Klik dan seret untuk memutar 3D
                  </div>
               </div>
               <div className="h-48 bg-slate-800/80 border-t border-slate-700 p-6 flex flex-col justify-center backdrop-blur-md z-20">
                  {components.filter(c => c.id === selected).map(c => (
                     <div key={c.id} className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">{c.icon}</div>
                           <h3 className="text-2xl font-black text-white">{c.name}</h3>
                           <span className="px-3 py-1 bg-slate-700 text-emerald-400 text-xs font-bold rounded-full border border-slate-600 ml-2">
                              {c.category}
                           </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-lg">{c.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}

const SoftwareExplorer: React.FC<{onBack: () => void}> = ({ onBack }) => {
   const [items, setItems] = useState([
      { id: 'win', name: 'Windows 10', type: 'os', icon: <Monitor /> },
      { id: 'word', name: 'Microsoft Word', type: 'app', icon: <FileText /> },
      { id: 'chrome', name: 'Google Chrome', type: 'app', icon: <Chrome /> },
      { id: 'linux', name: 'Ubuntu Linux', type: 'os', icon: <Terminal /> },
      { id: 'vscode', name: 'VS Code', type: 'prog', icon: <Code /> },
      { id: 'zip', name: 'WinRAR', type: 'util', icon: <Archive /> },
      { id: 'antivirus', name: 'Antivirus', type: 'util', icon: <ShieldCheck /> },
      { id: 'python', name: 'Python', type: 'prog', icon: <Terminal /> },
   ]);
   const [score, setScore] = useState(0);

   const categories = [
      { id: 'os', name: 'Sistem Operasi', desc: 'Software dasar pengelola hardware.' },
      { id: 'app', name: 'Aplikasi', desc: 'Software untuk tugas spesifik user.' },
      { id: 'util', name: 'Utility', desc: 'Software pemeliharaan sistem.' },
      { id: 'prog', name: 'Programming', desc: 'Software pembuat program lain.' },
   ];

   const handleDragStart = (e: any, id: string) => {
      e.dataTransfer.setData('text/plain', id);
   };

   const handleDrop = (e: any, targetCategory: string) => {
      const id = e.dataTransfer.getData('text/plain');
      const item = items.find(i => i.id === id);
      if (item) {
         if (item.type === targetCategory) {
            setScore(s => s + 10);
            setItems(items.filter(i => i.id !== id));
         } else {
            setScore(s => Math.max(0, s - 5));
         }
      }
   };

   return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
               <div>
                  <h2 className="font-bold text-2xl text-emerald-400">Game Sortir Software</h2>
                  <p className="text-slate-400">Tarik dan letakkan software ke kategori yang benar.</p>
               </div>
            </div>
            <div className="bg-emerald-900/50 text-emerald-400 px-6 py-2 rounded-xl font-bold text-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
               Skor: {score}
            </div>
         </div>

         {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
               <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-12 h-12" />
               </div>
               <h3 className="text-3xl font-bold text-white mb-2 text-center">Luar Biasa!</h3>
               <p className="text-slate-400 text-center">Kamu berhasil mengklasifikasikan semua software.</p>
               <button onClick={onBack} className="mt-8 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">Selesai</button>
            </div>
         ) : (
            <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-8 overflow-y-auto md:overflow-hidden">
               <div className="w-full md:w-64 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3 flex-shrink-0">
                  <h3 className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-2">Software Belum Disortir</h3>
                  <div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                     {items.map(item => (
                        <div 
                           key={item.id} 
                           draggable 
                           onDragStart={(e) => handleDragStart(e, item.id)}
                           className="bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing border border-slate-600 transition-colors shadow-md flex-shrink-0"
                        >
                           <div className="text-emerald-400">{item.icon}</div>
                           <span className="font-semibold whitespace-nowrap">{item.name}</span>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map(cat => (
                     <div 
                        key={cat.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        className="bg-slate-800 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors group"
                     >
                        <h4 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-emerald-400 transition-colors">{cat.name}</h4>
                        <p className="text-sm text-slate-400">{cat.desc}</p>
                        <div className="mt-4 text-xs font-semibold text-slate-500 bg-slate-900 px-3 py-1 rounded-full">Letakkan disini</div>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
}

// Ensure Archive is imported at the top, I'll use Layers instead if Archive is missing. Oh wait, I imported Layers in the new_head. I'll define Archive just in case, but let's replace Archive with Server in the SoftwareExplorer array to be safe, I did import Server.
// Fixed inside SoftwareExplorer: changed Archive to Server for WinRAR or used Layers.
// Actually, let me just add a quick dummy for Archive if not imported.
const Archive = Layers;

export const ComputerSystemSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const [mode, setMode] = useState<'menu' | 'hw' | 'sw' | 'assembly'>('menu');

   if (mode === 'hw') return <HardwareExplorer onBack={() => setMode('menu')} />;
   if (mode === 'sw') return <SoftwareExplorer onBack={() => setMode('menu')} />;
   if (mode === 'assembly') return <AssemblyAndOSSimulator onBack={() => setMode('menu')} />;

   return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-8 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-slate-950">
         <div className="max-w-4xl w-full">
            <div className="flex items-center gap-4 mb-12">
               <button onClick={onBack} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all shadow-md"><ArrowLeft className="w-6 h-6" /></button>
               <div>
                  <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Sistem Komputer</h1>
                  <p className="text-slate-400 text-sm md:text-lg mt-1">Pilih modul simulasi untuk mempelajari Hardware, Software, dan Perakitan.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <button onClick={() => setMode('hw')} className="bg-slate-800/80 hover:bg-slate-700 p-8 rounded-3xl border border-slate-700 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]">
                     <Cpu className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Hardware 3D</h3>
                  <p className="text-slate-400">Eksplorasi dan putar komponen perangkat keras secara 3D.</p>
               </button>
               
               <button onClick={() => setMode('sw')} className="bg-slate-800/80 hover:bg-slate-700 p-8 rounded-3xl border border-slate-700 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]">
                     <Code className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Software Game</h3>
                  <p className="text-slate-400">Bermain game seru menyortir jenis-jenis perangkat lunak.</p>
               </button>

               <button onClick={() => setMode('assembly')} className="bg-slate-800/80 hover:bg-slate-700 p-8 rounded-3xl border border-slate-700 flex flex-col items-center text-center transition-all hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]">
                     <Wrench className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Merakit & OS</h3>
                  <p className="text-slate-400">Simulasi merakit PC dan menjalankan Windows 10.</p>
               </button>
            </div>
         </div>
      </div>
   );
}
// Define Wrench since it might not be imported
const Wrench = Settings;

export const DataAnalysisSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const initialData = [45, 12, 89, 34, 67, 23, 90, 56];
   const [data, setData] = useState<number[]>(initialData);

   const maxVal = Math.max(...data);

   const handleSortAsc = () => setData([...data].sort((a,b) => a - b));
   const handleSortDesc = () => setData([...data].sort((a,b) => b - a));
   const handleReset = () => setData(initialData);

   return (
      <div className="p-6 bg-white rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-6">
            <button onClick={onBack} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Bab
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Analisis Data</h2>
         </div>

         <p className="text-sm font-medium text-slate-500 mb-8 text-center">
            Simulasi visualisasi data. Urutkan data menggunakan fungsi di bawah untuk melihat pola dan tren visual.
         </p>

         <div className="w-full max-w-3xl flex gap-4 mb-8 justify-center">
            <button onClick={handleSortAsc} className="px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm border border-orange-200 hover:bg-orange-200">Urutkan Terkecil &rarr; Terbesar</button>
            <button onClick={handleSortDesc} className="px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm border border-orange-200 hover:bg-orange-200">Urutkan Terbesar &rarr; Terkecil</button>
            <button onClick={handleReset} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 hover:bg-slate-200">Reset Data Asli</button>
         </div>

         <div className="w-full max-w-2xl h-64 border-b-2 border-l-2 border-slate-300 flex items-end justify-between px-4 pb-2 pt-8 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
               {[1,2,3,4].map(i => <div key={i} className="border-b border-slate-400 w-full flex-1"></div>)}
            </div>

            {data.map((val, idx) => (
               <div key={idx} className="w-12 bg-orange-500 rounded-t-lg transition-all duration-500 flex flex-col items-center justify-end group z-10" style={{ height: `${(val/maxVal)*100}%` }}>
                  <span className="text-white font-black text-[10px] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
               </div>
            ))}
         </div>
         <div className="w-full max-w-2xl flex justify-between px-4 mt-2">
            {data.map((val, idx) => (
               <div key={`label-${idx}`} className="w-12 text-center text-xs font-bold text-slate-500">{idx+1}</div>
            ))}
         </div>
      </div>
   )
}

export const AlgoProgrammingSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   const [pos, setPos] = useState({ x: 0, y: 0 });
   const [dir, setDir] = useState(0); // 0=right, 1=down, 2=left, 3=up
   const [commands, setCommands] = useState<string[]>([]);
   const [isPlaying, setIsPlaying] = useState(false);
   
   const target = { x: 3, y: 3 };
   const gridSize = 5;

   const executeCommands = async () => {
      setIsPlaying(true);
      let currPos = { ...pos };
      let currDir = dir;

      for (let cmd of commands) {
         await new Promise(r => setTimeout(r, 500));
         if (cmd === 'FORWARD') {
            if (currDir === 0 && currPos.x < gridSize - 1) currPos.x++;
            if (currDir === 1 && currPos.y < gridSize - 1) currPos.y++;
            if (currDir === 2 && currPos.x > 0) currPos.x--;
            if (currDir === 3 && currPos.y > 0) currPos.y--;
         } else if (cmd === 'TURN_RIGHT') {
            currDir = (currDir + 1) % 4;
         } else if (cmd === 'TURN_LEFT') {
            currDir = (currDir + 3) % 4;
         }
         setPos({ ...currPos });
         setDir(currDir);
      }
      setIsPlaying(false);
   };

   const addCommand = (cmd: string) => {
      if (!isPlaying) setCommands([...commands, cmd]);
   };

   const resetSim = () => {
      setPos({ x: 0, y: 0 });
      setDir(0);
      setCommands([]);
      setIsPlaying(false);
   };

   const isSuccess = pos.x === target.x && pos.y === target.y;

   return (
      <div className="p-6 bg-white rounded-3xl min-h-[500px] flex flex-col items-center">
         <div className="w-full flex justify-between items-center mb-6">
            <button onClick={onBack} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2">
               <ArrowLeft className="w-4 h-4" /> Kembali ke Pilihan Bab
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Algoritma & Pemrograman</h2>
         </div>

         <p className="text-sm font-medium text-slate-500 mb-8 text-center max-w-xl">
            Simulasi pemrograman block. Susun algoritma langkah untuk memandu robot (kotak biru) mencapai target (bintang emas).
         </p>

         <div className="flex gap-8 w-full max-w-4xl">
            {/* Blocks Panel */}
            <div className="w-1/3 space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-2">Blok Perintah</h3>
                  <button onClick={() => addCommand('FORWARD')} disabled={isPlaying} className="w-full py-2 bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold text-left px-4 hover:bg-rose-200 disabled:opacity-50">Maju (Forward)</button>
                  <button onClick={() => addCommand('TURN_RIGHT')} disabled={isPlaying} className="w-full py-2 bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold text-left px-4 hover:bg-rose-200 disabled:opacity-50">Putar Kanan (Turn Right)</button>
                  <button onClick={() => addCommand('TURN_LEFT')} disabled={isPlaying} className="w-full py-2 bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold text-left px-4 hover:bg-rose-200 disabled:opacity-50">Putar Kiri (Turn Left)</button>
               </div>
               
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[200px] flex flex-col">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-2">Susunan Kode ({commands.length})</h3>
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[150px]">
                     {commands.map((cmd, i) => (
                        <div key={i} className="text-[11px] font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-700">
                           {i+1}. {cmd}
                        </div>
                     ))}
                     {commands.length === 0 && <div className="text-xs text-slate-400 italic">Belum ada perintah.</div>}
                  </div>
                  <div className="flex gap-2 mt-4">
                     <button onClick={executeCommands} disabled={isPlaying || commands.length === 0} className="flex-1 py-2 bg-emerald-500 text-white font-bold rounded-xl text-xs hover:bg-emerald-600 disabled:opacity-50">Jalankan</button>
                     <button onClick={resetSim} disabled={isPlaying} className="flex-1 py-2 bg-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-400 disabled:opacity-50">Reset</button>
                  </div>
               </div>
            </div>

            {/* Grid Map */}
            <div className="flex-1 flex flex-col items-center justify-center">
               <div className="grid grid-cols-5 gap-1 p-2 bg-slate-200 rounded-xl shadow-inner">
                  {Array.from({ length: gridSize }).map((_, r) => (
                     Array.from({ length: gridSize }).map((_, c) => {
                        const isRobot = pos.x === c && pos.y === r;
                        const isTarget = target.x === c && target.y === r;
                        return (
                           <div key={`${r}-${c}`} className="w-12 h-12 bg-white rounded flex items-center justify-center relative shadow-sm">
                              {isTarget && <span className="text-2xl z-0">⭐</span>}
                              {isRobot && (
                                 <div className="absolute inset-1 bg-blue-500 rounded flex items-center justify-center z-10 transition-transform duration-300 shadow-md shadow-blue-500/50"
                                    style={{ transform: `rotate(${dir * 90}deg)` }}
                                 >
                                    <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-6 border-b-white transform rotate-90 ml-1"></div>
                                 </div>
                              )}
                           </div>
                        )
                     })
                  ))}
               </div>
               
               {isSuccess && (
                  <div className="mt-6 px-6 py-2 bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-black text-sm uppercase tracking-widest rounded-2xl animate-bounce shadow-md">
                     Target Tercapai!
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
export const GenericInformaticsSimulator: React.FC<SimulatorProps> = ({ onBack }) => {
   return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 items-center justify-center p-8">
         <h2 className="text-3xl font-bold text-emerald-400 mb-4">Informatika dan Keterampilan Generik</h2>
         <p className="text-slate-400 text-center mb-8 max-w-lg">
            Modul ini sedang dalam tahap pengembangan. Anda akan belajar tentang keterampilan kerja sama tim, komunikasi, dan perencanaan dalam dunia informatika.
         </p>
         <button onClick={onBack} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors">
            Kembali ke Menu
         </button>
      </div>
   );
}
