const CompatibilityService = require('../services/compatibilityService');

class CompatibilityController {
  static async getCompatibleParts(req, res) {
    try {
      const { motorcycleModel, spareName } = req.query;
      const filters = {
        motorcycleModel: motorcycleModel || '',
        spareName: spareName || ''
      };
      const parts = await CompatibilityService.getCompatibleParts(filters);
      res.json(parts);
    } catch (error) {
      console.error('Error en CompatibilityController.getCompatibleParts:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async getCompatibilityByProductId(req, res) {
    try {
      const { product_id } = req.params;
      const compatibilities = await CompatibilityService.getCompatibilityByProductId(product_id);
      res.json(compatibilities);
    } catch (error) {
      console.error('Error en CompatibilityController.getCompatibilityByProductId:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async createCompatibility(req, res) {
    try {
      const data = req.body;
      const newCompatibilityId = await CompatibilityService.createCompatibility(data);
      res.status(201).json({ id: newCompatibilityId });
    } catch (error) {
      console.error('Error en CompatibilityController.createCompatibility:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async updateCompatibility(req, res) {
    try {
      const data = req.body;
      const affectedRows = await CompatibilityService.updateCompatibility(data);
      res.json({ affectedRows });
    } catch (error) {
      console.error('Error en CompatibilityController.updateCompatibility:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteCompatibility(req, res) {
    try {
      const data = req.body;
      const affectedRows = await CompatibilityService.deleteCompatibility(data);
      res.json({ affectedRows });
    } catch (error) {
      console.error('Error en CompatibilityController.deleteCompatibility:', error);
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = CompatibilityController;