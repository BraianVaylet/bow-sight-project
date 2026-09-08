import { ApiError } from '@bow-sight/client';
import { Alert, Button, Card, Field, Input } from '@bow-sight/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../app/api.js';
import { useErrorText } from '../app/errorText.js';

export function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<ApiError | null>(null);
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textOf = useErrorText();

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post('/auth/sign-up', { ...form, locale: 'es' });
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
      <div>
        <h1 className="text-ink text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-ink-secondary mt-1 text-sm">Tus marcas, en tu bolsillo. Sin papelito.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? <Alert code={error.code}>{textOf(error)}</Alert> : null}

          <Field label="Nombre" required>
            {(aria) => (
              <Input {...aria} autoComplete="name" value={form.name} onChange={set('name')} />
            )}
          </Field>

          <Field label="Email" required>
            {(aria) => (
              <Input
                {...aria}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
              />
            )}
          </Field>

          <Field
            label="Contraseña"
            required
            hint="Al menos 12 caracteres. Una frase que recuerdes sirve más que un jeroglífico."
          >
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
              />
            )}
          </Field>

          <Button type="submit" tone="accent" size="lg" block disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
      </Card>

      <Link to="/entrar" className="text-ink-secondary text-center text-sm underline">
        Ya tengo cuenta
      </Link>
    </main>
  );
}
