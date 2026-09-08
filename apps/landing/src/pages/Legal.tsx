import { Card } from '@bow-sight/ui';

/**
 * Las paginas legales, con el contenido real pendiente para F5-B.
 *
 * 🔴 Dicen que estan pendientes en vez de traer un texto de plantilla. Un
 * termino copiado de otro producto es peor que ninguno: parece que aplica.
 */
function Pendiente({ titulo }: { titulo: string }) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-ink text-3xl font-semibold">{titulo}</h1>
      <Card dashed>
        <p className="text-ink-secondary text-sm">
          Todavía no está redactado. Se escribe antes de abrir el registro, junto con la descarga de
          datos y la baja de cuenta.
        </p>
      </Card>
    </section>
  );
}

export const Terminos = () => <Pendiente titulo="Términos de uso" />;
export const Privacidad = () => <Pendiente titulo="Privacidad" />;
