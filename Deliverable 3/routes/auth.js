/* ===================================================== */
/* AUTH ROUTES — Login, Registration                     */
/* ===================================================== */

const express = require('express')
const router = express.Router()
const db = require('../config/db')
const bcrypt = require('bcryptjs')

/* ----------------------------------------------------- */
/* POST /api/auth/register                               */
/* ----------------------------------------------------- */

router.post('/register', async (req, res) => {
  try {
    const {
      role,
      full_name,
      email,
      phone_number,
      password,
      licence_no,
      cnic,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      license_plate,
      vehicle_type
    } = req.body

    // Basic Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing core user fields.' })
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' })
    }

    // Email validation — must be @gmail.com
    if (!email.match(/^[a-zA-Z0-9._-]+@gmail\.com$/)) {
      return res.status(400).json({ success: false, message: 'Email must be a valid @gmail.com address.' })
    }

    // Phone number validation (10 digits without 0 prefix, or 11 digits with leading 0, or +92 plus 10 digits)
    if (phone_number) {
      const phone = String(phone_number).trim()
      const validPhone =
        /^[1-9]\d{9}$/.test(phone) ||
        /^0\d{10}$/.test(phone) ||
        /^\+92\d{10}$/.test(phone)
      if (!validPhone) {
        return res.status(400).json({
          success: false,
          message:
            'Phone number must be 10 digits excluding leading 0 or +92',
        })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const connection = await db.getConnection()
    await connection.beginTransaction()
    
    try {
      // 1. Insert into User table
      const [userRes] = await connection.query(
        `INSERT INTO user (full_name, email, password_hash, role, phone_number) VALUES (?, ?, ?, ?, ?)`,
        [full_name, email, hashedPassword, role, phone_number || null]
      )
      const userId = userRes.insertId

      // 2. Handle Role-Specific Inserts
      if (role === 'driver') {
        if (!licence_no || !cnic || !vehicle_make || !vehicle_model || !vehicle_year || !license_plate || !vehicle_type) {
           throw new Error('Missing driver or vehicle fields.')
        }

        await connection.query(
          `INSERT INTO driver (driver_id, licence_no, cnic, verification_status, availability_status) VALUES (?, ?, ?, 'pending', 'offline')`,
          [userId, licence_no, cnic]
        )
        await connection.query(
          `INSERT INTO vehicle (driver_id, make, model, year, license_plate, vehicle_type, verification_status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [userId, vehicle_make, vehicle_model, vehicle_year, license_plate, vehicle_type]
        )
        await connection.query(`INSERT INTO wallet (user_id, balance) VALUES (?, 0)`, [userId])

      } else if (role === 'rider') {
        await connection.query(`INSERT INTO rider (rider_id) VALUES (?)`, [userId])
        await connection.query(`INSERT INTO wallet (user_id, balance) VALUES (?, 0)`, [userId])

      } else if (role === 'admin') {
        await connection.query(`INSERT INTO admin (admin_id) VALUES (?)`, [userId])
        await connection.query(`INSERT INTO wallet (user_id, balance) VALUES (?, 0)`, [userId])
      }

      await connection.commit()
      res.json({ success: true, user: { id: userId, role, name: full_name, email } })

    } catch (err) {
      await connection.rollback()
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Email, phone number, or CNIC/license already exists.' })
      }
      throw err
    } finally {
      connection.release()
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ----------------------------------------------------- */
/* POST /api/auth/login                                  */
/* ----------------------------------------------------- */

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' })
    }

    const [users] = await db.query(`SELECT * FROM user WHERE email = ? AND role = ?`, [email, role])
    
    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid credentials or wrong role portal.' })
    }

    const user = users[0]

    // Check if account is suspended or banned
    if (user.account_status === 'suspended' || user.account_status === 'banned') {
      return res.status(403).json({ success: false, message: `Your account is ${user.account_status}. Please contact support.` })
    }

    // Compare passwords (fallback to plaintext match if using old unhashed db)
    const isMatch = await bcrypt.compare(password, user.password_hash)
    const isPlainMatch = (password === user.password_hash)

    if (!isMatch && !isPlainMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' })
    }

    res.json({
      success: true,
      user: {
        id: user.user_id,
        role: user.role,
        name: user.full_name,
        email: user.email
      }
    })

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
