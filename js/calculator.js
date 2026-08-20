/**
 * calculator.js - Motor de cálculo financiero de costos, IVA, PVP y Mayorista
 * 
 * Fórmulas:
 * 1. Costo Base ARS = Precio Proveedor (si es USD -> * Cotización Dólar, si es ARS -> Precio)
 * 2. Costo con Impuestos = Costo Base ARS * (1 + IVA / 100)  [IVA 21% o 10.5%]
 * 3. PVP Sugerido = Costo con Impuestos * (1 + Markup PVP / 100) [Markup estándar: +120%]
 * 4. Mayorista Sugerido = Costo con Impuestos * (1 + Markup Mayorista / 100)
 * 5. Redondeo comercial aplicado a los precios finales de venta.
 */

export const Calculator = {
  /**
   * Aplica la regla de redondeo seleccionada
   */
  applyRounding(value, rule = 'round100') {
    if (isNaN(value) || value <= 0) return 0;

    switch (rule) {
      case 'none':
        return Math.round(value * 100) / 100;
      case 'round10':
        return Math.round(value / 10) * 10;
      case 'round50':
        return Math.round(value / 50) * 50;
      case 'round100':
        return Math.round(value / 100) * 100;
      case 'round500':
        return Math.round(value / 500) * 500;
      case 'round1000':
        return Math.round(value / 1000) * 1000;
      case 'ceil100':
        return Math.ceil(value / 100) * 100;
      case 'ceil500':
        return Math.ceil(value / 500) * 500;
      default:
        return Math.round(value / 100) * 100;
    }
  },

  /**
   * Calcula todos los precios derivados a partir de un producto del proveedor y la configuración
   */
  calculateItem({
    supplierCost = 0,
    currency = 'USD', // 'USD' | 'ARS'
    dollarRate = 1510.0,
    ivaRate = 21.0,   // 21.0 | 10.5 | 0
    markupPvp = 120.0,
    markupMayorista = 45.0,
    roundingRule = 'round100',
    currentPvp = 0,
    currentMayorista = 0,
    currentCostWithoutTax = 0,
    currentCostWithTax = 0
  }) {
    const numCost = parseFloat(supplierCost) || 0;
    const isUSD = currency.toUpperCase().includes('USD') || currency === 'U$S' || currency === 'US$';
    const activeDollarRate = parseFloat(dollarRate) || 1510.0;
    const activeIva = parseFloat(ivaRate) || 21.0;
    const activeMarkupPvp = parseFloat(markupPvp) || 120.0;
    const activeMarkupMay = parseFloat(markupMayorista) || 45.0;

    // 1. Costo Base en ARS (sin impuestos)
    const costArsWithoutTax = isUSD ? numCost * activeDollarRate : numCost;

    // 2. Costo con Impuestos (IVA 21% o 10.5%)
    const costWithTax = costArsWithoutTax * (1 + (activeIva / 100));

    // 3. PVP Sugerido (+120% sobre costo con IVA)
    const rawPvp = costWithTax * (1 + (activeMarkupPvp / 100));
    const finalPvp = this.applyRounding(rawPvp, roundingRule);

    // 4. Precio Mayorista Sugerido
    const rawMayorista = costWithTax * (1 + (activeMarkupMay / 100));
    const finalMayorista = this.applyRounding(rawMayorista, roundingRule);

    // 5. Márgenes y Markups
    // Margen % = (PVP - Costo con IVA) / PVP * 100
    const marginPvpPercent = finalPvp > 0 ? ((finalPvp - costWithTax) / finalPvp) * 100 : 0;
    const markupPvpReal = costWithTax > 0 ? ((finalPvp - costWithTax) / costWithTax) * 100 : 0;

    // 6. Comparativa con el sistema Caddis actual
    const curPvp = parseFloat(currentPvp) || 0;
    const curMay = parseFloat(currentMayorista) || 0;

    const diffPvp = finalPvp - curPvp;
    const diffPvpPercent = curPvp > 0 ? (diffPvp / curPvp) * 100 : 100;

    // Determinación del estado / alerta
    let status = 'PRICE_OK';
    let statusMessage = 'Precio Actualizado';
    let urgencyLevel = 0; // 0 = ok, 1 = aumento normal, 2 = urgente (a pérdida)

    if (curPvp <= 0) {
      status = 'NEW_ITEM';
      statusMessage = 'Sin Precio en Sistema';
      urgencyLevel = 1;
    } else if (curPvp < costWithTax) {
      // Venta a pérdida: el PVP actual es menor que el costo de reposición con IVA
      status = 'LOSS_ALERT';
      statusMessage = '¡URGENTE: Venta a Pérdida!';
      urgencyLevel = 3;
    } else if (curPvp < finalPvp - 1) { // margen de tolerancia de $1
      status = 'NEEDS_INCREASE';
      statusMessage = `Aumentar +${Math.round(diffPvpPercent)}%`;
      urgencyLevel = 2;
    } else if (curPvp > finalPvp * 1.25) {
      status = 'OVERPRICED';
      statusMessage = 'PVP Actual muy superior a sugerido';
      urgencyLevel = 0;
    }

    return {
      supplierCostOriginal: numCost,
      currency: isUSD ? 'USD' : 'ARS',
      dollarRate: activeDollarRate,
      ivaRate: activeIva,
      costArsWithoutTax,
      costWithTax,
      rawPvp,
      finalPvp,
      rawMayorista,
      finalMayorista,
      marginPvpPercent,
      markupPvpReal,
      currentPvp: curPvp,
      currentMayorista: curMay,
      diffPvp,
      diffPvpPercent,
      needsPvpIncrease: curPvp < finalPvp,
      needsMayoristaIncrease: curMay > 0 ? curMay < finalMayorista : true,
      status,
      statusMessage,
      urgencyLevel
    };
  },

  /**
   * Formatea un número en formato moneda ARS (ej: $ 12.500)
   */
  formatCurrency(value, currency = 'ARS') {
    if (isNaN(value)) return '$ 0';
    if (currency === 'USD') {
      return `USD ${parseFloat(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${Math.round(value).toLocaleString('es-AR')}`;
  },

  /**
   * Formatea porcentaje (ej: 120.0% o +15.3%)
   */
  formatPercent(value, showSign = false) {
    if (isNaN(value)) return '0%';
    const num = parseFloat(value);
    const sign = showSign && num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
};
