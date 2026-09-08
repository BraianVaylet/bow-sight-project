import { buttonClasses, Card } from '@bow-sight/ui';
import { Link, useSearchParams } from 'react-router-dom';

/**
 * A donde vuelve el arquero desde el mail de verificacion.
 *
 * 🔴 Existe porque el enlace del mail tiene que terminar en una **pantalla**, no
 * en la respuesta cruda de un endpoint.
 */
export function EmailVerified() {
  const [params] = useSearchParams();
  const ok = params.get('estado') === 'ok';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4 text-center">
      <Card className="flex flex-col items-center gap-3">
        <h1 className="text-ink text-xl font-semibold">
          {ok ? 'Email confirmado' : 'Ese enlace no sirve'}
        </h1>
        <p className="text-ink-secondary text-sm">
          {ok
            ? 'Ya podés usar tu cuenta en cualquier dispositivo.'
            : 'Puede que haya vencido o que ya lo hayas usado. Pedí uno nuevo desde tu perfil.'}
        </p>
        <Link to="/" className={buttonClasses({ tone: 'accent' })}>
          Ir a mis miras
        </Link>
      </Card>
    </main>
  );
}
