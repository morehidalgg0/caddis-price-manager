/**
 * api.js - Módulo de consulta de cotizaciones de dólar en Argentina
 * Consulta APIs públicas (DolarApi.com / BNA) para obtener la cotización oficial y paralela en tiempo real.
 */

export const ExchangeAPI = {
  async fetchDollarRates() {
    try {
      const response = await fetch('https://dolarapi.com/v1/dolares', {
        cache: 'no-cache'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Mapear los tipos de cambio más relevantes
      const oficial = data.find(d => d.casa === 'oficial') || {};
      const blue = data.find(d => d.casa === 'blue') || {};
      const tarjeta = data.find(d => d.casa === 'tarjeta') || {};
      const cripto = data.find(d => d.casa === 'cripto') || {};
      const bolsa = data.find(d => d.casa === 'bolsa') || {};

      return {
        success: true,
        updatedAt: oficial.fechaActualizacion || new Date().toISOString(),
        rates: {
          bna: oficial.venta || 1510.00,
          oficial: oficial.venta || 1510.00,
          blue: blue.venta || 1550.00,
          tarjeta: tarjeta.venta || 1600.00,
          mep: bolsa.venta || 1520.00,
          cripto: cripto.venta || 1530.00
        }
      };
    } catch (error) {
      console.warn('No se pudo consultar la API de cotizaciones en tiempo real (modo offline o bloqueo CORS):', error);
      return {
        success: false,
        error: error.message,
        rates: {
          bna: 1510.00,
          oficial: 1510.00,
          blue: 1550.00,
          tarjeta: 1600.00,
          mep: 1520.00,
          cripto: 1530.00
        }
      };
    }
  }
};
