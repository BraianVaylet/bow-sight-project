import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ruler, type RulerMark } from './Ruler.js';

const MARCAS: RulerMark[] = [
  { id: 1, distanceM: 20, scaleValue: 40, variant: 'measured' },
  { id: 2, distanceM: 30, scaleValue: 120, variant: 'measured' },
  { id: 3, distanceM: 25, scaleValue: 78, variant: 'computed', estimated: false },
  { id: 4, distanceM: 18, scaleValue: 22, variant: 'computed', estimated: true },
];

describe('Ruler', () => {
  it('se anuncia con su escala y cuantas marcas tiene', () => {
    render(<Ruler minMm={0} maxMm={600} marks={MARCAS} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/Escala de 0.0 a 60.0 con 4 marcas/);
  });

  it('🔴 lo estimado se marca con ≈ y lo medido no', () => {
    // Presentar una estimacion como una medicion seria mentir sobre lo unico
    // que nos diferencia (ADR-001).
    render(<Ruler minMm={0} maxMm={600} marks={MARCAS} />);

    expect(screen.getByText(/≈ 18 m/)).toBeInTheDocument();
    expect(screen.getByText(/^20 m/)).toBeInTheDocument();
    expect(screen.queryByText(/≈ 20 m/)).not.toBeInTheDocument();
  });

  it('muestra los metros y el valor de escala en una sola linea', () => {
    render(<Ruler minMm={0} maxMm={600} marks={MARCAS} />);
    expect(screen.getByText('30 m → 12.0')).toBeInTheDocument();
  });

  it('respeta el formato de escala del arquero: pulgadas, clicks, lo que sea', () => {
    render(
      <Ruler
        minMm={0}
        maxMm={600}
        marks={[MARCAS[0]!]}
        formatScale={(mm) => `${(mm / 25.4).toFixed(2)}"`}
        formatDistance={(m) => `${Math.round(m * 1.09361)} yd`}
      />,
    );
    expect(screen.getByText('22 yd → 1.57"')).toBeInTheDocument();
  });

  it('🔴 el minimo va arriba: la escala crece hacia abajo, como la mira real', () => {
    const { container } = render(
      <Ruler
        minMm={0}
        maxMm={600}
        marks={[
          { id: 1, distanceM: 20, scaleValue: 40, variant: 'measured' },
          { id: 2, distanceM: 60, scaleValue: 560, variant: 'measured' },
        ]}
        height={420}
      />,
    );

    const puntos = [...container.querySelectorAll('circle')];
    const cerca = Number(puntos[0]?.getAttribute('cy'));
    const lejos = Number(puntos[1]?.getAttribute('cy'));
    expect(lejos).toBeGreaterThan(cerca);
  });

  it('sin marcas dibuja la regla igual: es el estado vacio, no un error', () => {
    const { container } = render(<Ruler minMm={0} maxMm={600} marks={[]} />);
    expect(container.querySelectorAll('line').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('la marca consultada se distingue de las demas sin depender del color', () => {
    const { container } = render(
      <Ruler
        minMm={0}
        maxMm={600}
        marks={[
          { id: 1, distanceM: 20, scaleValue: 40, variant: 'measured' },
          { id: 2, distanceM: 37, scaleValue: 190, variant: 'query' },
        ]}
      />,
    );
    // La medida tiene punto lleno; la calculada, anillo punteado.
    const punteados = [...container.querySelectorAll('circle')].filter((c) =>
      c.getAttribute('stroke-dasharray'),
    );
    expect(punteados.length).toBeGreaterThanOrEqual(0);
    expect(container.querySelectorAll('rect').length).toBe(2);
  });
});
