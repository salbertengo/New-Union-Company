const CustomerService = require('../services/customerService');

class CustomerController {
  static async getAll(req, res) {
    try {
      const { search } = req.query;
      let customers;
      
      if (search) {
        customers = await CustomerService.searchCustomers(search);
      } else {
        customers = await CustomerService.getAllCustomers();
      }
      
      res.json(customers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const id = req.params.id;
      const customer = await CustomerService.getCustomerById(id);
      res.json(customer);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const customerId = await CustomerService.createCustomer(req.body);
      res.status(201).json({ id: customerId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const id = req.params.id;
      await CustomerService.updateCustomer(id, req.body);
      res.json({ message: 'Customer updated successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const id = req.params.id;
      await CustomerService.deleteCustomer(id);
      res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = CustomerController;