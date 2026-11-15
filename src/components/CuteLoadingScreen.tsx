import React from "react";

interface CuteLoadingScreenProps {
  title?: string;
  subtitle?: string;
  theme?: "green" | "light";
  fullScreen?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export const CuteMascotSvg: React.FC<{ size?: number; className?: string }> = ({
  size = 140,
  className = "",
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="cuteMascotBodyGrad" x1="80" y1="50" x2="80" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9ee800" />
            <stop offset="50%" stopColor="#85cc00" />
            <stop offset="100%" stopColor="#68a300" />
          </linearGradient>

          <linearGradient id="cuteMascotTummyGrad" x1="80" y1="85" x2="80" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4fee0" />
          </linearGradient>

          <linearGradient id="cuteCapGrad" x1="80" y1="20" x2="80" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="cutePencilGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <filter id="cuteMascotGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#85cc00" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Dynamic Shadow underneath */}
        <ellipse
          cx="80"
          cy="148"
          rx="36"
          ry="6"
          fill="rgba(15, 23, 42, 0.16)"
          className="animate-pulse"
        />

        {/* Floating Sparkles & Stars */}
        <g className="animate-cute-sparkle-1">
          <path
            d="M 28 42 Q 33 42 33 37 Q 33 42 38 42 Q 33 42 33 47 Q 33 42 28 42 Z"
            fill="#facc15"
          />
        </g>
        <g className="animate-cute-sparkle-2">
          <path
            d="M 132 46 Q 136 46 136 42 Q 136 46 140 46 Q 136 46 136 50 Q 136 46 132 46 Z"
            fill="#38bdf8"
          />
        </g>
        <g className="animate-cute-sparkle-3">
          <circle cx="134" cy="98" r="3.5" fill="#f43f5e" />
          <path
            d="M 22 92 Q 25 92 25 89 Q 25 92 28 92 Q 25 92 25 95 Q 25 92 22 92 Z"
            fill="#fbbf24"
          />
        </g>

        {/* Bouncing Mascot Character */}
        <g className="animate-cute-bounce" filter="url(#cuteMascotGlow)">
          {/* Feet */}
          <ellipse cx="62" cy="140" rx="10" ry="6" fill="#4d7c0f" />
          <ellipse cx="98" cy="140" rx="10" ry="6" fill="#4d7c0f" />

          {/* Left Hand holding pencil */}
          <g transform="translate(118, 98) rotate(-18)">
            <ellipse cx="0" cy="0" rx="7" ry="5.5" fill="#76b900" />
            {/* Mini cute pencil */}
            <rect x="2" y="-14" width="6" height="18" rx="2" fill="url(#cutePencilGrad)" />
            <polygon points="2,-14 8,-14 5,-21" fill="#fed7aa" />
            <polygon points="4,-19 6,-19 5,-22" fill="#0f172a" />
            {/* Star tip */}
            <circle cx="5" cy="-24" r="2.5" fill="#fef08a" className="animate-ping" opacity="0.6" />
          </g>

          {/* Right Hand Waving happily */}
          <g className="animate-cute-wave">
            <ellipse cx="32" cy="98" rx="8" ry="6" fill="#76b900" transform="rotate(-30 32 98)" />
            {/* Little fingers/paw */}
            <circle cx="26" cy="92" r="3.5" fill="#85cc00" />
          </g>

          {/* Main Body (Cute round scholar buddy) */}
          <ellipse cx="80" cy="96" rx="44" ry="43" fill="url(#cuteMascotBodyGrad)" />

          {/* Cute Tummy Patch */}
          <ellipse cx="80" cy="104" rx="30" ry="26" fill="url(#cuteMascotTummyGrad)" />

          {/* Graduation Cap (Toga) perched on head */}
          <g>
            {/* Cap Base Ring */}
            <ellipse cx="80" cy="50" rx="22" ry="7" fill="#0f172a" />
            {/* Mortarboard Diamond */}
            <polygon points="80,24 122,37 80,50 38,37" fill="url(#cuteCapGrad)" />
            {/* Top Button */}
            <ellipse cx="80" cy="37" rx="4.5" ry="3" fill="#334155" />
            {/* Swinging Golden Tassel */}
            <g className="animate-cute-tassel">
              <path
                d="M 80 37 Q 100 40 106 54"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="106" cy="57" rx="3.5" ry="5.5" fill="#fbbf24" />
            </g>
          </g>

          {/* Cute Face */}
          {/* Eyes with Blinking animation */}
          <g className="animate-cute-blink">
            {/* Left Eye */}
            <circle cx="64" cy="86" r="9" fill="#0f172a" />
            <circle cx="61.5" cy="83.5" r="3.2" fill="#ffffff" />
            <circle cx="66.5" cy="88.5" r="1.4" fill="#ffffff" />

            {/* Right Eye */}
            <circle cx="96" cy="86" r="9" fill="#0f172a" />
            <circle cx="93.5" cy="83.5" r="3.2" fill="#ffffff" />
            <circle cx="98.5" cy="88.5" r="1.4" fill="#ffffff" />
          </g>

          {/* Cute Rosy Blushing Cheeks */}
          <ellipse cx="50" cy="96" rx="6.5" ry="4" fill="#ff6b8b" opacity="0.85" />
          <ellipse cx="110" cy="96" rx="6.5" ry="4" fill="#ff6b8b" opacity="0.85" />

          {/* Cheerful Smiling Mouth */}
          <path
            d="M 72 95 Q 80 106 88 95"
            stroke="#0f172a"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="#e11d48"
          />
          {/* Tiny tongue detail */}
          <path
            d="M 76 99 Q 80 105 84 99"
            fill="#fda4af"
          />
        </g>
      </svg>
    </div>
  );
};

export const SipinterAvatar: React.FC<{
  sizeClass?: string;
  className?: string;
  showSparkles?: boolean;
}> = ({
  sizeClass = "w-10 h-10",
  className = "",
  showSparkles = false,
}) => {
  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-emerald-100 via-sky-50 to-lime-100 border border-emerald-200/80 shadow-xs flex items-center justify-center relative select-none ${className}`}
    >
      <svg
        viewBox="20 20 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain"
      >
        <defs>
          <linearGradient id="spAvatarBody" x1="80" y1="50" x2="80" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9ee800" />
            <stop offset="50%" stopColor="#85cc00" />
            <stop offset="100%" stopColor="#68a300" />
          </linearGradient>
          <linearGradient id="spAvatarTummy" x1="80" y1="85" x2="80" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4fee0" />
          </linearGradient>
          <linearGradient id="spAvatarCap" x1="80" y1="20" x2="80" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {showSparkles && (
          <>
            <path d="M 32 38 Q 35 38 35 35 Q 35 38 38 38 Q 35 38 35 41 Q 35 38 32 38 Z" fill="#facc15" />
            <circle cx="126" cy="42" r="2.5" fill="#38bdf8" />
          </>
        )}

        {/* Mascot Character Centered on Face and Cap */}
        <g className="animate-cute-bounce">
          {/* Main Body */}
          <ellipse cx="80" cy="94" rx="42" ry="40" fill="url(#spAvatarBody)" />
          {/* Tummy */}
          <ellipse cx="80" cy="102" rx="28" ry="24" fill="url(#spAvatarTummy)" />

          {/* Right Hand Waving */}
          <g className="animate-cute-wave">
            <ellipse cx="34" cy="96" rx="7" ry="5.5" fill="#76b900" transform="rotate(-25 34 96)" />
            <circle cx="29" cy="91" r="3" fill="#85cc00" />
          </g>

          {/* Graduation Cap (Toga) */}
          <g>
            <ellipse cx="80" cy="48" rx="22" ry="7" fill="#0f172a" />
            <polygon points="80,24 122,37 80,50 38,37" fill="url(#spAvatarCap)" />
            <ellipse cx="80" cy="37" rx="4.5" ry="3" fill="#334155" />
            <g className="animate-cute-tassel">
              <path d="M 80 37 Q 100 40 106 54" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <ellipse cx="106" cy="57" rx="3.5" ry="5.5" fill="#fbbf24" />
            </g>
          </g>

          {/* Eyes with Blink */}
          <g className="animate-cute-blink">
            <circle cx="64" cy="84" r="8.5" fill="#0f172a" />
            <circle cx="61.5" cy="81.5" r="3" fill="#ffffff" />
            <circle cx="66" cy="86" r="1.3" fill="#ffffff" />

            <circle cx="96" cy="84" r="8.5" fill="#0f172a" />
            <circle cx="93.5" cy="81.5" r="3" fill="#ffffff" />
            <circle cx="98" cy="86" r="1.3" fill="#ffffff" />
          </g>

          {/* Rosy Cheeks */}
          <ellipse cx="50" cy="93" rx="6" ry="3.8" fill="#ff6b8b" opacity="0.85" />
          <ellipse cx="110" cy="93" rx="6" ry="3.8" fill="#ff6b8b" opacity="0.85" />

          {/* Smile */}
          <path d="M 73 93 Q 80 103 87 93" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="#e11d48" />
          <path d="M 76 97 Q 80 102 84 97" fill="#fda4af" />
        </g>
      </svg>
    </div>
  );
};

export const CuteLoadingScreen: React.FC<CuteLoadingScreenProps> = ({
  subtitle = "Sedang memuat data tunggu sebentar yaa",
  fullScreen = true,
  className = "",
  onDismiss,
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 bg-gradient-to-br from-emerald-50/60 via-slate-50 to-[#85cc00]/15 font-sans p-6 overflow-hidden select-none"
    : "flex flex-col items-center justify-center bg-slate-50 bg-gradient-to-br from-emerald-50/60 via-slate-50 to-[#85cc00]/15 font-sans p-8 rounded-3xl overflow-hidden select-none";

  return (
    <div
      onClick={onDismiss}
      className={`${containerClasses} select-none transition-all duration-300 ${className}`}
    >
      {/* Dashboard-style subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-[#85cc00]/15 to-emerald-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/15 to-[#85cc00]/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
        <CuteMascotSvg size={150} className="drop-shadow-sm" />
        <p className="text-sm sm:text-base font-semibold text-slate-700 mt-4 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
