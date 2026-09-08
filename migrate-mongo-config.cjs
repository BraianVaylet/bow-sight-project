/**
 * Migraciones versionadas y reversibles.
 *
 * 🔴 **Prohibido tocar Atlas a mano.** Lo que se hizo a mano en un ambiente no
 * existe en el otro, y la diferencia aparece el dia del deploy.
 *
 * Corren **antes** del deploy y desde un solo lugar: si las corriera el arranque
 * del proceso, dos instancias las correrian a la vez.
 *
 * Uso: pnpm exec migrate-mongo create <nombre> | up | down | status
 */
module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI,
    databaseName: process.env.MONGODB_DB_NAME,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.cjs',
  useFileHash: false,
  moduleSystem: 'commonjs',
};
