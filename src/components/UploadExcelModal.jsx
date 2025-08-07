import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const EXTENDED_SHIFTS = [
  { id: 'shiftA', name: 'Shift A' },
  { id: 'shiftB', name: 'Shift B' },
  { id: 'shiftC', name: 'Shift C' },
  { id: 'shiftD', name: 'Shift D' }
];

const UploadExcelModal = ({ isOpen, onClose, onImport }) => {
  const [selectedShift, setSelectedShift] = useState('shiftA');
  const [uploadFile, setUploadFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);

  if (!isOpen) return null;

  // Handle file upload and parsing
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessingFile(true);
    setUploadFile(file);

    try {
      const data = await readExcel(file);
      setExcelData(data);
      
      // Create a preview of the data
      const preview = data.slice(0, 5); // Show first 5 rows as preview
      setPreviewData(preview);
      setIsPreviewMode(true);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      alert('Error reading Excel file. Please check the format.');
    } finally {
      setProcessingFile(false);
    }
  };

  // Function to read Excel file
  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Process Excel data and assign to shifts
  const processExcelData = () => {
    if (!excelData.length) return;

    try {
      const processedData = {
        shift: selectedShift,
        data: excelData
      };

      // Call the parent component's import handler
      onImport(processedData);
      
      // Reset state
      cancelImport();
    } catch (error) {
      console.error('Error processing Excel data:', error);
      alert('Error processing Excel data. Please check the format.');
    }
  };

  // Cancel import
  const cancelImport = () => {
    setUploadFile(null);
    setExcelData([]);
    setPreviewData(null);
    setIsPreviewMode(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            Upload Preventive Maintenance Schedule
          </h3>
          <button onClick={cancelImport} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Shift</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {EXTENDED_SHIFTS.map((shift) => (
                <option key={shift.id} value={shift.id}>{shift.name}</option>
              ))}
            </select>
          </div>
          
          {!isPreviewMode ? (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Schedule File</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="schedule-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload a file</span>
                      <input 
                        id="schedule-upload" 
                        name="schedule-upload" 
                        type="file" 
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".xls,.xlsx,.csv"
                      />
                    </label>
                    <p className="pl-1 dark:text-gray-400">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Excel or CSV files up to 10MB
                  </p>
                  {uploadFile && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">{uploadFile.name}</p>
                  )}
                  {processingFile && (
                    <div className="flex justify-center mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview of imported data</h4>
                <button 
                  onClick={() => setIsPreviewMode(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                >
                  Change file
                </button>
              </div>
              
              <div className="max-h-64 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {previewData && previewData.length > 0 && Object.keys(previewData[0]).map((header, i) => (
                        <th 
                          key={i}
                          scope="col" 
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData && previewData.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Showing {previewData?.length || 0} of {excelData.length} rows
              </p>
            </div>
          )}
          
          <div className="mt-5 sm:mt-6">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={processExcelData}
              disabled={!excelData.length || processingFile}
            >
              {processingFile ? 'Processing...' : 'Import Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadExcelModal;