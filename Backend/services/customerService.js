const CustomerModel = require('../models/customer');

class CustomerService {
  static async getAllCustomers() {
    return await CustomerModel.getAll();
  }

  static async getCustomerById(id) {
    const customer = await CustomerModel.getById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  static async createCustomer(data) {
    if (!data.name) {
      throw new Error("Customer name is required");
    }
    return await CustomerModel.create(data);
  }

  static async updateCustomer(id, data) {
    if (!data.name) {
      throw new Error("Customer name is required");
    }

    const customer = await CustomerModel.getById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return await CustomerModel.update(id, data);
  }

  static async deleteCustomer(id) {
    const customer = await CustomerModel.getById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return await CustomerModel.delete(id);
  }

  static async searchCustomers(term) {
    if (!term || term.trim() === '') {
      return await CustomerModel.getAll();
    }
    return await CustomerModel.searchByName(term); 
  }
}

module.exports = CustomerService;