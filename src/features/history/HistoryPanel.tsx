import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { HistoryRecord } from '../../store/useAppStore';
import { Calendar, FileText, ArrowRight } from 'lucide-react';
import { CURRENCIES } from '../../utils/currencies';
import styles from './HistoryPanel.module.css';

export const HistoryPanel: React.FC = () => {
  const { 
    history, 
    loadHistoryRecords, 
    clearHistory, 
    setBaseCurrency,
    setTargetCurrency,
    setAmount
  } = useAppStore();

  useEffect(() => {
    loadHistoryRecords();
  }, []);

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadRecordIntoConverter = (rec: HistoryRecord) => {
    setBaseCurrency(rec.base);
    setTargetCurrency(rec.target);
    setAmount(rec.amount);
    
    // Smooth scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className={`${styles.card} glass`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <FileText size={18} className={styles.icon} />
          <h2 className={styles.title}>换算历史记录</h2>
        </div>
        {history.length > 0 && (
          <button 
            className={styles.clearBtn} 
            onClick={clearHistory}
            aria-label="清空所有历史换算记录"
          >
            清空全部
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={32} className={styles.emptyIcon} />
          <p>暂无任何换算记录</p>
          <span className={styles.emptyHint}>在换算器中完成计算后，点击“保存记录”即可存放在此处。</span>
        </div>
      ) : (
        <div className={styles.list}>
          {history.map((rec) => {
            const baseInfo = CURRENCIES.find(c => c.code === rec.base);
            const targetInfo = CURRENCIES.find(c => c.code === rec.target);

            return (
              <div 
                key={rec.id} 
                className={styles.item}
                onClick={() => loadRecordIntoConverter(rec)}
                title="点击载入此数据到换算器中"
              >
                <div className={styles.flags}>
                  <span className={styles.flag} aria-hidden="true">{baseInfo?.flag}</span>
                  <ArrowRight size={12} className={styles.arrow} />
                  <span className={styles.flag} aria-hidden="true">{targetInfo?.flag}</span>
                </div>

                <div className={styles.details}>
                  <div className={styles.mathRow}>
                    <span className={styles.mathText}>
                      {rec.amount.toLocaleString()} <span className={styles.codeText}>{rec.base}</span>
                    </span>
                    <ArrowRight size={12} className={styles.arrow} />
                    <span className={styles.resultText}>
                      {rec.result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={styles.codeText}>{rec.target}</span>
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.time}>{formatTimestamp(rec.timestamp)}</span>
                    <span className={styles.divider}>•</span>
                    <span className={styles.rateText}>汇率: {rec.rate.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
export default HistoryPanel;
