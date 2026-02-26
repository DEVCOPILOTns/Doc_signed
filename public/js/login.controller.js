const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const loginForm = document.getElementById('login-form');
const loadingModal = document.getElementById('loadingModal');

togglePassword.addEventListener('click', () => {
  const icon = togglePassword.querySelector('i');
  const isPassword = passwordInput.type === 'password';

  // Cambia el tipo del input
  passwordInput.type = isPassword ? 'text' : 'password';

  // Cambia el ícono (Font Awesome)
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});

// Manejar el envío del formulario de login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevenir envío por defecto
  
  // Validar que los campos no estén vacíos
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor ingresa usuario y contraseña',
      confirmButtonText: 'OK'
    });
    return;
  }

  // Mostrar el modal de carga
  if (loadingModal) {
    loadingModal.style.display = 'flex';
  }

  try {
    // Enviar login con fetch
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    // Ocultar modal de carga
    if (loadingModal) {
      loadingModal.style.display = 'none';
    }

    // Si el login fue exitoso
    if (response.ok && data.error === false) {
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Login exitoso, redirigiendo...',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        window.location.href = '/api/index';
      });
    } else {
      // Si hay error, mostrar el mensaje
      const errorMsg = data.message || 'Error al iniciar sesión';
      Swal.fire({
        icon: 'error',
        title: 'Error de login',
        text: errorMsg,
        confirmButtonText: 'Intentar de nuevo'
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    
    // Ocultar modal de carga
    if (loadingModal) {
      loadingModal.style.display = 'none';
    }

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al conectar con el servidor. Por favor intenta de nuevo.',
      confirmButtonText: 'OK'
    });
  }
});
