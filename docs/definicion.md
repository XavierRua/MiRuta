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

## Permisos por rol

- Cada función de la app tiene su propio permiso ("interruptor") con una clave, por ejemplo `reportes.enviar` o `visitas.comoLlegar`. El catálogo está en `apps/mobile/src/config/permisos.js` y en la tabla `permisos_catalogo` (0012).
- La app solo muestra o permite una función si el rol del usuario tiene el permiso encendido. Hoy el trabajador los tiene todos.
- El administrador de cada empresa los enciende o apaga por rol desde la web (tabla `permisos_rol`), sin cambiar el código.
- No son permisos (siempre están): la autorización de datos (Ley 1581), cerrar sesión, el estado del rastreo y el registro de documentos del vehículo.
- Regla para cada función nueva: agregar su clave al catálogo (app y 0012) y envolverla con `<Permiso clave="…">` o `puede('…')`.

## A pie, en vehículo o quieto

- La app combina los **pasos del podómetro** (sensor del celular, gratis y de muy bajo consumo; `expo-sensors`) con la **velocidad del GPS**: 40 pasos/min o más y menos de 9 km/h = a pie; 12 km/h o más = vehículo; sin pasos y menos de 2 km/h = quieto.
- **Sin cambios falsos**: un cambio solo se acepta si se sostiene (a pie 40 s, vehículo 20 s, quieto 60 s). Un vehículo detenido sin pasos (semáforo, trancón) sigue siendo "vehículo" hasta 3 minutos.
- **Batería**: el podómetro solo se escucha mientras hay GPS y se apaga 60 s después de la última lectura; no pide puntos de GPS adicionales. Los tiempos dentro de las geocercas se guardan en el celular cada 30 s, no en cada lectura.
- **Mapa**: 🚶 a pie, 🏍️/🚗 según el vehículo asignado, ⏸️ quieto; la línea del recorrido va verde punteada a pie y azul en vehículo, con leyenda.
- **Registro**: por jornada, km y tiempo a pie y en vehículo; por geocerca de visita, minutos a pie / en vehículo / quieto y cómo entró y salió (también si salió a pie).
- **Permiso**: `desplazamiento.ver`.
- **Pendiente con la app instalable (Día 5)**: el reconocimiento de actividad del sistema (Activity Recognition de Android y Core Motion de iPhone) necesita un módulo nativo; se sumará al clasificador como una señal más. Mientras tanto, el podómetro + GPS ya distinguen los tres casos.

## Inicio de jornada, pausas, incidentes y ausentismo

> "Supervisor" = Jefe de servicio técnico (el nombre final se define con los perfiles de la web).

- **Inicio obligatorio**: al abrir la app el trabajador llena el **estado de salud** y luego el **preoperacional** (vehículo propio, de la empresa o ninguno). Hasta terminar no ve tareas ni visitas, pero el **GPS arranca igual** a la hora de inicio del horario. Si a los 30 min (configurable) no los ha llenado: alerta al administrador, supervisor y SST.
- **Estado de salud** al inicio y al final (desde 30 min antes del fin). Preguntas configurables en la web. "No apto" → alerta con sonido a administrador, supervisor y SST, que pueden apagarle el GPS. Ver las respuestas es un permiso aparte (`web.salud.verRespuestas`): son datos sensibles (Ley 1581), se necesita la autorización del trabajador y revisión legal antes de producción.
- **Preoperacional**: lista configurable por tipo de vehículo (moto, carro, camión); un ítem "Mal" exige observación y alerta al supervisor y administrador. **Pico y placa**: los días se configuran en Mi perfil (vehículo propio) o en la web (vehículos de la empresa); ese día el vehículo no puede salir. El vehículo elegido define el ícono y los km del recorrido.
- **Pausas**: desayuno, almuerzo, pausa activa y otras (capacitaciones, reuniones). Se cierran solas al cumplir el tiempo configurado, con alarma. Recordatorio de pausa activa cada 2 horas (configurable). Quedan en el historial y en los informes de la web. **Se configuran en la web** (Configuración → Pausas y descansos del trabajador): nombre, ícono, grupo (tarjeta propia o dentro de "Otras"), duración en minutos u horas, activa o no, y cada cuánto se recuerda la pausa activa. Lo puede hacer el administrador y los perfiles a los que les encienda el permiso `web.pausas.configurar` (por defecto SST).
- **Incidentes**: tarjeta debajo de horas extras. Descripción, fotos opcionales, si puede continuar; fecha, hora y GPS automáticos. Alerta con sonido.
- **Apagado manual del GPS**: solo perfiles con `web.gps.apagar`; comentario obligatorio (mínimo 15 caracteres); queda quién, cuándo y por qué. Cierra la jornada del trabajador y detiene los recordatorios de reportes.
- **Horas excluidas**: desde Reportes, los perfiles con `web.reportes.excluirHoras` excluyen un rango (p. ej. capacitación); esas horas no se piden ni afectan la eficiencia.
- **Ausentismo**: menú "Novedades y ausentismo" de la web, por trabajador y período, descargable en Excel o PDF.
- **Permisos** (cada uno se enciende por rol): app `salud.reportar`, `preoperacional.diligenciar`, `perfil.picoPlaca.editar`, `pausas.usar`, `incidentes.reportar`; web `web.configuracion.general`, `web.pausas.configurar`, `web.salud.verRespuestas`, `web.preoperacional.ver`, `web.pausas.ver`, `web.incidentes.ver`, `web.gps.apagar`, `web.ausentismo.ver`, `web.reportes.excluirHoras`, `web.formularios.configurar`.
- **Servidor**: migración 0014.

## Encabezado de la app: logo, notificaciones y menú

- **Encabezado igual en todas las pestañas**: menú (☰) a la izquierda, logo de la empresa y campana de notificaciones a la derecha.
- **Logo de la empresa**: lo sube o cambia el administrador en la web (Configuración → Logo de la empresa; permiso `web.empresa.logo`). PNG, JPG, WEBP o SVG de máximo 1 MB. Si la empresa no tiene logo, la app muestra el de MiRuta.
- **Campana**: contador de notificaciones sin leer; la lista va de la más reciente a la más antigua, con filtro "Sin leer" y "Marcar todas como leídas". Llegan todas: recordatorios y estado de los reportes, excesos de velocidad, visitas asignadas/modificadas/canceladas, documentos por vencer o vencidos, salida del área de la única visita del día, pausas y cierre de la jornada. Los avisos programados en el celular (p. ej. "Te quedan 10 minutos") entran a la lista cuando llega su hora; si se cancelan (envió el reporte), no aparecen.
- **Constancia de lectura**: al marcarla como leída se guarda la hora en el servidor (la pone el servidor, no el celular, y no se puede cambiar). En la web: Novedades y ausentismo → Notificaciones (enviadas, leídas, sin leer, % de lectura y tiempo para leerlas), con descarga en Excel o PDF. Permiso `web.notificaciones.ver`.
- **Menú lateral (☰)**: arriba "Seguridad" (cambiar contraseña = PIN, y eliminar la cuenta, que salió de Mi perfil); abajo Política de privacidad, Términos y condiciones, Tratamiento de datos personales y Cerrar sesión (también salió de Mi perfil). Pie: Xavier Rúa Domínguez · Medellín, Colombia · xavier.rua@gmail.com · © Todos los derechos reservados · Versión (se toma sola de `app.json`).
- **Permisos de la app**: `notificaciones.ver`, `seguridad.cambiarPin`, `perfil.solicitarEliminacion`.
- **Servidor**: migración 0015.

## Pausas, actividades autorizadas y extensión de la ventana de reporte

- **Tiempos por empresa** (web → Configuración → Pausas de descanso; permiso `web.pausas.configurar`): duración del desayuno y del almuerzo y cuántas veces por jornada (1 por defecto: no se pueden repetir). La **pausa activa es una bolsa de minutos del día** (por defecto 30) que el trabajador reparte como quiera (por ejemplo 6 pausas de 5 min), con un máximo por pausa (por defecto 10); si termina antes, lo que no usó queda en la bolsa.
- **Pausas de descanso**: el trabajador marca el inicio; se cierran solas al cumplir el tiempo, con alarma. Durante la pausa el botón "Enviar reporte" se desactiva y no suenan recordatorios de reporte.
- **Extensión**: las ventanas siguen fijas en pantalla (8:00–9:00, 9:00–10:00…). La pausa solo extiende la ventana en la que cae, exactamente por los minutos que cayeron dentro de ella:
  - desayuno 8:00–8:15 → la ventana de 8:00 cierra a las 9:15; la de 9:00 sigue igual;
  - desayuno 8:50–9:05 → ventana 8:00 hasta 9:10 y ventana 9:00 hasta 10:05;
  - varias pausas en una ventana: se suman;
  - pausa que cubre toda la ventana (almuerzo de 12:00 a 13:00): "En pausa – Almuerzo", no se pide ni cuenta en la eficiencia;
  - última ventana: la extensión se suma a su cierre (fin + hora de más) y la jornada cierra al vencer;
  - si vence la extensión sin reporte: "No reportó" (sí afecta la eficiencia).
- **Mensajes** en la tarjeta de reportes: durante la pausa "Desayuno en curso. Tienes +15 min para enviar el reporte." (o "Estás en capacitación. Tienes +30 min…"); al terminar, "Ventana 8:00 extendida hasta las 9:15 por desayuno"; si cae entre dos ventanas, la extensión de cada una.
- **Actividades autorizadas** (capacitación, reunión, cita médica, diligencia autorizada y las que se agreguen): solo aparecen en la app cuando un perfil con el permiso `web.actividades.autorizar` las habilita en la web (menú Actividades autorizadas) a un trabajador para una fecha, con **tiempo libre** (cronómetro, la termina el trabajador) o **tiempo asignado** (alarma y cierre automático). El trabajador recibe una notificación con sonido. Funcionan con la misma extensión de las pausas.
- **Dos registros separados**: (a) el reporte de actividad con su nota ("Reporte 8:00–9:00 · Enviado a las 9:10 · Extendido +15 min por desayuno") y (b) el registro de pausas y actividades (tipo, inicio, fin, duración y quién autorizó). Los dos se ven en el historial de la app y en la web (Reportes de actividad; Novedades → Pausas y actividades, con resumen por trabajador —tiempo total de descanso, almuerzo promedio, quién excede el almuerzo— y descarga en Excel o PDF; Historial y km).
- **Permisos independientes**: `web.pausas.configurar` y `web.actividades.autorizar` en la web; `pausas.usar` y `actividades.usar` en la app.
- **Servidor**: migración 0016 (todas las validaciones con `now()` y hora de Colombia).
