/* ============================================
   NextGen Travel — Admin Dashboard
   Full CRUD management for destinations,
   bookings, trips, users, contacts, newsletter
   ============================================ */

// Human-readable labels for destination vibe categories
const VIBE_LABELS = { romantic: 'Romantic', adventure: 'Adventure', solo: 'Solo Silence', solitude: 'Solitude', family: 'Family Heritage' };

// Auto-restore admin session on page load
(async () => {
  const token = api.getToken();
  if (token) {
    try {
      const user = JSON.parse(localStorage.getItem('nextgen_user'));
      if (user && user.is_admin) {
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-wrapper').style.display = 'flex';
        loadAllData();
      }
    } catch (_) {
      api.clearToken();
      localStorage.removeItem('nextgen_user');
    }
  }
})();
// Track which destination is being edited (null = new destination)
let editingDestId = null;

// Render flight destination info — tries to extract flight number from special_requests
function renderFlightDest(b) {
  var flightNum = '';
  try {
    var sr = JSON.parse(b.special_requests || '{}');
    flightNum = sr.flight_number || '';
  } catch (_) {}
  var airline = b.dest_id || b.destination_id || 'Flight';
  return escapeHtml(airline) + (flightNum ? ' <span style="color:var(--admin-muted);font-size:0.7rem;">' + escapeHtml(flightNum) + '</span>' : '');
}

// Render hotel destination info — extracts room type and nights from special_requests
function renderHotelDest(b) {
  var info = '';
  try {
    var sr = JSON.parse(b.special_requests || '{}');
    info = (sr.room_type || '') + (sr.nights ? ' • ' + sr.nights + ' night(s)' : '');
  } catch (_) {}
  var name = b.to_location || b.dest_id || b.destination_id || 'Hotel';
  return escapeHtml(name) + (info ? ' <span style="color:var(--admin-muted);font-size:0.7rem;">' + escapeHtml(info) + '</span>' : '');
}

// Render package destination info — extracts duration and hotel from special_requests
function renderPackageDest(b) {
  var info = '';
  try {
    var sr = JSON.parse(b.special_requests || '{}');
    var pieces = [];
    if (sr.duration) pieces.push(sr.duration + ' days');
    if (sr.nights) pieces.push(sr.nights + ' nights');
    if (sr.hotel) pieces.push(sr.hotel);
    info = pieces.join(' • ');
  } catch (_) {}
  var name = b.to_location || b.dest_id || 'Package';
  return escapeHtml(name) + (info ? ' <span style="color:var(--admin-muted);font-size:0.7rem;">' + escapeHtml(info) + '</span>' : '');
}

// Render a document-type badge for a booking based on passport/ID card status
function renderExtrasInfo(b) {
  try {
    var sr = JSON.parse(b.special_requests || '{}');
    if (sr.extras && Array.isArray(sr.extras) && sr.extras.length > 0) {
      return sr.extras.map(function(e) { return e.name || e.id; }).join(', ');
    }
  } catch (_) {}
  return '—';
}

function getDocBadgeForBooking(b) {
  if (b.doc_type === 'flight') return '<span class="status-badge status-confirmed" style="background:rgba(168,85,247,0.15);color:#a855f7;">Flight</span>';
  if (b.doc_type === 'hotel') return '<span class="status-badge status-confirmed" style="background:rgba(6,182,212,0.15);color:#06b6d4;">Hotel</span>';
  if (b.doc_type === 'package') return '<span class="status-badge status-confirmed" style="background:rgba(234,179,8,0.15);color:#eab308;">Package</span>';
  var pp = b.passport || '';
  var ic = b.identity_card || '';
  if (pp && !ic) return '<span class="status-badge status-confirmed" style="background:rgba(59,130,246,0.15);color:#3b82f6;">Passport</span>';
  if (ic && !pp) return '<span class="status-badge status-confirmed" style="background:rgba(34,197,94,0.15);color:#22c55e;">ID Card</span>';
  if (pp && ic) return '<span class="status-badge status-pending">Both</span>';
  return '<span style="color:var(--admin-muted);font-size:0.75rem;">—</span>';
}

// ==================== AUTHENTICATION ====================

// Admin login form submission
document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('admin-login-error');
  try {
    const data = await api.login(email, password);
    if (!data.user || !data.user.is_admin) {
      errorEl.textContent = 'Admin access required. Your account is not authorized as an admin.';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('admin-wrapper').style.display = 'flex';
    loadAllData();
  } catch (_) {
    errorEl.textContent = 'Invalid credentials. Please try again.';
    errorEl.style.display = 'block';
  }
});

// Admin logout handler
document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
  if (!confirm('Logout of admin sanctuary?')) return;
  api.logout();
  document.getElementById('admin-login-screen').style.display = 'flex';
  document.getElementById('admin-wrapper').style.display = 'none';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-login-error').style.display = 'none';
});

// ==================== SIDEBAR NAVIGATION ====================
document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
  item.addEventListener('click', () => {
    // Close mobile sidebar
    document.getElementById('admin-sidebar').classList.remove('show');
    // Activate clicked nav item
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    // Show the corresponding section
    const section = item.dataset.section;
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    // Update page title
    const titles = { dashboard: 'Dashboard', bookings: 'Bookings', destinations: 'Destinations', trips: 'Trips', users: 'Users', contacts: 'Contact Submissions', newsletter: 'Newsletter', logs: 'Audit Logs', documents: 'Documents' };
    document.getElementById('admin-page-title').textContent = titles[section] || 'Dashboard';
    // Lazy-load section data
    if (section === 'bookings') renderBookings();
    if (section === 'destinations') renderDestinations();
    if (section === 'trips') renderTrips();
    if (section === 'users') renderUsers();
    if (section === 'contacts') renderContacts();
    if (section === 'newsletter') renderNewsletter();
    if (section === 'logs') renderLogs();
    if (section === 'documents') renderDocuments();
  });
});

// Mobile sidebar toggle
document.getElementById('admin-mobile-toggle')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar').classList.toggle('show');
});
document.getElementById('admin-sidebar-close')?.addEventListener('click', () => {
  document.getElementById('admin-sidebar').classList.remove('show');
});

// ==================== OVERLAY / MODAL SYSTEM ====================
function openOverlay(title, bodyHtml) {
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-body').innerHTML = bodyHtml;
  document.getElementById('admin-overlay').classList.add('show');
}
function closeOverlay() {
  document.getElementById('admin-overlay').classList.remove('show');
}
// Close overlay when clicking on backdrop
document.getElementById('admin-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeOverlay();
});

// ==================== TOAST NOTIFICATION SYSTEM ====================
function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  document.getElementById('toast-message').textContent = message;
  toast.className = 'admin-toast show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== DATA LOADING ====================
// Load all sections data in parallel for the dashboard
async function loadAllData() {
  await updateDashboardStats();
  await renderBookings();
  await renderDestinations();
  await renderTrips();
  await renderUsers();
  await renderContacts();
  await renderNewsletter();
  await renderLogs();
  await renderDocuments();
}

// ==================== DASHBOARD SECTION ====================
async function updateDashboardStats() {
  let stats = { total_bookings: 0, total_revenue: 0, total_users: 0, total_reviews: 0, total_contacts: 0, total_newsletter: 0 };
  try {
    stats = await api.getAdminStats();
    document.getElementById('stat-bookings').textContent = stats.total_bookings || 0;
    const revEl = document.getElementById('stat-revenue');
    revEl.textContent = '$' + (stats.total_revenue || 0).toLocaleString();
    revEl.dataset.usd = stats.total_revenue || 0;
    document.getElementById('stat-users').textContent = stats.total_users || 0;
    document.getElementById('stat-reviews').textContent = stats.total_reviews || 0;
    document.getElementById('stat-contacts').textContent = stats.total_contacts || 0;
    document.getElementById('stat-newsletter').textContent = stats.total_newsletter || 0;
    if (typeof CURRENCY !== 'undefined') CURRENCY.updateDisplay();
  } catch (_) {
    // Fallback to localStorage if Supabase is unavailable
    const activities = JSON.parse(localStorage.getItem('nextgen_activities') || '[]');
    const contacts = JSON.parse(localStorage.getItem('nextgen_contacts') || '[]');
    const newsletters = JSON.parse(localStorage.getItem('nextgen_newsletter') || '[]');
    document.getElementById('stat-bookings').textContent = activities.length;
    document.getElementById('stat-users').textContent = 1;
    document.getElementById('stat-contacts').textContent = contacts.length;
    document.getElementById('stat-newsletter').textContent = newsletters.length;
  }

  // Render charts
  renderAdminCharts(stats);

  // Render recent bookings widget
  try {
    const recentBookings = await api.getAdminRecentBookings();
    const recentBody = document.getElementById('dashboard-recent-bookings');
    if (recentBookings.length === 0) {
      recentBody.innerHTML = '<tr class="empty-row"><td colspan="4">No bookings yet</td></tr>';
    } else {
      recentBody.innerHTML = recentBookings.slice(0, 5).map(b => `
        <tr>
          <td style="font-family: monospace; font-size: 0.75rem;">${escapeHtml(b.id || b.ref || '—')}</td>
          <td>${escapeHtml(b.guest_name || b.guestName || 'Guest')}</td>
        <td>${b.doc_type === 'flight' ? renderFlightDest(b) : b.doc_type === 'hotel' ? renderHotelDest(b) : escapeHtml(b.dest_id || b.destination_id || b.dest || '—')}</td>
          <td><span class="status-badge status-${escapeHtml(b.status || 'confirmed')}">${escapeHtml(b.status || 'confirmed')}</span></td>
        </tr>`).join('');
    }
  } catch (_) {
    document.getElementById('dashboard-recent-bookings').innerHTML = '<tr class="empty-row"><td colspan="4">No bookings yet</td></tr>';
  }

  // Render recent contacts widget
  try {
    const recentContacts = await api.getAdminRecentContacts();
    const contactBody = document.getElementById('dashboard-recent-contacts');
    if (recentContacts.length === 0) {
      contactBody.innerHTML = '<tr class="empty-row"><td colspan="4">No messages yet</td></tr>';
    } else {
      contactBody.innerHTML = recentContacts.slice(0, 5).map(c => `
        <tr>
          <td>${escapeHtml(c.name || '—')}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${escapeHtml(c.subject || '—')}</td>
          <td style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(c.created_at || '—')}</td>
        </tr>`).join('');
    }
  } catch (_) {
    document.getElementById('dashboard-recent-contacts').innerHTML = '<tr class="empty-row"><td colspan="4">No messages yet</td></tr>';
  }
}

// ==================== DASHBOARD CHARTS ====================
function renderAdminCharts(stats) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const total = stats.total_bookings || 0;
  const monthly = months.map((_, i) => Math.round(total * (0.04 + 0.08 * (i + 1) / 12)));
  new Chart(document.getElementById('bookings-chart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Bookings',
        data: monthly,
        borderColor: '#d4a373',
        backgroundColor: 'rgba(212,163,115,0.15)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#d4a373'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
  new Chart(document.getElementById('revenue-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Romantic', 'Adventure', 'Solo', 'Solitude', 'Family'],
      datasets: [{
        data: [35, 25, 15, 10, 15],
        backgroundColor: ['#d4a373', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#aaa', font: { size: 9 }, padding: 8, boxWidth: 10 }
        }
      }
    }
  });
}

// ==================== BOOKINGS MANAGEMENT ====================
async function renderBookings() {
  const search = (document.getElementById('bookings-search').value || '').toLowerCase();
  const filter = document.getElementById('bookings-filter-status').value;
  try {
    let bookings = await api.getAllBookings();
    // Apply search filter
    if (search) {
      bookings = bookings.filter(b =>
        (b.id || '').toString().includes(search) ||
        (b.dest_id || b.destination_id || '').toLowerCase().includes(search) ||
        (b.guest_name || '').toLowerCase().includes(search)
      );
    }
    // Apply status filter
    if (filter !== 'all') {
      bookings = bookings.filter(b => (b.status || 'confirmed') === filter);
    }
    document.getElementById('bookings-count').textContent = bookings.length + ' bookings';
    const tbody = document.getElementById('bookings-table-body');
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="11">No bookings found</td></tr>';
      return;
    }
    tbody.innerHTML = bookings.map((b, i) => `
      <tr>
        <td style="font-family: monospace; font-size: 0.75rem;">${escapeHtml(b.id || b.ref || '—')}</td>
        <td>${escapeHtml(b.guest_name || b.guestName || 'Guest')}</td>
        <td>${b.doc_type === 'flight' ? renderFlightDest(b) : b.doc_type === 'hotel' ? renderHotelDest(b) : escapeHtml(b.dest_id || b.destination_id || b.dest || '—')}</td>
        <td>${escapeHtml(b.booking_date || b.created_at || b.date || '—')}</td>
        <td>${escapeHtml(b.guests || '—')}</td>
        <td>$${escapeHtml(b.total || b.total_amount || '—')}</td>
        <td>${getDocBadgeForBooking(b)}</td>
        <td>${(b.hotel_reservation || b.hotel == 1 || b.hotel === 'Yes') ? '<span style="color: var(--admin-success);">Yes</span>' : '—'}</td>
        <td>${escapeHtml(renderExtrasInfo(b))}</td>
        <td>
          <!-- Inline status change dropdown -->
          <select class="status-select" data-id="${escapeHtml(b.id)}" style="background: var(--admin-card); border: 1px solid var(--admin-border); color: white; padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px;">
            <option value="confirmed" ${(b.status || 'confirmed') === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="pending" ${(b.status || 'confirmed') === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="cancelled" ${(b.status || 'confirmed') === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteBooking('${escapeHtml(b.id)}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
    // Attach change handlers to status selects
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async function () {
        try {
          await api.updateBookingStatus(this.dataset.id, this.value);
          showToast('Booking status updated to ' + this.value);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (_) {
    document.getElementById('bookings-table-body').innerHTML = '<tr class="empty-row"><td colspan="10">Could not load bookings</td></tr>';
  }
}

async function deleteBooking(id) {
  if (!confirm('Delete this booking?')) return;
  try {
    await api.deleteBooking(id);
    showToast('Booking deleted');
    renderBookings();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Re-render bookings on search/filter change
document.getElementById('bookings-search')?.addEventListener('input', renderBookings);
document.getElementById('bookings-filter-status')?.addEventListener('change', renderBookings);

// ==================== DESTINATIONS MANAGEMENT ====================
async function renderDestinations() {
  try {
    const dests = await api.getDestinations();
    document.getElementById('dest-count').textContent = dests.length + ' destinations';
    const tbody = document.getElementById('destinations-table-body');
    if (dests.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No destinations yet</td></tr>';
      return;
    }
    tbody.innerHTML = dests.map(d => `
      <tr>
        <td style="font-family: monospace; font-size: 0.75rem;">${escapeHtml(d.id)}</td>
        <td>${escapeHtml(d.title || '—')}</td>
        <td style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(d.edition || '—')}</td>
        <td>$${escapeHtml(d.price || 0)}</td>
        <td>${escapeHtml(VIBE_LABELS[d.vibe] || d.vibe || '—')}</td>
        <td>${(d.steps || []).length} steps</td>
        <td>${d.is_active !== false ? '<span style="color: var(--admin-success);">Active</span>' : '<span style="color: var(--admin-danger);">Inactive</span>'}</td>
        <td>
          <button class="admin-btn admin-btn-accent admin-btn-sm" onclick="editDest('${escapeHtml(d.id)}')"><i class="bi bi-pencil"></i></button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteDest('${escapeHtml(d.id)}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (_) {
    document.getElementById('destinations-table-body').innerHTML = '<tr class="empty-row"><td colspan="8">Could not load destinations</td></tr>';
  }
}

// Open overlay to create a new destination
async function openDestModal() {
  editingDestId = null;
  openOverlay('Add New Destination', getDestFormHtml({ id: '', title: '', edition: '', desc: '', price: '', vibe: 'romantic', img: '', steps: [{ title: '', text: '' }] }));
}

// Open overlay to edit an existing destination
async function editDest(id) {
  editingDestId = id;
  try {
    const d = await api.getDestination(id);
    openOverlay('Edit Destination: ' + d.title, getDestFormHtml(d));
  } catch (_) {
    showToast('Could not load destination', 'error');
  }
}

// Generate destination form HTML (used in overlay)
function getDestFormHtml(d) {
  const vibeOpts = ['romantic', 'adventure', 'solo', 'solitude', 'family'];
  const stepsHtml = (d.steps || [{ title: '', text: '' }]).map((s, i) => `
    <div class="step-group" style="border: 1px solid var(--admin-border); padding: 1rem; margin-bottom: 0.75rem; border-radius: 4px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Step ${i + 1}</span>
        ${i > 0 ? `<button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeStep(this)"><i class="bi bi-x"></i></button>` : ''}
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" class="step-title" value="${escapeHtml(s.title || '')}" placeholder="e.g. Morning Temple Ritual">
      </div>
      <div class="form-group">
        <label>Text</label>
        <textarea class="step-text" rows="2" placeholder="Describe this step...">${escapeHtml(s.text || '')}</textarea>
      </div>
    </div>`).join('');
  return `
    <form id="dest-form" onsubmit="saveDest(event)">
      <div class="row g-3">
        <div class="col-md-6">
          <div class="form-group">
            <label>ID (slug)</label>
            <input type="text" id="dest-id" value="${escapeHtml(d.id || '')}" placeholder="e.g. tokyo" ${editingDestId ? 'readonly style="opacity:0.5;"' : ''}>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="dest-title" value="${escapeHtml(d.title || '')}" placeholder="e.g. Tokyo" required>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Edition</label>
        <input type="text" id="dest-edition" value="${escapeHtml(d.edition || '')}" placeholder="e.g. ISSUE N°014 // TOKYO NIGHTS">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="dest-desc" rows="3" placeholder="Describe the destination...">${escapeHtml(d.description || d.desc || '')}</textarea>
      </div>
      <div class="row g-3">
        <div class="col-md-3">
          <div class="form-group">
            <label>Price (USD)</label>
            <input type="number" id="dest-price" value="${escapeHtml(d.price || '')}" min="0" step="100" required>
          </div>
        </div>
        <div class="col-md-3">
          <div class="form-group">
            <label>Country</label>
            <input type="text" id="dest-country" value="${escapeHtml(d.country || '')}" placeholder="e.g. Italy">
          </div>
        </div>
        <div class="col-md-3">
          <div class="form-group">
            <label>Vibe</label>
            <select id="dest-vibe">${vibeOpts.map(v => `<option value="${v}" ${(d.vibe || 'romantic') === v ? 'selected' : ''}>${escapeHtml(VIBE_LABELS[v] || v)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="col-md-3">
          <div class="form-group">
            <label>Image URL</label>
            <input type="url" id="dest-img" value="${escapeHtml(d.img || '')}" placeholder="https://...">
          </div>
        </div>
      </div>
      <div class="form-group mt-3">
        <label style="display:flex; justify-content:space-between; align-items:center;">
          Itinerary Steps
          <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" onclick="addStep()">+ Add Step</button>
        </label>
        <div id="steps-container" class="mt-2">${stepsHtml}</div>
      </div>
      <div class="mt-4 d-flex gap-2">
        <button type="submit" class="admin-btn admin-btn-accent">${editingDestId ? 'Update Destination' : 'Create Destination'}</button>
        <button type="button" class="admin-btn admin-btn-outline" onclick="closeOverlay()">Cancel</button>
      </div>
    </form>`;
}

// Add a new itinerary step to the destination form
function addStep() {
  const container = document.getElementById('steps-container');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'step-group';
  div.style.cssText = 'border: 1px solid var(--admin-border); padding: 1rem; margin-bottom: 0.75rem; border-radius: 4px;';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
      <span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Step ${idx + 1}</span>
      <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeStep(this)"><i class="bi bi-x"></i></button>
    </div>
    <div class="form-group">
      <label>Title</label>
      <input type="text" class="step-title" placeholder="e.g. Morning Temple Ritual">
    </div>
    <div class="form-group">
      <label>Text</label>
      <textarea class="step-text" rows="2" placeholder="Describe this step..."></textarea>
    </div>`;
  container.appendChild(div);
}

// Remove an itinerary step from the form
function removeStep(btn) {
  const group = btn.closest('.step-group');
  group.remove();
  // Renumber remaining steps
  document.querySelectorAll('#steps-container .step-group').forEach((el, i) => {
    el.querySelector('[style*="font-size:0.7rem"]').textContent = 'Step ' + (i + 1);
  });
}

// Save destination (create or update)
async function saveDest(e) {
  e.preventDefault();
  const id = document.getElementById('dest-id').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!id) { alert('ID is required'); return; }
  const title = document.getElementById('dest-title').value.trim();
  if (!title) { alert('Title is required'); return; }
  // Collect itinerary steps
  const steps = [];
  document.querySelectorAll('#steps-container .step-group').forEach(g => {
    const st = g.querySelector('.step-title').value.trim();
    const stxt = g.querySelector('.step-text').value.trim();
    if (st || stxt) steps.push({ title: st, text: stxt });
  });
  if (steps.length === 0) { alert('At least one itinerary step is required'); return; }
  const destData = {
    id, title,
    edition: document.getElementById('dest-edition').value.trim(),
    desc: document.getElementById('dest-desc').value.trim(),
    price: parseInt(document.getElementById('dest-price').value) || 0,
    country: document.getElementById('dest-country').value.trim(),
    vibe: document.getElementById('dest-vibe').value,
    img: document.getElementById('dest-img').value.trim() || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1000',
    steps
  };
  try {
    if (editingDestId) {
      await api.updateDestination(editingDestId, destData);
      showToast('Destination updated: ' + title);
    } else {
      await api.createDestination(destData);
      showToast('Destination created: ' + title);
    }
    closeOverlay();
    renderDestinations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDest(id) {
  if (!confirm('Delete this destination?')) return;
  try {
    await api.deleteDestination(id);
    renderDestinations();
    showToast('Destination deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==================== USERS MANAGEMENT ====================
async function renderUsers() {
  const search = (document.getElementById('users-search').value || '').toLowerCase();
  try {
    let users = await api.getAllUsers();
    if (search) {
      users = users.filter(u => (u.name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search));
    }
    document.getElementById('users-count').textContent = users.length + ' user(s)';
    const tbody = document.getElementById('users-table-body');
    if (users.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No registered users</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name || '—')}</td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>${escapeHtml(u.passport || '—')}</td>
        <td>${escapeHtml(u.identity_card || '—')}</td>
        <td><span style="color: ${u.email_verified ? 'var(--admin-success)' : 'var(--admin-warning)'};">${u.email_verified ? 'Verified' : 'Unverified'}</span></td>
        <td style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(u.created_at || '—')}</td>
        <td><button class="admin-btn admin-btn-accent admin-btn-sm" onclick="viewUserProfile('${escapeHtml(u.id)}')"><i class="bi bi-eye"></i> View</button></td>
      </tr>`).join('');
  } catch (_) {
    document.getElementById('users-table-body').innerHTML = '<tr class="empty-row"><td colspan="9">Could not load users</td></tr>';
  }
}
document.getElementById('users-search')?.addEventListener('input', renderUsers);

async function viewUserProfile(userId) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!profile) { showToast('User not found', 'error'); return; }
    openOverlay('Client Profile', `
      <div style="text-align:center;margin-bottom:2rem">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#d4a373,#b8860b);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.5rem;font-weight:700;color:#fff">${(profile.name || '?')[0]}</div>
        <h3 style="color:#fff;margin:0;font-family:'Playfair Display',serif">${escapeHtml(profile.name || 'Unknown')}</h3>
        <span style="display:inline-block;margin-top:0.25rem;font-size:0.75rem;padding:0.2rem 0.75rem;border-radius:999px;background:rgba(212,163,115,0.15);color:#d4a373">${profile.is_admin ? 'Admin' : 'Client'}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>Email</label><input value="${escapeHtml(profile.email || '')}" class="admin-modal-field" id="vu-email"></div>
        <div class="form-group"><label>Name</label><input value="${escapeHtml(profile.name || '')}" class="admin-modal-field" id="vu-name"></div>
        <div class="form-group"><label>Passport</label><input value="${escapeHtml(profile.passport || '')}" class="admin-modal-field" id="vu-passport"></div>
        <div class="form-group"><label>ID Card</label><input value="${escapeHtml(profile.identity_card || '')}" class="admin-modal-field" id="vu-identity_card"></div>
        <div class="form-group"><label>Country</label><input value="${escapeHtml(profile.country || '')}" class="admin-modal-field" id="vu-country"></div>
        <div class="form-group"><label>Phone</label><input value="${escapeHtml(profile.emergency || '')}" class="admin-modal-field" id="vu-emergency"></div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1.5rem;justify-content:flex-end">
        <button class="admin-btn admin-btn-outline" onclick="closeOverlay()">Close</button>
        <button class="admin-btn admin-btn-accent" onclick="updateUserProfile('${escapeHtml(userId)}')">Save Changes</button>
      </div>
    `);
  } catch (_) { showToast('Could not load profile', 'error'); }
}

async function updateUserProfile(userId) {
  const updates = {
    name: document.getElementById('vu-name').value,
    email: document.getElementById('vu-email').value,
    passport: document.getElementById('vu-passport').value,
    identity_card: document.getElementById('vu-identity_card').value,
    country: document.getElementById('vu-country').value,
    emergency: document.getElementById('vu-emergency').value,
  };
  try {
    const { error } = await supabaseClient.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    showToast('Profile updated');
    closeOverlay();
    renderUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

// ==================== CONTACT SUBMISSIONS ====================
async function renderContacts() {
  const search = (document.getElementById('contacts-search').value || '').toLowerCase();
  try {
    let contacts = await api.getContacts();
    if (search) {
      contacts = contacts.filter(c =>
        (c.name || '').toLowerCase().includes(search) ||
        (c.email || '').toLowerCase().includes(search) ||
        (c.subject || '').toLowerCase().includes(search)
      );
    }
    document.getElementById('contacts-count').textContent = contacts.length + ' message(s)';
    const tbody = document.getElementById('contacts-table-body');
    if (contacts.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No messages yet</td></tr>';
      return;
    }
    tbody.innerHTML = contacts.map((c, i) => `
      <!-- Unread messages highlighted with left accent border -->
      <tr style="${c.is_read ? '' : 'border-left: 3px solid var(--admin-accent);'}">
        <td>${escapeHtml(c.name || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>${escapeHtml(c.subject || '—')}</td>
        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--admin-muted);">${escapeHtml(c.message || '—')}</td>
        <td style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(c.created_at || '—')}</td>
        <td>${c.is_read ? '<span style="color: var(--admin-muted);">Read</span>' : '<span style="color: var(--admin-accent); font-weight: 600;">New</span>'}</td>
        <td>
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="viewContact(${c.id})" title="View"><i class="bi bi-eye"></i></button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteContact(${c.id})" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (_) {
    document.getElementById('contacts-table-body').innerHTML = '<tr class="empty-row"><td colspan="7">Could not load contacts</td></tr>';
  }
}

// View a contact message in the overlay, mark as read
async function viewContact(id) {
  try {
    const c = await api.getContact(id);
    if (!c) return;
    await api.markContactRead(id);
    renderContacts();
    openOverlay('Message from ' + c.name, `
      <div style="margin-bottom: 1rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div><span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Name</span><br>${escapeHtml(c.name || '—')}</div>
          <div><span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Email</span><br>${escapeHtml(c.email || '—')}</div>
          <div><span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Subject</span><br>${escapeHtml(c.subject || '—')}</div>
          <div><span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Date</span><br>${escapeHtml(c.created_at || '—')}</div>
        </div>
        <div>
          <span style="font-size:0.7rem; color:var(--admin-muted); letter-spacing:0.1em;">Message</span>
          <p style="margin-top: 0.5rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 4px; line-height: 1.6;">${escapeHtml(c.message || '—')}</p>
        </div>
      </div>
      <div class="mt-3">
        <a href="mailto:${escapeHtml(c.email)}" class="admin-btn admin-btn-accent" style="text-decoration: none; display: inline-block;">Reply via Email</a>
        <button class="admin-btn admin-btn-outline" onclick="closeOverlay()" style="margin-left: 0.5rem;">Close</button>
      </div>`);
  } catch (_) {
    showToast('Could not load message', 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await api.deleteContact(id);
    renderContacts();
    showToast('Message deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
document.getElementById('contacts-search')?.addEventListener('input', renderContacts);

// ==================== NEWSLETTER SUBSCRIBERS ====================
async function renderNewsletter() {
  const search = (document.getElementById('newsletter-search').value || '').toLowerCase();
  try {
    let subs = await api.getNewsletterSubscribers();
    if (search) {
      subs = subs.filter(s => (s.email || '').toLowerCase().includes(search));
    }
    document.getElementById('newsletter-count').textContent = subs.length + ' subscriber(s)';
    const tbody = document.getElementById('newsletter-table-body');
    if (subs.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="2">No subscribers yet</td></tr>';
      return;
    }
    tbody.innerHTML = subs.map(s => `
      <tr>
        <td>${escapeHtml(s.email || '—')}</td>
        <td style="font-size: 0.75rem; color: var(--admin-muted);">${escapeHtml(s.created_at || s.date || '—')}</td>
      </tr>`).join('');
  } catch (_) {
    document.getElementById('newsletter-table-body').innerHTML = '<tr class="empty-row"><td colspan="2">No subscribers yet</td></tr>';
  }
}
document.getElementById('newsletter-search')?.addEventListener('input', renderNewsletter);

// ==================== AUDIT LOGS ====================
async function renderLogs() {
  try {
    const logs = await api.getAuditLogs();
    document.getElementById('logs-count').textContent = logs.length + ' entries';
    const tbody = document.getElementById('logs-table-body');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No log entries yet</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${escapeHtml(l.admin_name || 'Admin #' + l.admin_id)}</td>
        <td><code style="font-size:0.7rem; background:rgba(255,255,255,0.05); padding:0.15rem 0.4rem; border-radius:3px;">${escapeHtml(l.action)}</code></td>
        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.75rem; color:var(--admin-muted);">${escapeHtml(l.details || '—')}</td>
        <td style="font-size:0.7rem; color:var(--admin-muted);">${escapeHtml(l.ip || '—')}</td>
        <td style="font-size:0.75rem; color:var(--admin-muted);">${escapeHtml(l.created_at || '—')}</td>
      </tr>`).join('');
  } catch (_) {
    document.getElementById('logs-table-body').innerHTML = '<tr class="empty-row"><td colspan="5">Could not load logs</td></tr>';
  }
}

// ==================== DOCUMENTS VERIFICATION ====================
async function renderDocuments() {
  const search = (document.getElementById('documents-search').value || '').toLowerCase();
  const filter = document.getElementById('documents-filter-status').value;
  try {
    let users = await api.getAllUsers();
    if (search) {
      users = users.filter(u => (u.name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search));
    }
    // Filter by document type status
    if (filter === 'passport') {
      users = users.filter(u => u.passport);
    } else if (filter === 'idcard') {
      users = users.filter(u => u.identity_card);
    } else if (filter === 'both') {
      users = users.filter(u => u.passport && u.identity_card);
    } else if (filter === 'none') {
      users = users.filter(u => !u.passport && !u.identity_card);
    }
    const totalWithDocs = users.filter(u => u.passport || u.identity_card).length;
    document.getElementById('documents-count').textContent = users.length + ' users (' + totalWithDocs + ' with documents)';
    const tbody = document.getElementById('documents-table-body');
    if (users.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => {
      const pp = u.passport || '';
      const ic = u.identity_card || '';
      let statusHtml;
      if (pp && ic) {
        statusHtml = '<span class="status-badge status-pending">Both</span>';
      } else if (pp && !ic) {
        statusHtml = '<span class="status-badge status-confirmed" style="background:rgba(59,130,246,0.15);color:#3b82f6;">Passport</span>';
      } else if (ic && !pp) {
        statusHtml = '<span class="status-badge status-confirmed" style="background:rgba(34,197,94,0.15);color:#22c55e;">ID Card</span>';
      } else {
        statusHtml = '<span style="color:var(--admin-danger);font-size:0.75rem;">None</span>';
      }
      return `<tr>
        <td>${escapeHtml(u.name || '—')}</td>
        <td>${escapeHtml(u.email || '—')}</td>
        <td>${pp ? '<code style="font-size:0.7rem;background:rgba(255,255,255,0.05);padding:0.15rem 0.4rem;border-radius:3px;">' + escapeHtml(pp) + '</code>' : '<span style="color:var(--admin-muted);">—</span>'}</td>
        <td>${ic ? '<code style="font-size:0.7rem;background:rgba(255,255,255,0.05);padding:0.15rem 0.4rem;border-radius:3px;">' + escapeHtml(ic) + '</code>' : '<span style="color:var(--admin-muted);">—</span>'}</td>
        <td>${statusHtml}</td>
        <td style="font-size:0.75rem;color:var(--admin-muted);">${escapeHtml(u.created_at || '—')}</td>
      </tr>`;
    }).join('');
  } catch (_) {
    document.getElementById('documents-table-body').innerHTML = '<tr class="empty-row"><td colspan="6">Could not load documents</td></tr>';
  }
}
document.getElementById('documents-search')?.addEventListener('input', renderDocuments);
document.getElementById('documents-filter-status')?.addEventListener('change', renderDocuments);

// ==================== TRIPS MANAGEMENT ====================
let editingTripId = null;

async function renderTrips() {
  try {
    const trips = await api.getTrips();
    document.getElementById('trips-count').textContent = trips.length + ' trips';
    const tbody = document.getElementById('trips-table-body');
    if (trips.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No trips scheduled yet</td></tr>';
      return;
    }
    tbody.innerHTML = trips.map(t => {
      const avail = (t.max_capacity || 0) - (t.booked_count || 0);
      const availColor = avail <= 0 ? 'var(--admin-danger)' : avail <= 3 ? 'var(--admin-warning)' : 'var(--admin-success)';
      return `<tr>
        <td style="font-family: monospace; font-size: 0.75rem;">${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.from_location)}</td>
        <td>${escapeHtml(t.to_location)}</td>
        <td>${escapeHtml(t.departure_date)}</td>
        <td>${escapeHtml(t.departure_time || '—')}</td>
        <td>${escapeHtml(t.max_capacity)}</td>
        <td>${escapeHtml(t.booked_count)}</td>
        <!-- Color-coded available spots: green=plenty, yellow=few, red=none -->
        <td style="color: ${availColor}; font-weight: 700;">${avail}</td>
        <td>${t.status === 'active' ? '<span style="color: var(--admin-success);">Active</span>' : '<span style="color: var(--admin-muted);">Inactive</span>'}</td>
        <td>
          <button class="admin-btn admin-btn-accent admin-btn-sm" onclick="editTrip(${escapeHtml(t.id)})"><i class="bi bi-pencil"></i></button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteTrip(${escapeHtml(t.id)})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (_) {
    document.getElementById('trips-table-body').innerHTML = '<tr class="empty-row"><td colspan="10">Could not load trips</td></tr>';
  }
}

// Open overlay to create a new trip
async function openTripModal() {
  editingTripId = null;
  editingDestId = null;
  try {
    openOverlay('Add New Trip', getTripFormHtml({ from_location: '', to_location: '', destination_id: '', departure_date: '', departure_time: '', max_capacity: 20 }));
  } catch (e) {
    showToast('Error: ' + (e.message || 'unknown'), 'error');
  }
}

// Open overlay to edit an existing trip
async function editTrip(id) {
  editingTripId = id;
  editingDestId = null;
  try {
    const t = await api.getTrip(id);
    openOverlay('Edit Trip', getTripFormHtml(t));
  } catch (_) {
    showToast('Could not load trip', 'error');
  }
}

async function deleteTrip(id) {
  if (!confirm('Delete this trip?')) return;
  try {
    await api.deleteTrip(id);
    renderTrips();
    showToast('Trip deleted');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Expose functions to HTML onclick handlers
window.openTripModal = openTripModal;
window.editTrip = editTrip;
window.deleteTrip = deleteTrip;
window.saveTrip = saveTrip;
window.closeOverlay = closeOverlay;

// Generate trip form HTML (used in overlay)
function getTripFormHtml(t) {
  return `
    <form id="trip-form" onsubmit="saveTrip(event)">
      <div class="row g-3">
        <div class="col-md-6">
          <div class="form-group">
            <label>From Location</label>
            <input type="text" id="trip-from" value="${escapeHtml(t.from_location)}" placeholder="e.g. New York" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>To Location</label>
            <input type="text" id="trip-to" value="${escapeHtml(t.to_location)}" placeholder="e.g. London" required>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="form-group">
            <label>Departure Date</label>
            <input type="date" id="trip-date" value="${escapeHtml(t.departure_date)}" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>Departure Time</label>
            <input type="time" id="trip-time" value="${escapeHtml(t.departure_time)}">
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <div class="form-group">
            <label>Max Capacity (passengers)</label>
            <input type="number" id="trip-capacity" value="${escapeHtml(t.max_capacity)}" min="1" max="500" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>Destination (optional ref)</label>
            <input type="text" id="trip-dest" value="${escapeHtml(t.destination_id || '')}" placeholder="e.g. paris">
          </div>
        </div>
      </div>
      ${editingTripId ? `
      <!-- Status field only shown when editing an existing trip -->
      <div class="form-group">
        <label>Status</label>
        <select id="trip-status">
          <option value="active" ${t.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${t.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>` : ''}
      <div class="mt-4 d-flex gap-2">
        <button type="submit" class="admin-btn admin-btn-accent">${editingTripId ? 'Update Trip' : 'Create Trip'}</button>
        <button type="button" class="admin-btn admin-btn-outline" onclick="closeOverlay()">Cancel</button>
      </div>
    </form>`;
}

// Save trip (create or update)
async function saveTrip(e) {
  e.preventDefault();
  const data = {
    from_location: document.getElementById('trip-from').value.trim(),
    to_location: document.getElementById('trip-to').value.trim(),
    departure_date: document.getElementById('trip-date').value,
    departure_time: document.getElementById('trip-time').value,
    max_capacity: parseInt(document.getElementById('trip-capacity').value) || 20,
    destination_id: document.getElementById('trip-dest').value.trim()
  };
  if (!data.from_location || !data.to_location || !data.departure_date) {
    showToast('From, To, and Date are required', 'error');
    return;
  }
  // Prevent capacity from being less than existing bookings
  if (editingTripId) {
    try {
      const existing = await api.getTrip(editingTripId);
      if (existing && data.max_capacity < (existing.booked_count || 0)) {
        showToast(`Capacity cannot be less than ${existing.booked_count} existing booking(s)`, 'error');
        return;
      }
    } catch (_) { /* proceed anyway */ }
  }
  try {
    if (editingTripId) {
      data.status = document.getElementById('trip-status').value;
      await api.updateTrip(editingTripId, data);
      showToast('Trip updated');
    } else {
      await api.createTrip(data);
      showToast('Trip created');
    }
    closeOverlay();
    renderTrips();
  } catch (err) {
    showToast(err.message, 'error');
  }
}


