"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";

const data = [
  { date: "19", score: 28 },
  { date: "25", score: 31 },
  { date: "3", score: 38, label: "4 Maret 2026" },
  { date: "9", score: 43 },
  { date: "15", score: 45 },
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: (typeof data)[0] }>;
}) {
  if (!active || !payload?.length || !payload[0]) return null;
  const point = payload[0];
  const idx = data.findIndex((d) => d.date === point.payload.date);
  const prev = idx > 0 ? (data[idx - 1]?.score ?? point.value) : point.value;
  const diff = point.value - prev;
  const diffStr = diff >= 0 ? `+${diff}%` : `${diff}%`;

  return (
    <div className="rounded-lg border border-border-light bg-white px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-500">
        {point.payload.label || point.payload.date + " Mar 2026"}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-gray-900">{point.value}%</span>
        <span
          className={`text-sm font-medium ${diff >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {diffStr}
        </span>
      </div>
    </div>
  );
}

export default function VisibilityScoreChart() {
  return (
    <div className="w-[340px] h-[310px] rounded-[6px] border border-border-light bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <p className="mb-3 type-title text-gray-900 m-0">Skor visibilitas AI</p>
      <ResponsiveContainer width="100%" height={242}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#533AFD" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#533AFD" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#e5e7eb"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            dy={6}
          />
          <YAxis
            domain={[20, 50]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#533AFD", strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#533AFD"
            strokeWidth={2}
            fill="url(#scoreFill)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#533AFD",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
          <ReferenceDot
            x="15"
            y={45}
            r={4}
            fill="#533AFD"
            stroke="#fff"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
