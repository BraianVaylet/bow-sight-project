import { Button } from '@bow-sight/ui';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Aviso de version nueva.
 *
 * 🔴 **Pregunta antes de recargar.** Una app que se actualiza sola mientras el
 * arquero escribe una marca entre dos tandas le hace perder lo que estaba
 * cargando — y en el campo de tiro no hay forma de recuperarlo.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Una PWA instalada puede pasar dias sin recargarse: se busca la version
      // nueva cada hora en vez de esperar a que alguien cierre la app.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  if (!hayVersionNueva) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="border-border-subtle bg-surface-1 mx-auto flex max-w-md items-center gap-3 rounded-xl border p-3 shadow-lg">
        <p className="text-ink flex-1 text-sm">Hay una versión nueva.</p>
        <Button tone="ghost" onClick={() => setHayVersionNueva(false)} aria-label="Ahora no">
          Ahora no
        </Button>
        <Button tone="accent" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </Button>
      </div>
    </div>
  );
}
