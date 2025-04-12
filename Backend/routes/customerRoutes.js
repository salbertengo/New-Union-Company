const express = require('express');
const CustomerController = require('../controllers/customerController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth());

// GET /customers
router.get('/', CustomerController.getAll);

// GET /customers/:id
router.get('/:id', CustomerController.getById);

// POST /customers
router.post('/', CustomerController.create);

// PUT /customers/:id
router.put('/:id', CustomerController.update);

// DELETE /customers/:id
router.delete('/:id', CustomerController.delete);

module.exports = router;