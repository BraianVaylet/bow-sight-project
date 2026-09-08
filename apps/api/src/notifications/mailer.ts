import type { Locale } from '@bow-sight/types';
import type { Logger } from 'pino';

/** Las plantillas del MVP. Cada una se renderiza en el idioma del usuario. */
export type MailTemplate =
  | 'verifyEmail'
  | 'resetPassword'
  | 'emailChanged'
  | 'coachInvite'
  | 'trialEnding'
  | 'paymentFailed';

export interface MailMessage {
  to: string;
  template: MailTemplate;
  /** 🔴 El idioma sale del **usuario**, no del `Accept-Language` del pedido. */
  locale: Locale;
  params: Record<string, string>;
}

/**
 * Puerto de envio.
 *
 * Existe para que **ningun test toque la red** y para que cambiar de proveedor
 * sea reemplazar una implementacion, no buscar `fetch` por todo el codigo.
 */
export interface Mailer {
  send: (message: MailMessage) => Promise<void>;
}

/** Guarda lo enviado en memoria. Es el que usan los tests. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** Ultimo mail a esa direccion, para poder sacarle el token en un test. */
  lastTo(email: string): MailMessage | undefined {
    return [...this.sent].reverse().find((m) => m.to === email);
  }

  clear(): void {
    this.sent.length = 0;
  }
}

/** Loguea en vez de enviar. Es el de desarrollo local. */
export class ConsoleMailer implements Mailer {
  constructor(private readonly logger: Logger) {}

  async send(message: MailMessage): Promise<void> {
    // Los `params` llevan el enlace con el token: en dev es justo lo que se
    // necesita ver, y por eso este mailer nunca se usa en un ambiente desplegado.
    this.logger.info(
      { module: 'notifications', action: 'send', meta: { ...message } },
      'mail (no enviado: modo consola)',
    );
  }
}
