import localforage from './storage';

export interface ExchangeRates {
  base: string;
  date: string;
  rates: { [key: string]: number };
  source: string;
  timestamp: number;
}

export interface ApiConfig {
  name: string;
  key: string;
  limit: number;
  used: number;
  active: boolean;
  disabledUntil: number;
}

const MEMORY_CACHE_TTL = 60 * 1000; // 1 minute
const PERSISTENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DISABLE_DURATION = 5 * 60 * 1000; // 5 minutes automatic re-enable

class ExchangeRateAggregator {
  private apis: ApiConfig[] = [];
  private memoryCache: { [key: string]: { data: ExchangeRates; ts: number } } = {};

  constructor() {
    this.loadApiConfigs();
  }

  // Load API keys and configurations from localStorage
  public loadApiConfigs() {
    const defaultApis = [
      { name: 'ExchangeRate-API (公共渠道)', key: 'PUBLIC', limit: Infinity, used: 0, active: true, disabledUntil: 0 },
      { name: 'ExchangeRate-API', key: '', limit: 1500, used: 0, active: true, disabledUntil: 0 },
      { name: 'Open Exchange Rates', key: '', limit: 1000, used: 0, active: true, disabledUntil: 0 },
      { name: 'Fixer API', key: '', limit: 1000, used: 0, active: true, disabledUntil: 0 },
      { name: 'Frankfurter', key: 'FREE', limit: Infinity, used: 0, active: true, disabledUntil: 0 }
    ];

    try {
      const stored = localStorage.getItem('exchange_api_configs');
      if (stored) {
        this.apis = JSON.parse(stored);
        this.apis.forEach(api => {
          if (api.disabledUntil === undefined) {
            api.disabledUntil = 0;
          }
        });
        if (!this.apis.some(a => a.name === 'Frankfurter')) {
          this.apis.push(defaultApis[4]);
        }
        if (!this.apis.some(a => a.name === 'ExchangeRate-API (公共渠道)')) {
          this.apis.unshift(defaultApis[0]);
        }
      } else {
        this.apis = defaultApis;
        this.saveApiConfigs();
      }
    } catch {
      this.apis = defaultApis;
    }
  }

  public getApiConfigs(): ApiConfig[] {
    return this.apis;
  }

  public saveApiConfigs(configs?: ApiConfig[]) {
    if (configs) {
      this.apis = configs;
    }
    localStorage.setItem('exchange_api_configs', JSON.stringify(this.apis));
  }

  // Monthly limit resets
  public checkAndResetLimits() {
    const now = new Date();
    const storedReset = localStorage.getItem('api_last_reset_month');
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;

    if (storedReset !== currentMonth) {
      this.apis.forEach(api => {
        api.used = 0;
        api.active = true;
        api.disabledUntil = 0;
      });
      this.saveApiConfigs();
      localStorage.setItem('api_last_reset_month', currentMonth);
    }
  }

  // Retrieve exchange rates with caching & failover
  public async getRates(base: string, forceRefresh: boolean = false): Promise<ExchangeRates> {
    this.checkAndResetLimits();
    const cacheKey = `rates_${base}`;

    if (!forceRefresh) {
      // 1. Check memory cache
      const memCached = this.memoryCache[cacheKey];
      if (memCached && memCached.data.source !== '系统模拟引擎' && Date.now() - memCached.ts < MEMORY_CACHE_TTL) {
        return memCached.data;
      }

      // 2. Check IndexedDB persistent cache
      try {
        const cached = await localforage.getItem<ExchangeRates>(cacheKey);
        if (cached && cached.source !== '系统模拟引擎' && Date.now() - cached.timestamp < PERSISTENT_CACHE_TTL) {
          // Hydrate memory cache
          this.memoryCache[cacheKey] = { data: cached, ts: Date.now() };
          return cached;
        }
      } catch (e) {
        console.warn('Persistent cache reading failed', e);
      }
    }

    // 3. Try API routing based on priority & configuration
    for (const api of this.apis) {
      if (api.disabledUntil > Date.now()) continue;
      if (!api.active || api.used >= api.limit) continue;

      try {
        let data: ExchangeRates | null = null;
        if (api.name === 'ExchangeRate-API (公共渠道)') {
          data = await this.fetchExchangeRateApiPublic(base);
        } else if (api.name === 'ExchangeRate-API' && api.key) {
          data = await this.fetchExchangeRateApi(base, api.key);
        } else if (api.name === 'Open Exchange Rates' && api.key) {
          data = await this.fetchOpenExchangeRates(base, api.key);
        } else if (api.name === 'Fixer API' && api.key) {
          data = await this.fetchFixerApi(base, api.key);
        } else if (api.name === 'Frankfurter') {
          data = await this.fetchFrankfurter(base);
        }

        if (data) {
          api.used++;
          this.saveApiConfigs();
          // Write back to cache
          this.memoryCache[cacheKey] = { data, ts: Date.now() };
          await localforage.setItem(cacheKey, data);
          return data;
        }
      } catch (err) {
        console.error(`API ${api.name} failed. Trying fallback...`, err);
        api.disabledUntil = Date.now() + DISABLE_DURATION;
        this.saveApiConfigs();
      }
    }

    // 4. All APIs failed / No keys: Fallback to cached value even if expired
    try {
      const cached = await localforage.getItem<ExchangeRates>(cacheKey);
      if (cached) {
        cached.source = `${cached.source} (离线缓存)`;
        return cached;
      }
    } catch {}

    // 5. Hard fallback: Mock rates to guarantee application never breaks
    const mockData = this.generateMockRates(base);
    this.memoryCache[cacheKey] = { data: mockData, ts: Date.now() };
    await localforage.setItem(cacheKey, mockData);
    return mockData;
  }

  // Fetch from ExchangeRate-API (Public, No Key)
  private async fetchExchangeRateApiPublic(base: string): Promise<ExchangeRates> {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) throw new Error(`ExchangeRate-API Public returned ${res.status}`);
    const json = await res.json();
    if (json.result !== 'success') throw new Error(json['error-type'] || 'API error');

    return {
      base,
      date: json.time_last_update_utc,
      rates: json.rates,
      source: 'ExchangeRate-API (公共权威源)',
      timestamp: Date.now()
    };
  }

  // Fetch from ExchangeRate-API (Private Key)
  private async fetchExchangeRateApi(base: string, key: string): Promise<ExchangeRates> {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/${base}`);
    if (!res.ok) throw new Error(`ExchangeRate-API returned ${res.status}`);
    const json = await res.json();
    if (json.result !== 'success') throw new Error(json['error-type'] || 'API error');

    return {
      base,
      date: json.time_last_update_utc.split(' ').slice(0, 4).join(' '),
      rates: json.conversion_rates,
      source: 'ExchangeRate-API (私有源)',
      timestamp: Date.now()
    };
  }

  // Fetch from Open Exchange Rates
  private async fetchOpenExchangeRates(base: string, key: string): Promise<ExchangeRates> {
    const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${key}&base=${base}`);
    if (!res.ok) throw new Error(`Open Exchange Rates returned ${res.status}`);
    const json = await res.json();

    return {
      base,
      date: new Date(json.timestamp * 1000).toUTCString(),
      rates: json.rates,
      source: 'Open Exchange Rates',
      timestamp: Date.now()
    };
  }

  // Fetch from Fixer API
  private async fetchFixerApi(base: string, key: string): Promise<ExchangeRates> {
    const res = await fetch(`https://data.fixer.io/api/latest?access_key=${key}&base=${base}`);
    if (!res.ok) throw new Error(`Fixer API returned ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.info || 'API error');

    return {
      base,
      date: json.date,
      rates: json.rates,
      source: 'Fixer API',
      timestamp: Date.now()
    };
  }

  // Fetch from Frankfurter API (100% Free, supports ~30 major currencies)
  private async fetchFrankfurter(base: string): Promise<ExchangeRates | null> {
    // Frankfurter only supports selected currencies: USD, EUR, JPY, GBP, AUD, CAD, CHF, CNY, HKD, NZD, SGD, KRW, THB, RUB, INR, TRY, MXN, BRL, ZAR, SEK, DKK, NOK, ILS, PLN, HUF, RON, BGN, CZK
    const supported = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 'SGD', 'KRW', 'THB', 'RUB', 'INR', 'TRY', 'MXN', 'BRL', 'ZAR', 'SEK', 'DKK', 'NOK', 'ILS', 'PLN', 'HUF', 'RON', 'BGN', 'CZK'];
    if (!supported.includes(base)) return null; // Let next fallback handle it

    const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`);
    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`);
    const json = await res.json();

    // Map base rates to standard structure (Frankfurter doesn't return base currency in rates, value=1)
    const rates = { ...json.rates, [base]: 1.0 };

    return {
      base,
      date: json.date,
      rates,
      source: 'Frankfurter API (免费数据源)',
      timestamp: Date.now()
    };
  }

  // Generate plausible simulated rates if all APIs fail
  private generateMockRates(base: string): ExchangeRates {
    // Base rates relative to USD
    const usdPegs: { [key: string]: number } = {
      USD: 1.0, CNY: 7.26, EUR: 0.92, JPY: 161.2, GBP: 0.78,
      AUD: 1.49, CAD: 1.36, CHF: 0.89, HKD: 7.81, NZD: 1.63,
      SGD: 1.35, KRW: 1380.0, THB: 36.5, RUB: 88.2, INR: 83.5,
      TRY: 32.7, MXN: 18.1, BRL: 5.5, ZAR: 18.2, MOP: 8.04, TWD: 32.4
    };

    const baseToUsd = 1 / (usdPegs[base] || 1.0);
    const rates: { [key: string]: number } = {};

    Object.keys(usdPegs).forEach(code => {
      // Perturb slightly to make it look dynamic (between -0.5% and +0.5%)
      const noise = 1 + (Math.random() - 0.5) * 0.01;
      rates[code] = usdPegs[code] * baseToUsd * noise;
    });

    return {
      base,
      date: new Date().toLocaleDateString() + ' (模拟数据)',
      rates,
      source: '系统模拟引擎',
      timestamp: Date.now()
    };
  }

  // Fetch raw chart points from Yahoo Finance
  private async fetchYahooRaw(symbol: string, range: string, interval: string): Promise<{ date: string; value: number }[]> {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseUrl = isLocal ? '/api-yahoo' : 'https://query1.finance.yahoo.com';
    const res = await fetch(`${baseUrl}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`);
    if (!res.ok) throw new Error(`Yahoo Finance returned status ${res.status}`);
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      throw new Error(`Invalid Yahoo Finance chart data structure for ${symbol}`);
    }

    const timestamps = result.timestamp as number[];
    const closes = result.indicators.quote[0].close as (number | null)[];
    
    const points: { date: string; value: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const time = timestamps[i];
      const val = closes[i];
      if (time !== null && typeof val === 'number' && !isNaN(val)) {
        const dateObj = new Date(time * 1000);
        let dateStr = '';
        if (range === '1d') {
          const hr = dateObj.getHours().toString().padStart(2, '0');
          const min = dateObj.getMinutes().toString().padStart(2, '0');
          dateStr = `${hr}:${min}`;
        } else if (range === '1mo') {
          dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        } else {
          // Keep YYYY/MM for long term charts
          dateStr = `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        points.push({ date: dateStr, value: val });
      }
    }
    return points;
  }

  // Get historical data for charts
  public async getHistoricalRates(base: string, target: string, range: '1D' | '1M' | '1Y' | '5Y'): Promise<{ date: string; value: number }[]> {
    if (base === target) {
      const dates = range === '1M' ? 30 : range === '1Y' ? 12 : range === '5Y' ? 60 : 24;
      return Array.from({ length: dates }, (_, i) => ({ date: `${i}`, value: 1.0 }));
    }

    const cacheKey = `history_v2_${base}_${target}_${range}`;
    
    // 1. Check local cache
    try {
      const cached = await localforage.getItem<{ data: { date: string; value: number }[]; timestamp: number }>(cacheKey);
      if (cached && Date.now() - cached.timestamp < 12 * 60 * 60 * 1000) { // 12 hours cache TTL
        return cached.data;
      }
    } catch {}

    // Map range to Yahoo format
    let yRange = '1mo';
    let yInterval = '1d';
    if (range === '1D') {
      yRange = '1d';
      yInterval = '15m';
    } else if (range === '1M') {
      yRange = '1mo';
      yInterval = '1d';
    } else if (range === '1Y') {
      yRange = '1y';
      yInterval = '1d';
    } else if (range === '5Y') {
      yRange = '5y';
      yInterval = '1wk';
    }

    // 2. Try direct Yahoo Finance request
    try {
      const data = await this.fetchYahooRaw(`${base}${target}=X`, yRange, yInterval);
      if (data && data.length > 0) {
        const formatted = data.map(p => ({ date: p.date, value: Number(p.value.toFixed(4)) }));
        await localforage.setItem(cacheKey, { data: formatted, timestamp: Date.now() });
        return formatted;
      }
    } catch (err) {
      console.warn(`Direct Yahoo fetch for ${base}${target}=X failed. Triangulating...`, err);
    }

    // 3. Try Triangulation via USD: (USD/Target) / (USD/Base)
    try {
      const targetSymbol = base === 'USD' ? null : `USD${target}=X`;
      const baseSymbol = target === 'USD' ? null : `USD${base}=X`;

      let targetData = base === 'USD' ? null : await this.fetchYahooRaw(targetSymbol!, yRange, yInterval);
      let baseData = target === 'USD' ? null : await this.fetchYahooRaw(baseSymbol!, yRange, yInterval);

      const points: { date: string; value: number }[] = [];

      if (base === 'USD' && targetData) {
        // Just USD/Target
        targetData.forEach(p => points.push({ date: p.date, value: Number(p.value.toFixed(4)) }));
      } else if (target === 'USD' && baseData) {
        // Inverse of USD/Base
        baseData.forEach(p => points.push({ date: p.date, value: Number((1 / p.value).toFixed(4)) }));
      } else if (targetData && baseData) {
        // Map base USD rate by date
        const baseMap = new Map<string, number>();
        baseData.forEach(p => baseMap.set(p.date, p.value));

        targetData.forEach(p => {
          const baseVal = baseMap.get(p.date);
          if (baseVal && baseVal > 0) {
            points.push({
              date: p.date,
              value: Number((p.value / baseVal).toFixed(4))
            });
          }
        });
      }

      if (points.length > 0) {
        await localforage.setItem(cacheKey, { data: points, timestamp: Date.now() });
        return points;
      }
    } catch (err) {
      console.warn('Triangulation fetch failed. Trying Frankfurter fallback...', err);
    }

    // 4. Fallback: Frankfurter
    try {
      const supported = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 'SGD', 'KRW', 'THB', 'RUB', 'INR', 'TRY', 'MXN', 'BRL', 'ZAR', 'SEK', 'DKK', 'NOK', 'ILS', 'PLN', 'HUF', 'RON', 'BGN', 'CZK'];
      if (supported.includes(base) && supported.includes(target) && range !== '1D') {
        const endDate = new Date().toISOString().split('T')[0];
        let startDate = '';
        const now = new Date();

        if (range === '1M') {
          now.setMonth(now.getMonth() - 1);
        } else if (range === '1Y') {
          now.setFullYear(now.getFullYear() - 1);
        } else {
          now.setFullYear(now.getFullYear() - 5);
        }
        startDate = now.toISOString().split('T')[0];

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const baseUrl = isLocal ? '/api-frankfurter' : 'https://api.frankfurter.app';
        const res = await fetch(`${baseUrl}/${startDate}..${endDate}?base=${base}&symbols=${target}`);
        if (res.ok) {
          const json = await res.json();
          const points: { date: string; value: number }[] = [];
          Object.keys(json.rates).forEach(date => {
            if (json.rates[date] && json.rates[date][target]) {
              points.push({ date, value: Number(json.rates[date][target].toFixed(4)) });
            }
          });

          if (points.length > 0) {
            await localforage.setItem(cacheKey, { data: points, timestamp: Date.now() });
            return points;
          }
        }
      }
    } catch (err) {
      console.warn('Frankfurter fallback failed too', err);
    }

    // 5. If everything fails, try to return an expired cached record
    try {
      const cached = await localforage.getItem<{ data: { date: string; value: number }[]; timestamp: number }>(cacheKey);
      if (cached) {
        return cached.data;
      }
    } catch {}

    throw new Error('获取权威历史汇率数据失败，请检查网络连接！');
  }

  // Fetch live single ticker rate from Yahoo Finance
  public async getLivePairRate(base: string, target: string): Promise<number | null> {
    if (base === target) return 1.0;

    const fetchSingleYahooPrice = async (symbol: string): Promise<number | null> => {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const baseUrl = isLocal ? '/api-yahoo' : 'https://query1.finance.yahoo.com';
      const res = await fetch(`${baseUrl}/v8/finance/chart/${symbol}?range=1d&interval=15m`);
      if (!res.ok) return null;
      const json = await res.json();
      const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
      return typeof price === 'number' && price > 0 ? price : null;
    };

    // 1. Try direct pair
    try {
      const rate = await fetchSingleYahooPrice(`${base}${target}=X`);
      if (rate) return rate;
    } catch {}

    // 2. Try triangulation via USD: (USD -> Target) / (USD -> Base)
    try {
      const usdTarget = base === 'USD' ? 1.0 : await fetchSingleYahooPrice(`USD${target}=X`);
      const usdBase = target === 'USD' ? 1.0 : await fetchSingleYahooPrice(`USD${base}=X`);
      if (usdTarget && usdBase) {
        return usdTarget / usdBase;
      }
    } catch {}

    return null;
  }
}

export const aggregator = new ExchangeRateAggregator();
