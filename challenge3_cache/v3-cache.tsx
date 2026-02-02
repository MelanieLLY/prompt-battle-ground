import React, { useState, useEffect, useCallback } from 'react';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTLms: number;
  storageKey: string;
}

type LogEntry = {
  timestamp: number;
  type: 'hit' | 'miss' | 'expired' | 'evicted' | 'saved' | 'loaded' | 'parse-error' | 'set' | 'delete' | 'clear';
  message: string;
};

class TTLLRUCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private onLog: (entry: LogEntry) => void;

  constructor(config: CacheConfig, onLog: (entry: LogEntry) => void) {
    this.cache = new Map();
    this.config = config;
    this.onLog = onLog;
    this.loadFromStorage();
  }

  private log(type: LogEntry['type'], message: string): void {
    this.onLog({ timestamp: Date.now(), type, message });
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        toDelete.push(key);
      }
    }
    
    for (const key of toDelete) {
      this.cache.delete(key);
      this.log('expired', `Key "${key}" expired and removed`);
    }
  }

  get(key: string): string | undefined {
    this.cleanupExpired();
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.log('miss', `Cache miss for key "${key}"`);
      return undefined;
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      this.log('expired', `Key "${key}" expired on access`);
      return undefined;
    }

    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.log('hit', `Cache hit for key "${key}"`);
    return entry.value;
  }

  set(key: string, value: string, ttlMs?: number): void {
    this.cleanupExpired();

    const ttl = ttlMs ?? this.config.defaultTTLms;
    const expiresAt = Date.now() + ttl;

    // Remove if exists (to reinsert at end)
    this.cache.delete(key);

    // Evict LRU if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
      this.log('evicted', `Evicted LRU key "${lruKey}" to make room`);
    }

    this.cache.set(key, { value, expiresAt });
    this.log('set', `Set key "${key}" with TTL ${ttl}ms`);
    this.saveToStorage();
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.log('delete', `Deleted key "${key}"`);
      this.saveToStorage();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.log('clear', 'Cache cleared');
    this.saveToStorage();
  }

  getEntries(): Array<[string, CacheEntry]> {
    this.cleanupExpired();
    return Array.from(this.cache.entries()).reverse(); // MRU first
  }

  getSize(): number {
    this.cleanupExpired();
    return this.cache.size;
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys()).reverse(); // MRU first
  }

  has(key: string): boolean {
    this.cleanupExpired();
    return this.cache.has(key);
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      const json = JSON.stringify(data);
      localStorage.setItem(this.config.storageKey, json);
      this.log('saved', `Persisted ${data.length} entries to localStorage`);
    } catch (error) {
      this.log('parse-error', `Failed to save: ${error}`);
    }
  }

  private loadFromStorage(): void {
    try {
      const json = localStorage.getItem(this.config.storageKey);
      if (!json) return;

      const data = JSON.parse(json) as Array<[string, CacheEntry]>;
      const now = Date.now();
      let loaded = 0;
      let expired = 0;

      for (const [key, entry] of data) {
        if (now < entry.expiresAt) {
          this.cache.set(key, entry);
          loaded++;
        } else {
          expired++;
        }
      }

      this.log('loaded', `Loaded ${loaded} entries from localStorage (${expired} expired)`);
    } catch (error) {
      this.log('parse-error', `Failed to parse localStorage: ${error}`);
    }
  }
}

interface TestResult {
  id: string;
  name: string;
  expected: string;
  observed: string;
  passed: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CacheDemo: React.FC = () => {
  const [maxSize, setMaxSize] = useState(5);
  const [defaultTTL, setDefaultTTL] = useState(5000);
  const [storageKey, setStorageKey] = useState('ttl-lru-cache');
  
  const [config, setConfig] = useState<CacheConfig>({
    maxSize: 5,
    defaultTTLms: 5000,
    storageKey: 'ttl-lru-cache'
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cache, setCache] = useState<TTLLRUCache | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    const newCache = new TTLLRUCache(config, addLog);
    setCache(newCache);
  }, [config, addLog]);

  const handleApplyConfig = () => {
    setConfig({
      maxSize,
      defaultTTLms: defaultTTL,
      storageKey
    });
  };

  // Periodic refresh for time-based updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick(prev => prev + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const [inputKey, setInputKey] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [inputTTL, setInputTTL] = useState('');

  const handleSet = () => {
    if (!cache || !inputKey) return;
    const ttl = inputTTL ? parseInt(inputTTL, 10) : undefined;
    cache.set(inputKey, inputValue, ttl);
    setInputKey('');
    setInputValue('');
    setInputTTL('');
    setRefreshTick(prev => prev + 1);
  };

  const handleGet = (key: string) => {
    if (!cache) return;
    cache.get(key);
    setRefreshTick(prev => prev + 1);
  };

  const handleDelete = (key: string) => {
    if (!cache) return;
    cache.delete(key);
    setRefreshTick(prev => prev + 1);
  };

  const handleClear = () => {
    if (!cache) return;
    cache.clear();
    setRefreshTick(prev => prev + 1);
  };

  const runAllTests = async () => {
    if (!cache) return;
    setIsRunningTests(true);
    setTestResults([]);
    setTestSummary(null);

    const addResult = (result: TestResult) => {
      setTestResults(prev => [...prev, result]);
    };

    // Group A: Basic Operations
    
    // A1: set + get basic
    cache.clear();
    cache.set('a', '1');
    const a1Result = cache.get('a');
    addResult({
      id: 'A1',
      name: 'set + get basic',
      expected: '"1"',
      observed: a1Result === '1' ? '"1"' : String(a1Result),
      passed: a1Result === '1'
    });

    // A2: overwrite existing key
    cache.clear();
    cache.set('a', '1');
    cache.set('a', '2');
    const a2Result = cache.get('a');
    addResult({
      id: 'A2',
      name: 'overwrite existing key',
      expected: '"2"',
      observed: a2Result === '2' ? '"2"' : String(a2Result),
      passed: a2Result === '2'
    });

    // A3: delete removes key
    cache.clear();
    cache.set('a', '1');
    cache.delete('a');
    const a3Result = cache.get('a');
    addResult({
      id: 'A3',
      name: 'delete removes key',
      expected: 'undefined',
      observed: String(a3Result),
      passed: a3Result === undefined
    });

    // A4: clear empties cache
    cache.clear();
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    const a4ResultA = cache.get('a');
    const a4ResultB = cache.get('b');
    addResult({
      id: 'A4',
      name: 'clear empties cache',
      expected: 'both undefined',
      observed: `a=${a4ResultA}, b=${a4ResultB}`,
      passed: a4ResultA === undefined && a4ResultB === undefined
    });

    // A5: size reflects entries
    cache.clear();
    cache.set('a', '1');
    cache.set('b', '2');
    const a5Size = cache.getSize();
    addResult({
      id: 'A5',
      name: 'size reflects entries',
      expected: '2',
      observed: String(a5Size),
      passed: a5Size === 2
    });

    // Group B: TTL

    // B1: TTL not expired yet
    cache.clear();
    cache.set('a', '1', 3000);
    await sleep(1500);
    const b1Result = cache.get('a');
    addResult({
      id: 'B1',
      name: 'TTL not expired yet',
      expected: '"1"',
      observed: b1Result === '1' ? '"1"' : String(b1Result),
      passed: b1Result === '1'
    });

    // B2: TTL expired
    cache.clear();
    cache.set('a', '1', 1500);
    await sleep(2000);
    const b2Result = cache.get('a');
    addResult({
      id: 'B2',
      name: 'TTL expired',
      expected: 'undefined',
      observed: String(b2Result),
      passed: b2Result === undefined
    });

    // B3: expired entry removed on get
    cache.clear();
    cache.set('a', '1', 1500);
    await sleep(2000);
    cache.get('a');
    const b3Size = cache.getSize();
    addResult({
      id: 'B3',
      name: 'expired entry removed on get',
      expected: 'size=0',
      observed: `size=${b3Size}`,
      passed: b3Size === 0
    });

    // B4: expired entry removed on set cleanup
    cache.clear();
    cache.set('a', '1', 1500);
    await sleep(2000);
    cache.set('b', '2');
    const b4HasA = cache.has('a');
    addResult({
      id: 'B4',
      name: 'expired entry removed on set cleanup',
      expected: 'a not in cache',
      observed: b4HasA ? 'a found' : 'a not found',
      passed: !b4HasA
    });

    // B5: defaultTTL used when ttlMs not provided
    const testConfig = {
      maxSize: 5,
      defaultTTLms: 1500,
      storageKey: 'ttl-test-b5'
    };
    const b5Cache = new TTLLRUCache(testConfig, addLog);
    b5Cache.set('a', '1');
    await sleep(2000);
    const b5Result = b5Cache.get('a');
    addResult({
      id: 'B5',
      name: 'defaultTTL used when ttlMs not provided',
      expected: 'undefined',
      observed: String(b5Result),
      passed: b5Result === undefined
    });

    // B6: custom ttl overrides defaultTTL
    const b6Config = {
      maxSize: 5,
      defaultTTLms: 10000,
      storageKey: 'ttl-test-b6'
    };
    const b6Cache = new TTLLRUCache(b6Config, addLog);
    b6Cache.set('a', '1', 1500);
    await sleep(2000);
    const b6Result = b6Cache.get('a');
    addResult({
      id: 'B6',
      name: 'custom ttl overrides defaultTTL',
      expected: 'undefined',
      observed: String(b6Result),
      passed: b6Result === undefined
    });

    // Group C: LRU

    // C1: no eviction when under capacity
    const c1Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c1' };
    const c1Cache = new TTLLRUCache(c1Config, addLog);
    c1Cache.set('a', '1');
    c1Cache.set('b', '2');
    const c1Size = c1Cache.getSize();
    addResult({
      id: 'C1',
      name: 'no eviction when under capacity',
      expected: 'size=2',
      observed: `size=${c1Size}`,
      passed: c1Size === 2
    });

    // C2: evict LRU on overflow
    const c2Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c2' };
    const c2Cache = new TTLLRUCache(c2Config, addLog);
    c2Cache.set('a', '1');
    c2Cache.set('b', '2');
    c2Cache.set('c', '3');
    c2Cache.set('d', '4');
    const c2HasA = c2Cache.has('a');
    addResult({
      id: 'C2',
      name: 'evict LRU on overflow',
      expected: 'a not in cache',
      observed: c2HasA ? 'a found' : 'a not found',
      passed: !c2HasA
    });

    // C3: get refreshes recency
    const c3Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c3' };
    const c3Cache = new TTLLRUCache(c3Config, addLog);
    c3Cache.set('a', '1');
    c3Cache.set('b', '2');
    c3Cache.set('c', '3');
    c3Cache.get('a');
    c3Cache.set('d', '4');
    const c3HasA = c3Cache.has('a');
    const c3HasB = c3Cache.has('b');
    addResult({
      id: 'C3',
      name: 'get refreshes recency',
      expected: 'b evicted, a retained',
      observed: `a=${c3HasA ? 'found' : 'not found'}, b=${c3HasB ? 'found' : 'not found'}`,
      passed: c3HasA && !c3HasB
    });

    // C4: set refreshes recency
    const c4Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c4' };
    const c4Cache = new TTLLRUCache(c4Config, addLog);
    c4Cache.set('a', '1');
    c4Cache.set('b', '2');
    c4Cache.set('c', '3');
    c4Cache.set('a', '1-updated');
    c4Cache.set('d', '4');
    const c4HasA = c4Cache.has('a');
    const c4HasB = c4Cache.has('b');
    addResult({
      id: 'C4',
      name: 'set refreshes recency',
      expected: 'b evicted, a retained',
      observed: `a=${c4HasA ? 'found' : 'not found'}, b=${c4HasB ? 'found' : 'not found'}`,
      passed: c4HasA && !c4HasB
    });

    // C5: LRU order visible
    const c5Config = { maxSize: 5, defaultTTLms: 10000, storageKey: 'lru-test-c5' };
    const c5Cache = new TTLLRUCache(c5Config, addLog);
    c5Cache.set('a', '1');
    c5Cache.set('b', '2');
    c5Cache.get('a');
    const c5Keys = c5Cache.getKeys();
    addResult({
      id: 'C5',
      name: 'LRU order visible (MRU→LRU)',
      expected: 'a, b',
      observed: c5Keys.join(', '),
      passed: c5Keys[0] === 'a' && c5Keys[1] === 'b'
    });

    // C6: eviction removes exactly one entry
    const c6Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c6' };
    const c6Cache = new TTLLRUCache(c6Config, addLog);
    c6Cache.set('a', '1');
    c6Cache.set('b', '2');
    c6Cache.set('c', '3');
    c6Cache.set('d', '4');
    const c6Size = c6Cache.getSize();
    addResult({
      id: 'C6',
      name: 'eviction removes exactly one entry',
      expected: 'size=3',
      observed: `size=${c6Size}`,
      passed: c6Size === 3
    });

    // C7: LRU respects get on expired key
    const c7Config = { maxSize: 3, defaultTTLms: 10000, storageKey: 'lru-test-c7' };
    const c7Cache = new TTLLRUCache(c7Config, addLog);
    c7Cache.set('a', '1', 1500);
    await sleep(2000);
    c7Cache.get('a');
    c7Cache.set('b', '2');
    c7Cache.set('c', '3');
    c7Cache.set('d', '4');
    const c7Size = c7Cache.getSize();
    addResult({
      id: 'C7',
      name: 'LRU respects get on expired key',
      expected: 'size=3 (a not counted)',
      observed: `size=${c7Size}`,
      passed: c7Size === 3
    });

    // Group D: Persistence

    // D1: persist after set
    const d1Config = { maxSize: 5, defaultTTLms: 10000, storageKey: 'persist-test-d1' };
    localStorage.removeItem(d1Config.storageKey);
    const d1Cache = new TTLLRUCache(d1Config, addLog);
    d1Cache.set('a', '1');
    const d1Storage = localStorage.getItem(d1Config.storageKey);
    addResult({
      id: 'D1',
      name: 'persist after set',
      expected: 'localStorage contains data',
      observed: d1Storage ? 'data found' : 'no data',
      passed: d1Storage !== null
    });

    // D2: load restores non-expired entries
    const d2Config = { maxSize: 5, defaultTTLms: 10000, storageKey: 'persist-test-d2' };
    localStorage.removeItem(d2Config.storageKey);
    const d2Cache1 = new TTLLRUCache(d2Config, addLog);
    d2Cache1.set('a', '1');
    d2Cache1.set('b', '2');
    const d2Cache2 = new TTLLRUCache(d2Config, addLog);
    const d2ResultA = d2Cache2.get('a');
    const d2ResultB = d2Cache2.get('b');
    addResult({
      id: 'D2',
      name: 'load restores non-expired entries',
      expected: 'both values restored',
      observed: `a=${d2ResultA}, b=${d2ResultB}`,
      passed: d2ResultA === '1' && d2ResultB === '2'
    });

    // D3: expired entries not restored
    const d3Config = { maxSize: 5, defaultTTLms: 10000, storageKey: 'persist-test-d3' };
    localStorage.removeItem(d3Config.storageKey);
    const d3Cache1 = new TTLLRUCache(d3Config, addLog);
    d3Cache1.set('a', '1', 1500);
    await sleep(2000);
    const d3Cache2 = new TTLLRUCache(d3Config, addLog);
    const d3Result = d3Cache2.get('a');
    addResult({
      id: 'D3',
      name: 'expired entries not restored',
      expected: 'undefined',
      observed: String(d3Result),
      passed: d3Result === undefined
    });

    // D4: corrupted storage handled safely
    const d4Config = { maxSize: 5, defaultTTLms: 10000, storageKey: 'persist-test-d4' };
    localStorage.setItem(d4Config.storageKey, '{invalid json}');
    let d4Crashed = false;
    try {
      const d4Cache = new TTLLRUCache(d4Config, addLog);
      const d4Size = d4Cache.getSize();
      d4Crashed = false;
      addResult({
        id: 'D4',
        name: 'corrupted storage handled safely',
        expected: 'no crash, empty cache',
        observed: `no crash, size=${d4Size}`,
        passed: d4Size === 0
      });
    } catch {
      d4Crashed = true;
      addResult({
        id: 'D4',
        name: 'corrupted storage handled safely',
        expected: 'no crash',
        observed: 'crashed',
        passed: false
      });
    }

    // Calculate final summary
    setTestResults(prev => {
      const passed = prev.filter(r => r.passed).length;
      const failed = prev.filter(r => !r.passed).length;
      setTestSummary({ total: prev.length, passed, failed });
      return prev;
    });
    setIsRunningTests(false);
  };

  const entries = cache?.getEntries() ?? [];
  const currentTime = Date.now();

  return (
    <div className="flex h-screen bg-gray-50 text-sm">
      {/* Left Panel: Testing & Logs */}
      <div className="w-1/2 p-4 flex flex-col gap-4 border-r border-gray-300 overflow-hidden">
        <div className="bg-white rounded shadow p-3">
          <h3 className="font-bold mb-2">Testing</h3>
          <button
            onClick={runAllTests}
            disabled={isRunningTests}
            className={`px-4 py-2 rounded text-white ${
              isRunningTests ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          {testSummary && (
            <div className="mt-3 p-2 bg-gray-100 rounded">
              <div className="font-bold">Summary</div>
              <div className="text-xs space-y-1">
                <div>Total: {testSummary.total}</div>
                <div className="text-green-600">Passed: {testSummary.passed}</div>
                <div className="text-red-600">Failed: {testSummary.failed}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 bg-white rounded shadow p-3 overflow-auto min-h-0">
          <h3 className="font-bold mb-2">Test Results</h3>
          {testResults.length === 0 ? (
            <p className="text-gray-400 text-xs">No tests run yet</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-2 rounded border text-xs ${
                    result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold">{result.id}: {result.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        result.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {result.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <div>Expected: {result.expected}</div>
                    <div>Observed: {result.observed}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded shadow p-3 overflow-auto" style={{ maxHeight: '200px' }}>
          <h3 className="font-bold mb-2">Action Log</h3>
          <div className="space-y-1 font-mono text-xs">
            {logs.slice(-30).map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}.{(log.timestamp % 1000).toString().padStart(3, '0')}
                </span>
                <span className={`font-semibold ${
                  log.type === 'hit' ? 'text-green-600' :
                  log.type === 'miss' ? 'text-yellow-600' :
                  log.type === 'expired' ? 'text-orange-600' :
                  log.type === 'evicted' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-gray-700 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Controls & Cache */}
      <div className="w-1/2 p-4 flex flex-col gap-4 overflow-auto">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Cache Configuration</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Size</label>
              <input
                type="number"
                min="1"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Default TTL (ms)</label>
              <input
                type="number"
                min="100"
                value={defaultTTL}
                onChange={(e) => setDefaultTTL(parseInt(e.target.value, 10) || 1000)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Storage Key</label>
              <input
                type="text"
                value={storageKey}
                onChange={(e) => setStorageKey(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <button
              onClick={handleApplyConfig}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Apply Configuration
            </button>
            <p className="text-xs text-gray-500 italic">Note: Applying new config will create a new cache instance</p>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Cache Controls</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Key"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              type="text"
              placeholder="Value"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              type="number"
              placeholder={`TTL (ms, default: ${config.defaultTTLms})`}
              value={inputTTL}
              onChange={(e) => setInputTTL(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSet}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Set
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Cache Contents (MRU → LRU)</h3>
          {entries.length === 0 ? (
            <p className="text-gray-400 italic">Cache is empty</p>
          ) : (
            <div className="space-y-2">
              {entries.map(([key, entry]) => {
                const timeLeft = entry.expiresAt - currentTime;
                const isExpired = timeLeft <= 0;
                return (
                  <div key={key} className="border rounded p-2 bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-bold">{key}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleGet(key)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Get
                        </button>
                        <button
                          onClick={() => handleDelete(key)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-700 mb-1">{entry.value}</div>
                    <div className={`text-xs ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                      {isExpired ? '⚠️ EXPIRED' : `Expires in ${Math.ceil(timeLeft / 1000)}s`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Debug Panel</h3>
          <div className="space-y-1 text-xs font-mono">
            <div><strong>Current Time:</strong> {new Date(currentTime).toLocaleTimeString()}.{(currentTime % 1000).toString().padStart(3, '0')}</div>
            <div><strong>Max Size:</strong> {config.maxSize}</div>
            <div><strong>Default TTL:</strong> {config.defaultTTLms}ms</div>
            <div><strong>Storage Key:</strong> {config.storageKey}</div>
            <div><strong>Cache Size:</strong> {cache?.getSize() ?? 0}</div>
            <div><strong>Keys (MRU→LRU):</strong> {cache?.getKeys().join(', ') || 'none'}</div>
            <div><strong>Last Action:</strong> {logs.length > 0 ? `${logs[logs.length - 1].type} - ${logs[logs.length - 1].message}` : 'none'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheDemo;