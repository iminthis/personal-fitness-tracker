"use client";
import React from "react";

export function Ring({
  value,
  target,
  label,
  unit,
  color = "#22d3ee",
  size = 120,
}: {
  value: number;
  target: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f1f24" strokeWidth={10} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-[88px] pointer-events-none">
        <div className="text-xl font-semibold">{value.toLocaleString()}<span className="text-sm text-muted">/{target.toLocaleString()}{unit ?? ""}</span></div>
        <div className="text-xs text-muted">{label}</div>
      </div>
      <div className="h-[40px]" />
    </div>
  );
}
