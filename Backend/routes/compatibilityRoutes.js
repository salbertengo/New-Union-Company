const express = require('express');
const router = express.Router();
const CompatibilityController = require('../controllers/compatibilityController');
const { auth } = require('../middleware/auth');

router.use(auth());

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