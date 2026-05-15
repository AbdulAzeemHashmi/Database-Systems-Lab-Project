/* ===================================================== */
/* RIDER ROUTES — History, Payment, Rating, Wallet       */
/* ===================================================== */

const express = require('express')
const router = express.Router()
const db = require('../config/db')

/* ----------------------------------------------------- */
/* GET /api/rider/history/:rider_id                      */
/* ----------------------------------------------------- */

router.get('/history/:rider_id', async (req, res) => {
  const { rider_id } = req.params
  try {
    const [rows] = await db.query(
      `SELECT rh.*,
              pl.address AS pickup_address,  pl.city AS pickup_city,
              dl.address AS dropoff_address,
              u.full_name AS driver_name
       FROM ride_history rh
       JOIN location pl ON rh.pickup_loc_id = pl.location_id
       JOIN location dl ON rh.drop_loc_id   = dl.location_id
       LEFT JOIN user u ON rh.driver_id = u.user_id
       WHERE rh.rider_id = ?
       ORDER BY rh.archived_at DESC
       LIMIT 30`,
      [rider_id],
    )
    res.json({ success: true, history: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/rider/payment                               */
/* Supports dry_run=true for promo validation            */
/* Payment method values: 'cash' | 'credit card' |'wallet'*/
/* ----------------------------------------------------- */

router.post('/payment', async (req, res) => {
  const { rider_id, ride_id, amount, method, promo_code, dry_run } = req.body

  let connection;
  try {
    let promo_id = null
    let finalAmount = parseFloat(amount)

    connection = await db.getConnection();
    await connection.beginTransaction();

    // ---- Promo lookup ----
    if (promo_code) {
      const [promos] = await connection.query(
        `SELECT * FROM promo_code
         WHERE code = ? AND expiry_date > NOW() AND usage_count < usage_limit FOR UPDATE`,
        [promo_code.toUpperCase()],
      )
      if (promos.length === 0) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ success: false, message: 'Invalid, expired, or fully used promo code.' })
      }

      const promo = promos[0]
      promo_id = promo.promo_id

      if (promo.discount_type === 'percentage') {
        finalAmount = finalAmount - (finalAmount * promo.discount_value) / 100
      } else {
        finalAmount = Math.max(0, finalAmount - promo.discount_value)
      }
      finalAmount = parseFloat(finalAmount.toFixed(2))
    }

    // ---- Dry run: just return discounted amount, don't write ----
    if (dry_run) {
      await connection.rollback();
      connection.release();
      return res.json({ success: true, finalAmount: finalAmount.toFixed(2) })
    }

    // ---- Validate required fields for real payment ----
    if (!rider_id || !ride_id || !method) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'rider_id, ride_id and method are required.',
      })
    }

    const methodMap = {
      cash: 'cash',
      'pay via cash': 'cash',
      wallet: 'wallet',
      'pay via wallet': 'wallet',
      'credit card': 'credit card',
      'credit/debit card': 'credit card',
    }
    const dbMethod = methodMap[(method || '').toLowerCase()] || 'cash'

    // ---- Wallet balance check ----
    if (dbMethod === 'wallet') {
      const [wallet] = await connection.query(
        'SELECT balance FROM wallet WHERE user_id = ? FOR UPDATE',
        [rider_id],
      )
      if (!wallet[0] || parseFloat(wallet[0].balance) < finalAmount) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ success: false, message: 'Insufficient wallet balance.' })
      }
    }

    // ---- Check ride isn't already paid ----
    const [existing] = await connection.query(
      'SELECT payment_id FROM payment WHERE ride_id = ? FOR UPDATE',
      [ride_id],
    )
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(400)
        .json({ success: false, message: 'This ride has already been paid.' })
    }

    // ---- Insert payment ----
    await connection.query(
      `INSERT INTO payment (rider_id, ride_id, promo_id, amount, method, status)
       VALUES (?, ?, ?, ?, ?, 'completed')`,
      [rider_id, ride_id, promo_id, finalAmount, dbMethod],
    )

    // ---- Increment promo usage ----
    if (promo_id) {
      await connection.query(
        'UPDATE promo_code SET usage_count = usage_count + 1 WHERE promo_id = ?',
        [promo_id],
      )
    }

    await connection.commit();
    connection.release();
    res.json({ success: true, finalAmount: finalAmount.toFixed(2) })
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Payment Error:', err);
    res.status(500).json({ success: false, message: 'An internal error occurred processing payment.' })
  }
})

/* ----------------------------------------------------- */
/* POST /api/rider/rating                                */
/* ----------------------------------------------------- */

router.post('/rating', async (req, res) => {
  const { ride_id, rated_user_id, rated_by_user_id, score, comment } = req.body
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO rating (ride_id, rated_user_id, rated_by_user_id, score, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [ride_id, rated_user_id, rated_by_user_id, score, comment || null],
    );

    const [ratingStats] = await connection.query(
      'SELECT COUNT(*) AS total_reviews, AVG(score) AS average_rating FROM rating WHERE rated_user_id = ?',
      [rated_user_id]
    );

    if (ratingStats.length > 0) {
      await connection.query(
        'UPDATE driver SET average_rating = ? WHERE driver_id = ?',
        [parseFloat(ratingStats[0].average_rating || 0).toFixed(2), rated_user_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Rating submitted.' });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'You have already rated this ride.' });
    }
    console.error('Rating Error:', err);
    res.status(500).json({ success: false, message: 'An error occurred while processing the rating.' });
  } finally {
    connection.release();
  }
})

/* ----------------------------------------------------- */
/* GET /api/rider/wallet/:user_id                        */
/* ----------------------------------------------------- */

router.get('/wallet/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT balance FROM wallet WHERE user_id = ?',
      [req.params.user_id],
    )
    res.json({ success: true, balance: rows[0]?.balance ?? 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/rider/balance/:rider_id                      */
/* ----------------------------------------------------- */

router.get('/balance/:rider_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT balance FROM wallet WHERE user_id = ?',
      [req.params.rider_id],
    )
    res.json({ success: true, balance: rows[0]?.balance ?? 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/rider/topup                                 */
/* ----------------------------------------------------- */

router.post('/topup', async (req, res) => {
  const { rider_id, amount } = req.body
  if (!rider_id || !amount || parseFloat(amount) <= 0)
    return res
      .status(400)
      .json({ success: false, message: 'Invalid top-up request.' })

  try {
    const result = await db.query(
      'UPDATE wallet SET balance = balance + ? WHERE user_id = ?',
      [parseFloat(amount), rider_id],
    )
    if (result[0].affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: 'Wallet not found for this rider.' })

    res.json({ success: true, message: `Rs. ${amount} added to wallet.` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/rider/ride-info/:ride_id                     */
/* ----------------------------------------------------- */

router.get('/ride-info/:ride_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT driver_id, rider_id, vehicle_id, ride_status FROM rides WHERE ride_id = ?',
      [req.params.ride_id],
    )
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: 'Ride not found.' })
    res.json({ success: true, ...rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
