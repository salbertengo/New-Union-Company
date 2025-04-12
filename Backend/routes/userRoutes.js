const express = require('express');
const UserController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(auth('admin'));

// GET /users - Get all users
router.get('/', UserController.getAllUsers);

// GET /users/:id - Get user by ID
router.get('/:id', UserController.getUserById);

// PUT /users/:id - Update user
router.put('/:id', UserController.updateUser);

// PUT /users/:id/password - Update user password
router.put('/:id/password', UserController.updatePassword);

// DELETE /users/:id - Delete user
router.delete('/:id', UserController.deleteUser);

module.exports = router;