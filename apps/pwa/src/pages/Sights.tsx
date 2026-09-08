import { ApiError } from '@bow-sight/client';
import { Alert, Card, EmptyState, Spinner, buttonClasses } from '@bow-sight/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type Sight } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

/** Convierte la escala canonica (mm) a lo que el arquero lee en SU mira. */
function escala(sight: Sight): string {
  if (sight.scaleUnit === 'cm') {
    return `${(sight.scaleMinMm / 10).toFixed(0)}–${(sight.scaleMaxMm / 10).toFixed(0)} cm`;
  }
  if (sight.scaleUnit === 'in') {
    return `${(sight.scaleMinMm / 25.4).toFixed(1)}–${(sight.scaleMaxMm / 25.4).toFixed(1)} in`;
  }
  return `${sight.scaleMinMm}–${sight.scaleMaxMm} mm`;
}

export function Sights() {
  const textOf = useErrorText();
  const { data, isPending, error } = useQuery({
    queryKey: ['sights'],
    queryFn: () => api.get<Sight[]>('/sights'),
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-ink text-2xl font-semibold">Mis miras</h1>
        <Link to="/perfil" className="text-ink-secondary text-sm underline">
          Perfil
        </Link>
      </header>

      {isPending ? <Spinner label="Cargando tus miras" /> : null}

      {error ? (
        <Alert code={error instanceof ApiError ? error.code : undefined}>
          {error instanceof ApiError ? textOf(error) : 'No pudimos cargar tus miras.'}
        </Alert>
      ) : null}

      {data?.length === 0 ? (
        <EmptyState
          title="Todavía no tenés miras"
          description="Creá una para empezar a cargar tus marcas."
          action={
            <Link to="/miras/nueva" className={buttonClasses({ tone: 'accent' })}>
              Nueva mira
            </Link>
          }
        />
      ) : null}

      <ul className="flex flex-col gap-2">
        {data?.map((sight) => (
          <li key={sight._id}>
            <Link to={`/miras/${sight._id}`} className="block">
              <Card className="flex items-center justify-between">
                <span className="text-ink font-medium">{sight.name}</span>
                <span className="tnum text-ink-secondary text-sm">{escala(sight)}</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {data && data.length > 0 ? (
        <Link
          to="/miras/nueva"
          className={buttonClasses({ tone: 'accent', size: 'lg', block: true })}
        >
          + Nueva mira
        </Link>
      ) : null}
    </main>
  );
}
