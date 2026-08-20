/**
 * storage.js - Gestión de almacenamiento local persistente (LocalStorage)
 * Permite guardar configuraciones, equivalencias aprendidas entre proveedores y Caddis,
 * y listas de productos para sesiones continuas.
 */

const STORAGE_KEYS = {
  CONFIG: 'caddis_price_mgr_config_v1',
  MAPPINGS: 'caddis_price_mgr_mappings_v1',
  CADDIS_ITEMS: 'caddis_price_mgr_caddis_items_v1',
  SUPPLIER_ITEMS: 'caddis_price_mgr_supplier_items_v1',
  PROFILES: 'caddis_price_mgr_profiles_v1',
  HISTORY: 'caddis_price_mgr_history_v1'
};

const DEFAULT_CONFIG = {
  dollarRate: 1510.00,        // Cotización Dólar BNA como en Caddis
  dollarType: 'bna',          // 'bna' | 'oficial' | 'blue' | 'manual'
  markupPvp: 120.0,           // +120% sobre costo con IVA para minorista (PVP)
  markupMayorista: 45.0,      // +45% sobre costo con IVA para mayorista
  defaultIva: 21.0,           // 21% por defecto (o 10.5%)
  roundingRule: 'round100',   // 'none', 'round10', 'round50', 'round100', 'round500', 'round1000'
  autoDetectIva: true,        // Detectar si el nombre o columna tiene 10.5% o 21%
  minimumMarginPercent: 30.0  // Margen mínimo de seguridad (%)
};

export const Storage = {
  /**
   * Obtiene la configuración actual guardada o por defecto
   */
  getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!raw) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Error leyendo configuración:', e);
      return { ...DEFAULT_CONFIG };
    }
  },

  /**
   * Guarda la configuración
   */
  saveConfig(newConfig) {
    try {
      const merged = { ...this.getConfig(), ...newConfig };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Error guardando configuración:', e);
      return null;
    }
  },

  /**
   * Obtiene las asociaciones guardadas (Proveedor -> Código Caddis)
   */
  getMappings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('Error leyendo mappings:', e);
      return {};
    }
  },

  /**
   * Guarda o actualiza una asociación manual
   */
  saveMapping(supplierItemCleanKey, caddisItem) {
    try {
      const mappings = this.getMappings();
      mappings[supplierItemCleanKey] = {
        caddisCode: caddisItem.codigo,
        caddisName: caddisItem.articulo || caddisItem.nombre,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));
      return true;
    } catch (e) {
      console.error('Error guardando mapping:', e);
      return false;
    }
  },

  /**
   * Elimina una asociación manual
   */
  removeMapping(supplierItemCleanKey) {
    try {
      const mappings = this.getMappings();
      if (mappings[supplierItemCleanKey]) {
        delete mappings[supplierItemCleanKey];
        localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(mappings));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Guarda la última lista de Caddis cargada para no tener que subirla siempre
   */
  saveCaddisItems(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.CADDIS_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.warn('No se pudo guardar la lista de Caddis en storage:', e);
    }
  },

  /**
   * Recupera la última lista de Caddis guardada
   */
  getCaddisItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CADDIS_ITEMS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Limpia todos los datos almacenados
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
};
