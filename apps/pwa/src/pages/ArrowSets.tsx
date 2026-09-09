import { ApiError } from '@bow-sight/client';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Spinner,
  textLinkClasses,
} from '@bow-sight/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ArrowSet } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

/**
 * Los sets de flechas.
 *
 * 🔴 Existe porque **una marca pertenece a un set**, no a la mira sola: las
 * mismas distancias con flechas mas pesadas dan otras marcas. Sin al menos un
 * set cargado no se puede anotar nada, asi que esta pantalla es parte del camino
 * minimo, no un extra de configuracion.
 */
export function ArrowSets() {
  const textOf = useErrorText();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['arrow-sets'],
    queryFn: () => api.get<ArrowSet[]>('/equipment/arrow-sets'),
  });

  const crear = useMutation({
    mutationFn: (name: string) =>
      api.post<ArrowSet>('/equipment/arrow-sets', { id: crypto.randomUUID(), name }),
    onSuccess: async () => {
      setNombre('');
      await queryClient.invalidateQueries({ queryKey: ['arrow-sets'] });
    },
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-ink text-2xl font-semibold">Mis flechas</h1>
        <Link to="/" className={textLinkClasses({ className: 'text-sm' })}>
          Mis miras
        </Link>
      </header>

      <p className="text-ink-secondary text-sm">
        Una marca es de un set de flechas, no de la mira sola: las mismas distancias con flechas mas
        pesadas dan otras marcas.
      </p>

      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) crear.mutate(nombre.trim());
          }}
        >
          {crear.error ? (
            <Alert code={crear.error instanceof ApiError ? crear.error.code : undefined}>
              {crear.error instanceof ApiError ? textOf(crear.error) : 'No pudimos guardarlo.'}
            </Alert>
          ) : null}

          <Field
            label="Nombre del set"
            required
            hint="Por ejemplo: X10 450, o “las de competencia”."
          >
            {(aria) => (
              <Input {...aria} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            )}
          </Field>

          <Button type="submit" tone="accent" size="lg" block disabled={crear.isPending}>
            {crear.isPending ? 'Guardando…' : 'Agregar set'}
          </Button>
        </form>
      </Card>

      {isPending ? <Spinner label="Cargando tus sets" /> : null}

      {isError ? (
        <Alert code={error instanceof ApiError ? error.code : undefined}>
          {error instanceof ApiError ? textOf(error) : 'No pudimos cargar tus sets.'}
        </Alert>
      ) : null}

      {data?.length === 0 ? (
        <EmptyState
          title="Todavia no tenes sets"
          description="Cargá el primero para poder anotar marcas."
        />
      ) : null}

      <ul className="flex flex-col gap-2">
        {data?.map((set) => (
          <li key={set._id}>
            <Card>
              <span className="text-ink font-medium">{set.name}</span>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
