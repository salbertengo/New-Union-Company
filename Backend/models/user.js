const pool = require('../db');
const bcrypt = require('bcryptjs');

class UserModel {
  static async getAll() {
    const [rows] = await pool.query(`
      SELECT id, name, username, role, created_at 
      FROM users
      ORDER BY name
    `);
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query(`
      SELECT id, name, username, role, created_at 
      FROM users 
      WHERE id = ?
    `, [id]);
    return rows[0];
  }

  static async getByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }

  static async create(data) {
    const { name, username, password, role } = data;
    
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
      [name, username, hashedPassword, role || 'mechanic']
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, username, role } = data;
    const [result] = await pool.query(
      'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?',
      [name, username, role, id]
    );
    return result.affectedRows > 0;
  }

  static async updatePassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async validatePassword(username, password) {
    const user = await this.getByUsername(username);
    if (!user) return false;
    
    return await bcrypt.compare(password, user.password);
  }
}

module.exports = UserModel;