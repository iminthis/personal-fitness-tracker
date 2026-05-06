"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

export function MacroBars({
  data,
  field,
  target,
  color,
  label,
}: {
  data: Array<{ date: string } & Record<string, any>>;
  field: string;
  target: number;
  color: string;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
        <div className="text-xs text-muted">target {target}</div>
      </div>
      <div className="w-full h-32">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(d) => d.slice(5)} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ background: "#111114", border: "1px solid #1f1f24", borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={target} stroke="#71717a" strokeDasharray="3 3" />
            <Bar dataKey={field} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
