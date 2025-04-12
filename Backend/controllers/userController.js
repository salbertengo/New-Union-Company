const UserService = require('../services/userService');

class UserController {
  static async getAllUsers(req, res) {
    try {
      const users = await UserService.getAllUsers();
      res.json(users);
    } catch (err) {
      console.error('Error getting all users:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      res.json(user);
    } catch (err) {
      console.error('Error getting user by ID:', err);
      if (err.message === 'User not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      await UserService.updateUser(id, userData);
      res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
      console.error('Error updating user:', err);
      if (err.message === 'User not found') {
        res.status(404).json({ error: err.message });
      } else if (err.message === 'Username already exists' || err.message.includes('required')) {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async updatePassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      await UserService.updatePassword(id, password);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Error updating password:', err);
      if (err.message === 'User not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      await UserService.deleteUser(id);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error('Error deleting user:', err);
      if (err.message === 'User not found') {
        res.status(404).json({ error: err.message });
      } else if (err.message === 'Cannot delete the last admin user') {
        res.status(400).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

module.exports = UserController;