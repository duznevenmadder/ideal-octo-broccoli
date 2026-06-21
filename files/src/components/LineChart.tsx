// Static SVG line chart (renders on the server, no client JS). Supports multiple
// series with arbitrary numeric x, an optional dashed target line, and axis labels.
export type ChartSeries = {
  color: string;
  points: { x: number; y: number }[];
};

export default function LineChart({
  series,
  target,
  targetLabel,
  width = 640,
  height = 240,
  yFormat = (n) => String(Math.round(n)),
  xLabels,
}: {
  series: ChartSeries[];
  target?: number;
  targetLabel?: string;
  width?: number;
  height?: number;
  yFormat?: (n: number) => string;
  xLabels?: [string, string]; // [leftmost, rightmost]
}) {
  const pad = { top: 12, right: 16, bottom: 24, left: 64 };
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return <p className="text-sm text-gray-500">No data to chart yet.</p>;
  }

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys, target ?? Infinity);
  let maxY = Math.max(...ys, target ?? -Infinity);
  if (minX === maxX) maxX = minX + 1;
  if (minY === maxY) maxY = minY + 1;
  // Pad the y-range slightly for headroom.
  const yPadAmt = (maxY - minY) * 0.05;
  minY -= yPadAmt;
  maxY += yPadAmt;

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const sx = (x: number) => pad.left + ((x - minX) / (maxX - minX)) * innerW;
  const sy = (y: number) => pad.top + (1 - (y - minY) / (maxY - minY)) * innerH;

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");

  // Three y-axis gridlines: min, mid, max.
  const yTicks = [minY, (minY + maxY) / 2, maxY];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="line chart"
    >
      {/* y gridlines + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={sy(t)}
            y2={sy(t)}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
          <text
            x={pad.left - 8}
            y={sy(t) + 3}
            textAnchor="end"
            className="fill-gray-500"
            fontSize={10}
          >
            {yFormat(t)}
          </text>
        </g>
      ))}

      {/* target line */}
      {target != null && (
        <g>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={sy(target)}
            y2={sy(target)}
            stroke="#16a34a"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          {targetLabel && (
            <text
              x={width - pad.right}
              y={sy(target) - 4}
              textAnchor="end"
              fill="#16a34a"
              fontSize={10}
            >
              {targetLabel}
            </text>
          )}
        </g>
      )}

      {/* series */}
      {series.map((s, i) => (
        <path
          key={i}
          d={toPath(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* x labels */}
      {xLabels && (
        <>
          <text x={pad.left} y={height - 6} textAnchor="start" className="fill-gray-500" fontSize={10}>
            {xLabels[0]}
          </text>
          <text x={width - pad.right} y={height - 6} textAnchor="end" className="fill-gray-500" fontSize={10}>
            {xLabels[1]}
          </text>
        </>
      )}
    </svg>
  );
}
