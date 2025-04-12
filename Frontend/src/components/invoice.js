import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faDownload, faEnvelope, faTimes } from '@fortawesome/free-solid-svg-icons';

const Invoice = ({ 
    isOpen, 
    onClose, 
    jobsheet, 
    items = [], 
    labors = [], 
    payments = [],
    taxRate = 0,
    taxName = "No Tax"
  }) => {
  // State for invoice settings
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const invoiceRef = useRef(null);

  // Generate invoice number when jobsheet changes
  useEffect(() => {
    if (jobsheet && jobsheet.id) {
      const today = new Date();
      const invoiceNum = `INV-${jobsheet.id}-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      setInvoiceNumber(invoiceNum);
    }
  }, [jobsheet]);

  // Calculate totals
  const itemsTotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const laborTotal = labors
    .filter(labor => labor.is_completed === 1)
    .reduce((sum, labor) => sum + parseFloat(labor.price || 0), 0);
  const totalAmount = parseFloat(jobsheet?.total_amount || (itemsTotal + laborTotal));
  const amountPaid = parseFloat(jobsheet?.amount_paid || 0);
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const subtotal = itemsTotal + laborTotal;
  const taxAmount = subtotal * (taxRate / 100);
  const totalWithTax = subtotal + taxAmount;
  const handlePrintInvoice = () => {
    const printContents = invoiceRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Invoice #${invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9ff; }
            .invoice-header { margin-bottom: 20px; }
            .invoice-footer { margin-top: 30px; }
            .text-right { text-align: right; }
            .amount { font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f8f9ff; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
    
    // Reload to reattach event handlers
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "800px",
          padding: "20px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>
            Customer Invoice - Job Sheet #{jobsheet?.id}
          </h2>
          <div>
            <button
              onClick={handlePrintInvoice}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6A1B9A",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              <FontAwesomeIcon icon={faPrint} style={{ marginRight: "6px" }} />
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                lineHeight: "1",
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Invoice Settings Form */}
        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f8f9ff",
            borderRadius: "6px",
            border: "1px solid #e0e4ff"
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "#333" }}>
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Invoice #"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "14px"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "#333" }}>
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "14px"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "#333" }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "14px"
              }}
            />
          </div>
        </div>

        {/* Invoice Preview */}
        <div
          ref={invoiceRef}
          style={{
            marginTop: "20px",
            padding: "20px",
            border: "1px solid #e0e4ff",
            borderRadius: "6px",
            backgroundColor: "white"
          }}
        >
          {/* Invoice Header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <div>
              <h1 style={{ fontSize: "24px", marginBottom: "5px", color: "#5932EA" }}>INVOICE</h1>
              <div style={{ fontSize: "14px", color: "#666" }}>
                <div><strong>Invoice #:</strong> {invoiceNumber}</div>
                <div><strong>Date:</strong> {new Date(invoiceDate).toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> {new Date(dueDate).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ fontSize: "18px", marginBottom: "5px" }}>New Union Company</h2>
              <div style={{ fontSize: "14px", color: "#666" }}>
                <div>9004 Tampines St #01-106</div>
                <div>Singapore 523888</div>
                <div>Phone: (+65) 67849488</div>
                <div>Email: bt@newunioncompany.com</div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Bill To:</h3>
              <div style={{ fontSize: "14px" }}>
                <div><strong>{jobsheet?.customer_name}</strong></div>
                <div>{jobsheet?.customer_address || "No address provided"}</div>
                <div>{jobsheet?.customer_phone || "No phone provided"}</div>
                <div>{jobsheet?.customer_email || "No email provided"}</div>
              </div>
            </div>

          </div>

          {/* Items Section */}
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Items:</h3>
          {items.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#666", marginBottom: "20px" }}>No items added to this job sheet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Description
                  </th>
                  <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Quantity
                  </th>
                  <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Unit Price
                  </th>
                  <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`item-${item.id}`}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                      {item.name}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #eee" }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #eee" }}>
                      ${parseFloat(item.price).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #eee" }}>
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Labor Section */}
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Labor:</h3>
          {labors.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#666", marginBottom: "20px" }}>No labor charges added to this job sheet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Description
                  </th>
                  <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {labors.filter(labor => labor.is_completed === 1).map((labor) => (
                  <tr key={`labor-${labor.id}`}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                      {labor.description}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #eee" }}>
                      <span style={{ 
                        padding: "3px 8px",
                        backgroundColor: "#E6F7E6",
                        color: "#00C853",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}>
                        Completed
                      </span>
                    </td>
                    <td style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #eee" }}>
                      ${parseFloat(labor.price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Summary Section */}
          <div style={{ marginTop: "30px" }}>
  <table style={{ width: "40%", borderCollapse: "collapse", marginLeft: "auto" }}>
    <tbody>
      <tr>
        <td style={{ padding: "8px", textAlign: "left" }}>Items Subtotal:</td>
        <td style={{ padding: "8px", textAlign: "right" }}>
          ${itemsTotal.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style={{ padding: "8px", textAlign: "left" }}>Labor Subtotal:</td>
        <td style={{ padding: "8px", textAlign: "right" }}>
          ${laborTotal.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style={{ padding: "8px", textAlign: "left", borderTop: "1px solid #ddd" }}>Subtotal:</td>
        <td style={{ padding: "8px", textAlign: "right", borderTop: "1px solid #ddd" }}>
          ${subtotal.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style={{ padding: "8px", textAlign: "left" }}>
          {taxName || `Tax (${taxRate}%)`}:
        </td>
        <td style={{ padding: "8px", textAlign: "right" }}>
          ${taxAmount.toFixed(2)}
        </td>
      </tr>
      <tr className="total-row">
        <td style={{ padding: "8px", textAlign: "left", fontWeight: "bold", borderTop: "1px solid #ddd" }}>Total Amount:</td>
        <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", borderTop: "1px solid #ddd" }}>
          ${totalWithTax.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td style={{ padding: "8px", textAlign: "left" }}>Amount Paid:</td>
        <td style={{ padding: "8px", textAlign: "right", color: "#00C853" }}>
          ${amountPaid.toFixed(2)}
        </td>
      </tr>
      <tr className="total-row">
        <td style={{ padding: "8px", textAlign: "left", fontWeight: "bold", fontSize: "16px", backgroundColor: "#f8f9ff" }}>
          Balance Due:
        </td>
        <td style={{ 
          padding: "8px", 
          textAlign: "right", 
          fontWeight: "bold", 
          fontSize: "16px", 
          backgroundColor: "#f8f9ff",
          color: balanceDue > 0 ? "#FF9500" : "#00C853"
        }}>
          ${(totalWithTax - amountPaid).toFixed(2)}
        </td>
      </tr>
    </tbody>
  </table>
</div>
{/* Payment History Section */}
<h3 style={{ fontSize: "16px", marginBottom: "10px", marginTop: "20px" }}>Payment History:</h3>
{payments.length === 0 ? (
  <p style={{ fontStyle: "italic", color: "#666", marginBottom: "20px" }}>No payments recorded for this job sheet</p>
) : (
  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
    <thead>
      <tr>
        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
          Date
        </th>
        <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
          Method
        </th>
        <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#f8f9ff" }}>
          Amount
        </th>
      </tr>
    </thead>
    <tbody>
      {payments.map((payment) => (
        <tr key={`payment-${payment.id}`}>
          <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
            {new Date(payment.payment_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </td>
          <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
            {payment.method === "cash" ? "Cash" : 
             payment.method === "credit_card" ? "Credit Card" : 
             payment.method === "debit_card" ? "Debit Card" : 
             payment.method === "transfer" ? "Bank Transfer" : 
             payment.method === "check" ? "Check" : "Other"}
          </td>
          <td style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #eee", color: "#00C853" }}>
            ${parseFloat(payment.amount).toFixed(2)}
          </td>
        </tr>
      ))}
      <tr>
        <td colSpan="2" style={{ 
          padding: "8px", 
          borderBottom: "1px solid #eee", 
          fontWeight: "bold",
          textAlign: "right" 
        }}>
          Total Payments:
        </td>
        <td style={{ 
          textAlign: "right", 
          padding: "8px", 
          borderBottom: "1px solid #eee",
          fontWeight: "bold",
          color: "#00C853" 
        }}>
          ${payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0).toFixed(2)}
        </td>
      </tr>
    </tbody>
  </table>
)}
          {/* Notes Section */}
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Notes:</h3>
            <textarea
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Add any additional notes here..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                minHeight: "80px",
                resize: "vertical"
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ marginTop: "30px", textAlign: "center", color: "#666", fontSize: "14px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
            <p style={{ margin: "5px 0" }}>Thank you for your business!</p>
            <p style={{ margin: "5px 0" }}>Please make payment by due date: {new Date(dueDate).toLocaleDateString()}</p>
            <p style={{ margin: "5px 0" }}>For questions about this invoice, please contact us at (555) 123-4567</p>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px"
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={handlePrintInvoice}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6A1B9A",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            <FontAwesomeIcon icon={faPrint} style={{ marginRight: "8px" }} />
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoice;