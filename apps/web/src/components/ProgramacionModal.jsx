import { useState } from 'react';
import { FiArrowDown, FiArrowUp, FiCornerUpLeft, FiHexagon, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import Avatar from './Avatar';
import MapaSelector from './MapaSelector';
import Modal from './Modal';
import { api } from '../services/api';
import { buscarDireccion, direccionDePunto } from '../services/geocodificacion';
import { aTextoFecha } from '../utils/fechas';
import { TIPOS } from '../utils/visitas';

const VACIA = {
  tipo: 'obra',
  titulo: '',
  trabajadores: [],
  fecha: aTextoFecha(new Date()),
  hora: '08:00',
  puntos: [],
  radio: 120,
  area: [],
  descripcion: '',
  repeticion: { tipo: 'no', dias: [], hasta: '' },
  estado: 'activa',
};
const DIAS = [
  [1, 'L'],
  [2, 'M'],
  [3, 'X'],
  [4, 'J'],
  [5, 'V'],
  [6, 'S'],
  [0, 'D'],
];

// Crear o editar una programación (también sirve para reasignar trabajadores)
export default function ProgramacionModal({ inicial, trabajadores, onGuardar, onCerrar }) {
  const [p, setP] = useState(inicial ?? VACIA);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(null);
  const [centro, setCentro] = useState(null);
  const cambiar = (campo, valor) => setP((x) => ({ ...x, [campo]: valor }));
  const geocercas = api.getGeocercas();

  // Completa la dirección de un punto marcado con clic o arrastrado (para que el trabajador la vea en la app)
  const completarDireccion = async (i, lat, lng) => {
    try {
      const dir = await direccionDePunto(lat, lng);
      if (dir)
        setP((x) => ({
          ...x,
          puntos: x.puntos.map((pt, k) =>
            k === i && pt.lat === lat && pt.lng === lng ? { ...pt, direccion: dir } : pt,
          ),
        }));
    } catch {
      // sin internet: queda solo con las coordenadas
    }
  };

  // Área inicial alrededor del punto (hexágono); luego se ajusta arrastrando las esquinas
  const areaAlrededor = (lat, lng, metros = 150) =>
    Array.from({ length: 6 }, (_, k) => {
      const ang = (Math.PI / 3) * k;
      return [
        lat + (Math.sin(ang) * metros) / 111320,
        lng + (Math.cos(ang) * metros) / (111320 * Math.cos((lat * Math.PI) / 180)),
      ];
    });

  // Clic en el mapa: obra = lugar, ruta = siguiente punto, zona = esquina del área
  // Dirección buscada: obra y ruta = lugar; zona = lugar y, si no hay área, un área inicial a su alrededor
  const agregarLugar = (lat, lng, nombre = '', direccion = '', desdeBusqueda = false) => {
    if (p.tipo === 'zona' && !desdeBusqueda) return cambiar('area', [...p.area, [lat, lng]]);
    const punto = {
      nombre: nombre || (p.tipo === 'ruta' ? `Punto ${p.puntos.length + 1}` : 'Lugar'),
      direccion,
      lat,
      lng,
    };
    const i = p.tipo === 'ruta' ? p.puntos.length : 0;
    setP((x) => ({
      ...x,
      puntos: x.tipo === 'ruta' ? [...x.puntos, punto] : [punto],
      area: x.tipo === 'zona' && x.area.length < 3 ? areaAlrededor(lat, lng) : x.area,
    }));
    if (!direccion) completarDireccion(i, lat, lng);
  };

  const moverPunto = (i, lat, lng) => {
    cambiar(
      'puntos',
      p.puntos.map((pt, k) => (k === i ? { ...pt, lat, lng, direccion: '' } : pt)),
    );
    completarDireccion(i, lat, lng);
  };
  const moverVertice = (i, lat, lng) =>
    cambiar(
      'area',
      p.area.map((v, k) => (k === i ? [lat, lng] : v)),
    );

  const buscar = async () => {
    if (busqueda.trim().length < 4) return;
    setBuscando(true);
    setErrorBusqueda(null);
    try {
      const r = await buscarDireccion(`${busqueda}, Antioquia`);
      // Si hay un solo resultado, se marca de una vez en el mapa
      if (r.length === 1) {
        agregarLugar(r[0].lat, r[0].lng, r[0].nombre.split(',')[0], r[0].nombre, true);
        setCentro([r[0].lat, r[0].lng]);
        setResultados([]);
      } else setResultados(r);
      if (!r.length)
        setErrorBusqueda(
          'No encontramos esa dirección. Prueba con otra forma de escribirla o marca el punto en el mapa.',
        );
    } catch (e) {
      setErrorBusqueda(e.message);
    } finally {
      setBuscando(false);
    }
  };

  const usarGeocerca = (id) => {
    const g = geocercas.find((x) => x.id === id);
    if (!g) return;
    if (g.forma === 'circulo') {
      setP((x) => ({
        ...x,
        tipo: 'obra',
        puntos: [{ nombre: g.nombre, direccion: '', lat: g.centro[0], lng: g.centro[1] }],
        radio: g.radio,
        area: [],
      }));
      setCentro(g.centro);
    } else {
      setP((x) => ({ ...x, tipo: 'zona', area: g.puntos, puntos: [] }));
      setCentro(g.puntos[0]);
    }
    if (!p.titulo) cambiar('titulo', g.nombre);
  };

  const mover = (i, d) => {
    const l = [...p.puntos];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    cambiar('puntos', l);
  };

  const errores = [
    !p.titulo.trim() && 'un título',
    p.trabajadores.length === 0 && 'al menos un trabajador',
    !p.fecha && 'la fecha',
    !p.hora && 'la hora estimada',
    p.tipo === 'obra' && p.puntos.length !== 1 && 'el lugar en el mapa',
    p.tipo === 'ruta' && p.puntos.length < 2 && 'al menos 2 puntos de la ruta',
    p.tipo === 'zona' && p.area.length < 3 && 'al menos 3 puntos del área',
    p.repeticion.tipo === 'semanal' && p.repeticion.dias.length === 0 && 'los días de la semana',
  ].filter(Boolean);

  return (
    <Modal
      titulo={inicial ? 'Editar programación' : 'Nueva programación'}
      onCerrar={onCerrar}
      pie={
        <>
          {errores.length > 0 && <span className="nota falta">Falta: {errores.join(', ')}.</span>}
          <button className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primario" disabled={errores.length > 0} onClick={() => onGuardar(p)}>
            {inicial ? 'Guardar cambios' : 'Programar'}
          </button>
        </>
      }
    >
      <div className="segmentos tipo-prog">
        {Object.entries(TIPOS).map(([k, t]) => (
          <button
            key={k}
            className={p.tipo === k ? 'activo' : ''}
            onClick={() =>
              setP((x) => ({
                ...x,
                tipo: k,
                puntos: k === 'ruta' ? x.puntos : x.puntos.slice(0, 1),
                area: k === 'zona' ? x.area : [],
              }))
            }
          >
            {t.texto}
          </button>
        ))}
      </div>
      <p className="nota">{TIPOS[p.tipo].ayuda}.</p>

      <div className="grid-form">
        <label className="col2">
          Título
          <input
            value={p.titulo}
            onChange={(e) => cambiar('titulo', e.target.value)}
            placeholder="Ej.: Entregas Laureles"
          />
        </label>
        <label>
          Fecha
          <input type="date" value={p.fecha} onChange={(e) => cambiar('fecha', e.target.value)} />
        </label>
        <label>
          Hora estimada de llegada
          <input type="time" value={p.hora} onChange={(e) => cambiar('hora', e.target.value)} />
        </label>
      </div>

      <h3>Trabajadores asignados</h3>
      <div className="chips-seleccion">
        {trabajadores.map((t) => {
          const sel = p.trabajadores.includes(t.id);
          return (
            <button
              key={t.id}
              className={`chip-sel ${sel ? 'sel' : ''}`}
              onClick={() =>
                cambiar('trabajadores', sel ? p.trabajadores.filter((x) => x !== t.id) : [...p.trabajadores, t.id])
              }
            >
              <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={22} />
              {t.nombres} {t.apellidos}
            </button>
          );
        })}
      </div>

      <h3>Ubicación</h3>
      <div className="barra">
        <input
          className="buscar"
          placeholder="Buscar dirección (ej.: Calle 10 # 43A-30, Medellín)"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
        />
        <button className="btn" onClick={buscar} disabled={buscando}>
          <FiSearch /> {buscando ? 'Buscando…' : 'Buscar'}
        </button>
        {p.tipo !== 'ruta' && (
          <select value="" onChange={(e) => usarGeocerca(e.target.value)}>
            <option value="">Usar geocerca existente…</option>
            {geocercas.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
      {errorBusqueda && <p className="nota texto-danger">{errorBusqueda}</p>}
      {resultados.length > 0 && (
        <ul className="resultados-dir">
          {resultados.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  agregarLugar(r.lat, r.lng, r.nombre.split(',')[0], r.nombre, true);
                  setCentro([r.lat, r.lng]);
                  setResultados([]);
                }}
              >
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="nota">
        {p.tipo === 'obra' &&
          'Busca la dirección o haz clic en el mapa para marcar el lugar. El círculo es la geocerca: ajústalo con el radio y arrastra el pin para moverlo.'}
        {p.tipo === 'ruta' &&
          'Busca cada dirección o haz clic en el mapa en el orden del recorrido. Arrastra los pines para corregirlos.'}
        {p.tipo === 'zona' &&
          'Busca la dirección para crear un área a su alrededor, o haz clic en el mapa para marcar las esquinas (mínimo 3). Arrastra las esquinas para ajustarla.'}
      </p>
      <MapaSelector
        tipo={p.tipo}
        puntos={p.puntos}
        radio={p.radio}
        area={p.area}
        onClic={(lat, lng) => agregarLugar(lat, lng)}
        onMoverPunto={moverPunto}
        onMoverVertice={moverVertice}
        centro={centro}
      />

      {p.tipo !== 'zona' && (
        <label className="radio-geocerca">
          <span>
            {p.tipo === 'obra' ? 'Radio de la geocerca' : 'Radio de llegada a cada punto'}: <strong>{p.radio} m</strong>
          </span>
          <input
            type="range"
            min={30}
            max={1000}
            step={10}
            value={p.radio}
            onChange={(e) => cambiar('radio', Number(e.target.value))}
          />
        </label>
      )}
      {p.tipo === 'obra' && (
        <div className="grid-form">
          <label>
            Dirección
            <input
              value={p.puntos[0]?.direccion ?? ''}
              disabled={!p.puntos[0]}
              placeholder="Se completa sola al marcar el punto"
              onChange={(e) => cambiar('puntos', [{ ...p.puntos[0], direccion: e.target.value }])}
            />
          </label>
          <label>
            Nombre del lugar
            <input
              value={p.puntos[0]?.nombre ?? ''}
              disabled={!p.puntos[0]}
              onChange={(e) => cambiar('puntos', [{ ...p.puntos[0], nombre: e.target.value }])}
            />
          </label>
        </div>
      )}
      {p.tipo === 'ruta' && p.puntos.length > 0 && (
        <ol className="lista-puntos">
          {p.puntos.map((pt, i) => (
            <li key={i}>
              <span className="num">{i + 1}</span>
              <input
                value={pt.nombre}
                onChange={(e) =>
                  cambiar(
                    'puntos',
                    p.puntos.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x)),
                  )
                }
              />
              <button className="icono" disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
                <FiArrowUp />
              </button>
              <button className="icono" disabled={i === p.puntos.length - 1} onClick={() => mover(i, 1)} title="Bajar">
                <FiArrowDown />
              </button>
              <button
                className="icono"
                onClick={() =>
                  cambiar(
                    'puntos',
                    p.puntos.filter((_, k) => k !== i),
                  )
                }
                title="Quitar"
              >
                <FiX />
              </button>
            </li>
          ))}
        </ol>
      )}
      {p.tipo === 'zona' && (p.area.length > 0 || p.puntos[0]) && (
        <div className="barra">
          <span className="nota">
            {p.puntos[0] ? `${p.puntos[0].direccion || p.puntos[0].nombre} · ` : ''}
            {p.area.length} esquinas
          </span>
          {p.puntos[0] && (
            <button
              className="btn peq"
              onClick={() => cambiar('area', areaAlrededor(p.puntos[0].lat, p.puntos[0].lng))}
            >
              <FiHexagon /> Área alrededor del punto
            </button>
          )}
          <button className="btn peq" onClick={() => cambiar('area', p.area.slice(0, -1))}>
            <FiCornerUpLeft /> Deshacer
          </button>
          <button className="btn peq" onClick={() => cambiar('area', [])}>
            <FiTrash2 /> Limpiar
          </button>
        </div>
      )}

      <h3>Tarea u observaciones</h3>
      <textarea
        rows={3}
        value={p.descripcion}
        onChange={(e) => cambiar('descripcion', e.target.value)}
        placeholder="Qué debe hacer en el lugar"
      />

      <h3>Repetir</h3>
      <div className="barra">
        <select
          value={p.repeticion.tipo}
          onChange={(e) => cambiar('repeticion', { ...p.repeticion, tipo: e.target.value })}
        >
          <option value="no">No se repite</option>
          <option value="diaria">Todos los días (lunes a sábado)</option>
          <option value="lunes_viernes">Lunes a viernes</option>
          <option value="semanal">Días de la semana…</option>
        </select>
        {p.repeticion.tipo === 'semanal' && (
          <div className="dias">
            {DIAS.map(([d, l]) => {
              const sel = p.repeticion.dias.includes(d);
              return (
                <button
                  key={d}
                  className={`dia ${sel ? 'sel' : ''}`}
                  onClick={() =>
                    cambiar('repeticion', {
                      ...p.repeticion,
                      dias: sel ? p.repeticion.dias.filter((x) => x !== d) : [...p.repeticion.dias, d],
                    })
                  }
                >
                  {l}
                </button>
              );
            })}
          </div>
        )}
        {p.repeticion.tipo !== 'no' && (
          <label className="campo-fecha">
            Hasta
            <input
              type="date"
              value={p.repeticion.hasta}
              min={p.fecha}
              onChange={(e) => cambiar('repeticion', { ...p.repeticion, hasta: e.target.value })}
            />
          </label>
        )}
      </div>
      <p className="nota">Al guardar, cada trabajador asignado recibe una notificación con sonido en su celular.</p>
    </Modal>
  );
}
