# ApliKo

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
| `data/raw/becas.json` | Becas revisadas a mano, cada una con su enlace oficial y su fecha de cierre cuando existe. |
| `data/raw/financiamiento.json` | Fondos, premios y convocatorias revisados a mano. |
| `data/raw/startups.json` | Fondos públicos para startups y pymes, de la base "Grant Programs Database" (Notion). Sin fechas fijas: continuas o según convocatoria. |
| `data/raw/ea-oportunidades.json` | Fellowships, pasantías, cursos, fondos y voluntariados del EA Opportunities Board (effectivealtruism.org/opportunities), sin los empleos. Viene del JSON que la página incluye; los fondos van a "Fondos y premios" y los voluntariados a "Voluntariado". |
| `data/raw/voluntariado.json` | Proyectos del Cuerpo Europeo de Solidaridad. La lista de origen no trae un enlace por proyecto; todos llevan al buscador oficial. |

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
- `app/globals.css`: la paleta (blanco, navy `#18203A`, cobalto `#3054DE`) y las fuentes (Instrument Serif y Satoshi)
  de todo el sitio. Es la única fuente de colores y tipografía; `app/layout.tsx` carga las fuentes.
- `app/page.tsx` + `app/portada.css`: la portada. `portada.css` solo tiene el diseño de sus secciones y usa los tokens globales.
- `lib/expediente.ts` + `app/mi-perfil/`: Mi perfil, el perfil maestro para postular (datos, estudios, idiomas,
  experiencia, premios, enlaces a documentos y banco de respuestas). Vive en `localStorage` junto a Mis becas y, con
  sesión, se sincroniza a la tabla `expedientes` (`db/migrations/0002_expedientes.sql`). `parseExpediente` es la única
  validación: la usan el navegador, la importación de archivos y `/api/sync`. No guarda pasaportes, cédulas ni contraseñas.
- `lib/cv.ts`: lee el CV en PDF en el navegador (PDF.js) y llena Mi perfil con reglas simples, sin IA ni servidor:
  datos de contacto, experiencia, proyectos, estudios, cursos, idiomas, premios, habilidades y el resumen. Para probarlo
  con un PDF local: `npx tsx scripts/probar-cv.ts ruta/al/cv.pdf`.
- `lib/areas.ts`: las 13 áreas (colores de carpeta y tarjeta, su representante del equipo y la regla que decide qué
  oportunidad entra en cada una). Las usan la portada y el filtro "Área" del catálogo (`/becas?area=clima`).
- `components/portada/keycaps.tsx`: el logotipo ApliKo en teclas. Cada tecla es un área (las dos últimas toman
  la forma de la tecla enter y la tecla lateral) y lleva al catálogo filtrado; las áreas que sobran van en una fila de
  teclas F.
- `components/portada/area-explorer.tsx`: la lista de áreas, la caja con una carpeta por área (su posición se calcula
  con `folderSpot`) y el diálogo nativo, con el representante del área.
  La caja es `public/assets/opportunities-box.svg`, usada dos veces: detrás de las carpetas y, recortada, delante.
  Las máscaras `clip-path` de `portada.css` dependen de la geometría de ese SVG (lienzo cuadrado de 800 px).
- `components/three/rubik-scene.tsx` + `rubik-cube.ts`: el cubo de Rubik jugable del hero. `rubik-cube.ts` es la lógica
  (piezas, giros, si está resuelto) sin React, para probarla aparte; la escena solo la dibuja.
- `components/three/spline-cubes.tsx`: los cubos azules de Spline en el footer, que cargan al acercarse. En pantallas de
  1024 px o más, la escena de Spline con fondo transparente y escalada a la caja (`spline-canvas.tsx` fuerza WebGL); en
  móvil o con movimiento reducido, la escena 3D propia.
- `components/jenga-loader.tsx`: la torre de Jenga que se arma mientras cargan las escenas 3D.
- `components/three/`: esfera de oportunidades (`tile-sphere.tsx`: un cuadro por oportunidad abierta, las que cierran antes al frente y en rojo; colores en `lib/urgency.ts`), cubo Rubik y escena flotante (React Three Fiber, carga diferida).
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
- `app/entrar` (entrar) y `app/registro` (crear cuenta): Google, GitHub o email con contraseña, con el mismo
  formulario (`app/entrar/login-form.tsx`). Los correos de la cuenta llegan a `app/entrar/verificar` (verificar el
  email) y `app/entrar/nueva-clave` (contraseña nueva, pedida en `app/entrar/recuperar`). El enlace mágico está apagado.
- Antibot: Cloudflare Turnstile (gratis) en crear cuenta, entrar con email y recuperar contraseña
  (`components/turnstile.tsx`); `app/api/turnstile` confirma el token con Cloudflare. Sin `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  y `TURNSTILE_SECRET_KEY` se apaga solo. En desarrollo, `.env.development.local` usa las claves de prueba de Cloudflare.
  Limitación: el registro va del navegador directo a Neon Auth, así que Turnstile frena bots que usan el formulario, no
  a uno que llame a la API de Neon Auth por su cuenta. Lo que impide que esas cuentas sirvan es pedir el email verificado.
- Roles (`lib/roles.ts`): `usuario`, `admin` y `superadmin`, siempre por email verificado. El super admin es
  `SUPERADMIN_EMAIL`; los admins están en la tabla `admin_emails` (`db/migrations/0004_admin_emails.sql`, ya ejecutado
  en Neon), así se puede nombrar a alguien antes de que tenga cuenta. `app/admin` muestra cuentas y estadísticas a
  admins; solo el super admin nombra o quita admins (`app/api/admin`). La tabla `user_roles` de `0003_roles.sql` quedó
  sin uso.
- Equipo de la portada: `lib/equipo.ts` y las fotos en `public/equipo/` (cuadradas, WebP).
  Las cuentas salen de `neon_auth.users_sync`, la copia que Neon Auth mantiene en la base; las sesiones anónimas no cuentan.

### Asesorías 1-1 (USD 9, 30 minutos)

- `app/asesorias`: el usuario elige asesor del equipo y un horario libre (desde 24 h antes hasta 14 días), y reserva
  con su cuenta (email verificado). Queda "pendiente de pago" y apartada 48 h (o hasta 2 h antes de la sesión).
- Pago por Payoneer, a mano: una cuenta normal de Payoneer no tiene API. El asesor recibe un correo y en `app/admin`
  ve la reserva; le envía al usuario una solicitud de pago desde Payoneer, y cuando llega pega su enlace de Google Meet
  y la marca pagada. Se confirma y al usuario le llega el enlace. Sin pago a tiempo, el horario se libera solo.
- Lógica en `lib/asesorias.ts`; tablas `availability` y `bookings` (`db/migrations/0005_asesorias.sql`, ya ejecutado).
  Cada asesor guarda su disponibilidad semanal en `/admin`, en hora de RD. Los asesores y sus emails están en
  `lib/asesores.ts`, que solo corre en el servidor: el navegador nunca recibe esos correos.
- Correos (`lib/correo.ts`, Gmail con `GMAIL_USER` y `GMAIL_APP_PASSWORD`): al reservar (usuario y asesor), al
  confirmar y al cancelar. El cron diario de Vercel (`vercel.json` → `app/api/cron/recordatorios`) libera reservas
  vencidas y manda el recordatorio del día antes. `CRON_SECRET` lo protege.

### Correos de la cuenta con Gmail (gratis)

Neon Auth manda los correos de verificación y de contraseña nueva. Para que salgan desde tu Gmail en vez del remitente
compartido de Stack:

1. En tu cuenta de Google activa la verificación en dos pasos y crea una contraseña de aplicación
   (myaccount.google.com/apppasswords).
2. En Neon > proyecto `apliko` > Auth > Configuration > Email server, elige servidor propio (SMTP):
   host `smtp.gmail.com`, puerto `587`, usuario tu Gmail, contraseña la de aplicación, remitente tu Gmail y nombre ApliKo.
3. En Auth > Configuration > Email & password, actívalo y marca que pida verificar el email al registrarse.

Gmail permite unos 500 correos al día, de sobra para estos avisos.

## Producción

- Sitio: https://aplik0.vercel.app (Vercel, proyecto `apliko`). La dirección anterior, https://apliko-omega.vercel.app,
  sigue activa. Ambas están en los dominios de confianza de Neon Auth; un dominio nuevo hay que agregarlo ahí también.
- Código: repositorio privado `yefry08/apliko`. Cada push a `main` despliega solo.
- Variables de entorno: cargadas en Vercel (Production). `DATABASE_URL` está marcada como sensible.
- Neon Auth: el dominio de producción está en la lista de dominios de confianza. Si cambias de dominio,
  agrégalo en Neon > Auth o el acceso con Google/GitHub fallará al volver.
- Catálogo automático: el workflow `.github/workflows/actualizar-catalogo.yml` corre en GitHub Actions
  dos veces al día, a las 7:00 a. m. y 7:00 p. m. (hora de Santo Domingo). Trae:
  - becas nuevas de los feeds RSS (`scripts/ingest_rss.py`, lista en `FEEDS`: Opportunities for Youth, fundsforNGOs,
    Opportunity Desk, Scholars4Dev, Opportunities Corners, ICTP y SGAC);
  - el EA Opportunities Board (`scripts/actualizar_ea.py`);
  - las competencias abiertas de YouNoodle (`scripts/actualizar_younoodle.py`; salta las ya curadas en `financiamiento.json`);
  - las escuelas y fellowships de matemáticas de CIMPA con postulación abierta (`scripts/actualizar_cimpa.py`);
  - las convocatorias abiertas o por abrir de Beca tu Futuro (becas.gob.do), la plataforma de becas del MESCyT
    (`scripts/actualizar_becastufuturo.py`). Entran con la regla `solo-rd`: elegibles para quien vive en RD.

  Luego regenera el
  catálogo y, si cambió, hace commit y push; Vercel publica. Se puede correr a mano desde la pestaña
  Actions > "Actualizar catálogo" > "Run workflow". La tarea de Windows "Apliko - becas RSS"
  (`scripts/rss-semanal.cmd`) hacía lo mismo solo con RSS y solo con la computadora encendida.

## Pendiente antes de producción

- Google y GitHub usan hoy las llaves compartidas de Stack, que son solo para desarrollo: hay que
  registrar credenciales propias antes de publicar.
