import React, { useState, useMemo, useRef } from 'react';

type Employee = {
  id: string;
  name: string;
  department: string;
  city: string;
  salary: number;
  startDate: string;
};

type SortDirection = 'asc' | 'desc' | null;
type SortKey = keyof Employee;

type SortState = {
  key: SortKey;
  direction: SortDirection;
  priority: number;
}[];

type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

type E2EStep = {
  action: string;
  expected: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
};

// Pure helper functions
function filterRows(rows: Employee[], query: string, columns: SortKey[]): Employee[] {
  if (!query.trim()) return rows;
  const lowerQuery = query.toLowerCase();
  return rows.filter(row =>
    columns.some(col => String(row[col]).toLowerCase().includes(lowerQuery))
  );
}

function sortRows(rows: Employee[], sortState: SortState): Employee[] {
  if (sortState.length === 0) return rows;
  
  return [...rows].sort((a, b) => {
    for (const { key, direction } of sortState) {
      if (!direction) continue;
      
      let valA = a[key];
      let valB = b[key];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      let cmp = 0;
      if (valA < valB) cmp = -1;
      else if (valA > valB) cmp = 1;
      
      if (cmp !== 0) {
        return direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
}

function paginateRows(rows: Employee[], page: number, pageSize: number): Employee[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

// Generate sample data
function generateSampleData(): Employee[] {
  const employees: Employee[] = [];
  
  const baseNames = [
    'Alex Chen', 'Noah Johnson', 'Priya Patel', 'Chris Martin', 'Skylar Stone',
    'Adrian Brooks', 'Zoë Kravitz', 'Emma Wilson', 'Liam Brown', 'Olivia Davis',
    'Sophia Martinez', 'Jackson Taylor', 'Ava Anderson', 'Lucas Thomas', 'Mia Jackson',
    'Ethan White', 'Isabella Harris', 'Mason Clark', 'Charlotte Lewis', 'Logan Robinson'
  ];
  
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
  const cities = ['Seattle', 'New York', 'Austin', 'Boston', 'Chicago'];
  
  for (let i = 1; i <= 100; i++) {
    const id = `E${String(i).padStart(3, '0')}`;
    const name = i <= baseNames.length ? baseNames[i - 1] : `Employee ${i}`;
    const deptIndex = (i - 1) % departments.length;
    const department = departments[deptIndex];
    const city = cities[(i - 1) % cities.length];
    const salary = 50000 + (i * 1000);
    
    const startYear = 2019 + ((i - 1) % 6);
    const startMonth = String(((i - 1) % 12) + 1).padStart(2, '0');
    const startDay = String(((i - 1) % 28) + 1).padStart(2, '0');
    const startDate = `${startYear}-${startMonth}-${startDay}`;
    
    employees.push({ id, name, department, city, salary, startDate });
  }
  
  employees[0] = { id: 'E001', name: 'Alex Chen', department: 'Engineering', city: 'Seattle', salary: 95000, startDate: '2020-03-15' };
  employees[1] = { id: 'E002', name: 'Noah Johnson', department: 'Sales', city: 'New York', salary: 70000, startDate: '2021-06-10' };
  employees[2] = { id: 'E003', name: 'Priya Patel', department: 'Engineering', city: 'Austin', salary: 135000, startDate: '2022-01-20' };
  employees[3] = { id: 'E004', name: 'Chris Martin', department: 'Marketing', city: 'Boston', salary: 88000, startDate: '2020-08-05' };
  employees[4] = { id: 'E005', name: 'Skylar Stone', department: 'HR', city: 'Chicago', salary: 72000, startDate: '2019-11-12' };
  employees[5] = { id: 'E006', name: 'Adrian Brooks', department: 'Finance', city: 'Seattle', salary: 92000, startDate: '2019-01-01' };
  employees[99] = { id: 'E100', name: 'Zoë Kravitz', department: 'Sales', city: 'New York', salary: 105000, startDate: '2023-02-28' };
  
  for (let i = 6; i < 18; i++) {
    if (employees[i]) {
      employees[i] = { ...employees[i], department: 'Engineering' };
    }
  }
  
  for (let i = 18; i < 30; i++) {
    if (employees[i]) {
      employees[i] = { ...employees[i], department: 'Sales' };
    }
  }
  
  return employees;
}

// Table Component
const DataTable: React.FC<{
  data: Employee[];
  sortState: SortState;
  onSort: (key: SortKey) => void;
  highlightRow?: number;
}> = ({ data, sortState, onSort, highlightRow }) => {
  const columns: { key: SortKey; label: string; width: string }[] = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'name', label: 'Name', width: '150px' },
    { key: 'department', label: 'Department', width: '120px' },
    { key: 'city', label: 'City', width: '100px' },
    { key: 'salary', label: 'Salary', width: '100px' },
    { key: 'startDate', label: 'Start Date', width: '110px' },
  ];

  const getSortIcon = (key: SortKey) => {
    const sort = sortState.find(s => s.key === key);
    if (!sort || !sort.direction) return ' ○';
    const arrow = sort.direction === 'asc' ? '↑' : '↓';
    const priority = sortState.filter(s => s.direction).length > 1 ? `${sort.priority}` : '';
    return ` ${arrow}${priority}`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ 
        width: '100%', 
        tableLayout: 'fixed', 
        borderCollapse: 'collapse',
        fontSize: '14px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                style={{
                  width: col.width,
                  padding: '12px 8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '2px solid #e5e7eb',
                  userSelect: 'none',
                  fontWeight: 600,
                }}
              >
                {col.label}{getSortIcon(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No results found
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr 
                key={row.id} 
                style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: highlightRow === idx ? '#fef3c7' : 'transparent',
                  transition: 'background-color 0.3s'
                }}
              >
                <td style={{ padding: '10px 8px' }}>{row.id}</td>
                <td style={{ padding: '10px 8px' }}>{row.name}</td>
                <td style={{ padding: '10px 8px' }}>{row.department}</td>
                <td style={{ padding: '10px 8px' }}>{row.city}</td>
                <td style={{ padding: '10px 8px' }}>${row.salary.toLocaleString()}</td>
                <td style={{ padding: '10px 8px' }}>{row.startDate}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Main App
export default function App() {
  const [allData, setAllData] = useState<Employee[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortState, setSortState] = useState<SortState>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCustomPageSize, setIsCustomPageSize] = useState(false);
  const [customPageSizeInput, setCustomPageSizeInput] = useState('');
  const [lastAction, setLastAction] = useState('No data loaded - Import or load sample data');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [e2eSteps, setE2eSteps] = useState<E2EStep[]>([]);
  const [isRunningE2E, setIsRunningE2E] = useState(false);
  const [currentE2EStep, setCurrentE2EStep] = useState(-1);
  const [highlightRow, setHighlightRow] = useState<number | undefined>();
  
  const tableRef = useRef<HTMLDivElement>(null);

  const filterableColumns: SortKey[] = ['id', 'name', 'department', 'city', 'salary', 'startDate'];

  const filteredData = useMemo(
    () => filterRows(allData, filterQuery, filterableColumns),
    [allData, filterQuery]
  );

  const sortedData = useMemo(
    () => sortRows(filteredData, sortState),
    [filteredData, sortState]
  );

  const paginatedData = useMemo(
    () => paginateRows(sortedData, page, pageSize),
    [sortedData, page, pageSize]
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (key: SortKey) => {
    setSortState(prev => {
      const existing = prev.find(s => s.key === key);
      let newState: SortState;

      if (!existing) {
        newState = [...prev, { key, direction: 'asc', priority: prev.filter(s => s.direction).length + 1 }];
      } else if (existing.direction === 'asc') {
        newState = prev.map(s => s.key === key ? { ...s, direction: 'desc' as SortDirection } : s);
      } else if (existing.direction === 'desc') {
        newState = prev.filter(s => s.key !== key);
      } else {
        newState = prev.map(s => s.key === key ? { ...s, direction: 'asc' as SortDirection } : s);
      }

      const activeSorts = newState.filter(s => s.direction);
      if (activeSorts.length > 2) {
        const toRemove = activeSorts[0].key;
        newState = newState.filter(s => s.key !== toRemove);
      }

      let priority = 1;
      newState = newState.map(s => s.direction ? { ...s, priority: priority++ } : s);

      return newState;
    });
    setPage(1);
    setLastAction(`Sorted ${key}`);
  };

  const handleFilterChange = (query: string) => {
    setFilterQuery(query);
    setPage(1);
    setLastAction(query ? `Filtered: "${query}"` : 'Cleared filter');
  };

  const handlePageSizeChange = (newSize: number | 'custom') => {
    if (newSize === 'custom') {
      setIsCustomPageSize(true);
      setCustomPageSizeInput(String(pageSize));
    } else {
      setIsCustomPageSize(false);
      setPageSize(newSize);
      setPage(1);
      setLastAction(`Changed page size to ${newSize}`);
    }
  };

  const handleCustomPageSizeSubmit = () => {
    const val = parseInt(customPageSizeInput);
    if (val > 0 && val <= 1000) {
      setPageSize(val);
      setPage(1);
      setLastAction(`Changed page size to ${val} (custom)`);
    } else {
      alert('Please enter a valid page size (1-1000)');
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        setImportError('Data must be an array');
        return;
      }
      
      const requiredFields: (keyof Employee)[] = ['id', 'name', 'department', 'city', 'salary', 'startDate'];
      for (const item of parsed) {
        for (const field of requiredFields) {
          if (!(field in item)) {
            setImportError(`Missing required field: ${field}`);
            return;
          }
        }
      }
      
      setAllData(parsed);
      setImportError('');
      setPage(1);
      setTestResults([]);
      setE2eSteps([]);
      setLastAction(`Imported ${parsed.length} rows`);
    } catch (e) {
      setImportError('Invalid JSON format');
    }
  };

  const handleLoadSample = () => {
    setAllData([]);
    setImportError('');
    setPage(1);
    setSortState([]);
    setFilterQuery('');
    setTestResults([]);
    setE2eSteps([]);
    setLastAction('Cleared all data');
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const runE2ETests = async () => {
    if (allData.length === 0) {
      alert('❌ Please import data first before running E2E tests');
      return;
    }
    
    setIsRunningE2E(true);
    setCurrentE2EStep(-1);
    setTestResults([]); // Clear unit test results
    
    // Reset state
    setPage(1);
    setSortState([]);
    setFilterQuery('');
    await sleep(500);
    
    const steps: E2EStep[] = [
      { action: 'Part 1: Verify initial state', expected: 'First row shows Alex Chen (E001)', status: 'pending' },
      { action: 'Part 1: Check total records', expected: 'Total count = 100', status: 'pending' },
      { action: 'Part 1: Check pagination buttons', expected: 'Pages 1-10 generated', status: 'pending' },
      { action: 'Part 2: Click Salary header (ascending)', expected: 'First row: Noah Johnson (Salary: $70,000)', status: 'pending' },
      { action: 'Part 2: Click Salary header again (descending)', expected: 'First row: Priya Patel (Salary: $135,000)', status: 'pending' },
      { action: 'Part 2: Click Name header (A-Z)', expected: 'First row: Adrian Brooks, Last row: Zoë Kravitz', status: 'pending' },
      { action: 'Part 2: Click startDate header (chronological)', expected: 'First row has startDate: 2019-01-01', status: 'pending' },
      { action: 'Part 3: Search "Chris Martin"', expected: 'Exactly 1 record returned', status: 'pending' },
      { action: 'Part 3: Clear search, then search "Engineering"', expected: 'Filtered count = 18', status: 'pending' },
      { action: 'Part 3: Clear search, then search "Seattle"', expected: 'All rows show city = Seattle', status: 'pending' },
      { action: 'Part 3: Clear search, then search "Skylar"', expected: 'Matches Skylar Stone', status: 'pending' },
      { action: 'Part 3: Clear search box', expected: 'Restore original 10 records', status: 'pending' },
      { action: 'Part 4: Click page 6', expected: 'Show E051-E060', status: 'pending' },
      { action: 'Part 4: Click page 10', expected: 'Show last 10 records, Next disabled', status: 'pending' },
      { action: 'Part 4: Change page size to 25', expected: 'Total pages becomes 4', status: 'pending' },
      { action: 'Part 5: Reset, sort by Salary desc, then filter "Sales"', expected: 'First row is highest-paid in Sales', status: 'pending' },
      { action: 'Part 5: Reset, filter for letter "e", check all pages', expected: 'All entries contain "e"', status: 'pending' },
      { action: 'Part 5: Go to page 3, then change sort', expected: 'Pagination resets to page 1', status: 'pending' },
      { action: 'Part 6: Verify special character rendering', expected: 'Zoë Kravitz displays correctly', status: 'pending' },
    ];
    
    setE2eSteps(steps);

    for (let i = 0; i < steps.length; i++) {
      setCurrentE2EStep(i);
      setE2eSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'running' } : s
      ));
      
      scrollToTable();
      await sleep(1500);
      
      try {
        let passed = false;
        let error = '';

        // Get current state snapshot
        const currentFilteredData = filterRows(allData, filterQuery, filterableColumns);
        const currentSortedData = sortRows(currentFilteredData, sortState);
        const currentPaginatedData = paginateRows(currentSortedData, page, pageSize);
        const currentTotalPages = Math.ceil(currentFilteredData.length / pageSize);

        switch (i) {
          case 0: // Initial state - Alex Chen
            passed = currentPaginatedData[0]?.id === 'E001' && currentPaginatedData[0]?.name === 'Alex Chen';
            error = !passed ? `Got ${currentPaginatedData[0]?.name} (${currentPaginatedData[0]?.id})` : '';
            setHighlightRow(0);
            break;

          case 1: // Total records
            passed = allData.length === 100;
            error = !passed ? `Got ${allData.length}` : '';
            break;

          case 2: // Pagination buttons
            passed = currentTotalPages === 10;
            error = !passed ? `Got ${currentTotalPages} pages` : '';
            break;

          case 3: // Sort salary ascending
            handleSort('salary');
            await sleep(1000);
            const salaryAscData = paginateRows(sortRows(filterRows(allData, '', filterableColumns), [{ key: 'salary', direction: 'asc', priority: 1 }]), 1, pageSize);
            passed = salaryAscData[0]?.name === 'Noah Johnson' && salaryAscData[0]?.salary === 70000;
            error = !passed ? `Got ${salaryAscData[0]?.name} (${salaryAscData[0]?.salary})` : '';
            setHighlightRow(0);
            break;

          case 4: // Sort salary descending
            handleSort('salary');
            await sleep(1000);
            const salaryDescData = paginateRows(sortRows(filterRows(allData, '', filterableColumns), [{ key: 'salary', direction: 'desc', priority: 1 }]), 1, pageSize);
            passed = salaryDescData[0]?.name === 'Priya Patel' && salaryDescData[0]?.salary === 135000;
            error = !passed ? `Got ${salaryDescData[0]?.name} (${salaryDescData[0]?.salary})` : '';
            setHighlightRow(0);
            break;

          case 5: // Sort name A-Z
            setSortState([]);
            await sleep(500);
            handleSort('name');
            await sleep(1000);
            const nameSorted = sortRows(allData, [{ key: 'name', direction: 'asc', priority: 1 }]);
            const lastPageNum = Math.ceil(nameSorted.length / pageSize);
            setPage(lastPageNum);
            await sleep(1000);
            const lastPageData = paginateRows(nameSorted, lastPageNum, pageSize);
            passed = nameSorted[0]?.name === 'Adrian Brooks' && lastPageData[lastPageData.length - 1]?.name === 'Zoë Kravitz';
            error = !passed ? `Got first: ${nameSorted[0]?.name}, last: ${lastPageData[lastPageData.length - 1]?.name}` : '';
            setHighlightRow(0);
            setPage(1);
            await sleep(500);
            break;

          case 6: // Sort by date
            setSortState([]);
            await sleep(500);
            handleSort('startDate');
            await sleep(1000);
            const dateSorted = paginateRows(sortRows(allData, [{ key: 'startDate', direction: 'asc', priority: 1 }]), 1, pageSize);
            passed = dateSorted[0]?.startDate === '2019-01-01';
            error = !passed ? `Got ${dateSorted[0]?.startDate}` : '';
            setHighlightRow(0);
            break;

          case 7: // Search Chris Martin
            setSortState([]);
            setPage(1);
            await sleep(500);
            handleFilterChange('Chris Martin');
            await sleep(1000);
            const chrisFiltered = filterRows(allData, 'Chris Martin', filterableColumns);
            passed = chrisFiltered.length === 1;
            error = !passed ? `Got ${chrisFiltered.length} records` : '';
            setHighlightRow(0);
            break;

          case 8: // Search Engineering
            handleFilterChange('');
            await sleep(500);
            handleFilterChange('Engineering');
            await sleep(1000);
            const engFiltered = filterRows(allData, 'Engineering', filterableColumns);
            passed = engFiltered.length === 18;
            error = !passed ? `Got ${engFiltered.length} records` : '';
            break;

          case 9: // Search Seattle
            handleFilterChange('');
            await sleep(500);
            handleFilterChange('Seattle');
            await sleep(1000);
            const seattleFiltered = filterRows(allData, 'Seattle', filterableColumns);
            passed = seattleFiltered.length > 0 && seattleFiltered.every(e => e.city === 'Seattle');
            error = !passed ? (seattleFiltered.length === 0 ? 'No Seattle records found' : 'Not all rows show Seattle') : '';
            break;

          case 10: // Search Skylar
            handleFilterChange('');
            await sleep(500);
            handleFilterChange('Skylar');
            await sleep(1000);
            const skylarFiltered = filterRows(allData, 'Skylar', filterableColumns);
            passed = skylarFiltered.some(e => e.name === 'Skylar Stone');
            error = !passed ? 'Skylar Stone not found' : '';
            setHighlightRow(0);
            break;

          case 11: // Clear search
            handleFilterChange('');
            await sleep(1000);
            const clearedData = paginateRows(allData, 1, pageSize);
            passed = clearedData.length === 10 && clearedData[0]?.id === 'E001';
            error = !passed ? 'Did not restore to original state' : '';
            break;

          case 12: // Page 6
            setPage(6);
            await sleep(1000);
            const page6Data = paginateRows(allData, 6, pageSize);
            passed = page6Data[0]?.id === 'E051' && page6Data[page6Data.length - 1]?.id === 'E060';
            error = !passed ? `Got ${page6Data[0]?.id} - ${page6Data[page6Data.length - 1]?.id}` : '';
            setHighlightRow(0);
            break;

          case 13: // Page 10
            setPage(10);
            await sleep(1000);
            const page10Data = paginateRows(allData, 10, pageSize);
            const isLastPage = 10 === Math.ceil(allData.length / pageSize);
            passed = page10Data[page10Data.length - 1]?.id === 'E100' && isLastPage;
            error = !passed ? `Last ID: ${page10Data[page10Data.length - 1]?.id}, isLastPage: ${isLastPage}` : '';
            setHighlightRow(page10Data.length - 1);
            break;

          case 14: // Page size 25
            setPage(1);
            setIsCustomPageSize(false);
            handlePageSizeChange(25);
            await sleep(1000);
            const pages25 = Math.ceil(allData.length / 25);
            passed = pages25 === 4;
            error = !passed ? `Got ${pages25} pages` : '';
            break;

          case 15: // Sort then filter
            setSortState([]);
            setFilterQuery('');
            setPage(1);
            setIsCustomPageSize(false);
            handlePageSizeChange(10);
            await sleep(500);
            handleSort('salary');
            await sleep(500);
            handleSort('salary'); // desc
            await sleep(1000);
            handleFilterChange('Sales');
            await sleep(1000);
            const salesFiltered = filterRows(allData, 'Sales', filterableColumns);
            const salesSorted = sortRows(salesFiltered, [{ key: 'salary', direction: 'desc', priority: 1 }]);
            const salesPaginated = paginateRows(salesSorted, 1, 10);
            const salesHighest = salesPaginated[0];
            const allSalesMatch = salesFiltered.every(e => e.department === 'Sales');
            passed = allSalesMatch && salesHighest?.department === 'Sales';
            error = !passed ? `Sales filter or sort failed. First: ${salesHighest?.name}` : '';
            setHighlightRow(0);
            break;

          case 16: // Filter "e" across pages
            setSortState([]);
            setFilterQuery('');
            setPage(1);
            await sleep(500);
            handleFilterChange('e');
            await sleep(1000);
            const eFiltered = filterRows(allData, 'e', filterableColumns);
            const allHaveE = eFiltered.every(e =>
              Object.values(e).some(v => String(v).toLowerCase().includes('e'))
            );
            passed = allHaveE && eFiltered.length > 0;
            error = !passed ? 'Some entries do not contain "e"' : '';
            break;

          case 17: // Page 3 then sort
            setSortState([]);
            setFilterQuery('');
            await sleep(500);
            setPage(3);
            await sleep(1000);
            handleSort('name');
            await sleep(1000);
            passed = page === 1;
            error = !passed ? `Page is ${page}, expected 1` : '';
            break;

          case 18: // Special characters
            setSortState([]);
            setFilterQuery('');
            setPage(1);
            await sleep(500);
            handleFilterChange('Zoë');
            await sleep(1000);
            const zoeFiltered = filterRows(allData, 'Zoë', filterableColumns);
            passed = zoeFiltered.some(e => e.name === 'Zoë Kravitz');
            error = !passed ? 'Zoë Kravitz not found' : '';
            setHighlightRow(0);
            break;
        }

        setE2eSteps(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: passed ? 'passed' : 'failed', error } : s
        ));
        
        await sleep(800);
        setHighlightRow(undefined);
        
      } catch (e) {
        setE2eSteps(prev => prev.map((s, idx) => 
          idx === i ? { ...s, status: 'failed', error: String(e) } : s
        ));
      }
    }

    setCurrentE2EStep(-1);
    setIsRunningE2E(false);
  };

  const runUnitTests = () => {
    if (allData.length === 0) {
      alert('❌ Please import data first before running unit tests');
      return;
    }
    
    const results: TestResult[] = [];
    const testData = allData;
    
    setE2eSteps([]); // Clear E2E test results

    try {
      results.push({
        name: 'Total Records = 100',
        passed: testData.length === 100,
        error: testData.length !== 100 ? `Got ${testData.length}` : undefined
      });

      results.push({
        name: 'First row is Alex Chen (E001)',
        passed: testData[0].id === 'E001' && testData[0].name === 'Alex Chen',
        error: testData[0].id !== 'E001' ? `Got ${testData[0].name}` : undefined
      });

      const salarySortAsc = sortRows(testData, [{ key: 'salary', direction: 'asc', priority: 1 }]);
      results.push({
        name: 'Salary Asc: Noah Johnson (70000) first',
        passed: salarySortAsc[0].name === 'Noah Johnson' && salarySortAsc[0].salary === 70000,
        error: salarySortAsc[0].name !== 'Noah Johnson' ? `Got ${salarySortAsc[0].name}` : undefined
      });

      const salarySortDesc = sortRows(testData, [{ key: 'salary', direction: 'desc', priority: 1 }]);
      results.push({
        name: 'Salary Desc: Priya Patel (135000) first',
        passed: salarySortDesc[0].name === 'Priya Patel' && salarySortDesc[0].salary === 135000,
        error: salarySortDesc[0].name !== 'Priya Patel' ? `Got ${salarySortDesc[0].name}` : undefined
      });

      const nameSortAsc = sortRows(testData, [{ key: 'name', direction: 'asc', priority: 1 }]);
      results.push({
        name: 'Name A-Z: Adrian Brooks first',
        passed: nameSortAsc[0].name === 'Adrian Brooks',
        error: nameSortAsc[0].name !== 'Adrian Brooks' ? `Got ${nameSortAsc[0].name}` : undefined
      });

      results.push({
        name: 'Name A-Z: Zoë Kravitz last',
        passed: nameSortAsc[nameSortAsc.length - 1].name === 'Zoë Kravitz',
        error: nameSortAsc[nameSortAsc.length - 1].name !== 'Zoë Kravitz' ? `Got ${nameSortAsc[nameSortAsc.length - 1].name}` : undefined
      });

      const dateSortAsc = sortRows(testData, [{ key: 'startDate', direction: 'asc', priority: 1 }]);
      results.push({
        name: 'Date: Earliest is 2019-01-01',
        passed: dateSortAsc[0].startDate === '2019-01-01',
        error: dateSortAsc[0].startDate !== '2019-01-01' ? `Got ${dateSortAsc[0].startDate}` : undefined
      });

      const chrisResult = filterRows(testData, 'Chris Martin', filterableColumns);
      results.push({
        name: 'Search "Chris Martin" = 1 record',
        passed: chrisResult.length === 1,
        error: chrisResult.length !== 1 ? `Got ${chrisResult.length}` : undefined
      });

      const engResult = filterRows(testData, 'Engineering', filterableColumns);
      results.push({
        name: 'Search "Engineering" = 18 records',
        passed: engResult.length === 18,
        error: engResult.length !== 18 ? `Got ${engResult.length}` : undefined
      });

      const seattleResult = filterRows(testData, 'Seattle', filterableColumns);
      results.push({
        name: 'Search "Seattle" filters by city',
        passed: seattleResult.every(e => e.city === 'Seattle') && seattleResult.length > 0,
        error: !seattleResult.every(e => e.city === 'Seattle') ? 'Not all Seattle' : undefined
      });

      const skylarResult = filterRows(testData, 'Skylar', filterableColumns);
      results.push({
        name: 'Fuzzy match "Skylar" finds Skylar Stone',
        passed: skylarResult.some(e => e.name === 'Skylar Stone'),
        error: !skylarResult.some(e => e.name === 'Skylar Stone') ? 'Not found' : undefined
      });

      const page6 = paginateRows(testData, 6, 10);
      results.push({
        name: 'Page 6 shows E051-E060',
        passed: page6[0].id === 'E051' && page6[page6.length - 1].id === 'E060',
        error: page6[0].id !== 'E051' ? `Got ${page6[0].id}-${page6[page6.length - 1].id}` : undefined
      });

      const page10 = paginateRows(testData, 10, 10);
      results.push({
        name: 'Page 10 shows last 10 records',
        passed: page10.length === 10 && page10[page10.length - 1].id === 'E100',
        error: page10[page10.length - 1].id !== 'E100' ? `Last: ${page10[page10.length - 1].id}` : undefined
      });

      const totalPages25 = Math.ceil(testData.length / 25);
      results.push({
        name: 'Page size 25 = 4 total pages',
        passed: totalPages25 === 4,
        error: totalPages25 !== 4 ? `Got ${totalPages25}` : undefined
      });

      const zoeExists = testData.some(e => e.name === 'Zoë Kravitz');
      results.push({
        name: 'Special char "ë" in Zoë Kravitz renders',
        passed: zoeExists,
        error: !zoeExists ? 'Name not found' : undefined
      });

    } catch (e) {
      results.push({
        name: 'Test execution',
        passed: false,
        error: String(e)
      });
    }

    setTestResults(results);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      {/* Left Side - Table */}
      <div style={{ flex: '1', minWidth: '0' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>Employee Data Table</h1>

        {/* Import Section */}
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Import Data</h2>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Paste JSON array of Employee objects...'
            style={{
              width: '100%',
              height: '80px',
              padding: '8px',
              marginBottom: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
          {importError && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>{importError}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleImport} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Import
            </button>
            <button onClick={handleLoadSample} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Clear All Data
            </button>
          </div>
        </div>

        {/* Filter & Controls */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder="Filter across all columns..."
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Rows per page:</label>
            {!isCustomPageSize ? (
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', minWidth: '100px' }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="custom">Custom...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="number"
                  value={customPageSizeInput}
                  onChange={(e) => setCustomPageSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomPageSizeSubmit();
                    } else if (e.key === 'Escape') {
                      setIsCustomPageSize(false);
                    }
                  }}
                  min="1"
                  max="1000"
                  autoFocus
                  placeholder="Enter size"
                  style={{ 
                    width: '80px', 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '4px', 
                    fontSize: '14px' 
                  }}
                />
                <button
                  onClick={handleCustomPageSizeSubmit}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setIsCustomPageSize(false)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
          Total: {allData.length} | Filtered: {filteredData.length} | Pages: {totalPages}
        </div>

        {/* Table */}
        <div ref={tableRef}>
          <DataTable data={paginatedData} sortState={sortState} onSort={handleSort} highlightRow={highlightRow} />
        </div>

        {/* Pagination */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              backgroundColor: page === 1 ? '#e5e7eb' : '#3b82f6',
              color: page === 1 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: '8px 12px',
                backgroundColor: page === p ? '#3b82f6' : 'white',
                color: page === p ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: page === p ? '600' : '400'
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              backgroundColor: page === totalPages ? '#e5e7eb' : '#3b82f6',
              color: page === totalPages ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>

        {/* Debug Panel */}
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Debug Panel</div>
          <div>Filter: "{filterQuery}"</div>
          <div>Sort: {sortState.filter(s => s.direction).map(s => `${s.key} ${s.direction} (${s.priority})`).join(', ') || 'none'}</div>
          <div>Page: {page} / {totalPages} (size: {pageSize})</div>
          <div>Rows: {allData.length} total, {filteredData.length} filtered, {paginatedData.length} displayed</div>
          <div>Last Action: {lastAction}</div>
        </div>
      </div>

      {/* Right Side - Tests */}
      <div style={{ width: '400px', flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: '20px' }}>
          <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Verification Tests</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={runUnitTests}
                disabled={isRunningE2E}
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  backgroundColor: isRunningE2E ? '#d1d5db' : '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isRunningE2E ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Unit Tests
              </button>
              <button
                onClick={runE2ETests}
                disabled={isRunningE2E}
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  backgroundColor: isRunningE2E ? '#d1d5db' : '#ec4899', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isRunningE2E ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isRunningE2E ? 'Running...' : 'E2E Tests'}
              </button>
            </div>
            
            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {/* Unit Test Results */}
              {testResults.length > 0 && (
                <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                    Unit Tests: {testResults.filter(t => t.passed).length} / {testResults.length} ✓
                  </div>
                  {testResults.map((test, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        marginBottom: '4px',
                        backgroundColor: test.passed ? '#d1fae5' : '#fee2e2',
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{ fontWeight: '500', fontSize: '12px' }}>
                        {test.passed ? '✓' : '✗'} {test.name}
                      </div>
                      {test.error && <div style={{ color: '#991b1b', fontSize: '11px', marginTop: '2px' }}>{test.error}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* E2E Test Steps */}
              {e2eSteps.length > 0 && (
                <div style={{ fontSize: '13px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                    E2E Tests: {e2eSteps.filter(t => t.status === 'passed').length} / {e2eSteps.length} ✓
                  </div>
                  {e2eSteps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        backgroundColor: 
                          step.status === 'passed' ? '#d1fae5' : 
                          step.status === 'failed' ? '#fee2e2' : 
                          step.status === 'running' ? '#dbeafe' : '#f3f4f6',
                        borderRadius: '4px',
                        border: idx === currentE2EStep ? '2px solid #3b82f6' : 'none'
                      }}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '12px' }}>
                        {step.status === 'passed' && '✓ '}
                        {step.status === 'failed' && '✗ '}
                        {step.status === 'running' && '⟳ '}
                        {step.action}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {step.expected}
                      </div>
                      {step.error && (
                        <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                          {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {testResults.length === 0 && e2eSteps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
                  Import data and run tests to see results
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}