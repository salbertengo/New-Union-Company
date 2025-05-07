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
        INSERT INTO jobsheets (
          state, 
          vehicle_id, 
          customer_id, 
          user_id
        )
        VALUES (?, ?, ?, ?)
      `, [
        jobsheetData.state || 'pending',
        jobsheetData.vehicle_id || null,   
        jobsheetData.customer_id || null,    
        jobsheetData.user_id
      ]);

      return { 
        id: result.insertId, 
        ...jobsheetData
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, jobsheetData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Verificar si estamos cambiando a estado "cancelled"
      if (jobsheetData.state === 'cancelled') {
        // Obtener el estado actual del jobsheet para verificar si realmente está cambiando a cancelado
        const [currentState] = await connection.query(
          'SELECT state FROM jobsheets WHERE id = ?',
          [id]
        );
        
        // Solo restaurar el stock si el jobsheet no estaba ya cancelado
        if (currentState[0] && currentState[0].state !== 'cancelled') {
          // Obtener todos los items del jobsheet
          const [items] = await connection.query(
            'SELECT id, product_id, quantity FROM jobsheet_items WHERE jobsheet_id = ?',
            [id]
          );
          
          // Restaurar el stock en el inventario para cada item
          for (const item of items) {
            await connection.query(
              'UPDATE inventory SET stock = stock + ? WHERE id = ?',
              [item.quantity, item.product_id]
            );
            
            console.log(`Stock restored for product ${item.product_id}: ${item.quantity} units`);
          }
        }
      }
  
      // Actualizar el jobsheet
      const [result] = await connection.query(`
        UPDATE jobsheets
        SET state = ?,
            vehicle_id = ?,
            customer_id = ?,
            user_id = ?
        WHERE id = ?
      `, [
        jobsheetData.state,
        jobsheetData.vehicle_id || null,     // Permitir NULL para walk-in
        jobsheetData.customer_id || null,    // Permitir NULL para walk-in
        jobsheetData.user_id,
        id
      ]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error('Error updating jobsheet:', error);
      throw error;
    } finally {
      connection.release();
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
  static async getByVehicleId(vehicleId) {
    try {
      const [rows] = await pool.query(`
        SELECT j.*, c.name AS customer_name, v.plate, v.model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.vehicle_id = ?
        ORDER BY j.created_at DESC
      `, [vehicleId]);
      
      return rows;
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