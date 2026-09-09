import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sight } from './Sight.js';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();

vi.mock('../app/api.js', () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

const MIRA = { _id: 's1', name: 'Shibuya', scaleMinMm: 0, scaleMaxMm: 600, scaleUnit: 'cm' };
const SET = { _id: 'a1', name: 'X10 450' };

/** Las cinco del autor, en milimetros como las guarda la API. */
const CINCO = [
  { _id: 'm1', arrowSetId: 'a1', distanceM: 20, scaleValueMm: 41 },
  { _id: 'm2', arrowSetId: 'a1', distanceM: 30, scaleValueMm: 120 },
  { _id: 'm3', arrowSetId: 'a1', distanceM: 40, scaleValueMm: 210 },
  { _id: 'm4', arrowSetId: 'a1', distanceM: 50, scaleValueMm: 320 },
  { _id: 'm5', arrowSetId: 'a1', distanceM: 60, scaleValueMm: 450 },
];

function responder(overrides: { marks?: unknown[]; sets?: unknown[]; calculo?: unknown } = {}) {
  get.mockImplementation((path: string) => {
    if (path === '/sights/s1') return Promise.resolve(MIRA);
    if (path === '/equipment/arrow-sets') return Promise.resolve(overrides.sets ?? [SET]);
    if (path.includes('/calculate')) return Promise.resolve(overrides.calculo ?? null);
    if (path.includes('/marks')) return Promise.resolve(overrides.marks ?? []);
    return Promise.resolve(null);
  });
}

function pintar() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/miras/s1']}>
        <Routes>
          <Route path="/miras/:id" element={<Sight />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('la pantalla de la mira', () => {
  it('🔴 muestra las marcas en la unidad del arquero, no en el canonico', async () => {
    // Adentro todo es milimetros; el arquero lee centimetros en su mira.
    responder({ marks: CINCO });
    pintar();

    expect(await screen.findByText('30 m → 12.0 cm')).toBeInTheDocument();
    expect(screen.getByText('20 m → 4.1 cm')).toBeInTheDocument();
  });

  it('🔴 con menos de cinco marcas dice cuantas faltan, y no calcula', async () => {
    // Una curva sobre tres puntos no significa nada, y ofrecerla seria vender
    // una precision que no existe.
    responder({ marks: CINCO.slice(0, 3) });
    pintar();

    expect(await screen.findByText(/te faltan 2 marca/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Distancia (m)')).not.toBeInTheDocument();
  });

  it('con cinco, la calculadora aparece', async () => {
    responder({ marks: CINCO });
    pintar();

    await screen.findByText('30 m → 12.0 cm');
    expect(screen.queryByText(/te faltan/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Distancia (m)').length).toBeGreaterThan(0);
  });

  it('🔴 lo interpolado y lo estimado se dicen distinto', async () => {
    // Presentar una estimacion como una medicion seria mentir sobre lo unico
    // que nos diferencia (ADR-001).
    responder({
      marks: CINCO,
      calculo: {
        distanceM: 37,
        horizontalDistanceM: 37,
        scaleValueMm: 181,
        interpolated: true,
        withinScale: true,
        fitQuality: 2.3,
        computed: [],
      },
    });
    pintar();

    await screen.findByText('30 m → 12.0 cm');
    await userEvent.type(screen.getAllByLabelText('Distancia (m)')[0]!, '37');

    expect(await screen.findByText(/entre marcas tuyas/i)).toBeInTheDocument();
    expect(screen.getByText(/18\.1 cm/)).toBeInTheDocument();
  });

  it('fuera del rango medido lo marca como estimado', async () => {
    responder({
      marks: CINCO,
      calculo: {
        distanceM: 70,
        horizontalDistanceM: 70,
        scaleValueMm: 600,
        interpolated: false,
        withinScale: true,
        fitQuality: 2.3,
        computed: [],
      },
    });
    pintar();

    await screen.findByText('30 m → 12.0 cm');
    await userEvent.type(screen.getAllByLabelText('Distancia (m)')[0]!, '70');

    // El `≈` tambien aparece en la regla, asi que se busca el del resultado.
    const resultado = await screen.findByText(/estimada fuera de lo que mediste/i);
    expect(resultado.parentElement?.textContent).toMatch(/≈/);
  });

  it('🔴 sin sets de flechas lo dice y no deja anotar', async () => {
    // Una marca pertenece a un set. Dejar escribir dos numeros para fallar
    // despues seria hacerle perder el tiempo en la linea de tiro.
    responder({ sets: [] });
    pintar();

    expect(await screen.findByText(/necesitas un set de flechas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anotar' })).toBeDisabled();
  });

  it('anotar manda la marca en milimetros', async () => {
    responder({ marks: CINCO });
    post.mockResolvedValue({});
    pintar();

    await screen.findByText('30 m → 12.0 cm');
    // Hay dos campos "Distancia (m)": el de la calculadora y el de anotar. El
    // segundo es el del formulario.
    await userEvent.type(screen.getAllByLabelText(/Distancia \(m\)/)[1]!, '25');
    await userEvent.type(screen.getByLabelText(/marca \(cm\)/i), '7.9');
    await userEvent.click(screen.getByRole('button', { name: 'Anotar' }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/sights/s1/marks',
        expect.objectContaining({ arrowSetId: 'a1', distanceM: 25, scaleValueMm: 79 }),
      );
    });
  });

  it('borrar una marca la pide por su id', async () => {
    responder({ marks: CINCO });
    del.mockResolvedValue(undefined);
    pintar();

    await screen.findByText('30 m → 12.0 cm');
    await userEvent.click(screen.getByRole('button', { name: /borrar la marca de 30 metros/i }));

    await waitFor(() => expect(del).toHaveBeenCalledWith('/sights/s1/marks/m2'));
  });

  it('una mira que no existe lo dice y ofrece volver', async () => {
    get.mockImplementation(() => Promise.reject(new Error('404')));
    pintar();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a mis miras/i })).toBeInTheDocument();
  });
});
