const express = require('express');
const AuthController = require('../controllers/authController');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/verify', auth(), AuthController.verifyToken);


module.exports = router;
