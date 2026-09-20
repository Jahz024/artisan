"use client";

/**
 * The landing page's one moment of motion: a degree drawn as a transit line.
 * The maroon line runs the CS core; the orange line (math) transfers in at
 * CS 3114. The lines draw once on load, then the stations pop in order.
 */

const MAROON_STOPS = [
  { x: 60, label: "CS 1114", done: true },
  { x: 250, label: "CS 2114", done: true },
  { x: 460, label: "CS 3114", now: true },
  { x: 680, label: "CS 3214" },
  { x: 900, label: "Capstone" },
];

const ORANGE_STOPS = [
  { x: 120, y: 205, label: "MATH 1225", done: true },
  { x: 300, y: 205, label: "MATH 2534", done: true },
];

export function HokieLineHero() {
  return (
    <svg
      viewBox="0 0 1200 280"
      className="h-auto w-full"
      role="img"
      aria-label="Illustration: a degree drawn as a transit line, from CS 1114 to graduation"
    >
      {/* Orange line: math sequence transferring into the CS core */}
      <path
        className="hero-line"
        pathLength={1000}
        style={{ ["--line-length" as string]: 1000, animationDelay: "0.35s" }}
        d="M 120 205 H 350 Q 362 205 370 197 L 442 125 Q 450 117 460 117"
        fill="none"
        stroke="var(--orange)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Maroon line: the CS core, ending at graduation */}
      <path
        className="hero-line"
        pathLength={1000}
        style={{ ["--line-length" as string]: 1000 }}
        d="M 60 117 H 1080"
        fill="none"
        stroke="var(--maroon)"
        strokeWidth={12}
        strokeLinecap="round"
      />

      {MAROON_STOPS.map((s, i) => (
        <g key={s.label}>
          <circle
            className="hero-station"
            style={{ animationDelay: `${0.5 + i * 0.22}s` }}
            cx={s.x}
            cy={117}
            r={s.now ? 15 : 12}
            fill={s.done ? "var(--ink)" : s.now ? "var(--orange)" : "#fff"}
            stroke="var(--ink)"
            strokeWidth={s.now ? 5 : 4}
          />
          <text
            x={s.x}
            y={84}
            textAnchor="middle"
            fill="var(--ink)"
            className="hero-station"
            style={{
              animationDelay: `${0.5 + i * 0.22}s`,
              fontFamily: "var(--font-barlow-condensed)",
              fontWeight: 700,
              fontSize: 22,
            }}
          >
            {s.label}
          </text>
          {s.now ? (
            <text
              x={s.x}
              y={160}
              textAnchor="middle"
              fill="var(--ink-soft)"
              className="hero-station"
              style={{ animationDelay: `${0.5 + i * 0.22}s`, fontSize: 15, fontWeight: 600 }}
            >
              You are here
            </text>
          ) : null}
        </g>
      ))}

      {ORANGE_STOPS.map((s, i) => (
        <g key={s.label}>
          <circle
            className="hero-station"
            style={{ animationDelay: `${0.8 + i * 0.22}s` }}
            cx={s.x}
            cy={s.y}
            r={11}
            fill={s.done ? "var(--ink)" : "#fff"}
            stroke="var(--ink)"
            strokeWidth={4}
          />
          <text
            x={s.x}
            y={s.y + 38}
            textAnchor="middle"
            fill="var(--ink)"
            className="hero-station"
            style={{
              animationDelay: `${0.8 + i * 0.22}s`,
              fontFamily: "var(--font-barlow-condensed)",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {s.label}
          </text>
        </g>
      ))}

      {/* Terminus: graduation, drawn as an interchange station */}
      <g className="hero-station" style={{ animationDelay: "1.9s" }}>
        <rect
          x={1080}
          y={93}
          width={48}
          height={48}
          rx={24}
          fill="#fff"
          stroke="var(--ink)"
          strokeWidth={6}
        />
        <circle cx={1104} cy={117} r={9} fill="var(--maroon)" />
      </g>
      <text
        x={1104}
        y={78}
        textAnchor="middle"
        fill="var(--maroon)"
        className="hero-station"
        style={{
          animationDelay: "1.9s",
          fontFamily: "var(--font-barlow-condensed)",
          fontWeight: 800,
          fontSize: 26,
        }}
      >
        Graduation
      </text>
    </svg>
  );
}
