# ⚽ Polla Mundialista 2026

> Aplicación web profesional para predecir resultados del FIFA World Cup 2026, con ranking automático en tiempo real.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?logo=vercel)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

---

## 🚀 Características

- **104 partidos** del Mundial 2026 (fase de grupos hasta la final)
- **Predicciones bloqueadas** 30 minutos antes de cada partido
- **Puntuación automática** via triggers PostgreSQL
- **Ranking en tiempo real** con Supabase Realtime
- **Sincronización automática** con football-data.org cada 5 minutos
- **Fallback inteligente**: football-data → TheSportsDB → Supabase local
- **Panel administrador** para corrección manual de resultados
- **Pollas privadas** con código de invitación
- **Exportación CSV** del ranking

## 🏆 Sistema de Puntos

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto (ej: 2-1 pred, 2-1 real) | **5 pts** |
| Ganador correcto + diferencia de goles igual | **5 pts** |
| Solo ganador/empate correcto | **3 pts** |
| Ningún acierto | **0 pts** |

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| Backend | Route Handlers, Server Actions, Vercel Cron Jobs |
| Base de datos | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| APIs | football-data.org (principal), TheSportsDB (fallback) |
| Deploy | Vercel |

---

## 📁 Estructura de Carpetas

```
polla-mundialista/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing + auth
│   ├── globals.css
│   ├── dashboard/
│   │   └── page.tsx
│   ├── matches/
│   │   ├── page.tsx                # Lista de partidos
│   │   └── [id]/page.tsx           # Predicción de partido
│   ├── polls/
│   │   ├── page.tsx                # Mis pollas
│   │   ├── new/page.tsx
│   │   ├── join/page.tsx
│   │   └── [id]/page.tsx           # Ranking de polla
│   ├── admin/
│   │   └── page.tsx                # Panel admin
│   └── api/
│       ├── cron/sync-results/route.ts
│       └── admin/manual-result/route.ts
├── lib/
│   ├── football-data.ts            # API principal
│   ├── thesportsdb.ts              # Fallback
│   ├── openfootball.ts             # Carga inicial
│   ├── scoring.ts                  # Motor de puntos
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── types.ts
├── supabase/
│   └── schema.sql                  # SQL completo
├── next.config.ts
├── vercel.json
├── tailwind.config.ts
└── .env.local
```

---

## ⚙️ Instalación y Configuración

### 1. Clonar y preparar

```bash
git clone https://github.com/TU_USUARIO/polla-mundialista-2026.git
cd polla-mundialista-2026
npm install
```

### 2. Variables de entorno

Crea el archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FOOTBALL_DATA_API_KEY=tu_key_de_football_data
THESPORTSDB_API_KEY=3
CRON_SECRET=genera_un_string_aleatorio_seguro
```

**Cómo obtener las keys:**
- **Supabase**: Dashboard → Settings → API
- **football-data.org**: Regístrate en https://www.football-data.org/client/register (gratuito)
- **TheSportsDB**: La key `3` es pública y gratuita
- **CRON_SECRET**: `openssl rand -base64 32`

### 3. Configurar Supabase

```bash
# En el SQL Editor de Supabase, ejecuta en orden:
# 1. supabase/schema.sql (completo)
```

O usa Supabase CLI:
```bash
npx supabase db push
```

### 4. Cargar calendario inicial

```bash
# Ejecutar script de seed (una sola vez)
npx tsx scripts/seed-calendar.ts
```

O desde el panel admin en `/admin` → usar el botón "Importar desde openfootball".

### 5. Ejecutar localmente

```bash
npm run dev
# → http://localhost:3000
```

---

## 🚢 Despliegue en Vercel

### Paso 1: Subir a GitHub

```bash
git init
git add .
git commit -m "feat: Polla Mundialista 2026 - initial release"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/polla-mundialista-2026.git
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Selecciona tu repositorio
3. Framework: **Next.js** (detección automática)
4. Agrega las variables de entorno del paso 2

### Paso 3: Configurar variables en Vercel

En Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL        → tu valor
NEXT_PUBLIC_SUPABASE_ANON_KEY   → tu valor
SUPABASE_SERVICE_ROLE_KEY       → tu valor (solo servidor)
FOOTBALL_DATA_API_KEY           → tu valor
THESPORTSDB_API_KEY             → 3
CRON_SECRET                     → tu valor generado
```

### Paso 4: Verificar el Cron Job

El `vercel.json` ya configura el cron para ejecutarse cada 5 minutos:

```json
{
  "crons": [{ "path": "/api/cron/sync-results", "schedule": "*/5 * * * *" }]
}
```

Ve a Vercel → Project → Cron Jobs para verificar que esté activo.

### Paso 5: Hacer admin al primer usuario

```sql
-- En el SQL Editor de Supabase:
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'tu_username';
```

---

## 🗄 Esquema de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios + roles + puntos totales |
| `teams` | 48 selecciones participantes |
| `matches` | 104 partidos con resultados |
| `polls` | Pollas privadas/públicas |
| `poll_members` | Relación usuario-polla |
| `predictions` | Predicciones de cada usuario |
| `standings` | Ranking calculado por polla |
| `sync_logs` | Log de sincronizaciones |
| `admin_logs` | Auditoría de acciones admin |

---

## 🔌 APIs de Datos

### football-data.org (Principal)
- Plan gratuito: 10 req/min
- Requiere registro para obtener API key
- Documentación: https://www.football-data.org/documentation/quickstart

### TheSportsDB (Fallback)
- Key pública `3` gratuita sin límite
- Documentación: https://www.thesportsdb.com/api.php

### openfootball/worldcup.json (Carga inicial)
- JSON estático en GitHub
- Sin key necesaria
- Repo: https://github.com/openfootball/worldcup.json

---

## 🔐 Seguridad

- ✅ Row Level Security en todas las tablas
- ✅ API keys nunca expuestas en frontend
- ✅ Validación de permisos admin en endpoints
- ✅ Predicciones bloqueadas por trigger SQL
- ✅ CRON_SECRET en header Authorization
- ✅ Headers de seguridad HTTP configurados
- ✅ Service Role Key solo en servidor

---

## 📝 Variables de Entorno Referencia

| Variable | Público | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave anónima (lectura pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Clave admin (solo servidor) |
| `FOOTBALL_DATA_API_KEY` | ❌ | Tu key de football-data.org |
| `THESPORTSDB_API_KEY` | ❌ | `3` (pública) |
| `CRON_SECRET` | ❌ | String aleatorio para autorizar el cron |

---

## 📄 Licencia

MIT © 2026

---

*Hecho con ❤️ para el Mundial 2026 · USA, Canadá y México*
