const VehicleService = require('../services/vehicleService');

class VehicleController {
  static async getAll(req, res) {
    try {
      const { search, customer_id } = req.query;
      let vehicles;
      
      if (customer_id) {
        vehicles = await VehicleService.getVehiclesByCustomerId(customer_id);
      } else if (search) {
        vehicles = await VehicleService.searchVehicles(search);
      } else {
        vehicles = await VehicleService.getAllVehicles();
      }
      
      res.json(vehicles);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const id = req.params.id;
      const vehicle = await VehicleService.getVehicleById(id);
      res.json(vehicle);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const vehicleId = await VehicleService.createVehicle(req.body);
      res.status(201).json({ id: vehicleId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const id = req.params.id;
      await VehicleService.updateVehicle(id, req.body);
      res.json({ message: 'Vehicle updated successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const id = req.params.id;
      await VehicleService.deleteVehicle(id);
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = VehicleController;