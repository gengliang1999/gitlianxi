import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Bell, BellOff, Trash2, Plus, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { SelectorModal } from '../converter/SelectorModal';
import { CURRENCIES } from '../../utils/currencies';
import styles from './AlertsPanel.module.css';

export const AlertsPanel: React.FC = () => {
  const {
    baseCurrency,
    targetCurrency,
    rates,
    alerts,
    addAlert,
    toggleAlert,
    deleteAlert
  } = useAppStore();

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [targetVal, setTargetVal] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  
  // Custom selector for alert currency pair
  const [alertBase, setAlertBase] = useState(baseCurrency);
  const [alertTarget, setAlertTarget] = useState(targetCurrency);
  const [activeSelect, setActiveSelect] = useState<'base' | 'target' | null>(null);

  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifyPermission(Notification.permission);
    }
  }, []);

  // Request HTML5 desktop notification permissions
  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifyPermission(result);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetVal);
    if (isNaN(parsed) || parsed <= 0) {
      alert('请输入有效的汇率数值');
      return;
    }

    if (alertBase === alertTarget) {
      alert('源货币与目标货币不能相同');
      return;
    }

    if (alerts.length >= 10) {
      alert('最多只支持设置 10 个有效汇率提醒');
      return;
    }

    addAlert({
      base: alertBase,
      target: alertTarget,
      condition,
      value: parsed
    });

    setTargetVal('');
    setIsAlertModalOpen(false);
  };

  const baseInfo = CURRENCIES.find(c => c.code === alertBase);
  const targetInfo = CURRENCIES.find(c => c.code === alertTarget);

  return (
    <section className={`${styles.card} glass`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Bell size={18} className={styles.icon} />
          <h2 className={styles.title}>汇率变动提醒</h2>
        </div>
        <button 
          className={styles.addBtn} 
          onClick={() => {
            setAlertBase(baseCurrency);
            setAlertTarget(targetCurrency);
            // Default current rate as helper starting value
            if (rates && rates.base === baseCurrency && rates.rates[targetCurrency]) {
              setTargetVal(rates.rates[targetCurrency].toFixed(4));
            } else {
              setTargetVal('');
            }
            setIsAlertModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>创建提醒</span>
        </button>
      </div>

      {/* Permission request header */}
      {notifyPermission !== 'granted' && (
        <div className={styles.permissionBar}>
          <AlertTriangle size={16} className={styles.alertIcon} />
          <div className={styles.permissionText}>
            <p className={styles.permissionTitle}>允许推送通知以接收即时提醒</p>
            <p className={styles.permissionDesc}>我们会在汇率达到您的目标数值时，通过系统通知弹窗提醒您。</p>
          </div>
          <button className={styles.permissionBtn} onClick={requestPermission}>
            去允许
          </button>
        </div>
      )}

      {/* Active Alerts List */}
      {alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <BellOff size={32} className={styles.emptyIcon} />
          <p>暂无有效的提醒规则</p>
          <span className={styles.emptyHint}>设置提醒后，系统将在后台自动监测，触发时会产生系统弹窗通知。</span>
        </div>
      ) : (
        <div className={styles.list}>
          {alerts.map((alert) => {
            const bInfo = CURRENCIES.find(c => c.code === alert.base);
            const tInfo = CURRENCIES.find(c => c.code === alert.target);
            
            return (
              <div key={alert.id} className={`${styles.item} ${!alert.active ? styles.disabledItem : ''}`}>
                <div className={styles.itemMain}>
                  <div className={styles.currencies}>
                    <span>{bInfo?.flag} {alert.base}</span>
                    <span className={styles.arrow}>➔</span>
                    <span>{tInfo?.flag} {alert.target}</span>
                  </div>
                  <div className={styles.condition}>
                    当汇率 {alert.condition === 'above' ? '高于' : '低于'}{' '}
                    <span className={styles.targetVal}>{alert.value.toFixed(4)}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button 
                    className={`${styles.actionBtn} ${styles.toggleBtn}`}
                    onClick={() => toggleAlert(alert.id)}
                    title={alert.active ? '暂停提醒' : '开启提醒'}
                    aria-label={alert.active ? '暂停提醒' : '开启提醒'}
                  >
                    {alert.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button 
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => deleteAlert(alert.id)}
                    title="删除提醒"
                    aria-label="删除提醒"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Creator Modal */}
      {isAlertModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAlertModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🔔 新建汇率提醒</h3>
              <button className={styles.modalClose} onClick={() => setIsAlertModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className={styles.form}>
              {/* Target Currency Selectors */}
              <div className={styles.selectorRow}>
                <div className={styles.selectGroup}>
                  <label className={styles.selectLabel}>基准货币</label>
                  <button 
                    type="button" 
                    className={styles.currencyBtn}
                    onClick={() => setActiveSelect('base')}
                  >
                    <span>{baseInfo?.flag} {alertBase}</span>
                  </button>
                </div>
                <span className={styles.formArrow}>➔</span>
                <div className={styles.selectGroup}>
                  <label className={styles.selectLabel}>目标货币</label>
                  <button 
                    type="button" 
                    className={styles.currencyBtn}
                    onClick={() => setActiveSelect('target')}
                  >
                    <span>{targetInfo?.flag} {alertTarget}</span>
                  </button>
                </div>
              </div>

              {/* Condition Choice */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>提醒条件</label>
                <div className={styles.radioGroup}>
                  <label className={`${styles.radioLabel} ${condition === 'above' ? styles.activeRadio : ''}`}>
                    <input
                      type="radio"
                      name="condition"
                      value="above"
                      checked={condition === 'above'}
                      onChange={() => setCondition('above')}
                      className={styles.radioInput}
                    />
                    <span>高于或等于 (≥)</span>
                  </label>
                  <label className={`${styles.radioLabel} ${condition === 'below' ? styles.activeRadio : ''}`}>
                    <input
                      type="radio"
                      name="condition"
                      value="below"
                      checked={condition === 'below'}
                      onChange={() => setCondition('below')}
                      className={styles.radioInput}
                    />
                    <span>低于或等于 (≤)</span>
                  </label>
                </div>
              </div>

              {/* Target Rate input */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="target-rate-input">目标汇率数值</label>
                <input
                  id="target-rate-input"
                  type="number"
                  step="0.0001"
                  required
                  placeholder="输入目标汇率数值"
                  className={styles.rateInput}
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAlertModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className={styles.submitBtn}>
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Modals */}
      <SelectorModal
        isOpen={activeSelect === 'base'}
        onClose={() => setActiveSelect(null)}
        onSelect={(code) => setAlertBase(code)}
        selectedCode={alertBase}
        title="选择基准货币"
      />
      <SelectorModal
        isOpen={activeSelect === 'target'}
        onClose={() => setActiveSelect(null)}
        onSelect={(code) => setAlertTarget(code)}
        selectedCode={alertTarget}
        title="选择目标货币"
      />
    </section>
  );
};
export default AlertsPanel;
