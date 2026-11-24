import { useState } from 'react';
import { FiBattery, FiNavigation, FiAlertTriangle } from 'react-icons/fi';
import Mapa from '../components/Mapa';
import LeyendaDesplazamiento from '../components/LeyendaDesplazamiento';
import { infoModo } from '../utils/desplazamiento';
import Avatar from '../components/Avatar';
import { estadoInfo } from '../constants/estados';
import { useSesion } from '../context/SesionContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import ChipEficiencia from '../components/ChipEficiencia';
import ApagarGpsModal from '../components/ApagarGpsModal';
import { useNovedades } from '../context/NovedadesContext';
import { FiPower } from 'react-icons/fi';
export default function MapaVivoScreen() {
  const { apagados, apagarGps } = useNovedades();
  const [apagando, setApagando] = useState(null);
  const apagadoHoy = (id) =>
    apagados.find((a) => a.trabajadorId === id && new Date(a.hora).toDateString() === new Date().toDateString());
  const { irA, usuario } = useSesion();
  const { trabajadores: lista } = useEmpresa();
  const geocercas = api.getGeocercas();
  const { indicadores } = useConfig();
  const alertas = api.getAlertas(indicadores.limiteVelocidad);
  const [sel, setSel] = useState(null);
  const [filtro, setFiltro] = useState('');
  const activos = lista.filter((t) => t.estado === 'en_ruta' || t.estado === 'detenido').length;
  const kmHoy = lista.reduce((s, t) => s + t.kmHoy, 0);
  const abiertas = alertas.filter((a) => a.estado === 'abierta').length;
  const visibles = lista.filter((t) =>
    `${t.nombres} ${t.apellidos} ${t.vehiculoPlaca ?? ''}`.toLowerCase().includes(filtro.toLowerCase()),
  );
  const actual = lista.find((t) => t.id === sel);
  // Eficiencia de reportes de hoy del trabajador seleccionado
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const efHoy = actual
    ? api.getIndicadoresDiarios({
        empresaId: actual.empresaId,
        trabajadorId: actual.id,
        desde: hoy,
        hasta: hoy,
        limiteVelocidad: indicadores.limiteVelocidad,
      })[0]
    : null;
  return (
    <div className="pagina">
      <div className="kpis">
        <div className="kpi">
          <span>Trabajadores activos</span>
          <strong>
            {activos} / {lista.length}
          </strong>
        </div>
        <div className="kpi">
          <span>Kilómetros hoy</span>
          <strong>{kmHoy.toFixed(1)} km</strong>
        </div>
        <div className="kpi">
          <span>Dentro de geocercas</span>
          <strong>{lista.filter((t) => t.geocercaActual).length}</strong>
        </div>
        <button className="kpi kpi-alerta" onClick={() => irA('alertas')}>
          <span>Alertas abiertas</span>
          <strong>
            <FiAlertTriangle /> {abiertas}
          </strong>
        </button>
      </div>

      <div className="mapa-layout">
        <section className="panel lista-trabajadores">
          <input
            className="buscar"
            placeholder="Buscar trabajador o placa…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <ul>
            {visibles.map((t) => (
              <li key={t.id} className={sel === t.id ? 'sel' : ''} onClick={() => setSel(t.id)}>
                <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={38} />
                <div className="datos">
                  <strong>
                    {t.nombres} {t.apellidos}
                  </strong>
                  <small>
                    {t.vehiculoPlaca ?? 'Sin vehículo'} · {t.ultimoReporte}
                  </small>
                </div>
                <span className={`chip ${estadoInfo[t.estado].clase}`}>{estadoInfo[t.estado].texto}</span>
              </li>
            ))}
          </ul>
          <div className="leyenda">
            {Object.entries(estadoInfo).map(([k, v]) => (
              <span key={k} className={`chip ${v.clase}`}>
                {v.texto}
              </span>
            ))}
          </div>
        </section>

        <section className="panel mapa-panel">
          <Mapa trabajadores={lista} geocercas={geocercas} seleccionado={sel} onSeleccionar={setSel} />
          <LeyendaDesplazamiento flotante />
          {actual && (
            <div className="ficha-flotante">
              <div className="ficha-cab">
                <div className="ficha-persona">
                  <Avatar nombres={actual.nombres} apellidos={actual.apellidos} foto={actual.foto} tam={52} />
                  <strong>
                    {actual.nombres} {actual.apellidos}
                  </strong>
                </div>
                <button className="icono" onClick={() => setSel(null)}>
                  ×
                </button>
              </div>
              <span className={`chip ${estadoInfo[actual.estado].clase}`}>{estadoInfo[actual.estado].texto}</span>
              <dl>
                <dt>Vehículo</dt>
                <dd>{actual.vehiculoPlaca ?? '—'}</dd>
                <dt>Desplazamiento</dt>
                <dd>
                  {actual.modo
                    ? `${infoModo(actual.modo, actual.vehiculoTipo).emoji} ${infoModo(actual.modo, actual.vehiculoTipo).texto}`
                    : '—'}
                </dd>
                <dt>
                  <FiNavigation /> Velocidad
                </dt>
                <dd className={actual.velocidad > indicadores.limiteVelocidad ? 'texto-danger' : ''}>
                  {actual.velocidad} km/h
                </dd>
                <dt>
                  <FiBattery /> Batería
                </dt>
                <dd>{actual.bateria} %</dd>
                <dt>Último envío</dt>
                <dd>{actual.ultimoReporte}</dd>
                <dt>Puntos sin enviar</dt>
                <dd className={actual.puntosPendientes ? 'texto-naranja' : ''}>
                  {actual.puntosPendientes ? `${actual.puntosPendientes} en cola` : 'Al día'}
                </dd>
                <dt>Eficiencia hoy</dt>
                <dd>
                  <ChipEficiencia pct={efHoy?.eficiencia ?? null} />
                </dd>
                <dt>Vel. prom. / máx. hoy</dt>
                <dd>
                  {efHoy ? (
                    <>
                      {efHoy.velPromedio} /{' '}
                      <span className={efHoy.velMax > indicadores.limiteVelocidad ? 'texto-danger' : ''}>
                        {efHoy.velMax}
                      </span>{' '}
                      km/h
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
                {efHoy?.horasExtra && (
                  <>
                    <dt>Horas extras</dt>
                    <dd className="texto-morado">
                      {efHoy.horasExtra.fin
                        ? `${String(efHoy.horasExtra.horas).replace('.', ',')} h`
                        : `En curso desde ${efHoy.horasExtra.inicio.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`}
                    </dd>
                  </>
                )}
                <dt>Km hoy</dt>
                <dd>{actual.kmHoy} km</dd>
                <dt>Geocerca</dt>
                <dd>{actual.geocercaActual ?? 'Fuera de geocercas'}</dd>
                <dt>Horario</dt>
                <dd>{actual.horario}</dd>
              </dl>
              <button className="btn ancho" onClick={() => irA('historial')}>
                Ver recorrido de hoy
              </button>
              {/* Apagar GPS: administrador, supervisor y SST (permiso web.gps.apagar) */}
              {apagadoHoy(actual.id) ? (
                <div className="aviso error">
                  GPS apagado por {apagadoHoy(actual.id).por} a las{' '}
                  {new Date(apagadoHoy(actual.id).hora).toLocaleTimeString('es-CO', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  . Motivo: {apagadoHoy(actual.id).motivo}
                </div>
              ) : (
                <button className="btn ancho peligro" onClick={() => setApagando(actual)}>
                  <FiPower /> Apagar GPS
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      {apagando && (
        <ApagarGpsModal
          trabajador={apagando}
          usuario={usuario}
          onCerrar={() => setApagando(null)}
          onConfirmar={(r) => {
            apagarGps(r);
            setApagando(null);
          }}
        />
      )}
    </div>
  );
}
