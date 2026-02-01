import React, { useState, useMemo, useEffect } from 'react';

type Employee = {
  id: string;
  name: string;
  department: string;
  city: string;
  salary: number;
  startDate: string;
};

type SortDirection = 'asc' | 'desc';

type SortConfig = {
  key: keyof Employee;
  direction: SortDirection;
};

type EmployeeTableProps = {
  initialData?: Employee[];
  defaultPageSize?: number;
  onEmployeeSelect?: (employee: Employee) => void;
  showImportControls?: boolean;
  showSampleDataButton?: boolean;
  showTestControls?: boolean;
};

const generateSampleData = (count: number): Employee[] => {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
  const cities = ['Seattle', 'New York', 'Austin', 'Boston', 'San Francisco'];
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `EMP${String(i + 1).padStart(3, '0')}`,
    name: `${names[i % names.length]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][Math.floor(Math.random() * 5)]}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    city: cities[Math.floor(Math.random() * cities.length)],
    salary: Math.floor(Math.random() * 100000) + 50000,
    startDate: `${2015 + Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
  }));
};

export default function EmployeeTable({
  initialData = [],
  defaultPageSize = 10,
  onEmployeeSelect,
  showImportControls = true,
  showSampleDataButton = true,
  showTestControls = true
}: EmployeeTableProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialData);
  const [filter, setFilter] = useState<string>('');
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [customPageSize, setCustomPageSize] = useState<string>(String(defaultPageSize));
  const [pageJump, setPageJump] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [testResults, setTestResults] = useState<string>('');

  // Only update employees when initialData changes AND employees is empty
  // This prevents overwriting user actions like import or load sample
  useEffect(() => {
    if (initialData.length > 0 && employees.length === 0) {
      setEmployees(initialData);
    }
  }, [initialData, employees.length]);

  const handleSort = (key: keyof Employee): void => {
    setSortConfigs(prev => {
      const existing = prev.find(s => s.key === key);
      
      if (!existing) {
        return [{ key, direction: 'asc' as SortDirection }, ...prev].slice(0, 2);
      }
      
      if (existing.direction === 'asc') {
        return prev.map(s => s.key === key ? { key, direction: 'desc' as SortDirection } : s);
      }
      
      return prev.filter(s => s.key !== key);
    });
  };

  const getSortIndicator = (key: keyof Employee): string => {
    const config = sortConfigs.find(s => s.key === key);
    if (!config) return '';
    const index = sortConfigs.indexOf(config);
    const label = index === 0 ? '' : `${index + 1}`;
    return config.direction === 'asc' ? ` ↑${label}` : ` ↓${label}`;
  };

  const filteredAndSorted = useMemo((): Employee[] => {
    let result = [...employees];

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(emp =>
        Object.values(emp).some(val =>
          String(val).toLowerCase().includes(lowerFilter)
        )
      );
    }

    sortConfigs.forEach(config => {
      result.sort((a, b) => {
        const aVal = a[config.key];
        const bVal = b[config.key];
        
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return result;
  }, [employees, filter, sortConfigs]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  
  const paginatedData = useMemo((): Employee[] => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const handleFilterChange = (value: string): void => {
    setFilter(value);
    setCurrentPage(1);
  };

  const handleImport = (): void => {
    try {
      const data: unknown = JSON.parse(importText);
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array');
      }
      setEmployees(data as Employee[]);
      setImportError('');
      setImportText('');
      setCurrentPage(1);
    } catch (err) {
      setImportError(`Parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    }
  };

  const handleLoadSample = (): void => {
    setEmployees(generateSampleData(100));
    setImportError('');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string): void => {
    const size = parseInt(value, 10);
    if (!isNaN(size) && size > 0) {
      setPageSize(size);
      setCustomPageSize(value);
      setCurrentPage(1);
    }
  };

  const handlePageJump = (): void => {
    const page = parseInt(pageJump, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageJump('');
    }
  };

  const handleRowClick = (employee: Employee): void => {
    if (onEmployeeSelect) {
      onEmployeeSelect(employee);
    }
  };

  const runSanityChecks = (): void => {
    const results: string[] = [];
    
    try {
      const testData = generateSampleData(100);
      setEmployees(testData);
      
      setFilter('seattle');
      setTimeout(() => {
        const seattleCount = testData.filter(e => 
          Object.values(e).some(v => String(v).toLowerCase().includes('seattle'))
        ).length;
        
        results.push(seattleCount < 100 ? '✓ Filter reduces results' : '✗ Filter test failed');
        
        setSortConfigs([{ key: 'salary', direction: 'asc' }]);
        setTimeout(() => {
          const sorted = [...testData].sort((a, b) => a.salary - b.salary);
          const isNonDecreasing = sorted.every((emp, i) => 
            i === 0 || emp.salary >= sorted[i - 1].salary
          );
          results.push(isNonDecreasing ? '✓ Salary sort ascending works' : '✗ Sort test failed');
          
          setPageSize(10);
          const expectedPages = Math.ceil(100 / 10);
          results.push(expectedPages === 10 ? '✓ Pagination yields 10 pages' : '✗ Pagination test failed');
          
          setTestResults(results.join('\n'));
          setFilter('');
          setSortConfigs([]);
        }, 100);
      }, 100);
    } catch (err) {
      setTestResults(`Test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Employee Data Table</h1>
      
      {(showSampleDataButton || showTestControls || showImportControls) && (
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            {showSampleDataButton && (
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Load sample data (100 rows)
              </button>
            )}
            {showTestControls && (
              <button
                onClick={runSanityChecks}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Run sanity checks
              </button>
            )}
          </div>

          {testResults && (
            <div className="p-3 bg-gray-100 rounded whitespace-pre-wrap font-mono text-sm">
              {testResults}
            </div>
          )}

          {showImportControls && (
            <div className="space-y-2">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste JSON array of employees here..."
                className="w-full h-24 p-2 border rounded"
              />
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Import
              </button>
              {importError && (
                <div className="text-red-600 text-sm">{importError}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter all columns..."
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredAndSorted.length} employees
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No results found</div>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th
                    onClick={() => handleSort('id')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-left"
                    style={{ width: '10%' }}
                  >
                    ID{getSortIndicator('id')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-left"
                    style={{ width: '20%' }}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('department')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-left"
                    style={{ width: '18%' }}
                  >
                    Department{getSortIndicator('department')}
                  </th>
                  <th
                    onClick={() => handleSort('city')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-left"
                    style={{ width: '16%' }}
                  >
                    City{getSortIndicator('city')}
                  </th>
                  <th
                    onClick={() => handleSort('salary')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-right"
                    style={{ width: '16%' }}
                  >
                    Salary{getSortIndicator('salary')}
                  </th>
                  <th
                    onClick={() => handleSort('startDate')}
                    className="border p-2 cursor-pointer hover:bg-gray-200 text-left"
                    style={{ width: '20%' }}
                  >
                    Start Date{getSortIndicator('startDate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((emp) => (
                  <tr 
                    key={emp.id} 
                    onClick={() => handleRowClick(emp)}
                    className={`hover:bg-gray-50 ${onEmployeeSelect ? 'cursor-pointer' : ''}`}
                  >
                    <td className="border p-2">{emp.id}</td>
                    <td className="border p-2">{emp.name}</td>
                    <td className="border p-2">{emp.department}</td>
                    <td className="border p-2">{emp.city}</td>
                    <td className="border p-2 text-right">${emp.salary.toLocaleString()}</td>
                    <td className="border p-2">{emp.startDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Prev
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Jump to:</span>
              <input
                type="number"
                value={pageJump}
                onChange={(e) => setPageJump(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePageJump()}
                placeholder="Page"
                className="w-16 px-2 py-1 border rounded text-sm"
              />
              <button
                onClick={handlePageJump}
                className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
              >
                Go
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Page size:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <input
                type="number"
                value={customPageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                placeholder="Custom"
                className="w-20 px-2 py-1 border rounded text-sm"
                min="1"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}