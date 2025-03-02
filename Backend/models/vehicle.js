const pool = require('../db');

class VehicleModel {
  static async getAll() {
    const [rows] = await pool.query(`
      SELECT v.*, c.name as customer_name 
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      ORDER BY v.plate
    `);
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query(`
      SELECT v.*, c.name as customer_name 
      FROM vehicles v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = ?
    `, [id]);
    return rows[0];
  }

  static async getByCustomerId(customerId) {
    const [rows] = await pool.query(
      'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY model',
      [customerId]
    );
    return rows;
  }

  static async create(data) {
    const { plate, model, customer_id } = data;
    // Verificar que la placa no exista ya
    const [existing] = await pool.query('SELECT id FROM vehicles WHERE plate = ?', [plate]);
    if (existing.length > 0) {
      throw new Error(`Vehicle with plate ${plate} already exists`);
    }

    const [result] = await pool.query(
      'INSERT INTO vehicles (plate, model, customer_id) VALUES (?, ?, ?)',
      [plate, model, customer_id]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { plate, model, customer_id } = data;
    // Verificar que la placa no exista en otro vehículo
    const [existing] = await pool.query('SELECT id FROM vehicles WHERE plate = ? AND id != ?', [plate, id]);
    if (existing.length > 0) {
      throw new Error(`Vehicle with plate ${plate} already exists`);
    }

    const [result] = await pool.query(
      'UPDATE vehicles SET plate = ?, model = ?, customer_id = ? WHERE id = ?',
      [plate, model, customer_id, id]
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
    return result.affectedRows;
  }

  static async search(term) {
    const searchTerm = `%${term}%`;
    const [rows] = await pool.query(
      `SELECT v.*, c.name as customer_name 
       FROM vehicles v
       JOIN customers c ON v.customer_id = c.id
       WHERE v.plate LIKE ? 
       OR v.model LIKE ? 
       OR c.name LIKE ?
       ORDER BY v.plate`,
      [searchTerm, searchTerm, searchTerm]
    );
    return rows;
  }
}

module.exports = VehicleModel;