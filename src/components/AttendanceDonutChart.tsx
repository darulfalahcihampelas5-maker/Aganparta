import React, { useState } from "react";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface AttendanceDonutChartProps {
  data: ChartDataItem[];
  centerPercentage: string | number;
}

export const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({
  data,
  centerPercentage,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, item) => acc + item.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400">
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center">
          <span className="text-xs font-bold uppercase tracking-wider">Belum Ada Data</span>
        </div>
      </div>
    );
  }

  // SVG parameters
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="w-full h-64 relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {data.map((item, index) => {
          const percent = item.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += percent;

          const isHovered = hoveredIndex === index;

          return (
            <circle
              key={`donut-slice-${item.name}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>

      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-slate-900 font-display tracking-tight">
          {hoveredIndex !== null ? data[hoveredIndex].value : `${centerPercentage}%`}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {hoveredIndex !== null ? data[hoveredIndex].name : "Hadir"}
        </span>
      </div>
    </div>
  );
};
