import { Spinner } from '@bow-sight/ui';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EmailVerified } from '../pages/EmailVerified.js';
import { ConfirmReset, RequestReset } from '../pages/ResetPassword.js';
import { Sights } from '../pages/Sights.js';
import { SignIn } from '../pages/SignIn.js';
import { SignUp } from '../pages/SignUp.js';
import { useMe } from './session.js';

/** Todo lo del arquero exige sesion; sin ella se va a entrar. */
function Privada({ children }: { children: React.ReactNode }) {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Cargando" />
      </div>
    );
  }
  return me ? <>{children}</> : <Navigate to="/entrar" replace />;
}

/** Con sesion abierta, entrar o registrarse no tiene sentido. */
function SoloPublica({ children }: { children: React.ReactNode }) {
  const { data: me, isPending } = useMe();
  if (isPending) return null;
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
