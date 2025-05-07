const LaborService = require('../services/laborService');

class LaborController {
  static async getLaborsByJobsheetId(req, res) {
    try {
      const { jobsheetId } = req.params;
      
      if (!jobsheetId) {
        return res.status(400).json({ error: 'Se requiere jobsheet ID' });
      }
      
      const labors = await LaborService.getLaborsByJobsheetId(jobsheetId);
      res.json(labors);
    } catch (err) {
      console.error('Error in getLaborsByJobsheetId:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  static async addLabor(req, res) {
    try {
      const { jobsheet_id, description, price, is_completed, tracking_notes, workflow_type } = req.body;
      
      // Log detallado para ver exactamente qué recibimos
      console.log("=== LABOR CONTROLLER ===");
      console.log("Payload completo:", req.body);
      console.log("workflow_type recibido:", workflow_type);
      console.log("Tipo de workflow_type:", typeof workflow_type);
      console.log("========================");
      
      if (!jobsheet_id) {
        return res.status(400).json({ error: 'Jobsheet ID es requerido' });
      }
      
      // Asegúrate de que workflow_type se pasa correctamente
      const labor = await LaborService.addLabor({
        jobsheet_id,
        description,
        price,
        is_completed,
        tracking_notes,
        workflow_type: workflow_type // Aseguramos que se pase tal cual
      });
      
      // Log del resultado final
      console.log("Labor creado:", labor);
      
      res.status(201).json(labor);
    } catch (err) {
      console.error('Error in addLabor:', err);
      
      if (err.message.includes('requerido') || err.message.includes('debe tener')) {
        return res.status(400).json({ error: err.message });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  static async updateLabor(req, res) {
    try {
      const { id } = req.params;
      
      console.log('Update labor request body:', req.body);
      
      if (!id) {
        return res.status(400).json({ error: 'ID de labor es requerido' });
      }
      
      const updateData = {};
      const fields = ['description', 'price', 'is_completed', 'tracking_notes', 'is_billed'];
      
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          // For boolean/integer fields, always convert to 0/1
          if (field === 'is_billed' || field === 'is_completed') {
            const val = req.body[field];
            if (val === true || val === 'true' || val === 1 || val === '1') {
              updateData[field] = 1;
            } else if (val === false || val === 'false' || val === 0 || val === '0') {
              updateData[field] = 0;
            } else {
              // If value is not clearly true/false, ignore it
              return;
            }
          } 
          // Handle price field
          else if (field === 'price') {
            updateData[field] = parseFloat(req.body[field]) || 0;
          } 
          // Handle text fields
          else {
            updateData[field] = req.body[field];
          }
        }
      });
      
      console.log('Processed update data:', updateData);
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
      }
      
      await LaborService.updateLabor(id, updateData);
      
      res.json({ message: 'Labor actualizada exitosamente' });
    } catch (err) {
      console.error('Error in updateLabor:', err);
      
      if (err.message.includes('debe tener')) {
        return res.status(400).json({ error: err.message });
      } else if (err.message.includes('not found')) {
        return res.status(404).json({ error: 'Labor no encontrada' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  static async deleteLabor(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de labor es requerido' });
      }
      
      await LaborService.deleteLabor(id);
      res.json({ message: 'Labor eliminada exitosamente' });
    } catch (err) {
      console.error('Error in deleteLabor:', err);
      
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: 'Labor no encontrada' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = LaborController;