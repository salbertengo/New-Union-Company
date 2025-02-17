// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key'; // En producción, usar variable de entorno

/**
 * JWT authentication middleware
 * Checks for a valid JWT token in the Authorization header (Bearer <token>).
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    // Responde 401 si no hay token
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Responde 403 si el token es inválido o expiró
      return res.status(403).json({ error: 'Invalid token' });
    }
    // Si el token es válido, almacenamos los datos del usuario
    req.user = user;
    next();
  });


}

module.exports = authenticateToken;
