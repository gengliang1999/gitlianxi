import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Search, Star, X, Clock } from 'lucide-react';
import { CURRENCIES } from '../../utils/currencies';
import type { CurrencyInfo } from '../../utils/currencies';
import styles from './SelectorModal.module.css';

interface SelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selectedCode: string;
  title: string;
}

export const SelectorModal: React.FC<SelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCode,
  title
}) => {
  const { favorites, recents, toggleFavorite } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recents'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter currencies based on tab and query
  const getFilteredCurrencies = (): CurrencyInfo[] => {
    let list: CurrencyInfo[] = CURRENCIES;

    if (activeTab === 'favorites') {
      list = CURRENCIES.filter(c => favorites.includes(c.code));
    } else if (activeTab === 'recents') {
      list = CURRENCIES.filter(c => recents.includes(c.code))
        // Order by recents occurrence
        .sort((a, b) => recents.indexOf(a.code) - recents.indexOf(b.code));
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.trim().toLowerCase();
    return list.filter(c => 
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.country.toLowerCase().includes(query) ||
      c.pinyin.toLowerCase().includes(query)
    );
  };

  const filtered = getFilteredCurrencies();

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 id="modal-title" className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭选择器">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="搜索货币代码、国家名、中文或拼音..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.clearSearch} onClick={() => setSearchQuery('')} aria-label="清空搜索">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部货币 ({CURRENCIES.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={12} className={styles.tabIcon} />
            常用收藏 ({favorites.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'recents' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('recents')}
          >
            <Clock size={12} className={styles.tabIcon} />
            最近使用 ({recents.length})
          </button>
        </div>

        {/* Currency List */}
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <p>未找到符合要求的货币</p>
              {activeTab === 'favorites' && <p className={styles.emptyHint}>点击星号即可将货币添加到常用收藏</p>}
            </div>
          ) : (
            filtered.map((item) => {
              const isFav = favorites.includes(item.code);
              const isSelected = item.code === selectedCode;
              return (
                <div 
                  key={item.code} 
                  className={`${styles.item} ${isSelected ? styles.selectedItem : ''}`}
                  onClick={() => {
                    onSelect(item.code);
                    onClose();
                  }}
                >
                  <span className={styles.flag} aria-hidden="true">{item.flag}</span>
                  <div className={styles.info}>
                    <div className={styles.codeRow}>
                      <span className={styles.code}>{item.code}</span>
                      <span className={styles.name}>{item.name}</span>
                    </div>
                    <span className={styles.country}>{item.country}</span>
                  </div>
                  
                  <button 
                    className={`${styles.starBtn} ${isFav ? styles.isFav : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.code);
                    }}
                    aria-label={isFav ? `取消收藏 ${item.name}` : `收藏 ${item.name}`}
                  >
                    <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default SelectorModal;
