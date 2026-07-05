import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aggregator } from '../services/aggregator';
import type { ExchangeRates } from '../services/aggregator';
import { conversionHistoryStorage } from '../services/storage';

export interface HistoryRecord {
  id: string;
  timestamp: number;
  base: string;
  target: string;
  amount: number;
  result: number;
  rate: number;
}

export interface RateAlert {
  id: string;
  base: string;
  target: string;
  condition: 'above' | 'below';
  value: number;
  active: boolean;
  createdAt: number;
}

interface AppState {
  // Theme & Settings
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;

  // Markup Spread settings
  markupType: 'none' | 'card' | 'cash' | 'custom';
  customMarkup: number;
  setMarkupType: (type: 'none' | 'card' | 'cash' | 'custom') => void;
  setCustomMarkup: (val: number) => void;

  // Currency Converter State
  baseCurrency: string;
  targetCurrency: string;
  amount: number;
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  
  setBaseCurrency: (code: string) => void;
  setTargetCurrency: (code: string) => void;
  setAmount: (val: number) => void;
  swapCurrencies: () => void;
  fetchRates: (force?: boolean) => Promise<void>;

  // Selection Favorites & Recents
  favorites: string[];
  recents: string[];
  toggleFavorite: (code: string) => void;
  addRecent: (code: string) => void;

  // Rate Alerts
  alerts: RateAlert[];
  addAlert: (alert: Omit<RateAlert, 'id' | 'active' | 'createdAt'>) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  checkRateAlerts: (rates: ExchangeRates) => void;

  // Conversion History
  history: HistoryRecord[];
  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => Promise<void>;
  loadHistoryRecords: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        // Handle class toggle on <html> element
        const root = window.document.documentElement;
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
      refreshInterval: 0,
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),

      // Markup defaults
      markupType: 'none',
      customMarkup: 1.5,
      setMarkupType: (markupType) => set({ markupType }),
      setCustomMarkup: (customMarkup) => set({ customMarkup }),

      // Conversion state defaults
      baseCurrency: 'USD',
      targetCurrency: 'CNY',
      amount: 100,
      rates: null,
      loading: false,
      error: null,

      setBaseCurrency: (code) => {
        set({ baseCurrency: code });
        get().addRecent(code);
        get().fetchRates();
      },
      setTargetCurrency: (code) => {
        set({ targetCurrency: code });
        get().addRecent(code);
        get().fetchRates();
      },
      setAmount: (amount) => set({ amount }),
      swapCurrencies: () => {
        const { baseCurrency, targetCurrency } = get();
        set({ baseCurrency: targetCurrency, targetCurrency: baseCurrency });
        get().fetchRates();
      },

      fetchRates: async (force: boolean = false) => {
        const { baseCurrency, targetCurrency } = get();
        set({ loading: true, error: null });
        try {
          const rates = await aggregator.getRates(baseCurrency, force);

          // Overlay Yahoo Finance live price for active pair
          if (baseCurrency !== targetCurrency) {
            try {
              const liveRate = await aggregator.getLivePairRate(baseCurrency, targetCurrency);
              if (liveRate && rates.rates[targetCurrency]) {
                rates.rates[targetCurrency] = liveRate;
                rates.source = `${rates.source} + 雅虎实时对价`;
              }
            } catch (e) {
              console.warn('Failed to fetch live Yahoo rate overlay:', e);
            }
          }

          set({ rates, loading: false });
          // Check alerts dynamically after rates update
          get().checkRateAlerts(rates);
        } catch (err: any) {
          set({ error: err.message || '获取汇率失败', loading: false });
        }
      },

      // Favorites & Recents
      favorites: ['CNY', 'USD', 'EUR', 'JPY', 'GBP'],
      recents: [],
      toggleFavorite: (code) => {
        const { favorites } = get();
        if (favorites.includes(code)) {
          set({ favorites: favorites.filter((f) => f !== code) });
        } else {
          set({ favorites: [...favorites, code] });
        }
      },
      addRecent: (code) => {
        const { recents } = get();
        const filtered = recents.filter((r) => r !== code);
        set({ recents: [code, ...filtered].slice(0, 5) }); // Maintain max 5 items
      },

      // Rate Alerts
      alerts: [],
      addAlert: (alert) => {
        const newAlert: RateAlert = {
          ...alert,
          id: Math.random().toString(36).substring(2, 9),
          active: true,
          createdAt: Date.now()
        };
        set({ alerts: [newAlert, ...get().alerts] });
      },
      toggleAlert: (id) => {
        set({
          alerts: get().alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
        });
      },
      deleteAlert: (id) => {
        set({ alerts: get().alerts.filter((a) => a.id !== id) });
      },

      // Conversion History in IndexedDB
      history: [],
      addHistoryRecord: async (record) => {
        const newRecord: HistoryRecord = {
          ...record,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now()
        };
        
        // Append to local store
        const records = [newRecord, ...get().history].slice(0, 500); // limit to 500 rows
        set({ history: records });

        try {
          await conversionHistoryStorage.setItem('logs', records);
        } catch (e) {
          console.warn('Failed to save log to IndexedDB', e);
        }
      },
      loadHistoryRecords: async () => {
        try {
          const storedLogs = await conversionHistoryStorage.getItem<HistoryRecord[]>('logs');
          if (storedLogs) {
            set({ history: storedLogs });
          }
        } catch (e) {
          console.warn('Failed to load logs from IndexedDB', e);
        }
      },
      clearHistory: async () => {
        set({ history: [] });
        try {
          await conversionHistoryStorage.removeItem('logs');
        } catch (e) {
          console.warn('Failed to clear logs from IndexedDB', e);
        }
      },

      // Utility trigger helper to check rate alert conditions
      checkRateAlerts: (rates: ExchangeRates) => {
        const { alerts } = get();
        let updatedAlerts = [...alerts];
        let triggered = false;

        alerts.forEach((alertRule, index) => {
          if (!alertRule.active || alertRule.base !== rates.base) return;

          const currentRate = rates.rates[alertRule.target];
          if (!currentRate) return;

          let isTriggered = false;
          if (alertRule.condition === 'above' && currentRate >= alertRule.value) {
            isTriggered = true;
          } else if (alertRule.condition === 'below' && currentRate <= alertRule.value) {
            isTriggered = true;
          }

          if (isTriggered) {
            triggered = true;
            updatedAlerts[index] = { ...alertRule, active: false }; // Disable alert after triggering
            
            // Push Notification
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(`汇率警报触发！`, {
                  body: `${alertRule.base}/${alertRule.target} 当前汇率已达到 ${currentRate.toFixed(4)} (${alertRule.condition === 'above' ? '高于' : '低于'} ${alertRule.value})`,
                  icon: '/icon-192x192.png'
                });
              } else {
                // Fallback alert
                alert(`[汇率提醒] ${alertRule.base}/${alertRule.target} 当前汇率已达到 ${currentRate.toFixed(4)}！`);
              }
            } else {
              alert(`[汇率提醒] ${alertRule.base}/${alertRule.target} 当前汇率已达到 ${currentRate.toFixed(4)}！`);
            }
          }
        });

        if (triggered) {
          set({ alerts: updatedAlerts });
        }
      }
    }),
    {
      name: 'currency_exchange_store',
      partialize: (state) => ({
        theme: state.theme,
        baseCurrency: state.baseCurrency,
        targetCurrency: state.targetCurrency,
        amount: state.amount,
        favorites: state.favorites,
        recents: state.recents,
        alerts: state.alerts,
        refreshInterval: state.refreshInterval,
        markupType: state.markupType,
        customMarkup: state.customMarkup
      })
    }
  )
);
