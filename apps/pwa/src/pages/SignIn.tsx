import { ApiError } from '@bow-sight/client';
import { Alert, Button, Card, Field, Input, textLinkClasses } from '@bow-sight/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textOf = useErrorText();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post('/auth/sign-in', { email, password });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e : null);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-ink text-2xl font-semibold">Entrar</h1>

      <Card>
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

          <Field label="Contraseña" required>
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          <Button type="submit" tone="accent" size="lg" block disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2 text-center text-sm">
        <Link to="/recuperar" className={textLinkClasses()}>
          ¿Olvidaste tu contraseña?
        </Link>
        <Link to="/crear-cuenta" className={textLinkClasses()}>
          Crear una cuenta
        </Link>
      </div>
    </main>
  );
}
