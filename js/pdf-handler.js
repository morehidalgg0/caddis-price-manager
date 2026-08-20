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
   * Parsea un reporte de PDF con el formato exacto de Caddis (como en la captura: "Listas de Precios")
   * Columnas: Codigo | Tipo | Detalle | Neto | Iva % | Precio Monto | Precio Venta | Moneda | Cotizacion | Puntos | Grupo | Lista
   */
  parseCaddisPdfLines(lines) {
    const items = [];

    lines.forEach(line => {
      // Ignorar encabezados, fechas y pies de página
      if (
        line.startsWith('Listas de Precios') ||
        line.includes('Codigo Tipo Detalle') ||
        line.includes('Página') ||
        line.includes('Pagina') ||
        line.match(/^\d{2}-[A-Za-z]{3}-\d{4}/) // Ej: "20-Aug-2026 01:30:17"
      ) {
        return;
      }

      // Regex para detectar filas de productos de Caddis
      // Estructura típica:
      // Codigo [Tipo] Detalle... Neto Iva% PrecioMonto PrecioVenta Moneda Cotiz Puntos Grupo Lista
      // Ej: "AS ANILLO SOUL 1.322,31 21,00 % 1.600,00 1.600,00 SAR 1 0 DISCONTINUO MINORISTA"
      // Ej: "AI ACCESORIOS ADAPTADOR INTERNACIONAL 6.280,99 21,00 % 7.600,00 7.600,00 SAR 1 0 VARIOS MINORISTA"
      // Ej: "GLOBAL ACCESORIOS CONTADORA DE BILLETES GLOBAL 145.334,84 10,50 % 161.700,00 161.700,00 SAR 1 0 VARIOS MINORISTA"
      // Ej: "SR SERVICE 0,00 21,00 % 0,00 0,00 SAR 1 0 REPARACION MINORISTA"

      const caddisRowRegex = /^([A-Za-z0-9\-_./]+)\s+(?:(ACCESORIOS|CABLES|PARLANTE|LAMPARA|CELULAR|TECLADOS|ADAPTADORES|CARGADORES|MOCHILAS|SMARTWATCH|AURICULARES|EQUIPOS|VARIOS|VIDRIOS|FUNDAS|REPARACION)\s+)?(.*?)\s+([\d.,]+)\s+([\d.,]+)\s*%\s+([\d.,]+)\s+([\d.,]+)\s+(SAR|ARS|USD)\b.*$/i;

      const match = line.match(caddisRowRegex);

      if (match) {
        const codigo = match[1].trim();
        const tipo = match[2] ? match[2].trim() : 'VARIOS';
        const detalle = match[3].trim();
        const netoStr = match[4];
        const ivaStr = match[5];
        const precioMontoStr = match[6];
        const precioVentaStr = match[7];
        const moneda = match[8].toUpperCase() === 'SAR' ? 'ARS' : match[8].toUpperCase();

        const neto = ExcelHandler.cleanNumeric(netoStr);
        const iva = ExcelHandler.cleanNumeric(ivaStr) || 21.0;
        const precioVenta = ExcelHandler.cleanNumeric(precioVentaStr) || ExcelHandler.cleanNumeric(precioMontoStr);
        const costoConImpuestos = neto > 0 ? neto * (1 + iva / 100) : 0;

        items.push({
          codigo,
          tipo,
          articulo: detalle || codigo,
          costoSinImpuestos: neto,
          costoConImpuestos,
          iva,
          precioVenta,
          moneda,
          precioMayorista: Math.round(precioVenta * 0.7) // Estimado si no viene explícito
        });
      } else {
        // Fallback para filas con formatos ligeramente distintos
        // Buscar código al inicio y números al final (Neto, Iva, Precios)
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const firstToken = parts[0];
          const hasCurrency = line.includes('SAR') || line.includes('ARS') || line.includes('USD');
          const hasPercent = line.includes('%');

          if (hasCurrency && hasPercent && firstToken.length <= 15) {
            // Intentar extraer números
            const nums = line.match(/[\d.,]+/g) || [];
            if (nums.length >= 4) {
              const codigo = firstToken;
              // Extraer IVA
              const ivaMatch = line.match(/([\d.,]+)\s*%/);
              const iva = ivaMatch ? ExcelHandler.cleanNumeric(ivaMatch[1]) : 21.0;
              
              // Los últimos 2 números antes de SAR suelen ser los precios
              const idxSar = parts.findIndex(p => p === 'SAR' || p === 'ARS' || p === 'USD');
              let pVenta = 0;
              let neto = 0;
              if (idxSar >= 2) {
                pVenta = ExcelHandler.cleanNumeric(parts[idxSar - 1]);
              }

              // El detalle es lo que está entre el código y los números
              const descTokens = parts.slice(1, parts.length - 6);
              const detalle = descTokens.join(' ');

              if (codigo && pVenta > 0) {
                items.push({
                  codigo,
                  tipo: 'VARIOS',
                  articulo: detalle || codigo,
                  costoSinImpuestos: neto,
                  costoConImpuestos: neto > 0 ? neto * (1 + iva / 100) : 0,
                  iva,
                  precioVenta: pVenta,
                  moneda: 'ARS',
                  precioMayorista: Math.round(pVenta * 0.7)
                });
              }
            }
          }
        }
      }
    });

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
