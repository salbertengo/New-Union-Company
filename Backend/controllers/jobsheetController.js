const JobsheetService = require('../services/jobsheetService');
const CustomerService = require('../services/customerService');
const VehicleService = require('../services/vehicleService');
const PaymentModel = require('../models/payment');
class JobsheetController {
  // En el servidor - jobsheetController.js
  static async getAllJobsheets(req, res) {
    try {
    const { search, state, vehicle_id, start_date, end_date } = req.query;
      
    const jobsheets = await JobsheetService.getAllJobsheets(search, state, start_date, end_date);
      
    const enrichedJobsheets = await Promise.all(jobsheets.map(async (js) => {
        let customer = null;
        let vehicle = null;
        
        // Determinar si es un walk-in (sin vehicle_id y sin customer_id)
        const isWalkin = !js.vehicle_id && !js.customer_id;
        
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
          // Si es walk-in, mostrar "Walk-in" como nombre del cliente
          customer_name: isWalkin 
            ? "Walk-in" 
            : (customer 
                ? (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()) 
                : `Customer unknown`),
          // Si es walk-in, mostrar "N/A" como modelo de vehículo
          vehicle_model: isWalkin 
            ? "N/A" 
            : (vehicle 
                ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() 
                : `No vehicle`),
          // Si es walk-in, mostrar "N/A" como placa
          license_plate: isWalkin 
            ? "N/A" 
            : (vehicle ? vehicle.plate : 'No plate')
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
      const jobsheetData = await JobsheetService.getJobsheetById(id);

      if (!jobsheetData) {
        return res.status(404).json({ error: 'Jobsheet not found' });
      }

      // Enrich the single jobsheet with customer and vehicle details
      let customer = null;
      let vehicle = null;
      const isWalkin = !jobsheetData.vehicle_id && !jobsheetData.customer_id;

      try {
        if (jobsheetData.customer_id) {
          customer = await CustomerService.getCustomerById(jobsheetData.customer_id);
        }
      } catch (error) {
        console.error(`Error fetching customer ${jobsheetData.customer_id} for jobsheet ${id}:`, error.message);
        // Do not throw, allow fallback in enrichment
      }

      try {
        if (jobsheetData.vehicle_id) {
          vehicle = await VehicleService.getVehicleById(jobsheetData.vehicle_id);
        }
      } catch (error) {
        console.error(`Error fetching vehicle ${jobsheetData.vehicle_id} for jobsheet ${id}:`, error.message);
        // Do not throw, allow fallback in enrichment
      }

      const enrichedJobsheet = {
        ...jobsheetData,
        customer_name: isWalkin
          ? "Walk-in"
          : (customer
              ? (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || (jobsheetData.customer_id ? `Customer #${jobsheetData.customer_id}` : 'Customer data incomplete'))
              : (jobsheetData.customer_id ? `Customer #${jobsheetData.customer_id}` : 'Customer unknown')),
        vehicle_model: isWalkin
          ? "N/A"
          : (vehicle
              ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim()
              : 'No vehicle'),
        // Ensure you use the correct field name for plate number, consistent with getAllJobsheets
        license_plate: isWalkin 
          ? "N/A" 
          : (vehicle ? vehicle.plate : 'No plate') 
      };
      
      res.json(enrichedJobsheet);
    } catch (err) {
      console.error('Error in getJobsheetById:', err.message);
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
    
    // Enhanced logging to see exact request format
    console.log('CREATE JOBSHEET REQUEST BODY:', JSON.stringify(req.body));
    console.log('Vehicle ID type:', typeof jobsheetData.vehicle_id);
    console.log('Vehicle ID value:', jobsheetData.vehicle_id);
    
    if (!jobsheetData.user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Log what we're creating for debugging
    console.log('Creating jobsheet with data:', {
      vehicle_id: jobsheetData.vehicle_id || 'none',
      customer_id: jobsheetData.customer_id || 'none',
      user_id: jobsheetData.user_id,
      state: jobsheetData.state || 'pending',
      workflow_type: jobsheetData.workflow_type || 1
    });

    try {
      // Verify vehicle exists before creating jobsheet
      if (jobsheetData.vehicle_id) {
        const vehicleExists = await VehicleService.getVehicleById(jobsheetData.vehicle_id);
        console.log('Vehicle check result:', vehicleExists ? 'Found' : 'Not found');
      }
      
      const newJobsheet = await JobsheetService.createJobsheet(jobsheetData);
      res.status(201).json(newJobsheet);
    } catch (error) {
      console.error('Error during jobsheet creation workflow:', error);
      return res.status(400).json({ error: error.message });
    }
  } catch (err) {
    console.error('Error in createJobsheet:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

  static async updateJobsheet(req, res) {
    try {
      const { id } = req.params;
      const jobsheetData = req.body;
      
      // Eliminamos la validación obligatoria de vehicle_id y customer_id
  
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