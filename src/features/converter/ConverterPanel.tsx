import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeftRight, ChevronDown, RefreshCw } from 'lucide-react';
import { SelectorModal } from './SelectorModal';
import { CURRENCIES } from '../../utils/currencies';
import styles from './ConverterPanel.module.css';

export const ConverterPanel: React.FC = () => {
  const {
    baseCurrency,
    targetCurrency,
    amount,
    rates,
    loading,
    error,
    setBaseCurrency,
    setTargetCurrency,
    setAmount,
    swapCurrencies,
    fetchRates,
    favorites,
    addHistoryRecord,
    markupType,
    customMarkup,
    setMarkupType,
    setCustomMarkup
  } = useAppStore();

  const [activeModal, setActiveModal] = useState<'base' | 'target' | null>(null);
  const [rotated, setRotated] = useState(false);
  const [rawInput, setRawInput] = useState(amount.toString());

  useEffect(() => {
    fetchRates();
  }, []);

  // Sync state amount with input string
  useEffect(() => {
    setRawInput(amount.toString());
  }, [amount]);

  // Compute markup multiplier
  const getMarkupMultiplier = (): number => {
    if (markupType === 'card') return 1.015; // 1.5%
    if (markupType === 'cash') return 1.025; // 2.5%
    if (markupType === 'custom') return 1 + (customMarkup / 100);
    return 1.0;
  };

  // Compute calculated target value
  const getExchangeResult = (): string => {
    if (!rates || !rates.rates[targetCurrency]) return '---';
    const rate = rates.rates[targetCurrency];
    const multiplier = getMarkupMultiplier();
    const result = amount * rate * multiplier;
    
    // Format output
    return result.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  const getSingleRateText = (): string => {
    if (!rates || !rates.rates[targetCurrency]) return '';
    const rate = rates.rates[targetCurrency];
    const multiplier = getMarkupMultiplier();
    const finalRate = rate * multiplier;
    if (multiplier === 1.0) {
      return `1 ${baseCurrency} = ${rate.toFixed(4)} ${targetCurrency}`;
    }
    return `实际汇率: ${finalRate.toFixed(4)} (含 ${
      markupType === 'card' ? '1.5% 刷卡费' : markupType === 'cash' ? '2.5% 现钞费' : `${customMarkup}% 手续费`
    })`;
  };

  const handleAmountChange = (val: string) => {
    setRawInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
    } else if (val === '') {
      setAmount(0);
    }
  };

  const handleSwap = () => {
    setRotated(!rotated);
    swapCurrencies();
  };

  // Quick select target currency from favorites list
  const selectQuickTarget = (code: string) => {
    if (code === baseCurrency) {
      swapCurrencies();
    } else {
      setTargetCurrency(code);
    }
  };

  // Save current conversion to IndexedDB history
  const handleSaveToHistory = async () => {
    if (!rates || !rates.rates[targetCurrency]) return;
    const rate = rates.rates[targetCurrency];
    const multiplier = getMarkupMultiplier();
    const result = amount * rate * multiplier;

    await addHistoryRecord({
      base: baseCurrency,
      target: targetCurrency,
      amount: amount,
      result: result,
      rate: rate * multiplier
    });
  };

  const baseInfo = CURRENCIES.find(c => c.code === baseCurrency);
  const targetInfo = CURRENCIES.find(c => c.code === targetCurrency);

  return (
    <section className={`${styles.panel} glass`}>
      <div className={styles.topRow}>
        <h2 className={styles.sectionTitle}>汇率换算器</h2>
        <button 
          className={`${styles.refreshBtn} ${loading ? styles.loading : ''}`} 
          onClick={() => fetchRates(true)} 
          disabled={loading}
          aria-label="刷新汇率数据"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.converterGrid}>
        {/* Source Currency */}
        <div className={styles.inputCard}>
          <label className={styles.label} htmlFor="amount-input">源货币金额</label>
          <div className={styles.inputRow}>
            <button 
              className={styles.currencySelect} 
              onClick={() => setActiveModal('base')}
              aria-label={`选择源货币, 当前选择为 ${baseInfo?.name || baseCurrency}`}
            >
              <span className={styles.flag}>{baseInfo?.flag}</span>
              <span className={styles.code}>{baseCurrency}</span>
              <ChevronDown size={14} className={styles.chevron} />
            </button>
            <input
              id="amount-input"
              type="number"
              inputMode="decimal"
              className={styles.amountInput}
              value={rawInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="输入金额"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className={styles.swapWrapper}>
          <button 
            className={`${styles.swapButton} ${rotated ? styles.rotated : ''}`} 
            onClick={handleSwap}
            aria-label="交换源货币和目标货币"
          >
            <ArrowLeftRight size={20} />
          </button>
        </div>

        {/* Target Currency */}
        <div className={styles.inputCard}>
          <label className={styles.label}>目标货币换算</label>
          <div className={styles.inputRow}>
            <button 
              className={styles.currencySelect} 
              onClick={() => setActiveModal('target')}
              aria-label={`选择目标货币, 当前选择为 ${targetInfo?.name || targetCurrency}`}
            >
              <span className={styles.flag}>{targetInfo?.flag}</span>
              <span className={styles.code}>{targetCurrency}</span>
              <ChevronDown size={14} className={styles.chevron} />
            </button>
            <div className={styles.resultValue}>{getExchangeResult()}</div>
          </div>
        </div>
      </div>

      {/* Markup settings row */}
      <div className={styles.markupRow}>
        <span className={styles.markupLabel}>加点/通道:</span>
        <div className={styles.markupControls}>
          <select
            className={styles.markupSelect}
            value={markupType}
            onChange={(e) => setMarkupType(e.target.value as any)}
            aria-label="选择换算手续费加点"
          >
            <option value="none">官方中间价 (0%)</option>
            <option value="card">境外刷卡支付 (+1.5%)</option>
            <option value="cash">银行现金兑换 (+2.5%)</option>
            <option value="custom">自定义比例...</option>
          </select>
          {markupType === 'custom' && (
            <div className={styles.customMarkupInputWrapper}>
              <input
                type="number"
                step="0.05"
                min="0"
                max="50"
                className={styles.customMarkupInput}
                value={customMarkup}
                onChange={(e) => setCustomMarkup(parseFloat(e.target.value) || 0)}
                aria-label="自定义百分比"
              />
              <span className={styles.percentSymbol}>%</span>
            </div>
          )}
        </div>
      </div>

      {/* Info and Save Button */}
      <div className={styles.actionRow}>
        <div className={styles.rateDisplay}>
          {rates && <span className={styles.singleRate}>{getSingleRateText()}</span>}
        </div>
        <button 
          className={styles.saveBtn} 
          onClick={handleSaveToHistory}
          disabled={!rates || amount <= 0}
          aria-label="保存此换算记录"
        >
          保存记录
        </button>
      </div>

      {/* Favorites shortcuts */}
      <div className={styles.favoritesShortcuts}>
        <h3 className={styles.shortcutsTitle}>常用快捷对比</h3>
        <div className={styles.shortcutsList}>
          {CURRENCIES.filter(c => favorites.includes(c.code)).map(c => {
            const isBase = c.code === baseCurrency;
            const isTarget = c.code === targetCurrency;
            
            // Calculate relative rate for pill display
            let relativeRateText = '';
            if (rates && rates.rates[c.code]) {
              const rate = rates.rates[c.code];
              relativeRateText = rate.toFixed(2);
            }

            return (
              <button
                key={c.code}
                className={`${styles.shortcutPill} ${isTarget ? styles.activeTarget : ''} ${isBase ? styles.disabledPill : ''}`}
                disabled={isBase}
                onClick={() => selectQuickTarget(c.code)}
                aria-label={`将目标货币设置为 ${c.name}`}
              >
                <span className={styles.shortcutFlag}>{c.flag}</span>
                <span className={styles.shortcutCode}>{c.code}</span>
                {relativeRateText && <span className={styles.shortcutRate}>{relativeRateText}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <SelectorModal
        isOpen={activeModal === 'base'}
        onClose={() => setActiveModal(null)}
        onSelect={(code) => setBaseCurrency(code)}
        selectedCode={baseCurrency}
        title="选择源货币"
      />
      <SelectorModal
        isOpen={activeModal === 'target'}
        onClose={() => setActiveModal(null)}
        onSelect={(code) => setTargetCurrency(code)}
        selectedCode={targetCurrency}
        title="选择目标货币"
      />
    </section>
  );
};
export default ConverterPanel;
