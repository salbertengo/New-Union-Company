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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Log all incoming data for debugging
    console.log("Creating jobsheet with data:", JSON.stringify(jobsheetData, null, 2));
    
    // CASE 1: Vehicle ID is directly provided
    if (jobsheetData.vehicle_id) {
      // Verify the vehicle exists
      const [vehicleCheck] = await connection.query(
        'SELECT id, customer_id, plate FROM vehicles WHERE id = ?', 
        [jobsheetData.vehicle_id]
      );
      
      if (!vehicleCheck || vehicleCheck.length === 0) {
        console.error(`Vehicle with ID ${jobsheetData.vehicle_id} not found in database`);
        throw new Error(`Vehicle with ID ${jobsheetData.vehicle_id} not found`);
      }
      
      console.log(`Found vehicle: ${JSON.stringify(vehicleCheck[0])}`);
      
      // If customer_id isn't provided, get it from the vehicle
      if (!jobsheetData.customer_id && vehicleCheck[0].customer_id) {
        jobsheetData.customer_id = vehicleCheck[0].customer_id;
        console.log(`Auto-assigned customer_id ${jobsheetData.customer_id} from vehicle_id ${jobsheetData.vehicle_id}`);
      }
    }
    
    // CASE 2: License plate is provided instead of vehicle_id
    else if (jobsheetData.license_plate) {
      console.log(`Looking up vehicle by plate: ${jobsheetData.license_plate}`);
      
      // Normalize the license plate: trim whitespace and convert to uppercase
      const normalizedPlate = jobsheetData.license_plate.trim().toUpperCase();
      
      // Case-insensitive lookup for the vehicle
      const [vehicleResult] = await connection.query(
        'SELECT id, customer_id FROM vehicles WHERE UPPER(plate) = ?', 
        [normalizedPlate]
      );
      
      if (vehicleResult && vehicleResult.length > 0) {
        jobsheetData.vehicle_id = vehicleResult[0].id;
        jobsheetData.customer_id = vehicleResult[0].customer_id;
        console.log(`Found vehicle with id ${jobsheetData.vehicle_id} and customer_id ${jobsheetData.customer_id}`);
      } else {
        console.log(`No vehicle found with plate: ${normalizedPlate}`);
      }
    }
    
    // Neither vehicle_id nor license_plate provided (walk-in case)
    else {
      console.log('No vehicle information provided - creating walk-in jobsheet');
    }

    // Now insert the jobsheet with all the resolved information
    const [result] = await connection.query(`
      INSERT INTO jobsheets (
        state, 
        vehicle_id, 
        customer_id, 
        user_id,
        workflow_type
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      jobsheetData.state || 'pending',
      jobsheetData.vehicle_id || null,   
      jobsheetData.customer_id || null,    
      jobsheetData.user_id,
      jobsheetData.workflow_type || 1 
    ]);

    await connection.commit();
    
    return { 
      id: result.insertId, 
      ...jobsheetData
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error in JobsheetModel.create:', error);
    throw error;
  } finally {
    connection.release();
  }
}

 static async update(id, jobsheetData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Primero, obtenemos los datos actuales del jobsheet
    const [currentJobsheet] = await connection.query(
      'SELECT state, vehicle_id, customer_id, user_id FROM jobsheets WHERE id = ?',
      [id]
    );
    
    if (!currentJobsheet || currentJobsheet.length === 0) {
      throw new Error('Jobsheet not found');
    }
    
    // Verificar si estamos cambiando a estado "cancelled"
    if (jobsheetData.state === 'cancelled' && currentJobsheet[0].state !== 'cancelled') {
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
      
      // NUEVO: Eliminar las compatibilidades creadas automáticamente por este jobsheet
      await connection.query(
        'DELETE FROM compatibility WHERE created_by_jobsheet = ?',
        [id]
      );
      
      console.log(`Removed compatibility created by jobsheet ${id} due to cancellation`);
    }

    // NUEVO: Verificar si estamos cambiando el cliente y vehículo al mismo tiempo
    if (jobsheetData.vehicle_id && jobsheetData.customer_id) {
      // Si el vehículo o cliente son diferentes, actualizamos la tabla de vehículos
      if (currentJobsheet[0].vehicle_id !== jobsheetData.vehicle_id || 
         currentJobsheet[0].customer_id !== jobsheetData.customer_id) {
        
        console.log(`Updating vehicle ${jobsheetData.vehicle_id} to customer ${jobsheetData.customer_id}`);
        
        // Actualizar el propietario del vehículo en la tabla vehicles
        await connection.query(
          'UPDATE vehicles SET customer_id = ? WHERE id = ?',
          [jobsheetData.customer_id, jobsheetData.vehicle_id]
        );
      }
    }

    // IMPORTANTE: Solo actualizar los campos proporcionados, manteniendo valores existentes
    const state = jobsheetData.state !== undefined ? jobsheetData.state : currentJobsheet[0].state;
    const vehicle_id = jobsheetData.vehicle_id !== undefined ? jobsheetData.vehicle_id : currentJobsheet[0].vehicle_id;
    const customer_id = jobsheetData.customer_id !== undefined ? jobsheetData.customer_id : currentJobsheet[0].customer_id;
    const user_id = jobsheetData.user_id !== undefined ? jobsheetData.user_id : currentJobsheet[0].user_id;

    // Actualizar el jobsheet solo con los campos proporcionados
    const [result] = await connection.query(`
      UPDATE jobsheets
      SET state = ?,
          vehicle_id = ?,
          customer_id = ?,
          user_id = ?
      WHERE id = ?
    `, [
      state,
      vehicle_id,
      customer_id,
      user_id,
      id
    ]);
    
    console.log(`Jobsheet ${id} updated. Customer ID preserved: ${customer_id}`);
    
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