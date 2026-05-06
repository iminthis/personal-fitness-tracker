"use client";
import React from "react";

export function Heatmap({
  data,
  getValue,
  colorFor,
  title,
}: {
  data: Array<{ date: string }>;
  getValue: (d: any) => number;
  colorFor: (v: number) => string;
  title: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted mb-2">{title}</div>
      <div className="flex gap-[3px] flex-wrap">
        {data.map((d) => {
          const v = getValue(d);
          return (
            <div
              key={d.date}
              title={`${d.date}: ${v}`}
              className="w-3 h-3 rounded-sm"
              style={{ background: colorFor(v) }}
            />
          );
        })}
      </div>
    </div>
  );
}
