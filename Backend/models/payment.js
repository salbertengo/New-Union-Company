const pool = require('../db');

class PaymentModel {
  static async getByJobsheetId(jobsheetId) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM payments
        WHERE jobsheet_id = ?
        ORDER BY payment_date DESC
      `, [jobsheetId]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async create(paymentData) {
    try {
      const [result] = await pool.query(`
        INSERT INTO payments (jobsheet_id, amount, method)
        VALUES (?, ?, ?)
      `, [
        paymentData.jobsheet_id,
        paymentData.amount,
        paymentData.method || 'cash'
      ]);

      return { id: result.insertId, ...paymentData };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, paymentData) {
    try {
      const [result] = await pool.query(`
        UPDATE payments
        SET amount = ?,
            method = ?
        WHERE id = ?
      `, [
        paymentData.amount,
        paymentData.method,
        id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM payments WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getTotalPayments(jobsheetId) {
    try {
      const [rows] = await pool.query(`
        SELECT SUM(amount) as total
        FROM payments
        WHERE jobsheet_id = ?
      `, [jobsheetId]);
      
      return rows[0]?.total || 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PaymentModel;