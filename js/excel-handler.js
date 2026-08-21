/**
 * excel-handler.js - Procesamiento y generación de archivos Excel (.xlsx, .csv)
 * Compatible con la biblioteca SheetJS (XLSX).
 * Maneja la importación inteligente de listas de Caddis y Proveedores,
 * y la exportación en el formato exacto requerido por Caddis: (Codigo | Precio Final).
 */

export const ExcelHandler = {
  /**
   * Lee un archivo binario o ArrayBuffer y lo convierte a filas JSON
   */
  async readWorkbook(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Verificar si XLSX está disponible globalmente
          if (typeof XLSX === 'undefined') {
            throw new Error('La librería SheetJS (XLSX) no está cargada. Verifica tu conexión a internet.');
          }
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetNames = workbook.SheetNames;
          
          // Leer la primera hoja por defecto (o recopilar todas)
          const sheetsData = {};
          sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            // Convertir a matriz 2D para análisis profundo
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            sheetsData[sheetName] = rawRows;
          });

          resolve({ workbook, sheetNames, sheetsData });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Detecta y procesa una hoja de cálculo exportada de Caddis
   */
  parseCaddisSheet(rawRows) {
    if (!rawRows || rawRows.length === 0) return [];

    // 1. Encontrar la fila de encabezados
    let headerRowIndex = -1;
    let colMap = {
      codigo: -1,
      articulo: -1,
      precioVenta: -1,
      costoConImp: -1,
      costoSinImp: -1,
      markup: -1,
      margen: -1,
      iva: -1,
      moneda: -1,
      tipo: -1
    };

    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r].map(c => String(c).toLowerCase().trim());

      // Detección flexible de columna de CÓDIGO
      const idxCodigo = row.findIndex(c =>
        c === 'codigo' || c === 'código' || c === 'cod' || c === 'cod.' ||
        c === 'code' || c === 'id' || c.includes('codigo') || c.includes('código') ||
        c === 'nro' || c === 'n°' || c === 'numero' || c === 'nro.'
      );

      // Detección flexible de columna de DESCRIPCIÓN / ARTÍCULO
      const idxArticulo = row.findIndex(c =>
        c === 'articulo' || c === 'artículo' || c === 'descripcion' || c === 'descripción' ||
        c === 'nombre' || c === 'detalle' || c === 'producto' || c === 'desc' ||
        c === 'articulo / descripcion' || c === 'articulo/descripcion' ||
        c.includes('articulo') || c.includes('descripcion') || c.includes('detalle') ||
        c.includes('producto') || c.includes('nombre del') || c.includes('desc.')
      );

      // Detección flexible de columna de PRECIO DE VENTA
      const idxPrecio = row.findIndex(c =>
        c === 'precio venta' || c === 'precio final' || c === 'precio' ||
        c === 'pvp' || c === 'pre' || c === 'pre.' || c === 'pv' || c === 'pvta' ||
        c === 'importe' || c === 'monto' || c === 'valor venta' || c === 'sale price' ||
        c.includes('precio venta') || c.includes('pvp') || c.includes('precio final') ||
        c.includes('precio de venta') || c.includes('pre. venta') || c.includes('pre. vta')
      );

      // Necesitamos al menos código + (descripción O precio)
      if (idxCodigo !== -1 && (idxArticulo !== -1 || idxPrecio !== -1)) {
        headerRowIndex = r;
        colMap.codigo = idxCodigo;
        colMap.articulo = idxArticulo;
        colMap.precioVenta = idxPrecio;

        // Detección flexible de columnas secundarias
        colMap.costoConImp = row.findIndex(c =>
          c.includes('costo con') || c.includes('c. imp') || c.includes('costo c/iva') ||
          c.includes('costo total') || c.includes('costo final') || c.includes('cost with')
        );
        colMap.costoSinImp = row.findIndex(c =>
          c.includes('costo sin') || c.includes('c. sin') || c === 'costo' ||
          c.includes('costo s/iva') || c.includes('neto') || c.includes('cost without')
        );
        colMap.markup = row.findIndex(c => c.includes('markup') || c.includes('mark up'));
        colMap.margen = row.findIndex(c => c.includes('margen') || c.includes('margin'));
        colMap.iva = row.findIndex(c => c.includes('iva') || c === 'iva %' || c.includes('aliquot'));
        colMap.moneda = row.findIndex(c => c.includes('moneda') || c === 'mon' || c.includes('currency'));
        colMap.tipo = row.findIndex(c =>
          c.includes('tipo') || c.includes('rubro') || c.includes('categoria') ||
          c.includes('categoría') || c.includes('grupo') || c.includes('family')
        );
        break;
      }
    }

    // Fallback: si no encontró encabezados, intentar detectar por contenido
    if (headerRowIndex === -1) {
      // Buscar una fila que tenga al menos 2 columnas con contenido mixto (texto + números)
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (!row || row.length < 2) continue;

        const hasText = row.some(c => typeof c === 'string' && c.trim().length > 2 && /[a-zA-Záéíóú]/.test(c));
        const hasNum = row.some(c => typeof c === 'number' || (typeof c === 'string' && /[\d.,]+/.test(c) && c.trim().length < 15));

        if (hasText && hasNum) {
          headerRowIndex = r;
          // Intentar deducir: buscar columnas por tipo de dato
          let codeCol = -1, descCol = -1, priceCol = -1;

          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim();
            const isNum = typeof row[c] === 'number' || /^\d+[.,]?\d*$/.test(val);
            const isText = val.length > 2 && /[a-zA-Záéíóú]/.test(val);

            if (isText && descCol === -1) descCol = c;
            else if (isNum && priceCol === -1) priceCol = c;
          }

          // La primera columna suele ser código
          codeCol = 0;
          if (descCol === -1) descCol = codeCol;
          if (priceCol === -1) priceCol = row.length > 1 ? 1 : 0;

          colMap.codigo = codeCol;
          colMap.articulo = descCol;
          colMap.precioVenta = priceCol;
          break;
        }
      }

      // Último recurso: asumir estructura típica
      if (headerRowIndex === -1) {
        headerRowIndex = 0;
        colMap.codigo = 0;
        colMap.precioVenta = 1;
        colMap.articulo = rawRows[0].length > 2 ? 2 : 0;
      }
    }

    const items = [];
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const codigo = String(row[colMap.codigo] || '').trim();
      if (!codigo || codigo.toLowerCase() === 'codigo') continue;

      const articulo = colMap.articulo !== -1 ? String(row[colMap.articulo] || '').trim() : codigo;
      const precioVenta = this.cleanNumeric(row[colMap.precioVenta]);
      const costoConImpuestos = colMap.costoConImp !== -1 ? this.cleanNumeric(row[colMap.costoConImp]) : 0;
      const costoSinImpuestos = colMap.costoSinImp !== -1 ? this.cleanNumeric(row[colMap.costoSinImp]) : 0;
      const iva = colMap.iva !== -1 ? this.cleanNumeric(row[colMap.iva]) : 21.0;
      const tipo = colMap.tipo !== -1 ? String(row[colMap.tipo] || '').trim() : '';

      items.push({
        codigo,
        articulo: articulo || codigo,
        precioVenta,
        costoConImpuestos,
        costoSinImpuestos,
        iva: iva > 0 ? iva : 21.0,
        tipo
      });
    }

    return items;
  },

  /**
   * Detecta y procesa una hoja de cálculo enviada por un Proveedor
   */
  parseSupplierSheet(rawRows) {
    if (!rawRows || rawRows.length === 0) return [];

    // Encontrar columnas: Artículo / Descripción, Precio / Costo / USD, Stock, IVA
    let headerRowIndex = -1;
    let colDesc = -1;
    let colPrice = -1;
    let colStock = -1;
    let colIva = -1;
    let defaultCurrency = 'USD';

    for (let r = 0; r < Math.min(20, rawRows.length); r++) {
      const row = rawRows[r].map(c => String(c).toLowerCase().trim());
      
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell.includes('articulo') || cell.includes('artículo') || cell.includes('descripcion') ||
            cell.includes('descripción') || cell.includes('detalle') || cell.includes('producto') ||
            cell === 'modelo' || cell === 'item' || cell.includes('nombre') || cell.includes('desc') ||
            cell.includes('articulo /') || cell.includes('detalle del')) {
          if (colDesc === -1) colDesc = c;
        }
        if (cell.includes('usd') || cell.includes('u$s') || cell.includes('precio') || cell.includes('costo') ||
            cell.includes('valor') || cell.includes('pvp') || cell === 'dolar' || cell.includes('importe') ||
            cell.includes('pre.') || cell === 'pv' || cell.includes('p. unitario') || cell.includes('price') ||
            cell.includes('monto') || cell.includes('sale')) {
          if (colPrice === -1) colPrice = c;
        }
        if (cell.includes('stock') || cell.includes('cant') || cell.includes('disponible') || cell.includes('existencia')) {
          if (colStock === -1) colStock = c;
        }
        if (cell.includes('iva') || cell.includes('alicuota') || cell.includes('alícuota') || cell.includes('impuesto')) {
          if (colIva === -1) colIva = c;
        }
      }

      if (colDesc !== -1 && colPrice !== -1) {
        headerRowIndex = r;
        break;
      }
    }

    // Si no encontró encabezados claros, escanear buscando columna de texto vs columna de número
    if (headerRowIndex === -1 || colDesc === -1 || colPrice === -1) {
      headerRowIndex = 0;
      // Columna A (0) suele ser descripción en listas de proveedores como la de la captura 2
      colDesc = 0;
      // Buscar primera columna con formato precio o USD
      for (let c = 1; c < (rawRows[0]?.length || 5); c++) {
        const hasUSD = rawRows.slice(0, 10).some(r => String(r[c] || '').toUpperCase().includes('USD') || String(r[c] || '').includes('$'));
        if (hasUSD) {
          colPrice = c;
          break;
        }
      }
      if (colPrice === -1) colPrice = 3; // Columna D en la captura 2
    }

    const items = [];
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawDesc = String(row[colDesc] || '').trim();
      if (!rawDesc || rawDesc.length < 2) continue;
      
      // Ignorar títulos de sección (ej. "MT TECNOLOGIA", "VIDRIOS", etc.) que no tienen precio
      const rawPrice = row[colPrice];
      const numPrice = this.cleanNumeric(rawPrice);
      if (numPrice <= 0) continue;

      // Detectar moneda de la celda
      const priceStr = String(rawPrice || '').toUpperCase();
      let currency = 'USD';
      if (priceStr.includes('ARS') || (priceStr.includes('$') && !priceStr.includes('USD') && !priceStr.includes('U$S') && numPrice > 500)) {
        currency = 'ARS';
      }

      // Detectar IVA
      let iva = 21.0;
      if (colIva !== -1) {
        const numIva = this.cleanNumeric(row[colIva]);
        if (numIva > 0) iva = numIva;
      } else {
        // Chequear si el texto menciona 10.5%
        if (rawDesc.includes('10.5') || rawDesc.includes('10,5')) {
          iva = 10.5;
        }
      }

      items.push({
        articulo: rawDesc,
        precio: numPrice,
        moneda: currency,
        iva,
        stock: colStock !== -1 ? String(row[colStock] || 'STOCK').trim() : 'STOCK',
        originalRowIndex: r
      });
    }

    return items;
  },

  /**
   * Parsea texto libre pegado (de PDF, WhatsApp o portapapeles)
   */
  parsePastedText(text) {
    if (!text || !text.trim()) return [];

    const lines = text.split(/\r?\n/);
    const items = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Buscar separadores: Tab, coma, punto y coma, o múltiples espacios
      let parts = trimmed.split('\t');
      if (parts.length === 1) parts = trimmed.split(';');
      if (parts.length === 1) parts = trimmed.split(',');

      if (parts.length >= 2) {
        const desc = parts[0].trim();
        const price = this.cleanNumeric(parts[1]);
        if (desc && price > 0) {
          items.push({
            articulo: desc,
            precio: price,
            moneda: parts[1].toUpperCase().includes('USD') ? 'USD' : 'USD',
            iva: 21.0,
            stock: 'STOCK'
          });
        }
      } else {
        // Intentar regex para extraer descripción y precio al final de la línea
        // Ej: "Glass Antiespia Iphone 14 USD 0.85" o "Foco giratorio 5100"
        const match = trimmed.match(/^(.*?)\s+([A-Za-z$]*\s*[\d.,]+)\s*$/);
        if (match) {
          const desc = match[1].trim();
          const price = this.cleanNumeric(match[2]);
          if (desc && price > 0) {
            items.push({
              articulo: desc,
              precio: price,
              moneda: match[2].toUpperCase().includes('USD') ? 'USD' : 'USD',
              iva: 21.0,
              stock: 'STOCK'
            });
          }
        }
      }
    });

    return items;
  },

  /**
   * Lee un archivo PDF y extrae items de la lista de precios de Caddis
   */
  async readCaddisPdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('La librería PDF.js no está cargada. Verifica tu conexión a internet.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const allTextItems = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      textContent.items.forEach(item => {
        const str = item.str.trim();
        if (!str) return;
        allTextItems.push({
          text: str,
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          width: item.width,
          pageNum
        });
      });
    }

    if (allTextItems.length === 0) return [];

    // Agrupar items por línea (misma Y con tolerancia)
    allTextItems.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines = [];
    let currentLine = [allTextItems[0]];
    let currentY = allTextItems[0].y;

    for (let i = 1; i < allTextItems.length; i++) {
      const item = allTextItems[i];
      if (Math.abs(item.y - currentY) < 5) {
        currentLine.push(item);
      } else {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        currentLine = [item];
        currentY = item.y;
      }
    }
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
    }

    // Convertir líneas a strings separados por tab (para reutilizar parsePastedText)
    const textLines = lines.map(line => {
      let result = '';
      let lastX = 0;
      line.forEach(item => {
        const gap = item.x - lastX;
        if (gap > 20) {
          result += '\t';
        } else if (gap > 5 && result.length > 0) {
          result += ' ';
        }
        result += item.text;
        lastX = item.x + (item.width || 0);
      });
      return result;
    });

    // Buscar encabezados para detectar columnas
    let headerLineIndex = -1;
    let colCodigo = -1, colArticulo = -1, colPrecio = -1, colCosto = -1;

    for (let i = 0; i < Math.min(20, textLines.length); i++) {
      const cells = textLines[i].split('\t').map(c => c.toLowerCase().trim());
      const idxCod = cells.findIndex(c => c.includes('cod') || c === 'codigo' || c === 'código');
      const idxArt = cells.findIndex(c => c.includes('articulo') || c.includes('artículo') || c.includes('descripcion') || c.includes('producto'));
      const idxPrec = cells.findIndex(c => c.includes('precio venta') || c.includes('precio final') || c.includes('pvp') || c === 'precio');
      const idxCost = cells.findIndex(c => c.includes('costo'));

      if (idxCod !== -1 || idxPrec !== -1) {
        headerLineIndex = i;
        colCodigo = idxCod;
        colArticulo = idxArt;
        colPrecio = idxPrec;
        colCosto = idxCost;
        break;
      }
    }

    // Si no encontró encabezados, intentar por posición (columnas fijas típicas de Caddis)
    if (headerLineIndex === -1) {
      headerLineIndex = 0;
      // Detectar: buscar línea con al menos 2 columnas donde una sea numérica
      for (let i = 0; i < Math.min(10, textLines.length); i++) {
        const cells = textLines[i].split('\t');
        if (cells.length >= 2) {
          const hasNum = cells.some(c => /[\d.,]+/.test(c) && c.length < 15);
          const hasText = cells.some(c => /[a-zA-Záéíóú]/.test(c) && c.length > 3);
          if (hasNum && hasText) {
            headerLineIndex = i;
            break;
          }
        }
      }
    }

    // Extraer items desde la línea siguiente al encabezado
    const items = [];
    for (let i = headerLineIndex + 1; i < textLines.length; i++) {
      const line = textLines[i].trim();
      if (!line) continue;

      const cells = line.split('\t').map(c => c.trim());

      // Ignorar líneas de totales / pie de página
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('total') || lowerLine.includes('subtotal') || lowerLine.includes('pagina') || lowerLine.includes('page')) continue;

      let codigo = '', articulo = '', precioVenta = 0, costoConImp = 0;

      if (colCodigo !== -1 && colCodigo < cells.length) {
        codigo = cells[colCodigo];
      }
      if (colArticulo !== -1 && colArticulo < cells.length) {
        articulo = cells[colArticulo];
      }
      if (colPrecio !== -1 && colPrecio < cells.length) {
        precioVenta = this.cleanNumeric(cells[colPrecio]);
      }
      if (colCosto !== -1 && colCosto < cells.length) {
        costoConImp = this.cleanNumeric(cells[colCosto]);
      }

      // Fallback: si no mapeó columnas, intentar detectar por contenido
      if (!codigo && !articulo) {
        if (cells.length >= 2) {
          // Asumir: primera columna = código o nombre, última numérica = precio
          const lastCell = cells[cells.length - 1];
          const numVal = this.cleanNumeric(lastCell);
          if (numVal > 0) {
            precioVenta = numVal;
            if (cells.length >= 3) {
              codigo = cells[0];
              articulo = cells[1];
            } else {
              articulo = cells[0];
            }
          }
        }
      }

      if (!codigo && !articulo) continue;
      if (precioVenta <= 0) continue;

      if (!articulo) articulo = codigo;

      items.push({
        codigo: codigo || '',
        articulo,
        precioVenta,
        costoConImpuestos: costoConImp,
        costoSinImpuestos: 0,
        iva: 21.0,
        tipo: ''
      });
    }

    return items;
  },

  /**
   * Limpia y extrae un valor numérico de strings argentinos o internacionales (ej: "1.800,50", "$ 150.00", "USD 0,85")
   */
  cleanNumeric(value) {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (!value) return 0;

    let str = String(value)
      .replace(/[^\d.,-]/g, '') // Deja solo dígitos, puntos, comas y signo menos
      .trim();

    if (!str) return 0;

    // Caso formato europeo/argentino: 1.500,50 o 0,85
    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // El punto es de miles y la coma es decimal (1.500,50)
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // La coma es de miles y el punto es decimal (1,500.50)
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      // Solo tiene comas: si tiene 1 sola coma cerca del final, es decimal (ej. "0,85" o "1250,00")
      str = str.replace(',', '.');
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  },

  /**
   * EXPORTADOR 1: Formato exacto requerido por Caddis para importar precios
   * Genera archivo .xlsx con 2 columnas: Codigo | Precio Final
   */
  exportCaddisPriceList(items, filename = 'caddis_precios_importar.xlsx', priceField = 'finalPvp') {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS no está cargada. No se pudo generar el archivo.');
      return;
    }

    // Filtrar solo los ítems que tienen código Caddis y precio final > 0
    const exportData = [
      ['Codigo', 'Precio Final'] // Encabezado exacto de Caddis (como en la captura 3)
    ];

    items.forEach(item => {
      const codigo = item.matchedCaddisItem?.codigo || item.codigo;
      const price = item.calculations ? item.calculations[priceField] : (item[priceField] || item.precioVenta);

      if (codigo && price > 0) {
        exportData.push([
          String(codigo).trim(),
          Number(price) // Número para que Excel lo formatee correctamente
        ]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);

    // Formatear el ancho de columnas
    worksheet['!cols'] = [
      { wch: 20 }, // Codigo
      { wch: 18 }  // Precio Final
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Precios');

    // Descargar archivo
    XLSX.writeFile(workbook, filename);
  },

  /**
   * EXPORTADOR 2: Reporte completo de auditoría y análisis para control interno
   */
  exportAuditReport(matchedItems, dollarRate, filename = 'reporte_actualizacion_precios.xlsx') {
    if (typeof XLSX === 'undefined') return;

    const reportData = [
      [
        'Código Caddis',
        'Artículo Caddis',
        'Artículo Proveedor',
        'Moneda Prov.',
        'Costo Prov.',
        'Cotiz. Dólar',
        'Costo ARS s/IVA',
        'IVA %',
        'Costo c/Impuestos',
        'PVP Anterior (Caddis)',
        'PVP Nuevo Calculado (+120%)',
        'Aumento PVP ($)',
        'Aumento PVP (%)',
        'Mayorista Anterior',
        'Mayorista Nuevo',
        'Margen PVP %',
        'Estado / Decisión'
      ]
    ];

    matchedItems.forEach(item => {
      const cItem = item.matchedCaddisItem || {};
      const sItem = item.supplierItem || {};
      const calc = item.calculations || {};

      reportData.push([
        cItem.codigo || '(Sin código)',
        cItem.articulo || '(No vinculado)',
        sItem.articulo || '',
        sItem.moneda || 'USD',
        sItem.precio || 0,
        calc.dollarRate || dollarRate,
        Math.round(calc.costArsWithoutTax || 0),
        calc.ivaRate || 21,
        Math.round(calc.costWithTax || 0),
        cItem.precioVenta || 0,
        calc.finalPvp || 0,
        Math.round(calc.diffPvp || 0),
        `${Math.round(calc.diffPvpPercent || 0)}%`,
        cItem.precioMayorista || 0,
        calc.finalMayorista || 0,
        `${Math.round(calc.marginPvpPercent || 0)}%`,
        calc.statusMessage || ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría de Precios');

    XLSX.writeFile(workbook, filename);
  }
};
