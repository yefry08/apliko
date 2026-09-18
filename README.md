# Apliko

Becas, fellowships e internships para estudiantes dominicanos y latinos, con filtro de elegibilidad por ciudadanía.

## Desarrollo

```bash
npm install
npm run dev
```

## Datos

`data/opportunities.json` se genera a partir de `data/raw/` y se versiona con el código:

```bash
npm run data:import
```

| Archivo | Fuente |
| --- | --- |
| `data/raw/international-*.psv` | Listado de programas internacionales (actualizado 28 may 2026). Separado por `\|`. |

El estado de cada oportunidad (abierta, cierra pronto, cerrada…) se calcula con la fecha de hoy en hora de RD. Las páginas se regeneran cada hora.

## Nuevas oportunidades desde RSS

`npm run data:rss` (o `python scripts/ingest_rss.py`) lee los feeds y decide con reglas propias qué
le sirve a un estudiante dominicano. Solo usa la librería estándar de Python: no instala nada ni
cuesta nada. Cada entrada queda en `data/rss/candidates.json` con un estado y su motivo:

- `aprobada`: beca, fellowship, internship o programa para estudiantes, abierta a dominicanos y con
  fecha de cierre futura. Entra al catálogo sola: el script corre `npm run data:import` al final.
- `pendiente`: parece útil pero no dice si admite dominicanos o no trae fecha exacta. Revísala y
  cámbiala a `"aprobada"`; luego corre `npm run data:import`.
- `descartada`: empleos, fondos para organizaciones, boletines, convocatorias que excluyen a RD o ya cerradas.

Cada entrada se procesa una sola vez. Opciones: `--seco` (muestra qué haría sin guardar),
`--revisar` (nada se aprueba solo), `--sin-importar`.
Las reglas tienen pruebas: `python -m unittest scripts/test_ingest_rss.py`.

## Estructura

- `lib/logic.ts`: estado, etiquetas y reglas de elegibilidad (sin datos, se puede usar en el cliente).
- `lib/opportunities.ts`: datos y consultas (solo servidor).
- `components/ui/prisma-hero.tsx`: hero. Su fondo es `components/three/hero-scene.tsx`:
  - en pantallas de 1024 px o más, la escena de Spline (cubos azules), con fondo transparente y en la columna
    derecha. Se carga con `components/three/spline-canvas.tsx`, que fuerza WebGL: el WebGPU que Spline elige
    por defecto llena la consola de errores. Otra escena: `NEXT_PUBLIC_SPLINE_SCENE`.
  - en móvil, o con movimiento reducido, la escena 3D propia (birrete y sobre), mucho más liviana.
- `components/three/`: globo con rutas y escena flotante (React Three Fiber, carga diferida).
- `components/deadline-marquee.tsx`: carrusel continuo con las 5 oportunidades que cierran antes.
- `lib/store.ts`: becas guardadas, etapa de cada postulación y perfil, en `localStorage` (clave `apliko:v1`).
- `lib/ics.ts`: calendario `.ics` con alarmas 7 días y 1 día antes del cierre.
- `app/becas`: catálogo con filtros y fichas. `app/becas/[slug]/calendario`: descarga el `.ics` de una beca.
- `app/mis-becas`: tablero de seguimiento (Guardadas, Preparando, Enviadas, Con resultado).

## Cuentas

Todo vive en **Neon**: la base de datos y el acceso (Neon Auth, que por dentro es Stack Auth).
Ya está creado el proyecto `apliko` con sus tablas y con el acceso activado.

1. Copia `.env.example` como `.env.local`. En este equipo ya está, con `DATABASE_URL`,
   y las dos claves de Neon Auth.

Sin claves de acceso la app funciona igual y guarda todo en el navegador; el botón "Entrar" no aparece.
Sin `DATABASE_URL` tampoco se rompe: solo deja de sincronizar.

Cómo encaja:

- `db/migrations/0001_init.sql`: tablas. Ya ejecutado en Neon.
- El navegador nunca habla con Postgres. Pide y envía a `app/api/sync`, con el token de la sesión
  en la cabecera; el servidor lo verifica contra el JWKS del proyecto (`lib/auth.ts`) antes de consultar.
- `lib/sync.ts` combina ambos lados al entrar: gana la edición más reciente y no se pierde nada.
- `app/entrar`: Google, GitHub o email con contraseña. El enlace mágico está apagado en el proyecto
  de Neon Auth; si lo prefieres, se enciende desde el panel de Neon y se cambia el formulario.

## Producción

- Sitio: https://apliko-omega.vercel.app (Vercel, proyecto `apliko`).
- Código: repositorio privado `yefry08/apliko`. Cada push a `main` despliega solo.
- Variables de entorno: cargadas en Vercel (Production). `DATABASE_URL` está marcada como sensible.
- Neon Auth: el dominio de producción está en la lista de dominios de confianza. Si cambias de dominio,
  agrégalo en Neon > Auth o el acceso con Google/GitHub fallará al volver.
- Becas nuevas: la tarea programada de Windows "Apliko - becas RSS" corre `scripts/rss-semanal.cmd`
  los lunes a las 8:00 a. m. Si el catálogo cambia, hace commit de esos dos archivos y push, y Vercel
  publica. Para desactivar el push automático, borra ese bloque del `.cmd`.

## Pendiente antes de producción

- Google y GitHub usan hoy las llaves compartidas de Stack, que son solo para desarrollo: hay que
  registrar credenciales propias antes de publicar.
