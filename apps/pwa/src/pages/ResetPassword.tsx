import { ApiError } from '@bow-sight/client';
import { Alert, Button, Card, Field, Input, buttonClasses, textLinkClasses } from '@bow-sight/ui';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

/** Pedir el enlace. Siempre responde igual, exista o no la cuenta. */
export function RequestReset() {
  const [email, setEmail] = useState('');
  const [listo, setListo] = useState(false);
  const textOf = useErrorText();
  const [error, setError] = useState<ApiError | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.post('/auth/password-reset/request', { email });
      setListo(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-ink text-2xl font-semibold">Recuperar la contraseña</h1>

      <Card>
        {listo ? (
          // 🔴 El mismo mensaje exista o no la cuenta: decir "ese email no
          // existe" convertiria esta pantalla en un buscador de cuentas.
          <p className="text-ink-secondary text-sm">
            Si hay una cuenta con ese email, le mandamos un enlace. Revisá tu correo.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error ? <Alert code={error.code}>{textOf(error)}</Alert> : null}
            <Field label="Email" required>
              {(aria) => (
                <Input
                  {...aria}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" tone="accent" size="lg" block>
              Mandarme el enlace
            </Button>
          </form>
        )}
      </Card>

      <Link to="/entrar" className={textLinkClasses({ className: 'self-center text-sm' })}>
        Volver
      </Link>
    </main>
  );
}

/** Escribir la clave nueva. El token viene en la URL del mail. */
export function ConfirmReset() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [listo, setListo] = useState(false);
  const textOf = useErrorText();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: password });
      setListo(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-ink text-2xl font-semibold">Nueva contraseña</h1>

      <Card>
        {listo ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-ink-secondary text-sm">
              Listo. Cerramos las sesiones abiertas en otros dispositivos, así que entrá de nuevo.
            </p>
            <Link to="/entrar" className={buttonClasses({ tone: 'accent' })}>
              Entrar
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error ? <Alert code={error.code}>{textOf(error)}</Alert> : null}
            <Field label="Contraseña nueva" required hint="Al menos 12 caracteres.">
              {(aria) => (
                <Input
                  {...aria}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" tone="accent" size="lg" block disabled={!token}>
              Cambiar la contraseña
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
