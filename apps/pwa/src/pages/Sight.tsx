import { ApiError } from '@bow-sight/client';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Ruler,
  Select,
  Spinner,
  textLinkClasses,
  type RulerMark,
} from '@bow-sight/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type ArrowSet, type Calculo, type Mark, type Sight as SightDoc } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

/** Cinco marcas es el minimo para que el modelo tenga forma (SIGHT_CALC_MIN_MARKS). */
const MINIMO = 5;

/**
 * La pantalla de la mira: **es el producto**.
 *
 * 🔴 Medido, calculado y consultado se ven distinto, siempre. Lo calculado va
 * punteado y con `≈`. Presentar una estimacion como una medicion seria mentir
 * sobre lo unico que nos diferencia (ADR-001).
 */
export function Sight() {
  const { id = '' } = useParams();
  const textOf = useErrorText();
  const queryClient = useQueryClient();

  const [arrowSetId, setArrowSetId] = useState('');
  const [distancia, setDistancia] = useState('');
  const [escalaCm, setEscalaCm] = useState('');
  const [consulta, setConsulta] = useState('');

  const sight = useQuery({
    queryKey: ['sight', id],
    queryFn: () => api.get<SightDoc>(`/sights/${id}`),
  });

  const sets = useQuery({
    queryKey: ['arrow-sets'],
    queryFn: () => api.get<ArrowSet[]>('/equipment/arrow-sets'),
  });

  // El set elegido, o el primero que tenga: no obligamos a elegir para empezar.
  const setActivo = arrowSetId || sets.data?.[0]?._id || '';

  const marks = useQuery({
    queryKey: ['marks', id, setActivo],
    queryFn: () => api.get<Mark[]>(`/sights/${id}/marks?arrowSetId=${setActivo}`),
    enabled: Boolean(setActivo),
  });

  const medidas = marks.data ?? [];
  const alcanzaParaCalcular = medidas.length >= MINIMO;

  /**
   * El calculo lo hace **el servidor**, no la pantalla.
   *
   * El mismo math corre en `@bow-sight/domain` y podria correr aca, pero el
   * servidor es la autoridad sobre lo que el arquero tiene cargado: calcularlo
   * en el cliente abriria la puerta a que la app y la hoja impresa digan cosas
   * distintas.
   */
  const calculo = useQuery({
    queryKey: ['calculo', id, setActivo, consulta],
    queryFn: () =>
      api.get<Calculo>(
        `/sights/${id}/marks/calculate?arrowSetId=${setActivo}&distanceM=${consulta}`,
      ),
    enabled: Boolean(setActivo && consulta && alcanzaParaCalcular),
  });

  const agregar = useMutation({
    mutationFn: () =>
      api.post<Mark>(`/sights/${id}/marks`, {
        id: crypto.randomUUID(),
        arrowSetId: setActivo,
        distanceM: Number(distancia),
        scaleValueMm: Math.round(Number(escalaCm) * 10),
      }),
    onSuccess: async () => {
      setDistancia('');
      setEscalaCm('');
      await queryClient.invalidateQueries({ queryKey: ['marks', id] });
      await queryClient.invalidateQueries({ queryKey: ['calculo', id] });
    },
  });

  const borrar = useMutation({
    mutationFn: (markId: string) => api.delete(`/sights/${id}/marks/${markId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['marks', id] });
      await queryClient.invalidateQueries({ queryKey: ['calculo', id] });
    },
  });

  if (sight.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Cargando la mira" />
      </main>
    );
  }

  if (sight.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4">
        <Alert code={sight.error instanceof ApiError ? sight.error.code : undefined}>
          {sight.error instanceof ApiError ? textOf(sight.error) : 'No pudimos cargar la mira.'}
        </Alert>
        <Link to="/" className={textLinkClasses()}>
          Volver a mis miras
        </Link>
      </main>
    );
  }

  const mira = sight.data;

  /**
   * Lo medido, lo calculado y lo consultado, cada uno con su variante.
   *
   * El `id` es solo la clave de React dentro del SVG: numera de corrido en el
   * orden en que se arma la lista, y no tiene nada que ver con el id de la marca
   * en la base.
   */
  let n = 0;
  const enLaRegla: RulerMark[] = [
    ...medidas.map((m) => ({
      id: n++,
      distanceM: m.distanceM,
      scaleValue: m.scaleValueMm,
      variant: 'measured' as const,
    })),
    ...(calculo.data?.computed ?? []).map((c) => ({
      id: n++,
      distanceM: c.distanceM,
      scaleValue: c.scaleValue,
      variant: 'computed' as const,
      estimated: !c.interpolated,
    })),
    ...(calculo.data
      ? [
          {
            id: n++,
            distanceM: calculo.data.distanceM,
            scaleValue: calculo.data.scaleValueMm,
            variant: 'query' as const,
            estimated: !calculo.data.interpolated,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-ink text-2xl font-semibold">{mira.name}</h1>
        <Link to="/" className={textLinkClasses({ className: 'text-sm' })}>
          Mis miras
        </Link>
      </header>

      {sets.data?.length === 0 ? (
        <Alert>
          Antes de anotar una marca necesitas un set de flechas.{' '}
          <Link to="/equipo" className="underline">
            Cargar uno
          </Link>
        </Alert>
      ) : null}

      {(sets.data?.length ?? 0) > 1 ? (
        <Field label="Set de flechas">
          {(aria) => (
            <Select {...aria} value={setActivo} onChange={(e) => setArrowSetId(e.target.value)}>
              {sets.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}

      <Card className="flex justify-center">
        <Ruler minMm={mira.scaleMinMm} maxMm={mira.scaleMaxMm} marks={enLaRegla} />
      </Card>

      <Card>
        <h2 className="text-ink font-medium">Calcular una distancia</h2>
        {alcanzaParaCalcular ? (
          <>
            <div className="mt-3 flex items-end gap-3">
              <Field label="Distancia (m)" className="flex-1">
                {(aria) => (
                  <Input
                    {...aria}
                    type="number"
                    inputMode="decimal"
                    value={consulta}
                    onChange={(e) => setConsulta(e.target.value)}
                  />
                )}
              </Field>
            </div>

            {calculo.data ? (
              <p className="text-ink mt-3 text-lg">
                <span className="tnum font-semibold">
                  {calculo.data.interpolated ? '' : '≈ '}
                  {(calculo.data.scaleValueMm / 10).toFixed(1)} cm
                </span>{' '}
                <span className="text-ink-secondary text-sm">
                  {calculo.data.interpolated
                    ? 'entre marcas tuyas'
                    : 'estimada fuera de lo que mediste'}
                </span>
              </p>
            ) : null}

            {calculo.error instanceof ApiError ? (
              <Alert code={calculo.error.code} className="mt-3">
                {textOf(calculo.error)}
              </Alert>
            ) : null}
          </>
        ) : (
          <p className="text-ink-secondary mt-2 text-sm">
            Te faltan {MINIMO - medidas.length} marca(s) para desbloquear el calculo. Con menos, una
            curva no significa nada.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-ink font-medium">Anotar una marca</h2>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (setActivo && distancia && escalaCm) agregar.mutate();
          }}
        >
          {agregar.error ? (
            <Alert code={agregar.error instanceof ApiError ? agregar.error.code : undefined}>
              {agregar.error instanceof ApiError
                ? textOf(agregar.error)
                : 'No pudimos guardar la marca.'}
            </Alert>
          ) : null}

          <div className="flex gap-3">
            <Field label="Distancia (m)" required className="flex-1">
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  value={distancia}
                  onChange={(e) => setDistancia(e.target.value)}
                />
              )}
            </Field>
            <Field label="Marca (cm)" required className="flex-1">
              {(aria) => (
                <Input
                  {...aria}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={escalaCm}
                  onChange={(e) => setEscalaCm(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Button
            type="submit"
            tone="accent"
            size="lg"
            block
            disabled={agregar.isPending || !setActivo || !distancia || !escalaCm}
          >
            {agregar.isPending ? 'Guardando…' : 'Anotar'}
          </Button>
        </form>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-ink font-medium">
          Marcas medidas <span className="text-ink-muted tnum">({medidas.length})</span>
        </h2>
        {marks.isPending && setActivo ? <Spinner label="Cargando las marcas" /> : null}
        <ul className="flex flex-col gap-2">
          {[...medidas]
            .sort((a, b) => a.distanceM - b.distanceM)
            .map((m) => (
              <li key={m._id}>
                <Card className="flex items-center justify-between gap-3">
                  <span className="tnum text-ink">
                    {m.distanceM} m → {(m.scaleValueMm / 10).toFixed(1)} cm
                  </span>
                  <Button
                    tone="ghost"
                    onClick={() => borrar.mutate(m._id)}
                    aria-label={`Borrar la marca de ${m.distanceM} metros`}
                  >
                    Borrar
                  </Button>
                </Card>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
