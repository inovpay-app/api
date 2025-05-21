const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.db'
  },
  useNullAsDefault: true
});

async function initDb() {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT UNIQUE NOT NULL,
      client_secret TEXT NOT NULL,
      representativeID TEXT NOT NULL
    );
  `);

  // Insere dados de teste se ainda não existir
  const exists = await knex('clients').where({ client_id: 'meuClientID123' }).first();
  if (!exists) {
    await knex('clients').insert({
      client_id: 'meuClientID123',
      client_secret: 'meuClientSecret456',
      representativeID: 'rep789'
    });
  }
}

async function validarCliente(clientId, clientSecret) {
  const client = await knex('clients')
    .where({ client_id: clientId, client_secret: clientSecret })
    .first();
  return client;
}

module.exports = { initDb, validarCliente };