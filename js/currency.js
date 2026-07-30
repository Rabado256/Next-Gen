/* ============================================
   NextGen Travel — Currency Converter
   Multi-currency support with live exchange rates
   ============================================ */

const CURRENCY = {
  supported: [
    { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC', locale: 'en-EU', flag: '\uD83C\uDDEA\uD83C\uDDFA' },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3', locale: 'en-GB', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20A6', locale: 'en-NG', flag: '\uD83C\uDDF3\uD83C\uDDEC' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', flag: '\uD83C\uDDF0\uD83C\uDDEA' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH\u20B5', locale: 'en-GH', flag: '\uD83C\uDDEC\uD83C\uDDED' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', flag: '\uD83C\uDFFF\uD83C\uDDE6' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', locale: 'en-MA', flag: '\uD83C\uDDF2\uD83C\uDDE6' }
  ],

  _rates: null,
  _lastFetch: 0,
  _cacheTTL: 3600000,
  _listeners: [],

  get selected() {
    return localStorage.getItem('nextgen_currency') || 'USD';
  },

  set selected(code) {
    if (this.supported.some(c => c.code === code)) {
      localStorage.setItem('nextgen_currency', code);
      this._listeners.forEach(fn => fn(code));
    }
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  getSymbol(code) {
    const c = this.supported.find(c => c.code === code);
    return c ? c.symbol : '$';
  },

  async getRates() {
    const now = Date.now();
    if (this._rates && now - this._lastFetch < this._cacheTTL) return this._rates;
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      this._rates = { ...data.rates, USD: 1 };
      this._lastFetch = now;
      return this._rates;
    } catch {
      if (this._rates) return this._rates;
      return { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1540, KES: 145, GHS: 12.5, ZAR: 18.6, MAD: 10.1 };
    }
  },

  async convert(usdAmount) {
    const target = this.selected;
    if (target === 'USD' || !usdAmount) return parseFloat(usdAmount) || 0;
    const rates = await this.getRates();
    const rate = rates[target] || 1;
    return (parseFloat(usdAmount) || 0) * rate;
  },

  async format(usdAmount, decimals) {
    const target = this.selected;
    const converted = await this.convert(usdAmount);
    const symbol = this.getSymbol(target);
    const dec = decimals !== undefined ? decimals : (target === 'NGN' || target === 'KES' || target === 'GHS' ? 0 : 2);
    const formatted = converted.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return symbol === 'KSh' ? `KSh ${formatted}` : symbol === 'MAD' ? `${formatted} MAD` : symbol === 'GH\u20B5' ? `GH\u20B5 ${formatted}` : `${symbol}${formatted}`;
  },

  updateDisplay() {
    document.querySelectorAll('[data-usd]').forEach(async el => {
      const usd = parseFloat(el.dataset.usd);
      el.textContent = await this.format(usd);
    });
  },

  renderSelector() {
    const current = this.selected;
    const sel = this.supported.find(c => c.code === current);
    const container = document.createElement('div');
    container.className = 'dropdown';
    container.style.cssText = 'display:inline-block;';

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm p-1 border-0';
    btn.style.cssText = 'color:inherit;background:transparent;font-size:0.75rem;display:flex;align-items:center;gap:4px;letter-spacing:0.05em;';
    btn.setAttribute('data-bs-toggle', 'dropdown');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `${sel ? sel.flag : ''} <span class="curr-code">${current}</span> <span style="font-size:0.6rem;opacity:0.6;">▾</span>`;

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end rounded-0 border-0 shadow-sm';
    menu.style.cssText = 'min-width:140px;padding:0.25rem;font-size:0.75rem;';

    this.supported.forEach(c => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = `dropdown-item rounded-1 ${c.code === current ? 'active' : ''}`;
      a.href = '#';
      a.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0.3rem 0.6rem;';
      a.innerHTML = `${c.flag} <span>${c.code}</span> <span style="opacity:0.5;margin-left:auto;">${c.symbol}</span>`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.selected = c.code;
        document.querySelectorAll('.curr-code').forEach(el => el.textContent = c.code);
        menu.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
        a.classList.add('active');
        btn.innerHTML = `${c.flag} <span class="curr-code">${c.code}</span> <span style="font-size:0.6rem;opacity:0.6;">▾</span>`;
        this.updateDisplay();
      });
      li.appendChild(a);
      menu.appendChild(li);
    });

    container.appendChild(btn);
    container.appendChild(menu);
    return container;
  }
};
