import { useState } from 'react';
import { FiCheck, FiRotateCcw } from 'react-icons/fi';
import { INDICADORES_DEFECTO } from '../config/indicadores';
import { useConfig } from '../context/ConfigContext';
import ConfigFormularios from '../components/ConfigFormularios';
import ConfigPausas from '../components/ConfigPausas';
import ConfigLogo from '../components/ConfigLogo';
import { usePermisos } from '../context/PermisosContext';

// El administrador ajusta el límite de velocidad y los rangos de color de la eficiencia
export default function ConfiguracionScreen() {
  const { indicadores, guardarIndicadores } = useConfig();
  const { puede } = usePermisos();
  const [form, setForm] = useState(indicadores);
  const [guardado, setGuardado] = useState(false);

  const num = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value === '' ? '' : Number(e.target.value) });
    setGuardado(false);
  };

  const errores = [
    !(form.limiteVelocidad >= 20 && form.limiteVelocidad <= 120) &&
      'El límite de velocidad debe estar entre 20 y 120 km/h.',
    !(form.eficienciaVerde > 0 && form.eficienciaVerde <= 100) && 'El rango verde debe estar entre 1 y 100 %.',
    !(form.eficienciaNaranja > 0 && form.eficienciaNaranja < form.eficienciaVerde) &&
      'El mínimo del naranja debe ser mayor que 0 y menor que el del verde.',
    !(form.toleranciaSalidaMin >= 1 && form.toleranciaSalidaMin <= 15) &&
      'La tolerancia de salida debe estar entre 1 y 15 minutos.',
    !(form.toleranciaLlegadaMin >= 0 && form.toleranciaLlegadaMin <= 60) &&
      'La tolerancia de llegada debe estar entre 0 y 60 minutos.',
    !(form.bateriaBajaPct >= 5 && form.bateriaBajaPct <= 50) && 'El nivel de batería baja debe estar entre 5 y 50 %.',
  ].filter(Boolean);

  const guardar = () => {
    guardarIndicadores(form);
    setGuardado(true);
  };

  return (
    <div className="pagina config">
      {/* Cada parte de la configuración es un permiso aparte */}
      {puede('web.empresa.logo') && <ConfigLogo />}

      {puede('web.configuracion.general') && (
        <>
          <section className="panel">
            <h2>Velocidad</h2>
            <label className="campo-config">
              <span>Límite de velocidad permitido</span>
              <div className="con-unidad">
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={form.limiteVelocidad}
                  onChange={num('limiteVelocidad')}
                />
                <em>km/h</em>
              </div>
              <small>
                Cada vez que un trabajador lo supere se registra un exceso con hora, ubicación y velocidad, y se crea
                una alerta. En zona urbana de Colombia el límite general es 50 km/h; ajústalo a la política de tu
                empresa.
              </small>
            </label>
          </section>

          <section className="panel">
            <h2>Eficiencia de reportes de actividad</h2>
            <p className="nota">Porcentaje = reportes enviados a tiempo ÷ reportes esperados en la jornada.</p>
            <div className="rangos">
              <label className="campo-config">
                <span>
                  <i className="punto ok" /> Verde desde
                </span>
                <div className="con-unidad">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.eficienciaVerde}
                    onChange={num('eficienciaVerde')}
                  />
                  <em>%</em>
                </div>
              </label>
              <label className="campo-config">
                <span>
                  <i className="punto naranja" /> Naranja desde
                </span>
                <div className="con-unidad">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={form.eficienciaNaranja}
                    onChange={num('eficienciaNaranja')}
                  />
                  <em>%</em>
                </div>
              </label>
            </div>
            <div className="vista-rangos">
              <span className="chip ok">Verde: {form.eficienciaVerde} % o más</span>
              <span className="chip naranja">
                Naranja: {form.eficienciaNaranja} % a {Number(form.eficienciaVerde) - 1} %
              </span>
              <span className="chip danger">Rojo: menos de {form.eficienciaNaranja} %</span>
            </div>
          </section>

          <section className="panel">
            <h2>Geocercas de las visitas</h2>
            <label className="campo-config">
              <span>Tolerancia antes de registrar una salida</span>
              <div className="con-unidad">
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={form.toleranciaSalidaMin}
                  onChange={num('toleranciaSalidaMin')}
                />
                <em>min</em>
              </div>
              <small>
                Si el trabajador queda fuera de la geocerca de su visita menos de este tiempo, se toma como un salto del
                GPS y no se registra la salida ni se envía alerta. La hora de salida que queda registrada es la del
                momento en que salió. La geocerca de cada visita (radio de la obra o área de la zona) se configura en
                Programación.
              </small>
            </label>
          </section>

          <section className="panel">
            <h2>Ingresos a la app y batería</h2>
            <label className="campo-config">
              <span>Tolerancia de llegada</span>
              <div className="con-unidad">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.toleranciaLlegadaMin}
                  onChange={num('toleranciaLlegadaMin')}
                />
                <em>min</em>
              </div>
              <small>
                Si el primer ingreso del día a la app es más de {form.toleranciaLlegadaMin || 0} min después del inicio
                del horario, queda como llegada tarde y se crea una alerta.
              </small>
            </label>
            <label className="campo-config">
              <span>Aviso de batería baja</span>
              <div className="con-unidad">
                <input type="number" min={5} max={50} value={form.bateriaBajaPct} onChange={num('bateriaBajaPct')} />
                <em>%</em>
              </div>
              <small>
                Durante el horario, si la batería baja de este nivel y el celular no está cargando, se le avisa al
                trabajador una vez al día y queda registrado (con alerta). La batería también queda en cada ingreso, en
                cada reporte y al iniciar la jornada.
              </small>
            </label>
          </section>

          {errores.length > 0 && <div className="aviso error">{errores.join(' ')}</div>}

          <div className="barra">
            <button className="btn primario" disabled={errores.length > 0} onClick={guardar}>
              <FiCheck /> Guardar
            </button>
            <button
              className="btn"
              onClick={() => {
                setForm(INDICADORES_DEFECTO);
                setGuardado(false);
              }}
            >
              <FiRotateCcw /> Valores por defecto
            </button>
            {guardado && <span className="chip ok">Guardado. Ya se aplica en alertas, historial y desempeño.</span>}
          </div>
          <small className="nota">
            Demo: se guarda en este navegador. Con la base de datos se guardará para toda la empresa.
          </small>
        </>
      )}

      {puede('web.formularios.configurar') && (
        <>
          <h2 className="titulo-seccion">Formularios del trabajador</h2>
          <ConfigFormularios />
        </>
      )}

      {puede('web.pausas.configurar') && (
        <>
          <h2 className="titulo-seccion">Pausas y descansos del trabajador</h2>
          <ConfigPausas />
        </>
      )}
    </div>
  );
}
