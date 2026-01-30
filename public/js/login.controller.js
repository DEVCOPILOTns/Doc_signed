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

// Mostrar modal de carga al enviar el formulario
loginForm.addEventListener('submit', (e) => {
  // Validar que los campos no estén vacíos
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    e.preventDefault();
    return;
  }

  // Mostrar el modal de carga
  if (loadingModal) {
    loadingModal.style.display = 'flex';
  }
});
