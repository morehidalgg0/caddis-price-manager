/**
 * app.js - Controlador principal de la interfaz de usuario y lógica de la aplicación
 * Gestiona el flujo de trabajo, eventos, renderizado reactivo y exportación.
 */

import { Storage } from './storage.js';
import { Calculator } from './calculator.js';
import { Matcher } from './matcher.js';
import { ExcelHandler } from './excel-handler.js';
import { PdfHandler } from './pdf-handler.js';
import { ExchangeAPI } from './api.js';
import { SAMPLE_CADDIS_ITEMS, SAMPLE_SUPPLIER_ITEMS } from './sample-data.js';

// Estado global de la aplicación
const AppState = {
  config: Storage.getConfig(),
  caddisItems: Storage.getCaddisItems(),
  supplierItems: [],
  matchedData: [],
  selectedRowIds: new Set(),
  activeTab: 'setup', // 'setup' | 'matcher' | 'analysis' | 'export' | 'calculator' | 'saved-mappings'
  filterStatus: 'ALL', // 'ALL' | 'NEEDS_INCREASE' | 'LOSS_ALERT' | 'UNMATCHED' | 'MATCHED'
  searchQuery: '',
  editingMatchIndex: null, // Para el modal de vinculación manual
  isDollarLoading: false
};

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  bindEvents();
  renderConfigInputs();
  checkStoredData();
  updateLiveDollar();
  render();
}

/**
 * Vincula los eventos del DOM
 */
function bindEvents() {
  // Navegación por Pestañas / Pasos
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      setActiveTab(tab);
    });
  });

  // Inputs de Configuración Global
  const dollarInput = document.getElementById('input-dollar-rate');
  if (dollarInput) {
    dollarInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      AppState.config.dollarRate = val;
      Storage.saveConfig({ dollarRate: val });
      recalculateAll();
    });
  }

  const markupPvpInput = document.getElementById('input-markup-pvp');
  if (markupPvpInput) {
    markupPvpInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      AppState.config.markupPvp = val;
      Storage.saveConfig({ markupPvp: val });
      recalculateAll();
    });
  }

  const markupMayInput = document.getElementById('input-markup-mayorista');
  if (markupMayInput) {
    markupMayInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      AppState.config.markupMayorista = val;
      Storage.saveConfig({ markupMayorista: val });
      recalculateAll();
    });
  }

  const roundingSelect = document.getElementById('select-rounding');
  if (roundingSelect) {
    roundingSelect.addEventListener('change', (e) => {
      AppState.config.roundingRule = e.target.value;
      Storage.saveConfig({ roundingRule: e.target.value });
      recalculateAll();
    });
  }

  // Botón Refrescar Dólar API
  const btnRefreshDollar = document.getElementById('btn-refresh-dollar');
  if (btnRefreshDollar) {
    btnRefreshDollar.addEventListener('click', updateLiveDollar);
  }

  // Carga de Archivos Caddis (Dropzone & File Input)
  setupDropzone('dropzone-caddis', 'file-input-caddis', handleCaddisFileUpload);
  
  // Carga de Archivos Proveedor (Dropzone & File Input)
  setupDropzone('dropzone-supplier', 'file-input-supplier', handleSupplierFileUpload);

  // Botón Pegar Texto de Proveedor
  const btnParsePasted = document.getElementById('btn-parse-pasted');
  if (btnParsePasted) {
    btnParsePasted.addEventListener('click', handlePastedText);
  }

  // Botón Cargar Datos de Demostración
  const btnLoadSample = document.getElementById('btn-load-sample-data');
  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', loadSampleData);
  }

  // Filtros de la Tabla de Análisis
  const filterSelect = document.getElementById('filter-status-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      AppState.filterStatus = e.target.value;
      renderAnalysisTable();
    });
  }

  const searchInput = document.getElementById('search-table-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      renderAnalysisTable();
    });
  }

  // Checkbox Seleccionar Todos
  const selectAllCheckbox = document.getElementById('checkbox-select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        AppState.matchedData.forEach((_, idx) => AppState.selectedRowIds.add(idx));
      } else {
        AppState.selectedRowIds.clear();
      }
      renderAnalysisTable();
    });
  }

  // Botones de Exportación
  const btnExportMinorista = document.getElementById('btn-export-caddis-minorista');
  if (btnExportMinorista) {
    btnExportMinorista.addEventListener('click', () => exportForCaddis('finalPvp', 'minorista'));
  }

  const btnExportMayorista = document.getElementById('btn-export-caddis-mayorista');
  if (btnExportMayorista) {
    btnExportMayorista.addEventListener('click', () => exportForCaddis('finalMayorista', 'mayorista'));
  }

  const btnExportAudit = document.getElementById('btn-export-audit-report');
  if (btnExportAudit) {
    btnExportAudit.addEventListener('click', exportAuditReport);
  }

  // Modal de Búsqueda y Asociación Manual
  const modalClose = document.getElementById('modal-match-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeModalMatch);
  }

  const modalSearchInput = document.getElementById('modal-caddis-search');
  if (modalSearchInput) {
    modalSearchInput.addEventListener('input', (e) => {
      renderModalSearchResults(e.target.value);
    });
  }

  // Simulador / Calculadora Rápida
  const calcCostInput = document.getElementById('calc-input-cost');
  const calcCurrencySelect = document.getElementById('calc-select-currency');
  const calcIvaSelect = document.getElementById('calc-select-iva');
  const calcMarkupInput = document.getElementById('calc-input-markup');

  const updateSim = () => {
    const cost = parseFloat(calcCostInput?.value) || 0;
    const curr = calcCurrencySelect?.value || 'USD';
    const iva = parseFloat(calcIvaSelect?.value) || 21;
    const mark = parseFloat(calcMarkupInput?.value) || AppState.config.markupPvp;

    const res = Calculator.calculateItem({
      supplierCost: cost,
      currency: curr,
      dollarRate: AppState.config.dollarRate,
      ivaRate: iva,
      markupPvp: mark,
      markupMayorista: AppState.config.markupMayorista,
      roundingRule: AppState.config.roundingRule
    });

    const elCostoArs = document.getElementById('calc-res-cost-ars');
    const elCostoIva = document.getElementById('calc-res-cost-iva');
    const elPvp = document.getElementById('calc-res-pvp');
    const elMay = document.getElementById('calc-res-mayorista');
    const elGanancia = document.getElementById('calc-res-ganancia');

    if (elCostoArs) elCostoArs.textContent = Calculator.formatCurrency(res.costArsWithoutTax);
    if (elCostoIva) elCostoIva.textContent = Calculator.formatCurrency(res.costWithTax);
    if (elPvp) elPvp.textContent = Calculator.formatCurrency(res.finalPvp);
    if (elMay) elMay.textContent = Calculator.formatCurrency(res.finalMayorista);
    if (elGanancia) elGanancia.textContent = Calculator.formatCurrency(res.finalPvp - res.costWithTax);
  };

  [calcCostInput, calcCurrencySelect, calcIvaSelect, calcMarkupInput].forEach(el => {
    if (el) el.addEventListener('input', updateSim);
  });
}

/**
 * Configura zonas de arrastrar y soltar archivos (Drag and drop)
 */
function setupDropzone(dropzoneId, inputId, handlerFn) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(inputId);

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handlerFn(file);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handlerFn(file);
  });
}

/**
 * Consulta y actualiza la cotización del dólar en vivo
 */
async function updateLiveDollar() {
  const btn = document.getElementById('btn-refresh-dollar');
  const tag = document.getElementById('dollar-live-tag');
  
  if (btn) btn.classList.add('spinning');
  
  const res = await ExchangeAPI.fetchDollarRates();
  if (btn) btn.classList.remove('spinning');

  if (res.success && res.rates.bna) {
    if (tag) tag.textContent = `Dólar Oficial/BNA: $${res.rates.bna.toFixed(2)}`;
    // Si el usuario no lo modificó manualmente, podemos sugerir el valor del BNA
    if (!AppState.config.dollarRate || AppState.config.dollarRate === 1510) {
      AppState.config.dollarRate = res.rates.bna;
      const input = document.getElementById('input-dollar-rate');
      if (input) input.value = res.rates.bna;
      Storage.saveConfig({ dollarRate: res.rates.bna });
      recalculateAll();
    }
  }
}

/**
 * Renderiza los inputs con la configuración actual
 */
function renderConfigInputs() {
  const dollarInput = document.getElementById('input-dollar-rate');
  const markupPvpInput = document.getElementById('input-markup-pvp');
  const markupMayInput = document.getElementById('input-markup-mayorista');
  const roundingSelect = document.getElementById('select-rounding');

  if (dollarInput) dollarInput.value = AppState.config.dollarRate;
  if (markupPvpInput) markupPvpInput.value = AppState.config.markupPvp;
  if (markupMayInput) markupMayInput.value = AppState.config.markupMayorista;
  if (roundingSelect) roundingSelect.value = AppState.config.roundingRule;
}

/**
 * Carga de datos de demostración con 1 clic
 */
function loadSampleData() {
  AppState.caddisItems = [...SAMPLE_CADDIS_ITEMS];
  AppState.supplierItems = [...SAMPLE_SUPPLIER_ITEMS];
  
  Storage.saveCaddisItems(AppState.caddisItems);
  
  processMatchingAndCalculations();
  setActiveTab('analysis');
  showToast('¡Datos de demostración cargados exitosamente!', 'success');
}

/**
 * Maneja la subida de archivos de Caddis (Excel, CSV o PDF multipágina)
 */
async function handleCaddisFileUpload(file) {
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  showLoading(true, isPdf ? 'Iniciando lectura del PDF de Caddis...' : 'Leyendo archivo de Caddis...');
  
  try {
    let items = [];

    if (isPdf) {
      const lines = await PdfHandler.extractLinesFromPdf(file, (curr, total) => {
        showLoading(true, `Leyendo PDF de Caddis (Página ${curr} de ${total})...`);
      });
      items = PdfHandler.parseCaddisPdfLines(lines);
    } else {
      const { sheetsData } = await ExcelHandler.readWorkbook(file);
      const firstSheetName = Object.keys(sheetsData)[0];
      const rows = sheetsData[firstSheetName];
      items = ExcelHandler.parseCaddisSheet(rows);
    }

    if (items.length === 0) {
      throw new Error('No se pudieron extraer productos válidos del archivo. Si es un PDF, verifica que contenga la tabla de Listas de Precios de Caddis.');
    }

    AppState.caddisItems = items;
    Storage.saveCaddisItems(items);

    showToast(`Caddis: ${items.length} artículos importados correctamente.`, 'success');
    
    if (AppState.supplierItems.length > 0) {
      processMatchingAndCalculations();
      setActiveTab('matcher');
    } else {
      render();
    }
  } catch (err) {
    showToast(`Error al procesar archivo de Caddis: ${err.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Maneja la subida de archivos del Proveedor (Excel, CSV o PDF)
 */
async function handleSupplierFileUpload(file) {
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  showLoading(true, isPdf ? 'Iniciando lectura del PDF del proveedor...' : 'Leyendo lista del proveedor...');
  
  try {
    let allSupplierItems = [];

    if (isPdf) {
      const lines = await PdfHandler.extractLinesFromPdf(file, (curr, total) => {
        showLoading(true, `Leyendo PDF del proveedor (Página ${curr} de ${total})...`);
      });
      
      // Probar primero si es un formato Caddis exportado por el proveedor, o formato genérico
      const caddisFormatItems = PdfHandler.parseCaddisPdfLines(lines);
      if (caddisFormatItems.length > 0) {
        // Convertir formato Caddis a formato proveedor con costo = neto o precio
        allSupplierItems = caddisFormatItems.map(c => ({
          articulo: c.articulo,
          precio: c.costoSinImpuestos > 0 ? c.costoSinImpuestos : c.precioVenta,
          moneda: c.moneda || 'ARS',
          iva: c.iva || 21.0,
          stock: 'STOCK'
        }));
      } else {
        allSupplierItems = PdfHandler.parseSupplierPdfLines(lines);
      }
    } else {
      const { sheetsData } = await ExcelHandler.readWorkbook(file);
      
      // Si tiene múltiples hojas (ej. VIDRIOS, FUNDAS, MT TECNOLOGIA como en la captura 2), procesar todas
      Object.keys(sheetsData).forEach(sheetName => {
        const rows = sheetsData[sheetName];
        const parsed = ExcelHandler.parseSupplierSheet(rows);
        allSupplierItems = allSupplierItems.concat(parsed);
      });
    }

    if (allSupplierItems.length === 0) {
      throw new Error('No se encontraron artículos con precios válidos en el archivo del proveedor.');
    }

    AppState.supplierItems = allSupplierItems;
    showToast(`Proveedor: ${allSupplierItems.length} artículos cargados.`, 'success');

    if (AppState.caddisItems.length > 0) {
      processMatchingAndCalculations();
      setActiveTab('matcher');
    } else {
      showToast('Por favor carga o selecciona la lista de artículos de Caddis para vincularlos.', 'warning');
      render();
    }
  } catch (err) {
    showToast(`Error al leer archivo del proveedor: ${err.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Maneja texto pegado del portapapeles (PDFs, mensajes de WhatsApp)
 */
function handlePastedText() {
  const textarea = document.getElementById('textarea-pasted-supplier');
  if (!textarea || !textarea.value.trim()) {
    showToast('Por favor pega texto con productos y precios.', 'warning');
    return;
  }

  const items = ExcelHandler.parsePastedText(textarea.value);
  if (items.length === 0) {
    showToast('No se pudieron extraer productos y precios del texto ingresado.', 'error');
    return;
  }

  AppState.supplierItems = items;
  showToast(`${items.length} artículos extraídos del texto.`, 'success');

  if (AppState.caddisItems.length > 0) {
    processMatchingAndCalculations();
    setActiveTab('matcher');
  } else {
    render();
  }
}

/**
 * Procesa el emparejamiento inteligente y los cálculos financieros
 */
function processMatchingAndCalculations() {
  const matched = Matcher.matchAll(AppState.supplierItems, AppState.caddisItems);
  
  // Realizar cálculos financieros para cada ítem emparejado
  AppState.matchedData = matched.map((item, index) => {
    const sItem = item.supplierItem;
    const cItem = item.matchedCaddisItem;

    const calc = Calculator.calculateItem({
      supplierCost: sItem.precio,
      currency: sItem.moneda || 'USD',
      dollarRate: AppState.config.dollarRate,
      ivaRate: sItem.iva || AppState.config.defaultIva,
      markupPvp: AppState.config.markupPvp,
      markupMayorista: AppState.config.markupMayorista,
      roundingRule: AppState.config.roundingRule,
      currentPvp: cItem ? cItem.precioVenta : 0,
      currentMayorista: cItem ? cItem.precioMayorista : 0,
      currentCostWithTax: cItem ? cItem.costoConImpuestos : 0,
      currentCostWithoutTax: cItem ? cItem.costoSinImpuestos : 0
    });

    return {
      ...item,
      id: index,
      calculations: calc
    };
  });

  // Por defecto, preseleccionar todos los que requieren aumento o tienen código válido
  AppState.selectedRowIds.clear();
  AppState.matchedData.forEach((row, idx) => {
    if (row.matchedCaddisItem) {
      AppState.selectedRowIds.add(idx);
    }
  });

  render();
}

/**
 * Recalcula todos los precios cuando cambian variables (Dólar, Markup, IVA, Redondeo)
 */
function recalculateAll() {
  if (AppState.matchedData.length === 0) return;

  AppState.matchedData = AppState.matchedData.map(item => {
    const sItem = item.supplierItem;
    const cItem = item.matchedCaddisItem;

    const calc = Calculator.calculateItem({
      supplierCost: sItem.precio,
      currency: sItem.moneda || 'USD',
      dollarRate: AppState.config.dollarRate,
      ivaRate: sItem.iva || AppState.config.defaultIva,
      markupPvp: AppState.config.markupPvp,
      markupMayorista: AppState.config.markupMayorista,
      roundingRule: AppState.config.roundingRule,
      currentPvp: cItem ? cItem.precioVenta : 0,
      currentMayorista: cItem ? cItem.precioMayorista : 0,
      currentCostWithTax: cItem ? cItem.costoConImpuestos : 0,
      currentCostWithoutTax: cItem ? cItem.costoSinImpuestos : 0
    });

    return {
      ...item,
      calculations: calc
    };
  });

  render();
}

/**
 * Cambia la pestaña activa del flujo
 */
function setActiveTab(tabId) {
  AppState.activeTab = tabId;

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  render();
}

/**
 * Revisa si hay datos guardados previamente
 */
function checkStoredData() {
  if (AppState.caddisItems.length > 0) {
    const el = document.getElementById('caddis-status-badge');
    if (el) el.innerHTML = `<span class="badge badge-success">✓ ${AppState.caddisItems.length} artículos en memoria</span>`;
  }
}

/**
 * Renderizado general
 */
function render() {
  renderHeaderStats();
  renderSetupSummary();
  renderMatcherTable();
  renderAnalysisTable();
  renderSavedMappings();
}

/**
 * Renderiza estadísticas clave en el encabezado
 */
function renderHeaderStats() {
  const totalProv = AppState.supplierItems.length;
  const totalCaddis = AppState.caddisItems.length;
  
  let needsIncreaseCount = 0;
  let lossAlertCount = 0;
  let matchedCount = 0;

  AppState.matchedData.forEach(item => {
    if (item.matchedCaddisItem) matchedCount++;
    if (item.calculations?.status === 'NEEDS_INCREASE') needsIncreaseCount++;
    if (item.calculations?.status === 'LOSS_ALERT') lossAlertCount++;
  });

  const elProvCount = document.getElementById('stat-prov-count');
  const elCaddisCount = document.getElementById('stat-caddis-count');
  const elIncreaseCount = document.getElementById('stat-increase-count');
  const elLossCount = document.getElementById('stat-loss-count');
  const elMatchedCount = document.getElementById('stat-matched-count');

  if (elProvCount) elProvCount.textContent = totalProv;
  if (elCaddisCount) elCaddisCount.textContent = totalCaddis;
  if (elIncreaseCount) elIncreaseCount.textContent = needsIncreaseCount;
  if (elLossCount) elLossCount.textContent = lossAlertCount;
  if (elMatchedCount) elMatchedCount.textContent = `${matchedCount}/${totalProv}`;
}

/**
 * Renderiza el resumen en el Paso 1
 */
function renderSetupSummary() {
  const summaryEl = document.getElementById('setup-summary-container');
  if (!summaryEl) return;

  if (AppState.caddisItems.length === 0 && AppState.supplierItems.length === 0) {
    summaryEl.innerHTML = `
      <div class="empty-state">
        <p class="text-muted">Carga los archivos de Caddis y Proveedor o haz clic en <strong>"Cargar Ejemplo"</strong> para ver el sistema en funcionamiento.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="summary-cards-grid">
      <div class="summary-card">
        <div class="summary-label">Artículos Caddis</div>
        <div class="summary-val">${AppState.caddisItems.length}</div>
        <div class="summary-sub">Base de datos de precios actual</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Artículos Proveedor</div>
        <div class="summary-val">${AppState.supplierItems.length}</div>
        <div class="summary-sub">Nuevos costos cargados</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-label">Cotización Dólar BNA</div>
        <div class="summary-val">$ ${AppState.config.dollarRate.toLocaleString('es-AR')}</div>
        <div class="summary-sub">Markup PVP: +${AppState.config.markupPvp}%</div>
      </div>
    </div>
  `;

  // Tabla Caddis con busqueda
  if (AppState.caddisItems.length > 0) {
    html += '<div class="card-panel" style="margin-top: 12px;">'
      + '<div class="panel-header" style="border-bottom: none; padding-bottom: 0;">'
      + '<h3 style="font-size: 14px; font-weight: 700;">Articulos Caddis (' + AppState.caddisItems.length + ')</h3>'
      + '<input type="text" id="search-caddis-preview" class="form-input" placeholder="Buscar codigo o nombre..." style="width: 220px; font-size: 12px; padding: 4px 8px;">'
      + '</div>'
      + '<div class="table-container" style="max-height: 400px; overflow-y: auto;">'
      + '<table class="data-table"><thead style="position: sticky; top: 0; z-index: 1;"><tr>'
      + '<th style="width: 100px;">Codigo</th><th>Articulo</th>'
      + '<th class="text-right" style="width: 120px;">PVP Actual</th><th class="text-right" style="width: 80px;">IVA %</th>'
      + '</tr></thead><tbody id="caddis-preview-tbody">';
    AppState.caddisItems.forEach(item => {
      html += '<tr><td><span class="code-pill">' + escapeHtml(item.codigo) + '</span></td>'
        + '<td>' + escapeHtml(item.articulo) + '</td>'
        + '<td class="text-right font-mono">$ ' + item.precioVenta.toLocaleString('es-AR') + '</td>'
        + '<td class="text-right">' + (item.iva || 21) + '%</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  // Tabla Proveedor con busqueda
  if (AppState.supplierItems.length > 0) {
    html += '<div class="card-panel" style="margin-top: 12px;">'
      + '<div class="panel-header" style="border-bottom: none; padding-bottom: 0;">'
      + '<h3 style="font-size: 14px; font-weight: 700;">Articulos Proveedor (' + AppState.supplierItems.length + ')</h3>'
      + '<input type="text" id="search-supplier-preview" class="form-input" placeholder="Buscar nombre..." style="width: 220px; font-size: 12px; padding: 4px 8px;">'
      + '</div>'
      + '<div class="table-container" style="max-height: 400px; overflow-y: auto;">'
      + '<table class="data-table"><thead style="position: sticky; top: 0; z-index: 1;"><tr>'
      + '<th>Articulo</th><th class="text-right" style="width: 80px;">Moneda</th>'
      + '<th class="text-right" style="width: 120px;">Costo</th><th class="text-right" style="width: 80px;">IVA %</th>'
      + '</tr></thead><tbody id="supplier-preview-tbody">';
    AppState.supplierItems.forEach(item => {
      html += '<tr><td>' + escapeHtml(item.articulo) + '</td>'
        + '<td class="text-right">' + escapeHtml(item.moneda || 'USD') + '</td>'
        + '<td class="text-right font-mono">' + (item.moneda || 'USD') + ' ' + item.precio.toFixed(2) + '</td>'
        + '<td class="text-right">' + (item.iva || 21) + '%</td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  summaryEl.innerHTML = html;

  var sc = document.getElementById('search-caddis-preview');
  if (sc) sc.addEventListener('input', function(e) { filterPreviewTable('caddis-preview-tbody', e.target.value); });
  var ss = document.getElementById('search-supplier-preview');
  if (ss) ss.addEventListener('input', function(e) { filterPreviewTable('supplier-preview-tbody', e.target.value); });
}

function filterPreviewTable(tbodyId, query) {
  var q = query.toLowerCase();
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(function(tr) {
    tr.style.display = tr.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
  });
}

/**
 * Renderiza la tabla del Paso 2 (Vinculación de productos / Smart Matcher)
 */
function renderMatcherTable() {
  const container = document.getElementById('matcher-table-tbody');
  if (!container) return;

  if (AppState.matchedData.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-6 text-muted">
          No hay artículos de proveedor cargados aún. Por favor sube un archivo en el Paso 1.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = AppState.matchedData.map((row, idx) => {
    const sItem = row.supplierItem;
    const cItem = row.matchedCaddisItem;
    const score = Math.round(row.matchScore * 100);

    let badgeClass = 'badge-danger';
    let badgeText = 'Sin Vinculación';
    if (row.isManualMapping) {
      badgeClass = 'badge-primary';
      badgeText = '✓ Confirmado';
    } else if (score >= 75) {
      badgeClass = 'badge-success';
      badgeText = `Alta (${score}%)`;
    } else if (score >= 45) {
      badgeClass = 'badge-warning';
      badgeText = `Media (${score}%)`;
    } else if (cItem) {
      badgeClass = 'badge-neutral';
      badgeText = `Baja (${score}%)`;
    }

    return `
      <tr ${row.isManualMapping ? 'style="background: rgba(34,197,94,0.06);"' : ''}>
        <td>
          <strong>${escapeHtml(sItem.articulo)}</strong>
          <div class="text-xs text-muted">Costo: ${sItem.moneda} ${sItem.precio} | IVA ${sItem.iva}%</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </td>
        <td>
          ${cItem ? `
            <div><strong>[${escapeHtml(cItem.codigo)}]</strong> ${escapeHtml(cItem.articulo)}</div>
            <div class="text-xs text-muted">PVP Actual en Caddis: $ ${cItem.precioVenta.toLocaleString('es-AR')}</div>
          ` : `
            <span class="text-danger">Sin coincidencia automática</span>
          `}
          <div class="code-link-row" style="margin-top: 4px; display: flex; gap: 4px; align-items: center;">
            <input type="text" class="form-input code-link-input" data-index="${idx}" placeholder="Escribí el código Caddis..." style="width: 160px; font-size: 12px; padding: 3px 6px; margin: 0;">
            <button class="btn btn-xs btn-primary btn-link-code" data-index="${idx}" title="Buscar código y vincular">Vincular</button>
          </div>
        </td>
        <td class="text-center" style="white-space: nowrap;">
          ${cItem ? `
            <button class="btn btn-sm btn-confirm btn-confirm-match ${row.isManualMapping ? 'confirmed' : ''}" data-index="${idx}" title="${row.isManualMapping ? 'Ya está confirmado y guardado' : 'Confirmar que es el mismo artículo y guardar para siempre'}">
              ${row.isManualMapping ? '✅ Confirmado' : '✓ Confirmar'}
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Vincular eventos de botones de la tabla
  container.querySelectorAll('.btn-action-match').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      openModalMatch(idx);
    });
  });

  container.querySelectorAll('.btn-confirm-match').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      const row = AppState.matchedData[idx];
      if (row && row.matchedCaddisItem) {
        const cleanKey = Matcher.normalize(row.supplierItem.articulo);
        Storage.saveMapping(cleanKey, row.matchedCaddisItem);
        row.isManualMapping = true;
        showToast(`✅ Confirmado: "${row.supplierItem.articulo}" → [${row.matchedCaddisItem.codigo}] ${row.matchedCaddisItem.articulo}`, 'success');
        render();
      }
    });
  });

  // Botón "Vincular" por código escrito
  container.querySelectorAll('.btn-link-code').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      linkByCode(idx);
    });
  });

  // Enter en el input de código también vincula
  container.querySelectorAll('.code-link-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const idx = parseInt(e.currentTarget.dataset.index);
        linkByCode(idx);
      }
    });
  });
}

/**
 * Vincula un producto del proveedor con un código de Caddis escrito por el usuario
 */
function linkByCode(idx) {
  const input = document.querySelector(`.code-link-input[data-index="${idx}"]`);
  if (!input) return;

  const code = input.value.trim();
  if (!code) {
    showToast('Escribí un código de Caddis para vincular.', 'warning');
    return;
  }

  const row = AppState.matchedData[idx];
  if (!row) return;

  // Buscar por código exacto (case-insensitive)
  const found = AppState.caddisItems.find(c =>
    c.codigo && c.codigo.toLowerCase() === code.toLowerCase()
  );

  if (!found) {
    showToast(`No se encontró ningún artículo con código "${code}" en Caddis.`, 'error');
    input.style.borderColor = 'var(--rose)';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
    return;
  }

  // Asociar y guardar en memoria
  row.matchedCaddisItem = found;
  row.isManualMapping = true;
  row.matchScore = 1.0;
  row.confidence = 'high';

  // Recalcular precios con el nuevo ítem asociado
  row.calculations = Calculator.calculateItem({
    supplierCost: row.supplierItem.precio,
    currency: row.supplierItem.moneda || 'USD',
    dollarRate: AppState.config.dollarRate,
    ivaRate: row.supplierItem.iva || AppState.config.defaultIva,
    markupPvp: AppState.config.markupPvp,
    markupMayorista: AppState.config.markupMayorista,
    roundingRule: AppState.config.roundingRule,
    currentPvp: found.precioVenta,
    currentMayorista: found.precioMayorista,
    currentCostWithTax: found.costoConImpuestos,
    currentCostWithoutTax: found.costoSinImpuestos
  });

  // Guardar en memoria de equivalencias
  const cleanKey = Matcher.normalize(row.supplierItem.articulo);
  Storage.saveMapping(cleanKey, found);

  showToast(`✅ Vinculado: "${row.supplierItem.articulo}" → [${found.codigo}] ${found.articulo}`, 'success');
  render();
}

/**
 * Renderiza la tabla de Análisis y Comparación de Precios (Paso 3)
 */
function renderAnalysisTable() {
  const container = document.getElementById('analysis-table-tbody');
  if (!container) return;

  // Filtrado
  let filtered = AppState.matchedData.filter((row, idx) => {
    // Filtro de texto
    if (AppState.searchQuery) {
      const q = AppState.searchQuery.toLowerCase();
      const sName = (row.supplierItem.articulo || '').toLowerCase();
      const cName = (row.matchedCaddisItem?.articulo || '').toLowerCase();
      const cCode = (row.matchedCaddisItem?.codigo || '').toLowerCase();
      if (!sName.includes(q) && !cName.includes(q) && !cCode.includes(q)) return false;
    }

    // Filtro de Estado
    if (AppState.filterStatus === 'NEEDS_INCREASE') {
      return row.calculations?.status === 'NEEDS_INCREASE' || row.calculations?.status === 'LOSS_ALERT';
    }
    if (AppState.filterStatus === 'LOSS_ALERT') {
      return row.calculations?.status === 'LOSS_ALERT';
    }
    if (AppState.filterStatus === 'UNMATCHED') {
      return !row.matchedCaddisItem;
    }
    if (AppState.filterStatus === 'MATCHED') {
      return !!row.matchedCaddisItem;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-6 text-muted">
          No hay artículos que coincidan con los filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(row => {
    const sItem = row.supplierItem;
    const cItem = row.matchedCaddisItem;
    const calc = row.calculations;
    const isSelected = AppState.selectedRowIds.has(row.id);

    let statusBadge = '';
    if (!cItem) {
      statusBadge = `<span class="badge badge-neutral">No Vinculado</span>`;
    } else if (calc.status === 'LOSS_ALERT') {
      statusBadge = `<span class="badge badge-danger blink">🚨 VENTA A PÉRDIDA</span>`;
    } else if (calc.status === 'NEEDS_INCREASE') {
      statusBadge = `<span class="badge badge-warning">▲ Aumentar ${Math.round(calc.diffPvpPercent)}%</span>`;
    } else if (calc.status === 'NEW_ITEM') {
      statusBadge = `<span class="badge badge-info">Nuevo PVP</span>`;
    } else {
      statusBadge = `<span class="badge badge-success">✓ Margen OK</span>`;
    }

    return `
      <tr class="${calc?.status === 'LOSS_ALERT' ? 'row-danger' : calc?.status === 'NEEDS_INCREASE' ? 'row-warning' : ''}">
        <td class="text-center">
          <input type="checkbox" class="row-checkbox" data-id="${row.id}" ${isSelected ? 'checked' : ''} ${!cItem ? 'disabled' : ''}>
        </td>
        <td>
          <span class="code-pill">${cItem ? escapeHtml(cItem.codigo) : '---'}</span>
        </td>
        <td>
          <strong>${escapeHtml(sItem.articulo)}</strong>
          ${cItem ? `<div class="text-xs text-muted">Caddis: ${escapeHtml(cItem.articulo)}</div>` : ''}
        </td>
        <td class="text-right">
          <div>${sItem.moneda} ${sItem.precio.toFixed(2)}</div>
          <div class="text-xs text-muted">c/IVA: $ ${Math.round(calc.costWithTax).toLocaleString('es-AR')}</div>
        </td>
        <td class="text-right font-mono">
          ${cItem && cItem.precioVenta > 0 ? `$ ${cItem.precioVenta.toLocaleString('es-AR')}` : '<span class="text-muted">$ 0</span>'}
        </td>
        <td class="text-right font-mono font-bold text-primary">
          $ ${calc.finalPvp.toLocaleString('es-AR')}
        </td>
        <td class="text-right">
          ${calc.diffPvp > 0 ? `
            <span class="text-danger font-bold">+$ ${Math.round(calc.diffPvp).toLocaleString('es-AR')}</span>
            <div class="text-xs text-danger">(+${Math.round(calc.diffPvpPercent)}%)</div>
          ` : `
            <span class="text-success">$ 0</span>
          `}
        </td>
        <td class="text-right font-mono text-muted">
          $ ${calc.finalMayorista.toLocaleString('es-AR')}
        </td>
        <td class="text-center">
          ${statusBadge}
        </td>
        <td class="text-center">
          <button class="btn btn-xs btn-outline btn-edit-price" data-id="${row.id}" title="Editar precio final manualmente">
            ✏
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de checkboxes individuales
  container.querySelectorAll('.row-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        AppState.selectedRowIds.add(id);
      } else {
        AppState.selectedRowIds.delete(id);
      }
    });
  });

  // Edición rápida de precio
  container.querySelectorAll('.btn-edit-price').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id);
      const row = AppState.matchedData[id];
      if (!row) return;

      const currentFinal = row.calculations.finalPvp;
      const nuevo = prompt(`Modificar PVP final para "${row.supplierItem.articulo}":`, currentFinal);
      if (nuevo !== null) {
        const num = parseFloat(nuevo);
        if (!isNaN(num) && num > 0) {
          row.calculations.finalPvp = num;
          row.calculations.diffPvp = num - (row.matchedCaddisItem?.precioVenta || 0);
          renderAnalysisTable();
        }
      }
    });
  });
}

/**
 * Modal para asociar manualmente un producto con la lista de Caddis
 */
function openModalMatch(index) {
  AppState.editingMatchIndex = index;
  const row = AppState.matchedData[index];
  if (!row) return;

  const modal = document.getElementById('modal-match');
  const title = document.getElementById('modal-supplier-item-title');
  const searchInput = document.getElementById('modal-caddis-search');

  if (title) title.textContent = row.supplierItem.articulo;
  if (searchInput) {
    // Poner por defecto los primeros términos de búsqueda
    searchInput.value = Matcher.tokenize(row.supplierItem.articulo).slice(0, 3).join(' ');
    renderModalSearchResults(searchInput.value);
  }

  if (modal) modal.classList.add('active');
}

function closeModalMatch() {
  const modal = document.getElementById('modal-match');
  if (modal) modal.classList.remove('active');
  AppState.editingMatchIndex = null;
}

function renderModalSearchResults(query) {
  const container = document.getElementById('modal-results-container');
  if (!container) return;

  const cleanQ = Matcher.normalize(query);
  const results = AppState.caddisItems.filter(c => {
    if (!cleanQ) return true;
    const cleanArt = Matcher.normalize(c.articulo);
    const cleanCode = Matcher.normalize(c.codigo);
    return cleanArt.includes(cleanQ) || cleanCode.includes(cleanQ);
  }).slice(0, 20); // Top 20 resultados

  if (results.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-muted">No se encontraron artículos en Caddis con esa búsqueda.</div>`;
    return;
  }

  container.innerHTML = results.map(c => `
    <div class="modal-item-row" data-code="${escapeHtml(c.codigo)}">
      <div class="modal-item-info">
        <span class="code-pill">${escapeHtml(c.codigo)}</span>
        <strong>${escapeHtml(c.articulo)}</strong>
      </div>
      <div class="modal-item-price">
        PVP Actual: $ ${c.precioVenta.toLocaleString('es-AR')}
      </div>
      <button class="btn btn-sm btn-primary btn-select-caddis" data-code="${escapeHtml(c.codigo)}">
        Seleccionar
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-select-caddis').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.dataset.code;
      const selectedCaddis = AppState.caddisItems.find(c => c.codigo === code);
      
      if (selectedCaddis && AppState.editingMatchIndex !== null) {
        const row = AppState.matchedData[AppState.editingMatchIndex];
        row.matchedCaddisItem = selectedCaddis;
        row.isManualMapping = true;
        row.matchScore = 1.0;
        row.confidence = 'high';

        // Recalcular con el nuevo Caddis item asociado
        row.calculations = Calculator.calculateItem({
          supplierCost: row.supplierItem.precio,
          currency: row.supplierItem.moneda || 'USD',
          dollarRate: AppState.config.dollarRate,
          ivaRate: row.supplierItem.iva || AppState.config.defaultIva,
          markupPvp: AppState.config.markupPvp,
          markupMayorista: AppState.config.markupMayorista,
          roundingRule: AppState.config.roundingRule,
          currentPvp: selectedCaddis.precioVenta,
          currentMayorista: selectedCaddis.precioMayorista,
          currentCostWithTax: selectedCaddis.costoConImpuestos,
          currentCostWithoutTax: selectedCaddis.costoSinImpuestos
        });

        // Guardar en memoria de equivalencias
        const cleanKey = Matcher.normalize(row.supplierItem.articulo);
        Storage.saveMapping(cleanKey, selectedCaddis);

        closeModalMatch();
        showToast(`Vinculado con [${selectedCaddis.codigo}] ${selectedCaddis.articulo}`, 'success');
        render();
      }
    });
  });
}

/**
 * Renderiza la lista de equivalencias guardadas en el storage
 */
function renderSavedMappings() {
  const container = document.getElementById('saved-mappings-tbody');
  if (!container) return;

  const mappings = Storage.getMappings();
  const keys = Object.keys(mappings);

  if (keys.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          Aún no hay equivalencias guardadas en memoria. Al asociar productos manualmente, quedarán guardadas aquí para futuras listas.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = keys.map(key => {
    const m = mappings[key];
    return `
      <tr>
        <td><code>${escapeHtml(key)}</code></td>
        <td><span class="code-pill">${escapeHtml(m.caddisCode)}</span></td>
        <td>${escapeHtml(m.caddisName || '')}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-danger btn-delete-mapping" data-key="${escapeHtml(key)}">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.querySelectorAll('.btn-delete-mapping').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.dataset.key;
      Storage.removeMapping(key);
      showToast('Equivalencia eliminada de la memoria.', 'info');
      renderSavedMappings();
    });
  });
}

/**
 * Exporta para Caddis (Minorista o Mayorista)
 */
function exportForCaddis(priceField, listName) {
  const selectedItems = AppState.matchedData.filter(row => 
    AppState.selectedRowIds.has(row.id) && row.matchedCaddisItem
  );

  if (selectedItems.length === 0) {
    showToast('No has seleccionado ningún artículo con código Caddis para exportar.', 'warning');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `caddis_precios_${listName}_${dateStr}.xlsx`;

  ExcelHandler.exportCaddisPriceList(selectedItems, filename, priceField);
  showToast(`¡Archivo descargado! ${selectedItems.length} artículos listos para importar en Caddis.`, 'success');
}

/**
 * Exporta el reporte de auditoría completo
 */
function exportAuditReport() {
  if (AppState.matchedData.length === 0) {
    showToast('No hay datos para exportar.', 'warning');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `reporte_auditoria_precios_${dateStr}.xlsx`;

  ExcelHandler.exportAuditReport(AppState.matchedData, AppState.config.dollarRate, filename);
  showToast('Reporte de auditoría generado y descargado.', 'success');
}

/**
 * Toast notifications
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Loading spinner
 */
function showLoading(show, message = 'Cargando...') {
  const overlay = document.getElementById('loading-overlay');
  const text = document.getElementById('loading-text');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
  if (text) {
    text.textContent = message;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
