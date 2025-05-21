const pool = require('../db');

class JobsheetItemModel {
  static async getByJobsheetId(jobsheetId) {
    try {
      const [rows] = await pool.query(`
        SELECT ji.*, i.name as product_name, i.sku, i.brand
        FROM jobsheet_items ji
        LEFT JOIN inventory i ON ji.product_id = i.id
        WHERE ji.jobsheet_id = ?
      `, [jobsheetId]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
  static async getItemsByJobsheetId(jobsheetId) {
    try {
      const [rows] = await pool.query(
        `SELECT ji.id, ji.jobsheet_id, ji.product_id, ji.quantity, ji.price,
         i.name
         FROM jobsheet_items ji
         LEFT JOIN inventory i ON ji.product_id = i.id
         WHERE ji.jobsheet_id = ?`,
        [jobsheetId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting jobsheet items:', error);
      throw error;
    }
  }
  static async addItem(itemData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      // Verificar si hay suficiente stock
      const [inventoryItem] = await connection.query(
        'SELECT stock, sale, name FROM inventory WHERE id = ? FOR UPDATE', 
        [itemData.product_id]
      );
  
      if (!inventoryItem[0] || inventoryItem[0].stock < itemData.quantity) {
        await connection.rollback();
        throw new Error('Insufficient stock');
      }
  
      // Obtener el precio de venta del inventario si no se proporciona
      const price = itemData.price || inventoryItem[0].sale;
  
      // Insertar el item en jobsheet_items
      const [result] = await connection.query(`
        INSERT INTO jobsheet_items (jobsheet_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [
        itemData.jobsheet_id,
        itemData.product_id,
        itemData.quantity,
        price
      ]);
  
      // Reducir el stock en el inventario
      await connection.query(`
        UPDATE inventory SET stock = stock - ? WHERE id = ?
      `, [itemData.quantity, itemData.product_id]);
  
      // Actualizar el total_amount en la tabla jobsheets
      await connection.query(`
        UPDATE jobsheets
        SET total_amount = (
          SELECT SUM(quantity * price)
          FROM jobsheet_items
          WHERE jobsheet_id = ?
        )
        WHERE id = ?
      `, [itemData.jobsheet_id, itemData.jobsheet_id]);

      // NUEVO: Registrar la compatibilidad si el jobsheet tiene un vehículo asociado
      const [jobsheet] = await connection.query(`
        SELECT j.state, j.vehicle_id, v.model
        FROM jobsheets j
        LEFT JOIN vehicles v ON j.vehicle_id = v.id
        WHERE j.id = ?
      `, [itemData.jobsheet_id]);

      if (jobsheet[0] && jobsheet[0].vehicle_id && jobsheet[0].model && jobsheet[0].state !== 'cancelled') {
        // Verificar si la compatibilidad ya existe
        const [existingCompatibility] = await connection.query(`
          SELECT COUNT(*) AS count FROM compatibility 
          WHERE product_id = ? AND motorcycle_model = ?
        `, [itemData.product_id, jobsheet[0].model]);

        // Si no existe, añadir la compatibilidad
        if (existingCompatibility[0].count === 0) {
          await connection.query(`
            INSERT INTO compatibility (product_id, motorcycle_model, created_by_jobsheet)
            VALUES (?, ?, ?)
          `, [
            itemData.product_id, 
            jobsheet[0].model,
            itemData.jobsheet_id // Marcar que fue creada por un jobsheet
          ]);
          
          console.log(`Compatibility created automatically: Product ID ${itemData.product_id} with model ${jobsheet[0].model}`);
        }
      }
  
      await connection.commit();
      
      return { id: result.insertId, ...itemData, price };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateItem(id, itemData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      // Obtener el item actual para calcular la diferencia de stock
      const [currentItem] = await connection.query(
        'SELECT product_id, quantity, jobsheet_id FROM jobsheet_items WHERE id = ?',
        [id]
      );
  
      if (!currentItem[0]) {
        await connection.rollback();
        throw new Error('Item not found');
      }
  
      // Almacenar el jobsheet_id para actualizar el total después
      const jobsheetId = currentItem[0].jobsheet_id;
  
      // Calcular la diferencia de cantidad
      const quantityDiff = itemData.quantity - currentItem[0].quantity;
  
      // Si cambia el producto o la cantidad aumenta, verificar stock
      if (itemData.product_id !== currentItem[0].product_id || quantityDiff > 0) {
        const [inventoryItem] = await connection.query(
          'SELECT stock FROM inventory WHERE id = ? FOR UPDATE',
          [itemData.product_id || currentItem[0].product_id]
        );
  
        if (!inventoryItem[0] || inventoryItem[0].stock < quantityDiff) {
          await connection.rollback();
          throw new Error('Insufficient stock');
        }
      }
  
      // Actualizar el item
      await connection.query(`
        UPDATE jobsheet_items
        SET quantity = ?, price = ?
        WHERE id = ?
      `, [
        itemData.quantity,
        itemData.price,
        id
      ]);
  
      // Actualizar el inventario solo si la cantidad cambió
      if (quantityDiff !== 0) {
        await connection.query(`
          UPDATE inventory SET stock = stock - ? WHERE id = ?
        `, [quantityDiff, currentItem[0].product_id]);
      }
  
      // Actualizar el total_amount en la tabla jobsheets
      await connection.query(`
        UPDATE jobsheets
        SET total_amount = (
          SELECT COALESCE(SUM(quantity * price), 0)
          FROM jobsheet_items
          WHERE jobsheet_id = ?
        )
        WHERE id = ?
      `, [jobsheetId, jobsheetId]);
  
      await connection.commit();
      
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async deleteItem(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      // Obtener información del item para restaurar el inventario
      const [item] = await connection.query(
        'SELECT product_id, quantity, jobsheet_id FROM jobsheet_items WHERE id = ?',
        [id]
      );
  
      if (!item[0]) {
        await connection.rollback();
        throw new Error('Item not found');
      }
  
      // Almacenar el jobsheet_id para actualizar el total después
      const jobsheetId = item[0].jobsheet_id;
      
      // Obtener el estado del jobsheet
      const [jobsheetState] = await connection.query(
        'SELECT state FROM jobsheets WHERE id = ?',
        [jobsheetId]
      );

      // Eliminar el item
      const [result] = await connection.query('DELETE FROM jobsheet_items WHERE id = ?', [id]);
  
      // Restaurar el stock en el inventario
      await connection.query(`
        UPDATE inventory SET stock = stock + ? WHERE id = ?
      `, [item[0].quantity, item[0].product_id]);
  
      // Si es el último item de este producto en este jobsheet, eliminar compatibilidad creada automáticamente
      const [remainingItems] = await connection.query(
        'SELECT COUNT(*) as count FROM jobsheet_items WHERE jobsheet_id = ? AND product_id = ?',
        [jobsheetId, item[0].product_id]
      );
      
      if (remainingItems[0].count === 0 && 
          jobsheetState[0] && jobsheetState[0].state !== 'completed') {
        await connection.query(
          'DELETE FROM compatibility WHERE product_id = ? AND created_by_jobsheet = ?',
          [item[0].product_id, jobsheetId]
        );
        
        console.log(`Removed compatibility for product ${item[0].product_id} created by jobsheet ${jobsheetId}`);
      }
  
      // Actualizar el total_amount en la tabla jobsheets
      await connection.query(`
        UPDATE jobsheets
        SET total_amount = (
          SELECT COALESCE(SUM(quantity * price), 0)
          FROM jobsheet_items
          WHERE jobsheet_id = ?
        )
        WHERE id = ?
      `, [jobsheetId, jobsheetId]);
  
      await connection.commit();
      
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM jobsheet_items WHERE id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error in JobsheetItemModel.getById:', error);
      throw error;
    }
  }
}

module.exports = JobsheetItemModel;