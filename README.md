# MiRuta

Plataforma multiempresa para monitorear en tiempo real a los trabajadores de campo con el GPS de su celular: ubicación en vivo, recorridos, kilometraje, geocercas, alertas y gestión de vehículos.

> **Estado actual:** prototipo visual con **datos de ejemplo** (sin backend todavía). El esquema de base de datos para Supabase ya está en `supabase/migrations`.

## Funciones

**App móvil (trabajador)**
- **Ingreso seguro:** la cuenta queda vinculada a un solo celular con un código de activación que genera el administrador; luego se entra con un PIN. Si alguien intenta usar la cuenta en otro celular, se bloquea y se avisa al administrador. 5 PIN incorrectos bloquean la app.
- Rastreo GPS que se enciende y apaga solo según el horario laboral (pendiente: GPS real en segundo plano).
- Pestaña **Jornada**: estado del rastreo, km y visitas del día y **reportes de actividad cada hora**. (Último envío, puntos sin enviar y batería solo los ve el administrador).
- **Reporte de actividad**: descripción de la tarea, 1 a 3 fotos (cámara), selfie solo con cámara frontal, fecha, hora y GPS automáticos. Las fotos se comprimen antes de enviarse.
- Cada reporte se envía solo dentro de su hora (el de 9:00, entre 9:00 y 9:59), validado con la **hora del servidor**. Si no se envía, queda **"No reportó"**. El último reporte del día tiene **una hora de más** (si el horario termina a las 5:00 p. m., se puede enviar hasta las 6:00 p. m.). Después aparece **"Jornada finalizada"**, se detienen los recordatorios y el servidor rechaza cualquier reporte, salvo durante horas extras activas. Todo con la hora de Colombia (UTC-5) y el horario que configura el administrador.
- Notificaciones con **sonido y vibración**, aunque la app esté cerrada: cuando se abre la hora, 10 minutos antes de cerrar, al enviar y cuando no se reportó.
- Pestaña **Jornada**: 4 indicadores con el mismo diseño (2 por fila en celular, 4 en pantallas anchas): recorrido, visitas, **eficiencia del día** (verde ≥ 90 %, naranja ≥ 70 %, rojo) y **velocidad actual** en km/h (verde, naranja cerca del límite, rojo en exceso). Cada exceso se registra con hora, ubicación y velocidad.
- **Horas extras:** botones *Iniciar* y *Finalizar horas extras* en Jornada, solo después de terminar la jornada normal y con la hora del servidor. Mientras estén activas, el reporte de actividad funciona igual (cada hora, solo dentro de su hora, "No reportó" y recordatorios con sonido). El administrador recibe un aviso al iniciar y al finalizar.
- **Visitas de hoy:** solo las que programó el administrador para ese día (ruta, obra o zona), con estado *Pendiente*, *En curso* (ruta empezada), *Cumplida* (el GPS confirmó la llegada) o *No cumplida* (terminó la jornada sin llegar). Al tocarla se ven los detalles; en **Ubicación**, el mapa con el punto y la geocerca, tu ubicación actual, la distancia hasta el lugar y el botón **Cómo llegar** (Google Maps o Waze). Con más de una visita, **Ver todas en el mapa**: numeradas por hora y con color por estado (amarillo pendiente, verde cumplida, rojo no cumplida). Notificación con sonido cuando le asignan, cambian o cancelan una visita.
- **Registro automático por geocerca** (obra y zona): cada entrada y salida queda por separado, el tiempo dentro es la suma de todos los periodos y el mapa muestra el recorrido con las entradas (verde) y salidas (rojo). La salida se confirma después de la tolerancia que configura el administrador (por defecto 3 min) y queda con la hora en que salió. El trabajador no puede modificar estos registros. Si sale y es su única visita del día, recibe una notificación con sonido y el administrador una alerta con su nombre, la hora y la ubicación.
- Pestaña **Historial**: selector Día / Semana / Mes / Rango y filtros del período (**Horas extras**, **Kilometraje**, **Eficiencia** y **Excesos**) con el total y el detalle por día; rango Desde–Hasta con calendario, km, lugares visitados (zona, cliente u obra), reportes y eficiencia de cada día y del periodo, y visitas programadas de cada día con llegada, salida, permanencia y si se cumplieron.
- Pestaña **Mi perfil**: datos, horario y autorización de datos.
  - **Mi vehículo**: foto y vencimiento del SOAT, licencia, matrícula y técnico-mecánica, con color por estado (🟢 vigente, 🟠 vence en 15 días o menos, 🔴 vencido). Se toman con la cámara al registrarse y se actualizan al renovarlos (se conserva la versión anterior).
  - **Documentos adicionales** (ARL, planilla, alturas, espacios confinados, exámenes médicos): solo lectura; los sube SST desde la web. Los exámenes médicos solo los ven el trabajador, SST y el administrador.
  - Avisos con sonido 15 días antes y el día que vence cada documento.
  - **Eliminar mi perfil**: envía una solicitud que el administrador debe aprobar.

**Panel web (administrador y supervisor)**
- Mapa en vivo con la foto de cada trabajador, el color de su estado, batería, último envío y puntos sin enviar.
- **Historial y km** por trabajador (día, semana, mes o rango): km, velocidad promedio y máxima, excesos de velocidad y eficiencia de reportes con color (verde / naranja / rojo).
- **Historial: filtros del período** (horas extras, kilometraje, eficiencia y excesos de velocidad) para un trabajador o para todos, con resumen comparativo, detalle por día y descarga en **Excel (.xlsx)** o **PDF**, sin librerías extra.
- **Horas extras**: total por día, semana, mes o rango, por trabajador y por sesión (inicio, fin, horas, km y reportes), en morado para diferenciarlas de la jornada normal.
- **Programación**: asignar rutas (puntos en orden), obras (un lugar con radio) y zonas (área en el mapa) a uno o varios trabajadores, con fecha, hora estimada de llegada, ubicación por clic en el mapa o por dirección (se convierte sola en un punto, y al hacer clic se completa la dirección), geocerca ajustable (radio con deslizador, pines y esquinas del área que se arrastran, área automática alrededor del punto), descripción y repetición (una vez, diaria, lunes a viernes o semanal). Se pueden editar, cancelar, reactivar y reasignar. Pestaña **Cumplimiento de visitas** con cada entrada y salida, tiempo dentro, salidas del área y porcentaje de cumplimiento, y el detalle con el mapa del recorrido; también aparece en el historial de cada trabajador y las salidas del área en Alertas. La tolerancia de salida se ajusta en **Configuración**.
- **Desempeño**: comparativo de todos los trabajadores y registro de excesos de velocidad con hora, ubicación y velocidad.
- **Configuración**: límite de velocidad y rangos de color de la eficiencia.
- Trabajadores (con su celular vinculado: generar código de activación o desvincular), vehículos (con vencimiento de SOAT y técnico-mecánica), geocercas con hora de entrada y salida, historial y km, horarios.
- **Reportes de actividad**: filtro por trabajador, fechas y estado (reportó / no reportó), con detalle de fotos, selfie y GPS.
- Alertas: salida de geocerca, teléfono apagado, sin reporte de ubicación, reporte recibido, no reportó, documentos por vencer, entre otras.

## Permisos que pide la app móvil

| Permiso | Para qué |
|---|---|
| Cámara | Fotos de la tarea y selfie del reporte |
| Ubicación | Registrar el GPS en cada reporte y durante la jornada |
| Notificaciones | Recordar el envío del reporte cada hora |
| Almacenamiento seguro | Guardar cifrados el vínculo del celular y la huella del PIN |
| Galería (opcional) | Solo si se activa `permitirGaleriaTarea` en `src/config/reportes.js` |

## Estructura

```
MiRuta/
├── apps/
│   ├── web/                    Panel web (React + Vite + Leaflet) – administradores y supervisores
│   │   ├── index.html
│   │   └── src/
│   │       ├── components/     Piezas reutilizables (Avatar, Mapa, Modal, Sidebar…)
│   │       ├── config/         Configuración (claves de Supabase desde .env)
│   │       ├── constants/      Estados, tipos de alerta y sus colores
│   │       ├── context/        Sesión, empresa, pantalla actual y configuración de indicadores
│   │       ├── data/           Datos de ejemplo
│   │       ├── hooks/          Lógica reutilizable (useEmpresa)
│   │       ├── navigation/     Menú lateral y cambio de pantallas
│   │       ├── screens/        Pantallas (MapaVivo, Trabajadores, Vehículos, Reportes, Desempeño, Configuración…)
│   │       ├── services/       Acceso a datos (hoy datos de ejemplo, luego Supabase)
│   │       ├── theme/          Estilos
│   │       └── utils/          Funciones de apoyo (fechas)
│   └── mobile/                 App móvil (Expo + React Navigation) – trabajadores
│       ├── App.js
│       ├── index.js
│       └── src/
│           ├── components/     Dato, Seccion, Fila, CampoFecha, TarjetaReportes, TecladoPin
│           ├── config/         Claves de Supabase (.env), reglas de reportes y de seguridad
│           ├── constants/      Texto de la autorización y pasos de permisos
│           ├── context/        Sesión, pasos de ingreso y reportes enviados
│           ├── data/           Datos de ejemplo
│           ├── hooks/          useJornada, useFranjasHoy
│           ├── navigation/     AppNavigator (pasos de ingreso) y TabsNavigator (pestañas)
│           ├── screens/        Activacion, CrearPin, Login (PIN), Bloqueado, Consentimiento, Permisos,
│           │                   Jornada, Historial, Perfil,
│           │                   NuevoReporte, ReportesDia
│           ├── services/       api (datos), almacen (cifrado), dispositivo, pin, fotos, ubicacion,
│           │                   notificaciones, rastreo (pendiente)
│           ├── theme/          Colores
│           └── utils/          Fechas, formatos y cálculo de franjas de reportes
├── supabase/migrations/        0001: esquema multiempresa (Postgres + PostGIS + RLS)
│                               0002: reportes de actividad cada hora
│                               0003: celular vinculado + PIN
│                               0004: reporte solo en su hora (hora del servidor) y "No reportó"
│                               0005: indicadores (km, velocidades, excesos, eficiencia)
│                               0006: cierre de jornada (guarda eficiencia y velocidades del día)
│                               0007: horas extras (inicio/fin con hora del servidor, reportes y alertas)
│                               0008: programación de visitas (llegada/salida por GPS, no cumplidas y avisos)
│                               0009: entradas y salidas por geocerca, tolerancia y alerta de salida del área
│                               0010: cierre de reportes al terminar la jornada (+1 hora de margen) en el servidor
│                               0011: documentos con versiones, rol SST, avisos de vencimiento y eliminación del perfil
└── docs/                       Definición del proyecto y cálculo de almacenamiento
```

## Ver el panel web

Requisitos: Node.js 20 o superior.

```bash
cd apps/web
npm install
npm run dev
```

Abre http://localhost:5173 y pulsa **Entrar (demo)**.

**Para probar la app móvil:** en la pantalla *Activa tu celular* toca uno de los ejemplos (Carlos se vincula; Diego se rechaza porque ya tiene otro celular). En *Mi perfil* hay un enlace para desvincular el celular y repetir la prueba.

## Ver la app móvil en tu celular

1. Instala **Expo Go** en tu celular y conéctalo a la misma red Wi-Fi que el computador.
2. En el computador:

```bash
cd apps/mobile
npm install
npx expo install --fix
npx expo start -c
```

Si es la primera vez después de agregar los reportes de actividad, instala también:

```bash
npx expo install expo-image-picker expo-image-manipulator expo-location expo-notifications @react-native-community/datetimepicker expo-secure-store expo-crypto expo-device
```

Para guardar las fotos de los documentos en el celular:

```bash
npx expo install expo-file-system
```

Para el mapa del detalle de la visita:

```bash
npx expo install react-native-maps
```

3. Escanea el código QR con Expo Go. Si no conecta, usa `npx expo start --tunnel`.

> El archivo `.npmrc` (con `legacy-peer-deps=true`) evita errores de versiones de React al instalar.
> Los reportes y las fotos se guardan solo mientras la app está abierta hasta conectar Supabase. Ver el cálculo de almacenamiento de fotos en `docs/definicion.md`.
> En esta etapa la app no rastrea el GPS real. El rastreo en segundo plano y el encendido automático por horario necesitan un *development build* y llegan en la siguiente fase.
