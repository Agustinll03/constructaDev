# Guía de Deploy — CONSTRUCTA

Stack: **FastAPI (Python) + React/Vite (TypeScript) + PostgreSQL**

---

## Opciones gratuitas recomendadas

| Componente | Plataforma | Plan gratuito |
|------------|-----------|---------------|
| **Frontend** | [Vercel](https://vercel.com) | Ilimitado para proyectos personales |
| **Backend** | [Render](https://render.com) | Web Service gratuito (se duerme tras 15 min inactivo) |
| **Base de datos** | [Neon](https://neon.tech) | 0.5 GB storage, 1 proyecto free |
| **Archivos/uploads** | [Cloudinary](https://cloudinary.com) | 25 GB storage + 25 GB bandwidth free |

> **Alternativa todo-en-uno**: [Railway](https://railway.app) — backend + DB en el mismo lugar, $5 crédito mensual gratuito. Más simple pero se acaba antes.

---

## Cambios de código OBLIGATORIOS antes del deploy

Hay URLs hardcodeadas que van a romper el deploy si no se cambian primero.

### 1. Frontend — Usar variables de entorno

**Problema**: hay 3 archivos con `http://localhost:8000` hardcodeado.

**Cambio en `/frontend/vite.config.ts`** — ya está configurado para leer `.env`.

Crear `/frontend/.env.production`:
```
VITE_API_URL=https://tu-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://tu-backend.onrender.com
```

Cambiar `/frontend/src/api/client.ts`:
```ts
// ANTES
const BASE_URL = 'http://localhost:8000/api/v1';

// DESPUÉS
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
```

Cambiar `/frontend/src/lib/socket.ts`:
```ts
// ANTES
const SOCKET_URL = 'http://localhost:8000';

// DESPUÉS
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8000';
```

Cambiar `/frontend/src/api/upload.ts`:
```ts
// ANTES
const BACKEND = 'http://localhost:8000';

// DESPUÉS
const BACKEND = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8000';
```

### 2. Backend — CORS dinámico

**Problema**: `/backend/app/main.py` tiene los orígenes de CORS hardcodeados con localhost.

Cambiar a variable de entorno:

```python
# En /backend/app/main.py

allowed_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    ...
)
```

Agregar en `/backend/app/core/config.py`:
```python
CORS_ORIGINS: str = ""  # Separadas por coma: "https://tu-app.vercel.app,https://www.tudominio.com"
```

---

## Variables de entorno

### Backend (Render / Railway)

Copiar `/backend/.env.example` y completar con estos valores:

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `SECRET_KEY` | **SÍ** | JWT secret — generarlo con el comando de abajo | `a3f9c2...` |
| `DATABASE_URL` | **SÍ** | URL de PostgreSQL con driver asyncpg | `postgresql+asyncpg://user:pass@host/db` |
| `DEBUG` | **SÍ** | En producción debe ser `false` | `false` |
| `FRONTEND_URL` | **SÍ** | URL de Vercel para links de invitación | `https://tu-app.vercel.app` |
| `CORS_ORIGINS` | **SÍ** | URL(s) del frontend separadas por coma | `https://tu-app.vercel.app` |
| `PUBLIC_BASE_URL` | Si usás Twilio | URL pública del backend para webhooks | `https://tu-backend.onrender.com` |
| `TWILIO_ACCOUNT_SID` | Si usás Twilio | SID de cuenta Twilio | `ACxxx...` |
| `TWILIO_AUTH_TOKEN` | Si usás Twilio | Token de Twilio | `...` |
| `TWILIO_WHATSAPP_NUMBER` | Si usás Twilio | Número WhatsApp de Twilio | `whatsapp:+14155238886` |
| `BREVO_API_KEY` | Si usás emails | API key de Brevo (emails transaccionales) | `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | Si usás emails | Email remitente | `noreply@constructa.com` |
| `INTERNAL_API_KEY` | Opcional | Para integraciones internas (ej. n8n) | `any-secret` |
| `ANTHROPIC_API_KEY` | No (Phase 3) | Para Claude AI | `sk-ant-...` |

**Generar SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Frontend (Vercel)

En el dashboard de Vercel → Settings → Environment Variables:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://tu-backend.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `https://tu-backend.onrender.com` |

---

## Deploy paso a paso

### Base de datos — Neon

1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear nuevo proyecto `constructa`
3. Copiar la **Connection string** — se ve así:
   ```
   postgresql://usuario:password@ep-xxx.us-east-2.aws.neon.tech/constructa?sslmode=require
   ```
4. Para el backend, cambiar el protocolo a asyncpg:
   ```
   postgresql+asyncpg://usuario:password@ep-xxx.us-east-2.aws.neon.tech/constructa?ssl=require
   ```
5. Correr migraciones desde local apuntando a Neon:
   ```bash
   cd backend
   export DATABASE_URL="postgresql+asyncpg://..."
   alembic upgrade head
   ```

### Backend — Render

1. Push del repositorio a GitHub (si no está)
2. Ir a [render.com](https://render.com) → New → Web Service
3. Conectar el repo de GitHub
4. Configuración:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Agregar todas las variables de entorno del backend (tabla de arriba)
6. Deploy — Render va a dar una URL como `https://constructa-api.onrender.com`

> **Nota**: El plan gratuito de Render "duerme" el servicio después de 15 minutos sin requests. El primer request tarda ~30 segundos en "despertar". Para evitar esto, usar un servicio como [UptimeRobot](https://uptimerobot.com) que haga ping cada 10 minutos (plan gratuito).

### Frontend — Vercel

1. Ir a [vercel.com](https://vercel.com) → Add New → Project
2. Importar el repo de GitHub
3. Configuración:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (se detecta automático)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Agregar las variables de entorno de frontend (tabla de arriba)
5. Deploy — Vercel va a dar una URL como `https://constructa.vercel.app`
6. Volver al backend en Render y actualizar `FRONTEND_URL` y `CORS_ORIGINS` con la URL de Vercel

---

## Socket.IO en producción

Socket.IO usa WebSockets y Render lo soporta nativamente. Sin embargo, si hay problemas de conexión, agregar este fallback en `/frontend/src/lib/socket.ts`:

```ts
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // polling como fallback
  withCredentials: true,
});
```

---

## Uploads de archivos

Actualmente los uploads se guardan en el sistema de archivos del servidor (`/backend/uploads/`). En Render el sistema de archivos es **efímero** — los archivos se pierden cada vez que el servicio se reinicia.

**Opciones para producción:**

1. **Cloudinary** (recomendado — tiene SDK Python):
   ```bash
   pip install cloudinary
   ```
   Variables a agregar:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

2. **AWS S3** (más complejo, free tier 12 meses):
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=constructa-uploads
   AWS_REGION=us-east-1
   ```

> Por ahora, si no implementás storage externo, los archivos subidos van a desaparecer cuando Render reinicie el servicio.

---

## Checklist de deploy

- [ ] Cambiar `client.ts` para usar `VITE_API_URL`
- [ ] Cambiar `socket.ts` para usar `VITE_SOCKET_URL`
- [ ] Cambiar `upload.ts` para usar `VITE_SOCKET_URL`
- [ ] Cambiar CORS en `main.py` para usar variable de entorno
- [ ] Agregar `CORS_ORIGINS` a `config.py`
- [ ] Base de datos creada en Neon
- [ ] Migraciones corridas contra Neon (`alembic upgrade head`)
- [ ] Backend deployado en Render con todas las variables
- [ ] Frontend deployado en Vercel con las variables de entorno
- [ ] `FRONTEND_URL` y `CORS_ORIGINS` en Render actualizados con URL de Vercel
- [ ] Probar login en producción
- [ ] Probar WebSocket (presencia/tiempo real)
- [ ] Probar upload de archivos (si se configura storage externo)

---

## Comandos útiles

```bash
# Generar SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Correr migraciones contra base de datos remota
DATABASE_URL="postgresql+asyncpg://..." alembic upgrade head

# Ver estado de migraciones
alembic current

# Build del frontend para verificar que compila
cd frontend && npm run build

# Verificar que el backend levanta correctamente
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Resumen de URLs de producción

Una vez deployado, vas a tener:

| Servicio | URL |
|----------|-----|
| Frontend | `https://[tu-proyecto].vercel.app` |
| Backend API | `https://[tu-proyecto].onrender.com` |
| API Docs (Swagger) | `https://[tu-proyecto].onrender.com/docs` |
| Health check | `https://[tu-proyecto].onrender.com/health` |
| Base de datos | Interna en Neon (no expuesta) |
