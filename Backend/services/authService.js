
const UserModel = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key';

class AuthService {
  /**
   * Register a new user.
   * @param {Object} userData - User data from the request body.
   * @param {string} userData.name - Full name of the user.
   * @param {string} userData.username - Chosen username.
   * @param {string} userData.password - Plain-text password.
   * @param {string} [userData.role] - User role, defaults to 'user'.
   * @returns {number} The new user's ID.
   * @throws {Error} If the username already exists.
   */
  static async register(userData) {
    // Check if username already exists
    const existingUser = await UserModel.getByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create the user in the database
    const newUserId = await UserModel.create({
      name: userData.name,
      username: userData.username,
      password: hashedPassword,
      role: userData.role || 'user'
    });

    return newUserId;
  }

  /**
   * Log in a user by verifying credentials, and return a JWT.
   * @param {string} username - The username entered by the user.
   * @param {string} password - The plain-text password entered by the user.
   * @returns {string} A JWT token if login is successful.
   * @throws {Error} If the user does not exist or the password is invalid.
   */
  static async login(username, password) {
    const user = await UserModel.getByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return token;
  }
}

module.exports = AuthService;
