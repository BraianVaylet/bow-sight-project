import type { Locale } from '@bow-sight/types';
import type { MailMessage, MailTemplate } from './mailer.js';

/**
 * Los mails **si** llevan prosa: son texto, no una respuesta de API.
 *
 * Se renderizan en el idioma del usuario (ADR-005). Cuando exista
 * `@bow-sight/client` con i18next, esto pasa a leer de sus catalogos; hasta
 * entonces vive aca, con las dos versiones al lado para que no se desincronicen.
 */
type Copy = { subject: string; body: (params: Record<string, string>) => string };

const ES: Record<MailTemplate, Copy> = {
  verifyEmail: {
    subject: 'Confirma tu email — Bow Sight',
    body: (p) =>
      `Hola${p['name'] ? ` ${p['name']}` : ''},\n\n` +
      `Confirma tu email para empezar a cargar tus marcas:\n${p['url']}\n\n` +
      `El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este mail.`,
  },
  resetPassword: {
    subject: 'Cambiar tu contraseña — Bow Sight',
    body: (p) =>
      `Pediste cambiar tu contraseña.\n\n${p['url']}\n\n` +
      `El enlace vence en 1 hora y se puede usar una sola vez. ` +
      `Si no lo pediste, no hace falta que hagas nada: tu contraseña sigue igual.`,
  },
  emailChanged: {
    subject: 'Tu email cambio — Bow Sight',
    body: (p) =>
      `El email de tu cuenta paso a ser ${p['newEmail']}.\n\n` +
      `Si no fuiste vos, escribinos ahora: alguien tiene acceso a tu cuenta.`,
  },
  coachInvite: {
    subject: 'Te compartieron una mira — Bow Sight',
    body: (p) =>
      `${p['archer']} te comparte su mira "${p['sight']}" para que la veas.\n\n${p['url']}\n\n` +
      `Vas a poder verla, no editarla.`,
  },
  trialEnding: {
    subject: 'Tu prueba termina en unos dias — Bow Sight',
    body: (p) =>
      `Tu prueba de Pro termina en ${p['days']} dias.\n\n` +
      `Si no haces nada, tu cuenta pasa a Free y **no se borra nada**: ` +
      `lo que exceda el limite queda para leer e imprimir, no para editar.\n\n${p['url']}`,
  },
  paymentFailed: {
    subject: 'No pudimos cobrar tu suscripcion — Bow Sight',
    body: (p) =>
      `El cobro fallo. Tenes ${p['graceDays']} dias para actualizar el medio de pago ` +
      `antes de que la cuenta pase a Free.\n\n${p['url']}`,
  },
};

const EN: Record<MailTemplate, Copy> = {
  verifyEmail: {
    subject: 'Confirm your email — Bow Sight',
    body: (p) =>
      `Hi${p['name'] ? ` ${p['name']}` : ''},\n\n` +
      `Confirm your email to start logging your marks:\n${p['url']}\n\n` +
      `The link expires in 24 hours. If you didn't create this account, ignore this email.`,
  },
  resetPassword: {
    subject: 'Reset your password — Bow Sight',
    body: (p) =>
      `You asked to reset your password.\n\n${p['url']}\n\n` +
      `The link expires in 1 hour and works once. ` +
      `If you didn't ask for it, you don't need to do anything: your password is unchanged.`,
  },
  emailChanged: {
    subject: 'Your email changed — Bow Sight',
    body: (p) =>
      `Your account email is now ${p['newEmail']}.\n\n` +
      `If this wasn't you, contact us now: someone has access to your account.`,
  },
  coachInvite: {
    subject: 'An archer shared a sight with you — Bow Sight',
    body: (p) =>
      `${p['archer']} shared their sight "${p['sight']}" with you.\n\n${p['url']}\n\n` +
      `You can view it, not edit it.`,
  },
  trialEnding: {
    subject: 'Your trial ends in a few days — Bow Sight',
    body: (p) =>
      `Your Pro trial ends in ${p['days']} days.\n\n` +
      `If you do nothing, your account moves to Free and **nothing is deleted**: ` +
      `anything over the limit stays readable and printable, just not editable.\n\n${p['url']}`,
  },
  paymentFailed: {
    subject: "We couldn't charge your subscription — Bow Sight",
    body: (p) =>
      `The payment failed. You have ${p['graceDays']} days to update your payment method ` +
      `before the account moves to Free.\n\n${p['url']}`,
  },
};

const CATALOGS: Record<Locale, Record<MailTemplate, Copy>> = { es: ES, en: EN };

export function render(message: MailMessage): { subject: string; text: string } {
  const copy = CATALOGS[message.locale][message.template];
  return { subject: copy.subject, text: copy.body(message.params) };
}
