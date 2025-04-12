const AuthService = require('../services/authService');
const UserService = require('../services/userService'); // Añadir esta línea

class AuthController {
  static async register(req, res) {
    try {
      // Check if user is admin
      if (req.user && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can register new users' });
      }
  
      const userData = req.body;
      
      // Validate required fields
      if (!userData.name || !userData.username || !userData.password) {
        return res.status(400).json({ error: 'Name, username and password are required' });
      }
  
      const userId = await UserService.createUser(userData);
      res.status(201).json({ id: userId, message: 'User created successfully' });
    } catch (err) {
      console.error('Error registering user:', err);
      if (err.message === 'Username already exists') {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;
      console.log(`Login attempt for username: ${username}`);
      const token = await AuthService.login(username, password);
      res.json({ token });
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }


static async verifyToken(req, res) {

  return res.status(200).json({ valid: true, user: req.user });
}
}

module.exports = AuthController;
