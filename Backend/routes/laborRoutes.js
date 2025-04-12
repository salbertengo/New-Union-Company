const express = require('express');
const LaborController = require('../controllers/laborController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.use(auth());

// Rutas para Labores
router.get('/jobsheet/:jobsheetId', LaborController.getLaborsByJobsheetId);
router.post('/', LaborController.addLabor);
router.put('/:id', LaborController.updateLabor); // Añadido para actualizar estado/precio
router.delete('/:id', LaborController.deleteLabor);

module.exports = router;