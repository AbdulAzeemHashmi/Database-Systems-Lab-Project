/* ===================================================== */
/* RIDER CLIENT JS — Map, Ride Flow, Payment, Rating     */
/* ===================================================== */

const socket = io()

let map, pickupMarker, dropoffMarker, routeLine, driverMarker
let pickupLatLng = null
let dropoffLatLng = null
let currentRideId = null
let promoApplied = null // { final_amount }

const riderId = parseInt(localStorage.getItem('user_id')) || null

if (riderId) {
  socket.emit('join_private_room', { user_id: riderId })
}

/* -------------------------------------------------- */
/* MAP INIT                                           */
/* -------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map', { zoomControl: false }).setView([33.6844, 73.0479], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  fetchBalance()

  const pickupIcon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #10b981;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  const dropoffIcon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #ef4444;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
  const driverIcon = L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;background:#d7d1b0;border:3px solid white;border-radius:50%;box-shadow:0 0 14px #d7d1b0;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  /* ------------------------------------------------ */
  /* LOCATION SEARCH AUTOCOMPLETE                     */
  /* ------------------------------------------------ */

  function setupAutocomplete(inputId, suggestionsId, onSelect) {
    const input = document.getElementById(inputId)
    const box = document.getElementById(suggestionsId)
    let timer

    input.addEventListener('input', () => {
      clearTimeout(timer)
      const q = input.value.trim()
      if (q.length < 3) {
        box.style.display = 'none'
        return
      }

      timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&viewbox=72.8,33.5,73.3,33.8&bounded=1`,
            { headers: { 'Accept-Language': 'en' } },
          )
          const data = await res.json()
          if (!data.length) {
            box.style.display = 'none'
            return
          }

          box.innerHTML = data
            .map(
              (p) => `
            <div class="suggestion-item" data-lat="${p.lat}" data-lng="${p.lon}">
              <span class="place-name">${p.display_name.split(',')[0]}</span>
              <span class="place-address">${p.display_name.split(',').slice(1, 3).join(',')}</span>
            </div>
          `,
            )
            .join('')
          box.style.display = 'block'

          box.querySelectorAll('.suggestion-item').forEach((item) => {
            item.addEventListener('click', () => {
              const lat = parseFloat(item.dataset.lat)
              const lng = parseFloat(item.dataset.lng)
              const name = item.querySelector('.place-name').textContent
              input.value = name
              box.style.display = 'none'
              onSelect({ lat, lng }, name)
            })
          })
        } catch (e) {
          console.error('Autocomplete error', e)
        }
      }, 350)
    })

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !box.contains(e.target))
        box.style.display = 'none'
    })
  }

  setupAutocomplete('pickup-input', 'pickup-suggestions', (latlng, name) => {
    pickupLatLng = latlng
    if (pickupMarker) map.removeLayer(pickupMarker)
    pickupMarker = L.marker([latlng.lat, latlng.lng], { icon: pickupIcon })
      .addTo(map)
      .bindPopup(`<b>Pickup:</b> ${name}`)
      .openPopup()
    tryDrawRoute()
  })

  setupAutocomplete('dropoff-input', 'dropoff-suggestions', (latlng, name) => {
    dropoffLatLng = latlng
    if (dropoffMarker) map.removeLayer(dropoffMarker)
    dropoffMarker = L.marker([latlng.lat, latlng.lng], { icon: dropoffIcon })
      .addTo(map)
      .bindPopup(`<b>Dropoff:</b> ${name}`)
      .openPopup()
    tryDrawRoute()
  })

  /* ------------------------------------------------ */
  /* ROUTE DRAWING                                    */
  /* ------------------------------------------------ */

  async function tryDrawRoute() {
    if (!pickupLatLng || !dropoffLatLng) return
    const dist = await drawRoute(pickupLatLng, dropoffLatLng, '#3b82f6', true)
    if (dist) {
      const fare = Math.floor(100 + dist * 40)
      document.getElementById('ride-estimate').textContent =
        `~${dist.toFixed(1)} km · Est. Fare: Rs. ${fare}`
    }
  }

  async function drawRoute(start, end, color, fitBoundsFlag) {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
      )
      const data = await res.json()
      if (!data.routes?.length) return null

      const coords = data.routes[0].geometry.coordinates.map((c) => [
        c[1],
        c[0],
      ])
      const distance = data.routes[0].distance / 1000

      if (routeLine) map.removeLayer(routeLine)
      L.polyline(coords, { color: '#000', weight: 9, opacity: 0.25 }).addTo(map)
      routeLine = L.polyline(coords, { color, weight: 5, opacity: 0.95 }).addTo(
        map,
      )
      if (fitBoundsFlag)
        map.fitBounds(routeLine.getBounds(), { padding: [60, 60] })
      return distance
    } catch (e) {
      console.error('Routing error', e)
      return null
    }
  }

  /* ------------------------------------------------ */
  /* HISTORY                                          */
  /* ------------------------------------------------ */

  window.showHistory = async () => {
    if (!riderId) return
    document.getElementById('history-modal').classList.add('active')
    const tbody = document.getElementById('history-table-body')
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:20px;color:#666;">Loading...</td></tr>'

    try {
      const res = await fetch(`/api/rider/history/${riderId}`)
      const data = await res.json()
      if (data.success) {
        if (!data.history || data.history.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;padding:20px;color:#666;">No rides yet.</td></tr>'
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
            <td style="color:#d7d1b0;font-weight:600;">Rs. ${r.fare || 0}</td>
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
      } else {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;padding:20px;color:#f00;">Error loading history.</td></tr>'
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
  /* REQUEST RIDE                                     */
  /* ------------------------------------------------ */

  document.getElementById('find-ride-btn').addEventListener('click', () => {
    if (!riderId) {
      alert('Please log in first.')
      return
    }
    if (!pickupLatLng || !dropoffLatLng) {
      alert('Please select both pickup and dropoff locations.')
      return
    }

    const pickup = document.getElementById('pickup-input').value.trim()
    const dropoff = document.getElementById('dropoff-input').value.trim()
    const dist = haversine(pickupLatLng, dropoffLatLng)
    const scheduledAt = document.getElementById('scheduled-at')?.value || null

    socket.emit('request_ride', {
      rider_id: riderId,
      pickup: pickupLatLng,
      dropoff: dropoffLatLng,
      pickup_address: pickup,
      dropoff_address: dropoff,
      distance: parseFloat(dist.toFixed(2)),
      scheduled_at: scheduledAt || null,
    })

    switchView('view-transit')
    document.getElementById('transit-status').textContent =
      'Looking for a driver...'
    document.getElementById('driver-details').innerHTML = `
      <i data-lucide="loader" style="animation:spin 2s linear infinite;color:#d7d1b0;width:32px;height:32px;"></i>
    `
    if (window.lucide) lucide.createIcons()
  })

  /* ------------------------------------------------ */
  /* CANCEL RIDE                                      */
  /* ------------------------------------------------ */

  window.cancelRide = () => {
    if (!riderId) return
    socket.emit('cancel_ride', { rider_id: riderId })
    switchView('view-booking')
    showToast('Ride request cancelled.')
  }

  /* ------------------------------------------------ */
  /* SOCKET EVENTS                                    */
  /* ------------------------------------------------ */

  socket.on('nearby_drivers', (positions) => {
    Object.values(positions).forEach((pos) => {
      L.marker([pos.lat, pos.lng], { icon: driverIcon }).addTo(map)
    })
  })

  socket.on('ride_error', (data) => {
    alert(data.message)
    switchView('view-booking')
  })

  socket.on('ride_accepted', async (data) => {
    document.getElementById('transit-status').textContent =
      'Driver is on the way!'
    document.getElementById('driver-details').innerHTML = `
      <p style="color:#d7d1b0;font-weight:700;font-size:1.1rem;margin-bottom:8px;">${data.driver_name}</p>
      <p style="color:#999;font-size:0.85rem;">${data.vehicle_info}</p>
    `
    if (data.driver_pos) {
      if (driverMarker) map.removeLayer(driverMarker)
      driverMarker = L.marker([data.driver_pos.lat, data.driver_pos.lng], {
        icon: driverIcon,
      })
        .addTo(map)
        .bindPopup(`${data.driver_name} is coming`)
        .openPopup()
      await drawRoute(data.driver_pos, pickupLatLng, '#d7d1b0', false)
    }
  })

  socket.on('driver_moved', (data) => {
    if (driverMarker) driverMarker.setLatLng([data.lat, data.lng])
  })

  socket.on('driver_arrived', () => {
    document.getElementById('transit-status').textContent =
      'Driver has arrived!'
    document.getElementById('driver-details').innerHTML = `
      <p style="color:#10b981;font-weight:600;">Your driver is waiting at the pickup point.</p>
    `
  })

  socket.on('trip_started', () => {
    document.getElementById('transit-status').textContent = 'In Transit'
    document.getElementById('driver-details').innerHTML = `
      <p style="color:#d7d1b0;font-weight:600;">Enjoy your ride! Heading to destination.</p>
    `
  })

  socket.on('prompt_payment', (data) => {
    currentRideId = data.ride_id
    const fare = data.fare
    document.getElementById('fare-amount').textContent = `Rs. ${fare}`
    document.getElementById('receipt-distance').textContent =
      dropoffLatLng && pickupLatLng
        ? `${haversine(pickupLatLng, dropoffLatLng).toFixed(1)} km`
        : '—'
    promoApplied = null
    document.getElementById('promo-msg').textContent = ''
    document.getElementById('promo-input').value = ''
    updateWalletHint()
    switchView('view-payment')
  })

  /* ------------------------------------------------ */
  /* PROMO CODE                                       */
  /* ------------------------------------------------ */

  window.applyPromo = async () => {
    const code = document.getElementById('promo-input').value.trim()
    if (!code) return
    const fareText = document.getElementById('fare-amount').textContent
    const origFare = parseFloat(
      fareText.replace('Rs.', '').replace(/,/g, '').trim(),
    )
    const msgEl = document.getElementById('promo-msg')

    // We'll do a lightweight lookup — piggy-back off the payment endpoint
    // Just validate visually; real deduction happens in /api/rider/payment
    try {
      const res = await fetch('/api/rider/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: riderId,
          ride_id: currentRideId,
          amount: origFare,
          method: 'promo_check_only', // won't match any payment trigger
          promo_code: code,
          dry_run: true, // we'll handle gracefully in route
        }),
      })
      const data = await res.json()
      if (data.success) {
        const discounted = parseFloat(data.finalAmount)
        document.getElementById('fare-amount').textContent =
          `Rs. ${discounted.toFixed(0)}`
        msgEl.style.color = '#10b981'
        msgEl.textContent = `✓ Promo applied! Saved Rs. ${(origFare - discounted).toFixed(0)}`
        promoApplied = { code, finalAmount: discounted }
      } else {
        msgEl.style.color = '#ef4444'
        msgEl.textContent = data.message || 'Invalid promo code.'
      }
    } catch {
      msgEl.style.color = '#ef4444'
      msgEl.textContent = 'Could not validate promo.'
    }
  }

  /* ------------------------------------------------ */
  /* PAYMENT                                          */
  /* ------------------------------------------------ */

  document
    .getElementById('payment-method')
    .addEventListener('change', updateWalletHint)

  function updateWalletHint() {
    const method = document.getElementById('payment-method')?.value
    const hintEl = document.getElementById('wallet-hint')
    if (!hintEl) return
    if (method === 'wallet') {
      const balText = document.getElementById('rider-balance').textContent
      hintEl.textContent = `Current wallet balance: ${balText}`
    } else {
      hintEl.textContent = ''
    }
  }

  document.getElementById('pay-btn').addEventListener('click', async () => {
    if (!riderId || !currentRideId) {
      alert('No active ride.')
      return
    }

    const fareText = document.getElementById('fare-amount').textContent
    const amount = parseFloat(
      fareText.replace('Rs.', '').replace(/,/g, '').trim(),
    )
    const method = document.getElementById('payment-method').value
    const promoCode = document.getElementById('promo-input').value.trim()

    const btn = document.getElementById('pay-btn')
    btn.disabled = true
    btn.textContent = 'Processing...'

    try {
      const res = await fetch('/api/rider/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: riderId,
          ride_id: currentRideId,
          amount,
          method,
          promo_code: promoCode || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchBalance()
        // Show rating modal next
        document.getElementById('rider-rating-modal').classList.add('active')
      } else {
        alert(data.message || 'Payment failed.')
        btn.disabled = false
        btn.textContent = 'Confirm Payment'
      }
    } catch (err) {
      alert('Payment failed. Please try again.')
      btn.disabled = false
      btn.textContent = 'Confirm Payment'
    }
  })

  /* ------------------------------------------------ */
  /* RATING SUBMIT                                    */
  /* ------------------------------------------------ */

  document
    .getElementById('rider-submit-rating')
    .addEventListener('click', async () => {
      const activeCount = document.querySelectorAll(
        '#rider-star-rating span.active'
      ).length
      const score = activeCount > 0 ? activeCount : 5
      const comment = document
        .getElementById('rider-rating-comment')
        .value.trim()

      if (currentRideId && riderId) {
        try {
          const info = await fetch(
            `/api/rider/ride-info/${currentRideId}`,
          ).then((r) => r.json())
          if (info.success && info.driver_id) {
            await fetch('/api/rider/rating', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ride_id: currentRideId,
                rated_user_id: info.driver_id,
                rated_by_user_id: riderId,
                score,
                comment: comment || null,
              }),
            })
            socket.emit('submit_rating', {
              ride_id: currentRideId,
              rated_user_id: info.driver_id,
              score,
              comment: comment || null,
              rated_by_name: localStorage.getItem('user_name'),
            })
          }
        } catch (e) {
          console.error('Rating error', e)
        }
      }

      document.getElementById('rider-rating-modal').classList.remove('active')
      showToast('<b>Thanks for your rating!</b> Have a great day.')
      setTimeout(() => window.location.reload(), 1200)
    })

  socket.on('incoming_rating', (data) => {
    showToast(`
      <div style="font-weight:600;color:#d7d1b0;">New Rating!</div>
      <div style="font-size:0.85rem;margin-top:4px;">${data.rated_by_name || 'Someone'} rated you ${'★'.repeat(data.score)}</div>
      ${data.comment ? `<div style="font-size:0.78rem;color:#aaa;margin-top:4px;">"${data.comment}"</div>` : ''}
    `)
  })

  /* ------------------------------------------------ */
  /* WALLET LOGIC                                     */
  /* ------------------------------------------------ */

  async function fetchBalance() {
    if (!riderId) return
    try {
      const res = await fetch(`/api/rider/balance/${riderId}`)
      const data = await res.json()
      if (data.success) {
        const bal = parseFloat(data.balance || 0)
        document.getElementById('rider-balance').textContent =
          `Rs. ${bal.toLocaleString()}`
        updateWalletHint()
      }
    } catch (err) {
      console.error('Balance error:', err)
    }
  }

  window.showTopUp = () => {
    document.getElementById('topup-modal').classList.add('active')
  }
  window.closeTopUp = () => {
    document.getElementById('topup-modal').classList.remove('active')
    document.getElementById('topup-msg').textContent = ''
  }

  document
    .getElementById('confirm-topup-btn')
    .addEventListener('click', async () => {
      const amount = parseFloat(document.getElementById('topup-amount').value)
      const msgEl = document.getElementById('topup-msg')
      if (!amount || amount <= 0 || amount > 100000) {
        msgEl.style.color = '#ef4444'
        msgEl.textContent = 'Please enter a valid amount (1 – 100,000).'
        return
      }
      const btn = document.getElementById('confirm-topup-btn')
      btn.disabled = true
      btn.textContent = 'Adding...'

      try {
        const res = await fetch('/api/rider/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rider_id: riderId, amount }),
        })
        const data = await res.json()
        if (data.success) {
          msgEl.style.color = '#10b981'
          msgEl.textContent = `✓ Rs. ${amount.toLocaleString()} added successfully!`
          fetchBalance()
          document.getElementById('topup-amount').value = ''
          setTimeout(() => {
            closeTopUp()
            btn.disabled = false
            btn.textContent = 'Add Funds'
          }, 1200)
        } else {
          msgEl.style.color = '#ef4444'
          msgEl.textContent = data.message || 'Top-up failed.'
          btn.disabled = false
          btn.textContent = 'Add Funds'
        }
      } catch {
        msgEl.style.color = '#ef4444'
        msgEl.textContent = 'Server error. Please try again.'
        btn.disabled = false
        btn.textContent = 'Add Funds'
      }
    })

  /* ------------------------------------------------ */
  /* HELPERS                                          */
  /* ------------------------------------------------ */

  function switchView(viewId) {
    document
      .querySelectorAll('.panel-view')
      .forEach((v) => v.classList.remove('active'))
    document.getElementById(viewId).classList.add('active')
  }

  function haversine(a, b) {
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  function showToast(html) {
    const container = document.getElementById('toast-container')
    const toast = document.createElement('div')
    toast.style.cssText = `
      padding:16px 24px; background:rgba(15,15,15,0.95); backdrop-filter:blur(12px);
      border:1px solid rgba(255,255,255,0.1); border-left:4px solid #d7d1b0;
      border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.5);
      color:white; font-family:'Plus Jakarta Sans',sans-serif; font-size:0.9rem;
      animation:fadeIn 0.3s ease;
    `
    toast.innerHTML = html
    container.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(-10px)'
      toast.style.transition = 'all 0.4s ease'
      setTimeout(() => toast.remove(), 400)
    }, 4000)
  }

  const style = document.createElement('style')
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  `
  document.head.appendChild(style)
})
