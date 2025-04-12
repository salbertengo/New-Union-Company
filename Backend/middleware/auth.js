const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key'; 

/**
 * JWT authentication middleware with optional role verification
 * @param {String|Array} requiredRoles - Optional. Role(s) required to access the route
 * @returns {Function} Express middleware function
 */
function auth(requiredRoles = []) {
  if (typeof requiredRoles === 'string') {
    requiredRoles = [requiredRoles];
  }

  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      
      req.user = user;
      
      if (requiredRoles.length > 0) {
        if (!user.role || !requiredRoles.includes(user.role)) {
          return res.status(403).json({ 
            error: 'Access denied: insufficient permissions' 
          });
        }
      }
      
      next();
    });
  };
}

const authenticateToken = auth();

module.exports = {
  auth,
  authenticateToken
};