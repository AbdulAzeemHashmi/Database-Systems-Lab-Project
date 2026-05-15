/* ===================================================== */
/* AUTH CLIENT — Login + Registration forms              */
/* ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  /* ---- Helper ---- */
  const showError = (msg) => {
    const el = document.getElementById('error-msg')
    if (el) {
      el.innerText = msg
      el.style.display = 'block'
    } else alert(msg)
  }

  const page = window.location.pathname.split('/').pop() || 'index.html'

  /* ================================================= */
  /* INDEX.HTML — Role-aware Sign In / Create Account  */
  /* ================================================= */

  if (page === 'index.html' || page === '') {
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role') || 'rider'
    const portalSubtitle = document.getElementById('portal-subtitle')
    const btnLogin = document.getElementById('btn-login')
    const btnRegister = document.getElementById('btn-register')

    if (portalSubtitle) portalSubtitle.innerText = `${capitalize(role)} Portal`

    if (btnLogin) btnLogin.href = `login.html?role=${role}`
    if (btnRegister)
      btnRegister.href =
        role === 'driver' ? 'register-driver.html' : 'register-rider.html'
  }

  /* ================================================= */
  /* LOGIN.HTML — Rider / Driver login                 */
  /* ================================================= */

  if (page === 'login.html') {
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role') || 'rider'

    const roleField = document.getElementById('role')
    const portalTitle = document.getElementById('portal-title')
    const regLink = document.getElementById('dynamic-register-link')

    if (roleField) roleField.value = role
    if (portalTitle) portalTitle.innerText = `${capitalize(role)} Login`
    if (regLink)
      regLink.href =
        role === 'driver' ? 'register-driver.html' : 'register-rider.html'

    const loginForm = document.getElementById('login-form')
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await doLogin(
          document.getElementById('email').value.trim(),
          document.getElementById('password').value,
          role,
        )
      })
    }
  }

  /* ================================================= */
  /* LOGINADMIN.HTML — Admin login                     */
  /* ================================================= */

  if (page === 'loginAdmin.html') {
    const loginForm = document.getElementById('login-form')
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await doLogin(
          document.getElementById('email').value.trim(),
          document.getElementById('password').value,
          'admin',
        )
      })
    }
  }

  /* ---- Shared login logic ---- */
  async function doLogin(email, password, role) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('user_id', data.user.id)
        localStorage.setItem('user_role', data.user.role)
        localStorage.setItem('user_name', data.user.name)
        localStorage.setItem('user_email', data.user.email)

        if (data.user.role === 'admin') window.location.href = '/admin.html'
        else if (data.user.role === 'driver')
          window.location.href = '/driver.html'
        else window.location.href = '/rider.html'
      } else {
        showError(data.message)
      }
    } catch {
      showError('Server connection failed. Is the server running?')
    }
  }

  /* ================================================= */
  /* REGISTER-RIDER.HTML                               */
  /* ================================================= */

  if (page === 'register-rider.html') {
    const form = document.getElementById('rider-register-form')
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'rider',
              full_name: document.getElementById('full_name').value.trim(),
              email: document.getElementById('email').value.trim(),
              phone_number: document
                .getElementById('phone_number')
                .value.trim(),
              password: document.getElementById('password').value,
            }),
          })
          const data = await res.json()
          if (data.success) {
            localStorage.setItem('user_id', data.user.id)
            localStorage.setItem('user_role', data.user.role)
            localStorage.setItem('user_name', data.user.name)
            window.location.href = '/rider.html'
          } else {
            showError(data.message)
          }
        } catch {
          showError('Server connection failed.')
        }
      })
    }
  }

  /* ================================================= */
  /* REGISTER-DRIVER.HTML                              */
  /* ================================================= */

  if (page === 'register-driver.html') {
    const form = document.getElementById('driver-register-form')
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'driver',
              full_name: document.getElementById('full_name').value.trim(),
              email: document.getElementById('email').value.trim(),
              phone_number: document
                .getElementById('phone_number')
                .value.trim(),
              licence_no: document.getElementById('licence_no').value.trim(),
              cnic: document.getElementById('cnic').value.trim(),
              password: document.getElementById('password').value,
              vehicle_make: document
                .getElementById('vehicle_make')
                .value.trim(),
              vehicle_model: document
                .getElementById('vehicle_model')
                .value.trim(),
              vehicle_year: parseInt(
                document.getElementById('vehicle_year').value,
              ),
              license_plate: document
                .getElementById('license_plate')
                .value.trim(),
              vehicle_type: document.getElementById('vehicle_type').value, // 'economy'|'premium'|'bike'
            }),
          })
          const data = await res.json()
          if (data.success) {
            localStorage.setItem('user_id', data.user.id)
            localStorage.setItem('user_role', data.user.role)
            localStorage.setItem('user_name', data.user.name)
            // Show pending notice before redirect
            alert(
              'Registration successful! Your account is pending admin approval. You can log in but cannot accept rides until approved.',
            )
            window.location.href = '/driver.html'
          } else {
            showError(data.message)
          }
        } catch {
          showError('Server connection failed.')
        }
      })
    }
  }

  /* ---- Utility ---- */
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
})
