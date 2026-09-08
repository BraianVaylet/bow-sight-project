import { ApiError } from './errors.js';

export interface ApiClientOptions {
  baseUrl: string;
  /** Inyectable para poder probar sin red y sin MSW cuando alcanza. */
  fetchImpl?: typeof fetch;
}

/**
 * Cliente de la API.
 *
 * `credentials: 'include'` porque la sesion viaja en cookie httpOnly: el token
 * nunca pasa por JavaScript, asi que un XSS no se lo puede llevar.
 */
export function createApiClient({ baseUrl, fetchImpl }: ApiClientOptions) {
  const send = fetchImpl ?? fetch;

  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    let res: Response;
    try {
      res = await send(`${baseUrl}${path}`, {
        method,
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          // La clave de idempotencia viaja en toda mutacion sincronizable: es
          // lo que hace que reconectar y reintentar no cree dos veces la misma
          // marca (ADR-006).
          ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
    } catch {
      throw ApiError.network();
    }

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => undefined);
    if (!res.ok) throw ApiError.fromBody(res.status, body);
    return body as T;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
      request<T>('POST', path, { body, ...(idempotencyKey ? { idempotencyKey } : {}) }),
    patch: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
      request<T>('PATCH', path, { body, ...(idempotencyKey ? { idempotencyKey } : {}) }),
    delete: <T>(path: string, idempotencyKey?: string) =>
      request<T>('DELETE', path, idempotencyKey ? { idempotencyKey } : {}),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
