/**
 * pdf-handler.js - Procesamiento y extracción inteligente de PDFs
 * Utiliza PDF.js para leer documentos multipágina (ej: reportes de Caddis de 87 páginas o listas de proveedores)
 * y extrae tablas con Códigos, Tipos, Detalles, Netos, IVA %, Precios de Venta, Moneda y Grupos.
 */

import { ExcelHandler } from './excel-handler.js';

export const PdfHandler = {
  /**
   * Inicializa la configuración del worker de PDF.js
   */
  initWorker() {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.js';
    }
  },

  /**
   * Lee un archivo PDF y extrae todas las líneas de texto reconstruidas por fila (Y position)
   */
  async extractLinesFromPdf(file, onProgress = null) {
    this.initWorker();

    if (!window.pdfjsLib) {
      throw new Error('La librería PDF.js no está disponible. Verifica tu conexión.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const allLines = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress(pageNum, numPages);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Agrupar elementos de texto por su posición vertical (Y) con tolerancia de 2px
      const rowsByY = [];
      const Y_TOLERANCE = 3.0;

      textContent.items.forEach(item => {
        const text = item.str;
        if (!text || text.trim() === '') return;

        const x = item.transform[4];
        const y = Math.round(item.transform[5] * 10) / 10;

        let existingRow = rowsByY.find(r => Math.abs(r.y - y) <= Y_TOLERANCE);
        if (!existingRow) {
          existingRow = { y: y, items: [] };
          rowsByY.push(existingRow);
        }

        existingRow.items.push({ x, text });
      });

      // Ordenar filas de arriba hacia abajo (Y descendente)
      rowsByY.sort((a, b) => b.y - a.y);

      // Ordenar elementos de cada fila de izquierda a derecha (X ascendente)
      rowsByY.forEach(row => {
        row.items.sort((a, b) => a.x - b.x);
        // Concatenar textos de la fila preservando espacios
        const lineText = row.items.map(it => it.text.trim()).filter(t => t.length > 0).join(' ');
        if (lineText.trim().length > 0) {
          allLines.push(lineText.trim());
        }
      });
    }

    return allLines;
  },

  /**
   * Parsea un reporte de PDF con el formato exacto de Caddis
   * Columnas: Codigo | Tipo | Detalle | Neto | IVA % | Precio | Precio Venta | $AR | Cotiz | Puntos | Grupo | Lista
   * Ejemplo: "AT931 CARGADOR AUTO AT931 6.611,57 21,00 % 8.000,00 8.000,00 $AR 1 0 DISCONTINUO MINORISTA"
   */
  parseCaddisPdfLines(lines) {
    const items = [];
    const CADDIS_TYPES = ['ACCESORIOS','CABLES','PARLANTE','LAMPARA','CELULAR','TECLADOS','ADAPTADORES','CARGADORES','MOCHILAS','SMARTWATCH','AURICULARES','EQUIPOS','VARIOS','VIDRIOS','FUNDAS','REPARACION','GENERICOS','PERIFERICOS'];

    for (const line of lines) {
      if (
        line.startsWith('Listas de Precios') ||
        line.includes('Codigo Tipo Detalle') ||
        line.includes('Página') || line.includes('Pagina') ||
        line.match(/^\d{2}-[A-Za-z]{3}-\d{4}/) ||
        line.length < 10
      ) continue;

      if (!line.includes('$AR') && !line.includes('ARS') && !line.includes('USD') && !line.includes('SAR')) continue;
      if (!line.includes('%')) continue;

      const parts = line.split(/\s+/);

      // 1. Find $AR position
      let arIdx = -1;
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] === '$AR' || parts[i] === 'ARS' || parts[i] === 'SAR') { arIdx = i; break; }
      }
      if (arIdx < 4) continue;

      // 2. Find % position
      let pctIdx = -1;
      for (let i = 0; i < arIdx; i++) {
        if (parts[i] === '%') { pctIdx = i; break; }
        if (parts[i].endsWith('%') && parts[i].length <= 6) { pctIdx = i; break; }
      }
      if (pctIdx < 1) continue;

      // 3. Extract IVA (token before %)
      const iva = ExcelHandler.cleanNumeric(parts[pctIdx - 1]) || 21.0;

      // 4. Extract neto (token before IVA)
      const neto = ExcelHandler.cleanNumeric(parts[pctIdx - 2]) || 0;

      // 5. Extract precio venta (first token after $AR)
      const pVenta = ExcelHandler.cleanNumeric(parts[arIdx + 1]) || 0;

      if (pVenta <= 0) continue;

      // 6. Extract code and description from remaining tokens (0..pctIdx-3)
      const codeAndDesc = parts.slice(0, pctIdx - 2);
      if (codeAndDesc.length === 0) continue;

      const codigo = codeAndDesc[0];
      let tipo = 'VARIOS';
      let descStart = 1;

      if (codeAndDesc.length > 1 && CADDIS_TYPES.includes(codeAndDesc[1].toUpperCase())) {
        tipo = codeAndDesc[1].toUpperCase();
        descStart = 2;
      }

      const articulo = codeAndDesc.slice(descStart).join(' ') || codigo;

      items.push({
        codigo,
        tipo,
        articulo,
        costoSinImpuestos: neto,
        costoConImpuestos: neto > 0 ? neto * (1 + iva / 100) : 0,
        iva,
        precioVenta: pVenta,
        moneda: 'ARS',
        precioMayorista: Math.round(pVenta * 0.7)
      });
    }

    return items;
  },

  /**
   * Parsea PDFs genéricos enviados por proveedores
   */
  parseSupplierPdfLines(lines) {
    const items = [];

    lines.forEach(line => {
      // Ignorar títulos o encabezados genéricos
      if (
        line.toLowerCase().includes('lista de precio') ||
        line.toLowerCase().includes('condiciones comerciales') ||
        line.toLowerCase().includes('validez de la oferta') ||
        line.length < 5
      ) {
        return;
      }

      // Buscar patrones comunes de proveedores:
      // 1. "Glass Antiespia Iphone 14 USD 0.85" o "Glass Antiespia Iphone 14 $ 984,75"
      // 2. "058 CABLE PULSERA LIGHTNING 0.85 USD"
      const usdRegex = /^(.*?)\s+(?:USD|U\$S|\$)?\s*([\d.,]+)\s*(?:USD|U\$S|\$)?(?:\s+(STOCK|SIN STOCK|\d+))?$/i;
      const match = line.match(usdRegex);

      if (match) {
        const desc = match[1].trim();
        const price = ExcelHandler.cleanNumeric(match[2]);

        if (desc.length > 3 && price > 0) {
          const isUsd = line.toUpperCase().includes('USD') || line.toUpperCase().includes('U$S') || price < 500;
          let iva = 21.0;
          if (desc.includes('10.5') || desc.includes('10,5') || line.includes('10.5%')) {
            iva = 10.5;
          }

          items.push({
            articulo: desc,
            precio: price,
            moneda: isUsd ? 'USD' : 'ARS',
            iva,
            stock: match[3] || 'STOCK'
          });
        }
      } else {
        // Fallback usando el parser de texto libre
        const parsed = ExcelHandler.parsePastedText(line);
        if (parsed.length > 0) {
          items.push(...parsed);
        }
      }
    });

    return items;
  }
};
