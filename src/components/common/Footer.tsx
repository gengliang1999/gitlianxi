import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, Check, AlertCircle } from 'lucide-react';
import { aggregator } from '../../services/aggregator';
import type { ApiConfig } from '../../services/aggregator';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const { rates } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const openSettings = () => {
    aggregator.loadApiConfigs();
    setConfigs(aggregator.getApiConfigs());
    setShowSettings(true);
    setSavedSuccess(false);
  };

  const handleKeyChange = (index: number, val: string) => {
    const updated = [...configs];
    updated[index].key = val;
    setConfigs(updated);
  };

  const saveSettings = () => {
    aggregator.saveApiConfigs(configs);
    // Reload configs in aggregator
    aggregator.loadApiConfigs();
    setSavedSuccess(true);
    setTimeout(() => {
      setShowSettings(false);
      setSavedSuccess(false);
    }, 1200);
  };

  const formatUpdateDate = () => {
    if (!rates) return '获取数据中...';
    try {
      const date = new Date(rates.timestamp);
      return date.toLocaleString();
    } catch {
      return rates.date;
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.meta}>
          <p className={styles.updateTime}>
            数据源: <span className={styles.sourceText}>{rates?.source || '免费聚合引擎'}</span>
          </p>
          <p className={styles.updateTime}>
            更新时间: <span>{formatUpdateDate()}</span>
          </p>
        </div>

        <div className={styles.warning}>
          <AlertCircle size={14} className={styles.warnIcon} />
          <span>免责声明：本应用展示的为中间市场汇率，实际跨境汇款或换汇时，银行与金融机构通常会收取 1% - 3% 的手续费/加价。本数据仅供参考，不构成交易建议。</span>
        </div>

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>© 2026 全球汇率查看器. 独立离线版应用. 汇率数据由 ExchangeRate-API 权威提供.</p>
          <button className={styles.settingsBtn} onClick={openSettings} aria-label="打开开发API设置">
            <Settings size={14} />
            <span>数据源 API 设置</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className={styles.modalCard}>
            <h3 id="settings-title" className={styles.modalTitle}>⚙️ 开发者 API 设置</h3>
            <p className={styles.modalSubtitle}>输入您申请的第三方免费 API Key 以替换内置的受限配额，修改后自动保存在本地。</p>
            
            <div className={styles.formList}>
              {configs.map((api, idx) => {
                const isFreePublic = api.name === 'Frankfurter' || api.name === 'ExchangeRate-API (公共渠道)';
                return (
                  <div key={api.name} className={styles.formGroup}>
                    <label className={styles.label}>
                      {api.name} {isFreePublic && '(无需Key，完全免费)'}
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={api.key}
                      placeholder={isFreePublic ? '免费公共通道' : '输入您的 API 密钥'}
                      disabled={isFreePublic}
                      onChange={(e) => handleKeyChange(idx, e.target.value)}
                    />
                    <span className={styles.quotaHint}>
                      月免费额度: {api.limit === Infinity ? '无限次' : `${api.limit} 次`} | 本月已调用: {api.used} 次
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowSettings(false)} disabled={savedSuccess}>
                取消
              </button>
              <button className={styles.saveBtn} onClick={saveSettings} disabled={savedSuccess}>
                {savedSuccess ? <Check size={16} /> : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
export default Footer;
