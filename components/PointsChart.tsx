"use client";

import { useState } from "react";
import { draft, results } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";

const COLORS = [
  "#f7c948", "#2bd980", "#ff5a5f", "#60a5fa",
  "#a78bfa", "#fb923c", "#34d399", "#e879f9",
  "#22d3ee", "#4ade80", "#f472b6", "#facc15",
];

function ptSegDist(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}

interface HoverState {
  teams: string[];
  clientX: number;
  clientY: number;
}

export default function PointsChart() {
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const matchdays = [...new Set(results.map((r) => r.matchday))].sort(
    (a, b) => a - b,
  );
  if (matchdays.length === 0) return null;

  const series = draft.map((pick, i) => {
    let cum = 0;
    const pts = matchdays.map((md) => {
      for (const r of results.filter(
        (r2) => r2.team === pick.team && r2.matchday === md,
      )) {
        cum += resultPoints(r);
      }
      return cum;
    });
    return { owner: pick.owner, team: pick.team, flag: pick.flag, pts, color: COLORS[i] };
  });

  const maxPts = Math.max(...series.flatMap((s) => s.pts), 1);

  const W = 640, H = 180;
  const padL = 36, padR = 16, padT = 12, padB = 28;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const xOf = (i: number) =>
    matchdays.length === 1
      ? padL + cw / 2
      : padL + (i / (matchdays.length - 1)) * cw;

  const yOf = (p: number) => padT + ch - (p / maxPts) * ch;

  const DOT_HIT = 14;
  const LINE_HIT = 7;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const svgY = ((e.clientY - rect.top) / rect.height) * H;

    const found: string[] = [];
    for (const s of series) {
      let hit = false;
      for (let i = 0; i < s.pts.length; i++) {
        if (Math.hypot(xOf(i) - svgX, yOf(s.pts[i]) - svgY) <= DOT_HIT) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let i = 0; i < s.pts.length - 1; i++) {
          if (
            ptSegDist(svgX, svgY, xOf(i), yOf(s.pts[i]), xOf(i + 1), yOf(s.pts[i + 1])) <= LINE_HIT
          ) {
            hit = true;
            break;
          }
        }
      }
      if (hit) found.push(s.team);
    }

    setHovered(found.length > 0 ? { teams: found, clientX: e.clientX, clientY: e.clientY } : null);
  }

  const hoveredTeams = new Set(hovered?.teams ?? []);
  const anyHovered = hoveredTeams.size > 0;

  const legend = [...series].sort(
    (a, b) => b.pts[b.pts.length - 1] - a.pts[a.pts.length - 1],
  );
  const yTicks = [0, Math.round(maxPts / 2), maxPts];

  const tooltipMatches = hovered
    ? hovered.teams
        .map((t) => series.find((s) => s.team === t)!)
        .sort((a, b) => b.pts[b.pts.length - 1] - a.pts[a.pts.length - 1])
    : [];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label="Points over time by manager"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        style={{ cursor: "crosshair" }}
      >
        {yTicks.map((v) => (
          <line key={v} x1={padL} x2={W - padR} y1={yOf(v)} y2={yOf(v)}
            stroke="var(--line-soft)" strokeWidth="1" />
        ))}
        {yTicks.map((v) => (
          <text key={v} x={padL - 6} y={yOf(v) + 4} textAnchor="end"
            fill="var(--ink-faint)" fontSize="10" fontFamily="var(--mono)">
            {v}
          </text>
        ))}
        {matchdays.map((md, i) => (
          <text key={md} x={xOf(i)} y={H - 6} textAnchor="middle"
            fill="var(--ink-faint)" fontSize="10" fontFamily="var(--mono)">
            MD{md}
          </text>
        ))}

        {series.map((s) => {
          const lastPts = s.pts[s.pts.length - 1];
          const isHov = hoveredTeams.has(s.team);
          const faded = anyHovered && !isHov;
          const baseAlpha = lastPts > 0 ? 1 : 0.2;
          const alpha = faded ? 0.07 : baseAlpha;
          const pointsStr = s.pts.map((p, i) => `${xOf(i)},${yOf(p)}`).join(" ");
          return (
            <g key={s.team}>
              {s.pts.length > 1 && (
                <>
                  <polyline points={pointsStr} fill="none" stroke="transparent" strokeWidth="14" />
                  <polyline points={pointsStr} fill="none" stroke={s.color}
                    strokeWidth={isHov ? 3 : 2} opacity={alpha} />
                </>
              )}
              {s.pts.map((p, i) => (
                <circle key={i} cx={xOf(i)} cy={yOf(p)} r={isHov ? 6 : 4}
                  fill={s.color} opacity={faded ? 0.07 : lastPts > 0 ? 1 : 0.25} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Fixed tooltip — floats above all page content */}
      {hovered && tooltipMatches.length > 0 && (
        <div
          className="chart-tooltip"
          style={{ left: hovered.clientX + 16, top: hovered.clientY - 8 }}
        >
          {tooltipMatches.map((s) => (
            <div key={s.team} style={{ color: s.color }}>
              {s.flag} {s.owner} · {s.pts[s.pts.length - 1]} pts
            </div>
          ))}
        </div>
      )}

      <div className="chart-legend">
        {legend.map((s) => {
          const cur = s.pts[s.pts.length - 1];
          return (
            <div key={s.team} className="chart-legend-item"
              style={{ opacity: anyHovered && !hoveredTeams.has(s.team) ? 0.3 : 1, transition: "opacity 0.1s" }}>
              <span className="chart-dot" style={{ background: s.color }} aria-hidden />
              <span className="chart-owner">{s.flag} {s.owner}</span>
              <span className="chart-cur-pts" style={{ color: s.color }}>{cur}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
