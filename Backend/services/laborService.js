const LaborModel = require('../models/labor');
const JobsheetService = require('./jobsheetService'); // Asegúrate de que la ruta sea correcta

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
      if (!laborData.jobsheet_id) {
        throw new Error('Jobsheet ID es requerido');
      }
      
      const data = {
        jobsheet_id: laborData.jobsheet_id,
        description: laborData.description || (laborData.workflow_type !== "1" ? `Service for workflow ${laborData.workflow_type}` : 'Servicio técnico'),
        price: laborData.price ? parseFloat(laborData.price) : 0,
        is_completed: laborData.is_completed !== undefined ? (laborData.is_completed ? 1 : 0) : 1, // Default a 1 si no se especifica
        is_billed: laborData.is_billed !== undefined ? (laborData.is_billed ? 1 : 0) : 1,       // Default a 1 si no se especifica
        tracking_notes: laborData.tracking_notes || null,
        workflow_type: laborData.workflow_type 
      };
      
      const newLabor = await LaborModel.add(data); // Asumimos que esto devuelve el objeto labor creado, incluyendo su ID y jobsheet_id

      if (newLabor && newLabor.id && newLabor.jobsheet_id) { 
        console.log(`Calling updateJobsheetTotal for jobsheet_id: ${newLabor.jobsheet_id}`);
        await this.updateJobsheetTotal(newLabor.jobsheet_id); 

        // Después de actualizar el total, obtener el jobsheet completo y actualizado
        const updatedJobsheet = await JobsheetService.getJobsheetById(newLabor.jobsheet_id);
        console.log("Returning updated jobsheet from LaborService.addLabor:", updatedJobsheet);
        return updatedJobsheet; // Devolver el jobsheet completo
      } else {
        // Manejar el caso donde newLabor no tiene la información esperada
        console.error('LaborModel.add did not return the expected new labor object with id and jobsheet_id.', newLabor);
        const jobsheetIdToFetch = newLabor.jobsheet_id || laborData.jobsheet_id;
        if (!jobsheetIdToFetch) {
            throw new Error('Cannot determine jobsheet_id to fetch updated jobsheet.');
        }
        await this.updateJobsheetTotal(jobsheetIdToFetch);
        const updatedJobsheetFallback = await JobsheetService.getJobsheetById(jobsheetIdToFetch);
        return updatedJobsheetFallback;
      }
    } catch (error) {
      console.error('Error in laborService.addLabor:', error);
      throw error;
    }
  }

  async updateLabor(id, data) {
    try {
      const updateableFields = ['description', 'price', 'is_completed', 'tracking_notes', 'is_billed'];
      const hasValidFields = updateableFields.some(field => data[field] !== undefined);
      
      if (!hasValidFields) {
        throw new Error('No valid fields provided for update');
      }
      
      const result = await LaborModel.update(id, data);
      
      if (!result) {
        throw new Error('No se pudo actualizar la labor');
      }

      const updatedLabor = await LaborModel.getById(id); // Necesita implementación en LaborModel
      if (updatedLabor && updatedLabor.jobsheet_id) {
        console.log(`Calling updateJobsheetTotal for jobsheet_id: ${updatedLabor.jobsheet_id} after updating labor ${id}`);
        await this.updateJobsheetTotal(updatedLabor.jobsheet_id);
      } else {
        console.warn(`Could not retrieve jobsheet_id for updated labor ${id} to update jobsheet total.`);
      }
      
      return result;
    } catch (error) {
      console.error('Error in laborService.updateLabor:', error);
      throw error;
    }
  }

  async deleteLabor(id) {
    try {
      const laborToDelete = await LaborModel.getById(id); // Necesita implementación en LaborModel
      let jobsheetId = null;
      if (laborToDelete && laborToDelete.jobsheet_id) {
        jobsheetId = laborToDelete.jobsheet_id;
      }

      const success = await LaborModel.delete(id);
      if (!success) {
        throw new Error('No se pudo eliminar la labor');
      }

      if (jobsheetId) {
        console.log(`Calling updateJobsheetTotal for jobsheet_id: ${jobsheetId} after deleting labor ${id}`);
        await this.updateJobsheetTotal(jobsheetId);
      } else {
         console.warn(`Could not retrieve jobsheet_id for deleted labor ${id} to update jobsheet total.`);
      }
      return success;
    } catch (error) {
      console.error('Error in laborService.deleteLabor:', error);
      throw error;
    }
  }

  async updateJobsheetTotal(jobsheetId) {
    try {
      console.log(`Service: Attempting to update jobsheet total for jobsheet_id: ${jobsheetId}`);
      const result = await LaborModel.updateJobsheetTotal(jobsheetId); 
      console.log(`Service: Result of updating jobsheet total for ${jobsheetId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error in laborService.updateJobsheetTotal for jobsheet_id ${jobsheetId}:`, error);
      throw error;
    }
  }
}

module.exports = new LaborService();