import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { aggregator } from '../../services/aggregator';
import { Line } from 'react-chartjs-2';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { SelectorModal } from '../converter/SelectorModal';
import { CURRENCIES } from '../../utils/currencies';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import styles from './HistoricalChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const HistoricalChart: React.FC = () => {
  const { baseCurrency, targetCurrency, theme } = useAppStore();
  const [range, setRange] = useState<'1D' | '1M' | '1Y' | '5Y'>('1M');
  
  // Historical data state for main target
  const [mainData, setMainData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moving Average Toggles
  const [showMA5, setShowMA5] = useState(false);
  const [showMA10, setShowMA10] = useState(false);

  // Multi-currency comparison states
  const [comparisonCurrencies, setComparisonCurrencies] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<{ [code: string]: { date: string; value: number }[] }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Colors for comparison lines
  const colors = [
    { primary: 'rgba(255, 99, 132, 1)', fill: 'rgba(255, 99, 132, 0.05)' },
    { primary: 'rgba(54, 162, 235, 1)', fill: 'rgba(54, 162, 235, 0.05)' },
    { primary: 'rgba(255, 206, 86, 1)', fill: 'rgba(255, 206, 86, 0.05)' },
    { primary: 'rgba(75, 192, 192, 1)', fill: 'rgba(75, 192, 192, 0.05)' },
    { primary: 'rgba(153, 102, 255, 1)', fill: 'rgba(153, 102, 255, 0.05)' }
  ];

  // Fetch primary historical data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aggregator.getHistoricalRates(baseCurrency, targetCurrency, range);
      setMainData(data);

      // Refresh existing comparison data too
      const updatedComparison: typeof comparisonData = {};
      for (const code of comparisonCurrencies) {
        const hist = await aggregator.getHistoricalRates(baseCurrency, code, range);
        updatedComparison[code] = hist;
      }
      setComparisonData(updatedComparison);
    } catch (err: any) {
      setError(err.message || '获取历史汇率失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [baseCurrency, targetCurrency, range, comparisonCurrencies]);

  // Compute Moving Averages
  const ma5Data = useMemo(() => {
    if (mainData.length === 0) return [];
    return mainData.map((_, i) => {
      if (i < 4) return null; // First 4 elements cannot compute MA5
      const sum = mainData.slice(i - 4, i + 1).reduce((acc, curr) => acc + curr.value, 0);
      return sum / 5;
    });
  }, [mainData]);

  const ma10Data = useMemo(() => {
    if (mainData.length === 0) return [];
    return mainData.map((_, i) => {
      if (i < 9) return null; // First 9 elements cannot compute MA10
      const sum = mainData.slice(i - 9, i + 1).reduce((acc, curr) => acc + curr.value, 0);
      return sum / 10;
    });
  }, [mainData]);

  // Add a currency to comparison
  const handleAddComparison = async (code: string) => {
    if (comparisonCurrencies.includes(code)) return;
    if (comparisonCurrencies.length >= 5) {
      alert('最多同时对比 5 种货币');
      return;
    }
    setComparisonCurrencies([...comparisonCurrencies, code]);
  };

  const handleRemoveComparison = (code: string) => {
    setComparisonCurrencies(comparisonCurrencies.filter(c => c !== code));
    const updated = { ...comparisonData };
    delete updated[code];
    setComparisonData(updated);
  };

  // Calculate interval statistics
  const stats = useMemo(() => {
    if (mainData.length === 0) return null;
    const values = mainData.map(d => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const avgVal = values.reduce((sum, v) => sum + v, 0) / mainData.length;

    const maxPoint = mainData.find(d => d.value === maxVal);
    const minPoint = mainData.find(d => d.value === minVal);

    const startVal = mainData[0].value;
    const endVal = mainData[mainData.length - 1].value;
    const change = endVal - startVal;
    const changePercent = (change / startVal) * 100;

    return {
      max: maxVal,
      maxDate: maxPoint ? maxPoint.date : '',
      min: minVal,
      minDate: minPoint ? minPoint.date : '',
      avg: avgVal,
      changePercent,
      change
    };
  }, [mainData]);

  // Compile datasets for ChartJS
  const chartData = useMemo(() => {
    const labels = mainData.map(d => d.date);
    const datasets: any[] = [];

    // Is it dark theme?
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Main target line color
    const mainColor = isDark ? 'rgba(100, 80, 250, 1)' : 'rgba(70, 45, 230, 1)';
    const mainFillColor = isDark ? 'rgba(100, 80, 250, 0.05)' : 'rgba(70, 45, 230, 0.02)';

    // Main currency dataset
    datasets.push({
      label: `${baseCurrency}/${targetCurrency}`,
      data: mainData.map(d => d.value),
      borderColor: mainColor,
      backgroundColor: mainFillColor,
      borderWidth: 2.5,
      pointRadius: mainData.length > 30 ? 0 : 2.5,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.15
    });

    // MA5 dataset
    if (showMA5) {
      datasets.push({
        label: 'MA5',
        data: ma5Data,
        borderColor: 'rgba(239, 68, 68, 0.8)', // Red
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.15
      });
    }

    // MA10 dataset
    if (showMA10) {
      datasets.push({
        label: 'MA10',
        data: ma10Data,
        borderColor: 'rgba(245, 158, 11, 0.8)', // Amber
        borderDash: [3, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.15
      });
    }

    // Comparison datasets
    comparisonCurrencies.forEach((code, index) => {
      const hist = comparisonData[code];
      if (hist && hist.length > 0) {
        const color = colors[index % colors.length];
        datasets.push({
          label: `${baseCurrency}/${code}`,
          data: hist.map(h => h.value),
          borderColor: color.primary,
          backgroundColor: color.fill,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.15
        });
      }
    });

    return { labels, datasets };
  }, [mainData, ma5Data, ma10Data, showMA5, showMA10, comparisonCurrencies, comparisonData, theme]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#eee' : '#333',
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: theme === 'dark' ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme === 'dark' ? '#fff' : '#111',
        bodyColor: theme === 'dark' ? '#ccc' : '#444',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        titleFont: { family: 'Outfit', weight: 'bold' },
        bodyFont: { family: 'Outfit' },
        padding: 12,
        callbacks: {
          title: (context) => {
            return `日期: ${context[0].label}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            return `  ${label}: ${typeof val === 'number' ? val.toFixed(4) : ''}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: theme === 'dark' ? '#888' : '#777',
          font: { family: 'Outfit', size: 10 },
          maxTicksLimit: range === '5Y' ? 10 : 8
        }
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'
        },
        ticks: {
          color: theme === 'dark' ? '#888' : '#777',
          font: { family: 'Outfit', size: 10 }
        }
      }
    }
  };

  const generateTrendReport = () => {
    if (!stats || mainData.length === 0) return '';
    const baseInfo = CURRENCIES.find(c => c.code === baseCurrency);
    const targetInfo = CURRENCIES.find(c => c.code === targetCurrency);
    const baseName = baseInfo?.name || baseCurrency;
    const targetName = targetInfo?.name || targetCurrency;

    let rangeText = '';
    if (range === '1D') rangeText = '最近24小时';
    else if (range === '1M') rangeText = '最近30天';
    else if (range === '1Y') rangeText = '最近1年';
    else rangeText = '最近5年';

    const netTrend = stats.change >= 0 
      ? `汇率呈现上涨走势，${baseName} 对 ${targetName} 升值约 ${stats.changePercent.toFixed(2)}%`
      : `汇率呈现下跌走势，${baseName} 对 ${targetName} 贬值约 ${Math.abs(stats.changePercent).toFixed(2)}%`;

    // Calculate MA trend
    let maSignal = '';
    const validMA5 = ma5Data.filter(v => v !== null) as number[];
    const validMA10 = ma10Data.filter(v => v !== null) as number[];
    if (validMA5.length > 0 && validMA10.length > 0) {
      const currentMA5 = validMA5[validMA5.length - 1];
      const currentMA10 = validMA10[validMA10.length - 1];
      if (currentMA5 > currentMA10) {
        maSignal = `。从均线技术面看，5日短均线 (${currentMA5.toFixed(4)}) 处于 10日长均线 (${currentMA10.toFixed(4)}) 上方，处于【金叉向上】状态，表明短期买方动能占优，汇率偏强`;
      } else {
        maSignal = `。从均线技术面看，5日短均线 (${currentMA5.toFixed(4)}) 运行在 10日长均线 (${currentMA10.toFixed(4)}) 下方，处于【死叉向下】状态，表明短期面临阻力回调，汇率偏弱`;
      }
    }

    return `行情分析：在${rangeText}统计区间内，${baseName}/${targetName} 汇率最低触及 ${stats.min.toFixed(4)}（时间: ${stats.minDate}），最高达到 ${stats.max.toFixed(4)}（时间: ${stats.maxDate}），区间均价约为 ${stats.avg.toFixed(4)}。在此期间，${netTrend}${maSignal}。特别提醒：此处汇率均来自权威市场中间价，不包含银行结汇手续点差，仅供参考。`;
  };

  return (
    <section className={`${styles.card} glass`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>汇率走势图分析</h2>
          <p className={styles.subtitle}>对比基准货币: <span className={styles.bold}>{baseCurrency}</span></p>
        </div>

        {/* Range selectors */}
        <div className={styles.rangeSelector}>
          {([
            { key: '1D', label: '24小时' },
            { key: '1M', label: '30天' },
            { key: '1Y', label: '1年' },
            { key: '5Y', label: '5年' }
          ] as const).map(r => (
            <button
              key={r.key}
              className={`${styles.rangeBtn} ${range === r.key ? styles.activeRange : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Bar */}
      {stats && (
        <div className={styles.statsBar}>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>最高值</span>
            <div className={styles.statsValue}>{stats.max.toFixed(4)}</div>
            <span className={styles.statsDate}>{stats.maxDate}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>最低值</span>
            <div className={styles.statsValue}>{stats.min.toFixed(4)}</div>
            <span className={styles.statsDate}>{stats.minDate}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>平均值</span>
            <div className={styles.statsValue}>{stats.avg.toFixed(4)}</div>
            <span className={styles.statsDate}>区间均价</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>区间涨跌</span>
            <div className={`${styles.statsValue} ${stats.change >= 0 ? styles.up : styles.down}`}>
              {stats.change >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
            </div>
            <span className={styles.statsDate}>
              {stats.change >= 0 ? '▲ 升值' : '▼ 贬值'}
            </span>
          </div>
        </div>
      )}

      {loading && <div className={styles.loadingOverlay}>数据加载中...</div>}
      {error && <div className={styles.errorText}>{error}</div>}

      {/* Moving Average Indicators Toggle */}
      <div className={styles.controlRow}>
        <div className={styles.maToggleGroup}>
          <button
            className={`${styles.controlBtn} ${showMA5 ? styles.activeControl : ''}`}
            onClick={() => setShowMA5(!showMA5)}
          >
            {showMA5 ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>MA5 (5日均线)</span>
          </button>
          <button
            className={`${styles.controlBtn} ${showMA10 ? styles.activeControl : ''}`}
            onClick={() => setShowMA10(!showMA10)}
          >
            {showMA10 ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>MA10 (10日均线)</span>
          </button>
        </div>

        {/* Add comparison overlay button */}
        <button className={styles.addCompareBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={14} />
          <span>对比其他货币</span>
        </button>
      </div>

      {/* Comparison badge list */}
      {comparisonCurrencies.length > 0 && (
        <div className={styles.comparisonList}>
          {comparisonCurrencies.map((code, index) => {
            const info = CURRENCIES.find(c => c.code === code);
            const color = colors[index % colors.length];
            return (
              <span 
                key={code} 
                className={styles.compareBadge}
                style={{ borderLeftColor: color.primary }}
              >
                <span>{info?.flag} {code}</span>
                <button 
                  className={styles.removeCompare} 
                  onClick={() => handleRemoveComparison(code)}
                  aria-label={`移除对比货币 ${code}`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className={styles.chartContainer}>
        {mainData.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className={styles.emptyChart}>无历史汇率数据，请稍后刷新重试</div>
        )}
      </div>

      {/* Trend Report */}
      {stats && (
        <div className={styles.trendReportCard}>
          <h4 className={styles.reportTitle}>📈 汇率走势深度解读 (行情解读)</h4>
          <p className={styles.reportContent}>{generateTrendReport()}</p>
        </div>
      )}

      <SelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAddComparison}
        selectedCode=""
        title="选择要对比的货币"
      />
    </section>
  );
};
export default HistoricalChart;
