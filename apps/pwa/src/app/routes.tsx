import { ApiError } from '@bow-sight/client';
import { Alert, Button, Spinner } from '@bow-sight/ui';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EmailVerified } from '../pages/EmailVerified.js';
import { ConfirmReset, RequestReset } from '../pages/ResetPassword.js';
import { ArrowSets } from '../pages/ArrowSets.js';
import { NewSight } from '../pages/NewSight.js';
import { Sight } from '../pages/Sight.js';
import { Sights } from '../pages/Sights.js';
import { SignIn } from '../pages/SignIn.js';
import { SignUp } from '../pages/SignUp.js';
import { useMe } from './session.js';

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4">
      {children}
    </main>
  );
}

/**
 * No pudimos preguntar quien sos.
 *
 * 🔴 Es distinto de "no hay sesion", y por eso **no** manda a entrar. Mandarlo a
 * entrar le diria al arquero que se deslogueo cuando lo unico que pasa es que el
 * servidor no contesta: perderia el lugar donde estaba y probaria una contraseña
 * que ya era correcta.
 */
function SesionIndeterminada({ error, reintentar }: { error: unknown; reintentar: () => void }) {
  const sinRed = error instanceof ApiError && error.status === 0;

  return (
    <Centrado>
      <Alert code={error instanceof ApiError ? error.code : undefined}>
        {sinRed
          ? 'Sin conexion. No pudimos verificar tu sesion.'
          : 'No pudimos verificar tu sesion. El problema es nuestro, no tuyo.'}
      </Alert>
      <Button tone="accent" size="lg" onClick={reintentar}>
        Reintentar
      </Button>
    </Centrado>
  );
}

/** Todo lo del arquero exige sesion; sin ella se va a entrar. */
function Privada({ children }: { children: React.ReactNode }) {
  const { data: me, isPending, isError, error, refetch } = useMe();

  if (isPending) {
    return (
      <Centrado>
        <Spinner label="Cargando" />
      </Centrado>
    );
  }
  if (isError) return <SesionIndeterminada error={error} reintentar={() => void refetch()} />;

  return me ? <>{children}</> : <Navigate to="/entrar" replace />;
}

/**
 * Con sesion abierta, entrar o registrarse no tiene sentido.
 *
 * 🔴 Mientras se averigua se muestra el spinner, **no `null`**. Con `null`, y
 * mientras el cliente reintenta un 5xx, el arquero se queda mirando una pantalla
 * en blanco sin saber si la app se colgo o si el es el problema.
 *
 * Si la consulta falla, se muestra el formulario igual: es una pantalla publica,
 * y bloquear el login porque no pudimos preguntar si ya habia sesion seria
 * dejarlo afuera por un problema nuestro.
 */
function SoloPublica({ children }: { children: React.ReactNode }) {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return (
      <Centrado>
        <Spinner label="Cargando" />
      </Centrado>
    );
  }
  return me ? <Navigate to="/" replace /> : <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/entrar"
        element={
          <SoloPublica>
            <SignIn />
          </SoloPublica>
        }
      />
      <Route
        path="/crear-cuenta"
        element={
          <SoloPublica>
            <SignUp />
          </SoloPublica>
        }
      />
      <Route path="/recuperar" element={<RequestReset />} />
      <Route path="/restablecer" element={<ConfirmReset />} />
      {/* Publica: se llega desde el mail, sin sesion necesariamente. */}
      <Route path="/email-verificado" element={<EmailVerified />} />

      <Route
        path="/"
        element={
          <Privada>
            <Sights />
          </Privada>
        }
      />
      {/* 🔴 `/miras/nueva` va **antes** que `/miras/:id`: al reves, "nueva" se
          leeria como un id y la pantalla pediria una mira que no existe. */}
      <Route
        path="/miras/nueva"
        element={
          <Privada>
            <NewSight />
          </Privada>
        }
      />
      <Route
        path="/miras/:id"
        element={
          <Privada>
            <Sight />
          </Privada>
        }
      />
      <Route
        path="/equipo"
        element={
          <Privada>
            <ArrowSets />
          </Privada>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
