const pool = require('../db');

class ItemAllocationModel {
  static async allocateToJobsheet(allocations) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const allocation of allocations) {
        // Check if enough quantity is available
        const [itemCheck] = await connection.query(
          'SELECT quantity, total_price, cost_price FROM supplier_invoice_items WHERE id = ?',
          [allocation.invoice_item_id]
        );
        
        if (!itemCheck.length || itemCheck[0].quantity < allocation.quantity) {
          throw new Error('Insufficient quantity available for allocation');
        }
        
        // Create allocation record
        await connection.query(
          'INSERT INTO item_allocations (invoice_item_id, jobsheet_id, quantity) VALUES (?, ?, ?)',
          [allocation.invoice_item_id, allocation.jobsheet_id, allocation.quantity]
        );
        
        // Update remaining quantity
        await connection.query(
          'UPDATE supplier_invoice_items SET quantity = quantity - ? WHERE id = ?',
          [allocation.quantity, allocation.invoice_item_id]
        );
        
        // Add to jobsheet items
        const costPrice = itemCheck[0].cost_price;
        const salePrice = costPrice * 1.5; // Default markup, adjust as needed
        
        // Get product info from supplier_invoice_items
        const [invoiceItem] = await connection.query(
          'SELECT product_id, description FROM supplier_invoice_items WHERE id = ?',
          [allocation.invoice_item_id]
        );
        
        await connection.query(
          'INSERT INTO jobsheet_items (jobsheet_id, product_id, quantity, price, cost) VALUES (?, ?, ?, ?, ?)',
          [
            allocation.jobsheet_id, 
            invoiceItem[0].product_id, 
            allocation.quantity, 
            salePrice, 
            costPrice
          ]
        );
        
        // Update jobsheet total
        await connection.query(`
          UPDATE jobsheets
          SET total_amount = (
            SELECT COALESCE(SUM(quantity * price), 0)
            FROM jobsheet_items
            WHERE jobsheet_id = ?
          )
          WHERE id = ?
        `, [allocation.jobsheet_id, allocation.jobsheet_id]);
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  static async getAllocationsForJobsheet(jobsheetId) {
    const [rows] = await pool.query(`
      SELECT a.*, sii.description, sii.cost_price, 
             si.invoice_number, si.invoice_date,
             s.name as supplier_name
      FROM item_allocations a
      JOIN supplier_invoice_items sii ON a.invoice_item_id = sii.id
      JOIN supplier_invoices si ON sii.invoice_id = si.id
      JOIN suppliers s ON si.supplier_id = s.id
      WHERE a.jobsheet_id = ?
    `, [jobsheetId]);
    
    return rows;
  }
}

module.exports = ItemAllocationModel;