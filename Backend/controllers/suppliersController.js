const pool = require('../db');

class SuppliersController {
  // ===== FACTURAS DE PROVEEDORES (SUPPLIER INVOICES) =====
  
  /**
   * Get all unique supplier names
   */
  static async getAllSupplierNames(req, res) {
    try {
      const [rows] = await pool.query('SELECT DISTINCT supplier_name FROM supplier_invoices ORDER BY supplier_name');
      res.json(rows.map(row => row.supplier_name));
    } catch (error) {
      console.error('Error in SuppliersController.getAllSupplierNames:', error);
      res.status(500).json({ error: 'Error fetching supplier names' });
    }
  }
  
  /**
   * Crea una nueva factura de proveedor con sus ítems
   */
 static async createInvoice(req, res) {
  const { supplier_name, invoice_number, invoice_date, notes, items } = req.body;

  if (!supplier_name || !items || !items.length) {
    return res.status(400).json({ error: 'Supplier name and at least one item are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Insert invoice header
    const [invoiceResult] = await connection.query(
      'INSERT INTO supplier_invoices (supplier_name, invoice_number, invoice_date, notes) VALUES (?, ?, ?, ?)',
      [supplier_name, invoice_number || null, invoice_date || new Date(), notes || null]
    );
    
    const invoiceId = invoiceResult.insertId;
    
    // Process each item
    for (const item of items) {
      let { product_id, quantity, cost_price, sale_price, jobsheet_id, _isNew, sku, name, category, min } = item;
      
      if (!quantity || !cost_price || !sale_price) {
        throw new Error('Each item requires quantity, cost price and sale price');
      }
      
      // If it's a new product, create it first
      if (_isNew === true) {
        if (!sku || !name) {
          throw new Error('New products require SKU and name');
        }
        
        // For new products:
        // - If assigned to jobsheet: set initial stock to 0 (will be used immediately)
        // - If not assigned: set initial stock to the received quantity
        const initialStock = jobsheet_id ? 0 : quantity;
        
        // Create the new product in inventory
        const [newProductResult] = await connection.query(
          'INSERT INTO inventory (name, sku, cost, sale, stock, category, min) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, sku, cost_price, sale_price, initialStock, category || null, min || 0]
        );
        
        // Get the new product's ID
        product_id = newProductResult.insertId;
        
        console.log(`Created new product with ID: ${product_id}, name: ${name}, initial stock: ${initialStock}`);
      } else {
        // For existing products:
        // 1. First increase the inventory with the received quantity
        await connection.query(
          'UPDATE inventory SET stock = stock + ? WHERE id = ?',
          [quantity, product_id]
        );
        
        // 2. Then if assigned to a jobsheet, deduct the same quantity (net effect: no change to stock)
        if (jobsheet_id) {
          await connection.query(
            'UPDATE inventory SET stock = stock - ? WHERE id = ?',
            [quantity, product_id]
          );
          console.log(`Deducted ${quantity} units from inventory for product ${product_id} for jobsheet ${jobsheet_id}`);
        }
      }
      
      // Insert the item into supplier_invoice_items with the correct product_id
      // and preserve the jobsheet_id if it exists
      await connection.query(
        'INSERT INTO supplier_invoice_items (invoice_id, product_id, quantity, cost_price, sale_price, total_price, jobsheet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [invoiceId, product_id, quantity, cost_price, sale_price, quantity * cost_price, jobsheet_id || null]
      );
      
      // If there's a jobsheet associated, add this item to jobsheet_items
      if (jobsheet_id) {
        console.log(`Associating product ${product_id} with jobsheet ${jobsheet_id}`);
        
        // Check if this product is already in the jobsheet
        const [existingItems] = await connection.query(
          'SELECT * FROM jobsheet_items WHERE jobsheet_id = ? AND product_id = ?',
          [jobsheet_id, product_id]
        );
        
        if (existingItems.length > 0) {
          // Update existing product in jobsheet
          await connection.query(
            'UPDATE jobsheet_items SET quantity = quantity + ? WHERE jobsheet_id = ? AND product_id = ?',
            [quantity, jobsheet_id, product_id]
          );
        } else {
          // Add new product to jobsheet
          await connection.query(
            'INSERT INTO jobsheet_items (jobsheet_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [jobsheet_id, product_id, quantity, sale_price]
          );
        }
        
        // Update the jobsheet total amount - FIXED QUERY
        try {
          const updateResult = await connection.query(`
            UPDATE jobsheets 
            SET total_amount = (
              SELECT COALESCE(SUM(quantity * price), 0)
              FROM jobsheet_items
              WHERE jobsheet_id = ?
            )
            WHERE id = ?
          `, [jobsheet_id, jobsheet_id]);
          
          // Check if update was successful
          console.log(`Total amount update for jobsheet ${jobsheet_id}: ${JSON.stringify(updateResult[0])}`);
          
          // Double-check the current total to verify
          const [totals] = await connection.query(
            'SELECT SUM(quantity * price) as calculated_total FROM jobsheet_items WHERE jobsheet_id = ?',
            [jobsheet_id]
          );
          console.log(`Calculated total for jobsheet ${jobsheet_id}: ${JSON.stringify(totals[0])}`);
          
          // Verify jobsheet record exists
          const [jobsheet] = await connection.query('SELECT * FROM jobsheets WHERE id = ?', [jobsheet_id]);
          if (jobsheet.length === 0) {
            console.error(`Warning: Jobsheet with ID ${jobsheet_id} not found during total update`);
          } else {
            console.log(`Jobsheet ${jobsheet_id} found with current total: ${jobsheet[0].total_amount}`);
          }
        } catch (updateError) {
          console.error(`Error updating total_amount for jobsheet ${jobsheet_id}:`, updateError);
          // Continue with the transaction - don't throw error to prevent canceling entire invoice
        }
      }
    }
    
    // Update the total of the invoice
    await connection.query(`
      UPDATE supplier_invoices
      SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM supplier_invoice_items
        WHERE invoice_id = ?
      )
      WHERE id = ?
    `, [invoiceId, invoiceId]);
    
    await connection.commit();
    res.status(201).json({ 
      id: invoiceId, 
      supplier_name,
      message: 'Supplier invoice created successfully' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in SuppliersController.createInvoice:', error);
    res.status(500).json({ error: error.message || 'Error creating supplier invoice' });
  } finally {
    connection.release();
  }
}

  /**
   * Obtiene las facturas recientes
   */
  static async getRecentInvoices(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM supplier_invoices
        ORDER BY invoice_date DESC
        LIMIT 10
      `);
      
      res.json(rows);
    } catch (error) {
      console.error('Error in SuppliersController.getRecentInvoices:', error);
      res.status(500).json({ error: 'Error fetching recent invoices' });
    }
  }

  /**
   * Obtiene todas las facturas de un proveedor
   */
  static async getInvoicesBySupplier(req, res) {
    try {
      const { supplierName } = req.params;
      
      const [rows] = await pool.query(`
        SELECT si.*,
          (SELECT COUNT(*) FROM supplier_invoice_items WHERE invoice_id = si.id) as items_count
        FROM supplier_invoices si
        WHERE si.supplier_name = ?
        ORDER BY si.invoice_date DESC
      `, [supplierName]);
      
      res.json(rows);
    } catch (error) {
      console.error('Error in SuppliersController.getInvoicesBySupplier:', error);
      res.status(500).json({ error: 'Error fetching supplier invoices' });
    }
  }

  /**
   * Obtiene los detalles de una factura específica
   */
  static async getInvoiceDetails(req, res) {
    try {
      const { invoiceId } = req.params;
      
      // Obtener la información de la factura
      const [invoiceRows] = await pool.query(`
        SELECT * FROM supplier_invoices
        WHERE id = ?
      `, [invoiceId]);
      
      if (invoiceRows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Obtener los ítems de la factura
      const [itemsRows] = await pool.query(`
        SELECT sii.*, i.name as product_name, i.sku as product_sku,
          j.jobsheet_number, j.license_plate
        FROM supplier_invoice_items sii
        LEFT JOIN inventory i ON sii.product_id = i.id
        LEFT JOIN jobsheets j ON sii.jobsheet_id = j.id
        WHERE sii.invoice_id = ?
      `, [invoiceId]);
      
      res.json({
        invoice: invoiceRows[0],
        items: itemsRows
      });
    } catch (error) {
      console.error('Error in SuppliersController.getInvoiceDetails:', error);
      res.status(500).json({ error: 'Error fetching invoice details' });
    }
  }
}

module.exports = SuppliersController;