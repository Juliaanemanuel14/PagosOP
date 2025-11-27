# ⚡ CONFIGURACIÓN RÁPIDA - SUPABASE + RESEND

Guía de 5 minutos para poner tu app en funcionamiento.

---

## 🎯 TU CONNECTION STRING DE SUPABASE

Basado en tu captura, tu connection string es:

```
postgresql://postgres.czyyrauimxootzcfpxam:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

---

## 📝 PASO 1: Configurar .env (2 minutos)

1. **Crea el archivo .env** en la raíz del proyecto

2. **Copia esto y reemplaza los valores:**

```env
# =====================================================
# SERVIDOR
# =====================================================
PORT=3000
NODE_ENV=development

# =====================================================
# SUPABASE DATABASE
# =====================================================
# IMPORTANTE: Reemplaza [YOUR-PASSWORD] con tu contraseña real de Supabase
DATABASE_URL=postgresql://postgres.czyyrauimxootzcfpxam:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# =====================================================
# RESEND EMAIL (Para testing)
# =====================================================
# Obtén tu API Key en: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Para testing usa este email (funciona sin verificar dominio)
EMAIL_FROM=onboarding@resend.dev

# Tu email para recibir notificaciones
EMAIL_TO=tu-email@gmail.com

# Opcional: CC
EMAIL_TO_CC=

# =====================================================
# SEGURIDAD
# =====================================================
# Genera un secreto seguro (comando abajo)
SESSION_SECRET=tu-secreto-super-seguro
```

3. **Genera un SESSION_SECRET seguro:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y reemplaza `tu-secreto-super-seguro`

---

## 🔑 PASO 2: Obtener API Key de Resend (2 minutos)

1. **Ir a Resend:**
   - Ve a: https://resend.com
   - Crea cuenta gratis (Sign up)

2. **Crear API Key:**
   - Ve a: https://resend.com/api-keys
   - Click "Create API Key"
   - Nombre: "formulario-pagos-dev"
   - Permisos: "Sending access"
   - Click "Create"

3. **Copiar la key:**
   - Empieza con `re_`
   - Copia y pega en tu `.env` en `RESEND_API_KEY`

---

## 🚀 PASO 3: Iniciar la aplicación (1 minuto)

```bash
# Instalar dependencias (si no lo hiciste)
npm install

# Iniciar en modo desarrollo
npm run dev
```

Deberías ver:

```
🔄 Conectando a Supabase...
✅ Tabla "pagos" creada o ya existe
✅ Tabla "pago_items" creada o ya existe
✅ Tabla "session" creada o ya existe
✅ Base de datos inicializada correctamente
Servidor ejecutándose en http://localhost:3000
```

---

## 🧪 PASO 4: Probar la aplicación

1. **Abrir en el navegador:**
   ```
   http://localhost:3000
   ```

2. **Login con usuario hardcoded:**
   - Usuario: `Lucas Ortiz`
   - Password: `7894`

3. **Registrar un pago de prueba:**
   - Local: "Local Test"
   - Fecha: Hoy
   - Concepto: "Prueba"
   - Importe: 100

4. **Verificar:**
   - ✅ Se guarda en Supabase
   - ✅ Recibes email en tu bandeja

---

## 📊 VERIFICAR EN SUPABASE

1. **Ver datos en Supabase:**
   - Ve a tu proyecto en Supabase
   - Click en "Table Editor" (menú izquierdo)
   - Verás las tablas:
     - `pagos` - Registros de pagos
     - `pago_items` - Items de cada pago
     - `session` - Sesiones de usuarios

2. **Ver queries:**
   - Click en "SQL Editor"
   - Ejecuta:
     ```sql
     SELECT * FROM pagos ORDER BY id DESC LIMIT 10;
     ```

---

## 🔐 PASO 5 (OPCIONAL): Crear usuarios en la base de datos

Por ahora los usuarios están hardcoded en [server-pg.js](backend/server-pg.js#L14-L18).

Para migrarlos a Supabase:

```bash
npm run create-users
```

Esto creará la tabla `usuarios` y agregará:
- Lucas Ortiz (7894) - admin
- Julian Salvatierra (4226) - usuario
- Matias Huss (1994) - usuario

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ Error: "no se encontró DATABASE_URL"

**Problema:** El archivo .env no existe o está mal configurado

**Solución:**
```bash
# Verifica que .env existe
ls -la .env

# Si no existe, créalo desde el example
cp .env.example .env

# Edita con tus valores
code .env  # o usa tu editor favorito
```

### ❌ Error: "password authentication failed"

**Problema:** La contraseña de Supabase es incorrecta

**Solución:**
1. Ve a tu proyecto en Supabase
2. Settings > Database
3. Reset database password si es necesario
4. Actualiza `[YOUR-PASSWORD]` en el .env

### ❌ Error: "Resend API key is invalid"

**Problema:** La API key de Resend es incorrecta o no está configurada

**Solución:**
1. Ve a https://resend.com/api-keys
2. Verifica tu API key
3. Si está expirada, crea una nueva
4. Actualiza `RESEND_API_KEY` en .env

### ❌ Email no llega

**Problema:** El email se envía pero no llega

**Solución:**
1. Revisa la carpeta de **spam**
2. Verifica que `EMAIL_TO` en .env es tu email correcto
3. Ve al dashboard de Resend para ver logs:
   - https://resend.com/emails
4. Si usas dominio personalizado, verifica que esté verificado

---

## 🎉 ¡LISTO!

Tu aplicación ahora está funcionando con:
- ✅ Supabase (PostgreSQL serverless)
- ✅ Resend (Email moderno)
- ✅ Sin costos (Free tier)
- ✅ Optimizado para Cloud Run

### Próximo paso: Desplegar a producción

Ver: [SUPABASE_RESEND_MIGRATION.md](SUPABASE_RESEND_MIGRATION.md#-despliegue-en-google-cloud-run)

---

## 📋 CHECKLIST RÁPIDO

- [ ] Obtuve mi contraseña de Supabase
- [ ] Creé archivo .env con DATABASE_URL
- [ ] Obtuve API Key de Resend
- [ ] Configuré EMAIL_FROM y EMAIL_TO
- [ ] Generé SESSION_SECRET
- [ ] Ejecuté `npm install`
- [ ] Ejecuté `npm run dev`
- [ ] La app inició sin errores
- [ ] Hice login exitoso
- [ ] Registré un pago de prueba
- [ ] Verifiqué los datos en Supabase
- [ ] Recibí el email de notificación

---

**¿Problemas?** Revisa los logs en la consola o consulta [SUPABASE_RESEND_MIGRATION.md](SUPABASE_RESEND_MIGRATION.md#-solución-de-problemas)
