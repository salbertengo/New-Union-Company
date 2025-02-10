
const InventoryModel = require('../models/inventory');

class InventoryService {
  static async getAllProducts() {
    return await InventoryModel.getAll();
  }

  static async getProductById(id) {
    const product = await InventoryModel.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  static async createProduct(data) {
    if (!data.name || data.stock === undefined || data.cost === undefined || data.sell === undefined) {
      throw new Error('Missing required data');
    }
    return await InventoryModel.create(data);
  }

  static async updateProduct(id, data) {
    const product = await InventoryModel.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    await InventoryModel.update(id, data);
    return true;
  }

  static async deleteProduct(id) {
    const product = await InventoryModel.getById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    await InventoryModel.delete(id);
    return true;
  }
}

module.exports = InventoryService;
