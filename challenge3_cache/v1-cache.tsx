import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Settings, TestTube, Info } from 'lucide-react';

interface CacheEntry {
  value: string;
  expiry: number | null;
  lastAccessed: number;
}

interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const CacheSystem = () => {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [maxSize, setMaxSize] = useState(5);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState('');
  const [getKey, setGetKey] = useState('');
  const [getResult, setGetResult] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<{passed: string[], failed: string[]}>({passed: [], failed: []});
  
  const cacheRef = useRef(cache);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (action: string, details: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, action, details, type }].slice(-20));
  };

  const evictLRU = (currentCache: Map<string, CacheEntry>) => {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    currentCache.forEach((entry, k) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = k;
      }
    });
    
    if (oldestKey) {
      currentCache.delete(oldestKey);
      addLog('EVICT', `LRU evicted key: ${oldestKey}`, 'warning');
    }
  };

  const setCacheValue = (k: string, v: string, ttlMs?: number) => {
    if (!k) {
      addLog('ERROR', 'Key cannot be empty', 'error');
      return;
    }

    const newCache = new Map(cacheRef.current);
    
    // Check if we need to evict
    if (!newCache.has(k) && newCache.size >= maxSize) {
      evictLRU(newCache);
    }
    
    const expiry = ttlMs ? Date.now() + ttlMs : null;
    newCache.set(k, {
      value: v,
      expiry,
      lastAccessed: Date.now()
    });
    
    setCache(newCache);
    addLog('SET', `${k} = "${v}"${ttlMs ? ` (TTL: ${ttlMs}ms)` : ''}`, 'success');
  };

  const getCacheValue = (k: string): string | null => {
    if (!k) {
      addLog('ERROR', 'Key cannot be empty', 'error');
      return null;
    }

    const entry = cacheRef.current.get(k);
    
    if (!entry) {
      addLog('GET', `Key "${k}" not found`, 'error');
      return null;
    }
    
    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      const newCache = new Map(cacheRef.current);
      newCache.delete(k);
      setCache(newCache);
      addLog('GET', `Key "${k}" expired and removed`, 'warning');
      return null;
    }
    
    // Update last accessed time
    const newCache = new Map(cacheRef.current);
    newCache.set(k, { ...entry, lastAccessed: Date.now() });
    setCache(newCache);
    
    addLog('GET', `${k} = "${entry.value}"`, 'success');
    return entry.value;
  };

  const deleteCacheValue = (k: string) => {
    if (!k) {
      addLog('ERROR', 'Key cannot be empty', 'error');
      return;
    }

    const newCache = new Map(cacheRef.current);
    const existed = newCache.delete(k);
    
    if (existed) {
      setCache(newCache);
      addLog('DELETE', `Removed key: ${k}`, 'success');
    } else {
      addLog('DELETE', `Key "${k}" not found`, 'error');
    }
  };

  const clearCache = () => {
    setCache(new Map());
    addLog('CLEAR', 'Cache cleared', 'info');
  };

  const handleSet = () => {
    const ttlMs = ttl ? parseInt(ttl) : undefined;
    setCacheValue(key, value, ttlMs);
    setKey('');
    setValue('');
    setTtl('');
  };

  const handleGet = () => {
    const result = getCacheValue(getKey);
    setGetResult(result || 'Not found or expired');
  };

  const handleDelete = () => {
    deleteCacheValue(getKey);
    setGetKey('');
    setGetResult('');
  };

  // Automated tests
  const runTests = async () => {
    setTestRunning(true);
    setTestResults({passed: [], failed: []});
    const results = {passed: [] as string[], failed: [] as string[]};
    
    clearCache();
    await new Promise(r => setTimeout(r, 100));
    
    addLog('TEST', '=== Starting Test Suite ===', 'info');
    
    // Group A: Basic Operations
    addLog('TEST', '--- Group A: Basic Operations ---', 'info');
    
    // A1: set + get basic
    addLog('TEST', 'A1: set + get basic', 'info');
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 100));
    const valA1 = getCacheValue('a');
    if (valA1 === '1') {
      addLog('TEST', '✓ A1 passed', 'success');
      results.passed.push('A1');
    } else {
      addLog('TEST', '✗ A1 failed', 'error');
      results.failed.push('A1');
    }
    
    // A2: overwrite existing key
    addLog('TEST', 'A2: overwrite existing key', 'info');
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '2');
    await new Promise(r => setTimeout(r, 50));
    const valA2 = getCacheValue('a');
    if (valA2 === '2') {
      addLog('TEST', '✓ A2 passed', 'success');
      results.passed.push('A2');
    } else {
      addLog('TEST', '✗ A2 failed', 'error');
      results.failed.push('A2');
    }
    
    // A3: delete removes key
    addLog('TEST', 'A3: delete removes key', 'info');
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 50));
    deleteCacheValue('a');
    await new Promise(r => setTimeout(r, 50));
    const valA3 = getCacheValue('a');
    if (valA3 === null) {
      addLog('TEST', '✓ A3 passed', 'success');
      results.passed.push('A3');
    } else {
      addLog('TEST', '✗ A3 failed', 'error');
      results.failed.push('A3');
    }
    
    // A4: clear empties cache
    addLog('TEST', 'A4: clear empties cache', 'info');
    setCacheValue('a', '1');
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    const valA4a = getCacheValue('a');
    const valA4b = getCacheValue('b');
    if (valA4a === null && valA4b === null) {
      addLog('TEST', '✓ A4 passed', 'success');
      results.passed.push('A4');
    } else {
      addLog('TEST', '✗ A4 failed', 'error');
      results.failed.push('A4');
    }
    
    // A5: size reflects entries
    addLog('TEST', 'A5: size reflects entries', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1');
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    if (cacheRef.current.size === 2) {
      addLog('TEST', '✓ A5 passed (size=2)', 'success');
      results.passed.push('A5');
    } else {
      addLog('TEST', `✗ A5 failed (size=${cacheRef.current.size})`, 'error');
      results.failed.push('A5');
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // Group B: TTL
    addLog('TEST', '--- Group B: TTL ---', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    
    // B1: TTL not expired yet
    addLog('TEST', 'B1: TTL not expired yet', 'info');
    setCacheValue('a', '1', 3000);
    await new Promise(r => setTimeout(r, 1000));
    const valB1 = getCacheValue('a');
    if (valB1 === '1') {
      addLog('TEST', '✓ B1 passed', 'success');
      results.passed.push('B1');
    } else {
      addLog('TEST', '✗ B1 failed', 'error');
      results.failed.push('B1');
    }
    
    // B2: TTL expired
    addLog('TEST', 'B2: TTL expired (wait 3s)', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1', 2000);
    addLog('TEST', 'Waiting for expiration...', 'info');
    await new Promise(r => setTimeout(r, 2500));
    const valB2 = getCacheValue('a');
    if (valB2 === null) {
      addLog('TEST', '✓ B2 passed', 'success');
      results.passed.push('B2');
    } else {
      addLog('TEST', '✗ B2 failed', 'error');
      results.failed.push('B2');
    }
    
    // B3: expired entry removed on get
    addLog('TEST', 'B3: expired entry removed on get', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1', 1000);
    await new Promise(r => setTimeout(r, 1500));
    getCacheValue('a');
    await new Promise(r => setTimeout(r, 50));
    if (cacheRef.current.size === 0) {
      addLog('TEST', '✓ B3 passed (size=0)', 'success');
      results.passed.push('B3');
    } else {
      addLog('TEST', `✗ B3 failed (size=${cacheRef.current.size})`, 'error');
      results.failed.push('B3');
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // Group C: LRU
    addLog('TEST', '--- Group C: LRU ---', 'info');
    
    // C1: no eviction when under capacity
    addLog('TEST', 'C1: no eviction under capacity', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1');
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    if (cacheRef.current.size === 2) {
      addLog('TEST', '✓ C1 passed', 'success');
      results.passed.push('C1');
    } else {
      addLog('TEST', '✗ C1 failed', 'error');
      results.failed.push('C1');
    }
    
    // C2: evict LRU on overflow
    addLog('TEST', 'C2: evict LRU on overflow', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('c', '3');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('d', '4');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('e', '5');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('f', '6');
    await new Promise(r => setTimeout(r, 50));
    const hasA = cacheRef.current.has('a');
    if (!hasA && cacheRef.current.size === 5) {
      addLog('TEST', '✓ C2 passed (a evicted)', 'success');
      results.passed.push('C2');
    } else {
      addLog('TEST', '✗ C2 failed', 'error');
      results.failed.push('C2');
    }
    
    // C3: get refreshes recency
    addLog('TEST', 'C3: get refreshes recency', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('c', '3');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('d', '4');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('e', '5');
    await new Promise(r => setTimeout(r, 50));
    getCacheValue('a'); // refresh a
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('f', '6');
    await new Promise(r => setTimeout(r, 50));
    const hasAC3 = cacheRef.current.has('a');
    const hasBC3 = cacheRef.current.has('b');
    if (hasAC3 && !hasBC3) {
      addLog('TEST', '✓ C3 passed (b evicted, a kept)', 'success');
      results.passed.push('C3');
    } else {
      addLog('TEST', '✗ C3 failed', 'error');
      results.failed.push('C3');
    }
    
    // C4: set refreshes recency
    addLog('TEST', 'C4: set refreshes recency', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('b', '2');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('c', '3');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('d', '4');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('e', '5');
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('a', '1-updated'); // refresh a
    await new Promise(r => setTimeout(r, 50));
    setCacheValue('f', '6');
    await new Promise(r => setTimeout(r, 50));
    const hasAC4 = cacheRef.current.has('a');
    const hasBC4 = cacheRef.current.has('b');
    if (hasAC4 && !hasBC4) {
      addLog('TEST', '✓ C4 passed (b evicted, a kept)', 'success');
      results.passed.push('C4');
    } else {
      addLog('TEST', '✗ C4 failed', 'error');
      results.failed.push('C4');
    }
    
    // C6: eviction removes exactly one entry
    addLog('TEST', 'C6: eviction removes exactly one', 'info');
    clearCache();
    await new Promise(r => setTimeout(r, 50));
    for (let i = 0; i < 5; i++) {
      setCacheValue(`key${i}`, `val${i}`);
      await new Promise(r => setTimeout(r, 30));
    }
    setCacheValue('overflow', 'test');
    await new Promise(r => setTimeout(r, 50));
    if (cacheRef.current.size === 5) {
      addLog('TEST', '✓ C6 passed (size=maxSize)', 'success');
      results.passed.push('C6');
    } else {
      addLog('TEST', `✗ C6 failed (size=${cacheRef.current.size})`, 'error');
      results.failed.push('C6');
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    // Final summary
    addLog('TEST', '=== Test Summary ===', 'info');
    addLog('TEST', `Total: ${results.passed.length + results.failed.length} tests`, 'info');
    addLog('TEST', `Passed: ${results.passed.length}`, 'success');
    addLog('TEST', `Failed: ${results.failed.length}`, results.failed.length > 0 ? 'error' : 'success');
    
    if (results.failed.length > 0) {
      addLog('TEST', `Failed tests: ${results.failed.join(', ')}`, 'error');
    }
    
    addLog('TEST', 'Note: Persistence tests (Group D) require localStorage which is not available in artifacts', 'warning');
    
    setTestResults(results);
    setTestRunning(false);
  };

  const currentEntries = Array.from(cache.entries()).map(([k, entry]) => {
    const isExpired = entry.expiry && Date.now() > entry.expiry;
    const timeLeft = entry.expiry ? Math.max(0, entry.expiry - Date.now()) : null;
    return { key: k, ...entry, isExpired, timeLeft };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Settings className="w-7 h-7" />
              Cache System with LRU & TTL
            </h1>
            <p className="mt-1 text-blue-100">In-memory cache with eviction policies and expiration</p>
          </div>

          <div className="p-4 grid grid-cols-4 gap-4">
            {/* Action Log - Left Side */}
            <div className="col-span-1 bg-gray-900 text-white rounded-lg p-4 flex flex-col">
              <h2 className="text-lg font-semibold mb-3">Action Log</h2>
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {logs.length === 0 ? (
                  <p className="text-gray-400 italic">No actions yet</p>
                ) : (
                  <>
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded ${
                          log.type === 'success'
                            ? 'bg-green-900/50'
                            : log.type === 'error'
                            ? 'bg-red-900/50'
                            : log.type === 'warning'
                            ? 'bg-yellow-900/50'
                            : 'bg-gray-800'
                        }`}
                      >
                        <div className="text-gray-400">[{log.timestamp}]</div>
                        <div>
                          <span className="font-semibold">{log.action}:</span>
                          <span className="ml-1">{log.details}</span>
                        </div>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Right Side Content */}
            <div className="col-span-3 space-y-4">
              {/* Top Row - Operations */}
              <div className="grid grid-cols-4 gap-4">
                {/* Configuration */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Config
                  </h2>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Size</label>
                    <input
                      type="number"
                      value={maxSize}
                      onChange={(e) => setMaxSize(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                    />
                  </div>
                </div>

                {/* Set Operation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3">Set Value</h2>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Key"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="TTL (ms)"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={handleSet}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* Get/Delete Operations */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3">Get/Delete</h2>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Key"
                      value={getKey}
                      onChange={(e) => setGetKey(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleGet}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        Get
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    {getResult && (
                      <div className="p-2 bg-white border rounded-lg">
                        <span className="font-mono text-xs break-all">{getResult}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Testing Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Testing
                  </h2>
                  <div className="space-y-2">
                    <button
                      onClick={runTests}
                      disabled={testRunning}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 text-sm"
                    >
                      {testRunning ? 'Running...' : 'Run Tests'}
                    </button>
                    <button
                      onClick={clearCache}
                      className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <Info className="w-3 h-3 inline mr-1" />
                      TTL test: 2s wait
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Cache Entries */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">
                  Current Cache ({currentEntries.length}/{maxSize})
                </h2>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {currentEntries.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">Cache is empty</p>
                  ) : (
                    currentEntries.map(({ key, value, expiry, isExpired, timeLeft }) => (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border ${
                          isExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="font-semibold">{key}</span>
                            <span className="mx-2">=</span>
                            <span className="font-mono text-sm">"{value}"</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {timeLeft !== null && (
                              <span className={isExpired ? 'text-red-600' : ''}>
                                {isExpired ? 'Expired' : `${Math.ceil(timeLeft / 1000)}s left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheSystem;