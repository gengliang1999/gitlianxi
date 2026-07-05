import localforage from 'localforage';

// Configure default store for exchange rates
localforage.config({
  name: 'CurrencyExchangePWA',
  storeName: 'exchange_rates_store'
});

// Configure custom store for conversion history
export const conversionHistoryStorage = localforage.createInstance({
  name: 'CurrencyExchangePWA',
  storeName: 'conversion_history'
});

// Configure custom store for chart cache
export const chartCacheStorage = localforage.createInstance({
  name: 'CurrencyExchangePWA',
  storeName: 'chart_cache'
});

export default localforage;
