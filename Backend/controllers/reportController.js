const JobsheetModel = require('../models/jobsheet');
const LaborModel = require('../models/labor');
const PaymentModel = require('../models/payment');
const pool = require('../db');

class ReportController {
  
  static async getDetailedJobsheets(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Format dates to SQL format
      const startDateFormatted = new Date(start_date).toISOString().split('T')[0];
      const endDateFormatted = new Date(end_date).toISOString().split('T')[0];

      // Get all jobsheets for the period with customer and vehicle info
      const [jobsheets] = await pool.query(`
        SELECT 
          j.id,
          j.created_at,
          j.state,
          j.total_amount,
          c.name as customer_name,
          v.plate as license_plate
        FROM 
          jobsheets j
        LEFT JOIN 
          customers c ON j.customer_id = c.id
        LEFT JOIN 
          vehicles v ON j.vehicle_id = v.id
        WHERE 
          j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed'  -- Added filter for completed state
        ORDER BY 
          j.created_at DESC
      `, [startDateFormatted, endDateFormatted]);

      // For each jobsheet, determine the dominant workflow type
      const enrichedJobsheets = await Promise.all(jobsheets.map(async (js) => {
        // Get labor entries for this jobsheet
        const [labors] = await pool.query(`
          SELECT workflow_type, COUNT(*) as count, SUM(price) as total
          FROM labor
          WHERE jobsheet_id = ? AND is_completed = 1 AND is_billed = 1
          GROUP BY workflow_type
          ORDER BY total DESC
          LIMIT 1
        `, [js.id]);

        // Determine the dominant workflow type (the one with highest total)
        let workflowType = null;
        if (labors.length > 0) {
          // If there are workflow-specific labors, use the type with the highest total
          workflowType = labors[0].workflow_type;
        } else {
          // If no workflow-specific labors, check if there are regular jobsheet items
          const [itemsCheck] = await pool.query(`
            SELECT COUNT(*) as count
            FROM jobsheet_items
            WHERE jobsheet_id = ?
          `, [js.id]);
          
          if (itemsCheck[0].count > 0) {
            // If there are regular items but no labor, it's type 1 (repairs/parts)
            workflowType = "1";
          }
        }
        
        // Get walk-in status
        const isWalkin = !js.license_plate && !js.customer_name;
        
        // Return enriched jobsheet
        return {
          ...js,
          workflow_type: workflowType,
          customer_name: isWalkin ? "Walk-in" : (js.customer_name || "Walk-in"),
          license_plate: isWalkin ? "N/A" : (js.license_plate || "Walk-in"),
        };
      }));

      res.json(enrichedJobsheets);
    } catch (err) {
      console.error('Error in getDetailedJobsheets:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  static async getExportData(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Format dates to SQL format
      const startDateFormatted = new Date(start_date).toISOString().split('T')[0];
      const endDateFormatted = new Date(end_date).toISOString().split('T')[0];

      // Get all jobsheets for the period with customer and vehicle info
      const [jobsheets] = await pool.query(`
        SELECT 
          j.id,
          j.created_at,
          j.state,
          c.name as customer_name,
          v.plate as license_plate
        FROM 
          jobsheets j
        LEFT JOIN 
          customers c ON j.customer_id = c.id
        LEFT JOIN 
          vehicles v ON j.vehicle_id = v.id
        WHERE 
          j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed' -- Added filter for completed state
        ORDER BY 
          j.created_at DESC
      `, [startDateFormatted, endDateFormatted]);

      // Prepare export data with workflow breakdown
      const exportRows = [];
      
      for (const js of jobsheets) {
        // Get workflows for this jobsheet (from labor table)
        const [workflowsResult] = await pool.query(`
          SELECT 
            workflow_type, 
            SUM(price) as labor_amount 
          FROM 
            labor 
          WHERE 
            jobsheet_id = ? 
            AND is_completed = 1 
            AND is_billed = 1 
          GROUP BY 
            workflow_type
        `, [js.id]);
        
        // Get payments for this jobsheet
        const [paymentsResult] = await pool.query(`
          SELECT 
            method, 
            SUM(amount) as total_paid 
          FROM 
            payments 
          WHERE 
            jobsheet_id = ? 
          GROUP BY 
            method
        `, [js.id]);
        
        // Transform payments into a map for easier access
        const paymentsByMethod = {
          cash: 0,
          paynow: 0,
          other: 0
        };
        
        paymentsResult.forEach(payment => {
          const method = payment.method?.toLowerCase() || 'other';
          if (method === 'cash') {
            paymentsByMethod.cash = parseFloat(payment.total_paid || 0);
          } else if (method === 'paynow') {
            paymentsByMethod.paynow = parseFloat(payment.total_paid || 0);
          } else {
            paymentsByMethod.other = parseFloat(payment.total_paid || 0);
          }
        });
        
        // Process item amounts for workflow type 1 (Repairs)
        const [itemsResult] = await pool.query(`
          SELECT 
            SUM(price * quantity) as items_total 
          FROM 
            jobsheet_items 
          WHERE 
            jobsheet_id = ?
        `, [js.id]);
        
        const itemsTotal = parseFloat(itemsResult[0]?.items_total || 0);
        
        // If we have itemsTotal but no workflow 1, add it
        let hasRepairWorkflow = false;
        
        // Process each workflow and create separate row for each
        if (workflowsResult.length > 0) {
          for (const workflow of workflowsResult) {
            const workflowType = workflow.workflow_type;
            let rowTotal = parseFloat(workflow.labor_amount || 0);
            let gstValue = 0;
            
            // For workflow type 1, add items total and calculate GST on items
            if (workflowType === '1') {
              hasRepairWorkflow = true;
              rowTotal += itemsTotal;
              gstValue = itemsTotal * 0.09; // GST is 9% on items only
            }
            
            // Calculate proportional payment distribution based on workflow amount vs total
            const totalPaid = paymentsByMethod.cash + paymentsByMethod.paynow + paymentsByMethod.other;
            
            // Ensure rowTotal is not zero to avoid division by zero if totalPaid is also zero.
            // If rowTotal is zero, proportion should be zero.
            // If totalPaid is zero but rowTotal is not, this logic might need review based on business rules
            // for how to distribute $0 payment across non-zero work. Assuming 0 if no payment.
            const proportion = totalPaid > 0 && rowTotal > 0 ? rowTotal / totalPaid : 0;
            
            exportRows.push({
              date: js.created_at,
              customer: js.license_plate || "Walk-in",
              jobsheet_number: js.id,
              code: workflowType,
              cash_amount: paymentsByMethod.cash * proportion,
              paynow_amount: paymentsByMethod.paynow * proportion,
              other_amount: paymentsByMethod.other * proportion,
              gst_value: gstValue
            });
          }
        }
        
        // If no repair workflow but we have items, add one
        if (!hasRepairWorkflow && itemsTotal > 0) {
          const gstValue = itemsTotal * 0.09;
          // Distribute payments if any. If no payments, amounts will be 0.
          const totalJobAmountForProportion = itemsTotal; // This is the only amount for this "virtual" workflow
          const totalPaid = paymentsByMethod.cash + paymentsByMethod.paynow + paymentsByMethod.other;
          const proportion = totalPaid > 0 && totalJobAmountForProportion > 0 ? totalJobAmountForProportion / totalPaid : 0;


          exportRows.push({
            date: js.created_at,
            customer: js.license_plate || "Walk-in",
            jobsheet_number: js.id,
            code: "1", // Repair workflow
            cash_amount: paymentsByMethod.cash * proportion,
            paynow_amount: paymentsByMethod.paynow * proportion,
            other_amount: paymentsByMethod.other * proportion,
            gst_value: gstValue
          });
        }
        
        // If no workflows at all but we have payments, add a generic entry
        // This case might need re-evaluation: if a jobsheet is 'completed' but has no items/labor,
        // it implies it might be an empty jobsheet or an error.
        // However, if payments exist, we list them.
        if (workflowsResult.length === 0 && itemsTotal === 0 && 
            (paymentsByMethod.cash > 0 || paymentsByMethod.paynow > 0 || paymentsByMethod.other > 0)) {
          exportRows.push({
            date: js.created_at,
            customer: js.license_plate || "Walk-in",
            jobsheet_number: js.id,
            code: null, // No specific workflow
            cash_amount: paymentsByMethod.cash, // All payment attributed here
            paynow_amount: paymentsByMethod.paynow,
            other_amount: paymentsByMethod.other,
            gst_value: 0
          });
        }
      }

      res.json(exportRows);
    } catch (err) {
      console.error('Error in getExportData:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Modificar el método getWorkflowSummary para incluir totales por método de pago
  static async getWorkflowSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Format dates to SQL format
      const startDateFormatted = new Date(start_date).toISOString().split('T')[0];
      const endDateFormatted = new Date(end_date).toISOString().split('T')[0];
      
      // Nuevo: Obtener totales por método de pago for completed jobsheets
      const [paymentMethodTotals] = await pool.query(`
        SELECT 
          p.method, 
          SUM(p.amount) as total_amount 
        FROM 
          payments p
        JOIN
          jobsheets j ON p.jobsheet_id = j.id
        WHERE 
          j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed' -- Added filter for completed state
        GROUP BY 
          p.method
      `, [startDateFormatted, endDateFormatted]);

      // Preparar objetos de totales
      const paymentMethods = {
        cash: 0,
        paynow: 0,
        other: 0
      };

      paymentMethodTotals.forEach(item => {
        const method = item.method?.toLowerCase() || 'other';
        if (method === 'cash') {
          paymentMethods.cash = parseFloat(item.total_amount || 0);
        } else if (method === 'paynow') {
          paymentMethods.paynow = parseFloat(item.total_amount || 0);
        } else {
          paymentMethods.other += parseFloat(item.total_amount || 0);
        }
      });

      // First, sum the workflow-specific labor entries (types 2-6) from completed jobsheets
      const [workflowResults] = await pool.query(`
        SELECT 
          l.workflow_type, 
          SUM(l.price) as total_amount
        FROM 
          labor l
        JOIN
          jobsheets j ON l.jobsheet_id = j.id
        WHERE 
          j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND l.is_completed = 1
          AND l.is_billed = 1
          AND j.state = 'completed' -- Added filter for completed state
          AND l.workflow_type IN ('2', '3', '4', '5', '6')
        GROUP BY 
          l.workflow_type
      `, [startDateFormatted, endDateFormatted]);

      // Then, get the type 1 (repairs) total from completed jobsheets
      const [repairsResult] = await pool.query(`
        SELECT 
          SUM(repair_total) as repair_amount
        FROM (
          -- Sum of labor with workflow_type = 1 from completed jobsheets
          SELECT SUM(l.price) as repair_total 
          FROM labor l
          JOIN jobsheets j ON l.jobsheet_id = j.id
          WHERE 
            j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
            AND l.is_completed = 1 
            AND l.is_billed = 1
            AND j.state = 'completed' -- Added filter for completed state
            AND l.workflow_type = '1'
          
          UNION ALL
          
          -- Sum of jobsheet items (parts, etc.) from completed jobsheets
          SELECT SUM(ji.price * ji.quantity) as repair_total
          FROM jobsheet_items ji
          JOIN jobsheets j ON ji.jobsheet_id = j.id
          WHERE 
            j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
            AND j.state = 'completed' -- Added filter for completed state
        ) as combined
      `, [startDateFormatted, endDateFormatted, startDateFormatted, endDateFormatted]);

      // Calculate total GST (only on items) from completed jobsheets
      const [gstResult] = await pool.query(`
        SELECT SUM(ji.price * ji.quantity * 0.09) as total_gst
        FROM jobsheet_items ji
        JOIN jobsheets j ON ji.jobsheet_id = j.id
        WHERE 
          j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed' -- Added filter for completed state
      `, [startDateFormatted, endDateFormatted]);

      // Initialize the result object with all workflow types set to 0
      const workflowAmounts = {
        "1": 0, // Repairs
        "2": 0, // Bike Sales
        "3": 0, // Insurance
        "4": 0, // HP Payment
        "5": 0, // Road Tax
        "6": 0  // HP Payment 2
      };
      
      // Add the workflow totals from database results
      workflowResults.forEach(item => {
        workflowAmounts[item.workflow_type] = parseFloat(item.total_amount || 0);
      });
      
      // Add the repairs total (workflow_type 1)
      workflowAmounts["1"] = parseFloat(repairsResult[0]?.repair_amount || 0);

      // Get total COMPLETED jobsheets for the period
      const [jobsheetCount] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM jobsheets 
        WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
        AND state = 'completed' -- Added filter for completed state
      `, [startDateFormatted, endDateFormatted]);

      // Get status counts for COMPLETED jobsheets (will only show 'completed')
      const [statusCounts] = await pool.query(`
        SELECT 
          state, 
          COUNT(*) as count 
        FROM jobsheets 
        WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) 
        AND state = 'completed' -- Added filter for completed state
        GROUP BY state
      `, [startDateFormatted, endDateFormatted]);

      const statuses = {};
      statusCounts.forEach(status => {
        statuses[status.state] = status.count;
      });

      // Return the complete summary
      res.json({
        period: {
          start_date: startDateFormatted,
          end_date: endDateFormatted
        },
        workflows: workflowAmounts,
        payment_methods: paymentMethods,
        gst: {
          total: parseFloat(gstResult[0]?.total_gst || 0)
        },
        jobsheets: {
          total: jobsheetCount[0]?.total || 0,
          statuses
        }
      });
    } catch (err) {
      console.error('Error in getWorkflowSummary:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  static async getWorkflowByPaymentMethod(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
  
      // Format dates to SQL format
      const startDateFormatted = new Date(start_date).toISOString().split('T')[0];
      const endDateFormatted = new Date(end_date).toISOString().split('T')[0];
      
      // Query to get the correlation between workflow types and payment methods
      const [results] = await pool.query(`
        WITH JobTotals AS (
          -- Get total amount for each completed jobsheet
          SELECT 
            j.id AS jobsheet_id,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '1' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) + 
            COALESCE(
              (SELECT SUM(ji.price * ji.quantity) FROM jobsheet_items ji 
               WHERE ji.jobsheet_id = j.id),
              0
            ) AS repair_total,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '2' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) AS bikesale_total,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '3' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) AS insurance_total,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '4' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) AS hp_bq_total,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '5' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) AS roadtax_total,
            COALESCE(
              (SELECT SUM(l.price) FROM labor l 
               WHERE l.jobsheet_id = j.id AND l.workflow_type = '6' 
               AND l.is_completed = 1 AND l.is_billed = 1),
              0
            ) AS hp_nu_total
          FROM jobsheets j
          WHERE j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed'
        ),
        PaymentBreakdown AS (
          -- Get payment breakdown for each jobsheet
          SELECT
            p.jobsheet_id,
            CASE WHEN LOWER(p.method) = 'cash' THEN p.amount ELSE 0 END AS cash_amount,
            CASE WHEN LOWER(p.method) = 'paynow' THEN p.amount ELSE 0 END AS paynow_amount,
            CASE WHEN LOWER(p.method) NOT IN ('cash', 'paynow') THEN p.amount ELSE 0 END AS nets_amount
          FROM payments p
          JOIN jobsheets j ON p.jobsheet_id = j.id
          WHERE j.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
          AND j.state = 'completed'
        ),
        JobPaymentTotals AS (
          -- Sum payments by method for each jobsheet
          SELECT
            jobsheet_id,
            SUM(cash_amount) AS cash_total,
            SUM(paynow_amount) AS paynow_total,
            SUM(nets_amount) AS nets_total,
            SUM(cash_amount) + SUM(paynow_amount) + SUM(nets_amount) AS total_payments
          FROM PaymentBreakdown
          GROUP BY jobsheet_id
        )
        -- Calculate the proportion of each workflow paid by each method
        SELECT
          '1' AS workflow_type,
          'Repairs' AS workflow_name,
          SUM(CASE WHEN jt.repair_total > 0 AND jpt.total_payments > 0 
              THEN (jt.repair_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.repair_total > 0 AND jpt.total_payments > 0 
              THEN (jt.repair_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.repair_total > 0 AND jpt.total_payments > 0 
              THEN (jt.repair_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
        
        UNION ALL
        
        SELECT
          '2' AS workflow_type,
          'Sale Deposit(bikesale)' AS workflow_name,
          SUM(CASE WHEN jt.bikesale_total > 0 AND jpt.total_payments > 0 
              THEN (jt.bikesale_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.bikesale_total > 0 AND jpt.total_payments > 0 
              THEN (jt.bikesale_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.bikesale_total > 0 AND jpt.total_payments > 0 
              THEN (jt.bikesale_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
        
        UNION ALL
        
        SELECT
          '3' AS workflow_type,
          'Insurance' AS workflow_name,
          SUM(CASE WHEN jt.insurance_total > 0 AND jpt.total_payments > 0 
              THEN (jt.insurance_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.insurance_total > 0 AND jpt.total_payments > 0 
              THEN (jt.insurance_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.insurance_total > 0 AND jpt.total_payments > 0 
              THEN (jt.insurance_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
        
        UNION ALL
        
        SELECT
          '5' AS workflow_type,
          'Road tax/COE' AS workflow_name,
          SUM(CASE WHEN jt.roadtax_total > 0 AND jpt.total_payments > 0 
              THEN (jt.roadtax_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.roadtax_total > 0 AND jpt.total_payments > 0 
              THEN (jt.roadtax_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.roadtax_total > 0 AND jpt.total_payments > 0 
              THEN (jt.roadtax_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
        
        UNION ALL
        
        SELECT
          '4' AS workflow_type,
          'BQ HP' AS workflow_name,
          SUM(CASE WHEN jt.hp_bq_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_bq_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.hp_bq_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_bq_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.hp_bq_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_bq_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
        
        UNION ALL
        
        SELECT
          '6' AS workflow_type,
          'NU HP' AS workflow_name,
          SUM(CASE WHEN jt.hp_nu_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_nu_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.cash_total 
              ELSE 0 END) AS cash_amount,
          SUM(CASE WHEN jt.hp_nu_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_nu_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.paynow_total 
              ELSE 0 END) AS paynow_amount,
          SUM(CASE WHEN jt.hp_nu_total > 0 AND jpt.total_payments > 0 
              THEN (jt.hp_nu_total / NULLIF((jt.repair_total + jt.bikesale_total + jt.insurance_total + 
                   jt.hp_bq_total + jt.roadtax_total + jt.hp_nu_total), 0)) * jpt.nets_total 
              ELSE 0 END) AS nets_amount
        FROM JobTotals jt
        JOIN JobPaymentTotals jpt ON jt.jobsheet_id = jpt.jobsheet_id
      `, [startDateFormatted, endDateFormatted, startDateFormatted, endDateFormatted]);
      
      // Process results and calculate totals
      let totalCash = 0;
      let totalPaynow = 0;
      let totalNets = 0;
      
      const processedResults = results.map(row => {
        const cashAmount = parseFloat(row.cash_amount || 0);
        const paynowAmount = parseFloat(row.paynow_amount || 0);
        const netsAmount = parseFloat(row.nets_amount || 0);
        
        totalCash += cashAmount;
        totalPaynow += paynowAmount;
        totalNets += netsAmount;
        
        return {
          workflow_type: row.workflow_type,
          workflow_name: row.workflow_name,
          cash_amount: cashAmount,
          paynow_amount: paynowAmount,
          nets_amount: netsAmount,
          row_total: cashAmount + paynowAmount + netsAmount
        };
      });
      
      // Add a total row
      processedResults.push({
        workflow_type: 'total',
        workflow_name: 'Total',
        cash_amount: totalCash,
        paynow_amount: totalPaynow,
        nets_amount: totalNets,
        row_total: totalCash + totalPaynow + totalNets
      });
      
      res.json({
        period: {
          start_date: startDateFormatted,
          end_date: endDateFormatted
        },
        data: processedResults
      });
    } catch (err) {
      console.error('Error in getWorkflowByPaymentMethod:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ReportController;