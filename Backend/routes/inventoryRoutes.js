const express = require('express');
const InventoryController = require('../controllers/inventoryController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /inventory
router.get('/', InventoryController.getAll);

// GET /inventory/:id
router.get('/:id', InventoryController.getById);

// POST /inventory
router.post('/', InventoryController.create);

// PUT /inventory/:id
router.put('/:id', InventoryController.update);

// DELETE /inventory/:id
router.delete('/:id', InventoryController.delete);

module.exports = router;
