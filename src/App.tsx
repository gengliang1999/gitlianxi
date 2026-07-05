import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ConverterPanel } from './features/converter/ConverterPanel';
import { HistoricalChart } from './features/chart/HistoricalChart';
import { AlertsPanel } from './features/alerts/AlertsPanel';
import { HistoryPanel } from './features/history/HistoryPanel';
import styles from './App.module.css';

export const App: React.FC = () => {
  const { theme, fetchRates, refreshInterval } = useAppStore();

  useEffect(() => {
    // Initial fetch on mount
    fetchRates();

    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        fetchRates(true); // Force-bypass cache to check for rates variation
      }, refreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [refreshInterval, fetchRates]);

  useEffect(() => {
    // Read and initialize theme setting
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Listen for system theme preference shifts
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return (
    <div className={styles.appShell}>
      <Header />
      
      <main className={styles.mainContent}>
        <div className={styles.layoutGrid}>
          {/* Left Column: Compact sidebar (280px) */}
          <aside className={styles.sidebarColumn}>
            <ConverterPanel />
            <AlertsPanel />
          </aside>
          
          {/* Right Column: Wide dashboard area (1fr) */}
          <section className={styles.mainColumn}>
            <HistoricalChart />
            <HistoryPanel />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
export default App;
