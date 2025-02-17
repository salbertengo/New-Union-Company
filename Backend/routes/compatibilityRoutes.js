const express = require('express');
const CompatibilityController = require('../controllers/compatibilityController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET: Consultar compatibilidades con filtros
router.get('/', CompatibilityController.getCompatibleParts);

// GET: Consultar compatibilidad por ID
router.get('/:product_id', CompatibilityController.getCompatibilityByProductId);

// POST: Agregar una compatibilidad
router.post('/', CompatibilityController.createCompatibility);

// PUT: Actualizar una compatibilidad
router.put('/', CompatibilityController.updateCompatibility);

// DELETE: Eliminar una compatibilidad
router.delete('/', CompatibilityController.deleteCompatibility);

module.exports = router;