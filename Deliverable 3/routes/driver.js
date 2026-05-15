/* ===================================================== */
/* DRIVER ROUTES — Earnings, Wallet, Payout, Profile     */
/* ===================================================== */

const express = require('express')
const router = express.Router()
const db = require('../config/db')

/* ----------------------------------------------------- */
/* GET /api/driver/earnings/:driver_id                   */
/* ----------------------------------------------------- */

router.get('/earnings/:driver_id', async (req, res) => {
  const { driver_id } = req.params
  try {
    const [summaryRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(gross_amount), 0)      AS total_gross,
        COALESCE(SUM(commission_amount), 0) AS total_commission,
        COALESCE(SUM(net_amount), 0)        AS net_earnings
      FROM driver_earnings
      WHERE driver_id = ?
    `,
      [driver_id],
    )

    const [recent] = await db.query(
      `
      SELECT de.*, r.requested_at, r.distance
      FROM driver_earnings de
      JOIN rides r ON de.ride_id = r.ride_id
      WHERE de.driver_id = ?
      ORDER BY de.earning_id DESC
      LIMIT 10
    `,
      [driver_id],
    )

    res.json({
      success: true,
      summary: summaryRows[0] || {
        total_gross: 0,
        total_commission: 0,
        net_earnings: 0,
      },
      recent,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/driver/wallet/:driver_id                     */
/* ----------------------------------------------------- */

router.get('/wallet/:driver_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT balance FROM wallet WHERE user_id = ?',
      [req.params.driver_id],
    )
    res.json({ success: true, balance: rows[0]?.balance ?? 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/driver/payout                               */
/* ----------------------------------------------------- */

router.post('/payout', async (req, res) => {
  const { driver_id, amount } = req.body
  if (!driver_id || !amount || parseFloat(amount) <= 0)
    return res
      .status(400)
      .json({ success: false, message: 'Invalid payout request.' })

  try {
    const [walletRows] = await db.query(
      'SELECT balance FROM wallet WHERE user_id = ?',
      [driver_id],
    )
    const balance = parseFloat(walletRows[0]?.balance ?? 0)

    if (balance < parseFloat(amount))
      return res
        .status(400)
        .json({ success: false, message: 'Insufficient wallet balance.' })

    await db.query(
      'INSERT INTO payout_request (driver_id, amount) VALUES (?, ?)',
      [driver_id, amount],
    )
    res.json({
      success: true,
      message: 'Payout request submitted. Admin will process it.',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* GET /api/driver/profile/:driver_id                    */
/* ----------------------------------------------------- */

router.get('/profile/:driver_id', async (req, res) => {
  const { driver_id } = req.params
  try {
    const [driverRows] = await db.query(
      `
      SELECT d.*, u.full_name, u.email, u.phone_number, u.account_status
      FROM driver d
      JOIN user u ON d.driver_id = u.user_id
      WHERE d.driver_id = ?
    `,
      [driver_id],
    )

    if (driverRows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: 'Driver not found.' })

    const [vehicles] = await db.query(
      'SELECT * FROM vehicle WHERE driver_id = ?',
      [driver_id],
    )

    res.json({ success: true, driver: driverRows[0], vehicles })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/driver/rating                               */
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
        'UPDATE rider SET average_rating = ? WHERE rider_id = ?',
        [parseFloat(ratingStats[0].average_rating || 0).toFixed(2), rated_user_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Rider rated successfully.' });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Already rated this ride.' });
    }
    console.error('Rating Error:', err);
    res.status(500).json({ success: false, message: 'An error occurred while processing the rating.' });
  } finally {
    connection.release();
  }
})

/* ----------------------------------------------------- */
/* GET /api/driver/history/:driver_id                    */
/* Returns ride_history rows with joined location names  */
/* ----------------------------------------------------- */

router.get('/history/:driver_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT rh.*,
             pl.address AS pickup_address,
             dl.address AS dropoff_address,
             u.full_name AS rider_name
      FROM ride_history rh
      JOIN location pl ON rh.pickup_loc_id = pl.location_id
      JOIN location dl ON rh.drop_loc_id   = dl.location_id
      LEFT JOIN user u ON rh.rider_id = u.user_id
      WHERE rh.driver_id = ?
      ORDER BY rh.archived_at DESC
      LIMIT 30
    `,
      [req.params.driver_id],
    )

    res.json({ success: true, history: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
