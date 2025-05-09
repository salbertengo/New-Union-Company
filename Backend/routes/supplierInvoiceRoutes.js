const express = require('express');
const router = express.Router();
const SuppliersController = require('../controllers/suppliersController');

// Get all unique supplier names from invoices
router.get('/names', SuppliersController.getAllSupplierNames);

// Get recent supplier invoices
router.get('/recent', SuppliersController.getRecentInvoices);

// Create a new supplier invoice
router.post('/', SuppliersController.createInvoice);

// Get invoices by supplier name
router.get('/by-supplier/:supplierName', SuppliersController.getInvoicesBySupplier);

// Get invoice details by ID
router.get('/:invoiceId', SuppliersController.getInvoiceDetails);

module.exports = router;