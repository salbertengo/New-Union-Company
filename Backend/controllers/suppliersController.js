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
      
      // Insert invoice header with supplier name directly
      const [invoiceResult] = await connection.query(
        'INSERT INTO supplier_invoices (supplier_name, invoice_number, invoice_date, notes) VALUES (?, ?, ?, ?)',
        [supplier_name, invoice_number || null, invoice_date || new Date(), notes || null]
      );
      
      const invoiceId = invoiceResult.insertId;
      
      // Process each item
      for (const item of items) {
        const { product_id, quantity, cost_price, sale_price, jobsheet_id, license_plate } = item;
        
        if (!quantity || !cost_price || !sale_price) {
          throw new Error('Each item requires quantity, cost price and sale price');
        }
        
        // Insert invoice item - add sale_price to the query
        const [itemResult] = await connection.query(
          'INSERT INTO supplier_invoice_items (invoice_id, product_id, quantity, cost_price, sale_price, total_price, jobsheet_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [invoiceId, product_id || null, quantity, cost_price, sale_price, quantity * cost_price, jobsheet_id || null]
        );
        
        const invoiceItemId = itemResult.insertId;
        
        // Update inventory if product exists
        if (product_id) {
          await connection.query(
            'UPDATE inventory SET stock = stock + ? WHERE id = ?',
            [quantity, product_id]
          );
        }
        
        // If license_plate is provided but not jobsheet_id, look up the jobsheet
        let actualJobsheetId = jobsheet_id;
        if (!actualJobsheetId && license_plate) {
          console.log(`Looking up jobsheet for license plate: ${license_plate}`); // Debug
          
          const [jobsheetRows] = await connection.query(
            'SELECT id FROM jobsheets WHERE license_plate = ? ORDER BY created_at DESC LIMIT 1',
            [license_plate]
          );
          
          console.log(`Found jobsheet rows:`, jobsheetRows); // Debug
          
          if (jobsheetRows.length > 0) {
            actualJobsheetId = jobsheetRows[0].id;
            console.log(`Using jobsheet ID: ${actualJobsheetId}`); // Debug
          }
        }
        
        // If jobsheet specified or found by license plate, add to jobsheet items
        if (actualJobsheetId) {
          // Get product name from inventory if product_id exists
          let productName = '';
          if (product_id) {
            const [productRows] = await connection.query(
              'SELECT name FROM inventory WHERE id = ?',
              [product_id]
            );
            if (productRows.length > 0) {
              productName = productRows[0].name;
            }
          }
          
          // Usar el productName obtenido en el INSERT
          await connection.query(
            'INSERT INTO jobsheet_items (jobsheet_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [actualJobsheetId, product_id || null, quantity, sale_price]
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
          `, [actualJobsheetId, actualJobsheetId]);
        }
      }
      
      // Actualizar el total de la factura
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