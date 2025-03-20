const pool = require('../db');

class JobsheetModel {
  static async getAll(search, state) {
    try {
      let query = `SELECT * FROM jobsheets`;
      const params = [];
      
      if (search || state) {
        query += ` WHERE`;
        
        if (search) {
          query += ` (id LIKE ? OR description LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`);
        }
        
        if (search && state) {
          query += ` AND`;
        }
        
        if (state) {
          query += ` state = ?`;
          params.push(state);
        }
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT j.*, c.name AS customer_name, v.plate, v.model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.id = ?
      `, [id]);
      
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getByCustomerId(customerId) {
    try {
      const [rows] = await pool.query(`
        SELECT j.*, c.name AS customer_name, v.plate, v.model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.customer_id = ?
        ORDER BY j.created_at DESC
      `, [customerId]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async create(jobsheetData) {
    try {
      const [result] = await pool.query(`
        INSERT INTO jobsheets (state, vehicle_id, customer_id, user_id)
        VALUES (?, ?, ?, ?)
      `, [
        jobsheetData.state || 'pending',
        jobsheetData.vehicle_id,
        jobsheetData.customer_id,
        jobsheetData.user_id
      ]);

      return { id: result.insertId, ...jobsheetData };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, jobsheetData) {
    try {
      const [result] = await pool.query(`
        UPDATE jobsheets
        SET state = ?,
            vehicle_id = ?,
            customer_id = ?,
            user_id = ?
        WHERE id = ?
      `, [
        jobsheetData.state,
        jobsheetData.vehicle_id,
        jobsheetData.customer_id,
        jobsheetData.user_id,
        id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [items] = await pool.query('SELECT id, product_id, quantity FROM jobsheet_items WHERE jobsheet_id = ?',
      [id]);
      for (const item of items) {
        await pool.query(
          'UPDATE inventory SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      await pool.query('DELETE FROM jobsheet_items WHERE jobsheet_id = ?', [id]);
      await pool.query('DELETE FROM payments WHERE jobsheet_id = ?', [id]);
      const [result] = await pool.query('DELETE FROM jobsheets WHERE id = ?', [id]);
      return result.affectedRows > 0;

    } catch (error) {
      throw error;
    }
  }

  static async getTotalValue(id) {
    try {
      const [rows] = await pool.query(`
        SELECT SUM(quantity * price) as total
        FROM jobsheet_items
        WHERE jobsheet_id = ?
      `, [id]);
      
      return rows[0]?.total || 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = JobsheetModel;