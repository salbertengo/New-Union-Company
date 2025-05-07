const pool = require('../db');

class LaborModel {
  async getByJobsheetId(jobsheetId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM labor WHERE jobsheet_id = ? ORDER BY created_at DESC',
        [jobsheetId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getByJobsheetId:', error);
      throw error;
    }
  }

  async add(data) {
    try {
      const { 
        jobsheet_id, 
        description, 
        price = 0, 
        is_completed = 1, 
        is_billed = 1, 
        tracking_notes = null,
      } = data;
      

      
      // Forzar conversión a string y validar
      let workflow_type_to_insert;
      
      if (data.workflow_type === undefined || data.workflow_type === null) {
        workflow_type_to_insert = "1";
      } else if (data.workflow_type === "") {
        workflow_type_to_insert = "1";
      } else {
        // Convertir explícitamente a String para asegurar consistencia
        workflow_type_to_insert = String(data.workflow_type).trim();
      }
      
 
  
      // Insertar en BD con el valor procesado
      const [result] = await pool.execute(
        'INSERT INTO labor (jobsheet_id, description, price, is_completed, is_billed, tracking_notes, workflow_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [jobsheet_id, description, price, is_completed, is_billed, tracking_notes, workflow_type_to_insert]
      );
      
      if (is_completed) {
        await this.updateJobsheetTotal(jobsheet_id);
      }
      
      // Verificar que se insertó correctamente
      const [insertedRow] = await pool.execute(
        'SELECT * FROM labor WHERE id = ?',
        [result.insertId]
      );
      
      console.log("Labor insertado en BD:", insertedRow[0]);
      
      return {
        id: result.insertId,
        jobsheet_id,
        description,
        price,
        is_completed,
        is_billed,
        tracking_notes,
        workflow_type: workflow_type_to_insert,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error en add labor:', error);
      throw error;
    }
  }
  async update(id, data) {
    try {
      const { description, price, is_completed, tracking_notes, is_billed, workflow_type } = data;
      
      // Obtener datos actuales para comparar cambios
      const [currentLabor] = await pool.execute(
        'SELECT jobsheet_id, is_completed FROM labor WHERE id = ?',
        [id]
      );
      
      if (currentLabor.length === 0) {
        throw new Error('Labor not found');
      }
      
      const jobsheetId = currentLabor[0].jobsheet_id;
      const wasCompleted = currentLabor[0].is_completed;
      
      // Determinar si se debe registrar la fecha de completado
      let completedAt = null;
      if (is_completed && !wasCompleted) {
        completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      // Construir la consulta dinámicamente según los campos proporcionados
      let query = 'UPDATE labor SET ';
      const params = [];
      const updateFields = [];
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
      }
      
      if (price !== undefined) {
        updateFields.push('price = ?');
        params.push(price);
      }
      
      if (is_completed !== undefined) {
        updateFields.push('is_completed = ?');
        params.push(is_completed);
        
        if (completedAt) {
          updateFields.push('completed_at = ?');
          params.push(completedAt);
        }
      }
      
      if (tracking_notes !== undefined) {
        updateFields.push('tracking_notes = ?');
        params.push(tracking_notes);
      }
      
      if (is_billed !== undefined) {
        updateFields.push('is_billed = ?');
        params.push(is_billed);
      }

      if (workflow_type !== undefined) {
        updateFields.push('workflow_type = ?');
        params.push(workflow_type);
      }
      
      // Check if there are fields to update
      if (updateFields.length === 0) {
        console.log('No fields to update for labor ID:', id);
        return false; // No fields to update
      }
      
      query += updateFields.join(', ') + ' WHERE id = ?';
      params.push(id);
      
      const [result] = await pool.execute(query, params);
      
      // Si el estado de completado cambió o el precio cambió, actualizar el total
      if ((is_completed !== undefined && is_completed != wasCompleted) || price !== undefined) {
        await this.updateJobsheetTotal(jobsheetId);
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in update labor:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const [labor] = await pool.execute(
        'SELECT jobsheet_id, is_completed FROM labor WHERE id = ?',
        [id]
      );
      
      if (labor.length === 0) {
        throw new Error('Labor not found');
      }
      
      const jobsheetId = labor[0].jobsheet_id;
      const wasCompleted = labor[0].is_completed;
      
      await pool.execute('DELETE FROM labor WHERE id = ?', [id]);
      
      // Solo actualizar el total si la labor estaba completada
      if (wasCompleted) {
        await this.updateJobsheetTotal(jobsheetId);
      }
      
      return true;
    } catch (error) {
      console.error('Error in delete labor:', error);
      throw error;
    }
  }

  async updateJobsheetTotal(jobsheetId) {
    try {
      // 1. Get sum of inventory items
      const [itemsResult] = await pool.execute(
        'SELECT SUM(price * quantity) as items_total FROM jobsheet_items WHERE jobsheet_id = ?',
        [jobsheetId]
      );
      
      // 2. Get sum of COMPLETED labors only
      const [laborResult] = await pool.execute(
        'SELECT SUM(price) as labor_total FROM labor WHERE jobsheet_id = ? AND is_billed = 1 AND is_completed = 1',
        [jobsheetId]
      );
      
      // 3. Calculate total
      const itemsTotal = itemsResult[0].items_total || 0;
      const laborTotal = laborResult[0].labor_total || 0;
      const total = parseFloat(itemsTotal) + parseFloat(laborTotal);
      
      // 4. Update total in jobsheets
      await pool.execute(
        'UPDATE jobsheets SET total_amount = ? WHERE id = ?',
        [total, jobsheetId]
      );
      
      return total;
    } catch (error) {
      console.error('Error updating jobsheet total:', error);
      throw error;
    }
  }
}

module.exports = new LaborModel();