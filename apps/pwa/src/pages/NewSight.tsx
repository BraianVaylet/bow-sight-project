import { ApiError } from '@bow-sight/client';
import { Alert, Button, Card, Field, Input, textLinkClasses } from '@bow-sight/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Sight } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

/**
 * Crear una mira.
 *
 * 🔴 El arquero escribe la escala en **centimetros**, que es como esta impresa
 * en su mira; se guarda en milimetros. La conversion ocurre aca, en el borde, y
 * nunca se manda a la API un valor ya convertido (regla 6).
 */
export function NewSight() {
  const [name, setName] = useState('');
  const [minCm, setMinCm] = useState('0');
  const [maxCm, setMaxCm] = useState('60');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textOf = useErrorText();

  const crear = useMutation({
    mutationFn: () =>
      api.post<Sight>('/sights', {
        id: crypto.randomUUID(),
        name: name.trim(),
        scaleMinMm: Math.round(Number(minCm) * 10),
        scaleMaxMm: Math.round(Number(maxCm) * 10),
        scaleUnit: 'cm',
      }),
    onSuccess: async (sight) => {
      await queryClient.invalidateQueries({ queryKey: ['sights'] });
      navigate(`/miras/${sight._id}`, { replace: true });
    },
  });

  const rangoInvalido = Number(minCm) >= Number(maxCm);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-ink text-2xl font-semibold">Nueva mira</h1>
        <Link to="/" className={textLinkClasses({ className: 'text-sm' })}>
          Cancelar
        </Link>
      </header>

      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rangoInvalido && name.trim()) crear.mutate();
          }}
        >
          {crear.error ? (
            <Alert code={crear.error instanceof ApiError ? crear.error.code : undefined}>
              {crear.error instanceof ApiError ? textOf(crear.error) : 'No pudimos guardarla.'}
            </Alert>
          ) : null}

          <Field label="Nombre" required hint="Por ejemplo: Shibuya Ultima, o “la del arco azul”.">
            {(aria) => <Input {...aria} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>

          <div className="flex gap-3">
            <Field label="Escala desde (cm)" required className="flex-1">
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={minCm}
                  onChange={(e) => setMinCm(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="hasta (cm)"
              required
              className="flex-1"
              {...(rangoInvalido ? { error: 'El maximo tiene que ser mayor que el minimo.' } : {})}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={maxCm}
                  onChange={(e) => setMaxCm(e.target.value)}
                />
              )}
            </Field>
          </div>

          <p className="text-ink-muted text-sm">
            Es el recorrido que tiene el cursor de tu mira, como esta impreso en ella.
          </p>

          <Button
            type="submit"
            tone="accent"
            size="lg"
            block
            disabled={crear.isPending || rangoInvalido || !name.trim()}
          >
            {crear.isPending ? 'Creando…' : 'Crear mira'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
