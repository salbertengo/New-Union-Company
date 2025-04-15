const VehicleModel = require('../models/vehicle');
const CustomerModel = require('../models/customer');

class VehicleService {
  static async getAllVehicles() {
    return await VehicleModel.getAll();
  }

  static async getVehicleById(id) {
    const vehicle = await VehicleModel.getById(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    return vehicle;
  }

  static async getVehiclesByCustomerId(customerId) {
    // Verificar que el cliente existe
    const customer = await CustomerModel.getById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return await VehicleModel.getByCustomerId(customerId);
  }

  static async createVehicle(data) {
    if (!data.plate || !data.model) {
      throw new Error("Plate and model are required");
    }

    return await VehicleModel.create(data);
  }

  static async updateVehicle(id, data) {
    if (!data.plate || !data.model) {
      throw new Error("Plate and model are required");
    }

    // Verificar que el vehículo existe
    const vehicle = await VehicleModel.getById(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }



    return await VehicleModel.update(id, data);
  }

  static async deleteVehicle(id) {
    const vehicle = await VehicleModel.getById(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    return await VehicleModel.delete(id);
  }

  static async searchVehicles(term) {
    if (!term || term.trim() === '') {
      return await VehicleModel.getAll();
    }
    return await VehicleModel.search(term);
  }
}

module.exports = VehicleService;