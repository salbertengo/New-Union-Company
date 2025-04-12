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
      const { jobsheet_id, description, price, is_completed } = req.body;
      
      if (!jobsheet_id) {
        return res.status(400).json({ error: 'Jobsheet ID es requerido' });
      }
      
      const labor = await LaborService.addLabor({
        jobsheet_id,
        description,
        price,
        is_completed
      });
      
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
      const { description, price, is_completed } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de labor es requerido' });
      }
      
      await LaborService.updateLabor(id, {
        description,
        price,
        is_completed
      });
      
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