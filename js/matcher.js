/**
 * matcher.js - Motor inteligente de emparejamiento (Smart Matcher)
 * Relaciona nombres de productos de listas de proveedores con códigos y artículos de Caddis.
 * Incluye normalización fonética, diccionario de sinónimos/abreviaturas de tecnología y accesorios,
 * cálculo de similitud difusa (token matching + Dice Coefficient) y soporte para asociaciones guardadas.
 */

import { Storage } from './storage.js';

// Diccionario de sinónimos y normalizaciones frecuentes en accesorios y tecnología
const SYNONYMS = {
  'glass': ['vidrio', 'templado', 'cristal', 'protector'],
  'vidrio': ['glass', 'templado', 'cristal'],
  'templado': ['glass', 'vidrio'],
  'antiespia': ['privacy', 'anti-espia', 'anti espia', 'privacidad'],
  'privacy': ['antiespia', 'anti-espia', 'anti espia'],
  'funda': ['case', 'cover', 'protector', 'silicona', 'tpu', 'fundas'],
  'case': ['funda', 'cover', 'protector'],
  'cover': ['funda', 'case', 'protector', 'carcasa'],
  'iphone': ['iph', 'ip'],
  'iph': ['iphone', 'ip'],
  'samsung': ['sam', 'sm'],
  'motorola': ['moto'],
  'moto': ['motorola'],
  'xiaomi': ['mi', 'redmi', 'poco'],
  'redmi': ['xiaomi', 'mi'],
  'auricular': ['auriculares', 'buds', 'earbuds', 'headphone', 'headset', 'tws', 'in-ear'],
  'buds': ['auricular', 'auriculares', 'earbuds'],
  'parlante': ['speaker', 'bafle', 'altavoz', 'micro'],
  'speaker': ['parlante', 'bafle'],
  'cargador': ['charger', 'adaptador', 'fuente', 'auto', 'viajero'],
  'charger': ['cargador', 'adaptador'],
  'smartwatch': ['watch', 'reloj', 'smart watch', 'band', 'active'],
  'watch': ['smartwatch', 'reloj'],
  'mochila': ['backpack', 'morral', 'bolso'],
  'promax': ['pro max', 'pro-max'],
  'lightning': ['ip', 'iphone', 'apple', 'v8'],
  'type-c': ['tipo-c', 'tipo c', 'type c', 'usbc', 'usb-c'],
  'tipo c': ['type-c', 'type c', 'usbc', 'usb-c'],
  'cable': ['cables', 'mallado', 'alimentacion', 'conector'],
  'cables': ['cable', 'mallado', 'alimentacion'],
  'soporte': ['soporte', 'base', 'holder', 'auto', 'bici'],
  'foco': ['foco', 'led', 'lampara', 'luz'],
  'led': ['foco', 'lampara', 'luz', 'rgb'],
  'mouse': ['raton', 'mouse pad', 'pad'],
  'teclado': ['teclados', 'keyboard'],
  'base': ['base', 'carga', 'cargador', 'soporte'],
  'almohada': ['almohada', 'cable', 'pulsera'],
  'pulsera': ['pulsera', 'almohada', 'cable'],
  'extensor': ['extensor', 'repetidor', 'rango', 'wifi'],
  'repetidor': ['extensor', 'repetidor', 'rango'],
  'control': ['control', 'remoto', 'universal'],
  'remoto': ['control', 'remoto', 'universal'],
  'bateria': ['bateria', 'baterias', 'pila', 'pilas'],
  'pila': ['pila', 'pilas', 'bateria', 'baterias'],
  'humificador': ['humificador', 'aromas', 'humidificador'],
  'estuche': ['estuche', 'funda', 'case', 'cover'],
  'correa': ['correa', 'band', 'pulseira', 'strap'],
  'ringo': ['ringo', 'ring', 'anillo'],
  'anillo': ['ringo', 'ring', 'anillo'],
  'pop': ['pop', 'socket', 'popsocket'],
  'drone': ['drone', 'dji'],
  'camara': ['camara', 'webcam', 'ip wifi'],
  'proyector': ['proyector', 'projetor'],
  'brazalete': ['brazalete', 'band', 'pulseira'],
  'llavero': ['llavero', 'llaverо', 'keychain'],
  'almacenamiento': ['almacenamiento', 'disco', 'ssd', 'pen', 'usb'],
  'monitor': ['monitor', 'pantalla', 'display'],
  'lente': ['lente', 'lupas', 'macro'],
  'microfono': ['microfono', 'micro', 'mic'],
  'imprimible': ['imprimible', 'impresora', 'filamento'],
  'zapatillas': ['zapatillas', 'sneakers', 'calzado'],
  'gabinete': ['gabinete', 'case', 'gamer'],
  'heladera': ['heladera', 'cooler', 'refrigerante'],
  'licuadora': ['licuadora', 'procesadora', 'mixer']
};

const STOP_WORDS = new Set([
  'de', 'con', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'en', 'y', 'o',
  'por', 'del', 'al', 's/', 'c/', 'sin', 'cable', 'original', 'generico', 'plus',
  'full', 'glue', '9d', '11d', '21d', 'hd', 'premium', 'nuevo', 'calidad'
]);

export const Matcher = {
  /**
   * Limpia y normaliza un texto para comparación uniforme
   */
  normalize(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes
      .replace(/[^\w\s]/g, ' ')         // Reemplaza símbolos por espacios
      .replace(/\s+/g, ' ')            // Colapsa múltiples espacios
      .trim();
  },

  /**
   * Extrae tokens clave de un nombre
   */
  tokenize(text) {
    const clean = this.normalize(text);
    return clean
      .split(' ')
      .filter(token => token.length > 1 && !STOP_WORDS.has(token));
  },

  /**
   * Calcula el coeficiente de similitud Dice / Token Overlap entre dos textos
   */
  calculateSimilarity(str1, str2) {
    const norm1 = this.normalize(str1);
    const norm2 = this.normalize(str2);

    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0;

    // Si uno contiene exactamente al otro
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const minLen = Math.min(norm1.length, norm2.length);
      const maxLen = Math.max(norm1.length, norm2.length);
      return 0.85 + (0.15 * (minLen / maxLen));
    }

    const tokens1 = this.tokenize(norm1);
    const tokens2 = this.tokenize(norm2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    // Expandir con sinónimos
    const expandTokens = (tokens) => {
      const set = new Set(tokens);
      tokens.forEach(t => {
        if (SYNONYMS[t]) {
          SYNONYMS[t].forEach(syn => set.add(syn));
        }
      });
      return set;
    };

    const set1 = expandTokens(tokens1);
    const set2 = expandTokens(tokens2);

    let matchCount = 0;
    tokens1.forEach(t => {
      if (set2.has(t)) {
        matchCount++;
      } else {
        // Chequear coincidencia parcial de modelos (ej. "ip14" y "iphone 14", "g04" en "moto g04")
        for (let target of tokens2) {
          if (t === target) {
            matchCount += 1;
            break;
          } else if (t.length > 2 && target.length > 2 && (target.includes(t) || t.includes(target))) {
            matchCount += 0.7;
            break;
          }
        }
      }
    });

    const jaccard = matchCount / Math.max(tokens1.length, tokens2.length);

    // Bonus si coinciden números/modelos clave (ej. 14, 15, 280, 5, 6, 25w)
    const extractNumbers = (txt) => txt.match(/\d+[a-z]*/g) || [];
    const nums1 = extractNumbers(norm1);
    const nums2 = extractNumbers(norm2);

    if (nums1.length > 0 && nums2.length > 0) {
      const sharedNums = nums1.filter(n => nums2.includes(n));
      if (sharedNums.length > 0) {
        return Math.min(1.0, jaccard + 0.25);
      } else {
        // Penalizar si tienen números distintos (ej. iPhone 14 vs iPhone 13)
        return jaccard * 0.5;
      }
    }

    return Math.min(1.0, jaccard);
  },

  /**
   * Busca la mejor coincidencia para un producto de proveedor contra la lista de Caddis
   */
  findBestMatch(supplierItemName, caddisItems) {
    if (!supplierItemName || !caddisItems || caddisItems.length === 0) {
      return { match: null, score: 0, confidence: 'none', isManualMapping: false };
    }

    const cleanSupplierName = this.normalize(supplierItemName);

    // 1. Revisar si existe una asociación guardada previamente por el usuario
    const savedMappings = Storage.getMappings();
    if (savedMappings[cleanSupplierName]) {
      const saved = savedMappings[cleanSupplierName];
      const matchedItem = caddisItems.find(c => c.codigo === saved.caddisCode);
      if (matchedItem) {
        return {
          match: matchedItem,
          score: 1.0,
          confidence: 'high',
          isManualMapping: true,
          source: 'saved_memory'
        };
      }
    }

    // 2. Buscar por coincidencia exacta de código si el proveedor envió código
    const exactCode = caddisItems.find(c =>
      c.codigo && (c.codigo.toLowerCase() === cleanSupplierName || cleanSupplierName.startsWith(c.codigo.toLowerCase() + ' '))
    );
    if (exactCode) {
      return {
        match: exactCode,
        score: 0.98,
        confidence: 'high',
        isManualMapping: false,
        source: 'exact_code'
      };
    }

    // 3. Evaluar similitud con todos los artículos de Caddis
    //    Probar contra articulo (descripción) y también contra la versión completa
    let bestMatch = null;
    let bestScore = 0;

    for (const caddisItem of caddisItems) {
      // Construir descripción completa: tipo + articulo
      const fullDesc = [caddisItem.tipo, caddisItem.articulo].filter(Boolean).join(' ');
      const articuloOnly = caddisItem.articulo || '';

      // Probar similitud contra ambas versiones y quedarse con la mejor
      const score1 = this.calculateSimilarity(supplierItemName, articuloOnly);
      const score2 = this.calculateSimilarity(supplierItemName, fullDesc);
      const score = Math.max(score1, score2);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = caddisItem;
      }
    }

    let confidence = 'none';
    if (bestScore >= 0.70) {
      confidence = 'high';
    } else if (bestScore >= 0.40) {
      confidence = 'medium';
    } else if (bestScore >= 0.20) {
      confidence = 'low';
    }

    return {
      match: bestScore >= 0.20 ? bestMatch : null,
      score: bestScore,
      confidence,
      isManualMapping: false,
      source: 'fuzzy_search'
    };
  },

  /**
   * Ejecuta el emparejamiento masivo de todos los productos del proveedor
   */
  matchAll(supplierItems, caddisItems) {
    return supplierItems.map(sItem => {
      const name = sItem.articulo || sItem.nombre || sItem.descripcion || '';
      const matchResult = this.findBestMatch(name, caddisItems);
      return {
        supplierItem: sItem,
        matchedCaddisItem: matchResult.match,
        matchScore: matchResult.score,
        confidence: matchResult.confidence,
        isManualMapping: matchResult.isManualMapping,
        matchSource: matchResult.source
      };
    });
  }
};
