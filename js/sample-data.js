/**
 * sample-data.js - Datos de demostración reales extraídos de las capturas de Caddis y Proveedor
 * Permite al usuario probar y explorar todo el flujo de trabajo inmediatamente con 1 clic.
 */

export const SAMPLE_CADDIS_ITEMS = [
  {
    codigo: '058',
    articulo: 'CABLE PULSERA LIGHTNING Y V8',
    precioVenta: 150.00,
    costoConImpuestos: 84.70,
    costoSinImpuestos: 70.00,
    markup: 77.10,
    margen: 43.53,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'CABLES',
    precioMayorista: 110.00
  },
  {
    codigo: '120K',
    articulo: 'PARLANTE EUROSOUND CHELSEA 120K',
    precioVenta: 120000.00,
    costoConImpuestos: 62799.00,
    costoSinImpuestos: 51900.00,
    markup: 91.09,
    margen: 47.67,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'PARLANTE',
    precioMayorista: 85000.00
  },
  {
    codigo: '147',
    articulo: 'FOCO GIRATORIO LUCES',
    precioVenta: 5100.00,
    costoConImpuestos: 2169.53,
    costoSinImpuestos: 1793.00,
    markup: 135.07,
    margen: 57.46,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'ACCESORIOS',
    precioMayorista: 3400.00
  },
  {
    codigo: '1945Z',
    articulo: 'LAMPARA DIGITAL 1945Z',
    precioVenta: 42000.00,
    costoConImpuestos: 17922.52,
    costoSinImpuestos: 14812.00,
    markup: 134.34,
    margen: 57.33,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'LAMPARA',
    precioMayorista: 27500.00
  },
  {
    codigo: '246',
    articulo: 'CABLE ALIMENTACION PC',
    precioVenta: 4800.00,
    costoConImpuestos: 1672.22,
    costoSinImpuestos: 1382.00,
    markup: 187.04,
    margen: 65.16,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'CABLES',
    precioMayorista: 3000.00
  },
  {
    codigo: '251S',
    articulo: 'COMBO TECLADO Y MOUSE DESKMATE(KSK-251S)',
    precioVenta: 32800.00,
    costoConImpuestos: 14917.50,
    costoSinImpuestos: 13500.00,
    markup: 119.88,
    margen: 54.52,
    iva: 10.50,
    moneda: 'ARS',
    tipo: 'TECLADOS',
    precioMayorista: 21500.00
  },
  {
    codigo: '25WS',
    articulo: 'CARGADOR SAMSUNG TYPE-C (25W) S/CABLE',
    precioVenta: 70400.00,
    costoConImpuestos: 32994.20,
    costoSinImpuestos: 29859.00,
    markup: 113.37,
    margen: 53.13,
    iva: 10.50,
    moneda: 'ARS',
    tipo: 'ADAPTADORES',
    precioMayorista: 48000.00
  },
  {
    codigo: '265',
    articulo: 'COMBO TECLADO Y MOUSE INSPIRE (KCK-265)',
    precioVenta: 50000.00,
    costoConImpuestos: 22971.85,
    costoSinImpuestos: 20789.00,
    markup: 117.66,
    margen: 54.06,
    iva: 10.50,
    moneda: 'ARS',
    tipo: 'TECLADOS',
    precioMayorista: 33000.00
  },
  {
    codigo: '280LED',
    articulo: 'PARLANTE MICRO 280LED',
    precioVenta: 84000.00,
    costoConImpuestos: 35937.00,
    costoSinImpuestos: 29700.00,
    markup: 133.74,
    margen: 57.22,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'PARLANTE',
    precioMayorista: 53000.00
  },
  {
    codigo: '360CAC',
    articulo: 'CABLE MALLADO CON SOPORTE 360 TIPO C A C',
    precioVenta: 16200.00,
    costoConImpuestos: 8593.42,
    costoSinImpuestos: 7102.00,
    markup: 88.52,
    margen: 46.95,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'CABLES',
    precioMayorista: 11500.00
  },
  {
    codigo: '3EN1IEY',
    articulo: 'BASE DE CARGA INALAMBRICA 3 EN 1 IEY',
    precioVenta: 69100.00,
    costoConImpuestos: 33577.50,
    costoSinImpuestos: 27750.00,
    markup: 105.79,
    margen: 51.41,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'CARGADORES',
    precioMayorista: 46000.00
  },
  {
    codigo: '576',
    articulo: 'MOCHILA KLIPXTREME ARLES 15.5" (KNB-576BK)',
    precioVenta: 56600.00,
    costoConImpuestos: 25707.66,
    costoSinImpuestos: 21246.00,
    markup: 120.17,
    margen: 54.58,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'MOCHILAS',
    precioMayorista: 38000.00
  },
  {
    codigo: '5A',
    articulo: 'REDMI WATCH 5 ACTIVE',
    precioVenta: 89800.00,
    costoConImpuestos: 58399.44,
    costoSinImpuestos: 48264.00,
    markup: 53.77,
    margen: 34.97,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'SMARTWATCH',
    precioMayorista: 67000.00
  },
  {
    codigo: '5P',
    articulo: 'AURICULAR REDMI BUDS 5 PRO',
    precioVenta: 163000.00,
    costoConImpuestos: 99118.50,
    costoSinImpuestos: 89700.00,
    markup: 64.45,
    margen: 39.19,
    iva: 10.50,
    moneda: 'ARS',
    tipo: 'AURICULARES',
    precioMayorista: 125000.00
  },
  {
    codigo: '6PLAY',
    articulo: 'AURICULAR REDMI BUDS 6 PLAY',
    precioVenta: 51000.00,
    costoConImpuestos: 27152.40,
    costoSinImpuestos: 22440.00,
    markup: 87.83,
    margen: 46.76,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'AURICULARES',
    precioMayorista: 36000.00
  },
  {
    codigo: '6PRO',
    articulo: 'REDMI BUDS 6 PRO',
    precioVenta: 201500.00,
    costoConImpuestos: 101754.95,
    costoSinImpuestos: 84095.00,
    markup: 98.12,
    margen: 49.53,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'AURICULARES',
    precioMayorista: 145000.00
  },
  {
    codigo: '8ACTIVE',
    articulo: 'AURICULAR REDMI BUDS 8 ACTIVE',
    precioVenta: 80200.00,
    costoConImpuestos: 44515.90,
    costoSinImpuestos: 36790.00,
    markup: 80.16,
    margen: 44.49,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'AURICULARES',
    precioMayorista: 56000.00
  },
  {
    codigo: 'VID-IP14',
    articulo: 'GLASS ANTIESPIA IPHONE 14',
    precioVenta: 2400.00,
    costoConImpuestos: 984.75,
    costoSinImpuestos: 813.84,
    markup: 143.72,
    margen: 58.97,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'VIDRIOS',
    precioMayorista: 1600.00
  },
  {
    codigo: 'VID-IP14P',
    articulo: 'GLASS ANTIESPIA IPHONE 14 PRO',
    precioVenta: 2400.00,
    costoConImpuestos: 984.75,
    costoSinImpuestos: 813.84,
    markup: 143.72,
    margen: 58.97,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'VIDRIOS',
    precioMayorista: 1600.00
  },
  {
    codigo: 'VID-IP14PM',
    articulo: 'GLASS ANTIESPIA IPHONE 14 PRO MAX',
    precioVenta: 2400.00,
    costoConImpuestos: 984.75,
    costoSinImpuestos: 813.84,
    markup: 143.72,
    margen: 58.97,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'VIDRIOS',
    precioMayorista: 1600.00
  },
  {
    codigo: 'VID-MOTOG04',
    articulo: 'GLASS ANTIESPIA MOTO G04',
    precioVenta: 2200.00,
    costoConImpuestos: 984.75,
    costoSinImpuestos: 813.84,
    markup: 123.41,
    margen: 55.24,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'VIDRIOS',
    precioMayorista: 1500.00
  },
  {
    codigo: 'VID-RN12P',
    articulo: 'GLASS FULL GLUE XIAOMI REDMI NOTE 12 PRO 4G',
    precioVenta: 1800.00,
    costoConImpuestos: 606.00,
    costoSinImpuestos: 500.82,
    markup: 196.99,
    margen: 66.33,
    iva: 21.00,
    moneda: 'ARS',
    tipo: 'VIDRIOS',
    precioMayorista: 1200.00
  }
];

export const SAMPLE_SUPPLIER_ITEMS = [
  {
    articulo: 'Glass Antiespia Iphone 14',
    precio: 0.85,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Antiespia Iphone 14 Pro',
    precio: 0.85,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Antiespia Iphone 14 Pro Max',
    precio: 0.85,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Antiespia Iphone 15',
    precio: 0.85,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Antiespia Iphone 15 Pro',
    precio: 0.90,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Antiespia Moto G04',
    precio: 0.85,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Glass Full Glue Xiaomi Redmi Note 12 Pro 4G',
    precio: 0.40,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'VIDRIOS'
  },
  {
    articulo: 'Cargador Samsung Type-C (25W) s/cable',
    precio: 24.50,
    moneda: 'USD',
    iva: 10.50,
    stock: 'STOCK',
    categoria: 'ADAPTADORES'
  },
  {
    articulo: 'Auricular Redmi Buds 6 Play',
    precio: 19.80,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'AURICULARES'
  },
  {
    articulo: 'Redmi Buds 6 Pro',
    precio: 65.00,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'AURICULARES'
  },
  {
    articulo: 'Redmi Watch 5 Active',
    precio: 36.50,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'SMARTWATCH'
  },
  {
    articulo: 'Parlante Micro 280LED Bluetooth',
    precio: 32.00,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'PARLANTE'
  },
  {
    articulo: 'Base De Carga Inalambrica 3 En 1 IEY',
    precio: 25.00,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'CARGADORES'
  },
  {
    articulo: 'Mochila KlipXtreme Arles 15.5" KNB-576BK',
    precio: 21.50,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'MOCHILAS'
  },
  {
    articulo: 'Combo Teclado y Mouse Deskmate KSK-251S',
    precio: 12.00,
    moneda: 'USD',
    iva: 10.50,
    stock: 'STOCK',
    categoria: 'TECLADOS'
  },
  {
    articulo: 'Cable Alimentacion PC Interlock 220v',
    precio: 1.65,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'CABLES'
  },
  {
    articulo: 'Cable Mallado con Soporte 360 Tipo C a C',
    precio: 6.20,
    moneda: 'USD',
    iva: 21.00,
    stock: 'STOCK',
    categoria: 'CABLES'
  }
];
