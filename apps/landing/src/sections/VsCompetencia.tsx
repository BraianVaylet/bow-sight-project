import { Card } from '@bow-sight/ui';

/**
 * La comparacion.
 *
 * 🔴 Cita el **enfoque tecnico** de cada producto, no adjetivos. Es verificable,
 * y por eso convence a alguien que ya se quemo con otra app.
 *
 * 🔴 Nada de testimonios inventados ni capturas de features que no existen.
 */
const ENFOQUES = [
  {
    titulo: 'Balística pura',
    quien: 'Archer\u2019s Advantage, Precision Cut, Pro Archery Ballistics',
    como: 'Integran la trayectoria desde la velocidad, el peso y el arrastre.',
    problema:
      'Todo el error de entrada se traslada al resultado. Un dato de velocidad mal medido desplaza el tape entero — es la queja más repetida en sus foros.',
  },
  {
    titulo: 'Regresión de tres marcas',
    quien: 'Archery Sight Mark',
    como: 'Ajustan una parábola por mínimos cuadrados sobre tres mediciones.',
    problema:
      'La curva no pasa por ninguno de los puntos que mediste. A 30 m te dice 2.1 cuando vos tiraste y anotaste 2.0.',
  },
  {
    titulo: 'Bow Sight',
    quien: 'Empírico primero',
    como: 'Spline cúbico monótono sobre tus marcas medidas; extrapola solo fuera de ese rango.',
    problema:
      'Pasa exacto por cada marca que tiraste, y lo extrapolado se muestra marcado como estimado. Nunca al revés.',
    propio: true,
  },
];

export function VsCompetencia() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div>
        <h2 className="text-ink text-2xl font-semibold">Cómo calcula cada app</h2>
        <p className="text-ink-secondary mt-2">
          Sin adjetivos: el método de cada una y qué pasa cuando falla.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ENFOQUES.map((e) => (
          <Card
            key={e.titulo}
            className={e.propio ? 'border-accent' : undefined}
            dashed={!e.propio}
          >
            <h3 className="text-ink font-medium">{e.titulo}</h3>
            <p className="text-ink-muted mt-1 text-xs">{e.quien}</p>
            <p className="text-ink-secondary mt-3 text-sm">{e.como}</p>
            <p className="text-ink mt-2 text-sm">{e.problema}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
