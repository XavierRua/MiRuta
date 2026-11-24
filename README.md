# MiRuta

Plataforma **multiempresa** para acompañar y monitorear a los **trabajadores de campo** con el GPS de su celular: jornada automática por horario, reportes de actividad cada hora con fotos, visitas programadas con geocercas, kilometraje, excesos de velocidad, inicio de jornada con estado de salud y preoperacional, pausas, incidentes, ausentismo y notificaciones con constancia de lectura.

Tiene dos aplicaciones:

| Aplicación | Quién la usa | Tecnología |
|---|---|---|
| **App móvil** (`apps/mobile`) | Trabajador de campo | Expo (React Native) |
| **Panel web** (`apps/web`) | Superadministrador, administrador de empresa, supervisor (Jefe de servicio técnico) y SST | React + Vite |

Las dos se conectarán a **Supabase** (base de datos, inicio de sesión, archivos y tiempo real). El esquema completo ya está escrito en `supabase/migrations`.

> **Estado actual (noviembre de 2026):** prototipo funcional con **datos de ejemplo**. La app y la web todavía **no están conectadas** entre sí ni a Supabase: cada una funciona sola con datos inventados (`data/mock.js`). Lo que se guarda en la web queda en el navegador (`localStorage`) y lo de la app, en el celular. Se construyó solo con herramientas gratuitas.

---

## Contenido

1. [Arquitectura](#1-arquitectura)
2. [Cómo funciona (flujos principales)](#2-cómo-funciona-flujos-principales)
3. [Funciones](#3-funciones)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Librerías instaladas](#5-librerías-instaladas)
6. [Base de datos (Supabase)](#6-base-de-datos-supabase)
7. [Permisos por rol (interruptores)](#7-permisos-por-rol-interruptores)
8. [Dónde se cambia cada regla](#8-dónde-se-cambia-cada-regla)
9. [Instalar y ejecutar](#9-instalar-y-ejecutar)
10. [Probar la demo](#10-probar-la-demo)
11. [Seguridad y datos personales](#11-seguridad-y-datos-personales)
12. [Convenciones del código](#12-convenciones-del-código)
13. [Pendientes y hoja de ruta](#13-pendientes-y-hoja-de-ruta)
14. [Solución de problemas](#14-solución-de-problemas)

---

## 1. Arquitectura

```
┌─────────────────────────┐                    ┌──────────────────────────────────────┐
│  APP MÓVIL (trabajador) │                    │              SUPABASE                │
│  Expo / React Native    │                    │                                      │
│                         │   HTTPS + Realtime │  Auth ........ inicio de sesión      │
│  pantallas (screens)    │ ◄────────────────► │  Postgres .... datos (con PostGIS    │
│      │                  │                    │                para mapas y áreas)   │
│  contextos (estado)     │                    │  RLS ......... cada empresa solo ve  │
│      │                  │                    │                lo suyo               │
│  services/api.js  ◄─────┼── única puerta     │  Storage ..... fotos, documentos,    │
│  (hoy: datos ejemplo)   │   a los datos      │                logos                 │
│                         │                    │  pg_cron ..... tareas cada minuto    │
│  celular: GPS, cámara,  │                    │                ("No reportó", etc.)  │
│  podómetro, notificac., │                    │  Triggers .... validan con la hora   │
│  almacenamiento cifrado │                    │                del servidor y crean  │
└─────────────────────────┘                    │                alertas               │
                                               └──────────────────▲───────────────────┘
┌─────────────────────────┐                                       │
│  PANEL WEB              │   HTTPS + Realtime                    │
│  React + Vite + Leaflet │ ◄─────────────────────────────────────┘
│  services/api.js        │   mapas: OpenStreetMap · direcciones: Nominatim (gratis)
└─────────────────────────┘
```

### Ideas que guían el diseño

- **Una sola puerta a los datos.** Las pantallas nunca consultan datos directamente: siempre llaman a `services/api.js`. Hoy ese archivo devuelve datos de ejemplo; cuando se conecte Supabase **solo cambia ese archivo** y las pantallas siguen igual.
- **El servidor manda.** Todo lo importante se valida en la base de datos con su propia hora (`now()`): si un reporte está dentro de su hora, si se puede iniciar horas extras, quién puede apagar un GPS o a qué hora se leyó una notificación. La app también valida, pero solo para avisar antes. Así nadie puede hacer trampa cambiando la hora del celular.
- **Hora del servidor y hora de Colombia.** La app calcula la diferencia entre el reloj del celular y el del servidor (`services/horaServidor.js`) y usa siempre la hora de Colombia, UTC-5 (`utils/horaColombia.js`), aunque el celular esté en otra zona horaria.
- **Multiempresa con RLS.** En Postgres, cada tabla tiene reglas (Row Level Security) para que un usuario solo vea los datos de su empresa y según su rol.
- **Cada función es un interruptor.** Las funciones de la app y de la web tienen una clave de permiso (`config/permisos.js`). El administrador las enciende o apaga por rol desde la web, sin tocar el código (sección 7).
- **Estado por contextos.** La app guarda el estado compartido en *contextos* de React (sesión, reportes, visitas, pausas, notificaciones…). Cada contexto es dueño de un tema y las pantallas lo leen con un *hook* (`useReportes()`, `useVisitas()`…).
- **Funciona sin señal.** Lo que no se puede enviar se guarda en el celular y se envía al volver la conexión. Las notificaciones las programa el propio celular, así que suenan aunque la app esté cerrada y sin internet.
- **Costo cero.** Todo funciona con planes gratuitos: Expo, Supabase, OpenStreetMap, Nominatim, Excel y PDF generados en el navegador sin librerías de pago.

---

## 2. Cómo funciona (flujos principales)

### 2.1 Ingreso del trabajador (una sola vez por celular)

1. El administrador genera en la web un **código de activación** (6 dígitos, un solo uso, vence en 24 h).
2. En el celular, el trabajador escribe el **código de la empresa**, su **cédula** y el **código de activación**. La cuenta queda **vinculada a ese celular**; si alguien intenta activarla en otro equipo, se rechaza y se avisa al administrador.
3. Crea un **PIN de 4 dígitos**. Se rechazan PIN fáciles como 1111 o 1234. El PIN nunca se guarda: solo su huella SHA-256 con sal, cifrada en el celular.
4. Acepta la **autorización de tratamiento de datos** (Ley 1581) y da los **permisos** del celular (ubicación, cámara, notificaciones, actividad física).
5. Toma las **fotos de los documentos del vehículo** (SOAT, licencia, tarjeta de propiedad, técnico-mecánica).
6. Desde ahí, cada ingreso es solo con el PIN. Tras 5 minutos en segundo plano lo vuelve a pedir y con 5 PIN incorrectos se bloquea.

### 2.2 Un día de trabajo

```
Hora de entrada ──► El GPS arranca solo (aunque no haya llenado nada)
       │
       ▼
Inicio de jornada OBLIGATORIO (no ve tareas ni visitas hasta terminarlo)
   1. Estado de salud ── "no apto" ──► alerta con sonido a admin, supervisor y SST
   2. Preoperacional (vehículo propio, de la empresa o ninguno)
        · ítem en "Mal" ──► alerta · pico y placa ──► el vehículo no puede salir
   · Si a los 30 min no los llenó ──► alerta "formularios pendientes"
       │
       ▼
Pestaña Jornada
   · Reporte de actividad CADA HORA (solo dentro de su hora; si no ──► "No reportó")
   · Visitas del día: llegada/salida automáticas por geocerca
   · Pausas (se cierran solas con alarma) · Incidentes · Horas extras
   · Indicadores: visitas, eficiencia, velocidad, a pie / vehículo / quieto
       │
       ▼
30 min antes del fin ──► Estado de salud de salida
Fin del horario + 1 hora ──► se cierra el último reporte ──► "Jornada finalizada"
```

- **Apagado manual del GPS:** si el trabajador no está apto o tuvo un incidente, un perfil autorizado lo apaga desde la web con **comentario obligatorio**. Queda registrado quién, cuándo y por qué; la jornada se cierra y se detienen los recordatorios.
- **Horas excluidas:** desde la web se puede excluir un rango de horas (por ejemplo, una capacitación) para que esos reportes no se pidan ni afecten la eficiencia.

### 2.3 Notificaciones (campana)

- Todo aviso que recibe el trabajador entra a la **campana** del encabezado: recordatorios y estado de reportes, excesos de velocidad, visitas, documentos, salida del área, pausas y cierre de jornada.
- Los avisos **programados** (por ejemplo "Te quedan 10 minutos") suenan aunque la app esté cerrada y entran a la lista cuando llega su hora. Si se cancelan antes (porque envió el reporte), no aparecen.
- Al marcar una notificación como **leída**, el servidor guarda la hora. En la web se ve quién la leyó y cuándo, para que el trabajador no pueda decir que no la vio.

### 2.4 Del celular al panel web (cuando se conecte Supabase)

- El celular envía sus puntos GPS, reportes, formularios y eventos. Los **triggers** de la base de datos validan y crean las **alertas**.
- El panel web escucha los cambios en **tiempo real** (Realtime): el mapa en vivo se mueve y las alertas suenan.
- Las **tareas programadas** (`pg_cron`) marcan "No reportó", avisan de formularios pendientes y de documentos por vencer.

---

## 3. Funciones

### 3.1 App móvil (trabajador)

**Encabezado (en todas las pestañas)**
- ☰ **Menú lateral**:
  - arriba, **Seguridad** (cambiar contraseña/PIN y eliminar la cuenta);
  - abajo, Política de privacidad, Términos y condiciones, Tratamiento de datos personales y Cerrar sesión;
  - pie con autor, ciudad, correo, derechos y **versión** (se toma sola de `app.json`).
- **Logo de la empresa**: lo sube el administrador desde la web; si no hay logo, se ve el de MiRuta.
- 🔔 **Campana**: contador de no leídas y lista de la más reciente a la más antigua, con "Marcar todas como leídas".

**Pestaña Jornada**
- Estado de la jornada, aviso de reloj corrido y banner "Jornada cerrada" si le apagaron el GPS.
- **Reportes de actividad** cada hora:
  - descripción, 1 a 3 fotos con cámara, selfie con cámara frontal y GPS automático;
  - fotos comprimidas antes de enviar;
  - el último reporte del día tiene una hora de más;
  - recordatorios con sonido al abrir la hora, 10 min antes de cerrar y al cerrar.
- **Indicadores diarios**, todos con el mismo diseño: visitas, eficiencia (🟢 ≥ 90 %, 🟠 ≥ 70 %, 🔴), velocidad actual, km a pie, km en vehículo y tiempo quieto. El recorrido cuenta solo los km en vehículo.
- **Visitas de hoy** (ruta, obra o zona):
  - estado: pendiente, en curso, cumplida o no cumplida;
  - mapa con la geocerca, la distancia y el botón "Cómo llegar" (Google Maps o Waze);
  - todas las visitas en un solo mapa con colores;
  - entradas y salidas automáticas por geocerca y alerta si sale del área de su única visita.
- **Horas extras**: iniciar y finalizar con la hora del servidor, solo después de la jornada.
- **Incidentes laborales**: descripción, fotos opcionales y si puede continuar; fecha, hora y GPS automáticos.
- **Pausas y descansos**: desayuno, almuerzo, pausa activa y otras (capacitación, reunión, cita médica…).
  - Se cierran solas al cumplir el tiempo, con alarma.
  - Recordatorio de pausa activa cada 2 h.
  - Las configura la web.

**Pestaña Historial**
- Día, semana, mes o rango, con filtros de horas extras, kilometraje, eficiencia y excesos.
- Detalle por día: km, lugares, reportes, visitas y pausas.

**Pestaña Mi perfil**
- Vehículo con sus documentos y estado por color (🟢 vigente, 🟠 vence en 15 días, 🔴 vencido); se actualizan al renovarlos y se guardan las versiones.
- Días de **pico y placa**.
- Horario, datos personales, documentos adicionales (los sube SST) y autorización de datos.

### 3.2 Panel web

| Menú | Qué hace |
|---|---|
| **Mapa en vivo** | Trabajadores en el mapa con foto, estado, batería y último envío; a pie / en vehículo. Botón **Apagar GPS** (comentario obligatorio). |
| **Trabajadores** | Datos, celular vinculado (generar código de activación o desvincular), documentos. |
| **Vehículos** | Vehículos con SOAT y técnico-mecánica y sus vencimientos. |
| **Programación** | Rutas, obras y zonas con fecha, hora, dirección o clic en el mapa, geocerca ajustable y repetición. Pestaña **Cumplimiento de visitas** con entradas, salidas y mapa del recorrido. |
| **Geocercas** | Zonas con hora de entrada y salida. |
| **Historial y km** | Por trabajador o todos: km, velocidades, excesos, eficiencia y filtros, con Excel y PDF. |
| **Reportes de actividad** | Reportes con fotos, selfie y GPS; filtro por estado. **Excluir horas** (capacitaciones). |
| **Desempeño** | Comparativo de trabajadores y registro de excesos de velocidad. |
| **Horas extras** | Totales por día, semana, mes o rango y por sesión. |
| **Novedades y ausentismo** | Pestañas Estado de salud, Preoperacional, Pausas, Incidentes, GPS apagados, **Notificaciones** (leídas o no y cuándo) y **Ausentismo**, con KPIs y descarga en Excel o PDF. Cada pestaña es un permiso. |
| **Alertas** | Salud no apto, falla en preoperacional, incidente, salida del área, no reportó, documentos, GPS apagado, etc. |
| **Horarios** | Horario por empresa, grupo o trabajador. |
| **Configuración** | Logo de la empresa, velocidad, eficiencia, geocercas, formularios de salud y preoperacional, **pausas** (nombre, ícono, grupo, duración en min u horas, activa) y quién más puede configurarlas. Cada sección depende de un permiso. |

- **Ver como (demo)**, abajo en el menú lateral: cambia entre Superadministrador, Administrador, Supervisor y SST para probar qué ve cada perfil.

---

## 4. Estructura de carpetas

```
MiRuta/
├── README.md                Este documento
├── .gitignore               Lo que NO se sube a GitHub (node_modules, .env, builds…)
├── docs/
│   └── definicion.md        Definición del proyecto: decisiones, reglas de negocio de cada función,
│                            cálculo de almacenamiento y pendientes
├── supabase/
│   └── migrations/          Base de datos en SQL, en orden (0001 → 0015). Ver sección 6
└── apps/
    ├── mobile/              App del trabajador (Expo)
    └── web/                 Panel web (React + Vite)
```

### 4.1 App móvil — `apps/mobile`

| Archivo / carpeta | Para qué sirve |
|---|---|
| `App.js` | Punto de entrada. Envuelve la app con todos los **proveedores de estado** (contextos) en este orden: área segura › Permisos › Documentos › Sesión › Jornada del día › Reportes › Excesos › Horas extras › Desplazamiento › Visitas › Notificaciones › Navegación. |
| `index.js` | Registra `App` para Expo. |
| `app.json` | Configuración de Expo: nombre, **versión** (la muestra el menú), permisos de Android/iPhone y plugins (cámara, ubicación, notificaciones). |
| `package.json` | Librerías y comandos (`npm start`). |
| `.env.example` | Plantilla de las claves de Supabase. Se copia como `.env` (que **nunca** se sube). |
| `.npmrc` | `legacy-peer-deps=true` para evitar errores de versiones de React al instalar. |
| `.prettierrc` | Formato del código (Prettier). |

#### `src/navigation` — cómo se pasa de una pantalla a otra

| Archivo | Para qué sirve |
|---|---|
| `AppNavigator.js` | Decide qué se muestra según el **paso de ingreso** (activar → crear PIN → PIN → autorización → permisos → documentos) y, ya adentro, si falta el **inicio de jornada**. Registra todas las pantallas que se abren encima de las pestañas (nuevo reporte, visita, notificaciones, seguridad…). |
| `TabsNavigator.js` | Las 3 pestañas de abajo (Jornada, Historial, Mi perfil) y el **encabezado común** (☰, logo y campana). |

#### `src/screens` — pantallas

| Pantalla | Qué muestra |
|---|---|
| `ActivacionScreen` | Primera vez: código de empresa, cédula y código de activación. |
| `CrearPinScreen` / `LoginScreen` / `BloqueadoScreen` | Crear el PIN, entrar con PIN y aviso de cuenta bloqueada. |
| `ConsentimientoScreen` | Autorización de tratamiento de datos (también en modo solo lectura desde el menú). |
| `PermisosScreen` | Pide los permisos del celular paso a paso. |
| `DocumentosRegistroScreen` / `DocumentoScreen` | Fotos de los documentos del vehículo al registrarse; ver o renovar un documento. |
| `InicioJornadaScreen` | Inicio obligatorio: estado de salud y preoperacional. |
| `JornadaScreen` | Pestaña principal: reportes, indicadores, visitas, horas extras, incidentes y pausas. |
| `HistorialScreen` | Pestaña Historial con filtros por período. |
| `PerfilScreen` | Pestaña Mi perfil: vehículo, pico y placa, horario, datos y documentos. |
| `NuevoReporteScreen` / `ReportesDiaScreen` | Enviar el reporte de la hora; ver los reportes del día. |
| `VisitaDetalleScreen` / `UbicacionVisitaScreen` / `VisitasMapaScreen` | Detalle de una visita, su mapa con la distancia y todas las visitas en un mapa. |
| `SaludSalidaScreen` | Estado de salud al terminar la jornada. |
| `NuevoIncidenteScreen` | Reportar un incidente laboral. |
| `NotificacionesScreen` | Lista de la campana. |
| `SeguridadScreen` / `CambiarPinScreen` | Cambiar contraseña (PIN) y eliminar la cuenta. |
| `LegalScreen` | Política de privacidad y términos y condiciones. |

#### `src/components` — piezas reutilizables

| Componente | Para qué sirve |
|---|---|
| `Encabezado` | Barra superior de las pestañas: ☰, logo y campana con contador. |
| `MenuLateral` | Menú que se desliza desde la izquierda. |
| `LogoEmpresa` | Logo de la empresa o, si no hay, el de MiRuta. |
| `Dato` | Tarjeta de indicador (círculo con ícono, valor, título y detalle). La usan Indicadores diarios y Pausas. |
| `Seccion` / `Fila` | Bloque blanco con título y fila "etiqueta: valor" (Mi perfil). |
| `TarjetaReportes` | Estado de la hora actual y botón para enviar el reporte. |
| `TarjetaVisitas` | Visitas de hoy con su estado. |
| `TarjetaHorasExtra` | Iniciar y finalizar horas extras. |
| `TarjetaIncidentes` | Botón para reportar incidentes y lista del día. |
| `TarjetaPausas` | Cuadrícula de pausas para iniciar con un toque. |
| `FormularioSalud` / `FormularioPreoperacional` | Formularios del inicio (y fin) de jornada. |
| `MapaVisita` / `GeocercaEnMapa` / `MarcadorModo` / `LeyendaDesplazamiento` | Mapa de la visita, dibujo de la geocerca, ícono del trabajador (a pie, moto, carro) y leyenda de colores. |
| `ComoLlegar` | Abre Google Maps o Waze. |
| `FiltroHistorial` / `CampoFecha` | Filtros del historial y campo de fecha con calendario. |
| `DocumentoFila` / `TomarDocumento` | Fila de un documento con su estado; tomar su foto y fecha de vencimiento. |
| `TecladoPin` | Puntos y teclado numérico del PIN. |

#### `src/context` — estado compartido (quién es dueño de qué)

| Contexto | Qué guarda y hace |
|---|---|
| `SesionContext` | Paso de ingreso, celular vinculado, PIN, cerrar sesión y bloqueo tras 5 min en segundo plano. |
| `PermisosContext` | `puede('clave')` y `<Permiso clave>`: muestra u oculta cada función según el rol. |
| `DocumentosContext` | Documentos del vehículo y adicionales, sus versiones y avisos de vencimiento. |
| `JornadaDiaContext` | Registros del día: salud, preoperacional, vehículo del día, pausas, incidentes y GPS apagado; pico y placa. |
| `ReportesContext` | Reportes de actividad enviados. |
| `ExcesosContext` | Excesos de velocidad (uno por episodio) y su aviso. |
| `HorasExtraContext` | Sesiones de horas extras. |
| `DesplazamientoContext` | Detecta a pie, en vehículo o quieto con el podómetro y el GPS; km y tiempos. |
| `VisitasContext` | Visitas de hoy, entradas y salidas por geocerca, tolerancia y alerta de salida del área. |
| `NotificacionesContext` | Lista de la campana, número sin leer y marcar como leídas. |

#### `src/services` — conexión con el celular y con los datos

| Archivo | Para qué sirve |
|---|---|
| `api.js` | **Única puerta a los datos.** Hoy devuelve datos de ejemplo; con Supabase, solo cambia este archivo. |
| `almacen.js` | Guardado **cifrado** en el celular (Keychain / Keystore): vínculo, huella del PIN, intentos. |
| `archivos.js` | Archivos permanentes: fotos de documentos y registros en JSON (jornada del día, notificaciones…). |
| `bandeja.js` | Bandeja de la campana: agrega avisos, pasa los programados cuando llega su hora y marca leídas (y avisa al servidor). |
| `notificaciones.js` | Programa y cancela las notificaciones locales con sonido (reportes, visitas, documentos, pausas, excesos…). |
| `horaServidor.js` | Hora confiable tomada del servidor (no del reloj del celular). |
| `pin.js` | Crear, verificar y cambiar el PIN; rechaza PIN débiles. |
| `dispositivo.js` | Identificador de esta instalación y datos del celular (modelo, sistema). |
| `fotos.js` | Toma fotos con la cámara y las comprime. |
| `ubicacion.js` | Ubicación puntual para un reporte. |
| `rastreo.js` | **Pendiente:** rastreo GPS en segundo plano por horario (necesita *development build*). |

#### Otras carpetas de `src`

| Carpeta | Contenido |
|---|---|
| `config/` | **Reglas que se pueden ajustar sin tocar pantallas**: `app.js` (modo demo, versión, créditos), `reportes.js`, `seguridad.js`, `indicadores.js`, `horasExtra.js`, `documentos.js`, `desplazamiento.js`, `formularios.js` (salud, preoperacional y pausas), `permisos.js` (catálogo de interruptores), `legal.js`. |
| `constants/` | Textos fijos: autorización de datos y pasos de permisos del celular. |
| `data/` | Datos de ejemplo (`mock.js`: trabajador, empresa, vehículos, horario, jornadas; `programacion.js`: visitas). |
| `hooks/` | Lógica reutilizable: `useFranjasHoy` (horas de reporte de hoy y su estado), `useJornada`, `useMiUbicacion`, `useVelocidad`. |
| `utils/` | Cálculos puros: franjas de reportes, eficiencia, velocidad, visitas y geocercas, desplazamiento, documentos, horas extras, fechas, hora de Colombia y formatos. |
| `theme/colors.js` | Paleta de colores de la app. |

### 4.2 Panel web — `apps/web`

| Archivo / carpeta | Para qué sirve |
|---|---|
| `index.html` / `vite.config.js` | Página base y configuración de Vite. |
| `src/main.jsx` | Punto de entrada: proveedores Config › Sesión › Permisos › Programación › Novedades. |
| `src/App.jsx` | Muestra el inicio de sesión o el panel (menú lateral + pantalla actual). |
| `src/navigation/menu.js` | Opciones del menú lateral; cada una puede pedir permisos para verse. |
| `src/navigation/AppNavigator.jsx` | Muestra la pantalla elegida en el menú. |
| `src/screens/` | Una pantalla por opción del menú (ver tabla 3.2) y `LoginScreen`. |
| `src/components/` | `Sidebar` (menú lateral, empresa, "Ver como"), `Mapa`, `MapaSelector` (programar con clic y arrastre), `MapaRecorrido`, `Modal`, `ProgramacionModal`, `VisitaDetalleModal`, `CelularModal` (código de activación), `ApagarGpsModal`, `ExcluirHorasModal`, `ConfigFormularios`, `ConfigPausas`, `ConfigLogo`, `FiltroPeriodo`, `FiltroHistorialAdmin`, `ChipEficiencia`, `Avatar`, `FotoInput`, `LeyendaDesplazamiento`. |
| `src/context/` | `SesionContext` (usuario, empresa, pantalla), `PermisosContext` (permisos web por rol), `ConfigContext` (indicadores y logos), `ProgramacionContext` (visitas programadas), `NovedadesContext` (formularios, pausas, GPS apagados y horas excluidas). |
| `src/config/` | `app.js` (claves), `indicadores.js`, `formularios.js` (salud, preoperacional y pausas por defecto), `permisos.js` (roles y permisos web). |
| `src/constants/` | Estados del trabajador y tipos de alerta con su ícono y color. |
| `src/services/api.js` | Única puerta a los datos (hoy ejemplo). |
| `src/services/geocodificacion.js` | Buscar direcciones con Nominatim (OpenStreetMap), gratis y con límite de 1 por segundo. |
| `src/utils/` | `exportar.js` (Excel .xlsx real y PDF por impresión, sin librerías), `novedades.js` (datos de salud, pausas, incidentes, notificaciones y ausentismo), `filtrosHistorial.js`, `eficiencia.js`, `visitas.js`, `desplazamiento.js`, `fechas.js`. |
| `src/data/` | Datos de ejemplo. |
| `src/theme/styles.css` | Todos los estilos (CSS simple). |

---

## 5. Librerías instaladas

### 5.1 App móvil

| Librería | Para qué se usa en MiRuta |
|---|---|
| `expo` | Plataforma base: permite programar en JavaScript y probar en el celular con **Expo Go** sin compilar. |
| `react` / `react-native` | Construir las pantallas con componentes. |
| `@react-navigation/native` | Navegación entre pantallas. |
| `@react-navigation/native-stack` | Pantallas que se abren una encima de otra (nuevo reporte, visita, notificaciones…). |
| `@react-navigation/bottom-tabs` | Las pestañas de abajo (Jornada, Historial, Mi perfil). |
| `react-native-screens` | Requisito de React Navigation: pantallas nativas más livianas. |
| `react-native-safe-area-context` | Respeta la muesca, la barra de estado y los botones del sistema. |
| `@expo/vector-icons` | Íconos (Ionicons y MaterialCommunityIcons). |
| `expo-status-bar` | Color de la barra de estado. |
| `expo-location` | GPS: ubicación del reporte, velocidad, geocercas y distancia a la visita. |
| `expo-notifications` | Notificaciones locales con sonido y vibración (recordatorios, alarmas de pausa, avisos). |
| `expo-image-picker` | Abrir la cámara para fotos de la tarea, selfie, documentos e incidentes. |
| `expo-image-manipulator` | Reducir y comprimir las fotos antes de guardarlas o enviarlas. |
| `expo-secure-store` | Guardar cifrado el vínculo del celular y la huella del PIN. |
| `expo-crypto` | Huella SHA-256 del PIN e identificadores aleatorios. |
| `expo-device` | Modelo y sistema del celular (para vincularlo). |
| `expo-file-system` | Guardar fotos de documentos y registros del día de forma permanente. |
| `expo-sensors` | **Podómetro** (pasos) para saber si va a pie o en vehículo, con muy poco gasto de batería. |
| `react-native-maps` | Mapas dentro de la app (visitas, geocercas, recorrido). |
| `@react-native-community/datetimepicker` | Calendario para elegir fechas (historial, vencimientos). |

Comando para instalarlas todas (en `apps/mobile`):

```bash
npx expo install expo-location expo-notifications expo-image-picker expo-image-manipulator expo-secure-store expo-crypto expo-device expo-file-system expo-sensors react-native-maps @react-native-community/datetimepicker
```

### 5.2 Panel web

| Librería | Para qué se usa en MiRuta |
|---|---|
| `react` / `react-dom` | Construir la interfaz web. |
| `vite` | Servidor de desarrollo rápido y compilación para publicar (`npm run build`). |
| `@vitejs/plugin-react` | Permite a Vite entender React (JSX). |
| `leaflet` | Mapas interactivos con OpenStreetMap (gratis). |
| `react-leaflet` | Usar Leaflet como componentes de React. |
| `react-icons` | Íconos (Feather `fi` en el panel; Ionicons `io5` para mostrar los mismos íconos de la app). |

**Sin librerías extra:** Excel y PDF se generan con código propio (`utils/exportar.js`), y las direcciones se buscan con la API pública de Nominatim.

### 5.3 Servidor y servicios externos (todos con plan gratuito)

| Servicio | Uso |
|---|---|
| **Supabase** | Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions y `pg_cron`. |
| **OpenStreetMap** | Mapas del panel web. |
| **Nominatim** | Convertir direcciones en puntos y al revés. |
| **Cloudflare** (planeado) | Publicar la web (Pages) y guardar fotos (R2, 10 GB gratis). |

---

## 6. Base de datos (Supabase)

Las migraciones se ejecutan **en orden** en el SQL Editor de Supabase (o con `supabase db push`). Cada una agrega una parte:

| Migración | Qué agrega |
|---|---|
| `0001_esquema_inicial` | Empresas, perfiles y roles, trabajadores, vehículos, horarios, puntos GPS, geocercas, alertas; PostGIS y RLS por empresa. |
| `0002_reportes_actividad` | Reportes de actividad cada hora con fotos. |
| `0003_celular_vinculado` | Celular vinculado, código de activación y PIN; solo el celular vinculado puede enviar datos. |
| `0004_reporte_en_su_hora` | El reporte solo se acepta dentro de su hora (hora del servidor) y "No reportó" automático. |
| `0005_indicadores_desempeno` | Km, velocidades, excesos y eficiencia. |
| `0006_cierre_jornada` | Guarda los indicadores al cerrar el día. |
| `0007_horas_extras` | Inicio y fin de horas extras con la hora del servidor, reportes y alertas. |
| `0008_programacion_visitas` | Rutas, obras y zonas; llegada y salida por GPS; notificaciones al trabajador. |
| `0009_registro_geocerca_visitas` | Entradas y salidas por geocerca, tolerancia y alerta de salida del área. |
| `0010_cierre_reportes_jornada` | Cierre de reportes al terminar la jornada (+1 hora de margen). |
| `0011_documentos_sst_eliminacion` | Documentos con versiones, rol SST, avisos de vencimiento y eliminación del perfil. |
| `0012_permisos_por_rol` | Catálogo de permisos y permisos por rol (interruptores). |
| `0013_desplazamiento` | A pie, en vehículo o quieto: km y tiempos por jornada y por geocerca. |
| `0014_inicio_jornada_pausas_incidentes` | Salud y preoperacional configurables, pico y placa, pausas, incidentes, apagado del GPS, horas excluidas, ausentismo y alertas con sonido. |
| `0015_notificaciones_logo_empresa` | Constancia de entrega y lectura de cada notificación y logo de la empresa (bucket `logos`). |

Funciones importantes que viven en el servidor:
- `celular_valido()`: solo el celular vinculado puede enviar datos.
- `marcar_no_reporto()`: se ejecuta cada minuto con `pg_cron` y se salta las horas excluidas o posteriores a un apagado.
- `alertar_formularios_pendientes()`: avisa si a los 30 min no llenó salud y preoperacional.
- `apagar_gps()`: revisa el permiso y el comentario y cierra la jornada.
- `tiene_permiso('clave')`: dice si el rol del usuario tiene un permiso encendido.
- `marcar_notificaciones_leidas()`: guarda la hora de lectura una sola vez.
- `guardar_logo_empresa()`: guarda o quita el logo de la empresa.

---

## 7. Permisos por rol (interruptores)

Cada función tiene una **clave**. En el código se usa así:

```jsx
<Permiso clave="pausas.usar">
  <TarjetaPausas />
</Permiso>

if (puede('web.gps.apagar')) { … }
```

- **App:** catálogo en `apps/mobile/src/config/permisos.js`. Por ahora el trabajador tiene todos encendidos. Algunos ejemplos: `reportes.enviar`, `horasExtra.usar`, `visitas.ver`, `salud.reportar`, `preoperacional.diligenciar`, `pausas.usar`, `incidentes.reportar`, `desplazamiento.ver`, `notificaciones.ver`, `seguridad.cambiarPin`, `perfil.solicitarEliminacion`.
- **Web:** catálogo y valores iniciales por rol en `apps/web/src/config/permisos.js`:

| Permiso web | Admin | Supervisor | SST |
|---|:-:|:-:|:-:|
| `web.configuracion.general` (velocidad, eficiencia, geocercas) | ✅ | | |
| `web.formularios.configurar` (salud y preoperacional) | ✅ | | |
| `web.pausas.configurar` | ✅ | | ✅ |
| `web.empresa.logo` | ✅ | | |
| `web.salud.verRespuestas` (dato sensible) | ✅ | ✅ | ✅ |
| `web.preoperacional.ver` · `web.pausas.ver` · `web.incidentes.ver` | ✅ | ✅ | ✅ |
| `web.gps.apagar` | ✅ | ✅ | ✅ |
| `web.ausentismo.ver` · `web.notificaciones.ver` | ✅ | ✅ | ✅ |
| `web.reportes.excluirHoras` | ✅ | ✅ | ✅ |

- En el servidor son las tablas `permisos_catalogo` y `permisos_rol`. El servidor vuelve a revisar cada permiso, así que no basta con ocultar un botón en la pantalla.
- Para agregar una función nueva: 1) crear su clave en `config/permisos.js`, 2) envolverla con `<Permiso>` o `puede()`, 3) agregarla al catálogo en una migración.

> "Supervisor" = **Jefe de servicio técnico**. El nombre final se define con los perfiles de la web.

---

## 8. Dónde se cambia cada regla

| Quiero cambiar… | Archivo |
|---|---|
| Modo demo, versión, créditos del menú | `apps/mobile/src/config/app.js` y `version` en `apps/mobile/app.json` |
| Reglas del reporte (hora de más, aviso 10 min, fotos, compresión, servidor de hora) | `apps/mobile/src/config/reportes.js` |
| PIN (largo, intentos, minutos para volver a pedirlo) | `apps/mobile/src/config/seguridad.js` |
| Límite de velocidad y colores de eficiencia | Web → Configuración (en la app: `config/indicadores.js`) |
| Preguntas de salud, checklist preoperacional | Web → Configuración (en la app: `config/formularios.js`) |
| Pausas (nombre, ícono, duración en min u horas) y pausa activa | Web → Configuración → Pausas (en la app: `PAUSAS_EJEMPLO` en `config/formularios.js`) |
| Detección a pie / vehículo / quieto | `apps/mobile/src/config/desplazamiento.js` |
| Días de aviso de vencimiento de documentos | `apps/mobile/src/config/documentos.js` |
| Textos de privacidad y términos | `apps/mobile/src/config/legal.js` |
| Texto de la autorización de datos | `apps/mobile/src/constants/autorizacion.js` |
| Colores | `apps/mobile/src/theme/colors.js` · `apps/web/src/theme/styles.css` |
| Permisos por rol | `apps/mobile/src/config/permisos.js` · `apps/web/src/config/permisos.js` |

---

## 9. Instalar y ejecutar

**Requisitos:** Node.js 20 o superior, Git y, para la app, **Expo Go** en el celular (Android o iPhone).

### Panel web

```bash
cd apps/web
npm install
npm run dev
```

Abre http://localhost:5173 y pulsa **Entrar (demo)**.

### App móvil

1. Conecta el celular y el computador a la **misma red Wi-Fi**.
2. En el computador:

```bash
cd apps/mobile
npm install
npx expo install --fix
npx expo start -c
```

3. Escanea el código QR con Expo Go (en iPhone, con la cámara). Si no conecta, usa `npx expo start --tunnel`.

### Variables de entorno (para cuando se conecte Supabase)

Copia `.env.example` como `.env` en `apps/mobile` y en `apps/web` y llena:

```
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# apps/web/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Publicar la web

```bash
cd apps/web
npm run build      # genera la carpeta dist/ lista para Cloudflare Pages
```

---

## 10. Probar la demo

**App móvil**
- En *Activa tu celular*, toca un ejemplo: **Carlos** se vincula; **Diego** se rechaza porque ya tiene otro celular.
- Crea un PIN (no 1234 ni 1111), acepta la autorización y los permisos, y toma u omite las fotos de documentos.
- Llena el **estado de salud** y el **preoperacional** para ver la pestaña Jornada.
- La campana trae 3 notificaciones de ejemplo.
- En *Incidentes* hay un botón de demo que simula que SST apaga el GPS.
- En ☰ → *Seguridad* está "Desvincular este celular (solo en la demo)" para empezar de cero.

**Panel web**
- **Ver como (demo)**, en el menú lateral: prueba qué ve cada perfil.
- Para volver a los valores iniciales, borra los datos del sitio en el navegador. Lo configurado se guarda en `localStorage`.

---

## 11. Seguridad y datos personales

- **Nunca subas el archivo `.env`** a GitHub: ya está en `.gitignore`. Antes de cada `git push`, revisa con `git status` que no aparezca.
- El PIN no se guarda: solo su huella cifrada. El celular queda vinculado y solo él puede enviar datos.
- La ubicación se registra **solo dentro del horario** y de las horas extras que inicia el trabajador (Ley 2191 de 2022, desconexión laboral).
- **Datos sensibles** (Ley 1581 de 2012): las respuestas de salud y los exámenes médicos solo los ven los perfiles con permiso. La autorización se guarda con su versión y fecha.
- Antes de usar la app con trabajadores reales, un abogado debe revisar los textos de autorización, privacidad y términos (`constants/autorizacion.js`, `config/legal.js`).
- Las fotos se comprimen y se planea borrarlas a los 90 días para no superar el almacenamiento gratuito (ver `docs/definicion.md`).

---

## 12. Convenciones del código

- **Todo en español:** nombres de archivos, variables, funciones y comentarios.
- **Formato:** Prettier (`.prettierrc` en cada app).
- **Nombres:** pantallas `XxxScreen`, contextos `XxxContext` con su hook `useXxx()`, cálculos puros en `utils/`, reglas en `config/`.
- **Datos:** las pantallas solo usan `services/api.js`; nunca importan `data/mock.js` directamente.
- **Permisos:** toda función nueva lleva su clave de permiso.
- **Base de datos:** cada cambio va en una **migración nueva** (`0016_…`). Las migraciones anteriores no se modifican una vez aplicadas.
- **Commits:** un mensaje corto en español que diga qué cambió (por ejemplo: `pausas configurables desde la web con permisos`).

---

## 13. Pendientes y hoja de ruta

- [ ] **Conectar Supabase:** cambiar `services/api.js` en la app y en la web, aplicar las migraciones 0001 → 0015 y crear las tareas de `pg_cron`.
- [ ] **Rastreo GPS en segundo plano** por horario y cola sin señal (`services/rastreo.js`). Necesita un *development build*: no funciona en Expo Go.
- [ ] **Perfiles de la web** (Superadministrador, Administrador de empresa, Jefe de servicio técnico, SST) con inicio de sesión real, y pantalla para encender o apagar todos los permisos por rol.
- [ ] Alerta **con sonido** en la web mediante Realtime.
- [ ] Reconocimiento de actividad del sistema (Activity Recognition / Core Motion) como señal extra para a pie / vehículo.
- [ ] Reconocimiento facial **opcional**, con prueba de vida (dato biométrico, requiere autorización expresa).
- [ ] Fotos en Cloudflare R2 y borrado a los 90 días.
- [ ] Revisión legal de autorizaciones y textos.
- [ ] Publicar la app en Google Play y App Store.

---

## 14. Solución de problemas

| Problema | Solución |
|---|---|
| `npm install` falla por versiones de React | Verifica que exista `apps/mobile/.npmrc` con `legacy-peer-deps=true`. |
| Expo Go dice que una librería no es compatible | `npx expo install --fix` y vuelve a abrir con `npx expo start -c`. |
| El celular no conecta con el QR | Misma red Wi-Fi o `npx expo start --tunnel`. |
| Falta un módulo (`expo-sensors`, `expo-file-system`, `react-native-maps`…) | Ejecuta el comando de la sección 5.1. |
| No suenan las notificaciones | Revisa el permiso de notificaciones y que el celular no esté en "No molestar". En Android, el canal se llama "Reportes de actividad". |
| Aviso "El reloj de tu celular está corrido" | Activa la hora automática del celular. La app igual usa la hora del servidor. |
| La web muestra datos viejos de configuración | Borra los datos del sitio (localStorage) en el navegador. |
| Quiero empezar la app desde cero | ☰ → Seguridad → "Desvincular este celular (solo en la demo)". |

---

**Autor:** Xavier Rúa Domínguez · Medellín, Colombia · xavier.rua@gmail.com
© Todos los derechos reservados.