const AuthService = require('../services/authService');

class AuthController {
  static async register(req, res) {
    try {
      const userId = await AuthService.register(req.body);
      res.status(201).json({ message: 'Usuario registrado', userId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;
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
