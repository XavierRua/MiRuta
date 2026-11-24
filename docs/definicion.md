# MiRuta – Definición del proyecto (resumen)

## Decisiones
- Plataforma **multiempresa** (superadministrador, administrador de empresa, supervisor, trabajador). Por ahora se desarrolla; la comercialización es una etapa posterior.
- El rastreo GPS se **enciende y apaga automáticamente** según el horario laboral de cada trabajador. No hay botón de iniciar/terminar. Fuera del horario no se recoge ubicación (Ley 2191 de 2022).
- **Geocercas** desde el MVP: zonas permitidas (alerta al salir) y puntos de visita, con hora de entrada, hora de salida y permanencia.
- **Alertas:** salida de geocerca, teléfono apagado (por la persona o por batería, como inferencia), reinicio, sin reporte, rastreo no iniciado, GPS desactivado, batería baja, detenido, exceso de velocidad, ubicación falsa y documentos por vencer.
- Vehículos con documentos (SOAT, técnico-mecánica, tarjeta de propiedad, licencia) y vencimientos; moto propia → reporte de km para auxilio de rodamiento.
- Funcionamiento sin señal (cola local) y consentimiento registrado por versión (Ley 1581 de 2012).

## Tecnologías
- App móvil: Expo (React Native) + expo-location + expo-task-manager + módulo nativo para horario y eventos de apagado (development build).
- Panel web: React + Vite + Leaflet/MapLibre, alojado en Cloudflare Pages.
- Backend: Supabase (Auth, Postgres + PostGIS, Realtime, Storage, Edge Functions, pg_cron) con RLS por empresa.
- Mapas: OpenStreetMap en desarrollo; Protomaps (PMTiles en Cloudflare R2) en producción.

## Plan
0. Definición (1 semana)
1. MVP Android (6–8 semanas): empresas y roles, registro con fotos, consentimiento, rastreo automático por horario, cola sin señal, mapa en vivo, km por jornada, geocercas, alertas de salida y apagado. Piloto con 3–5 trabajadores.
2. Operación (3–4 semanas): historial semana/mes, reportes Excel y PDF, documentos con vencimientos, supervisores, horas extra, ubicación falsa, limpieza de puntos.
3. Alertas avanzadas e iOS (3–4 semanas).
4. Comercialización: alta de empresas, planes y cobro, planes pagos de los servicios, map-matching.

## Reportes de actividad cada hora
- Cada hora del horario es una franja. El trabajador envía: descripción, 1–3 fotos de la tarea (cámara), selfie (cámara frontal, nunca galería) y GPS; fecha y hora las pone el servidor.
- **Solo dentro de su hora:** el reporte de 9:00 se acepta entre 9:00 y 9:59 según la **hora del servidor** (no la del celular). Pasada la hora se rechaza y queda **"No reportó"**.
- La app calcula la hora oficial con el encabezado HTTP `Date` del servidor y avisa si el reloj del celular está corrido. Sin conexión no se puede enviar (no hay forma de verificar la hora).
- En la base de datos, un trigger vuelve a validar con `now()` y guarda la hora del servidor (0004). Los reportes no se pueden editar.
- Notificaciones locales con sonido y vibración (también con la app cerrada): al abrir cada hora, 10 min antes de cerrar, al cerrar sin reporte ("No reportaste") y al enviar ("Reporte enviado"). Se programan para hoy y mañana (máx. 60 por límite de iPhone).
- Fotos comprimidas en el celular: tarea 1024 px / JPEG 50 % (~100–180 KB), selfie 480 px (~25–45 KB).

### Almacenamiento (planes gratuitos)
- Un reporte típico (2 fotos + selfie) pesa ~300 KB. 10 reportes/día ≈ 3 MB por trabajador al día.
- 20 trabajadores × 26 días ≈ 1,5 GB al mes → supera el 1 GB gratis de Supabase Storage en menos de un mes.
- Decisión recomendada: guardar las fotos en **Cloudflare R2** (10 GB gratis) y conservar las fotos 90 días (`fotos_para_borrar`), dejando para siempre el texto, la hora y el GPS de cada reporte.

## Ingreso del trabajador: celular vinculado + PIN
- **Primera vez:** el administrador genera en la web un código de activación (6 dígitos, un solo uso, vence en 24 h). El trabajador escribe código de empresa, cédula y código → su cuenta queda vinculada a ese celular → crea un PIN de 4 dígitos (se rechazan 1111, 1234, 4321…).
- **Cada ingreso:** solo el PIN. Tras 5 minutos en segundo plano, la app vuelve a pedirlo.
- **Otro celular:** si alguien intenta activar la cuenta en otro equipo, se rechaza y se crea la alerta "Intento desde otro celular".
- **5 PIN incorrectos:** la app se bloquea y se avisa al administrador; se reactiva con un código nuevo.
- En el servidor, solo el celular vinculado puede enviar ubicación y reportes (`celular_valido()` en 0003).
- El PIN nunca se guarda: solo su huella SHA-256 con sal, cifrada en el celular (Keychain/Keystore).

### Reconocimiento facial (pendiente)
- Es un **dato biométrico sensible** (Ley 1581 de 2012). La SIC exige autorización previa, expresa e informada y **un mecanismo alternativo** para quien no la dé.
- Decisión: será **opcional**; quien no lo autorice sigue entrando con celular vinculado + PIN.
- Técnica prevista: prueba de vida (parpadeo/giro) con Google ML Kit y comparación facial dentro del celular. Requiere *development build* (no funciona en Expo Go).

## Indicadores de desempeño
- **Por jornada:** km recorridos, velocidad promedio (km ÷ horas en movimiento, sin contar paradas), velocidad máxima, excesos de velocidad y eficiencia de reportes.
- **Exceso de velocidad:** el administrador configura el límite (por defecto 60 km/h). Cada punto GPS por encima del límite crea un registro con hora, ubicación y velocidad, y una alerta. Si sigue por encima durante 5 minutos, cuenta como el mismo exceso y se guarda la velocidad más alta.
- **Eficiencia:** reportes enviados a tiempo ÷ reportes esperados. Verde ≥ 90 %, naranja ≥ 70 %, rojo por debajo; los rangos los ajusta el administrador.
- **Web:** *Historial y km* (un trabajador; día, semana, mes o rango), *Desempeño* (comparativo de todos + registro de excesos) y *Configuración* (límite y rangos).
- **El trabajador ve su eficiencia:** en *Jornada* ("Mi eficiencia de hoy", calculada con las horas ya cerradas), en *Historial* (por jornada y del periodo) y en el detalle de cada día. El administrador la ve en el mapa (eficiencia de hoy), en *Historial y km* y en *Desempeño*.
- La app del trabajador no muestra último envío, puntos sin enviar ni batería: solo el administrador los ve en el mapa.

### Indicadores en la app del trabajador
- *Jornada* muestra 4 tarjetas con el mismo diseño (círculo con ícono, valor, título y detalle): recorrido, visitas, **eficiencia del día** y **velocidad actual** (solo km/h, sin velocímetro).
- Eficiencia: reportes enviados ÷ horas que ya cerraron o ya se reportaron; se actualiza al enviar y cuando una hora queda "No reportó".
- Velocidad: GPS del celular cada ~2 s, solo con la pantalla abierta; por debajo de 3 km/h cuenta como detenido. Verde dentro del límite, naranja a 10 km/h o menos del límite, rojo por encima.
- Los rangos son los mismos de la Configuración del administrador (en la demo, `config/indicadores.js`).
- Al cerrar la jornada (`cerrar_jornadas_terminadas`, 0006) se guardan eficiencia, velocidad promedio y máxima; el trabajador las ve en *Historial* y el administrador en el mapa, *Historial y km* y *Desempeño*.
- Cada exceso de velocidad se registra (hora oficial, ubicación y velocidad máxima del episodio; un episodio dura mientras siga por encima del límite con pausas menores a 5 min) y aparece en el *Historial* del trabajador. En el servidor lo registra el trigger de 0005 y el administrador lo ve en *Desempeño* y en las alertas.
- Seguridad vial: el indicador de velocidad no emite sonidos ni avisos para no invitar a mirar el celular mientras se conduce.

## Horas extras
- En *Jornada*, botones **Iniciar horas extras** y **Finalizar horas extras** (tarjeta morada). Solo se pueden iniciar cuando terminó la jornada normal de hoy (`fin_horario_hoy`); en la demo también se permite en días sin jornada.
- Inicio y fin con la **hora del servidor**; sin conexión no se puede iniciar ni finalizar. La sesión activa se guarda cifrada en el celular para no perderse si se cierra la app.
- Al iniciar, el reporte de actividad se activa para ese periodo: franjas de una hora contadas desde el inicio (si empezó a las 17:23 → 17:23–18:23, 18:23–19:23…), mismas reglas (solo dentro de su hora, "No reportó") y los mismos recordatorios con sonido. Al finalizar se cancelan los recordatorios y se detiene el rastreo extra; la hora que quedó a medias no cuenta si no se reportó.
- Se guarda por sesión: inicio, fin, total de horas, km y reportes (esperados / enviados).
- Se muestran en **morado** para diferenciarlas de la jornada normal: tarjeta en Jornada, etiqueta "EXTRA" en los reportes, bloque en el Historial del trabajador; en la web, pantalla *Horas extras*, columna en *Historial y km* y fila en la ficha del mapa.
- El administrador recibe una alerta al iniciar y al finalizar (0007).
- Máximo diario configurable (`config/horasExtra.js`, 2 h por defecto): al superarlo se muestra un aviso. Ajustarlo a la norma laboral vigente y a la política de la empresa; normalmente las horas extras requieren autorización del empleador.

## Programación de visitas

- El administrador crea **rutas** (varios puntos en orden), **obras** (un lugar con radio, por defecto 100 m) y **zonas** (un área dibujada en el mapa). La ubicación se marca con clic en el mapa, buscando la dirección (Nominatim/OpenStreetMap, gratis, solo cuando el administrador busca) o usando una geocerca existente.
- Cada programación tiene uno o varios trabajadores, fecha, hora estimada de llegada, descripción y repetición: una vez, diaria (lunes a sábado), lunes a viernes o semanal con días elegidos, con fecha final opcional. Se puede editar, cancelar, reactivar y reasignar.
- Cada día se genera una **visita** por trabajador. El servidor la marca con los puntos GPS (no el celular, para que no se pueda falsear):
  - Obra: cumplida al estar a menos del radio. Zona: al entrar al área. Ruta: puntos en orden; *En curso* desde el primero y cumplida al llegar al último.
  - La salida se registra al alejarse el radio + 30 m durante 2 lecturas seguidas (evita el "temblor" del GPS). Permanencia = salida − llegada.
  - Si termina la jornada sin llegar queda **No cumplida** y el administrador recibe una alerta.
- El trabajador recibe una **notificación push con sonido** (Expo Push, gratis) cuando le asignan, cambian, cancelan o quitan una visita.
- El cumplimiento (programadas, cumplidas, no cumplidas, permanencia promedio) aparece en la web y en el historial del trabajador.

### Registro automático por geocerca (obra y zona)

- La geocerca la configura el administrador: radio de la obra o área de la zona en Programación.
- **Entrada:** se registra al entrar. **Salida:** al salir, pero solo se confirma si sigue fuera más que la **tolerancia** (Configuración, 1 a 15 min, por defecto 3); la hora registrada es la del momento en que salió. Si vuelve antes, se toma como un salto del GPS y el periodo sigue.
- Cada entrada y salida es un periodo aparte; el **tiempo dentro** del día es la suma de los periodos. Se guarda el recorrido para verlo en el mapa.
- **Salida del área asignada:** si es su única visita del día y sale durante la jornada, el trabajador recibe una notificación con sonido y el administrador una alerta con nombre, hora y ubicación. Con más visitas ese día no hay alerta (se entiende que va a la siguiente). Al terminar la jornada tampoco.
- Lo escribe solo el servidor con los puntos GPS (0009): el trabajador no tiene cómo crear, editar ni borrar estos registros.

## Documentos del trabajador y rol SST

- **Vehículo** (SOAT, licencia, matrícula, técnico-mecánica): el trabajador toma la foto de cada uno al registrarse (paso obligatorio después de los permisos) y la actualiza al renovarlo. Cada renovación es una versión nueva; las anteriores se conservan.
- **Adicionales** (ARL, planilla de seguridad social, alturas, espacios confinados, exámenes médicos): los sube y actualiza solo el rol **SST** desde la web; el trabajador solo los ve.
- **Privacidad**: los exámenes médicos solo los ven el trabajador, SST y el administrador (los supervisores no). SST solo accede a documentos y a sus alertas, no al GPS.
- **Avisos**: 15 días antes y al vencer, al trabajador (notificación con sonido), al administrador y a SST (alertas en la web).
- **Eliminación del perfil**: el trabajador la solicita y el administrador la aprueba. Se borran los datos personales y los documentos del vehículo; se conservan los registros que la ley exige (documentos de SST, Decreto 1072 de 2015: 20 años).
- **Tamaño de las fotos**: lado mayor 1400 px, JPEG al 55 % → unos 120–220 KB por documento. Cuatro documentos ≈ 0,8 MB por trabajador; con una renovación al año, unos 1,6 MB. El plan gratuito de Supabase (1 GB de archivos) alcanza para unos 500 trabajadores con dos años de historial, junto con las fotos de los reportes (ver el cálculo de reportes arriba).
- **Pendiente (web)**: pantallas del rol SST para subir y actualizar documentos por trabajador, y la aprobación de eliminaciones para el administrador.
