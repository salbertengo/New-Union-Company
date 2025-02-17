const pool = require('../db');

class CompatibilityModel {
  static async getCompatibleParts(motorcycleModel, spareName) {
    console.log("DEBUG: getCompatibleParts() recibido =>", { motorcycleModel, spareName });

    // Si no hay ninguno, retorna vacío
    if (!motorcycleModel.trim() && !spareName.trim()) {
      return [];
    }

    let query = '';
    let params = [];

    // Si solo se busca por modelo:
    if (motorcycleModel.trim() && !spareName.trim()) {
      query = `
        SELECT DISTINCT i.*
        FROM inventory i
        INNER JOIN compatibility c ON i.id = c.product_id
        WHERE LOWER(c.motorcycle_model) LIKE LOWER(?)
      `;
      params = [`%${motorcycleModel.trim()}%`];
    }
    // Si solo se busca por repuesto:
    else if (spareName.trim() && !motorcycleModel.trim()) {
      query = `
        SELECT DISTINCT i.*, c.motorcycle_model
        FROM inventory i
        INNER JOIN compatibility c ON i.id = c.product_id
        WHERE LOWER(i.name) LIKE LOWER(?)
      `;
      params = [`%${spareName.trim()}%`];
    }
    // Si se buscan ambos:
    else {
      query = `
        SELECT DISTINCT i.*
        FROM inventory i
        INNER JOIN compatibility c ON i.id = c.product_id
        WHERE LOWER(c.motorcycle_model) LIKE LOWER(?)
          AND LOWER(i.name) LIKE LOWER(?)
      `;
      params = [`%${motorcycleModel.trim()}%`, `%${spareName.trim()}%`];
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // Buscar compatibilidades por product_id
  static async getByProductId(product_id) {
    const query = `
      SELECT *
      FROM compatibility
      WHERE product_id = ?
    `;
    const [rows] = await pool.query(query, [product_id]);
    return rows;
  }

  // Crear una nueva compatibilidad
  static async create(data) {
    const { product_id, motorcycle_model } = data;
    const [result] = await pool.query(
      'INSERT INTO compatibility (product_id, motorcycle_model) VALUES (?, ?)',
      [product_id, motorcycle_model]
    );
    return result.insertId;
  }

  // Actualizar la compatibilidad: se usa el composite key para identificar la fila
  static async update(data) {
    const { product_id, oldMotorcycleModel, newMotorcycleModel } = data;
    const [result] = await pool.query(
      'UPDATE compatibility SET motorcycle_model = ? WHERE product_id = ? AND motorcycle_model = ?',
      [newMotorcycleModel, product_id, oldMotorcycleModel]
    );
    return result.affectedRows;
  }

  // Eliminar una compatibilidad
  static async delete(data) {
    const { product_id, motorcycle_model } = data;
    const [result] = await pool.query(
      'DELETE FROM compatibility WHERE product_id = ? AND motorcycle_model = ?',
      [product_id, motorcycle_model]
    );
    return result.affectedRows;
  }
}

module.exports = CompatibilityModel;