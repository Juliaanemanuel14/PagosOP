# 🚀 MIGRACIÓN A SUPABASE + RESEND

Guía completa de migración del proyecto de Cloud SQL a Supabase y de Nodemailer a Resend.

---

## 📋 RESUMEN DE CAMBIOS

### ✅ Base de Datos: Cloud SQL → Supabase
- Eliminada dependencia de Cloud SQL (reduce costos significativamente)
- Configuración optimizada para entornos serverless (Cloud Run)
- Connection string simple con SSL incluido
- Pool de conexiones configurado para serverless

### ✅ Emails: Nodemailer (SMTP) → Resend
- API moderna y confiable (sin problemas de puertos bloqueados en Cloud Run)
- Envío asíncrono sin bloquear la respuesta al usuario
- Mejor rendimiento y logs más claros
- Sin problemas con Gmail 2FA o configuraciones SMTP complejas

---

## 🗂️ ARCHIVOS MODIFICADOS

### 1. **backend/db.js**
- ✅ Refactorizado para usar Supabase con connection string
- ✅ SSL habilitado automáticamente en producción
- ✅ Pool optimizado para serverless (`allowExitOnIdle: true`)
- ✅ Configuración simplificada (ya no requiere múltiples variables)

### 2. **backend/server-pg.js**
- ✅ Eliminada configuración de Nodemailer
- ✅ Importado nuevo servicio de email
- ✅ Endpoint POST /api/pagos refactorizado:
  - Guarda en Supabase
  - Responde inmediatamente al usuario
  - Envía email de forma asíncrona (fire-and-forget)

### 3. **backend/email-service.js** ⭐ NUEVO
- ✅ Servicio dedicado para emails con Resend
- ✅ Función `enviarNotificacionPago()` para envío síncrono
- ✅ Función `enviarEmailAsync()` para envío asíncrono
- ✅ HTML template reutilizable

### 4. **.env.example**
- ✅ Actualizado con variables de Supabase
- ✅ Actualizado con variables de Resend
- ✅ Eliminadas variables obsoletas de Cloud SQL y SMTP

### 5. **.env.production.example**
- ✅ Configuración para producción en Cloud Run
- ✅ Connection string de Supabase con pgbouncer

### 6. **package.json**
- ✅ Agregada dependencia: `resend@^4.0.0`
- ✅ Eliminada dependencia: `nodemailer` (ya no se usa)

---

## 🔑 NUEVAS VARIABLES DE ENTORNO

### Para Desarrollo (.env)

```env
# Base de datos Supabase
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Email con Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=tu-email@tudominio.com
EMAIL_TO=destinatario@gmail.com
EMAIL_TO_CC=copia@gmail.com (opcional)

# Sesión
SESSION_SECRET=tu-secreto-super-seguro
NODE_ENV=development
PORT=3000
```

### Para Producción (Cloud Run)

```env
# Base de datos Supabase (con pgbouncer para mejor performance)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Email con Resend
RESEND_API_KEY=re_PRODUCTION_API_KEY
EMAIL_FROM=gastos@tuempresa.com
EMAIL_TO=finanzas@tuempresa.com
EMAIL_TO_CC=admin@tuempresa.com

# Sesión
SESSION_SECRET=GENERAR_NUEVO_SECRETO_SEGURO
NODE_ENV=production
PORT=8080
```

---

## 📝 PASOS DE CONFIGURACIÓN

### **PASO 1: Configurar Supabase**

1. **Crear proyecto en Supabase**
   - Ve a [https://supabase.com](https://supabase.com)
   - Crea una cuenta gratuita
   - Crea un nuevo proyecto
   - Guarda la contraseña de la base de datos

2. **Obtener Connection String**
   - Ve a: Project Settings > Database
   - Busca "Connection String" > Selecciona "Transaction" mode
   - Copia la URL que se ve así:
     ```
     postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```
   - Reemplaza `[YOUR-PASSWORD]` con tu contraseña real

3. **Crear tablas en Supabase**

   Opción A: Usar el SQL Editor de Supabase
   - Ve a SQL Editor en el dashboard
   - Ejecuta el siguiente script:

   ```sql
   -- Tabla de pagos
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

   -- Tabla de items de pago
   CREATE TABLE IF NOT EXISTS pago_items (
     id SERIAL PRIMARY KEY,
     pago_id INTEGER NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
     concepto TEXT NOT NULL,
     importe DECIMAL(10, 2) NOT NULL,
     observacion TEXT
   );

   -- Tabla de sesiones
   CREATE TABLE IF NOT EXISTS session (
     sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
     sess JSON NOT NULL,
     expire TIMESTAMP(6) NOT NULL
   );

   CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
   ```

   Opción B: Dejar que la app cree las tablas automáticamente
   - La función `initTables()` en `db.js` creará las tablas al iniciar

### **PASO 2: Configurar Resend**

1. **Crear cuenta en Resend**
   - Ve a [https://resend.com](https://resend.com)
   - Crea una cuenta gratuita (100 emails/día gratis)
   - Verifica tu email

2. **Obtener API Key**
   - Ve a: API Keys
   - Crea una nueva API Key
   - Copia la key (empieza con `re_`)
   - Guárdala en `RESEND_API_KEY`

3. **Configurar dominio de envío**

   Para Testing:
   ```env
   EMAIL_FROM=onboarding@resend.dev
   ```

   Para Producción:
   - Ve a: Domains
   - Agrega tu dominio
   - Configura los registros DNS (MX, TXT, CNAME)
   - Una vez verificado:
     ```env
     EMAIL_FROM=gastos@tuempresa.com
     ```

### **PASO 3: Actualizar variables de entorno locales**

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con tus valores reales:
   ```env
   DATABASE_URL=tu-connection-string-de-supabase
   RESEND_API_KEY=tu-api-key-de-resend
   EMAIL_FROM=onboarding@resend.dev
   EMAIL_TO=tu-email@gmail.com
   SESSION_SECRET=generar-con-crypto
   ```

3. Genera un SESSION_SECRET seguro:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### **PASO 4: Probar localmente**

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# La app debería:
# 1. Conectarse a Supabase ✅
# 2. Crear tablas automáticamente ✅
# 3. Estar lista en http://localhost:3000
```

Prueba registrando un pago y verifica:
- ✅ Se guarda en Supabase
- ✅ Recibes el email vía Resend

---

## ☁️ DESPLIEGUE EN GOOGLE CLOUD RUN

### **Configurar variables de entorno en Cloud Run**

```bash
gcloud run deploy formulario-pagos \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "\
NODE_ENV=production,\
PORT=8080,\
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true,\
EMAIL_FROM=gastos@tuempresa.com,\
EMAIL_TO=finanzas@tuempresa.com" \
  --set-secrets "\
SESSION_SECRET=session-secret:latest,\
RESEND_API_KEY=resend-api-key:latest"
```

### **Crear secretos en Google Secret Manager**

```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | \
  gcloud secrets create session-secret --data-file=-

# RESEND_API_KEY
echo -n "re_TU_API_KEY_AQUI" | \
  gcloud secrets create resend-api-key --data-file=-
```

---

## 🔄 FLUJO DE DATOS

```
┌─────────────────────────────────────────────────────────┐
│  USUARIO: Registra pago desde el frontend               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  BACKEND: POST /api/pagos                                │
│  1. Valida datos                                         │
│  2. BEGIN TRANSACTION                                    │
│  3. INSERT en Supabase (pagos + pago_items)            │
│  4. COMMIT                                               │
│  5. Responde 201 al usuario ✅ (rápido)                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  EMAIL SERVICE (asíncrono - no bloquea)                 │
│  setImmediate(() => {                                    │
│    await enviarNotificacionPago()                        │
│  })                                                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  RESEND API: Envía email HTML                            │
│  ✅ Email enviado exitosamente                          │
└─────────────────────────────────────────────────────────┘
```

### Ventajas del flujo asíncrono:
- ✅ Usuario recibe respuesta inmediata (< 200ms)
- ✅ Email se envía en background
- ✅ Si falla el email, no afecta el guardado del pago
- ✅ Logs claros de éxito/error en cada etapa

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

| Aspecto | ANTES (Cloud SQL + Nodemailer) | DESPUÉS (Supabase + Resend) |
|---------|-------------------------------|----------------------------|
| **Costo BD** | ~$10-30/mes (Cloud SQL) | $0 (Free tier 500MB) |
| **Costo Email** | Gratis (Gmail con límites) | $0 (100 emails/día) |
| **Configuración BD** | 5+ variables de entorno | 1 variable (DATABASE_URL) |
| **SSL** | Manual (Cloud SQL Proxy) | Automático |
| **SMTP** | Puertos bloqueados en Cloud Run | API HTTP (sin bloqueos) |
| **Velocidad Email** | Bloqueante (~500ms) | Asíncrono (0ms para usuario) |
| **Debugging** | Complejo (SMTP logs) | Simple (API logs + messageId) |
| **Escalabilidad** | Limitada (pool fijo) | Serverless (auto-scale) |

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "no se encontró DATABASE_URL"
```
⚠️  No se encontró DATABASE_URL o SUPABASE_DB_URL
```
**Solución:**
- Verifica que `.env` existe y tiene `DATABASE_URL=...`
- Reinicia el servidor después de cambiar `.env`

### Error: "SSL connection required"
```
Error: The server does not support SSL connections
```
**Solución:**
- Asegúrate de usar el connection string de Supabase con el pooler
- En producción, la configuración SSL es automática

### Error: "Resend API key is invalid"
```
Error: API key is invalid
```
**Solución:**
- Verifica que `RESEND_API_KEY` empieza con `re_`
- Revisa que la key no esté vencida en Resend dashboard
- Genera una nueva API key si es necesario

### Emails no llegan
```
✅ Email enviado para pago #123
(pero el email no llega)
```
**Solución:**
- Revisa la carpeta de spam
- Verifica `EMAIL_TO` en las variables de entorno
- Chequea el dashboard de Resend para ver logs de envío
- Si usas dominio personalizado, verifica la configuración DNS

### Performance lento en Cloud Run
**Solución:**
- Asegúrate de usar el connection string con `?pgbouncer=true`
- Verifica que `allowExitOnIdle: true` está en [db.js](backend/db.js:27)
- Reduce `max` connections si es necesario (actualmente 5)

---

## ✅ CHECKLIST DE MIGRACIÓN

- [ ] Crear proyecto en Supabase
- [ ] Obtener connection string de Supabase
- [ ] Crear tablas en Supabase (SQL Editor o automático)
- [ ] Crear cuenta en Resend
- [ ] Obtener API Key de Resend
- [ ] Configurar dominio en Resend (opcional para producción)
- [ ] Actualizar `.env` local con nuevas variables
- [ ] Generar SESSION_SECRET seguro
- [ ] Instalar nueva dependencia: `npm install`
- [ ] Probar localmente: `npm run dev`
- [ ] Registrar pago de prueba
- [ ] Verificar guardado en Supabase
- [ ] Verificar email recibido
- [ ] Crear secretos en Google Secret Manager
- [ ] Desplegar en Cloud Run con nuevas variables
- [ ] Probar en producción
- [ ] Monitorear logs de Cloud Run

---

## 📚 RECURSOS

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Connection String:** https://supabase.com/docs/guides/database/connecting-to-postgres
- **Resend Docs:** https://resend.com/docs
- **Resend API Keys:** https://resend.com/api-keys
- **Resend Node.js SDK:** https://resend.com/docs/send-with-nodejs

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Migrar usuarios hardcoded a la base de datos**
   - Actualmente hay usuarios en [server-pg.js:14-18](backend/server-pg.js#L14-L18)
   - Crear tabla `usuarios` con bcrypt
   - Usar el script [create-cloud-users.js](backend/create-cloud-users.js)

2. **Agregar rate limiting en emails**
   - Evitar spam si hay múltiples registros rápidos
   - Implementar cola con debounce

3. **Monitoreo y alertas**
   - Configurar alertas en Supabase para uso de BD
   - Configurar alertas en Resend para bounce rate

4. **Backup automático**
   - Supabase tiene backups diarios automáticos en Free tier
   - Considerar exportar datos periódicamente

---

**✅ Migración completada exitosamente!**

Tu aplicación ahora usa Supabase (PostgreSQL serverless) y Resend (email moderno) optimizados para Google Cloud Run.
