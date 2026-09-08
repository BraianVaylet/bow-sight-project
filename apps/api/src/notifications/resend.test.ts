import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleMailer, MemoryMailer } from './mailer.js';
import { ResendMailer } from './resend.js';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  return { lines, logger: pino({ level: 'info' }, stream) };
}

const MENSAJE = {
  to: 'braian@example.com',
  template: 'verifyEmail' as const,
  locale: 'es' as const,
  params: { url: 'https://bowsight.app/verify?token=secreto-de-un-solo-uso', name: 'Braian' },
};

describe('ResendMailer', () => {
  it('manda el asunto y el cuerpo ya renderizados en el idioma del usuario', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const { logger } = capture();

    await new ResendMailer({ apiKey: 're_x', from: 'Bow Sight <x@y>', logger, fetchImpl }).send(
      MENSAJE,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');

    const body = JSON.parse(String(init.body)) as { to: string[]; subject: string; text: string };
    expect(body.to).toEqual(['braian@example.com']);
    expect(body.subject).toContain('Confirma tu email');
    expect(body.text).toContain(MENSAJE.params.url);
  });

  it('lanza si el proveedor rechaza el envio: un mail que no sale es un incidente', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 422 }));
    const { logger } = capture();

    await expect(
      new ResendMailer({ apiKey: 're_x', from: 'x', logger, fetchImpl }).send(MENSAJE),
    ).rejects.toThrow('422');
  });

  it('🔴 no escribe el token ni el destinatario en los logs, ni al fallar', async () => {
    // Los params llevan el enlace con un token de un solo uso: es una credencial.
    const { lines, logger } = capture();
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }));

    await new ResendMailer({ apiKey: 're_x', from: 'x', logger, fetchImpl })
      .send(MENSAJE)
      .catch(() => undefined);

    const raw = JSON.stringify(lines);
    expect(raw).not.toContain('secreto-de-un-solo-uso');
    expect(raw).not.toContain('braian@example.com');
    expect(raw).not.toContain('re_x');
    // Pero si dice que fallo y para que plantilla.
    expect(raw).toContain('verifyEmail');
  });

  it('el exito se loguea sin el destinatario', async () => {
    const { lines, logger } = capture();
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));

    await new ResendMailer({ apiKey: 're_x', from: 'x', logger, fetchImpl }).send(MENSAJE);

    const raw = JSON.stringify(lines);
    expect(raw).toContain('mail enviado');
    expect(raw).not.toContain('braian@example.com');
  });
});

describe('MemoryMailer', () => {
  it('guarda lo enviado y encuentra el ultimo de una direccion', async () => {
    const mailer = new MemoryMailer();
    await mailer.send({ ...MENSAJE, template: 'verifyEmail' });
    await mailer.send({ ...MENSAJE, template: 'resetPassword' });
    await mailer.send({ ...MENSAJE, to: 'otro@example.com' });

    expect(mailer.sent).toHaveLength(3);
    expect(mailer.lastTo('braian@example.com')?.template).toBe('resetPassword');
    expect(mailer.lastTo('nadie@example.com')).toBeUndefined();

    mailer.clear();
    expect(mailer.sent).toHaveLength(0);
  });
});

describe('ConsoleMailer', () => {
  it('loguea el mail en vez de enviarlo, con enlace y todo', async () => {
    // Es de desarrollo: mostrar el enlace es exactamente para lo que sirve, y
    // por eso nunca se usa en un ambiente desplegado.
    const { lines, logger } = capture();
    await new ConsoleMailer(logger).send(MENSAJE);

    expect(JSON.stringify(lines)).toContain('secreto-de-un-solo-uso');
  });
});
