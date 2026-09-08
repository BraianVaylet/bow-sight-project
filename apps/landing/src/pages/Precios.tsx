import { Card } from '@bow-sight/ui';

/**
 * 🔴 Los precios **se leen de la API** (F2-E): cambiar un precio no puede exigir
 * un deploy de la landing. Hasta que ese endpoint exista, estan aca marcados
 * como provisorios — y esta linea es el recordatorio.
 */
const PLANES = [
  {
    nombre: 'Free',
    precio: 'Gratis',
    para: 'Para probar de verdad, sin apuro.',
    incluye: ['1 mira', '2 sets de flechas', '15 marcas', 'La regla y la calculadora'],
  },
  {
    nombre: 'Pro',
    precio: 'US$1.99/mes',
    anual: 'o US$16.99 al año',
    para: 'Para el que compite.',
    incluye: [
      'Miras y sets ilimitados',
      'Yardas, pulgadas y clicks',
      'Tape a escala real, calibrado',
      'Corte por ángulo',
      'Mark Doctor por marca',
      'Escritura sin conexión',
    ],
    destacado: true,
  },
  {
    nombre: 'Max',
    precio: 'US$3.99/mes',
    anual: 'o US$34.99 al año',
    para: 'Para el que entrena con alguien.',
    incluye: [
      'Todo lo de Pro',
      'Semilla balística desde tus specs',
      'Ajuste por temperatura y altitud',
      'Comparar sets superpuestos',
      'Compartir con hasta 3 coaches',
    ],
  },
];

export function Precios() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-ink text-3xl font-semibold">Precios</h1>
        <p className="text-ink-secondary mt-2">
          Prueba de 14 días con todo, sin tarjeta. Después elegís — y si no elegís, tu cuenta pasa a
          Free y <strong className="text-ink">no se borra nada</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANES.map((plan) => (
          <Card key={plan.nombre} className={plan.destacado ? 'border-accent' : undefined}>
            <h2 className="text-ink font-medium">{plan.nombre}</h2>
            <p className="tnum text-ink mt-2 text-2xl font-semibold">{plan.precio}</p>
            {plan.anual ? <p className="text-ink-muted text-sm">{plan.anual}</p> : null}
            <p className="text-ink-secondary mt-2 text-sm">{plan.para}</p>
            <ul className="text-ink-secondary mt-4 flex flex-col gap-1 text-sm">
              {plan.incluye.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="text-ink-muted text-sm">
        Lo que excede el límite de tu plan queda para leer e imprimir, no para editar. Una hoja de
        marcas que vas a usar el domingo no se bloquea.
      </p>
    </section>
  );
}
