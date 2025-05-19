const express = require('express');
const router = express.Router();
const JobsheetController = require('../controllers/jobsheetController');
const { auth } = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(auth());

// Rutas para Jobsheets
router.get('/', JobsheetController.getAllJobsheets);

// PRIMERO: Rutas específicas
router.get('/customer/:customerId', JobsheetController.getJobsheetsByCustomerId);

// Rutas para Items de Jobsheet
router.get('/:id/items', JobsheetController.getJobsheetItems);
router.post('/items', JobsheetController.addJobsheetItem);
router.put('/items/:id', JobsheetController.updateJobsheetItem);
router.delete('/items/:id', JobsheetController.deleteJobsheetItem);

// Rutas para Pagos - PRIMERO que la ruta con /:id
router.get('/payments', JobsheetController.getAllPayments);
router.get('/payments/jobsheet/:jobsheetId', JobsheetController.getPaymentsByJobsheetId);
router.post('/payments', JobsheetController.addPayment);
router.put('/payments/:id', JobsheetController.updatePayment);
router.delete('/payments/:id', JobsheetController.deletePayment);
// AL FINAL: La ruta más general con parámetro
router.get('/:id', JobsheetController.getJobsheetById);
router.post('/', JobsheetController.createJobsheet);
router.put('/:id', JobsheetController.updateJobsheet);
router.delete('/:id', JobsheetController.deleteJobsheet);

module.exports = router;