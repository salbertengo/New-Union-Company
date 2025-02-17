
const pool = require('../db');

// Get the user by username.
class UserModel {
  static async getByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

// Create a user.
  static async create(data) {
    const { name, username, password, role } = data;
    
    const [result] = await pool.query(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      [name, username, password, role]
    );
    return result.insertId;
  }
}

module.exports = UserModel;


