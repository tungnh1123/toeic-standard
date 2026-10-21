import React, { useState } from 'react';

export interface SkillScoreItem {
  skillCode: string;
  skillName: string;
  score: number;
  levelLabel: string;
}

interface SkillRadarHexagonChartProps {
  skills: SkillScoreItem[];
  size?: number;
}

export const SkillRadarHexagonChart: React.FC<SkillRadarHexagonChartProps> = ({
  skills,
  size = 360,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  // 6 fixed axes in order
  const order: { code: string; label: string }[] = [
    { code: 'VOCABULARY', label: 'Từ vựng' },
    { code: 'GRAMMAR', label: 'Ngữ pháp' },
    { code: 'READING', label: 'Đọc hiểu' },
    { code: 'LISTENING', label: 'Nghe hiểu' },
    { code: 'SPEAKING', label: 'Kỹ năng Nói' },
    { code: 'WRITING', label: 'Kỹ năng Viết' },
  ];

  const orderedSkills = order.map((item) => {
    const found = skills.find((s) => s.skillCode === item.code);
    return (
      found || {
        skillCode: item.code,
        skillName: item.label,
        score: 0,
        levelLabel: 'Chưa có dữ liệu',
      }
    );
  });

  const getCoordinates = (index: number, scoreRatio: number) => {
    // 0 is at top (-PI / 2)
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 6;
    const x = cx + radius * scoreRatio * Math.cos(angle);
    const y = cy + radius * scoreRatio * Math.sin(angle);
    return { x, y, angle };
  };

  // Concentric levels at 20%, 40%, 60%, 80%, 100%
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const userPolygonPoints = orderedSkills
    .map((s, i) => {
      const ratio = Math.max(0.05, Math.min(1.0, s.score / 100));
      const { x, y } = getCoordinates(i, ratio);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center select-none relative">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.30" />
          </linearGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Ambient background glow */}
        <circle cx={cx} cy={cy} r={radius} fill="url(#centerGlow)" />

        {/* Background concentric hex grid */}
        {levels.map((lvl) => {
          const points = [0, 1, 2, 3, 4, 5]
            .map((i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <g key={lvl}>
              <polygon
                points={points}
                fill={lvl === 1.0 ? '#f8fafc' : 'none'}
                stroke="#e2e8f0"
                strokeWidth={lvl === 1.0 ? 1.5 : 1}
                strokeDasharray={lvl < 1.0 ? '3,3' : undefined}
              />
              <text
                x={cx + 4}
                y={cy - radius * lvl + 10}
                fill="#94a3b8"
                fontSize="9"
                fontWeight="600"
              >
                {Math.round(lvl * 100)}
              </text>
            </g>
          );
        })}

        {/* 6 Radial Axes */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const { x, y } = getCoordinates(i, 1.0);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />
          );
        })}

        {/* User Data Polygon */}
        <polygon
          points={userPolygonPoints}
          fill="url(#radarGradient)"
          stroke="#4f46e5"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Vertex Markers & Interactive Nodes */}
        {orderedSkills.map((s, i) => {
          const ratio = Math.max(0.05, Math.min(1.0, s.score / 100));
          const { x, y } = getCoordinates(i, ratio);
          const outer = getCoordinates(i, 1.15);
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={s.skillCode}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Vertex Circle */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 4.5}
                fill={isHovered ? '#4338ca' : '#4f46e5'}
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-200"
              />

              {/* Axis Label */}
              <text
                x={outer.x}
                y={outer.y}
                textAnchor={
                  Math.abs(outer.x - cx) < 10
                    ? 'middle'
                    : outer.x > cx
                      ? 'start'
                      : 'end'
                }
                dominantBaseline="central"
                fill={isHovered ? '#1e293b' : '#475569'}
                fontSize="11"
                fontWeight={isHovered ? '700' : '600'}
                className="transition-all"
              >
                {s.skillName}
              </text>

              {/* Score Subtitle below or beside */}
              <text
                x={outer.x}
                y={outer.y + 13}
                textAnchor={
                  Math.abs(outer.x - cx) < 10
                    ? 'middle'
                    : outer.x > cx
                      ? 'start'
                      : 'end'
                }
                dominantBaseline="central"
                fill={s.score >= 70 ? '#16a34a' : s.score >= 50 ? '#d97706' : '#dc2626'}
                fontSize="10"
                fontWeight="700"
              >
                {Math.round(s.score)}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip if hovering a skill */}
      {hoveredIndex !== null && (
        <div className="mt-2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 animate-fadeIn">
          <span className="font-bold">{orderedSkills[hoveredIndex].skillName}:</span>
          <span className="font-extrabold text-amber-300">
            {orderedSkills[hoveredIndex].score}%
          </span>
          <span className="text-slate-300">
            ({orderedSkills[hoveredIndex].levelLabel})
          </span>
        </div>
      )}
    </div>
  );
};
