export interface CurrencyInfo {
  code: string;
  name: string;
  country: string;
  flag: string;
  pinyin: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'CNY', name: '人民币', country: '中国', flag: '🇨🇳', pinyin: 'renminbi rmb zg zhongguo' },
  { code: 'USD', name: '美元', country: '美国', flag: '🇺🇸', pinyin: 'meiyuan mg meiguo' },
  { code: 'EUR', name: '欧元', country: '欧元区', flag: '🇪🇺', pinyin: 'ouyuan oy oumeng' },
  { code: 'JPY', name: '日元', country: '日本', flag: '🇯🇵', pinyin: 'riyuan rb riben' },
  { code: 'GBP', name: '英镑', country: '英国', flag: '🇬🇧', pinyin: 'yingbang yg yingguo' },
  { code: 'AUD', name: '澳元', country: '澳大利亚', flag: '🇦🇺', pinyin: 'aoyuan aodaliya adly' },
  { code: 'CAD', name: '加元', country: '加拿大', flag: '🇨🇦', pinyin: 'jiayuan jianada jnd' },
  { code: 'CHF', name: '瑞郎', country: '瑞士', flag: '🇨🇭', pinyin: 'ruilang ruishi rs' },
  { code: 'HKD', name: '港币', country: '中国香港', flag: '🇭🇰', pinyin: 'gangbi xg xianggang' },
  { code: 'NZD', name: '纽币', country: '新西兰', flag: '🇳🇿', pinyin: 'niubi xinxilan xxl' },
  { code: 'SGD', name: '新加坡元', country: '新加坡', flag: '🇸🇬', pinyin: 'xinjiapoyuan xjp' },
  { code: 'KRW', name: '韩元', country: '韩国', flag: '🇰🇷', pinyin: 'hanyuan hg hanguo' },
  { code: 'THB', name: '泰铢', country: '泰国', flag: '🇹🇭', pinyin: 'taizhu tg taiguo' },
  { code: 'RUB', name: '卢布', country: '俄罗斯', flag: '🇷🇺', pinyin: 'lubu els eluosi' },
  { code: 'INR', name: '卢比', country: '印度', flag: '🇮🇳', pinyin: 'lubi yd yindu' },
  { code: 'MOP', name: '澳门币', country: '中国澳门', flag: '🇲🇴', pinyin: 'aomenbi am aomen' },
  { code: 'TWD', name: '新台币', country: '中国台湾', flag: '🇹🇼', pinyin: 'xintaibi tw taiwan' },
  { code: 'MYR', name: '林吉特', country: '马来西亚', flag: '🇲🇾', pinyin: 'linjite mlxy malaixiya' },
  { code: 'IDR', name: '印尼盾', country: '印度尼西亚', flag: '🇮🇩', pinyin: 'yinnidun yndny yindunixiya' },
  { code: 'PHP', name: '比索', country: '菲律宾', flag: '🇵🇭', pinyin: 'bisuo flb feilvbin' },
  { code: 'AED', name: '迪拉姆', country: '阿联酋', flag: '🇦🇪', pinyin: 'dilamu alq alianqiu' },
  { code: 'SAR', name: '里亚尔', country: '沙特阿拉伯', flag: '🇸🇦', pinyin: 'liyashi st shate' },
  { code: 'SEK', name: '克朗', country: '瑞典', flag: '🇸🇪', pinyin: 'kelang ruidian rd' },
  { code: 'DKK', name: '丹麦克朗', country: '丹麦', flag: '🇩🇰', pinyin: 'danmaikelang dm danmai' },
  { code: 'NOK', name: '挪威克朗', country: '挪威', flag: '🇳🇴', pinyin: 'nuoweikelang nw nuowei' },
  { code: 'TRY', name: '土耳其里拉', country: '土耳其', flag: '🇹🇷', pinyin: 'tuerqilila teq tuerqi' },
  { code: 'MXN', name: '墨西哥比索', country: '墨西哥', flag: '🇲🇽', pinyin: 'moxigebisuo mxg moxige' },
  { code: 'BRL', name: '雷亚尔', country: '巴西', flag: '🇧🇷', pinyin: 'leiyaer bx baxi' },
  { code: 'ZAR', name: '兰特', country: '南非', flag: '🇿🇦', pinyin: 'lante nf nanfei' },
  { code: 'VND', name: '越南盾', country: '越南', flag: '🇻🇳', pinyin: 'yuenandun yn yuenan' },
  { code: 'EGP', name: '埃及镑', country: '埃及', flag: '🇪🇬', pinyin: 'aijibang aj aiji' },
  { code: 'PLN', name: '兹罗提', country: '波兰', flag: '🇵🇱', pinyin: 'ziluti bl bolan' },
  { code: 'ILS', name: '谢克尔', country: '以色列', flag: '🇮🇱', pinyin: 'xiekeer ysilei ysl' },
  { code: 'ARS', name: '阿根廷比索', country: '阿根廷', flag: '🇦🇷', pinyin: 'agentingbisuo agt agenting' },
  { code: 'CLP', name: '智利比索', country: '智利', flag: '🇨🇱', pinyin: 'zhibisuo zl zhili' },
  { code: 'COP', name: '哥伦比亚比索', country: '哥伦比亚', flag: '🇨🇴', pinyin: 'gelunbiyabisuo glby gelunbiya' },
  { code: 'KWD', name: '科威特第纳尔', country: '科威特', flag: '🇰🇼', pinyin: 'keweitedinaer kwt keweite' },
  { code: 'QAR', name: '卡塔尔里亚尔', country: '卡塔尔', flag: '🇶🇦', pinyin: 'kataerliyashi kte kataer' },
  { code: 'OMR', name: '阿曼里亚尔', country: '阿曼', flag: '🇴🇲', pinyin: 'amanliyashi am aman' },
  { code: 'BHD', name: '巴林第纳尔', country: '巴林', flag: '🇧🇭', pinyin: 'balindinaer bl balin' },
  { code: 'CZK', name: '捷克克朗', country: '捷克', flag: '🇨🇿', pinyin: 'jiekekelang jk jieke' },
  { code: 'HUF', name: '福林', country: '匈牙利', flag: '🇭🇺', pinyin: 'fulin xyl xiongyali' },
  { code: 'RON', name: '列伊', country: '罗马尼亚', flag: '🇷🇴', pinyin: 'lieyi lmny luomaniya' },
  { code: 'BGN', name: '列弗', country: '保加利亚', flag: '🇧🇬', pinyin: 'liefu bjly baojialiya' },
  { code: 'HRK', name: '库纳', country: '克罗地亚', flag: '🇭🇷', pinyin: 'kuna kldy keloudiya' },
  { code: 'UAH', name: '格里夫纳', country: '乌克兰', flag: '🇺🇦', pinyin: 'gelifuna wkl wkelan' },
  { code: 'KZT', name: '坚戈', country: '哈萨克斯坦', flag: '🇰🇿', pinyin: 'jiange hsksd hasakesitan' },
  { code: 'PEN', name: '索尔', country: '秘鲁', flag: '🇵🇪', pinyin: 'suoer ml milu' },
  { code: 'UYU', name: '乌拉圭比索', country: '乌拉圭', flag: '🇺🇾', pinyin: 'wulaguibisuo wlg wulagui' }
];

export const searchCurrencies = (query: string): CurrencyInfo[] => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return CURRENCIES;

  return CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(cleanQuery) ||
    c.name.toLowerCase().includes(cleanQuery) ||
    c.country.toLowerCase().includes(cleanQuery) ||
    c.pinyin.toLowerCase().includes(cleanQuery)
  );
};
