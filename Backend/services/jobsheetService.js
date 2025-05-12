const JobsheetModel = require('../models/jobsheet');
const JobsheetItemModel = require('../models/jobsheetItem');
const PaymentModel = require('../models/payment');
const LaborModel = require('../models/labor'); 

class JobsheetService {
  static async getAllJobsheets(search, state) {
    try {
      return await JobsheetModel.getAll(search, state);
    } catch (error) {
      throw error;
    }
  }

 static async getJobsheetById(id) {
  try {
    const jobsheet = await JobsheetModel.getById(id);
    if (!jobsheet) {
      throw new Error('Jobsheet not found');
    }

    // Obtener items, labors y pagos relacionados
    const items = await JobsheetItemModel.getByJobsheetId(id);
    const labors = await LaborModel.getByJobsheetId(id);
    const payments = await PaymentModel.getByJobsheetId(id);
    
    // Calcular totales
    const itemsSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Sumar solo labors completados y facturados
    const laborsSubtotal = labors
      .filter(labor => labor.is_completed === 1 && labor.is_billed === 1)
      .reduce((sum, labor) => sum + parseFloat(labor.price || 0), 0);

    // Calcular el GST incluido (solo para mostrar información)
    const gstIncluded = (itemsSubtotal + laborsSubtotal) * 0.09 / 1.09; // 9% GST incluido
    
    // El total es simplemente la suma de items y labores (sin añadir GST adicional)
    const grandTotal = itemsSubtotal + laborsSubtotal;
    const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      ...jobsheet,
      items,
      labors,
      payments,
      itemsSubtotal,
      laborsSubtotal,
      gstIncluded, // Mostramos el GST que está incluido en los precios para información
      grandTotal, // Este es el total sin añadir GST adicional
      totalPayments,
      balance: grandTotal - totalPayments
    };
  } catch (error) {
    console.error('Error in JobsheetService.getJobsheetById:', error);
    throw error;
  }
}

  static async getJobsheetsByCustomerId(customerId) {
    try {
      return await JobsheetModel.getByCustomerId(customerId);
    } catch (error) {
      throw error;
    }
  }

  static async getJobsheetsByVehicleId(vehicleId) {
    try {
      return await JobsheetModel.getByVehicleId(vehicleId);
    } catch (error) {
      throw error;
    }
  }

  static async createJobsheet(jobsheetData) {
    try {
      return await JobsheetModel.create(jobsheetData);
    } catch (error) {
      throw error;
    }
  }

  static async updateJobsheet(id, jobsheetData) {
    try {
      const success = await JobsheetModel.update(id, jobsheetData);
      if (!success) {
        throw new Error('Jobsheet not found');
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  static async deleteJobsheet(id) {
    try {
      const success = await JobsheetModel.delete(id);
      if (!success) {
        throw new Error('Jobsheet not found');
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  static async addJobsheetItem(itemData) {
    try {
      const newItem = await JobsheetItemModel.addItem(itemData);
      // Después de añadir un item, recalcular y actualizar el total del jobsheet si está almacenado
      if (newItem && itemData.jobsheet_id) {
        await LaborModel.updateJobsheetTotal(itemData.jobsheet_id); // Reutilizamos la lógica de LaborModel o creamos una en JobsheetModel
      }
      return newItem;
    } catch (error) {
      console.error('Error in JobsheetService.addJobsheetItem:', error);
      throw error;
    }
  }

  static async updateJobsheetItem(id, itemData) {
    try {
      const success = await JobsheetItemModel.updateItem(id, itemData);
      if (!success) {
        throw new Error('Item not found');
      }
      // Después de actualizar un item, recalcular y actualizar el total del jobsheet
      // Necesitaríamos el jobsheet_id. JobsheetItemModel.updateItem debería devolverlo o JobsheetItemModel.getById
      const updatedItem = await JobsheetItemModel.getById(id); // Asume que JobsheetItemModel.getById existe
      if (updatedItem && updatedItem.jobsheet_id) {
         await LaborModel.updateJobsheetTotal(updatedItem.jobsheet_id);
      }
      return success;
    } catch (error) {
      console.error('Error in JobsheetService.updateJobsheetItem:', error);
      throw error;
    }
  }

  static async deleteJobsheetItem(id) {
    try {
      // Obtener jobsheet_id ANTES de borrar el item
      const itemToDelete = await JobsheetItemModel.getById(id); // Asume que JobsheetItemModel.getById existe
      let jobsheetId = null;
      if (itemToDelete && itemToDelete.jobsheet_id) {
        jobsheetId = itemToDelete.jobsheet_id;
      }

      const success = await JobsheetItemModel.deleteItem(id);
      if (!success) {
        throw new Error('Item not found');
      }
      // Después de eliminar un item, recalcular y actualizar el total del jobsheet
      if (jobsheetId) {
        await LaborModel.updateJobsheetTotal(jobsheetId);
      }
      return success;
    } catch (error) {
      console.error('Error in JobsheetService.deleteJobsheetItem:', error);
      throw error;
    }
  }

  static async addPayment(paymentData) {
    try {
      return await PaymentModel.create(paymentData);
    } catch (error) {
      throw error;
    }
  }

  static async updatePayment(id, paymentData) {
    try {
      const success = await PaymentModel.update(id, paymentData);
      if (!success) {
        throw new Error('Payment not found');
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  static async deletePayment(id) {
    try {
      const success = await PaymentModel.delete(id);
      if (!success) {
        throw new Error('Payment not found');
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  static async getJobsheetItems(jobsheetId) {
    try {
      const items = await JobsheetItemModel.getItemsByJobsheetId(jobsheetId);
      return items;
    } catch (error) {
      console.error('Error in service getJobsheetItems:', error);
      throw error;
    }
  }
}

module.exports = JobsheetService;