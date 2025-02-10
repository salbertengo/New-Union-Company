const pool = require('../db');

class InventoryModel {
  // Retrieve all inventory items
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM inventory');
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows[0];
  }

  // Create a new inventory item
  static async create(data) {
    const { name, stock, cost, sell, category, sku, min } = data;
    const [result] = await pool.query(
      'INSERT INTO inventory (name, stock, cost, sell, category, sku, min) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, stock, cost, sell, category, sku, min]
    );
    return result.insertId;
  }

  // Update an existing inventory item
  static async update(id, data) {
    const { name, stock, cost, sell, category, sku, min } = data;
    await pool.query(
      'UPDATE inventory SET name = ?, stock = ?, cost = ?, sell = ?, category = ?, sku = ?, min = ? WHERE id = ?',
      [name, stock, cost, sell, category, sku, min, id]
    );
    return true;
  }

  // Delete an inventory item
  static async delete(id) {
    await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
    return true;
  }
}

module.exports = InventoryModel;