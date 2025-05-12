const pool = require('../db');

class JobsheetModel {
  static async getAll(search, state, start_date, end_date) {
    try {
      // Modificar la consulta para seleccionar explícitamente j.vehicle_id
      // y no alias v.id como vehicle_id para evitar sobrescribir el vehicle_id original del jobsheet.
      let query = `
        SELECT j.id, 
               j.created_at, 
               j.state, 
               j.total_amount, 
               j.workflow_type,
               j.user_id, 
               j.customer_id, 
               j.vehicle_id, /* Este es el vehicle_id de la tabla jobsheets */
               c.name AS customer_name, 
               v.plate AS license_plate, /* Este será null si el vehículo no se encuentra */
               v.model AS vehicle_model, /* Este será null si el vehículo no se encuentra */
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id /* El JOIN usa j.vehicle_id */
        LEFT JOIN users u ON j.user_id = u.id
      `;
      
      const params = [];
      let whereClauseAdded = false;
      
      // Comienza con WHERE solo si hay algún filtro
      if (search || state || start_date || end_date) {
        query += ` WHERE`;
        whereClauseAdded = true;
        
        if (search) {
          // Asegurarse que la búsqueda por v.plate no cause error si v.plate es NULL
          query += ` (j.id LIKE ? OR c.name LIKE ? OR COALESCE(v.plate, '') LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          
          if (state || start_date || end_date) {
            query += ` AND`;
          }
        }
        
        if (state) {
          query += ` j.state = ?`;
          params.push(state);
          
          if (start_date || end_date) {
            query += ` AND`;
          }
        }
        
        // Agregar filtro de fecha
        if (start_date && end_date) {
          // Si tenemos ambas fechas, filtramos por rango
          query += ` DATE(j.created_at) BETWEEN ? AND ?`;
          params.push(start_date, end_date);
        } else if (start_date) {
          // Solo fecha de inicio
          query += ` DATE(j.created_at) >= ?`;
          params.push(start_date);
        } else if (end_date) {
          // Solo fecha de fin
          query += ` DATE(j.created_at) <= ?`;
          params.push(end_date);
        }
      }
      
      query += ` ORDER BY j.created_at DESC`;
      
      const [rows] = await pool.query(query, params);
      
      // Mapear los resultados. 'vehicle_id' provendrá de j.vehicle_id.
      // 'license_plate' será v.plate o "No plate" si v.plate es null.
      return rows.map(row => ({
        ...row,
        license_plate: row.license_plate || "No plate"
      }));
    } catch (error) {
      console.error('Error in JobsheetModel.getAll:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT j.id, 
               j.created_at, 
               j.state, 
               j.total_amount, 
               j.workflow_type,
               j.user_id, 
               j.customer_id, 
               j.vehicle_id, /* vehicle_id de la tabla jobsheets */
               c.name AS customer_name, 
               v.plate AS license_plate, 
               v.model AS vehicle_model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.id = ?
      `, [id]);
      
      if (rows.length > 0) {
        return {
          ...rows[0],
          license_plate: rows[0].license_plate || "No plate"
        };
      }
      return null; // O undefined, según prefieras para "no encontrado"
    } catch (error) {
      console.error('Error in JobsheetModel.getById:', error);
      throw error;
    }
  }

  static async getByCustomerId(customerId) {
    try {
      const [rows] = await pool.query(`
        SELECT j.id, 
               j.created_at, 
               j.state, 
               j.total_amount, 
               j.workflow_type,
               j.user_id, 
               j.customer_id, 
               j.vehicle_id, /* vehicle_id de la tabla jobsheets */
               c.name AS customer_name, 
               v.plate AS license_plate, 
               v.model AS vehicle_model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.customer_id = ?
        ORDER BY j.created_at DESC
      `, [customerId]);
      
      return rows.map(row => ({
        ...row,
        license_plate: row.license_plate || "No plate"
      }));
    } catch (error) {
      console.error('Error in JobsheetModel.getByCustomerId:', error);
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
          user_id,
          workflow_type /* Asegúrate que este campo se maneja si es necesario */
        )
        VALUES (?, ?, ?, ?, ?)
      `, [
        jobsheetData.state || 'pending',
        jobsheetData.vehicle_id || null,   
        jobsheetData.customer_id || null,    
        jobsheetData.user_id,
        jobsheetData.workflow_type || 1 
      ]);

      return { 
        id: result.insertId, 
        ...jobsheetData
      };
    } catch (error) {
      console.error('Error in JobsheetModel.create:', error);
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
  
      // NUEVO: Verificar si estamos cambiando el cliente y vehículo al mismo tiempo
      if (jobsheetData.vehicle_id && jobsheetData.customer_id) {
        // Obtenemos los datos actuales del jobsheet
        const [currentJobsheet] = await connection.query(
          'SELECT vehicle_id, customer_id FROM jobsheets WHERE id = ?',
          [id]
        );
        
        // Si el vehículo o cliente son diferentes, actualizamos la tabla de vehículos
        if (currentJobsheet[0] && 
            (currentJobsheet[0].vehicle_id !== jobsheetData.vehicle_id || 
             currentJobsheet[0].customer_id !== jobsheetData.customer_id)) {
          
          console.log(`Updating vehicle ${jobsheetData.vehicle_id} to customer ${jobsheetData.customer_id}`);
          
          // Actualizar el propietario del vehículo en la tabla vehicles
          await connection.query(
            'UPDATE vehicles SET customer_id = ? WHERE id = ?',
            [jobsheetData.customer_id, jobsheetData.vehicle_id]
          );
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
        SELECT j.id, 
               j.created_at, 
               j.state, 
               j.total_amount, 
               j.workflow_type,
               j.user_id, 
               j.customer_id, 
               j.vehicle_id, /* vehicle_id de la tabla jobsheets */
               c.name AS customer_name, 
               v.plate AS license_plate, 
               v.model AS vehicle_model,
               u.username AS technician_name
        FROM jobsheets j
        LEFT JOIN customers c ON j.customer_id = c.id
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        LEFT JOIN users u ON j.user_id = u.id
        WHERE j.vehicle_id = ?
        ORDER BY j.created_at DESC
      `, [vehicleId]);
      
      return rows.map(row => ({
        ...row,
        license_plate: row.license_plate || "No plate"
      }));
    } catch (error) {
      console.error('Error in JobsheetModel.getByVehicleId:', error);
      throw error;
    }
  }

}

module.exports = JobsheetModel;