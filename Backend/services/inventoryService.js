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
    const { name, stock, cost, sale, category, sku, min, brand } = data;
    if (!name || !sku || !cost || !sale) {
      throw new Error("Missing required data");
    }
  
    return await InventoryModel.create({
      name,
      stock,
      cost,
      sale,
      category,
      sku,
      min,
      brand
    });
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

  // Nuevo método para buscar productos
  static async searchProducts(query, category) {
    let products = await InventoryModel.searchByName(query);
    
    // Si hay una categoría especificada, filtramos por ella
    if (category && category !== '') {
      products = products.filter(product => product.category === category);
    }
    
    return products;
  }
}

module.exports = InventoryService;