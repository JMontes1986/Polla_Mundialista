# Polla Mundialista 2026

Aplicacion web para crear pollas del Mundial 2026, invitar participantes y guardar pronosticos por partido.

## Caracteristicas

- 104 partidos del Mundial 2026 cargados desde calendario local.
- Sin Sportmonks, sin API-Football y sin APIs externas de pago para montar el calendario.
- Pollas privadas con codigo y link de invitacion.
- Predicciones bloqueadas 30 minutos antes de cada partido.
- Resultados manuales desde el panel administrador.
- Ranking y puntos calculados en Supabase.

## Flujo Principal

1. Crear una polla desde `/polls/new`.
2. Entrar a la polla creada.
3. Como dueno, presionar **Montar Mundial**.
4. El sistema carga los 104 partidos en `matches`.
5. Compartir el link de invitacion:

```text
/polls/join?code=CODIGO
```

6. Cada participante se registra o inicia sesion, entra con el codigo y queda agregado en `poll_members`.
7. Los participantes hacen sus pronosticos desde `/polls/[id]`.

## Calendario Local

El calendario vive en:

```text
lib/world-cup-2026-local.ts
```

Incluye:

- Fase de grupos con equipos visibles en las imagenes de referencia.
- Eliminatorias con placeholders logicos como `1A`, `2B`, `G73`, `P101`.
- Fuente marcada como `manual`.

Los placeholders permiten montar todo el cuadro desde el inicio sin depender de datos externos. Los resultados y ajustes se administran manualmente.

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=genera_un_string_aleatorio_seguro
```

No necesitas `SPORTMONKS_API_TOKEN`, `API_FOOTBALL_KEY`, `API_FOOTBALL_LEAGUE_ID` ni `API_FOOTBALL_SEASON`.

## Supabase

Ejecuta el schema completo en el SQL Editor:

```sql
-- supabase/schema.sql
```

Si tu base ya existe y solo necesitas aceptar la fuente manual o api_football previa, puedes ejecutar migraciones puntuales desde la carpeta `supabase/`.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Resultados

Para actualizar un resultado:

1. Entra al panel `/admin`.
2. Abre la pestana de partidos.
3. Presiona **Editar** en el partido.
4. Guarda el marcador final.

Cuando un partido queda como `finished`, Supabase recalcula los puntos de las predicciones asociadas.
