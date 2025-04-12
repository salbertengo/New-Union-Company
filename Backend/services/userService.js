const UserModel = require('../models/user');

class UserService {
  static async getAllUsers() {
    return await UserModel.getAll();
  }

  static async getUserById(id) {
    const user = await UserModel.getById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async getUserByUsername(username) {
    return await UserModel.getByUsername(username);
  }

  static async createUser(userData) {
    // Validate required fields
    if (!userData.name || !userData.username || !userData.password) {
      throw new Error('Name, username and password are required');
    }

    // Check if username already exists
    const existingUser = await UserModel.getByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    return await UserModel.create(userData);
  }

  static async updateUser(id, userData) {
    // Validate required fields
    if (!userData.name || !userData.username || !userData.role) {
      throw new Error('Name, username and role are required');
    }

    // Check if user exists
    const user = await UserModel.getById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (userData.username !== user.username) {
      const existingUser = await UserModel.getByUsername(userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }
    }

    return await UserModel.update(id, userData);
  }

  static async updatePassword(id, password) {
    if (!password) {
      throw new Error('Password is required');
    }

    const user = await UserModel.getById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return await UserModel.updatePassword(id, password);
  }

  static async deleteUser(id) {
    const user = await UserModel.getById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const allUsers = await UserModel.getAll();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    return await UserModel.delete(id);
  }
}

module.exports = UserService;