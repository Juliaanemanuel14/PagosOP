const { Pool } = require('pg');

// =====================================================
// CONFIGURACIÓN SUPABASE PARA CLOUD RUN (SERVERLESS)
// =====================================================

// Configuración optimizada para Supabase
// Supabase proporciona una connection string completa que incluye SSL
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.warn('⚠️  No se encontró DATABASE_URL o SUPABASE_DB_URL en las variables de entorno');
}

// Pool optimizado para entornos serverless como Cloud Run
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Supabase requiere SSL en producción
  } : false,
  // Configuración para serverless (Cloud Run)
  max: 5, // Máximo de conexiones (bajo para serverless)
  min: 0, // Mínimo 0 para evitar conexiones idle
  idleTimeoutMillis: 30000, // 30 segundos antes de cerrar conexión idle
  connectionTimeoutMillis: 10000, // 10 segundos timeout de conexión
  // Importante para Supabase: permitir que las conexiones se cierren
  allowExitOnIdle: true,
  // Forzar IPv4 para resolver problemas de DNS
  host: 'db.czyyrauimxootzcfpxam.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Desarrollo2024'
});

// Función para ejecutar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Función para obtener un cliente del pool (para transacciones)
async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Modificar release para mejorar debugging
  client.release = () => {
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

// Inicializar tablas
async function initTables() {
  const createPagosTable = `
    CREATE TABLE IF NOT EXISTS pagos (
      id SERIAL PRIMARY KEY,
      local VARCHAR(255) NOT NULL,
      proveedor VARCHAR(255),
      fecha_pago DATE,
      fecha_servicio DATE,
      fecha DATE,
      moneda VARCHAR(50),
      concepto TEXT,
      importe DECIMAL(10, 2),
      observacion TEXT,
      op VARCHAR(50),
      usuario_registro VARCHAR(255) NOT NULL,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createItemsTable = `
    CREATE TABLE IF NOT EXISTS pago_items (
      id SERIAL PRIMARY KEY,
      pago_id INTEGER NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
      concepto TEXT NOT NULL,
      importe DECIMAL(10, 2) NOT NULL,
      observacion TEXT
    );
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
  `;

  const createIndexSessions = `
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
  `;

  try {
    await query(createPagosTable);
    console.log('✓ Tabla "pagos" creada o ya existe');

    await query(createItemsTable);
    console.log('✓ Tabla "pago_items" creada o ya existe');

    await query(createSessionsTable);
    console.log('✓ Tabla "session" creada o ya existe');

    await query(createIndexSessions);
    console.log('✓ Índice de sesiones creado');

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar tablas:', error);
    throw error;
  }
}

// Cerrar el pool
async function close() {
  await pool.end();
  console.log('Pool de conexiones cerrado');
}

module.exports = {
  query,
  getClient,
  initTables,
  close,
  pool
};
