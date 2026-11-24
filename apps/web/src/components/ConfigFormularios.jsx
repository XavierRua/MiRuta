import { useState } from 'react';
import { FiCheck, FiPlus, FiRotateCcw, FiX } from 'react-icons/fi';
import { FORMULARIOS_DEFECTO } from '../config/formularios';
import { useNovedades } from '../context/NovedadesContext';

const CLASES = [
  ['moto', 'Moto'],
  ['carro', 'Carro'],
  ['camion', 'Camión'],
];
const nuevoId = (p) => `${p}-${Date.now().toString(36)}`;

// Preguntas de salud e ítems del preoperacional (permiso web.formularios.configurar).
// Las pausas tienen su propio editor y permiso: ConfigPausas.jsx (web.pausas.configurar).
// La app del trabajador los lee al iniciar (con Supabase: tablas de 0014).
export default function ConfigFormularios() {
  const { formularios, guardarParte } = useNovedades();
  const [f, setF] = useState(formularios);
  const [guardado, setGuardado] = useState(false);
  const cambiar = (campo, valor) => {
    setF({ ...f, [campo]: valor });
    setGuardado(false);
  };
  const editar = (lista, i, cambio) =>
    cambiar(
      lista,
      f[lista].map((x, k) => (k === i ? { ...x, ...cambio } : x)),
    );
  const quitar = (lista, i) =>
    cambiar(
      lista,
      f[lista].filter((_, k) => k !== i),
    );

  return (
    <>
      <section className="panel">
        <h2>Reporte de estado de salud (inicio y fin de jornada)</h2>
        <p className="nota">
          "Alerta si" = la respuesta que avisa con sonido al administrador, al supervisor y a SST. La pregunta "¿Estás
          en condiciones de trabajar?" es fija.
        </p>
        <div className="editor-lista">
          {f.preguntasSalud.map((p, i) => (
            <div key={p.id} className="editor-fila">
              <input
                value={p.texto}
                disabled={p.fija}
                onChange={(e) => editar('preguntasSalud', i, { texto: e.target.value })}
              />
              <select
                value={p.tipo}
                disabled={p.fija}
                onChange={(e) =>
                  editar('preguntasSalud', i, {
                    tipo: e.target.value,
                    opciones: e.target.value === 'opciones' ? ['Bien', 'Regular', 'Mal'] : undefined,
                    alertaSi: '',
                  })
                }
              >
                <option value="si_no">Sí / No</option>
                <option value="opciones">Bien / Regular / Mal</option>
                <option value="texto">Texto libre</option>
              </select>
              <select
                value={p.alertaSi ?? ''}
                disabled={p.fija || p.tipo === 'texto'}
                onChange={(e) => editar('preguntasSalud', i, { alertaSi: e.target.value })}
              >
                <option value="">Sin alerta</option>
                {(p.tipo === 'opciones' ? p.opciones : ['Sí', 'No']).map((o) => (
                  <option key={o} value={o}>
                    Alerta si: {o}
                  </option>
                ))}
              </select>
              <button className="icono" disabled={p.fija} onClick={() => quitar('preguntasSalud', i)} title="Quitar">
                <FiX />
              </button>
            </div>
          ))}
          <button
            className="btn peq"
            onClick={() =>
              cambiar('preguntasSalud', [
                ...f.preguntasSalud,
                { id: nuevoId('p'), texto: 'Nueva pregunta', tipo: 'si_no', alertaSi: '' },
              ])
            }
          >
            <FiPlus /> Agregar pregunta
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Preoperacional del vehículo</h2>
        <p className="nota">
          Si un ítem queda "Mal", se avisa al supervisor y al administrador. "Documentos al día" se revisa solo con los
          documentos del perfil.
        </p>
        <div className="editor-lista">
          {f.itemsPreoperacional.map((it, i) => (
            <div key={it.id} className="editor-fila items">
              <input
                value={it.texto}
                disabled={it.fija}
                onChange={(e) => editar('itemsPreoperacional', i, { texto: e.target.value })}
              />
              <div className="aplica">
                {CLASES.map(([k, t]) => {
                  const sel = it.aplica.includes(k);
                  return (
                    <button
                      key={k}
                      className={`chip-sel ${sel ? 'sel' : ''}`}
                      onClick={() =>
                        editar('itemsPreoperacional', i, {
                          aplica: sel ? it.aplica.filter((x) => x !== k) : [...it.aplica, k],
                        })
                      }
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <button
                className="icono"
                disabled={it.fija}
                onClick={() => quitar('itemsPreoperacional', i)}
                title="Quitar"
              >
                <FiX />
              </button>
            </div>
          ))}
          <button
            className="btn peq"
            onClick={() =>
              cambiar('itemsPreoperacional', [
                ...f.itemsPreoperacional,
                { id: nuevoId('i'), texto: 'Nuevo ítem', aplica: ['moto', 'carro', 'camion'] },
              ])
            }
          >
            <FiPlus /> Agregar ítem
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Plazo para diligenciarlos</h2>
        <div className="rangos">
          <label className="campo-config">
            <span>Alerta si no diligencia salud y preoperacional a los</span>
            <div className="con-unidad">
              <input
                type="number"
                min={5}
                max={180}
                value={f.limiteFormulariosMin}
                onChange={(e) => cambiar('limiteFormulariosMin', Number(e.target.value))}
              />
              <em>min del inicio</em>
            </div>
          </label>
          <label className="campo-config">
            <span>Reporte de salud de salida desde</span>
            <div className="con-unidad">
              <input
                type="number"
                min={5}
                max={120}
                value={f.saludSalidaAntesMin}
                onChange={(e) => cambiar('saludSalidaAntesMin', Number(e.target.value))}
              />
              <em>min antes del fin</em>
            </div>
          </label>
        </div>
      </section>

      <div className="barra">
        <button
          className="btn primario"
          onClick={() => {
            guardarParte({
              preguntasSalud: f.preguntasSalud,
              itemsPreoperacional: f.itemsPreoperacional,
              limiteFormulariosMin: f.limiteFormulariosMin,
              saludSalidaAntesMin: f.saludSalidaAntesMin,
            });
            setGuardado(true);
          }}
        >
          <FiCheck /> Guardar formularios
        </button>
        <button className="btn" onClick={() => setF(FORMULARIOS_DEFECTO)}>
          <FiRotateCcw /> Valores por defecto
        </button>
        {guardado && <span className="chip ok">Guardado. La app los usará desde el próximo inicio de jornada.</span>}
      </div>
    </>
  );
}
