/* ============================================
   NextGen Travel — Travel Extras
   Insurance, airport transfers, visa services
   ============================================ */

const TRAVEL_EXTRAS = {
  insurance: [
    { id: 'basic', name: 'Basic Coverage', price: 49, desc: 'Medical & baggage protection', icon: 'bi-shield-check' },
    { id: 'premium', name: 'Premium Coverage', price: 99, desc: 'Medical, baggage, trip cancellation', icon: 'bi-shield-fill-check' },
    { id: 'comprehensive', name: 'Comprehensive', price: 149, desc: 'Full coverage including adventure sports & COVID-19', icon: 'bi-shield-plus' }
  ],
  transfers: [
    { id: 'shared', name: 'Shared Shuttle', price: 25, desc: 'Economy shared airport transfer', icon: 'bi-bus-front' },
    { id: 'private', name: 'Private Car', price: 89, desc: 'Private luxury sedan', icon: 'bi-car-front' },
    { id: 'premium', name: 'Premium SUV', price: 149, desc: 'Premium SUV with welcome amenity', icon: 'bi-truck' }
  ],
  visa: [
    { id: 'standard', name: 'Standard Processing', price: 79, desc: '5-7 business days', icon: 'bi-file-earmark-text' },
    { id: 'express', name: 'Express Processing', price: 149, desc: '2-3 business days', icon: 'bi-file-earmark-check' },
    { id: 'concierge', name: 'Concierge Service', price: 299, desc: 'Full concierge visa handling', icon: 'bi-person-badge' }
  ],
  experience: [
    { id: 'photography', name: 'Private Photographer', price: 199, desc: 'Professional photoshoot at destination', icon: 'bi-camera' },
    { id: 'guide', name: 'Personal Guide', price: 149, desc: 'Dedicated local guide for your stay', icon: 'bi-compass' },
    { id: 'spa', name: 'Spa Package', price: 129, desc: 'Couples spa treatment', icon: 'bi-flower1' }
  ]
};

const EXTRAS = {
  getAll() {
    const all = [];
    Object.entries(TRAVEL_EXTRAS).forEach(([cat, items]) => {
      items.forEach(item => all.push({ ...item, category: cat }));
    });
    return all;
  },

  getByCategory(cat) {
    return TRAVEL_EXTRAS[cat] || [];
  },

  getPrice(id) {
    for (const cat of Object.values(TRAVEL_EXTRAS)) {
      const found = cat.find(item => item.id === id);
      if (found) return found.price;
    }
    return 0;
  },

  getName(id) {
    for (const cat of Object.values(TRAVEL_EXTRAS)) {
      const found = cat.find(item => item.id === id);
      if (found) return found.name;
    }
    return id;
  },

  calcTotal(selected) {
    if (!selected || !Array.isArray(selected)) return 0;
    return selected.reduce((sum, id) => sum + EXTRAS.getPrice(id), 0);
  },

  calcPerPersonTotal(selected) {
    return selected.filter(id => {
      for (const cat of Object.values(TRAVEL_EXTRAS)) {
        const found = cat.find(item => item.id === id);
        if (found) return true;
      }
      return false;
    }).reduce((sum, id) => sum + EXTRAS.getPrice(id), 0);
  },

  renderCheckboxes(category, selectedIds = []) {
    const items = TRAVEL_EXTRAS[category];
    if (!items) return '';
    return items.map(item => `
      <div class="extra-option" data-category="${category}" data-id="${item.id}" data-price="${item.price}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(0,0,0,0.08);margin-bottom:6px;cursor:pointer;border-radius:6px;transition:all 0.2s;${selectedIds.includes(item.id) ? 'border-color:#000;background:#f8f8f8;' : ''}">
        <input type="${category === 'insurance' ? 'radio' : 'checkbox'}" name="extra_${category}" value="${item.id}" ${selectedIds.includes(item.id) ? 'checked' : ''} style="flex-shrink:0;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.85rem;font-weight:600;">${item.name}</div>
          <div style="font-size:0.75rem;color:#888;">${item.desc}</div>
        </div>
        <div style="font-size:0.9rem;font-weight:600;white-space:nowrap;">$${item.price}</div>
      </div>
    `).join('');
  },

  renderSummary(selected) {
    if (!selected || selected.length === 0) return '<div class="text-muted small">No extras selected</div>';
    return selected.map(id => {
      const name = EXTRAS.getName(id);
      const price = EXTRAS.getPrice(id);
      return `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:2px 0;">
        <span>${name}</span>
        <span>$${price}</span>
      </div>`;
    }).join('');
  },

  getSelectedFromDOM() {
    const selected = [];
    ['insurance', 'transfers', 'visa', 'experience'].forEach(cat => {
      if (cat === 'insurance') {
        const checked = document.querySelector(`input[name="extra_${cat}"]:checked`);
        if (checked) selected.push(checked.value);
      } else {
        document.querySelectorAll(`input[name="extra_${cat}"]:checked`).forEach(el => {
          selected.push(el.value);
        });
      }
    });
    return selected;
  }
};
