/* ===================================================== */
/* SERVER ENTRY POINT                                    */
/* ===================================================== */

require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const path = require('path')
const { Server } = require('socket.io')
const db = require('./config/db')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

/* ===================================================== */
/* MIDDLEWARE                                            */
/* ===================================================== */

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.redirect('/role.html'))
app.use(express.static(path.join(__dirname, 'public')))

/* ===================================================== */
/* API ROUTES                                           */
/* ===================================================== */

app.use('/api/auth', require('./routes/auth'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/rider', require('./routes/rider'))
app.use('/api/driver', require('./routes/driver'))

/* ===================================================== */
/* SOCKET STATE                                         */
/* ===================================================== */

// Map of driverId -> { socketId, lat, lng }
const onlineDrivers = new Map()
// Map of socketId -> driverId  (reverse lookup)
const socketToDriver = new Map()

/* ===================================================== */
/* REAL-TIME RIDE LOGIC (Socket.io)                     */
/* ===================================================== */

// Islamabad bounding box for random placement
const ISB = { minLat: 33.62, maxLat: 33.75, minLng: 72.98, maxLng: 73.12 }

function randomInIslamabad() {
  return {
    lat: ISB.minLat + Math.random() * (ISB.maxLat - ISB.minLat),
    lng: ISB.minLng + Math.random() * (ISB.maxLng - ISB.minLng),
  }
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

io.on('connection', (socket) => {
  socket.on('join_private_room', (data) => {
    if (data.user_id) {
      socket.join(`user_${data.user_id}`)
      console.log(`Socket ${socket.id} joined room user_${data.user_id}`)
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: go online                                  */
  /* -------------------------------------------------- */
  socket.on('driver_online', async (data) => {
    const driverId = data?.driver_id
    if (!driverId) return

    const pos = randomInIslamabad()
    onlineDrivers.set(driverId, { socketId: socket.id, ...pos })
    socketToDriver.set(socket.id, driverId)

    socket.join('available_drivers')
    console.log(`Driver ${driverId} online at`, pos)

    // Update DB
    try {
      await db.query(
        `UPDATE driver SET availability_status = 'online' WHERE driver_id = ?`,
        [driverId],
      )
    } catch (err) {
      console.error('DB online error:', err)
    }

    // Send driver their starting position
    socket.emit('driver_position_init', pos)
  })

  /* -------------------------------------------------- */
  /* DRIVER: go offline                                 */
  /* -------------------------------------------------- */
  socket.on('driver_offline', async (data) => {
    const driverId = data?.driver_id
    if (driverId) {
      onlineDrivers.delete(driverId)
      socketToDriver.delete(socket.id)
    }
    socket.leave('available_drivers')

    try {
      if (driverId)
        await db.query(
          `UPDATE driver SET availability_status = 'offline' WHERE driver_id = ?`,
          [driverId],
        )
    } catch (err) {
      console.error('DB offline error:', err)
    }
  })

  /* -------------------------------------------------- */
  /* RIDER: request ride                                */
  /* -------------------------------------------------- */
  socket.on('request_ride', async (data) => {
    console.log(`Ride requested by rider ${data.rider_id}`)
    try {
      const [pickupRes] = await db.query(
        `INSERT INTO location (address, latitude, longitude, city, country) VALUES (?, ?, ?, ?, ?)`,
        [
          data.pickup_address || 'Pickup',
          data.pickup.lat,
          data.pickup.lng,
          'Islamabad',
          'Pakistan',
        ],
      )
      const [dropRes] = await db.query(
        `INSERT INTO location (address, latitude, longitude, city, country) VALUES (?, ?, ?, ?, ?)`,
        [
          data.dropoff_address || 'Dropoff',
          data.dropoff.lat,
          data.dropoff.lng,
          'Islamabad',
          'Pakistan',
        ],
      )

      const distance =
        data.distance || parseFloat((Math.random() * 5 + 2).toFixed(1))

      const [rideRes] = await db.query(
        `INSERT INTO rides (rider_id, pickup_loc_id, drop_loc_id, ride_status, distance, scheduled_at) VALUES (?, ?, ?, 'requested', ?, ?)`,
        [
          data.rider_id,
          pickupRes.insertId,
          dropRes.insertId,
          distance,
          data.scheduled_at || null,
        ],
      )

      const rideId = rideRes.insertId

      // Broadcast to NEARBY available drivers (Expanding search for "Matching" requirement)
      let matchedDriverCount = 0
      const driverPositions = {}

      // Get rider name
      const [riderRows] = await db.query(
        'SELECT full_name FROM user WHERE user_id = ?',
        [data.rider_id],
      )
      const riderName = riderRows[0]?.full_name || 'Rider'

      // 1. Try 5km first
      onlineDrivers.forEach((info, dId) => {
        const d = haversine(data.pickup, { lat: info.lat, lng: info.lng })
        if (d <= 5.0) {
          matchedDriverCount++
          driverPositions[dId] = { lat: info.lat, lng: info.lng }
          io.to(info.socketId).emit('new_ride_request', {
            ride_socket_id: socket.id,
            ride_id: rideId,
            rider_id: data.rider_id,
            rider_name: riderName,
            pickup: data.pickup,
            dropoff: data.dropoff,
            pickup_address: data.pickup_address || 'Pickup Location',
            dropoff_address: data.dropoff_address || 'Dropoff Location',
            distance,
          })
        }
      })

      // 2. If no drivers within 5km, try up to 20km (fallback)
      if (matchedDriverCount === 0) {
        onlineDrivers.forEach((info, dId) => {
          const d = haversine(data.pickup, { lat: info.lat, lng: info.lng })
          if (d <= 20.0) {
            matchedDriverCount++
            driverPositions[dId] = { lat: info.lat, lng: info.lng }
            io.to(info.socketId).emit('new_ride_request', {
              ride_socket_id: socket.id,
              ride_id: rideId,
              rider_id: data.rider_id,
              rider_name: riderName,
              pickup: data.pickup,
              dropoff: data.dropoff,
              pickup_address: data.pickup_address || 'Pickup Location',
              dropoff_address: data.dropoff_address || 'Dropoff Location',
              distance,
            })
          }
        })
      }

      // 3. Notify rider of results
      if (matchedDriverCount === 0) {
        socket.emit('ride_error', {
          message: 'No online drivers available in your area at the moment.',
        })
      } else {
        socket.emit('nearby_drivers', driverPositions)
        console.log(
          `Ride #${rideId} broadcasted to ${matchedDriverCount} nearby drivers`,
        )
      }
    } catch (err) {
      console.error('Error creating ride:', err)
      socket.emit('ride_error', { message: 'Failed to create ride request.' })
    }
  })

  /* -------------------------------------------------- */
  /* RIDER: cancel ride                                 */
  /* -------------------------------------------------- */
  socket.on('cancel_ride', async (data) => {
    try {
      // Find the active ride for this rider
      const [rideRows] = await db.query(
        `SELECT ride_id, driver_id, ride_status FROM rides WHERE rider_id = ? AND ride_status IN ('requested', 'accepted', 'driver en route') ORDER BY ride_id DESC LIMIT 1`,
        [data.rider_id],
      )
      if (rideRows.length === 0) {
        socket.emit('ride_error', { message: 'No active ride to cancel.' })
        return
      }
      const ride = rideRows[0]

      // Update ride status to cancelled
      await db.query(
        `UPDATE rides SET ride_status = 'cancelled' WHERE ride_id = ?`,
        [ride.ride_id],
      )

      // Notify driver if assigned and set back to online
      if (ride.driver_id) {
        await db.query(
          `UPDATE driver SET availability_status = 'online' WHERE driver_id = ?`,
          [ride.driver_id],
        )
        io.to(`user_${ride.driver_id}`).emit('ride_cancelled', {
          ride_id: ride.ride_id,
          message: 'Rider cancelled the ride.',
        })
      }

      console.log(`Ride #${ride.ride_id} cancelled by rider ${data.rider_id}`)
    } catch (err) {
      console.error('Error cancelling ride:', err)
      socket.emit('ride_error', { message: 'Failed to cancel ride.' })
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: accept ride                                */
  /* -------------------------------------------------- */
  socket.on('accept_ride', async (data) => {
    try {
      const [vehicles] = await db.query(
        `SELECT vehicle_id, make, model, license_plate FROM vehicle WHERE driver_id = ? AND verification_status = 'verified' LIMIT 1`,
        [data.driver_id],
      )
      const vehicle = vehicles.length > 0 ? vehicles[0] : null

      if (!vehicle) {
        socket.emit('ride_error', {
          message:
            'No verified vehicle found. Admin must verify your vehicle first.',
        })
        return
      }

      await db.query(
        `UPDATE rides SET driver_id = ?, vehicle_id = ?, ride_status = 'accepted' WHERE ride_id = ?`,
        [data.driver_id, vehicle.vehicle_id, data.ride_id],
      )

      // Get driver's current position
      const driverInfo = onlineDrivers.get(data.driver_id)
      const driverPos = driverInfo
        ? { lat: driverInfo.lat, lng: driverInfo.lng }
        : randomInIslamabad()

      // Notify rider
      io.to(data.ride_socket_id).emit('ride_accepted', {
        driver_name: data.driver_name || 'Driver',
        driver_id: data.driver_id,
        vehicle_info: `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`,
        driver_pos: driverPos,
        ride_id: data.ride_id,
      })

      // Remove driver from available pool
      socket.leave('available_drivers')

      console.log(`Ride #${data.ride_id} accepted by driver ${data.driver_id}`)
    } catch (err) {
      console.error('Error accepting ride:', err)
      if (err.sqlState === '45000') {
        socket.emit('ride_error', { message: err.sqlMessage })
      }
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: location update (sent during trip)         */
  /* -------------------------------------------------- */
  socket.on('driver_location_update', (data) => {
    // Forward real-time position to the rider
    if (data.ride_socket_id) {
      io.to(data.ride_socket_id).emit('driver_moved', {
        lat: data.lat,
        lng: data.lng,
      })
    }
    // Update in-memory position
    const driverId = socketToDriver.get(socket.id)
    if (driverId && onlineDrivers.has(driverId)) {
      onlineDrivers.get(driverId).lat = data.lat
      onlineDrivers.get(driverId).lng = data.lng
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: arrived at pickup                          */
  /* -------------------------------------------------- */
  socket.on('driver_arrived', async (data) => {
    try {
      await db.query(
        `UPDATE rides SET ride_status = 'driver en route' WHERE ride_id = ?`,
        [data.ride_id],
      )
      io.to(data.ride_socket_id).emit('driver_arrived', {})
    } catch (err) {
      console.error('Error arriving:', err)
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: start trip                                 */
  /* -------------------------------------------------- */
  socket.on('start_trip', async (data) => {
    try {
      await db.query(
        `UPDATE rides SET ride_status = 'in progress', started_at = CURRENT_TIMESTAMP WHERE ride_id = ?`,
        [data.ride_id],
      )

      // Notify Rider
      if (data.ride_socket_id) {
        io.to(data.ride_socket_id).emit('trip_started', {
          ride_id: data.ride_id,
        })
      }

      console.log(`Ride #${data.ride_id} started.`)
    } catch (err) {
      console.error('Error starting trip:', err)
    }
  })

  /* -------------------------------------------------- */
  /* DRIVER: complete ride                              */
  /* -------------------------------------------------- */
  socket.on('ride_completed', async (data) => {
    try {
      // 1. Get ride details for fare calculation
      const [rideRows] = await db.query(
        `
        SELECT r.*, v.vehicle_type 
        FROM rides r
        JOIN vehicle v ON r.vehicle_id = v.vehicle_id
        WHERE r.ride_id = ?`,
        [data.ride_id],
      )

      const ride = rideRows[0]
      if (!ride || ride.ride_status === 'completed') {
        console.warn(`Ride #${data.ride_id} already completed or not found.`)
        return
      }

      // Calculate real duration
      const duration = Math.max(
        1,
        Math.floor(
          (new Date() - new Date(ride.started_at || Date.now())) / 60000,
        ),
      )

      // Determine if surge applies
      const hour = new Date().getHours()
      const isSurge = hour >= 18 && hour <= 23 ? 1 : 0

      // 2. Call DB Stored Procedure for Fare Calculation
      let final_fare = 0
      try {
        await db.query('CALL sp_calculate_fare(?, ?, ?, ?, ?, @final_fare)', [
          'Islamabad',
          ride.vehicle_type,
          ride.distance,
          duration,
          isSurge,
        ])
        const [[{ fare_res }]] = await db.query(
          'SELECT @final_fare as fare_res',
        )
        final_fare =
          fare_res || Math.floor(100 + ride.distance * 40 + duration * 5)
      } catch (e) {
        final_fare = Math.floor(100 + ride.distance * 40 + duration * 5)
      }

      // 3. Update DB Status (Atomic check)
      const [updateRes] = await db.query(
        `UPDATE rides SET ride_status = 'completed', end_time = CURRENT_TIMESTAMP,
         fare = ?,
         started_at = IFNULL(started_at, CURRENT_TIMESTAMP),
         duration_in_minutes = ?
         WHERE ride_id = ? AND ride_status != 'completed'`,
        [final_fare, duration, data.ride_id],
      )

      if (updateRes.affectedRows === 0) {
        console.warn(`Ride #${data.ride_id} was already updated to completed.`)
        return
      }

      // Driver earnings, wallet update, and total_trips are handled automatically by DB triggers
      // (trg_generate_earnings_on_completion, trg_credit_driver_wallet, trg_ride_completed)

      // 4. Notify Rider (using private room for reliability)
      io.to(`user_${ride.rider_id}`).emit('prompt_payment', {
        fare: final_fare,
        ride_id: data.ride_id,
      })

      // 5. Notify Driver (using private room for reliability)
      io.to(`user_${ride.driver_id}`).emit('ride_completed_summary', {
        fare: final_fare,
        ride_id: data.ride_id,
        duration: duration || 0,
      })

      const driverId = socketToDriver.get(socket.id)
      if (driverId) socket.join('available_drivers')

      console.log(`Ride #${data.ride_id} completed. Fare: Rs. ${final_fare}`)
    } catch (err) {
      console.error('Error completing ride:', err)
    }
  })

  /* -------------------------------------------------- */
  /* RATINGS: Relay in real-time                        */
  /* -------------------------------------------------- */
  socket.on('submit_rating', (data) => {
    // data: { ride_id, rated_user_id, score, comment, rated_by_name }
    const target = onlineDrivers.get(data.rated_user_id)
    if (target && target.socketId) {
      io.to(target.socketId).emit('incoming_rating', data)
    }
    // Also notify if it's a rider (though we don't track rider sockets as strictly,
    // we could broadcast to a room named after the user_id)
    io.to(`user_${data.rated_user_id}`).emit('incoming_rating', data)
  })

  /* -------------------------------------------------- */
  /* DISCONNECT                                         */
  /* -------------------------------------------------- */
  socket.on('disconnect', async () => {
    const driverId = socketToDriver.get(socket.id)
    if (driverId) {
      onlineDrivers.delete(driverId)
      socketToDriver.delete(socket.id)
      try {
        await db.query(
          `UPDATE driver SET availability_status = 'offline' WHERE driver_id = ?`,
          [driverId],
        )
      } catch (err) {
        console.error('Disconnect DB error:', err)
      }
      console.log(`Driver ${driverId} disconnected`)
    } else {
      console.log(`Socket disconnected: ${socket.id}`)
    }
  })
})

/* ===================================================== */
/* START SERVER                                         */
/* ===================================================== */

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`\n======================================`)
  console.log(`RideFlow System Online`)
  console.log(`Running on: http://localhost:${PORT}`)
  console.log(`======================================\n`)
})
