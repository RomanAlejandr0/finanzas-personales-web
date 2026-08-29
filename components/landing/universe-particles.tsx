import type { CSSProperties } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
};

type StarStyle = CSSProperties & {
  "--delay": string;
  "--drift-x": string;
  "--drift-y": string;
  "--duration": string;
  "--star-opacity": string;
  "--twinkle-duration": string;
};

const stars: Star[] = [
  { x: 4, y: 8, size: 2, opacity: 0.24, duration: 24, delay: -11, driftX: 8, driftY: -6 },
  { x: 11, y: 19, size: 3, opacity: 0.42, duration: 31, delay: -17, driftX: -7, driftY: 5 },
  { x: 18, y: 6, size: 2, opacity: 0.3, duration: 27, delay: -4, driftX: 5, driftY: 7 },
  { x: 24, y: 27, size: 1, opacity: 0.26, duration: 35, delay: -19, driftX: -4, driftY: -8 },
  { x: 30, y: 12, size: 2, opacity: 0.38, duration: 29, delay: -14, driftX: 6, driftY: 4 },
  { x: 37, y: 34, size: 2, opacity: 0.2, duration: 33, delay: -9, driftX: -8, driftY: 3 },
  { x: 43, y: 5, size: 3, opacity: 0.32, duration: 26, delay: -21, driftX: 4, driftY: 7 },
  { x: 49, y: 21, size: 1, opacity: 0.24, duration: 30, delay: -7, driftX: -5, driftY: -4 },
  { x: 57, y: 9, size: 2, opacity: 0.35, duration: 32, delay: -15, driftX: 7, driftY: -3 },
  { x: 64, y: 29, size: 3, opacity: 0.28, duration: 28, delay: -5, driftX: -6, driftY: 6 },
  { x: 71, y: 14, size: 1, opacity: 0.22, duration: 36, delay: -24, driftX: 5, driftY: 5 },
  { x: 78, y: 37, size: 2, opacity: 0.4, duration: 25, delay: -12, driftX: -4, driftY: -7 },
  { x: 86, y: 6, size: 2, opacity: 0.25, duration: 34, delay: -2, driftX: 8, driftY: 2 },
  { x: 93, y: 23, size: 3, opacity: 0.34, duration: 29, delay: -18, driftX: -5, driftY: 6 },
  { x: 7, y: 46, size: 1, opacity: 0.3, duration: 27, delay: -16, driftX: 6, driftY: -4 },
  { x: 14, y: 63, size: 2, opacity: 0.38, duration: 31, delay: -6, driftX: -7, driftY: 5 },
  { x: 21, y: 78, size: 3, opacity: 0.24, duration: 35, delay: -22, driftX: 4, driftY: -6 },
  { x: 28, y: 52, size: 1, opacity: 0.3, duration: 24, delay: -10, driftX: -3, driftY: 8 },
  { x: 34, y: 91, size: 2, opacity: 0.4, duration: 32, delay: -13, driftX: 7, driftY: 4 },
  { x: 40, y: 67, size: 2, opacity: 0.2, duration: 28, delay: -20, driftX: -6, driftY: -5 },
  { x: 46, y: 82, size: 1, opacity: 0.3, duration: 34, delay: -8, driftX: 5, driftY: -7 },
  { x: 53, y: 58, size: 3, opacity: 0.28, duration: 30, delay: -25, driftX: -4, driftY: 5 },
  { x: 60, y: 92, size: 2, opacity: 0.42, duration: 26, delay: -3, driftX: 8, driftY: -3 },
  { x: 67, y: 48, size: 1, opacity: 0.25, duration: 36, delay: -11, driftX: -5, driftY: 6 },
  { x: 74, y: 72, size: 2, opacity: 0.36, duration: 29, delay: -19, driftX: 4, driftY: -8 },
  { x: 81, y: 88, size: 3, opacity: 0.3, duration: 33, delay: -7, driftX: -7, driftY: 3 },
  { x: 88, y: 55, size: 1, opacity: 0.24, duration: 27, delay: -14, driftX: 6, driftY: 5 },
  { x: 96, y: 76, size: 2, opacity: 0.4, duration: 31, delay: -23, driftX: -5, driftY: -6 },
];

export function UniverseParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star, index) => (
        <span
          className="universe-star"
          key={index}
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "--delay": `${Math.round(star.delay / 3)}s`,
              "--drift-x": `${star.driftX * 3}px`,
              "--drift-y": `${star.driftY * 3}px`,
              "--duration": `${Math.round(star.duration / 3)}s`,
              "--star-opacity": String(star.opacity),
              "--twinkle-duration": `${Math.max(3, Math.round(star.duration / 6))}s`,
            } as StarStyle
          }
        />
      ))}
    </div>
  );
}
