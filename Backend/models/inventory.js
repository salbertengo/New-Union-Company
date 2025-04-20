const pool = require('../db');

class InventoryModel {
  static normalizeText(text) {
    if (!text) return '';
    return text.toString()
      .toLowerCase()
      .replace(/[-\/\\.,_]/g, ' ') 
      .replace(/\s+/g, ' ')       
      .trim();
  }

  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM inventory');
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(data) {
    const { name, stock, cost, sale, category, sku, min, brand } = data;
  
    // Verificar si el SKU ya existe
    const [existingSku] = await pool.query('SELECT id FROM inventory WHERE sku = ?', [sku]);
    if (existingSku.length > 0) {
      // Si ya existe un producto con ese SKU, lanzamos un error con un código específico
      const error = new Error('SKU already exists');
      error.code = 'DUPLICATE_SKU';
      throw error;
    }
    
    // Si el SKU no existe, procedemos con la inserción
    const [result] = await pool.query(
      'INSERT INTO inventory (name, stock, cost, sale, category, sku, min, brand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, stock, cost, sale, category, sku, min, brand]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, stock, cost, sale, category, sku, min, brand } = data;
    await pool.query(
      'UPDATE inventory SET name = ?, stock = ?, cost = ?, sale = ?, category = ?, sku = ?, min = ?, brand = ? WHERE id = ?',
      [name, stock, cost, sale, category, sku, min, brand, id]
    );
    return true;
  }

  static async delete(id) {
    await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
    return true;
  }

  static async searchByName(query) {
    if (!query) return this.getAll();
    
    const exactQuery = query.trim();
    const [exactResults] = await pool.query(
      'SELECT * FROM inventory WHERE sku = ? OR name = ?', 
      [exactQuery, exactQuery]
    );
    

    

    const [partialResults] = await pool.query(
      'SELECT * FROM inventory WHERE ' +
      'name LIKE ? OR ' + 
      'sku LIKE ? OR ' +

      'name LIKE ? OR ' +
      'name LIKE ?',
      [
        `%${exactQuery}%`, 
        `%${exactQuery}%`,
        `%${exactQuery.replace(/\//g, '-')}%`,  
        `%${exactQuery.replace(/-/g, '/')}%`    
      ]
    );
    
    return partialResults;
  }
}

module.exports = InventoryModel;