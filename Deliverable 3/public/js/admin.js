/* ===================================================== */
/* ADMIN CLIENT JS — Dashboard, Approvals, Finance, Promos, Fares */
/* ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardStats()
  fetchPendingApprovals()
  fetchPayoutRequests()
  fetchPromos()
  fetchFareRules()
  fetchLeaderboard()
  setInterval(fetchLeaderboard, 30000)

  const adminName = localStorage.getItem('user_name') || 'System Admin'
  const adminEl = document.querySelector('.admin-profile span')
  if (adminEl) adminEl.textContent = adminName
})

const formatCurr = (num) => `Rs. ${parseInt(num || 0).toLocaleString()}`

/* -------------------------------------------------- */
/* DASHBOARD STATS                                    */
/* -------------------------------------------------- */

async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    if (!data.success) return

    document.getElementById('stat-revenue').innerText = formatCurr(
      data.stats.totalRevenue,
    )
    document.getElementById('stat-rides').innerText = data.stats.activeRides
    document.getElementById('stat-users').innerText = data.stats.totalUsers
    const commEl = document.getElementById('stat-commissions')
    if (commEl) commEl.innerText = formatCurr(data.stats.totalCommission)

    const alertsHtml = (data.alerts || [])
      .map(
        (a) => `
      <tr>
        <td>${new Date(a.created_at).toLocaleString()}</td>
        <td>${a.message}</td>
        <td><span class="status ${a.is_read ? 'active' : 'pending'}">${a.is_read ? 'Read' : 'Unread'}</span></td>
      </tr>
    `,
      )
      .join('')

    document.getElementById('alerts-table').innerHTML =
      alertsHtml ||
      `<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No system alerts.</td></tr>`
  } catch (err) {
    console.error('Failed to load stats', err)
  }
}

/* -------------------------------------------------- *//* LEADERBOARD                                         */
/* -------------------------------------------------- */

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/admin/leaderboard')
    const data = await res.json()
    if (!data.success) return

    const tbody = document.getElementById('leaderboard-table')
    if (!tbody) return

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No leaderboard data available.</td></tr>`
      return
    }

    tbody.innerHTML = data.data
      .map(
        (row) => `
      <tr>
        <td>${row.city || 'Unknown'}</td>
        <td><strong>${row.full_name || 'Unnamed Driver'}</strong></td>
        <td>${parseFloat(row.average_rating || 0).toFixed(2)}</td>
        <td>${row.total_trips ?? 0}</td>
      </tr>
    `,
      )
      .join('')
  } catch (err) {
    console.error('Failed to load leaderboard', err)
  }
}

/* -------------------------------------------------- *//* PENDING APPROVALS                                  */
/* -------------------------------------------------- */

async function fetchPendingApprovals() {
  try {
    const res = await fetch('/api/admin/pending-drivers')
    const data = await res.json()
    if (!data.success) return

    const table = document.getElementById('approvals-table')
    if (data.drivers.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No pending verifications.</td></tr>`
      return
    }

    table.innerHTML = data.drivers
      .map(
        (d) => `
      <tr>
        <td>
          <strong>${d.full_name}</strong>
          <br><small style="color:var(--text-muted)">${d.cnic}</small>
        </td>
        <td>${d.licence_no}</td>
        <td>
          ${d.make || '—'} ${d.model || ''} (${d.year || '—'})
          <br><small style="color:var(--text-muted)">${d.license_plate || '—'} · ${d.vehicle_type || '—'}</small>
        </td>
        <td><span class="status pending">Pending</span></td>
        <td>
          <button class="action-btn approve" onclick="verifyDriver(${d.driver_id},'verified')">Approve</button>
          <button class="action-btn reject"  onclick="verifyDriver(${d.driver_id},'rejected')">Reject</button>
        </td>
      </tr>
    `,
      )
      .join('')
  } catch (err) {
    console.error('Failed to load approvals', err)
  }
}

async function verifyDriver(driverId, status) {
  if (!confirm(`Mark driver #${driverId} as ${status}?`)) return
  try {
    const res = await fetch('/api/admin/verify-driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driverId, status }),
    })
    const data = await res.json()
    if (data.success) {
      showAdminToast(
        `Driver ${status} successfully.`,
        status === 'verified' ? 'success' : 'danger',
      )
      fetchPendingApprovals()
    } else {
      alert(data.message)
    }
  } catch (err) {
    console.error(err)
  }
}

/* -------------------------------------------------- */
/* PAYOUT REQUESTS                                    */
/* -------------------------------------------------- */

async function fetchPayoutRequests() {
  try {
    const res = await fetch('/api/admin/payouts')
    const data = await res.json()
    if (!data.success) return

    const table = document.getElementById('payouts-table')
    const totalPending = data.payouts.reduce(
      (s, p) => s + parseFloat(p.amount),
      0,
    )
    const pendingEl = document.getElementById('stat-pending-payouts')
    if (pendingEl) pendingEl.innerText = formatCurr(totalPending)

    if (data.payouts.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No pending payouts.</td></tr>`
      return
    }

    table.innerHTML = data.payouts
      .map(
        (p) => `
      <tr>
        <td><strong>${p.full_name || `Driver #${p.driver_id}`}</strong></td>
        <td style="color:white;font-weight:600">${formatCurr(p.amount)}</td>
        <td>${new Date(p.requested_at).toLocaleDateString()}</td>
        <td><span class="status pending">Pending</span></td>
        <td>
          <button class="action-btn approve" onclick="processPayout(${p.payout_id},'paid')">Process</button>
          <button class="action-btn reject"  onclick="processPayout(${p.payout_id},'rejected')">Reject</button>
        </td>
      </tr>
    `,
      )
      .join('')
  } catch (err) {
    console.error('Failed to load payouts', err)
  }
}

async function processPayout(payoutId, status) {
  if (!confirm(`Mark payout as ${status}?`)) return
  try {
    const res = await fetch('/api/admin/process-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout_id: payoutId, status }),
    })
    const data = await res.json()
    if (data.success) {
      showAdminToast(
        `Payout marked as ${status}.`,
        status === 'paid' ? 'success' : 'danger',
      )
      fetchPayoutRequests()
    }
  } catch (err) {
    console.error(err)
  }
}

/* -------------------------------------------------- */
/* PROMOS                                             */
/* -------------------------------------------------- */

async function fetchPromos() {
  try {
    const res = await fetch('/api/admin/promos')
    const data = await res.json()
    if (!data.success) return

    const tbody = document.getElementById('promos-table-body')
    if (!tbody) return

    if (data.promos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No promo codes yet.</td></tr>`
      return
    }

    tbody.innerHTML = data.promos
      .map((p) => {
        const isActive =
          new Date(p.expiry_date) > new Date() && p.usage_count < p.usage_limit
        const discount =
          p.discount_type === 'percentage'
            ? `${p.discount_value}%`
            : `Rs. ${p.discount_value}`
        return `
        <tr>
          <td><strong style="color:white;letter-spacing:1px">${p.code}</strong></td>
          <td>${p.discount_type === 'percentage' ? 'Percent' : 'Flat'} — ${discount}</td>
          <td>${p.usage_count} / ${p.usage_limit}</td>
          <td>${new Date(p.expiry_date).toLocaleDateString()}</td>
          <td><span class="status ${isActive ? 'active' : 'pending'}">${isActive ? 'Active' : 'Expired'}</span></td>
        </tr>
      `
      })
      .join('')
  } catch (err) {
    console.error('Failed to load promos', err)
  }
}

function openPromoModal() {
  const existing = document.getElementById('promo-modal')
  if (existing) {
    existing.style.display = 'flex'
    return
  }

  const modal = document.createElement('div')
  modal.id = 'promo-modal'
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);
  `
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2.5rem;width:440px;color:white;">
      <h2 style="margin-bottom:1.5rem;font-family:'Anta',sans-serif;font-size:1.4rem;">New Promo Code</h2>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <input id="pm-code"      placeholder="Code — e.g. SAVE50" style="${inputStyle}"/>
        <select id="pm-type"     style="${inputStyle}">
          <option value="flat">Flat Discount (Rs.)</option>
          <option value="percentage">Percentage Discount (%)</option>
        </select>
        <input id="pm-value"    placeholder="Discount value" type="number" min="1" style="${inputStyle}"/>
        <input id="pm-limit"    placeholder="Max uses (default 100)" type="number" min="1" style="${inputStyle}"/>
        <input id="pm-min-fare" placeholder="Min fare required (Rs.) — optional" type="number" min="0" style="${inputStyle}"/>
        <input id="pm-expiry"   type="datetime-local" style="${inputStyle}"/>
        <div id="pm-msg" style="font-size:0.82rem;text-align:center;min-height:16px;"></div>
        <div style="display:flex;gap:1rem;">
          <button onclick="submitPromo()" style="flex:2;padding:13px;background:#d7d1b0;color:#000;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Create Promo
          </button>
          <button onclick="document.getElementById('promo-modal').style.display='none'"
            style="flex:1;padding:13px;background:transparent;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

const inputStyle = `
  padding:12px;border-radius:10px;background:#1a1a1a;
  border:1px solid rgba(255,255,255,0.1);color:white;
  font-family:'Plus Jakarta Sans',sans-serif;font-size:0.92rem;outline:none;width:100%;
`

async function submitPromo() {
  const code = document.getElementById('pm-code').value.trim()
  const discount_type = document.getElementById('pm-type').value
  const discount_value = parseFloat(document.getElementById('pm-value').value)
  const usage_limit = parseInt(document.getElementById('pm-limit').value) || 100
  const min_fare = parseFloat(document.getElementById('pm-min-fare').value) || 0
  const expiry_date = document.getElementById('pm-expiry').value
  const admin_id = parseInt(localStorage.getItem('user_id'))
  const msgEl = document.getElementById('pm-msg')

  if (!code) {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Code is required.'
    return
  }
  if (!discount_value) {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Discount value required.'
    return
  }
  if (!expiry_date) {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Expiry date required.'
    return
  }
  if (!admin_id) {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Admin session not found. Please log in again.'
    return
  }

  try {
    const res = await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id,
        code,
        discount_type,
        discount_value,
        usage_limit,
        expiry_date,
        min_fare,
      }),
    })
    const data = await res.json()
    if (data.success) {
      document.getElementById('promo-modal').style.display = 'none'
      showAdminToast('Promo code created!', 'success')
      fetchPromos()
    } else {
      msgEl.style.color = '#ef4444'
      msgEl.textContent = data.message
    }
  } catch {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Server error.'
  }
}

/* -------------------------------------------------- */
/* FARE RULES                                         */
/* Schema columns: base_rate | per_km_rate            */
/*                 per_minute_rate | surge_multiplier */
/* -------------------------------------------------- */

async function fetchFareRules() {
  try {
    const res = await fetch('/api/admin/fares')
    const data = await res.json()
    if (!data.success) return

    const tbody = document.getElementById('fares-table-body')
    if (!tbody) return

    if (!data.fares.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">
            No fare rules configured.
            <br><small>Use the "Add Rule" button above to create one.</small>
          </td>
        </tr>`
      return
    }

    tbody.innerHTML = data.fares
      .map(
        (f) => `
      <tr>
        <td>${f.city}</td>
        <td style="text-transform:capitalize;">${f.vehicle_type}</td>
        <td>Rs. ${parseFloat(f.base_rate).toFixed(2)}</td>
        <td>Rs. ${parseFloat(f.per_km_rate).toFixed(2)}</td>
        <td>Rs. ${parseFloat(f.per_minute_rate).toFixed(2)}</td>
        <td>${parseFloat(f.surge_multiplier).toFixed(2)}×</td>
        <td>
          <button class="action-btn approve"
            onclick="editFareRule(${f.pricing_id}, ${f.base_rate}, ${f.per_km_rate}, ${f.per_minute_rate}, ${f.surge_multiplier})">
            Edit
          </button>
        </td>
      </tr>
    `,
      )
      .join('')
  } catch (err) {
    console.error('Failed to load fares', err)
  }
}

function openAddFareModal() {
  const existing = document.getElementById('add-fare-modal')
  if (existing) {
    existing.style.display = 'flex'
    return
  }

  const modal = document.createElement('div')
  modal.id = 'add-fare-modal'
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);
  `
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2.5rem;width:440px;color:white;">
      <h2 style="margin-bottom:1.5rem;font-family:'Anta',sans-serif;font-size:1.4rem;">Add Fare Rule</h2>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <input id="af-city"    placeholder="City — e.g. Islamabad" style="${inputStyle}"/>
        <select id="af-type"   style="${inputStyle}">
          <option value="economy">Economy</option>
          <option value="premium">Premium</option>
          <option value="bike">Bike</option>
        </select>
        <input id="af-base"    placeholder="Base Rate (Rs.)"       type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="af-perkm"   placeholder="Per KM Rate (Rs.)"     type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="af-permin"  placeholder="Per Minute Rate (Rs.)" type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="af-surge"   placeholder="Surge multiplier (default 1.00)" type="number" min="1" step="0.01" style="${inputStyle}"/>
        <div id="af-msg" style="font-size:0.82rem;text-align:center;min-height:16px;"></div>
        <div style="display:flex;gap:1rem;">
          <button onclick="submitAddFare()"
            style="flex:2;padding:13px;background:#d7d1b0;color:#000;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Add Rule
          </button>
          <button onclick="document.getElementById('add-fare-modal').style.display='none'"
            style="flex:1;padding:13px;background:transparent;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

async function submitAddFare() {
  const city = document.getElementById('af-city').value.trim()
  const vehicle_type = document.getElementById('af-type').value
  const base_rate = document.getElementById('af-base').value
  const per_km_rate = document.getElementById('af-perkm').value
  const per_minute_rate = document.getElementById('af-permin').value
  const surge_multiplier = document.getElementById('af-surge').value || 1.0
  const msgEl = document.getElementById('af-msg')

  if (!city || !base_rate || !per_km_rate || !per_minute_rate) {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'All fields except surge multiplier are required.'
    return
  }

  try {
    const res = await fetch('/api/admin/add-fare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city,
        vehicle_type,
        base_rate,
        per_km_rate,
        per_minute_rate,
        surge_multiplier,
      }),
    })
    const data = await res.json()
    if (data.success) {
      document.getElementById('add-fare-modal').style.display = 'none'
      showAdminToast('Fare rule added!', 'success')
      fetchFareRules()
    } else {
      msgEl.style.color = '#ef4444'
      msgEl.textContent = data.message
    }
  } catch {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Server error.'
  }
}

async function editFareRule(pricingId, curBase, curKm, curMin, curSurge) {
  const existing = document.getElementById('edit-fare-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'edit-fare-modal'
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);
  `
  modal.innerHTML = `
    <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2.5rem;width:440px;color:white;">
      <h2 style="margin-bottom:1.5rem;font-family:'Anta',sans-serif;font-size:1.4rem;">Edit Fare Rule #${pricingId}</h2>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <input id="ef-base"   value="${curBase}"   placeholder="Base Rate (Rs.)"       type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="ef-perkm"  value="${curKm}"     placeholder="Per KM Rate (Rs.)"     type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="ef-permin" value="${curMin}"     placeholder="Per Minute Rate (Rs.)" type="number" min="0" step="0.01" style="${inputStyle}"/>
        <input id="ef-surge"  value="${curSurge}"  placeholder="Surge multiplier"       type="number" min="1" step="0.01" style="${inputStyle}"/>
        <div id="ef-msg" style="font-size:0.82rem;text-align:center;min-height:16px;"></div>
        <div style="display:flex;gap:1rem;">
          <button onclick="submitEditFare(${pricingId})"
            style="flex:2;padding:13px;background:#d7d1b0;color:#000;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Save Changes
          </button>
          <button onclick="document.getElementById('edit-fare-modal').remove()"
            style="flex:1;padding:13px;background:transparent;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

async function submitEditFare(pricingId) {
  const base_rate = document.getElementById('ef-base').value
  const per_km_rate = document.getElementById('ef-perkm').value
  const per_minute_rate = document.getElementById('ef-permin').value
  const surge_multiplier = document.getElementById('ef-surge').value
  const msgEl = document.getElementById('ef-msg')

  try {
    const res = await fetch('/api/admin/update-fare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pricing_id: pricingId,
        base_rate,
        per_km_rate,
        per_minute_rate,
        surge_multiplier,
      }),
    })
    const data = await res.json()
    if (data.success) {
      document.getElementById('edit-fare-modal').remove()
      showAdminToast('Fare rule updated!', 'success')
      fetchFareRules()
    } else {
      msgEl.style.color = '#ef4444'
      msgEl.textContent = data.message
    }
  } catch {
    msgEl.style.color = '#ef4444'
    msgEl.textContent = 'Server error.'
  }
}

/* -------------------------------------------------- */
/* TOAST                                              */
/* -------------------------------------------------- */

function showAdminToast(msg, type = 'success') {
  const colors = { success: '#10b981', danger: '#ef4444', warning: '#f59e0b' }
  const color = colors[type] || '#d7d1b0'

  const container =
    document.getElementById('toast-container') ||
    (() => {
      const el = document.createElement('div')
      el.id = 'toast-container'
      el.style.cssText =
        'position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;'
      document.body.appendChild(el)
      return el
    })()

  const toast = document.createElement('div')
  toast.style.cssText = `
    padding:14px 22px;background:rgba(10,10,10,0.95);backdrop-filter:blur(10px);
    color:white;border:1px solid rgba(255,255,255,0.08);border-left:4px solid ${color};
    border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.4);
    font-family:'Plus Jakarta Sans',sans-serif;font-size:0.9rem;
    animation:fadeIn 0.3s ease;
  `
  toast.textContent = msg
  container.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-8px)'
    toast.style.transition = 'all 0.4s ease'
    setTimeout(() => toast.remove(), 400)
  }, 3500)
}

// Inject keyframe if needed
;(function () {
  const s = document.createElement('style')
  s.textContent =
    '@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }'
  document.head.appendChild(s)
})()
