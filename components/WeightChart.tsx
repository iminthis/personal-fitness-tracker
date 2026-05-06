"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function WeightChart({ data }: { data: Array<{ date: string; weight_kg: number | null }> }) {
  const points = data.filter((d) => d.weight_kg != null);
  if (points.length < 2)
    return <div className="text-sm text-muted">Log weight on at least 2 days to see a trend.</div>;
  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f1f24" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
          <YAxis stroke="#71717a" fontSize={11} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#111114", border: "1px solid #1f1f24", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#71717a" }}
          />
          <Line type="monotone" dataKey="weight_kg" stroke="#22d3ee" dot={{ r: 2 }} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
