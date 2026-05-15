/* ===================================================== */
/* DRIVER CLIENT JS — Map, Ride Management, Earnings     */
/* ===================================================== */

const socket = io()

let map, driverMarker, routeLine, pickupMarker, dropMarker
let currentRide = null
let currentPosition = null
let rideSocketId = null

const driverId = parseInt(localStorage.getItem('user_id')) || null
const driverName = localStorage.getItem('user_name') || 'Driver'

if (driverId) {
  socket.emit('join_private_room', { user_id: driverId })
}

document.addEventListener('DOMContentLoaded', async () => {
  /* ------------------------------------------------ */
  /* PROFILE                                          */
  /* ------------------------------------------------ */

  const nameEl = document.querySelector('.user-info h4')
  if (nameEl) nameEl.textContent = driverName

  /* ------------------------------------------------ */
  /* MAP INIT                                         */
  /* ------------------------------------------------ */

  map = L.map('map', { zoomControl: false }).setView([33.6844, 73.0479], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const driverIcon = L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:#d7d1b0;border:3px solid white;border-radius:50%;box-shadow:0 0 16px #d7d1b0,0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  driverMarker = L.marker([33.6844, 73.0479], { icon: driverIcon })
    .addTo(map)
    .bindPopup('Your Location')

  await loadEarnings()
  await loadPerformance()

  /* ------------------------------------------------ */
  /* ANIMATIONS                                       */
  /* ------------------------------------------------ */

  const s = document.createElement('style')
  s.textContent = `
    @keyframes slideIn  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes pulse-btn { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); box-shadow: 0 0 15px rgba(239,68,68,0.5); } }
    .hidden { display: none !important; }
    .modal-overlay { display:none; position:fixed; inset:0; z-index:9000; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); align-items:center; justify-content:center; }
    .modal-overlay.active { display:flex; }
    .rating-card { background:#0f0f0f; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:2.5rem; width:420px; max-width:92vw; color:white; animation:slideIn 0.3s ease; }
    .rating-title { font-size:1.5rem; font-weight:700; margin-bottom:0.4rem; }
    .rating-subtitle { color:#888; font-size:0.9rem; margin-bottom:1.2rem; }
    .star-rating { display:flex; gap:8px; font-size:2.5rem; margin:1.2rem 0; cursor:pointer; }
    .star-rating span { color:rgba(255,255,255,0.15); transition:0.2s; }
    .star-rating span.active { color:#f59e0b; }
    .rating-textarea { width:100%; padding:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:white; font-size:0.9rem; resize:vertical; min-height:80px; font-family:'Plus Jakarta Sans',sans-serif; margin-bottom:1.2rem; outline:none; }
    .input { width:100%; padding:14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:white; font-size:1rem; outline:none; font-family:'Plus Jakarta Sans',sans-serif; }
    .table-container table { width:100%; border-collapse:collapse; }
    .table-container th { padding:12px; color:#666; font-size:0.75rem; text-transform:uppercase; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); }
    .table-container td { padding:14px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.88rem; }
    .text-secondary { color:#888; }
    .glass-border { border-color:rgba(255,255,255,0.08); }
  `
  document.head.appendChild(s)

  /* ------------------------------------------------ */
  /* WITHDRAW BUTTON                                  */
  /* ------------------------------------------------ */

  const withdrawBtn = document.querySelector('#earnings .btn-primary')
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      document.getElementById('withdraw-modal').classList.add('active')
    })
  }

  window.closeWithdrawModal = () => {
    document.getElementById('withdraw-modal').classList.remove('active')
  }

  window.submitWithdrawal = async () => {
    const amountStr = document.getElementById('withdraw-amount').value
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount.')
      return
    }

    try {
      const res = await fetch('/api/driver/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, amount }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Payout of Rs. ${amount} requested! Admin will process it.`)
        closeWithdrawModal()
        loadEarnings()
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert('Failed to submit payout request.')
    }
  }

  /* ------------------------------------------------ */
  /* HISTORY                                          */
  /* ------------------------------------------------ */

  window.showHistory = async () => {
    if (!driverId) return
    document.getElementById('history-modal').classList.add('active')
    const tbody = document.getElementById('history-table-body')
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:20px;color:#666;">Loading...</td></tr>'

    try {
      const res = await fetch(`/api/driver/history/${driverId}`)
      const data = await res.json()
      if (data.success) {
        if (!data.history || data.history.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;padding:20px;color:#666;">No trips yet.</td></tr>'
          return
        }
        tbody.innerHTML = data.history
          .map(
            (r) => `
          <tr>
            <td style="color:#aaa;">${new Date(r.archived_at).toLocaleDateString()}</td>
            <td>
              <div style="color:white;font-weight:500;">${r.pickup_address || '—'}</div>
              <div style="color:#666;font-size:0.78rem;">→ ${r.dropoff_address || '—'}</div>
            </td>
            <td style="color:#d7d1b0;font-weight:600;">Rs. ${r.fare ? (r.fare * 0.8).toFixed(0) : 0}</td>
            <td>
              <span style="padding:4px 10px;border-radius:8px;font-size:0.72rem;
                background:${r.final_status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)'};
                color:${r.final_status === 'completed' ? '#10b981' : '#ef4444'};">
                ${r.final_status}
              </span>
            </td>
          </tr>
        `,
          )
          .join('')
      }
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:20px;color:#f00;">Error loading history.</td></tr>'
    }
  }

  window.closeHistoryModal = () => {
    document.getElementById('history-modal').classList.remove('active')
  }

  /* ------------------------------------------------ */
  /* EARNINGS                                         */
  /* ------------------------------------------------ */

  async function loadEarnings() {
    if (!driverId) return
    try {
      const [earningsRes, walletRes] = await Promise.all([
        fetch(`/api/driver/earnings/${driverId}`),
        fetch(`/api/driver/wallet/${driverId}`),
      ])
      const earnings = await earningsRes.json()
      const wallet = await walletRes.json()

      if (wallet.success) {
        const balance = parseFloat(wallet.balance || 0)
        const balEl = document.querySelector('#earnings .value.highlight')
        if (balEl) balEl.textContent = `Rs. ${balance.toLocaleString()}`
      }
      if (earnings.success) {
        const gross = parseFloat(earnings.summary?.total_gross || 0)
        const valEls = document.querySelectorAll('#earnings .value')
        if (valEls[1]) valEls[1].textContent = `Rs. ${gross.toLocaleString()}`
      }
    } catch (err) {
      console.error('Earnings load error:', err)
    }
  }

  /* ------------------------------------------------ */
  /* PERFORMANCE                                      */
  /* ------------------------------------------------ */

  async function loadPerformance() {
    if (!driverId) return
    try {
      const res = await fetch(`/api/driver/profile/${driverId}`)
      const data = await res.json()
      if (data.success) {
        const d = data.driver
        const ratingEl = document.querySelector('#ratings .value.highlight')
        if (ratingEl) {
          ratingEl.childNodes[0].textContent =
            parseFloat(d.average_rating || 0).toFixed(1) + ' '
        }
        const tripsEl = document.querySelectorAll('#ratings .value')[1]
        if (tripsEl) tripsEl.textContent = d.total_trips || 0

        if (data.vehicles?.length > 0) {
          const plateEl = document.querySelector('.user-info p')
          if (plateEl)
            plateEl.textContent = `${data.vehicles[0].make} · ${data.vehicles[0].license_plate}`
        }
      }
    } catch (err) {
      console.error('Performance load error:', err)
    }
  }

  /* ------------------------------------------------ */
  /* RIDE COMPLETED SUMMARY (from server)             */
  /* ------------------------------------------------ */

  socket.on('ride_completed_summary', (data) => {
    const summary = document.getElementById('trip-summary-driver')
    if (summary) {
      document.getElementById('summary-fare').textContent = `Rs. ${data.fare}`
      document.getElementById('summary-duration').textContent =
        `${data.duration} mins`
    }
    loadEarnings()
    loadPerformance()
  })

  socket.on('incoming_rating', (data) => {
    showToast(
      `New Rating! ${data.score} ★ from ${data.rated_by_name || 'your rider'}.`,
    )
    loadPerformance()
  })

  socket.on('ride_cancelled', (data) => {
    showToast('Ride was cancelled by the rider.')
    // Reset UI to available state
    currentRide = null
    rideSocketId = null
    if (routeLine) map.removeLayer(routeLine)
    if (pickupMarker) map.removeLayer(pickupMarker)
    if (dropMarker) map.removeLayer(dropMarker)
    document.getElementById('ride-requests').innerHTML = ''
    document.getElementById('status-text').textContent = 'Online'
    socket.emit('driver_online', { driver_id: driverId })
  })

  /* ------------------------------------------------ */
  /* UI REFS                                          */
  /* ------------------------------------------------ */

  const toggle = document.getElementById('online-toggle')
  const statusText = document.getElementById('status-text')
  const statusDot = document.getElementById('status-dot')
  const incomingReq = document.getElementById('incoming-request')
  const tripPanel = document.getElementById('trip-panel')
  const arriveBtn = document.getElementById('arrive-btn')
  const startBtn = document.getElementById('start-trip-btn')
  const endBtn = document.getElementById('end-trip-btn')

  /* ------------------------------------------------ */
  /* ONLINE / OFFLINE TOGGLE                          */
  /* ------------------------------------------------ */

  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      statusText.innerText = 'Online'
      statusText.style.color = 'var(--success)'
      statusDot.style.background = 'var(--success)'
      statusDot.style.boxShadow = '0 0 10px var(--success)'
      socket.emit('driver_online', { driver_id: driverId })
    } else {
      statusText.innerText = 'Offline'
      statusText.style.color = 'var(--text-muted)'
      statusDot.style.background = 'var(--text-muted)'
      statusDot.style.boxShadow = 'none'
      socket.emit('driver_offline', { driver_id: driverId })
      incomingReq.classList.add('hidden')
    }
  })

  /* ------------------------------------------------ */
  /* SERVER: driver assigned start position           */
  /* ------------------------------------------------ */

  socket.on('driver_position_init', (pos) => {
    currentPosition = pos
    driverMarker.setLatLng([pos.lat, pos.lng])
    map.setView([pos.lat, pos.lng], 14)
    driverMarker.openPopup()
  })

  /* ------------------------------------------------ */
  /* SOCKET: incoming ride request                    */
  /* ------------------------------------------------ */

  socket.on('new_ride_request', (data) => {
    if (!toggle.checked) return
    currentRide = data
    rideSocketId = data.ride_socket_id

    document.getElementById('req-dist').innerText = data.distance
    const subtitle = document.getElementById('req-subtitle')
    if (subtitle)
      subtitle.textContent = `${data.pickup_address || 'Pickup'} → ${data.dropoff_address || 'Dropoff'}`

    incomingReq.classList.remove('hidden')

    if (pickupMarker) map.removeLayer(pickupMarker)
    pickupMarker = L.marker([data.pickup.lat, data.pickup.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #10b981;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    })
      .addTo(map)
      .bindPopup('Pickup Point')
    map.flyTo([data.pickup.lat, data.pickup.lng], 14, { duration: 1 })
  })

  socket.on('ride_error', (data) => {
    alert(data.message)
    incomingReq.classList.add('hidden')
    tripPanel.classList.add('hidden')
  })

  /* ------------------------------------------------ */
  /* REJECT                                           */
  /* ------------------------------------------------ */

  document.getElementById('reject-btn').addEventListener('click', () => {
    incomingReq.classList.add('hidden')
    if (pickupMarker) {
      map.removeLayer(pickupMarker)
      pickupMarker = null
    }
    currentRide = null
  })

  /* ------------------------------------------------ */
  /* ACCEPT                                           */
  /* ------------------------------------------------ */

  document.getElementById('accept-btn').addEventListener('click', async () => {
    incomingReq.classList.add('hidden')
    tripPanel.classList.remove('hidden')
    arriveBtn.classList.remove('hidden')

    socket.emit('accept_ride', {
      ride_id: currentRide.ride_id,
      ride_socket_id: rideSocketId,
      driver_id: driverId,
      driver_name: driverName,
    })

    const start = currentPosition || { lat: 33.6844, lng: 73.0479 }
    await animateToLocation(start, currentRide.pickup, '#d7d1b0', rideSocketId)
    currentPosition = currentRide.pickup
  })

  /* ------------------------------------------------ */
  /* ARRIVED AT PICKUP                                */
  /* ------------------------------------------------ */

  arriveBtn.addEventListener('click', () => {
    document.getElementById('trip-status').innerText = 'Arrived at Pickup'
    document.getElementById('trip-subtext').innerText =
      'Waiting for rider to board.'
    arriveBtn.classList.add('hidden')
    startBtn.classList.remove('hidden')
    socket.emit('driver_arrived', {
      ride_id: currentRide.ride_id,
      ride_socket_id: rideSocketId,
    })
  })

  /* ------------------------------------------------ */
  /* START TRIP                                       */
  /* ------------------------------------------------ */

  startBtn.addEventListener('click', async () => {
    document.getElementById('trip-status').innerText = 'Trip in Progress'
    document.getElementById('trip-subtext').innerText =
      'Routing to destination...'
    startBtn.classList.add('hidden')
    endBtn.classList.remove('hidden')

    socket.emit('start_trip', {
      ride_id: currentRide.ride_id,
      ride_socket_id: rideSocketId,
    })

    if (pickupMarker) {
      map.removeLayer(pickupMarker)
      pickupMarker = null
    }
    if (dropMarker) {
      map.removeLayer(dropMarker)
      dropMarker = null
    }

    dropMarker = L.marker([currentRide.dropoff.lat, currentRide.dropoff.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #ef4444;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    })
      .addTo(map)
      .bindPopup('Dropoff Point')

    await animateToLocation(
      currentRide.pickup,
      currentRide.dropoff,
      '#10b981',
      rideSocketId,
    )
    currentPosition = currentRide.dropoff

    document.getElementById('trip-status').innerText = 'Arrived at Destination'
    document.getElementById('trip-subtext').innerText =
      'Click End Trip to complete the ride.'
    endBtn.style.animation = 'pulse-btn 1.5s infinite'
  })

  /* ------------------------------------------------ */
  /* END TRIP — sequence:                             */
  /* 1. Emit ride_completed (server notifies rider)   */
  /* 2. Driver rates rider (optional)                 */
  /* 3. Close modal → reload                          */
  /* Rider side: prompt_payment → pay → rate driver   */
  /* ------------------------------------------------ */

  endBtn.addEventListener('click', () => {
    if (endBtn.disabled) return
    endBtn.disabled = true
    endBtn.style.animation = 'none'

    socket.emit('ride_completed', {
      ride_id: currentRide.ride_id,
      ride_socket_id: rideSocketId,
    })

    tripPanel.classList.add('hidden')
    if (dropMarker) {
      map.removeLayer(dropMarker)
      dropMarker = null
    }
    if (routeLine) {
      map.removeLayer(routeLine)
      routeLine = null
    }

    // Show rating modal for driver to rate rider
    const rName = currentRide?.rider_name || 'the rider'
    document.getElementById('rating-rider-name').textContent =
      `How was ${rName}?`

    // Reset stars to default 5
    document.querySelectorAll('#driver-star-rating span').forEach((s, i) => {
      s.classList.toggle('active', i < 5)
    })
    document.getElementById('driver-rating-comment').value = ''

    document.getElementById('rating-elements').classList.remove('hidden')
    document.getElementById('trip-summary-driver').classList.add('hidden')
    document.getElementById('driver-rating-modal').classList.add('active')

    loadEarnings()
  })

  /* ------------------------------------------------ */
  /* RATING SUBMIT (DRIVER rates RIDER)               */
  /* ------------------------------------------------ */

  document
    .getElementById('driver-submit-rating')
    .addEventListener('click', async () => {
      const activeCount = document.querySelectorAll(
        '#driver-star-rating span.active'
      ).length
      const score = activeCount > 0 ? activeCount : 5
      const comment = document
        .getElementById('driver-rating-comment')
        .value.trim()

      if (currentRide && driverId) {
        try {
          await fetch('/api/driver/rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ride_id: currentRide.ride_id,
              rated_user_id: currentRide.rider_id,
              rated_by_user_id: driverId,
              score,
              comment: comment || null,
            }),
          })
          socket.emit('submit_rating', {
            ride_id: currentRide.ride_id,
            rated_user_id: currentRide.rider_id,
            score,
            comment: comment || null,
            rated_by_name: driverName,
          })
        } catch (e) {
          console.error('Rating error', e)
        }
      }

      showToast('Rating submitted!')
      completeDriverTripSequence()
    })

  window.completeDriverTripSequence = () => {
    document.getElementById('rating-elements').classList.add('hidden')
    document.getElementById('trip-summary-driver').classList.remove('hidden')
  }

  /* ------------------------------------------------ */
  /* CLOSE RATING (SKIP)                              */
  /* ------------------------------------------------ */

  window.closeDriverRating = () => {
    completeDriverTripSequence()
  }

  window.finishDriverRide = () => {
    document.getElementById('driver-rating-modal').classList.remove('active')
    const summary = document.getElementById('trip-summary-driver')
    if (summary) summary.classList.add('hidden')
    currentRide = null
    rideSocketId = null
    endBtn.disabled = false
    loadPerformance()
  }

  /* ------------------------------------------------ */
  /* ANIMATE ROUTE                                    */
  /* ------------------------------------------------ */

  async function animateToLocation(start, end, color, rideSocket) {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
      )
      const data = await res.json()
      if (!data.routes?.length) return

      const coords = data.routes[0].geometry.coordinates.map((c) => [
        c[1],
        c[0],
      ])

      if (routeLine) map.removeLayer(routeLine)
      L.polyline(coords, { color: '#000', weight: 9, opacity: 0.2 }).addTo(map)
      routeLine = L.polyline(coords, { color, weight: 5, opacity: 0.95 }).addTo(
        map,
      )
      map.fitBounds(routeLine.getBounds(), { padding: [60, 60] })

      let i = 0
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (i >= coords.length) {
            clearInterval(interval)
            driverMarker.setLatLng(coords[coords.length - 1])
            resolve()
            return
          }
          const [lat, lng] = coords[i]
          driverMarker.setLatLng([lat, lng])
          if (rideSocket)
            socket.emit('driver_location_update', {
              lat,
              lng,
              ride_socket_id: rideSocket,
            })
          i += 3
        }, 120)
      })
    } catch (e) {
      console.error('Routing error:', e)
    }
  }

  /* ------------------------------------------------ */
  /* TAB SWITCHER                                     */
  /* ------------------------------------------------ */

  window.switchTab = (tabId, el) => {
    document
      .querySelectorAll('.nav-item')
      .forEach((n) => n.classList.remove('active'))
    el.classList.add('active')
    document
      .querySelectorAll('.floating-page')
      .forEach((p) => p.classList.remove('active'))
    const target = document.getElementById(tabId)
    if (target) target.classList.add('active')
  }

  /* ------------------------------------------------ */
  /* TOAST                                            */
  /* ------------------------------------------------ */

  function showToast(msg) {
    const container = document.getElementById('toast-container')
    if (!container) return
    const toast = document.createElement('div')
    toast.style.cssText = `
      background:rgba(15,23,42,0.9); backdrop-filter:blur(10px);
      color:#fff; padding:14px 22px; border-radius:12px;
      border:1px solid rgba(255,255,255,0.08); box-shadow:0 10px 20px rgba(0,0,0,0.4);
      font-family:'Plus Jakarta Sans',sans-serif; font-size:0.88rem;
    `
    toast.textContent = msg
    container.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(-10px)'
      toast.style.transition = 'all 0.4s ease'
      setTimeout(() => toast.remove(), 400)
    }, 4000)
  }
})
