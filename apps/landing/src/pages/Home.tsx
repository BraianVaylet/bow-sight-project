import { buttonClasses } from '@bow-sight/ui';
import { Link } from 'react-router-dom';
import { Demo } from '../sections/Demo.js';
import { VsCompetencia } from '../sections/VsCompetencia.js';

export function Home() {
  return (
    <>
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-5 px-4 pb-8 pt-16">
        <h1 className="text-ink text-balance text-4xl font-semibold sm:text-5xl">
          Las marcas de tu mira, sin el papelito.
        </h1>
        <p className="text-ink-secondary max-w-xl text-lg">
          Guardá en qué punto de la escala va tu mira a cada distancia, con cada set de flechas. Bow
          Sight calcula las que nunca tiraste — y te dice cuáles son medidas y cuáles estimadas.
        </p>
        <Link to="/precios" className={buttonClasses({ tone: 'accent', size: 'lg' })}>
          Ver precios
        </Link>
        <p className="text-ink-muted text-sm">Prueba de 14 días. Sin tarjeta.</p>
      </section>

      <Demo />
      <VsCompetencia />
    </>
  );
}
