/**
 * Indices de la spec §5.4.3.
 *
 * 🔴 **El `userId` va PRIMERO en todo indice compuesto** (ADR-000). No es
 * cosmetica: es lo que hace que una consulta acotada por usuario use el indice
 * en vez de recorrer la coleccion entera, y lo que evita que una consulta a la
 * que se le olvido el filtro sea igual de barata que una correcta.
 */

/** Solo cuenta lo que no esta borrado: el soft delete no debe reservar el nombre. */
const VIVOS = { deletedAt: null };

module.exports = {
  async up(db) {
    // ── Identidad ──────────────────────────────────────────────────────
    // Case-insensitive: `Braian@x.com` y `braian@x.com` son la misma persona.
    await db
      .collection('user')
      .createIndex(
        { email: 1 },
        { unique: true, name: 'user_email_unique', collation: { locale: 'en', strength: 2 } },
      );

    // ── Equipo ─────────────────────────────────────────────────────────
    await db
      .collection('bowSetup')
      .createIndex(
        { userId: 1, name: 1 },
        { unique: true, name: 'bowsetup_user_name_unique', partialFilterExpression: VIVOS },
      );
    await db
      .collection('arrowSet')
      .createIndex(
        { userId: 1, name: 1 },
        { unique: true, name: 'arrowset_user_name_unique', partialFilterExpression: VIVOS },
      );

    // ── Miras y marcas ─────────────────────────────────────────────────
    await db
      .collection('sight')
      .createIndex({ userId: 1, status: 1, updatedAt: -1 }, { name: 'sight_user_status_updated' });

    // Una distancia por set en cada mira. Parcial sobre las vivas: borrar una
    // marca tiene que liberar esa distancia, o el arquero no puede recargarla.
    await db.collection('mark').createIndex(
      { userId: 1, sightId: 1, arrowSetId: 1, distanceM: 1 },
      {
        unique: true,
        name: 'mark_user_sight_arrowset_distance_unique',
        partialFilterExpression: VIVOS,
      },
    );

    // ── Compartir ──────────────────────────────────────────────────────
    await db
      .collection('share')
      .createIndex({ sightId: 1, coachUserId: 1, status: 1 }, { name: 'share_sight_coach_status' });
    await db
      .collection('share')
      .createIndex({ coachUserId: 1, status: 1 }, { name: 'share_coach_status' });

    // ── Plataforma ─────────────────────────────────────────────────────
    // Una sola suscripcion viva por usuario. Las canceladas quedan como historia.
    await db.collection('subscription').createIndex(
      { userId: 1 },
      {
        unique: true,
        name: 'subscription_user_active_unique',
        partialFilterExpression: { status: { $in: ['trialing', 'active', 'past_due'] } },
      },
    );

    // Este indice **es** el store de idempotencia de los webhooks: el mismo
    // evento tres veces produce un solo efecto porque el segundo choca aca.
    await db
      .collection('billingEvent')
      .createIndex(
        { provider: 1, eventId: 1 },
        { unique: true, name: 'billingevent_provider_event_unique' },
      );

    await db
      .collection('idempotencyKey')
      .createIndex({ key: 1 }, { unique: true, name: 'idempotency_key_unique' });
    // TTL: las claves se limpian solas a las 24 h.
    await db
      .collection('idempotencyKey')
      .createIndex({ createdAt: 1 }, { name: 'idempotency_ttl', expireAfterSeconds: 60 * 60 * 24 });

    await db
      .collection('lead')
      .createIndex({ email: 1, createdAt: -1 }, { name: 'lead_email_created' });
    await db
      .collection('jobRun')
      .createIndex({ name: 1, startedAt: -1 }, { name: 'jobrun_name_started' });
  },

  async down(db) {
    const porColeccion = {
      user: ['user_email_unique'],
      bowSetup: ['bowsetup_user_name_unique'],
      arrowSet: ['arrowset_user_name_unique'],
      sight: ['sight_user_status_updated'],
      mark: ['mark_user_sight_arrowset_distance_unique'],
      share: ['share_sight_coach_status', 'share_coach_status'],
      subscription: ['subscription_user_active_unique'],
      billingEvent: ['billingevent_provider_event_unique'],
      idempotencyKey: ['idempotency_key_unique', 'idempotency_ttl'],
      lead: ['lead_email_created'],
      jobRun: ['jobrun_name_started'],
    };

    for (const [coleccion, indices] of Object.entries(porColeccion)) {
      for (const indice of indices) {
        // Bajar tiene que ser idempotente: puede correrse sobre una base que
        // nunca subio del todo.
        await db
          .collection(coleccion)
          .dropIndex(indice)
          .catch(() => {});
      }
    }
  },
};
