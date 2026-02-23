// src/auth/controllers/auth.controller.js
const { credentialsAreCorrect, findUserInAD } = require('../services/ldapAuth.service');
const { generateToken} = require('../services/jwt.service');
const AuthUserModel = require('../models/authUser.model');

exports.authRender = (req, res) => {
  res.render('auth/views/auth' , { pendingDocs, user: req.user });
}; //redireccionar a la vista de login

exports.login = async (req, res) => {
  const { username, password } = req.body;
  
  // Detectar si es una petición AJAX/API (solo si Content-Type es JSON)
  const isApiRequest = req.headers['content-type']?.includes('application/json');
  
  if (!username || !password) {
    if (isApiRequest) {
      return res.status(400).json({
        error: true,
        message: 'Por favor ingrese usuario y contraseña'
      });
    }
    return res.render('auth/views/auth', {
      error: 'Por favor ingrese usuario y contraseña'
    });
  }

  try {
    const userModel = new AuthUserModel();
    const users = await userModel.findByUsername(username);

    if (!users) {
      if (isApiRequest) {
        return res.status(401).json({
          error: true,
          message: 'Usuario no encontrado'
        });
      }
      return res.render('auth/views/auth', {
        error: 'Usuario no encontrado'
      });
    }

    // Validar credenciales
    const isValid = await credentialsAreCorrect(username, password);
    if (!isValid) {
      if (isApiRequest) {
        return res.status(401).json({
          error: true,
          message: 'Credenciales inválidas'
        });
      }
      return res.render('auth/views/auth', {
        error: 'Credenciales inválidas'
      });
    }

    // Obtener información del usuario desde AD
    const userInfoValid = await findUserInAD(username, password);
    if (!userInfoValid) {
      if (isApiRequest) {
        return res.status(401).json({
          error: true,
          message: 'No se encontró información del usuario'
        });
      }
      return res.render('auth/views/auth', {
        error: 'No se encontró información del usuario'
      });
    }

    // Generar token JWT (excluyendo memberOf)
    const {memberOf, ...user} = userInfoValid;
    const token = generateToken({...users, ...user});
    
    // Configurar cookie con el token JWT (1 hora)
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: false,  // Cambiar a true en producción con HTTPS
      maxAge: 3600000,
      sameSite: 'Lax'
    });
    
    console.log('Login exitoso para usuario:', username);
    console.log('Token generado correctamente');

    // Si es petición AJAX/API (JSON): devolver JSON
    if (isApiRequest) {
      return res.status(200).json({
        error: false,
        message: 'Login exitoso',
        user: {
          id: users.id_registro_usuarios,
          username: users.nombre_usuario,
          email: users.email || `${users.nombre_usuario}@newstetic.com`,
          nombre_completo: users.nombre_completo || user.cn,
          rol: users.id_rol
        },
        token: token  // El token también en el body para APIs
      });
    }

    // Si es formulario HTML: redirigir
    console.log('Petición desde navegador - Redirigiendo a dashboard');
    res.redirect('/api/index');

  } catch (error) {
    console.error('Error en login:', error);
    
    if (isApiRequest) {
      return res.status(500).json({
        error: true,
        message: 'Error en el servidor, por favor intente más tarde',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.render('auth/views/auth', {
      error: 'Error en el servidor, por favor intente más tarde'
    });
  }
};


// Controlador para manejar la autenticación y renderizado de vistas, este es el que recibe las peticiones del router
exports.logout = async (req, res) => {
  res.clearCookie('token'); // Limpia la cookie del token
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');// Evita el almacenamiento en caché
  res.set('Pragma', 'no-cache');// Evita el almacenamiento en caché
  res.set('Expires', '0'); // Evita el almacenamiento en caché
  res.redirect('/'); // Redirige al usuario a la página de login u otra página

}