import { createSightModel } from '@bow-sight/domain';
import { Card, Field, Input, Ruler, type RulerMark } from '@bow-sight/ui';
import { useMemo, useState } from 'react';

/** Marcas de ejemplo: una calibracion realista de compuesto, en milimetros. */
const MEDIDAS: Array<{ distanceM: number; scaleValueMm: number }> = [
  { distanceM: 20, scaleValueMm: 40 },
  { distanceM: 30, scaleValueMm: 120 },
  { distanceM: 40, scaleValueMm: 210 },
  { distanceM: 50, scaleValueMm: 320 },
  { distanceM: 60, scaleValueMm: 450 },
];

/**
 * La demo de la regla.
 *
 * 🔴 Corre **en el navegador de alguien que todavia no es usuario**, con el
 * mismo `@bow-sight/domain` que usa la app. Es el mejor argumento de venta que
 * tenemos: no se lee que la curva pasa por cada marca, **se ve**. Y es la razon
 * por la que el dominio tiene que seguir siendo puro y sin dependencias de Node
 * (ADR-004).
 */
export function Demo() {
  const [consulta, setConsulta] = useState('37');

  const modelo = useMemo(
    () => createSightModel(MEDIDAS.map((m) => ({ distance: m.distanceM, mark: m.scaleValueMm }))),
    [],
  );

  const distancia = Number(consulta);
  const valida = Number.isFinite(distancia) && distancia > 0 && distancia <= 120;
  const resultado = valida ? modelo.markAt(distancia) : null;

  const marcas: RulerMark[] = [
    ...MEDIDAS.map((m, i) => ({
      id: i + 1,
      distanceM: m.distanceM,
      scaleValue: m.scaleValueMm,
      variant: 'measured' as const,
    })),
    ...(resultado
      ? [
          {
            id: 999,
            distanceM: distancia,
            scaleValue: Math.round(resultado.mark * 10) / 10,
            variant: 'query' as const,
            estimated: !resultado.interpolated,
          },
        ]
      : []),
  ];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div>
        <h2 className="text-ink text-2xl font-semibold">Probalo con marcas de ejemplo</h2>
        <p className="text-ink-secondary mt-2">
          Cinco marcas medidas. Preguntale por cualquier distancia y fijate en las medidas: la curva{' '}
          <strong className="text-ink">pasa exacto</strong> por cada una.
        </p>
      </div>

      <Card className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Ruler minMm={0} maxMm={600} marks={marcas} width={300} height={420} />

        <div className="flex flex-1 flex-col gap-4">
          <Field label="Distancia" hint="En metros. Probá 37, o 18 para ver una estimada.">
            {(aria) => (
              <Input
                {...aria}
                type="number"
                inputMode="decimal"
                step="0.5"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
              />
            )}
          </Field>

          {resultado ? (
            <div className="bg-surface-2 rounded-lg p-4">
              <p className="tnum text-ink text-2xl font-semibold">
                {(Math.round(resultado.mark * 10) / 10 / 10).toFixed(1)} cm
              </p>
              <p className="text-ink-secondary mt-1 text-sm">
                {resultado.interpolated
                  ? 'Medido: está dentro del rango que tiraste.'
                  : 'Estimado: está fuera del rango medido, y la app te lo dice.'}
              </p>
            </div>
          ) : null}

          <p className="text-ink-muted text-xs">
            Los competidores ajustan una curva que no pasa por ninguna de tus marcas. Verificalo:
            escribí 30 y comparalo con la marca de 30 m.
          </p>
        </div>
      </Card>
    </section>
  );
}
