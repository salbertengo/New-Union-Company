const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

router.use(auth());

router.get('/workflow-summary', ReportController.getWorkflowSummary);
router.get('/detailed-jobsheets', ReportController.getDetailedJobsheets);
router.get('/export-data', ReportController.getExportData);
router.get('/workflow-payment-breakdown', ReportController.getWorkflowByPaymentMethod);
module.exports = router;