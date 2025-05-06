import React from 'react';

const Invoice = ({ jobsheet, items, labors, payments, taxRate, workflowType }) => {
  // Helper function for workflow type name
  const getWorkflowTypeName = (type) => {
    const types = {
      "1": "Repair",
      "2": "Deposit for Bike Sale",
      "3": "Insurance",
      "4": "HP Payment",
      "5": "Road Tax",
      "6": "HP Payment 2"
    };
    return types[type] || "Repair";
  };

  // Calculate totals
  const calculateTotals = () => {
    // Sum regular items
    const itemsTotal = items.reduce((sum, item) => 
      sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Sum billable and completed labor items
    const laborTotal = labors
      .filter(l => l.is_completed === 1 && l.is_billed === 1)
      .reduce((sum, l) => sum + parseFloat(l.price || 0), 0);
    
    const subtotal = itemsTotal + laborTotal;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return {
      items: itemsTotal,
      labor: laborTotal,
      subtotal,
      tax,
      total,
      paid,
      balance: total - paid
    };
  };

  const totals = calculateTotals();

  // Combined list of items and labor services
  const allItems = [
    ...items,
    ...labors.map(l => ({
      id: `labor-${l.id}`,
      name: l.description,
      price: l.price || 0,
      quantity: 1,
      isLabor: true
    }))
  ];

  return (
    <div className="invoice-container" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 5px 0' }}>NEW UNION COMPANY</h2>
        <div style={{ 
          display: 'inline-block', 
          padding: '4px 8px', 
          background: '#f0f0f0', 
          borderRadius: '4px',
          marginTop: '5px',
          fontSize: '14px'
        }}>
          {getWorkflowTypeName(workflowType)}
        </div>
      </div>
      
      <div className="invoice-info" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <div style={{ width: '48%' }}>
          <p><strong>Invoice #:</strong> {jobsheet?.id || ''}</p>
          <p><strong>Date:</strong> {jobsheet?.created_at 
            ? new Date(jobsheet.created_at).toLocaleDateString() 
            : new Date().toLocaleDateString()}
          </p>
          <p><strong>Customer:</strong> {jobsheet?.customer_name || 'Walk-in'}</p>
        </div>
        <div style={{ width: '48%' }}>
          <p><strong>Vehicle:</strong> {jobsheet?.vehicle_model || ''}</p>
          <p><strong>License Plate:</strong> {jobsheet?.license_plate || 'N/A'}</p>
          <p><strong>Status:</strong> {jobsheet?.state || 'Pending'}</p>
        </div>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Description</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Quantity</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Price</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                {item.isLabor ? <em>[Labor]</em> : ''} {item.name}
              </td>
              <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                ${parseFloat(item.price).toFixed(2)}
              </td>
              <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                ${(item.quantity * parseFloat(item.price)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="totals" style={{ marginLeft: 'auto', width: '300px' }}>
        <table style={{ width: '100%' }}>
          <tr>
            <td>Subtotal:</td>
            <td style={{ textAlign: 'right' }}>${totals.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax ({taxRate}%):</td>
            <td style={{ textAlign: 'right' }}>${totals.tax.toFixed(2)}</td>
          </tr>
          <tr style={{ fontWeight: 'bold' }}>
            <td>TOTAL:</td>
            <td style={{ textAlign: 'right' }}>${totals.total.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Paid:</td>
            <td style={{ textAlign: 'right' }}>${totals.paid.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Balance:</td>
            <td style={{ textAlign: 'right' }}>${Math.max(0, totals.balance).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div className="payments-table" style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '16px' }}>Payment History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Method</th>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f2f2f2' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={index}>
                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  {new Date(payment.payment_date).toLocaleDateString()}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', textTransform: 'capitalize' }}>
                  {payment.method.replace('_', ' ')}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  ${parseFloat(payment.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoice;