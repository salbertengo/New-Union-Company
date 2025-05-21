const express = require('express');
const InventoryController = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth());

router.get('/', InventoryController.getAll);
router.get('/categories', InventoryController.getCategories);
router.get('/brands', InventoryController.getBrands);        
router.get('/:id', InventoryController.getById);           
router.post('/', auth('admin'), InventoryController.create);
router.put('/:id', auth('admin'), InventoryController.update);
router.delete('/:id', auth('admin'), InventoryController.delete);

module.exports = router;