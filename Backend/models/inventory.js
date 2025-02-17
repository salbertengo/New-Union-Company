const pool = require('../db');

class InventoryModel {
  // Retrieve all inventory items
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM inventory');
    return rows;
  }

  // Retrieve a single inventory item by ID
  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows[0];
  }

  // Crear un nuevo item de inventario
  // Se espera: name, stock, cost, sale, category, sku, min y brand
  static async create(data) {
    const { name, stock, cost, sale, category, sku, min, brand } = data;
    console.log('Creating inventory item with data:', data); // Add this line
    const [result] = await pool.query(
      'INSERT INTO inventory (name, stock, cost, sale, category, sku, min, brand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, stock, cost, sale, category, sku, min, brand]
    );
    return result.insertId;
  }

  // Actualizar un item de inventario existente
  static async update(id, data) {
    const { name, stock, cost, sale, category, sku, min, brand } = data;
    console.log(`Updating inventory item with id ${id} and data:`, data); // Add this line
    await pool.query(
      'UPDATE inventory SET name = ?, stock = ?, cost = ?, sale = ?, category = ?, sku = ?, min = ?, brand = ? WHERE id = ?',
      [name, stock, cost, sale, category, sku, min, brand, id]
    );
    return true;
  }

  // Eliminar un item de inventario
  static async delete(id) {
    await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
    return true;
  }
}

module.exports = InventoryModel;