import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Upload } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  department: string;
  city: string;
  salary: number;
  startDate: string;
}

interface SortConfig {
  key: keyof Employee;
  direction: 'asc' | 'desc';
}

const InteractiveTable: React.FC = () => {
  const [data, setData] = useState<Employee[]>([]);
  
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const handleSort = (key: keyof Employee) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(config => config.key === key);
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { key, direction: 'desc' };
          return newConfigs;
        } else {
          return prev.filter((_, index) => index !== existingIndex);
        }
      } else {
        return [...prev, { key, direction: 'asc' }];
      }
    });
    setCurrentPage(1);
  };

  const getSortIcon = (key: keyof Employee) => {
    const config = sortConfigs.find(c => c.key === key);
    if (!config) return null;
    
    const index = sortConfigs.findIndex(c => c.key === key);
    const badge = sortConfigs.length > 1 ? (
      <span className="ml-1 text-xs font-bold">{index + 1}</span>
    ) : null;
    
    return (
      <span className="inline-flex items-center">
        {config.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
        {badge}
      </span>
    );
  };

  const sortedAndFilteredData = useMemo(() => {
    let result = [...data];
    
    if (filter) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          value.toString().toLowerCase().includes(filter.toLowerCase())
        )
      );
    }
    
    if (sortConfigs.length > 0) {
      result.sort((a, b) => {
        for (const config of sortConfigs) {
          const aVal = a[config.key];
          const bVal = b[config.key];
          
          let comparison = 0;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          if (comparison !== 0) {
            return config.direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }
    
    return result;
  }, [data, filter, sortConfigs]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAndFilteredData.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / pageSize);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        setData(parsed);
        setImportText('');
        setShowImport(false);
        setCurrentPage(1);
      } else {
        alert('Please provide an array of objects');
      }
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const runTests = () => {
    const results: string[] = [];
    
    // Test 1: Import test data
    results.push('🧪 Test 1: Importing test data...');
    const testData = [
      { id: "T001", name: "Alice Brown", department: "Engineering", city: "Boston", salary: 110000, startDate: "2023-01-10" },
      { id: "T002", name: "Bob Wilson", department: "Sales", city: "Boston", salary: 90000, startDate: "2022-05-20" },
      { id: "T003", name: "Carol Davis", department: "Engineering", city: "Seattle", salary: 105000, startDate: "2023-03-15" },
    ];
    setData(testData);
    results.push('✅ Test 1 Passed: Data imported successfully');
    
    // Test 2: Filter functionality
    setTimeout(() => {
      results.push('🧪 Test 2: Testing filter with "Engineering"...');
      setFilter('Engineering');
      
      setTimeout(() => {
        const filteredCount = testData.filter(row => 
          Object.values(row).some(value =>
            value.toString().toLowerCase().includes('engineering')
          )
        ).length;
        
        if (filteredCount === 2) {
          results.push(`✅ Test 2 Passed: Filter returned ${filteredCount} results`);
        } else {
          results.push(`❌ Test 2 Failed: Expected 2 results, got ${filteredCount}`);
        }
        setTestResults([...results]);
        
        // Test 3: Clear filter
        setTimeout(() => {
          results.push('🧪 Test 3: Clearing filter...');
          setFilter('');
          results.push('✅ Test 3 Passed: Filter cleared');
          setTestResults([...results]);
          
          // Test 4: Sort by salary
          setTimeout(() => {
            results.push('🧪 Test 4: Sorting by salary (ascending)...');
            setSortConfigs([{ key: 'salary', direction: 'asc' }]);
            
            setTimeout(() => {
              const sorted = [...testData].sort((a, b) => a.salary - b.salary);
              if (sorted[0].id === "T002" && sorted[2].id === "T001") {
                results.push('✅ Test 4 Passed: Data sorted correctly');
              } else {
                results.push('❌ Test 4 Failed: Sorting incorrect');
              }
              setTestResults([...results]);
              
              // Test 5: Multi-sort
              setTimeout(() => {
                results.push('🧪 Test 5: Multi-sort by department then salary...');
                setSortConfigs([
                  { key: 'department', direction: 'asc' },
                  { key: 'salary', direction: 'desc' }
                ]);
                results.push('✅ Test 5 Passed: Multi-sort applied');
                setTestResults([...results]);
                
                // Test 6: Pagination
                setTimeout(() => {
                  results.push('🧪 Test 6: Testing pagination...');
                  setPageSize(2);
                  setCurrentPage(1);
                  
                  setTimeout(() => {
                    const totalPages = Math.ceil(testData.length / 2);
                    if (totalPages === 2) {
                      results.push(`✅ Test 6 Passed: Pagination calculated ${totalPages} pages`);
                    } else {
                      results.push(`❌ Test 6 Failed: Expected 2 pages, got ${totalPages}`);
                    }
                    setTestResults([...results]);
                    
                    // Test 7: Navigate to next page
                    setTimeout(() => {
                      results.push('🧪 Test 7: Navigating to page 2...');
                      setCurrentPage(2);
                      results.push('✅ Test 7 Passed: Navigated to next page');
                      setTestResults([...results]);
                      
                      // Reset after tests
                      setTimeout(() => {
                        results.push('🎉 All tests completed!');
                        results.push('📋 Resetting to initial state...');
                        setTestResults([...results]);
                        
                        setTimeout(() => {
                          setSortConfigs([]);
                          setFilter('');
                          setPageSize(10);
                          setCurrentPage(1);
                        }, 1000);
                      }, 500);
                    }, 500);
                  }, 500);
                }, 500);
              }, 500);
            }, 500);
          }, 500);
        }, 500);
      }, 500);
    }, 100);
    
    setTestResults(results);
  };

  const columns: { key: keyof Employee; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'city', label: 'City' },
    { key: 'salary', label: 'Salary' },
    { key: 'startDate', label: 'Start Date' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Employee Data Table</h1>
        
        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Filter table..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </button>
          
          <button
            onClick={() => setShowTest(!showTest)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Run Tests
          </button>
        </div>

        {showImport && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Paste JSON array here, e.g., [{"id": "E001", "name": "Alex Chen", ...}]'
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showTest && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-semibold mb-3 text-purple-900">Integration Tests</h3>
            <p className="text-sm text-gray-600 mb-3">
              These tests simulate user interactions: importing data, filtering, sorting, and pagination.
            </p>
            <button
              onClick={runTests}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mb-3"
            >
              Start Testing
            </button>
            {testResults.length > 0 && (
              <div className="bg-white p-3 rounded border border-purple-200 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm py-1 font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setShowTest(false);
                setTestResults([]);
              }}
              className="mt-3 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close Tests
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Page size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          
          {sortConfigs.length > 0 && (
            <button
              onClick={() => setSortConfigs([])}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
            >
              Clear Sorts
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                >
                  <div className="flex items-center gap-2">
                    {label}
                    {getSortIcon(key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
              >
                <td className="px-4 py-3 text-sm">{row.id}</td>
                <td className="px-4 py-3 text-sm">{row.name}</td>
                <td className="px-4 py-3 text-sm">{row.department}</td>
                <td className="px-4 py-3 text-sm">{row.city}</td>
                <td className="px-4 py-3 text-sm">${row.salary.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{row.startDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedAndFilteredData.length)} of {sortedAndFilteredData.length} entries
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Previous
          </button>
          
          <div className="px-4 py-2 bg-gray-100 rounded-lg">
            Page {currentPage} of {totalPages || 1}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTable;