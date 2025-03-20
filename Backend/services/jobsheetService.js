const JobsheetModel = require('../models/jobsheet');
const JobsheetItemModel = require('../models/jobsheetItem');
const PaymentModel = require('../models/payment');

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

      // Obtener items y pagos relacionados
      const items = await JobsheetItemModel.getByJobsheetId(id);
      const payments = await PaymentModel.getByJobsheetId(id);
      
      // Calcular totales
      const totalItems = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const totalPayments = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      return {
        ...jobsheet,
        items,
        payments,
        totalItems,
        totalPayments,
        balance: totalItems - totalPayments
      };
    } catch (error) {
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
      return await JobsheetItemModel.addItem(itemData);
    } catch (error) {
      throw error;
    }
  }

  static async updateJobsheetItem(id, itemData) {
    try {
      const success = await JobsheetItemModel.updateItem(id, itemData);
      if (!success) {
        throw new Error('Item not found');
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  static async deleteJobsheetItem(id) {
    try {
      const success = await JobsheetItemModel.deleteItem(id);
      if (!success) {
        throw new Error('Item not found');
      }
      return success;
    } catch (error) {
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