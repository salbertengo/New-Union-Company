const JobsheetService = require('../services/jobsheetService');
const CustomerService = require('../services/customerService');
const VehicleService = require('../services/vehicleService');
const PaymentModel = require('../models/payment');
class JobsheetController {
  // En el servidor - jobsheetController.js
  static async getAllJobsheets(req, res) {
    try {
      const { search, state, vehicle_id } = req.query;

      const jobsheets = await JobsheetService.getAllJobsheets(search, state);
      
      
      const enrichedJobsheets = await Promise.all(jobsheets.map(async (js) => {
        
        let customer = null;
        let vehicle = null;
        let jobsheets;
    
        if (vehicle_id) {
          jobsheets = await JobsheetService.getJobsheetsByVehicleId(vehicle_id);
        } else {
          jobsheets = await JobsheetService.getAllJobsheets(search, state);
        }
        try {
          if (js.customer_id) {
            customer = await CustomerService.getCustomerById(js.customer_id);
          }
        } catch (error) {
          console.error(`Error fetching customer ${js.customer_id}:`, error);
        }
        
        try {
          if (js.vehicle_id) {
            vehicle = await VehicleService.getVehicleById(js.vehicle_id);
          }
        } catch (error) {
          console.error(`Error fetching vehicle ${js.vehicle_id}:`, error);
        }
        
        const enriched = {
          ...js,
          customer_name: customer ? (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()) : `Cliente #${js.customer_id || 'desconocido'}`,
          vehicle_model: vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : `Vehículo #${js.vehicle_id || 'desconocido'}`,
          license_plate: vehicle ? vehicle.plate : 'Sin placa'
        };
        

        
        return enriched;
      }));
      
      res.json(enrichedJobsheets);
    } catch (err) {
      console.error('Error in getAllJobsheets:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getJobsheetById(req, res) {
    try {
      const { id } = req.params;
      const jobsheet = await JobsheetService.getJobsheetById(id);
      res.json(jobsheet);
    } catch (err) {
      console.error('Error in getJobsheetById:', err);
      if (err.message === 'Jobsheet not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async getJobsheetsByCustomerId(req, res) {
    try {
      const { customerId } = req.params;
      const jobsheets = await JobsheetService.getJobsheetsByCustomerId(customerId);
      res.json(jobsheets);
    } catch (err) {
      console.error('Error in getJobsheetsByCustomerId:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createJobsheet(req, res) {
    try {
      const jobsheetData = req.body;
      
      // Validar campos obligatorios
      if (!jobsheetData.vehicle_id || !jobsheetData.customer_id) {
        return res.status(400).json({ error: 'Vehicle ID and Customer ID are required' });
      }

      const newJobsheet = await JobsheetService.createJobsheet(jobsheetData);
      res.status(201).json(newJobsheet);
    } catch (err) {
      console.error('Error in createJobsheet:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateJobsheet(req, res) {
    try {
      const { id } = req.params;
      const jobsheetData = req.body;
      
      // Validar campos obligatorios
      if (!jobsheetData.vehicle_id || !jobsheetData.customer_id) {
        return res.status(400).json({ error: 'Vehicle ID and Customer ID are required' });
      }

      await JobsheetService.updateJobsheet(id, jobsheetData);
      res.json({ success: true, message: 'Jobsheet updated successfully' });
    } catch (err) {
      console.error('Error in updateJobsheet:', err);
      if (err.message === 'Jobsheet not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deleteJobsheet(req, res) {
    try {
      const { id } = req.params;
      await JobsheetService.deleteJobsheet(id);
      res.json({ success: true, message: 'Jobsheet deleted successfully' });
    } catch (err) {
      console.error('Error in deleteJobsheet:', err);
      if (err.message === 'Jobsheet not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async addJobsheetItem(req, res) {
    try {
      const itemData = req.body;
      
      // Validar campos obligatorios
      if (!itemData.jobsheet_id || !itemData.product_id || !itemData.quantity) {
        return res.status(400).json({ error: 'Jobsheet ID, Product ID and Quantity are required' });
      }

      const newItem = await JobsheetService.addJobsheetItem(itemData);
      res.status(201).json(newItem);
    } catch (err) {
      console.error('Error in addJobsheetItem:', err);
      if (err.message === 'Insufficient stock') {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async updateJobsheetItem(req, res) {
    try {
      const { id } = req.params;
      const itemData = req.body;
      
      // Validar campos obligatorios
      if (!itemData.quantity) {
        return res.status(400).json({ error: 'Quantity is required' });
      }

      await JobsheetService.updateJobsheetItem(id, itemData);
      res.json({ success: true, message: 'Jobsheet item updated successfully' });
    } catch (err) {
      console.error('Error in updateJobsheetItem:', err);
      if (err.message === 'Item not found') {
        res.status(404).json({ error: err.message });
      } else if (err.message === 'Insufficient stock') {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deleteJobsheetItem(req, res) {
    try {
      const { id } = req.params;
      await JobsheetService.deleteJobsheetItem(id);
      res.json({ success: true, message: 'Jobsheet item deleted successfully' });
    } catch (err) {
      console.error('Error in deleteJobsheetItem:', err);
      if (err.message === 'Item not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async addPayment(req, res) {
    try {
      const paymentData = req.body;
      
      // Validar campos obligatorios
      if (!paymentData.jobsheet_id || !paymentData.amount) {
        return res.status(400).json({ error: 'Jobsheet ID and Amount are required' });
      }

      const newPayment = await JobsheetService.addPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (err) {
      console.error('Error in addPayment:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const paymentData = req.body;
      
      // Validar campos obligatorios
      if (!paymentData.amount) {
        return res.status(400).json({ error: 'Amount is required' });
      }

      await JobsheetService.updatePayment(id, paymentData);
      res.json({ success: true, message: 'Payment updated successfully' });
    } catch (err) {
      console.error('Error in updatePayment:', err);
      if (err.message === 'Payment not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deletePayment(req, res) {
    try {
      const { id } = req.params;
      await JobsheetService.deletePayment(id);
      res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (err) {
      console.error('Error in deletePayment:', err);
      if (err.message === 'Payment not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
  static async getJobsheetItems(req, res) {
    try {
      const { id } = req.params;
      const items = await JobsheetService.getJobsheetItems(id);
      res.json(items);
    } catch (err) {
      console.error('Error in getJobsheetItems:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAllPayments(req, res) {
    try {
      console.log("getAllPayments called"); 
      const { search } = req.query;
      const payments = await PaymentModel.getAll(search || '');
      console.log(`Found ${payments.length} payments`); 
      res.json(payments);
    } catch (err) {
      console.error('Error in getAllPayments:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  static async getPaymentsByJobsheetId(req, res) {
    try {
      const { jobsheetId } = req.params;
      const payments = await PaymentModel.getByJobsheetId(jobsheetId);
      res.json(payments);
    } catch (err) {
      console.error('Error in getPaymentsByJobsheetId:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = JobsheetController;