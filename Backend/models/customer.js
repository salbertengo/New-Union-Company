const pool = require('../db');

class CustomerModel {
    static async getAll() {
        const [rows] = await pool.query('SELECT * FROM customers');
        return rows;
    }
    static async getById(id) {
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
        return rows[0];
    }   
    static async create(data) { 
        const { name, email, phone, address} = data;
        const [result] = await pool.query(
            'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name, email, phone, address]
        );
        return result.insertId; 
    }
    static async update(id, data) {
        const { name, email, phone, address } = data;
        await pool.query(
            'UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
            [name, email, phone, address, id]
        );
        return true;
    }
    static async delete(id) {
        await pool.query('DELETE FROM customers WHERE id = ?', [id]);
        return true;
    }
    static async searchByName(query) {
        if (!query) return this.getAll();
    
        const searchTerm = `%${query.trim()}%`; 
        const [results] = await pool.query(
            'SELECT * FROM customers WHERE name LIKE ? OR email LIKE ?', 
            [searchTerm, searchTerm, searchTerm]
        );
        return results;
    }
}

module.exports = CustomerModel;