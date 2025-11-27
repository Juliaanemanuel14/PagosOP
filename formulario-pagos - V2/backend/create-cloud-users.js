const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// =====================================================
// CONFIGURACIÓN SUPABASE
// =====================================================
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('❌ ERROR: No se encontró DATABASE_URL en las variables de entorno');
    console.log('\n💡 Asegúrate de tener un archivo .env con:');
    console.log('   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres\n');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Supabase requiere SSL
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Usuarios a crear (tomados de server-pg.js)
const usuarios = [
    { username: 'Lucas Ortiz', password: '7894', email: 'lucas@example.com', rol: 'admin' },
    { username: 'Julian Salvatierra', password: '4226', email: 'julian@example.com', rol: 'usuario' },
    { username: 'Matias Huss', password: '1994', email: 'matias@example.com', rol: 'usuario' }
];

async function crearUsuarios() {
    const client = await pool.connect();

    try {
        console.log('🔄 Conectando a Supabase...\n');

        // Crear tabla de usuarios si no existe
        console.log('📋 Verificando/creando tabla usuarios...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                rol VARCHAR(50) DEFAULT 'usuario',
                activo BOOLEAN DEFAULT true,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso TIMESTAMP
            );
        `);
        console.log('✅ Tabla usuarios lista\n');

        console.log('🔄 Iniciando creación de usuarios...\n');

        for (const usuario of usuarios) {
            try {
                // Hash de la contraseña
                const passwordHash = await bcrypt.hash(usuario.password, 10);

                // Insertar usuario
                const result = await client.query(
                    `INSERT INTO usuarios (username, password_hash, email, rol, activo, fecha_creacion)
                     VALUES ($1, $2, $3, $4, true, NOW())
                     ON CONFLICT (username) DO UPDATE
                     SET password_hash = EXCLUDED.password_hash,
                         email = EXCLUDED.email,
                         rol = EXCLUDED.rol
                     RETURNING id, username, email, rol`,
                    [usuario.username, passwordHash, usuario.email, usuario.rol]
                );

                console.log(`✅ Usuario creado/actualizado: ${result.rows[0].username}`);
                console.log(`   ID: ${result.rows[0].id}`);
                console.log(`   Email: ${result.rows[0].email}`);
                console.log(`   Rol: ${result.rows[0].rol}`);
                console.log(`   Password: ${usuario.password} (hasheado)\n`);

            } catch (error) {
                console.error(`❌ Error al crear usuario ${usuario.username}:`, error.message);
            }
        }

        // Verificar todos los usuarios
        const todosLosUsuarios = await client.query('SELECT id, username, email, rol, activo FROM usuarios ORDER BY id');
        console.log('\n📋 Usuarios en la base de datos:');
        console.table(todosLosUsuarios.rows);

    } catch (error) {
        console.error('❌ Error general:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar
crearUsuarios()
    .then(() => {
        console.log('\n✅ Proceso completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
