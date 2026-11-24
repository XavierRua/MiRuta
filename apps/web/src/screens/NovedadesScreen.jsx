import { useMemo, useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import FiltroPeriodo, { periodoInicial } from '../components/FiltroPeriodo';
import { useNovedades } from '../context/NovedadesContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';
import { descargarExcel, descargarPdf } from '../utils/exportar';
import { deTextoFecha, validarRango } from '../utils/fechas';
import { ausentismo, generarNovedades } from '../utils/novedades';
import { fechaCorta } from '../utils/filtrosHistorial';
import { usePermisos } from '../context/PermisosContext';

// Cada pestaña es un permiso independiente para los perfiles de la web (config/permisos.js, 0014 y 0015)
const PESTANAS = [
  { id: 'salud', texto: 'Estado de salud', permiso: 'web.salud.verRespuestas' },
  { id: 'preoperacional', texto: 'Preoperacional', permiso: 'web.preoperacional.ver' },
  { id: 'pausas', texto: 'Pausas', permiso: 'web.pausas.ver' },
  { id: 'incidentes', texto: 'Incidentes', permiso: 'web.incidentes.ver' },
  { id: 'apagados', texto: 'GPS apagados', permiso: 'web.ausentismo.ver' },
  { id: 'notificaciones', texto: 'Notificaciones', permiso: 'web.notificaciones.ver' },
  { id: 'ausentismo', texto: 'Ausentismo', permiso: 'web.ausentismo.ver' },
];

// Columnas de cada tabla: texto del encabezado, valor (para Excel/PDF) y cómo se ve (opcional)
const chip = (ok, si, no) => <span className={`chip ${ok ? 'ok' : 'danger'}`}>{ok ? si : no}</span>;
const COLUMNAS = {
  salud: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Momento', (x) => x.momento],
    ['Hora', (x) => x.hora + (x.tarde ? ' (tarde)' : '')],
    ['¿Cómo se siente?', (x) => x.animo],
    ['¿Apto?', (x) => x.apto, (x) => chip(x.apto === 'Sí', 'Sí', 'No apto')],
    ['Medicamento', (x) => x.medicamento],
    ['Observaciones', (x) => x.observaciones || '—'],
  ],
  preoperacional: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Hora', (x) => x.hora],
    ['Vehículo', (x) => `${x.uso} · ${x.placa}`],
    [
      'Resultado',
      (x) => (x.fallas.length ? `Falla: ${x.fallas.join(', ')}` : 'Todo bien'),
      (x) => chip(!x.fallas.length, 'Todo bien', `Falla: ${x.fallas.join(', ')}`),
    ],
  ],
  pausas: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Tipo', (x) => x.tipo],
    ['Inicio', (x) => x.inicio],
    ['Fin', (x) => x.fin],
    ['Minutos', (x) => x.minutos],
    ['Cierre', (x) => x.cierre],
  ],
  incidentes: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Hora', (x) => x.hora],
    ['Descripción', (x) => x.descripcion],
    ['Fotos', (x) => x.fotos],
    ['¿Continúa?', (x) => (x.puedeContinuar ? 'Sí' : 'No'), (x) => chip(x.puedeContinuar, 'Continúa', 'No continúa')],
    ['Ubicación', (x) => x.ubicacion],
  ],
  apagados: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Hora', (x) => x.hora],
    ['Apagado por', (x) => x.por],
    ['Origen', (x) => x.origen],
    ['Motivo (obligatorio)', (x) => x.motivo],
  ],
  notificaciones: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Enviada', (x) => x.enviada],
    ['Tipo', (x) => x.tipo],
    ['Notificación', (x) => `${x.titulo}: ${x.mensaje}`],
    [
      'Estado',
      (x) => (x.leida ? `Leída ${x.leidaA}` : 'Sin leer'),
      (x) => <span className={`chip ${x.leida ? 'ok' : 'warn'}`}>{x.leida ? `Leída ${x.leidaA}` : 'Sin leer'}</span>,
    ],
    ['Tardó en leerla', (x) => (x.minutosParaLeer != null ? `${x.minutosParaLeer} min` : '—')],
  ],
  ausentismo: [
    ['Fecha', (x) => fechaCorta(x.fecha)],
    ['Trabajador', (x) => x.persona],
    ['Hora', (x) => x.hora],
    ['Novedad', (x) => x.tipo],
    ['Detalle', (x) => x.detalle],
    ['Horas perdidas', (x) => (x.horasPerdidas != null ? x.horasPerdidas : '')],
  ],
};

// Novedades de la jornada del trabajador e informe de ausentismo, por trabajador y período, con descarga
export default function NovedadesScreen() {
  const { empresaId, trabajadores } = useEmpresa();
  const { apagados } = useNovedades();
  const { puede } = usePermisos();
  const visibles = PESTANAS.filter((p) => puede(p.permiso));
  const [elegida, setPestana] = useState('salud');
  const pestana = visibles.some((p) => p.id === elegida) ? elegida : (visibles[0]?.id ?? 'salud');
  const [trab, setTrab] = useState('');
  const [filtro, setFiltro] = useState(periodoInicial('Semana'));
  const error = validarRango(filtro.desde, filtro.hasta);

  const datos = useMemo(() => {
    if (error) return null;
    const lista = trab ? trabajadores.filter((t) => t.id === trab) : trabajadores;
    return generarNovedades(
      lista,
      deTextoFecha(filtro.desde),
      deTextoFecha(filtro.hasta),
      apagados,
      api.getVehiculos(empresaId),
    );
  }, [trab, filtro, error, apagados, empresaId, trabajadores.length]);
  const aus = useMemo(() => (datos ? ausentismo(datos) : { eventos: [], resumen: [] }), [datos]);
  const filas = !datos ? [] : pestana === 'ausentismo' ? aus.eventos : datos[pestana];
  const cols = COLUMNAS[pestana];
  const titulo = PESTANAS.find((p) => p.id === pestana).texto;
  const quien = trab ? trabajadores.find((t) => t.id === trab)?.nombres : 'Todos los trabajadores';
  const periodo = `${deTextoFecha(filtro.desde).toLocaleDateString('es-CO')} – ${deTextoFecha(filtro.hasta).toLocaleDateString('es-CO')}`;

  const tablas = () => [
    ...(pestana === 'ausentismo'
      ? [
          {
            titulo: 'Resumen por trabajador',
            filas: [
              ['Trabajador', 'Novedades', 'Días afectados', 'Horas perdidas'],
              ...aus.resumen.map((r) => [r.persona, r.eventos, r.dias, r.horas]),
            ],
          },
        ]
      : []),
    { titulo: 'Detalle', filas: [cols.map((c) => c[0]), ...filas.map((x) => cols.map((c) => c[1](x)))] },
  ];
  const archivo = `MiRuta-${titulo}-${periodo}`.replace(/[^\wáéíóúñÁÉÍÓÚÑ-]+/g, '_');

  const kpis = !datos
    ? []
    : {
        salud: [
          ['Reportes', datos.salud.length],
          ['No aptos', datos.salud.filter((x) => x.apto === 'No').length, 'texto-danger'],
          ['Con alerta', datos.salud.filter((x) => x.alerta).length],
          ['Diligenciados tarde', datos.salud.filter((x) => x.tarde).length],
        ],
        preoperacional: [
          ['Preoperacionales', datos.preoperacional.length],
          ['Con fallas', datos.preoperacional.filter((x) => x.fallas.length).length, 'texto-danger'],
          ['En vehículo de la empresa', datos.preoperacional.filter((x) => x.uso === 'Empresa').length],
        ],
        pausas: [
          ['Pausas', datos.pausas.length],
          ['Pausas activas', datos.pausas.filter((x) => x.tipo === 'Pausa activa').length],
          ['Horas en pausa', Math.round((datos.pausas.reduce((t, x) => t + x.minutos, 0) / 60) * 10) / 10],
        ],
        incidentes: [
          ['Incidentes', datos.incidentes.length, 'texto-danger'],
          ['No pudieron continuar', datos.incidentes.filter((x) => !x.puedeContinuar).length],
        ],
        apagados: [['GPS apagados', datos.apagados.length]],
        notificaciones: (() => {
          const n = datos.notificaciones;
          const leidas = n.filter((x) => x.leida);
          return [
            ['Enviadas', n.length],
            ['Leídas', leidas.length],
            ['Sin leer', n.length - leidas.length, 'texto-danger'],
            ['% de lectura', n.length ? `${Math.round((leidas.length / n.length) * 100)} %` : '—'],
            [
              'Tiempo promedio para leer',
              leidas.length
                ? `${Math.round(leidas.reduce((t, x) => t + x.minutosParaLeer, 0) / leidas.length)} min`
                : '—',
            ],
          ];
        })(),
        ausentismo: [
          ['Novedades', aus.eventos.length, 'texto-danger'],
          ['Días afectados', aus.resumen.reduce((t, r) => t + r.dias, 0)],
          ['Horas perdidas', Math.round(aus.resumen.reduce((t, r) => t + r.horas, 0) * 10) / 10],
        ],
      }[pestana];

  return (
    <div className="pagina">
      <div className="barra">
        <select value={trab} onChange={(e) => setTrab(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {trabajadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombres} {t.apellidos}
            </option>
          ))}
        </select>
        <FiltroPeriodo valor={filtro} onCambiar={setFiltro} error={error} />
        <button
          className="btn"
          disabled={!!error}
          onClick={() =>
            descargarExcel(
              archivo,
              tablas().map((t) => ({ nombre: t.titulo, filas: t.filas })),
            )
          }
        >
          <FiDownload /> Excel
        </button>
        <button
          className="btn"
          disabled={!!error}
          onClick={() => descargarPdf(titulo, `${quien} · ${periodo}`, tablas())}
        >
          <FiFileText /> PDF
        </button>
      </div>

      <div className="segmentos filtros-historial">
        {visibles.map((p) => (
          <button key={p.id} className={pestana === p.id ? 'activo' : ''} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      {error ? (
        <div className="aviso error">{error}</div>
      ) : (
        <>
          <div className="kpis">
            {kpis.map(([t, v, clase]) => (
              <div key={t} className="kpi">
                <span>{t}</span>
                <strong className={v ? (clase ?? '') : ''}>{v}</strong>
              </div>
            ))}
          </div>

          {pestana === 'ausentismo' && (
            <section className="panel">
              <h2>Resumen por trabajador</h2>
              <table>
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Novedades</th>
                    <th>Días afectados</th>
                    <th>Horas perdidas</th>
                  </tr>
                </thead>
                <tbody>
                  {aus.resumen.map((r) => (
                    <tr key={r.persona}>
                      <td>{r.persona}</td>
                      <td>{r.eventos}</td>
                      <td>{r.dias}</td>
                      <td>
                        <strong>{r.horas} h</strong>
                      </td>
                    </tr>
                  ))}
                  {aus.resumen.length === 0 && (
                    <tr>
                      <td colSpan={4} className="vacio">
                        Sin ausentismo en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          <section className="panel">
            <h2>
              {pestana === 'ausentismo' ? 'Detalle de novedades' : titulo} ({filas.length})
            </h2>
            <div className="tabla-scroll">
              <table>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c[0]}>{c[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 400).map((x, i) => (
                    <tr key={i}>
                      {cols.map((c) => (
                        <td key={c[0]}>{c[2] ? c[2](x) : c[1](x)}</td>
                      ))}
                    </tr>
                  ))}
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={cols.length} className="vacio">
                        Sin registros en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pestana === 'salud' && (
              <small className="nota">
                Las respuestas de salud son datos sensibles (Ley 1581): solo los ven los perfiles con el permiso "Ver
                respuestas de salud".
              </small>
            )}
            {pestana === 'notificaciones' && (
              <small className="nota">
                Cada notificación que llega al celular queda registrada. Cuando el trabajador la marca como leída en la
                campana de la app, se guarda la hora: así queda constancia de que la vio.
              </small>
            )}
            {pestana === 'ausentismo' && (
              <small className="nota">
                Ausentismo = no apto en el reporte de salud, incidente que no le permitió continuar o GPS apagado
                manualmente. Horas perdidas = desde que se apagó el GPS hasta el fin del horario.
              </small>
            )}
          </section>
        </>
      )}
    </div>
  );
}
