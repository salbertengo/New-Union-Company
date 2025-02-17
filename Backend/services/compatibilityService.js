const CompatibilityModel = require('../models/compatibility');

class CompatibilityService {
  static async getCompatibleParts(filters) {
    const { motorcycleModel, spareName } = filters;
    return await CompatibilityModel.getCompatibleParts(motorcycleModel, spareName);
  }

  static async getCompatibilityByProductId(product_id) {
    return await CompatibilityModel.getByProductId(product_id);
  }

  static async createCompatibility(data) {
    return await CompatibilityModel.create(data);
  }

  static async updateCompatibility(data) {
    return await CompatibilityModel.update(data);
  }

  static async deleteCompatibility(data) {
    return await CompatibilityModel.delete(data);
  }
}

module.exports = CompatibilityService;