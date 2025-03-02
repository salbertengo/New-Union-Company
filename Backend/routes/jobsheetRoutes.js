const express = require('express');
const router = express.Router();
const JobsheetController = require('../controllers/jobsheetController');
const authenticateToken = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para Jobsheets
router.get('/', JobsheetController.getAllJobsheets);
router.get('/:id', JobsheetController.getJobsheetById);
router.get('/customer/:customerId', JobsheetController.getJobsheetsByCustomerId);
router.post('/', JobsheetController.createJobsheet);
router.put('/:id', JobsheetController.updateJobsheet);
router.delete('/:id', JobsheetController.deleteJobsheet);

// Rutas para Items de Jobsheet
router.post('/items', JobsheetController.addJobsheetItem);
router.put('/items/:id', JobsheetController.updateJobsheetItem);
router.delete('/items/:id', JobsheetController.deleteJobsheetItem);

// Rutas para Pagos
router.post('/payments', JobsheetController.addPayment);
router.put('/payments/:id', JobsheetController.updatePayment);
router.delete('/payments/:id', JobsheetController.deletePayment);

module.exports = router;