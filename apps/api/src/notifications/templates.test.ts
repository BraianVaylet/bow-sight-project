import { describe, expect, it } from 'vitest';
import type { MailTemplate } from './mailer.js';
import { render } from './templates.js';

const TEMPLATES: MailTemplate[] = [
  'verifyEmail',
  'resetPassword',
  'emailChanged',
  'coachInvite',
  'trialEnding',
  'paymentFailed',
];

const PARAMS: Record<string, string> = {
  url: 'https://bowsight.app/x?token=abc',
  name: 'Braian',
  newEmail: 'nuevo@example.com',
  archer: 'Braian',
  sight: 'Ultraview / Evo',
  days: '3',
  graceDays: '7',
};

describe('plantillas de mail', () => {
  it.each(TEMPLATES)('%s existe en los dos idiomas y no deja placeholders', (template) => {
    for (const locale of ['es', 'en'] as const) {
      const { subject, text } = render({ to: 'x@y.com', template, locale, params: PARAMS });

      expect(subject.length, `${template}/${locale} sin asunto`).toBeGreaterThan(0);
      expect(text.length).toBeGreaterThan(20);
      // Un `undefined` en el cuerpo de un mail es una falta de respeto.
      expect(text).not.toContain('undefined');
      expect(text).not.toMatch(/\$\{/);
    }
  });

  it('el asunto cambia con el idioma: no es el mismo texto en los dos', () => {
    for (const template of TEMPLATES) {
      const es = render({ to: 'x@y.com', template, locale: 'es', params: PARAMS });
      const en = render({ to: 'x@y.com', template, locale: 'en', params: PARAMS });
      expect(es.subject, `${template} tiene el mismo asunto en ambos idiomas`).not.toBe(en.subject);
    }
  });

  it('el enlace viaja en el cuerpo de los mails que lo necesitan', () => {
    for (const template of ['verifyEmail', 'resetPassword', 'coachInvite'] as const) {
      const { text } = render({ to: 'x@y.com', template, locale: 'es', params: PARAMS });
      expect(text).toContain(PARAMS['url']);
    }
  });

  it('el mail de verificacion saluda por nombre, y funciona sin nombre', () => {
    const con = render({
      to: 'x@y.com',
      template: 'verifyEmail',
      locale: 'es',
      params: { url: 'u', name: 'Braian' },
    });
    expect(con.text).toContain('Hola Braian');

    const sin = render({
      to: 'x@y.com',
      template: 'verifyEmail',
      locale: 'es',
      params: { url: 'u', name: '' },
    });
    expect(sin.text).toContain('Hola,');
  });

  it('🔴 el aviso de fin de prueba dice que no se borra nada', () => {
    // Es la promesa del producto: bajar de plan no borra, bloquea.
    const es = render({
      to: 'x@y.com',
      template: 'trialEnding',
      locale: 'es',
      params: { days: '3', url: 'u' },
    });
    expect(es.text).toMatch(/no se borra nada/i);

    const en = render({
      to: 'x@y.com',
      template: 'trialEnding',
      locale: 'en',
      params: { days: '3', url: 'u' },
    });
    expect(en.text).toMatch(/nothing is deleted/i);
  });

  it('🔴 el aviso de cambio de email le dice a la direccion vieja que reaccione', () => {
    const { text } = render({
      to: 'viejo@example.com',
      template: 'emailChanged',
      locale: 'es',
      params: { newEmail: 'nuevo@example.com' },
    });
    expect(text).toContain('nuevo@example.com');
    expect(text).toMatch(/si no fuiste vos/i);
  });
});
