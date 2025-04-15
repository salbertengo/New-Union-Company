const LaborModel = require('../models/labor');

class LaborService {
  async getLaborsByJobsheetId(jobsheetId) {
    try {
      return await LaborModel.getByJobsheetId(jobsheetId);
    } catch (error) {
      console.error('Error in laborService.getLaborsByJobsheetId:', error);
      throw error;
    }
  }

  async addLabor(laborData) {
    try {
      // Validación de datos
      if (!laborData.jobsheet_id) {
        throw new Error('Jobsheet ID es requerido');
      }
      
      // Normalizar datos
      const data = {
        jobsheet_id: laborData.jobsheet_id,
        description: laborData.description || 'Servicio técnico',
        price: laborData.price ? parseFloat(laborData.price) : 0,
        is_completed: laborData.is_completed ? 1 : 0
      };
      
      // Si está marcado como completado, asegurarse de que tenga precio
      if (data.is_completed && (!data.price || data.price <= 0)) {
        throw new Error('Labor completada debe tener un precio válido');
      }
      
      return await LaborModel.add(data);
    } catch (error) {
      console.error('Error in laborService.addLabor:', error);
      throw error;
    }
  }

  async updateLabor(id, data) {
    try {
      // Check if any updateable fields exist
      const updateableFields = ['description', 'price', 'is_completed', 'tracking_notes', 'is_billed'];
      const hasValidFields = updateableFields.some(field => data[field] !== undefined);
      
      if (!hasValidFields) {
        throw new Error('No valid fields provided for update');
      }
      
      // FIX: Change laborModel to LaborModel (notice the capital L)
      const result = await LaborModel.update(id, data);
      
      if (!result) {
        throw new Error('No se pudo actualizar la labor');
      }
      
      return result;
    } catch (error) {
      console.error('Error in laborService.updateLabor:', error);
      throw error;
    }
  }
  async deleteLabor(id) {
    try {
      const success = await LaborModel.delete(id);
      if (!success) {
        throw new Error('No se pudo eliminar la labor');
      }
      return success;
    } catch (error) {
      console.error('Error in laborService.deleteLabor:', error);
      throw error;
    }
  }

  async updateJobsheetTotal(jobsheetId) {
    try {
      return await LaborModel.updateJobsheetTotal(jobsheetId);
    } catch (error) {
      console.error('Error in laborService.updateJobsheetTotal:', error);
      throw error;
    }
  }
}

module.exports = new LaborService();