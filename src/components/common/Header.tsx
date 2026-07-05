import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sun, Moon, Monitor, Download } from 'lucide-react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { theme, setTheme, refreshInterval, setRefreshInterval } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial theme set
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [theme]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoGroup}>
          <span className={styles.logoIcon}>💱</span>
          <h1 className={styles.logoText}>全球汇率查看器</h1>
          <span className={styles.badge}>独立离线版</span>
        </div>

        <div className={styles.actions}>
          {showInstallBtn && (
            <button 
              className={styles.installBtn} 
              onClick={handleInstallClick}
              aria-label="安装应用到桌面"
            >
              <Download size={16} />
              <span>安装</span>
            </button>
          )}

          <div className={styles.refreshSelector}>
            <span className={styles.refreshLabel}>自动刷新</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className={styles.refreshSelect}
              aria-label="选择自动刷新频率"
            >
              <option value={0}>关闭</option>
              <option value={10}>10秒</option>
              <option value={60}>1分钟</option>
              <option value={300}>5分钟</option>
            </select>
          </div>

          <div className={styles.themeSelector} aria-label="主题选择器">
            <button
              className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''}`}
              onClick={() => setTheme('light')}
              title="亮色模式"
              aria-label="切换到亮色模式"
            >
              <Sun size={16} />
            </button>
            <button
              className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
              onClick={() => setTheme('dark')}
              title="暗色模式"
              aria-label="切换到暗色模式"
            >
              <Moon size={16} />
            </button>
            <button
              className={`${styles.themeBtn} ${theme === 'system' ? styles.active : ''}`}
              onClick={() => setTheme('system')}
              title="系统默认"
              aria-label="跟随系统主题"
            >
              <Monitor size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
