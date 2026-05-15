/* ===================================================== */
/* ADMIN ROUTES — Dashboard, Approvals, Finance, Promos  */
/* ===================================================== */

const express = require('express')
const router = express.Router()
const db = require('../config/db')

/* ----------------------------------------------------- */
/* GET /api/admin/stats                                  */
/* ----------------------------------------------------- */

router.get('/stats', async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM user')
    const [activeRides] = await db.query(
      `SELECT COUNT(*) as count FROM rides WHERE ride_status IN ('requested','accepted','driver en route','in progress')`,
    )
    const [revenue] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payment WHERE status = 'completed'`,
    )
    const [commission] = await db.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total FROM driver_earnings`,
    )
    const [alerts] = await db.query(
      `SELECT * FROM admin_notification ORDER BY created_at DESC LIMIT 10`,
    )

    res.json({
      success: true,
      stats: {
        totalUsers: userCount[0].count,
        activeRides: activeRides[0].count,
        totalRevenue: revenue[0].total,
        totalCommission: commission[0].total,
      },
      alerts,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/admin/pending-drivers                        */
/* ----------------------------------------------------- */

router.get('/pending-drivers', async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT d.driver_id, u.full_name, d.cnic, d.licence_no,
             v.make, v.model, v.year, v.license_plate, v.vehicle_type
      FROM driver d
      JOIN user u ON d.driver_id = u.user_id
      LEFT JOIN vehicle v ON d.driver_id = v.driver_id
      WHERE d.verification_status = 'pending'
    `)
    res.json({ success: true, drivers })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/admin/verify-driver                         */
/* ----------------------------------------------------- */

router.post('/verify-driver', async (req, res) => {
  const { driver_id, status } = req.body
  if (!driver_id || !status)
    return res
      .status(400)
      .json({ success: false, message: 'driver_id and status required.' })

  try {
    const connection = await db.getConnection()
    await connection.beginTransaction()
    try {
      await connection.query(
        `UPDATE driver SET verification_status = ? WHERE driver_id = ?`,
        [status, driver_id],
      )
      await connection.query(
        `UPDATE vehicle SET verification_status = ? WHERE driver_id = ?`,
        [status, driver_id],
      )
      await connection.commit()
      res.json({ success: true, message: `Driver ${status} successfully.` })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/admin/payouts                                */
/* ----------------------------------------------------- */

router.get('/payouts', async (req, res) => {
  try {
    const [payouts] = await db.query(`
      SELECT p.*, u.full_name
      FROM payout_request p
      JOIN user u ON p.driver_id = u.user_id
      WHERE p.status = 'pending'
      ORDER BY p.requested_at DESC
    `)
    res.json({ success: true, payouts })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/admin/process-payout                        */
/* ----------------------------------------------------- */

router.post('/process-payout', async (req, res) => {
  const { payout_id, status } = req.body
  if (!payout_id || !status)
    return res
      .status(400)
      .json({ success: false, message: 'payout_id and status required.' })

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const [payoutRows] = await connection.query(
      'SELECT driver_id, amount, status FROM payout_request WHERE payout_id = ? FOR UPDATE',
      [payout_id],
    )

    if (payoutRows.length === 0) {
      await connection.rollback()
      connection.release()
      return res
        .status(404)
        .json({ success: false, message: 'Payout request not found.' })
    }

    const payout = payoutRows[0]
    if (payout.status === 'paid') {
      await connection.rollback()
      connection.release()
      return res
        .status(400)
        .json({ success: false, message: 'This payout has already been processed.' })
    }

    if (status === 'paid') {
      const [walletRows] = await connection.query(
        'SELECT balance FROM wallet WHERE user_id = ? FOR UPDATE',
        [payout.driver_id],
      )
      const balance = parseFloat(walletRows[0]?.balance ?? 0)

      if (balance < parseFloat(payout.amount)) {
        await connection.rollback()
        connection.release()
        return res
          .status(400)
          .json({ success: false, message: 'Driver wallet balance is insufficient to process this payout.' })
      }

      await connection.query(
        'UPDATE wallet SET balance = balance - ? WHERE user_id = ?',
        [payout.amount, payout.driver_id],
      )
    }

    await connection.query(
      `UPDATE payout_request SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE payout_id = ?`,
      [status, payout_id],
    )

    await connection.commit()
    connection.release()
    res.json({ success: true, message: `Payout marked as ${status}.` })
  } catch (err) {
    await connection.rollback()
    connection.release()
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/admin/promos                                 */
/* ----------------------------------------------------- */

router.get('/promos', async (req, res) => {
  try {
    const [promos] = await db.query(`
      SELECT p.*, u.full_name as created_by
      FROM promo_code p
      JOIN admin a ON p.admin_id = a.admin_id
      JOIN user u ON a.admin_id = u.user_id
      ORDER BY p.promo_id DESC
    `)
    res.json({ success: true, promos })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/admin/promos                                */
/* ----------------------------------------------------- */

router.post('/promos', async (req, res) => {
  const {
    admin_id,
    code,
    discount_type,
    discount_value,
    usage_limit,
    expiry_date,
    min_fare,
  } = req.body
  if (!admin_id || !code || !discount_type || !discount_value || !expiry_date)
    return res
      .status(400)
      .json({ success: false, message: 'Missing required fields.' })

  try {
    await db.query(
      `INSERT INTO promo_code (admin_id, code, discount_type, discount_value, usage_limit, expiry_date, min_fare)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        admin_id,
        code.toUpperCase(),
        discount_type,
        discount_value,
        usage_limit || 100,
        expiry_date,
        min_fare || 0,
      ],
    )
    res.json({ success: true, message: 'Promo code created.' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res
        .status(400)
        .json({ success: false, message: 'Promo code already exists.' })
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/admin/revenue-report                         */
/* ----------------------------------------------------- */

router.get('/revenue-report', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM vw_revenue_by_city ORDER BY payment_date DESC LIMIT 50`,
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/revenue-method', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM vw_revenue_by_method`)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
          l.city,
          u.full_name,
          d.average_rating,
          d.total_trips
       FROM driver d
       JOIN user u ON d.driver_id = u.user_id
       JOIN rides r ON r.driver_id = d.driver_id
       JOIN location l ON r.pickup_loc_id = l.location_id
       WHERE d.verification_status = 'verified'
       GROUP BY l.city, d.driver_id, u.full_name, d.average_rating, d.total_trips
       ORDER BY l.city, d.average_rating DESC
       LIMIT 50`,
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* FARE RULES — uses correct column names from schema    */
/* Schema: base_rate, per_km_rate, per_minute_rate       */
/* ----------------------------------------------------- */

router.get('/fares', async (req, res) => {
  try {
    const [fares] = await db.query(
      'SELECT * FROM fare_pricing ORDER BY city, vehicle_type',
    )
    res.json({ success: true, fares })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* POST /api/admin/update-fare */
router.post('/update-fare', async (req, res) => {
  const {
    pricing_id,
    base_rate,
    per_km_rate,
    per_minute_rate,
    surge_multiplier,
  } = req.body
  if (!pricing_id)
    return res
      .status(400)
      .json({ success: false, message: 'pricing_id required.' })

  try {
    // Build dynamic update so caller can update only what they send
    const fields = []
    const values = []

    if (base_rate !== undefined) {
      fields.push('base_rate = ?')
      values.push(parseFloat(base_rate))
    }
    if (per_km_rate !== undefined) {
      fields.push('per_km_rate = ?')
      values.push(parseFloat(per_km_rate))
    }
    if (per_minute_rate !== undefined) {
      fields.push('per_minute_rate = ?')
      values.push(parseFloat(per_minute_rate))
    }
    if (surge_multiplier !== undefined) {
      fields.push('surge_multiplier = ?')
      values.push(parseFloat(surge_multiplier))
    }

    if (fields.length === 0)
      return res
        .status(400)
        .json({ success: false, message: 'No fields to update.' })

    values.push(pricing_id)
    await db.query(
      `UPDATE fare_pricing SET ${fields.join(', ')} WHERE pricing_id = ?`,
      values,
    )
    res.json({ success: true, message: 'Fare rule updated successfully.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* POST /api/admin/add-fare — add a new city/type rule */
router.post('/add-fare', async (req, res) => {
  const {
    city,
    vehicle_type,
    base_rate,
    per_km_rate,
    per_minute_rate,
    surge_multiplier,
  } = req.body
  if (
    !city ||
    !vehicle_type ||
    base_rate === undefined ||
    per_km_rate === undefined ||
    per_minute_rate === undefined
  )
    return res.status(400).json({
      success: false,
      message:
        'city, vehicle_type, base_rate, per_km_rate, per_minute_rate required.',
    })

  try {
    await db.query(
      `INSERT INTO fare_pricing (city, vehicle_type, base_rate, per_km_rate, per_minute_rate, surge_multiplier)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        city,
        vehicle_type,
        base_rate,
        per_km_rate,
        per_minute_rate,
        surge_multiplier || 1.0,
      ],
    )
    res.json({ success: true, message: 'Fare rule added.' })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({
        success: false,
        message: 'Fare rule for this city+type already exists.',
      })
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
