import { useState, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { 
  fetchMaintenanceTasks, 
  fetchAreas, 
  saveMaintenanceReport,
  fetchMaintenanceReports
} from '../lib/supabaseUtils';
import { supabase } from '../lib/supabase';

// Chart imports
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

const Reports = () => {
  const { darkMode } = useDarkMode();
  const [reportType, setReportType] = useState('maintenance');
  const [dateRange, setDateRange] = useState('week');
  const [area, setArea] = useState('all');
  const [format, setFormat] = useState('table');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [showSavedReports, setShowSavedReports] = useState(false);
  
  // State for storing data from Supabase
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [areasList, setAreasList] = useState([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Get current user
  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUserData();
  }, []);

  // Load maintenance tasks from Supabase
  useEffect(() => {
    const loadMaintenanceTasks = async () => {
      try {
        setLoading(true);
        const { data, error } = await fetchMaintenanceTasks();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setMaintenanceTasks(data);
        }
      } catch (error) {
        console.error('Error loading maintenance tasks:', error);
        setError('Failed to load maintenance data from Supabase');
      } finally {
        setLoading(false);
      }
    };
    
    loadMaintenanceTasks();
  }, []);
  
  // Load areas from Supabase
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const { data, error } = await fetchAreas();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAreasList(data);
        }
      } catch (error) {
        console.error('Error loading areas:', error);
      }
    };
    
    loadAreas();
  }, []);

  // Load saved reports
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const { data, error } = await fetchMaintenanceReports();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setSavedReports(data);
        }
      } catch (error) {
        console.error('Error loading saved reports:', error);
      }
    };
    
    if (currentUser) {
      loadSavedReports();
    }
  }, [currentUser]);
  // Calculate date range based on selection
  const getDateRangeFilter = () => {
    const today = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case 'day':
        startDate.setDate(today.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 7); // Default to week
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };
  
  // Handler to generate reports
  const generateReport = () => {
    setLoading(true);
    
    try {
      let report = {
        title: '',
        data: [],
        summary: {},
        chartData: []
      };
      
      // Get date range
      const { startDate, endDate } = getDateRangeFilter();
      
      // Filter tasks based on selected date range
      let filteredTasks = maintenanceTasks.filter(task => {
        const taskDate = new Date(task.date_reported);
        return taskDate >= new Date(startDate) && taskDate <= new Date(endDate);
      });
      
      // Filter tasks based on selected area if not 'all'
      if (area !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.area === area);
      }
      
      let pendingTasks, completedTasks, criticalTasks, maintenanceTypes;
      
      switch(reportType) {
        case 'maintenance':
          report.title = 'Maintenance Tasks Report';
          report.data = filteredTasks;
          
          // Generate summary data
          pendingTasks = filteredTasks.filter(task => task.status === 'Pending' || task.status === 'In Progress').length;
          completedTasks = filteredTasks.filter(task => task.status === 'Completed').length;
          criticalTasks = filteredTasks.filter(task => task.priority === 'critical' || task.priority === 'high').length;
          
          report.summary = {
            total: filteredTasks.length,
            pending: pendingTasks,
            completed: completedTasks,
            critical: criticalTasks,
            completion: filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0
          };
          
          // Generate chart data for maintenance types
          maintenanceTypes = {};
          filteredTasks.forEach(task => {
            maintenanceTypes[task.type] = (maintenanceTypes[task.type] || 0) + 1;
          });
          
          report.chartData = Object.keys(maintenanceTypes).map(type => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: maintenanceTypes[type]
          }));
          break;
          
        case 'equipment':
          report.title = 'Equipment Status Report';
          
          // Group tasks by location
          let equipmentStatus = {};
          
          // Process each task to build equipment status
          filteredTasks.forEach(task => {
            if (!equipmentStatus[task.location]) {
              equipmentStatus[task.location] = {
                total: 0,
                pending: 0,
                completed: 0
              };
            }
            
            equipmentStatus[task.location].total++;
            
            if (task.status === 'Completed') {
              equipmentStatus[task.location].completed++;
            } else {
              equipmentStatus[task.location].pending++;
            }
          });
          
          report.data = Object.keys(equipmentStatus).map(location => ({
            location,
            ...equipmentStatus[location]
          }));
          
          // Calculate total percentages
          let totalFittings = Object.values(equipmentStatus).reduce((sum, loc) => sum + loc.total, 0);
          let workingFittings = Object.values(equipmentStatus).reduce((sum, loc) => sum + loc.completed, 0);
          
          report.summary = {
            totalFittings,
            workingFittings,
            operationalPercentage: totalFittings > 0 ? Math.round((workingFittings / totalFittings) * 100) : 100
          };
          
          // Generate chart data for equipment status by fitting type
          let fittingTypeCounts = {};
          filteredTasks.forEach(task => {
            if (task.fitting) {
              if (!fittingTypeCounts[task.fitting]) {
                fittingTypeCounts[task.fitting] = { name: task.fitting, pending: 0, completed: 0, total: 0 };
              }
              
              fittingTypeCounts[task.fitting].total++;
              
              if (task.status === 'Completed') {
                fittingTypeCounts[task.fitting].completed++;
              } else {
                fittingTypeCounts[task.fitting].pending++;
              }
            }
          });
          
          report.chartData = Object.values(fittingTypeCounts);
          break;
        case 'safety':
          report.title = 'Safety Compliance Report';
          
          // Group tasks by area to calculate safety metrics
          let safetyMetrics = {};
          
          // Build unique list of areas from filtered tasks
          let uniqueAreas = [...new Set(filteredTasks.map(task => task.area))];
          
          uniqueAreas.forEach(areaName => {
            let areaTasks = filteredTasks.filter(task => task.area === areaName);
            let criticalIssues = areaTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length;
            let resolvedCritical = areaTasks.filter(t => (t.priority === 'critical' || t.priority === 'high') && t.status === 'Completed').length;
            
            safetyMetrics[areaName] = {
              criticalIssues,
              resolvedCritical,
              compliance: criticalIssues > 0 ? Math.round((resolvedCritical / criticalIssues) * 100) : 100
            };
          });
          
          report.data = Object.keys(safetyMetrics).map(areaName => ({
            area: areaName,
            ...safetyMetrics[areaName]
          }));
          
          // Calculate overall compliance
          let totalCritical = Object.values(safetyMetrics).reduce((sum, area) => sum + area.criticalIssues, 0);
          let totalResolved = Object.values(safetyMetrics).reduce((sum, area) => sum + area.resolvedCritical, 0);
          
          report.summary = {
            totalCritical,
            totalResolved,
            overallCompliance: totalCritical > 0 ? Math.round((totalResolved / totalCritical) * 100) : 100
          };
          
          // Use same data for chart
          report.chartData = report.data;
          break;
          
        default:
          break;
      }
      
      setGeneratedReport(report);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset report
  const resetReport = () => {
    setGeneratedReport(null);
    setError(null);
  };
  
  // Convert data to CSV format
  const convertToCSV = (data, reportType) => {
    if (!data || data.length === 0) return '';
    
    let headers = [];
    let csvRows = [];
    
    // Set headers based on report type
    switch(reportType) {
      case 'maintenance':
        headers = ['ID', 'Type', 'Description', 'Location', 'Area', 'Status', 'Priority', 'Reported Date'];
        break;
      case 'equipment':
        headers = ['Location', 'Total Issues', 'Pending', 'Completed', 'Working Percentage'];
        break;
      case 'safety':
        headers = ['Area', 'Critical Issues', 'Resolved Issues', 'Compliance Percentage'];
        break;
      default:
        return '';
    }
    
    // Add headers to CSV
    csvRows.push(headers.join(','));
    
    // Add data rows to CSV
    data.forEach(item => {
      let values = [];
      
      switch(reportType) {
        case 'maintenance':
          values = [
            item.id,
            item.type || '',
            (item.description || '').replace(/,/g, ' '), // Replace commas to avoid CSV parsing issues
            item.location || '',
            item.area || '',
            item.status || '',
            item.priority || '',
            item.date_reported ? new Date(item.date_reported).toLocaleDateString() : ''
          ];
          break;
        case 'equipment':
          values = [
            item.location || '',
            item.total || 0,
            item.pending || 0,
            item.completed || 0,
            `${Math.round((item.completed / item.total) * 100)}%`
          ];
          break;
        case 'safety':
          values = [
            item.area || '',
            item.criticalIssues || 0,
            item.resolvedCritical || 0,
            `${item.compliance || 0}%`
          ];
          break;
        default:
          return '';
      }
      
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };
  
  // Download report as CSV or show PDF generation message
  const downloadReport = (format) => {
    if (format === 'csv' && generatedReport && generatedReport.data) {
      const csvData = convertToCSV(generatedReport.data, reportType);
      
      if (csvData) {
        // Create a Blob with the CSV data
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        
        // Create URL for the Blob
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        
        link.href = url;
        link.setAttribute('download', `${reportType}-report-${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else if (format === 'pdf') {
      // Show PDF generation message
      alert('PDF export functionality would generate a professionally formatted document in a real application.');
    }
  };

  // Save report to Supabase
  const saveReportToSupabase = async () => {
    if (!generatedReport) return;
    
    try {
      setSaveStatus('saving');
      
      // Convert report data to CSV for storage
      const csvData = convertToCSV(generatedReport.data, reportType);
      
      // Create report object for saving
      const reportToSave = {
        title: generatedReport.title,
        reportType: reportType,
        dateRange: dateRange,
        area: area,
        data: generatedReport, // Store the entire report object
        csvData: csvData
      };
      
      // Save to Supabase
      const { data, error } = await saveMaintenanceReport(reportToSave);
      
      if (error) {
        throw error;
      }
      
      // Update saved reports list
      setSavedReports(prev => [data[0], ...prev]);
      
      // Show success message
      setSaveStatus('success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving report:', error);
      setSaveStatus('error');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };

  // Load a saved report
  const loadSavedReport = (savedReport) => {
    if (savedReport && savedReport.report_data) {
      setReportType(savedReport.report_type);
      setDateRange(savedReport.date_range);
      setArea(savedReport.area);
      setGeneratedReport(savedReport.report_data);
      setShowSavedReports(false);
    }
  };
  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-md p-6`}>
      <h1 className="text-2xl font-bold mb-6">Maintenance Reports</h1>
      
      {error && (
        <div className={`p-4 mb-6 rounded-md ${darkMode ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800'}`}>
          <p>{error}</p>
        </div>
      )}

      {loading && !generatedReport && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3">Loading data from Supabase...</p>
        </div>
      )}
      
      {!loading && !generatedReport ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className={`block w-full rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="maintenance">Maintenance Tasks Report</option>
                <option value="equipment">Equipment Status Report</option>
                <option value="safety">Safety Compliance Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Time Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`block w-full rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={`block w-full rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="all">All Areas</option>
                {areasList.map(areaItem => (
                  <option key={areaItem.id} value={areaItem.id}>
                    {areaItem.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className={`block w-full rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="table">Table & Charts</option>
                <option value="pdf">PDF Report</option>
                <option value="csv">CSV Export</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {maintenanceTasks.length} maintenance records available from Supabase
              </p>
            </div>
            <button
              onClick={generateReport}
              disabled={loading || maintenanceTasks.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Report
            </button>
          </div>
        </div>
      ) : (
        !loading && generatedReport && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold">{generatedReport.title}</h2>
                {saveStatus === 'saving' && (
                  <span className="text-sm italic text-gray-500">Saving to Supabase...</span>
                )}
                {saveStatus === 'success' && (
                  <span className="text-sm text-green-500">✓ Saved to Supabase</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-sm text-red-500">Error saving report</span>
                )}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={resetReport}
                  className={`px-3 py-1.5 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium`}
                >
                  Back
                </button>

                <button 
                  onClick={() => setShowSavedReports(!showSavedReports)}
                  className={`px-3 py-1.5 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium flex items-center`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Saved Reports
                </button>
                
                <button 
                  onClick={saveReportToSupabase}
                  disabled={saveStatus === 'saving' || !currentUser}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save to Supabase
                </button>
                
                <button 
                  onClick={() => downloadReport('pdf')}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDF
                </button>
                
                <button 
                  onClick={() => downloadReport('csv')}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              </div>
            </div>

            {/* Saved Reports Dropdown */}
            {showSavedReports && (
              <div className={`mb-4 p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-2">Saved Reports</h3>
                
                {savedReports.length === 0 ? (
                  <p className="text-sm text-gray-500">No saved reports found</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {savedReports.map((report, index) => (
                      <div 
                        key={report.id} 
                        className={`p-2 rounded-md mb-1 cursor-pointer flex justify-between items-center ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        onClick={() => loadSavedReport(report)}
                      >
                        <div>
                          <p className="font-medium">{report.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.date_generated).toLocaleString()} • {report.report_type} • {report.area === 'all' ? 'All Areas' : report.area}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            loadSavedReport(report);
                          }}
                          className={`text-xs py-1 px-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Report Summary */}
            <div className={`p-4 rounded-md mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-3">Report Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {reportType === 'maintenance' && (
                  <>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Tasks</p>
                      <p className="text-xl font-medium">{generatedReport.summary.total}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Tasks</p>
                      <p className="text-xl font-medium">{generatedReport.summary.pending}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed Tasks</p>
                      <p className="text-xl font-medium">{generatedReport.summary.completed}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion Rate</p>
                      <p className="text-xl font-medium">{generatedReport.summary.completion}%</p>
                    </div>
                  </>
                )}
                
                {reportType === 'equipment' && (
                  <>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Fittings Checked</p>
                      <p className="text-xl font-medium">{generatedReport.summary.totalFittings}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Working Fittings</p>
                      <p className="text-xl font-medium">{generatedReport.summary.workingFittings}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Operational Percentage</p>
                      <p className="text-xl font-medium">{generatedReport.summary.operationalPercentage}%</p>
                    </div>
                  </>
                )}
                
                {reportType === 'safety' && (
                  <>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Critical Issues</p>
                      <p className="text-xl font-medium">{generatedReport.summary.totalCritical}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Resolved Issues</p>
                      <p className="text-xl font-medium">{generatedReport.summary.totalResolved}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Overall Compliance</p>
                      <p className="text-xl font-medium">{generatedReport.summary.overallCompliance}%</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4">Data Visualization</h3>
              
              <div className="flex flex-col md:flex-row gap-6">
                {reportType === 'maintenance' && generatedReport.chartData.length > 0 && (
                  <>
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-md flex-1`}>
                      <h4 className="text-center mb-2">Maintenance Types</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={generatedReport.chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {generatedReport.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-md flex-1`}>
                      <h4 className="text-center mb-2">Task Status</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                          { name: 'Pending', value: generatedReport.summary.pending },
                          { name: 'Completed', value: generatedReport.summary.completed }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                          <XAxis dataKey="name" tick={{ fill: darkMode ? '#fff' : '#333' }} />
                          <YAxis tick={{ fill: darkMode ? '#fff' : '#333' }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: darkMode ? '#1f2937' : '#fff',
                              color: darkMode ? '#fff' : '#333',
                              border: `1px solid ${darkMode ? '#374151' : '#ddd'}`
                            }}
                          />
                          <Bar dataKey="value" fill="#8884d8">
                            <Cell fill="#FF8042" />
                            <Cell fill="#00C49F" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
                {reportType === 'equipment' && generatedReport.chartData.length > 0 && (
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-md w-full`}>
                    <h4 className="text-center mb-2">Equipment Status by Type</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={generatedReport.chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                        <XAxis dataKey="name" tick={{ fill: darkMode ? '#fff' : '#333' }} />
                        <YAxis tick={{ fill: darkMode ? '#fff' : '#333' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: darkMode ? '#1f2937' : '#fff',
                            color: darkMode ? '#fff' : '#333',
                            border: `1px solid ${darkMode ? '#374151' : '#ddd'}`
                          }}
                        />
                        <Legend />
                        <Bar dataKey="completed" name="Working" stackId="a" fill="#00C49F" />
                        <Bar dataKey="pending" name="Pending Maintenance" stackId="a" fill="#FF8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {reportType === 'safety' && generatedReport.chartData.length > 0 && (
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-md w-full`}>
                    <h4 className="text-center mb-2">Compliance by Area</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={generatedReport.chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                        <XAxis dataKey="area" tick={{ fill: darkMode ? '#fff' : '#333' }} />
                        <YAxis tick={{ fill: darkMode ? '#fff' : '#333' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: darkMode ? '#1f2937' : '#fff',
                            color: darkMode ? '#fff' : '#333',
                            border: `1px solid ${darkMode ? '#374151' : '#ddd'}`
                          }}
                        />
                        <Legend />
                        <Bar dataKey="compliance" name="Compliance %" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {generatedReport.chartData.length === 0 && (
                  <div className={`w-full p-6 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md`}>
                    <p>No data available for visualization</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Data Table Section */}
            <div>
              <h3 className="font-semibold mb-3">Detailed Data</h3>
              {generatedReport.data.length === 0 ? (
                <div className={`p-4 text-center ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'} rounded-md`}>
                  <p>No data available for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y divide-gray-200 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        {reportType === 'maintenance' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Priority</th>
                          </>
                        )}
                        
                        {reportType === 'equipment' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Issues</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Pending</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Completed</th>
                          </>
                        )}
                        
                        {reportType === 'safety' && (
                          <>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Area</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Critical Issues</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Resolved</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Compliance %</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      {reportType === 'maintenance' && generatedReport.data.slice(0, 10).map((task, i) => (
                        <tr key={i} className={i % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{task.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{task.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{task.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${task.status === 'Completed' 
                                ? (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800')
                                : task.status === 'Pending' 
                                  ? (darkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800')
                                  : task.status === 'In Progress' 
                                    ? (darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800')
                                    : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')}`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${task.priority === 'critical' 
                                ? (darkMode ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800')
                                : task.priority === 'high' 
                                  ? (darkMode ? 'bg-orange-800 text-orange-100' : 'bg-orange-100 text-orange-800')
                                  : (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800')}`}
                            >
                              {task.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                      
                      {reportType === 'equipment' && generatedReport.data.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.pending}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.completed}</td>
                        </tr>
                      ))}
                      
                      {reportType === 'safety' && generatedReport.data.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.area}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.criticalIssues}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{item.resolvedCritical}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${item.compliance >= 90
                                ? (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800')
                                : item.compliance >= 75
                                  ? (darkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800')
                                  : (darkMode ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800')}`}
                            >
                              {item.compliance}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Reports;
