import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faSync,
  faChartLine,
  faMotorcycle,
  faTools,
  faShieldAlt,
  faRoad,
  faMoneyCheckAlt,
  faMoneyCheck,
  faChevronDown,
  faMoneyBillWave,
  faMobileAlt,
  faFileExcel,
  faDownload,
      faTimes,
  faSearch
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "@fortawesome/fontawesome-svg-core/styles.css";

const DashboardView = () => {
  // State
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [summaryData, setSummaryData] = useState({});
  const [exportData, setExportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const datePickerRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;

  const workflowTypes = useMemo(
    () => [
      {
        id: "1",
        name: "Repairs & Services",
        icon: faTools,
        color: "#4285F4",
        backgroundColor: "#E8F0FE",
        description: "Repairs and services revenue"
      },
      {
        id: "2",
        name: "Bike Sales",
        icon: faMotorcycle,
        color: "#34A853",
        backgroundColor: "#E6F4EA",
        description: "Deposits for bike sales"
      },
      {
        id: "3",
        name: "Insurance",
        icon: faShieldAlt,
        color: "#FBBC05",
        backgroundColor: "#FEF7E0",
        description: "Insurance payments"
      },
      {
        id: "4",
        name: "HP Payment",
        icon: faMoneyCheckAlt,
        color: "#EA4335",
        backgroundColor: "#FCE8E6",
        description: "Hire purchase payments"
      },
      {
        id: "5",
        name: "Road Tax",
        icon: faRoad,
        color: "#9C27B0",
        backgroundColor: "#F3E5F5",
        description: "Road tax payments"
      },
      {
        id: "6",
        name: "HP Payment 2",
        icon: faMoneyCheck,
        color: "#FF9800",
        backgroundColor: "#FFF3E0",
        description: "Secondary hire purchase payments"
      },
    ],
    []
  );

  const paymentMethods = useMemo(
    () => [
      {
        id: "cash",
        name: "Cash",
        icon: faMoneyBillWave,
        color: "#4CAF50",
        backgroundColor: "#E8F5E9",
      },
      {
        id: "paynow",
        name: "PayNow",
        icon: faMobileAlt,
        color: "#2196F3",
        backgroundColor: "#E3F2FD",
      },
      {
        id: "other",
        name: "Other",
        icon: faMoneyCheckAlt,
        color: "#607D8B",
        backgroundColor: "#ECEFF1",
      }
    ],
    []
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateRangeDisplay = (start, end) => {
    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        return new Date(dateString).toLocaleDateString();
      } catch (e) {
        return "Invalid date";
      }
    };
    
    const isToday = start === today && end === today;
    if (isToday) {
      return "Today";
    }
    
    if (start === end) {
      return formatDate(start);
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const handleApplyDates = () => {
    fetchDashboardData();
    setShowDatePicker(false);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      }).toString();

      const summaryResponse = await fetch(
        `${API_URL}/reports/workflow-summary?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!summaryResponse.ok) {
        throw new Error(`Failed to fetch summary data: ${summaryResponse.status}`);
      }

      const summaryResult = await summaryResponse.json();
      setSummaryData(summaryResult);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [API_URL, startDate, endDate]);

  const fetchExportData = useCallback(async () => {
    setExportLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      }).toString();
  
      const url = `${API_URL}/reports/export-data?${queryParams}`;
      console.log("Fetching export data from:", url);
  
      const exportResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      console.log("Response status:", exportResponse.status);
      console.log("Response headers:", Object.fromEntries(exportResponse.headers.entries()));
  
      if (!exportResponse.ok) {
        const contentType = exportResponse.headers.get("content-type");
        console.log("Error response content type:", contentType);
        
        const responseText = await exportResponse.text();
        console.log("Error response body (first 500 chars):", responseText.substring(0, 500));
        
        throw new Error(`API request failed: ${exportResponse.status} ${exportResponse.statusText}`);
      }
  
      const contentType = exportResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await exportResponse.text();
        console.log("Unexpected content type:", contentType);
        console.log("Response body (first 500 chars):", responseText.substring(0, 500));
        throw new Error(`Expected JSON but received ${contentType || "unknown content type"}`);
      }
  
      const newResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const exportResult = await newResponse.json();
      
      if (!Array.isArray(exportResult)) {
        console.log("Received non-array data:", exportResult);
        throw new Error("Unexpected data format: Export data should be an array");
      }
      
      setExportData(exportResult);
      setShowExportModal(true);
    } catch (err) {
      console.error("Export data fetch error:", err);
      setError(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }, [API_URL, startDate, endDate]);

  const handleExport = () => {
    const workbookData = exportData.map(item => ({
      'Date': format(new Date(item.date), 'dd-MMM-yyyy'),
      'Customer': item.customer,
      'Jobsheet Number': item.jobsheet_number,
      'Code': item.code || '',
      'Cash Amount': item.cash_amount.toFixed(2),
      'PayNow Amount': item.paynow_amount.toFixed(2),
      'Other Amount': item.other_amount.toFixed(2),
      'GST Value': item.gst_value.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    
    const colWidths = [
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 }
    ];
    worksheet["!cols"] = colWidths;
    
    const filename = `Revenue_Report_${format(new Date(startDate), 'yyyyMMdd')}_to_${format(new Date(endDate), 'yyyyMMdd')}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    setShowExportModal(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalRevenue = useMemo(() => {
    if (!summaryData || !summaryData.workflows) return 0;
    return Object.values(summaryData.workflows).reduce(
      (total, amount) => total + parseFloat(amount || 0),
      0
    );
  }, [summaryData]);

  const totalGst = useMemo(() => {
    if (!summaryData || !summaryData.gst) return 0;
    return parseFloat(summaryData.gst.total || 0);
  }, [summaryData]);

  const maxAmount = useMemo(() => {
    if (!summaryData || !summaryData.workflows) return 0;
    return Math.max(
      ...workflowTypes.map(
        (wt) => parseFloat(summaryData.workflows?.[wt.id] || 0)
      )
    );
  }, [summaryData, workflowTypes]);

  const maxPaymentAmount = useMemo(() => {
    if (!summaryData || !summaryData.payment_methods) return 0;
    return Math.max(
      ...paymentMethods.map(
        (pm) => parseFloat(summaryData.payment_methods?.[pm.id] || 0)
      )
    );
  }, [summaryData, paymentMethods]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "30px",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
        padding: "20px",
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
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
            Dashboard
          </h2>

          <div style={{ position: "relative" }} ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#F9FBFF",
                border: "1px solid #eaeaea",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#333",
                transition: "all 0.2s ease",
              }}
            >
              <FontAwesomeIcon
                icon={faCalendar}
                style={{ color: "#5932EA", fontSize: "14px" }}
              />
              <span>
                {formatDateRangeDisplay(startDate, endDate)}
              </span>
            </button>

            {showDatePicker && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 5px)",
                  left: 0,
                  width: "280px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  zIndex: 100,
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#333" }}>
                  Select Date Range
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", color: "#555", display: "block", marginBottom: "6px" }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #eaeaea",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: "13px", color: "#555", display: "block", marginBottom: "6px" }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #eaeaea",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button
                    onClick={() => {
                      setStartDate(today);
                      setEndDate(today);
                      handleApplyDates();
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      backgroundColor: "#f0f0f0",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#333",
                    }}
                  >
                    Today
                  </button>

                  <button
                    onClick={handleApplyDates}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      backgroundColor: "#5932EA",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <FontAwesomeIcon icon={faSearch} style={{ fontSize: "12px" }} />
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={fetchExportData}
            disabled={exportLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#34A853",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            <FontAwesomeIcon icon={faFileExcel} />
            Export Report
          </button>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          style={{
            backgroundColor: "#5932EA",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "14px",
            padding: "8px 16px",
            borderRadius: "8px",
            transition: "all 0.3s ease",
            transform: loading ? "scale(0.97)" : "scale(1)",
            boxShadow: loading ? "none" : "0 2px 4px rgba(89, 50, 234, 0.2)",
          }}
          className="refresh-button"
        >
          <FontAwesomeIcon 
            icon={faSync} 
            spin={loading} 
            className={!loading ? "pulse-on-hover" : ""} 
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#FEE2E2",
            color: "#B91C1C",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgb(63, 81, 181, 0.08)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              backgroundColor: "#3F51B5",
              color: "white",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "16px",
              fontSize: "20px",
            }}
          >
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div>
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: "14px",
                fontWeight: "500",
                color: "#666",
              }}
            >
              Total Revenue
            </h3>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#333" }}>
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
              {formatDateRangeDisplay(startDate, endDate)}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "rgba(76, 175, 80, 0.08)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "16px",
              fontSize: "20px",
            }}
          >
            <FontAwesomeIcon icon={faFileExcel} />
          </div>
          <div>
            <h3
              style={{
                margin: "0 0 4px 0",
                fontSize: "14px",
                fontWeight: "500",
                color: "#666",
              }}
            >
              Total GST (9% on items)
            </h3>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#333" }}>
              ${totalGst.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
              Tax collected on items
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: "30px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          Revenue by Payment Method
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {paymentMethods.map((payment) => {
            const amount = parseFloat(
              summaryData?.payment_methods?.[payment.id] || 0
            );
            const totalRevenueWithTax = totalRevenue + totalGst;
            const percentage =
              totalRevenueWithTax > 0 ? (amount / totalRevenueWithTax) * 100 : 0;
            const barWidth = maxPaymentAmount > 0 ? (amount / maxPaymentAmount) * 100 : 0;

            return (
              <div
                key={payment.id}
                style={{
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  backgroundColor: "white",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: payment.backgroundColor,
                      color: payment.color,
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <FontAwesomeIcon icon={payment.icon} />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      {payment.name}
                    </h4>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {payment.name} payments received
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: "600" }}>
                    ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    height: "6px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: payment.color,
                      borderRadius: "3px",
                      transition: "width 1s ease-in-out",
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          Revenue by Category
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {workflowTypes.map((workflow) => {
            const amount = parseFloat(
              summaryData?.workflows?.[workflow.id] || 0
            );
            const percentage =
              totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
            const barWidth = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

            return (
              <div
                key={workflow.id}
                style={{
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  backgroundColor: "white",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: workflow.backgroundColor,
                      color: workflow.color,
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "12px",
                      fontSize: "16px",
                    }}
                  >
                    <FontAwesomeIcon icon={workflow.icon} />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      {workflow.name}
                    </h4>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {workflow.description}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: "600" }}>
                    ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    height: "6px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: workflow.color,
                      borderRadius: "3px",
                      transition: "width 1s ease-in-out",
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showExportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
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
              padding: "24px",
              width: "500px",
              maxWidth: "90%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>Export Report</h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#666",
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <p>Your report for {formatDateRangeDisplay(startDate, endDate)} is ready to export.</p>
              <p>The Excel file will include:</p>
              <ul style={{ paddingLeft: "20px", margin: "10px 0" }}>
                <li>Date (DD-MMM-YYYY format)</li>
                <li>Customer (License Plate)</li>
                <li>Jobsheet Number</li>
                <li>Code (Workflow Type)</li>
                <li>Amounts by Payment Method (Cash, PayNow, Other)</li>
                <li>GST Values</li>
              </ul>
              <p><strong>Total records:</strong> {exportData.length}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#34A853",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FontAwesomeIcon icon={faDownload} />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;