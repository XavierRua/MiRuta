// Descargas sin librerías externas (todo gratis y en el navegador):
// - Excel: archivo .xlsx real (un .zip con XML), con una hoja por tabla.
// - PDF: se abre una vista para imprimir y se elige "Guardar como PDF".

// ---------- Excel (.xlsx) ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Zip sin compresión (método "store"): suficiente para Excel y sin dependencias
function zip(archivos) {
  const enc = new TextEncoder();
  const partes = [];
  const central = [];
  let offset = 0;
  for (const { nombre, texto } of archivos) {
    const n = enc.encode(nombre);
    const d = enc.encode(texto);
    const crc = crc32(d);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, d.length, true);
    local.setUint32(22, d.length, true);
    local.setUint16(26, n.length, true);
    partes.push(new Uint8Array(local.buffer), n, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, d.length, true);
    c.setUint32(24, d.length, true);
    c.setUint16(28, n.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((t, x) => t + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const esc = (v) => String(v).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const columna = (i) => {
  let s = '';
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

function hojaXml(filas) {
  const ancho = Math.max(1, ...filas.map((f) => f.length));
  const cols = Array.from({ length: ancho }, (_, i) => {
    const max = Math.max(...filas.map((f) => String(f[i] ?? '').length));
    return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(10, max + 2))}" customWidth="1"/>`;
  }).join('');
  const xmlFilas = filas
    .map((f, r) => {
      const celdas = f
        .map((v, c) => {
          if (v == null || v === '') return '';
          const ref = `${columna(c)}${r + 1}`;
          const estilo = r === 0 ? ' s="1"' : '';
          return typeof v === 'number' && Number.isFinite(v)
            ? `<c r="${ref}"${estilo}><v>${v}</v></c>`
            : `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${celdas}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${xmlFilas}</sheetData></worksheet>`;
}

// hojas = [{ nombre: 'Resumen', filas: [[encabezados…], [valores…], …] }]
export function construirExcel(hojas) {
  const ns = 'http://schemas.openxmlformats.org/';
  const nombres = hojas.map((h, i) => esc(h.nombre.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || `Hoja${i + 1}`));
  const archivos = [
    {
      nombre: '[Content_Types].xml',
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('')}</Types>`,
    },
    {
      nombre: '_rels/.rels',
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nombre: 'xl/workbook.xml',
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets>${nombres
        .map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships">${hojas
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join(
          '',
        )}<Relationship Id="rId${hojas.length + 1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      nombre: 'xl/styles.xml',
      texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, texto: hojaXml(h.filas) })),
  ];
  return zip(archivos);
}

export function descargarExcel(nombreArchivo, hojas) {
  const url = URL.createObjectURL(construirExcel(hojas));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- PDF (vista de impresión) ----------
// tablas = [{ titulo, filas: [[encabezados…], …] }]
export function descargarPdf(titulo, subtitulo, tablas) {
  const v = window.open('', '_blank');
  if (!v) {
    alert('El navegador bloqueó la ventana. Permite las ventanas emergentes para descargar el PDF.');
    return;
  }
  const tabla = (t) =>
    `<h2>${esc(t.titulo)}</h2><table><thead><tr>${t.filas[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.filas
      .slice(1)
      .map((f) => `<tr>${f.map((c) => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  v.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
  body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1b2430;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#64748b;margin:0 0 18px}
  h2{font-size:14px;margin:22px 0 8px} table{width:100%;border-collapse:collapse}
  th{text-align:left;background:#f4f6f9;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
  th,td{padding:6px 8px;border-bottom:1px solid #e3e8ef} tr{page-break-inside:avoid}
  .marca{color:#ea580c;font-weight:800}
</style></head><body>
<h1><span class="marca">MiRuta</span> · ${esc(titulo)}</h1><p class="sub">${esc(subtitulo)} · generado el ${new Date().toLocaleString('es-CO')}</p>
${tablas.map(tabla).join('')}
<script>window.onload=()=>{window.print();}</script></body></html>`);
  v.document.close();
}
