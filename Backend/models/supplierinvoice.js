const pool = require('../db');

class SupplierInvoiceModel {
  static async create(invoiceData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Insert invoice header
      const [result] = await connection.query(
        'INSERT INTO supplier_invoices (supplier_id, invoice_number, invoice_date, total_amount, notes) VALUES (?, ?, ?, ?, ?)',
        [invoiceData.supplier_id, invoiceData.invoice_number, invoiceData.invoice_date, invoiceData.total_amount, invoiceData.notes]
      );
      
      const invoiceId = result.insertId;
      
      // Insert invoice items
      for (const item of invoiceData.items) {
        await connection.query(
          'INSERT INTO supplier_invoice_items (invoice_id, product_id, description, quantity, cost_price, total_price, jobsheet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            invoiceId,
            item.product_id || null,
            item.description,
            item.quantity,
            item.cost_price,
            item.quantity * item.cost_price,
            item.jobsheet_id || null
          ]
        );
        
        // Update inventory if product_id exists
        if (item.product_id) {
          await connection.query(
            'UPDATE inventory SET stock = stock + ?, cost = ? WHERE id = ?',
            [item.quantity, item.cost_price, item.product_id]
          );
        }
      }
      
      await connection.commit();
      return { id: invoiceId, ...invoiceData };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAllInvoices() {
    const [rows] = await pool.query(`
      SELECT si.*, s.name as supplier_name 
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      ORDER BY si.invoice_date DESC
    `);
    return rows;
  }

  static async getInvoiceWithItems(invoiceId) {
    const [invoiceRows] = await pool.query(`
      SELECT si.*, s.name as supplier_name 
      FROM supplier_invoices si
      LEFT JOIN suppliers s ON si.supplier_id = s.id
      WHERE si.id = ?
    `, [invoiceId]);
    
    if (!invoiceRows.length) return null;
    
    const [itemRows] = await pool.query(`
      SELECT sii.*, i.name as product_name, i.sku 
      FROM supplier_invoice_items sii
      LEFT JOIN inventory i ON sii.product_id = i.id
      WHERE sii.invoice_id = ?
    `, [invoiceId]);
    
    return {
      ...invoiceRows[0],
      items: itemRows
    };
  }
}

module.exports = SupplierInvoiceModel;