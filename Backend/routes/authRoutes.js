const express = require('express');
const AuthController = require('../controllers/authController');
const router = express.Router();

router.post('/register', AuthController.register);

router.post('/login', AuthController.login);

router.get('/verify', authenticateToken, AuthController.verifyToken);

module.exports = router;
