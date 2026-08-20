# Gestor de Precios Intermediario para Caddis ERP

Aplicación web diseñada específicamente para automatizar el cálculo, comparación y actualización de precios entre listas de proveedores (en USD o ARS) y el sistema de gestión **Caddis**.

---

## 🌟 Características Principales

1. **Importación Inteligente**:
   - Soporte para archivos Excel (.xlsx, .xls) y CSV exportados de Caddis.
   - Soporte para listas de proveedores en Excel con múltiples solapas (Vidrios, Fundas, Accesorios, etc.) o pegado de texto/PDFs.
   - Detección automática de columnas (Código, Descripción, Costo, IVA, PVP actual).

2. **Cálculo Financiero Preciso**:
   - **Conversión de Moneda**: Costo en USD convertido a ARS según cotización del día (editable o sincronizado con Dólar BNA).
   - **Alícuota de IVA**: Aplicación de IVA 21% o 10.5% (según el producto o configuración).
   - **MarkUp Minorista (PVP)**: $+120\%$ (o el porcentaje personalizado) calculado sobre el costo con impuestos.
   - **MarkUp Mayorista**: Cálculo de lista mayorista configurable ($+45\%$ o $+50\%$).
   - **Redondeo Comercial**: Redondeo automático a los \$100, \$500 o \$1.000 más cercanos para evitar centavos en mostrador.

3. **Smart Matcher (Emparejamiento de Productos)**:
   - Motor de búsqueda difusa (Fuzzy Matching) con diccionario de sinónimos de tecnología (ej. *Glass Antiespia Iphone 14* $\leftrightarrow$ *Vidrio Templado Privacy IP 14*).
   - Memoria de Equivalencias persistente: Si asocias un producto manualmente una vez, el sistema lo recordará automáticamente en todas las futuras listas de ese proveedor.

4. **Comparador Visual de Precios**:
   - 🚨 **Alerta de Venta a Pérdida**: Detecta cuando el PVP actual en Caddis está por debajo del costo de reposición con IVA.
   - ⚠️ **Alerta de Aumento Necesario**: Muestra la diferencia en pesos (\$) y el porcentaje (+X%) que se debe subir.
   - Filtros rápidos para ver solo los productos que requieren aumento urgente.

5. **Exportación 100% Compatible con Caddis**:
   - Generación de archivo Excel `.xlsx` con el formato exacto requerido por Caddis (`Codigo` | `Precio Final`).
   - Exportación de listas Minoristas, Mayoristas y Reporte Completo de Auditoría.

---

## 🚀 Cómo Usar la Aplicación

### Paso 1: Abrir la Aplicación
Simplemente abre el archivo `index.html` en tu navegador preferido (Google Chrome, Microsoft Edge, etc.) haciendo doble clic sobre él o mediante el comando:
```powershell
start C:\Users\mmmm\.gemini\antigravity\scratch\caddis-price-manager\index.html
```

### Paso 2: Cargar Datos o Probar con Datos de Demostración
- Puedes hacer clic en **"⚡ Cargar Datos de Demostración"** en el Paso 1 para ver el flujo completo con productos reales de tus capturas.
- O arrastra tu Excel exportado de Caddis y la lista de tu proveedor.

### Paso 3: Revisar Vinculaciones en "Smart Matcher"
- Verifica las coincidencias automáticas.
- Si algún producto no se vinculó automáticamente, haz clic en **"Vincular Manualmente"** para seleccionarlo de tu lista de Caddis.
- Haz clic en **"💾 Recordar"** para guardar la equivalencia permanente.

### Paso 4: Analizar Precios y Aumentos
- En la pestaña **"3️⃣ Comparador de Precios"**, revisa los productos marcados en rojo/amarillo que necesitan aumento.
- Puedes editar manualmente cualquier precio final haciendo clic en el lápiz ✏️.

### Paso 5: Descargar e Importar en Caddis
1. Ve a la pestaña **"4️⃣ Exportar a Caddis"**.
2. Haz clic en **"Descargar Excel Minorista"** (se descargará un archivo `.xlsx` listo).
3. En tu sistema **Caddis** (clientes.caddis.com.ar):
   - Ve a **"Listas de Precios"** $\rightarrow$ Selecciona **"Minorista"**.
   - En el recuadro **"IMPORTAR PRECIOS"** (abajo a la izquierda), haz clic en **"Elija un archivo..."**.
   - Selecciona el archivo descargado y haz clic en **"Importar"**.
   - ¡Listo! Todos los precios quedarán actualizados en tu sistema en segundos.

---

## 📁 Estructura del Proyecto
```
caddis-price-manager/
├── index.html            # Interfaz principal de usuario
├── css/
│   ├── main.css          # Estilos base, diseño y variables
│   ├── components.css    # Botones, tablas, tarjetas, alertas y modales
│   └── responsive.css    # Adaptación a diferentes pantallas
├── js/
│   ├── app.js            # Controlador principal y gestión de eventos
│   ├── calculator.js     # Motor financiero (Costos, IVA, MarkUp 120%, PVP, Mayorista)
│   ├── matcher.js        # Motor de emparejamiento difuso y sinónimos
│   ├── excel-handler.js  # Lector de Excel y generador para Caddis
│   ├── storage.js        # Persistencia en LocalStorage
│   ├── api.js            # Cotización en tiempo real (DolarAPI / BNA)
│   └── sample-data.js    # Datos de demostración de Caddis y Proveedor
└── lib/
    └── xlsx.full.min.js  # Librería SheetJS para ejecución 100% offline
```
