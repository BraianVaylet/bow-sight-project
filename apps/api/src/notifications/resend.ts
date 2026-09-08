import type { Logger } from 'pino';
import type { Mailer, MailMessage } from './mailer.js';
import { render } from './templates.js';

export interface ResendConfig {
  apiKey: string;
  from: string;
  logger: Logger;
  /** Inyectable para poder probar sin red. */
  fetchImpl?: typeof fetch;
}

/**
 * Envio por Resend, con `fetch` a secas: no justifica una dependencia mas.
 *
 * 🔴 No loguea el cuerpo del mail: los `params` llevan el enlace con el token de
 * verificacion o de reset, que es una credencial de un solo uso.
 */
export class ResendMailer implements Mailer {
  constructor(private readonly config: ResendConfig) {}

  async send(message: MailMessage): Promise<void> {
    const { subject, text } = render(message);
    const send = this.config.fetchImpl ?? fetch;

    const res = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.config.from, to: [message.to], subject, text }),
    });

    if (!res.ok) {
      // Se registra que fallo y para que plantilla, nunca el destinatario ni el
      // cuerpo. Un mail que no sale es un incidente, no un error del usuario.
      this.config.logger.error(
        {
          module: 'notifications',
          action: 'send',
          meta: { template: message.template, status: res.status },
        },
        'resend rechazo el envio',
      );
      throw new Error(`Resend respondio ${res.status}`);
    }

    this.config.logger.info(
      { module: 'notifications', action: 'send', meta: { template: message.template } },
      'mail enviado',
    );
  }
}
