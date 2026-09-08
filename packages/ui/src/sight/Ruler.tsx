import { generateTicks, layoutMarkers, type MarkerInput } from '@bow-sight/domain';
import { cn } from '../cn.js';

/** De donde sale la marca. Se ven distinto **siempre**. */
export type MarkVariant = 'measured' | 'computed' | 'query';

export interface RulerMark extends MarkerInput {
  variant: MarkVariant;
  /** `true` => extrapolada. Se muestra con `≈`. */
  estimated?: boolean;
}

export interface RulerProps {
  /** Escala de la mira, en **milimetros** (canonico). */
  minMm: number;
  maxMm: number;
  marks: RulerMark[];
  width?: number;
  height?: number;
  className?: string;
  /** Como se escribe la escala para este arquero. */
  formatScale?: (mm: number) => string;
  formatDistance?: (m: number) => string;
}

const PAD = 18;
const TRACK_X = 32;
const MARK_X = 76;
const LABEL_H = 26;

/**
 * La regla vertical: la pantalla estrella.
 *
 * Minimo arriba y la escala creciendo hacia abajo, **igual que una mira real**.
 * En SVG porque las lineas quedan nitidas a cualquier densidad y cada marca cae
 * en su coordenada exacta.
 *
 * 🔴 Los tres tipos de marca se distinguen sin depender solo del color: la
 * medida es un punto lleno, la calculada un anillo punteado con `≈`, y la
 * consultada va invertida. Presentar una estimacion como una medicion seria
 * mentir sobre lo unico que nos diferencia (ADR-001).
 */
export function Ruler({
  minMm,
  maxMm,
  marks,
  width = 300,
  height = 420,
  className,
  formatScale = (mm) => (mm / 10).toFixed(1),
  formatDistance = (m) => `${m} m`,
}: RulerProps) {
  const usable = height - PAD * 2;
  // El dominio trabaja en centimetros para los ticks: se le pasa la escala en
  // esa unidad y el resultado ya viene en pixeles.
  const ticks = generateTicks(minMm / 10, maxMm / 10, usable);
  const laid = layoutMarkers(
    marks.map((m) => ({ ...m, scaleValue: m.scaleValue / 10 })),
    minMm / 10,
    maxMm / 10,
    usable,
    LABEL_H,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('select-none', className)}
      role="img"
      aria-label={`Escala de ${formatScale(minMm)} a ${formatScale(maxMm)} con ${marks.length} marcas`}
    >
      <line
        x1={TRACK_X}
        y1={PAD}
        x2={TRACK_X}
        y2={PAD + usable}
        stroke="var(--bs-ruler-tick-strong)"
        strokeWidth={2}
      />

      {ticks.map((tick, i) => (
        <g key={i}>
          <line
            x1={TRACK_X}
            y1={PAD + tick.y}
            x2={TRACK_X + tick.length}
            y2={PAD + tick.y}
            stroke={tick.size === 'lg' ? 'var(--bs-ruler-tick-strong)' : 'var(--bs-ruler-tick)'}
            strokeWidth={tick.size === 'lg' ? 1.5 : 1}
          />
          {tick.label ? (
            <text
              x={TRACK_X - 6}
              y={PAD + tick.y + 4}
              textAnchor="end"
              className="tnum"
              fontSize={11}
              fill="var(--bs-ink-muted)"
            >
              {tick.label}
            </text>
          ) : null}
        </g>
      ))}

      {laid.map((mark) => {
        const original = marks.find((m) => m.id === mark.id)!;
        const y = PAD + mark.anchorY;
        const labelY = PAD + mark.labelY;
        const medida = original.variant === 'measured';
        const consultada = original.variant === 'query';

        return (
          <g key={mark.id}>
            {/* Linea guia cuando la etiqueta se corrio por anti-solape. */}
            {Math.abs(labelY - y) > 1 ? (
              <path
                d={`M ${TRACK_X + 24} ${y} C ${MARK_X - 20} ${y}, ${TRACK_X + 40} ${labelY}, ${MARK_X - 4} ${labelY}`}
                fill="none"
                stroke="var(--bs-ruler-tick)"
                strokeWidth={1}
              />
            ) : null}

            <circle
              cx={TRACK_X + 24}
              cy={y}
              r={4}
              fill={medida ? 'var(--bs-accent-base)' : 'none'}
              stroke={medida ? 'none' : 'var(--bs-ink-muted)'}
              strokeWidth={1.5}
              strokeDasharray={medida ? undefined : '2 2'}
            />

            <rect
              x={MARK_X}
              y={labelY - 11}
              width={width - MARK_X - 8}
              height={22}
              rx={6}
              fill={consultada ? 'var(--bs-ink-primary)' : medida ? 'var(--bs-surface-2)' : 'none'}
              stroke={medida || consultada ? 'none' : 'var(--bs-border-strong)'}
              strokeDasharray={medida || consultada ? undefined : '3 3'}
            />
            <text
              x={MARK_X + 8}
              y={labelY + 4}
              fontSize={12}
              className="tnum"
              fill={consultada ? 'var(--bs-surface-0)' : 'var(--bs-ink-primary)'}
            >
              {`${original.estimated ? '≈ ' : ''}${formatDistance(original.distanceM)} → ${formatScale(original.scaleValue)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
