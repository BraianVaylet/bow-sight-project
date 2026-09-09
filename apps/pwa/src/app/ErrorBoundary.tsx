import { Alert, Button } from '@bow-sight/ui';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * La ultima red.
 *
 * 🔴 Sin esto, cualquier error de render deja **la pantalla en blanco**: React
 * desmonta el arbol entero y no queda nada, ni siquiera un boton para recargar.
 * En la linea de tiro, entre dos tandas, una pantalla blanca es indistinguible
 * de un telefono colgado.
 *
 * No reemplaza al manejo de errores de cada pantalla: es lo que queda cuando ese
 * manejo fallo.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | undefined;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // `console.error` y no un logger: el logger de la app manda al servidor, y
    // si lo que se rompio es la app, mandar puede romperse tambien.
    console.error('error no manejado', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4">
        <Alert>Se rompio algo de nuestro lado. Tus marcas estan a salvo.</Alert>
        <Button tone="accent" size="lg" onClick={() => this.setState({ error: undefined })}>
          Volver a intentar
        </Button>
        <button
          type="button"
          className="text-ink-muted min-h-11 text-xs underline"
          onClick={() => location.reload()}
        >
          Recargar la app
        </button>
      </main>
    );
  }
}
