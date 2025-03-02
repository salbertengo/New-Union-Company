const InventoryService = require('../services/inventoryService');

class InventoryController {
  // Handler to get all inventory items or search by name
  static async getAll(req, res) {
    try {
      const { search, category } = req.query;
      let products;
      
      if (search) {
        products = await InventoryService.searchProducts(search, category);
      } else {
        products = await InventoryService.getAllProducts();
        
        // Si hay categoría pero no búsqueda, filtramos los resultados
        if (category && category !== '') {
          products = products.filter(product => product.category === category);
        }
      }
      
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Handler to get a single inventory item by ID
  static async getById(req, res) {
    try {
      const id = req.params.id;
      const product = await InventoryService.getProductById(id);
      res.json(product);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  // Handler to create a new inventory item
  static async create(req, res) {
    try {
      const productId = await InventoryService.createProduct(req.body);
      res.status(201).json({ id: productId });
      console.log('req.body:', req.body);
    } catch (err) {
      console.error('Error en InventoryController.create:', err); 
      res.status(400).json({ error: err.message });
    }
  }

  // Handler to update an existing inventory item
  static async update(req, res) {
    try {
      const id = req.params.id;
      await InventoryService.updateProduct(id, req.body);
      res.json({ message: 'Product updated successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Handler to delete an inventory item
  static async delete(req, res) {
    try {
      const id = req.params.id;
      await InventoryService.deleteProduct(id);
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = InventoryController;