/**
 * Migracion de una sola vez: las filas de `bv-bow-sight` (SQLite) a MongoDB.
 *
 * 🔴 **No migra usuarios ni sesiones.** El hash de la app vieja es argon2id
 * sobre un alias; Better Auth usa su propio esquema sobre un email. Reimplementar
 * esa traduccion seria escribir criptografia para un solo usuario. En cambio, el
 * arquero **se crea la cuenta por el camino normal** y este script mete sus datos
 * abajo de ese `userId`, que es lo unico que importa (ADR-000).
 *
 * Uso:
 *   pnpm exec tsx scripts/import-sqlite.ts \
 *     --db ./copia.db --email braian@example.com [--alias braian] [--dry-run]
 *
 * 🔴 Correr **sobre una copia** del `.db`. El script no escribe en SQLite, pero
 * una migracion que se prueba sobre el original es una que no se puede repetir.
 */
import Database from 'better-sqlite3';
import { MongoClient, type Db } from 'mongodb';

export interface Args {
  db: string;
  email: string;
  alias?: string;
  uri: string;
  dbName: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): Args {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };

  const db = get('db');
  const email = get('email');
  if (!db || !email) {
    throw new Error('faltan --db y --email. Ver el encabezado de este archivo.');
  }

  const args: Args = {
    db,
    email,
    uri: get('uri') ?? process.env['MONGODB_URI'] ?? '',
    dbName: get('db-name') ?? process.env['MONGODB_DB_NAME'] ?? '',
    dryRun: argv.includes('--dry-run'),
  };
  const alias = get('alias');
  if (alias !== undefined) args.alias = alias;

  if (!args.uri || !args.dbName) throw new Error('faltan MONGODB_URI y MONGODB_DB_NAME');
  return args;
}

/** Fila de SQLite: epoch en segundos. Mongo guarda `Date`. */
function fecha(epochSegundos: number): Date {
  // `new Date` esta permitido aca: este script es un traductor de persistencia
  // y corre una sola vez, fuera del proceso de la API.
  return new Date(epochSegundos * 1000);
}

/**
 * 🔴 Centimetros a milimetros.
 *
 * La app vieja guardaba la escala en centimetros; el canonico nuevo es
 * milimetros (regla 6). El `Math.round` es a proposito: `4.1 * 10` en punto
 * flotante da `41.00000000000001`, y esa basura despues aparece en la regla.
 */
export function cmAMm(cm: number): number {
  return Math.round(cm * 10);
}

export interface FilasOrigen {
  bowSetups: { id: number; name: string; notes: string; created_at: number; updated_at: number }[];
  arrowSetups: {
    id: number;
    name: string;
    notes: string;
    created_at: number;
    updated_at: number;
  }[];
  sightConfigs: {
    id: number;
    name: string;
    bow_setup_id: number | null;
    default_arrow_setup_id: number | null;
    scale_min: number;
    scale_max: number;
    created_at: number;
    updated_at: number;
  }[];
  distances: {
    id: number;
    sight_config_id: number;
    arrow_setup_id: number;
    scale_value: number;
    distance_m: number;
    notes: string | null;
    created_at: number;
    updated_at: number;
  }[];
}

export interface Documentos {
  bowSetup: Record<string, unknown>[];
  arrowSet: Record<string, unknown>[];
  sight: Record<string, unknown>[];
  mark: Record<string, unknown>[];
}

/**
 * La traduccion, **pura**: filas adentro, documentos afuera.
 *
 * Separada de la base para poder probarla sin levantar nada, que es lo unico
 * que hace verificable una migracion que se corre una sola vez.
 */
export function traducir(filas: FilasOrigen, userId: string, nuevoId: () => string): Documentos {
  const idBow = new Map<number, string>();
  const idArrow = new Map<number, string>();
  const idSight = new Map<number, string>();

  const base = (fila: { created_at: number; updated_at: number }) => ({
    userId,
    createdAt: fecha(fila.created_at),
    updatedAt: fecha(fila.updated_at),
    deletedAt: null,
  });

  const bowSetup = filas.bowSetups.map((fila) => {
    const _id = nuevoId();
    idBow.set(fila.id, _id);
    return { _id, ...base(fila), name: fila.name, ...(fila.notes ? { notes: fila.notes } : {}) };
  });

  const arrowSet = filas.arrowSetups.map((fila) => {
    const _id = nuevoId();
    idArrow.set(fila.id, _id);
    return { _id, ...base(fila), name: fila.name, ...(fila.notes ? { notes: fila.notes } : {}) };
  });

  const sight = filas.sightConfigs.map((fila) => {
    const _id = nuevoId();
    idSight.set(fila.id, _id);
    return {
      _id,
      ...base(fila),
      name: fila.name,
      scaleMinMm: cmAMm(fila.scale_min),
      scaleMaxMm: cmAMm(fila.scale_max),
      // La app vieja era solo centimetros. Se deja explicito, no por defecto.
      scaleUnit: 'cm',
      clickSizeMm: null,
      distanceUnit: null,
      bowSetupId: fila.bow_setup_id === null ? null : (idBow.get(fila.bow_setup_id) ?? null),
      defaultArrowSetId:
        fila.default_arrow_setup_id === null
          ? null
          : (idArrow.get(fila.default_arrow_setup_id) ?? null),
      status: 'active',
    };
  });

  const mark = filas.distances.map((fila) => {
    const sightId = idSight.get(fila.sight_config_id);
    const arrowSetId = idArrow.get(fila.arrow_setup_id);
    if (!sightId || !arrowSetId) {
      throw new Error(
        `la distancia ${fila.id} apunta a una mira o un set que no se migro: ` +
          `sight_config_id=${fila.sight_config_id} arrow_setup_id=${fila.arrow_setup_id}`,
      );
    }
    return {
      _id: nuevoId(),
      ...base(fila),
      sightId,
      arrowSetId,
      distanceM: fila.distance_m,
      scaleValueMm: cmAMm(fila.scale_value),
      // 🔴 Todo lo que hay en la base vieja lo tiro el arquero. Nada es estimado.
      origin: 'measured',
      ...(fila.notes ? { notes: fila.notes } : {}),
    };
  });

  return { bowSetup, arrowSet, sight, mark };
}

export function leerSqlite(ruta: string, alias?: string): FilasOrigen {
  const sqlite = new Database(ruta, { readonly: true });
  try {
    const usuarios = sqlite.prepare('SELECT id, alias FROM users ORDER BY id').all() as {
      id: number;
      alias: string;
    }[];

    if (usuarios.length === 0) throw new Error('la base de origen no tiene usuarios');

    const usuario = alias
      ? usuarios.find((u) => u.alias.toLowerCase() === alias.toLowerCase())
      : usuarios[0];

    if (!usuario) throw new Error(`no hay un usuario con alias "${alias}"`);
    if (!alias && usuarios.length > 1) {
      throw new Error(
        `la base tiene ${usuarios.length} usuarios (${usuarios
          .map((u) => u.alias)
          .join(', ')}): pasá --alias para elegir cual migrar`,
      );
    }

    const de = <T>(sql: string): T[] => sqlite.prepare(sql).all(usuario.id) as T[];

    return {
      bowSetups: de('SELECT * FROM bow_setups WHERE user_id = ? ORDER BY id'),
      arrowSetups: de('SELECT * FROM arrow_setups WHERE user_id = ? ORDER BY id'),
      sightConfigs: de('SELECT * FROM sight_configs WHERE user_id = ? ORDER BY id'),
      distances: de(
        `SELECT d.* FROM distances d
           JOIN sight_configs s ON s.id = d.sight_config_id
          WHERE s.user_id = ? ORDER BY d.id`,
      ),
    };
  } finally {
    sqlite.close();
  }
}

/** El `userId` de Better Auth para ese email. Y lo deja verificado. */
export async function cuentaDestino(db: Db, email: string, dryRun: boolean): Promise<string> {
  const user = await db.collection('user').findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error(
      `no hay una cuenta con el email ${email}. Creala primero desde la app: ` +
        'este script no crea usuarios ni contraseñas.',
    );
  }
  if (!dryRun && user['emailVerified'] !== true) {
    await db.collection('user').updateOne({ _id: user._id }, { $set: { emailVerified: true } });
  }
  return String(user._id);
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const filas = leerSqlite(args.db, args.alias);

  const client = new MongoClient(args.uri);
  await client.connect();

  try {
    const db = client.db(args.dbName);
    const userId = await cuentaDestino(db, args.email, args.dryRun);
    const docs = traducir(filas, userId, () => crypto.randomUUID());

    const plan: [keyof Documentos, number, number][] = [
      ['bowSetup', filas.bowSetups.length, docs.bowSetup.length],
      ['arrowSet', filas.arrowSetups.length, docs.arrowSet.length],
      ['sight', filas.sightConfigs.length, docs.sight.length],
      ['mark', filas.distances.length, docs.mark.length],
    ];

    for (const [nombre, origen, destino] of plan) {
      if (origen !== destino) {
        throw new Error(`${nombre}: ${origen} filas de origen y ${destino} documentos`);
      }
      process.stdout.write(`${nombre.padEnd(10)} ${origen}\n`);
    }

    if (args.dryRun) {
      process.stdout.write('\n--dry-run: no se escribio nada.\n');
      return;
    }

    // 🔴 Todo o nada. Una migracion a medias deja miras sin sus marcas, y el
    // arquero no tiene forma de saber cuales faltan.
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const [nombre] of plan) {
          const documentos = docs[nombre];
          if (documentos.length > 0) {
            await db.collection(nombre).insertMany(documentos, { session });
          }
        }
      });
    } finally {
      await session.endSession();
    }

    // Se cuenta contra la base, no contra el array que acabamos de armar.
    for (const [nombre, origen] of plan) {
      const enMongo = await db.collection(nombre).countDocuments({ userId, deletedAt: null });
      if (enMongo !== origen) {
        throw new Error(`${nombre}: quedaron ${enMongo} en Mongo y en el origen habia ${origen}`);
      }
    }

    process.stdout.write('\nMigracion completa y verificada.\n');
  } finally {
    await client.close();
  }
}

// Solo corre como script: importarlo desde un test no dispara la migracion.
if (process.argv[1]?.endsWith('import-sqlite.ts')) {
  await main();
}
