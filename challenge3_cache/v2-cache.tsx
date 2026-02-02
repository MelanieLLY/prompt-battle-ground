import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Play, Settings } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface CacheEntry {
  value: string;
  expiresAt: number;
  lastAccessAt: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTLms: number;
  storageKey: string;
}

type LogEvent = {
  timestamp: number;
  type: 'hit' | 'miss' | 'expired' | 'evicted' | 'saved' | 'loaded' | 'parse-error' | 'set';
  message: string;
};

type TestResult = {
  group: string;
  name: string;
  passed: boolean;
  error?: string;
};

type TestProgress = {
  running: boolean;
  current: string;
  results: TestResult[];
};

// ============================================================================
// Cache Implementation
// ============================================================================

class TTLCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private logCallback: (event: LogEvent) => void;

  constructor(config: CacheConfig, logCallback: (event: LogEvent) => void) {
    this.cache = new Map();
    this.config = config;
    this.logCallback = logCallback;
    this.loadFromStorage();
  }

  private log(type: LogEvent['type'], message: string): void {
    this.logCallback({ timestamp: Date.now(), type, message });
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => {
      this.cache.delete(key);
      this.log('expired', `Cleaned up expired key: ${key}`);
    });
  }

  set(key: string, value: string, ttlMs?: number): void {
    // First, cleanup expired entries
    this.cleanupExpired();

    const now = Date.now();
    const ttl = ttlMs ?? this.config.defaultTTLms;
    
    // Check if we need to evict (new key AND at capacity)
    if (!this.cache.has(key) && this.cache.size >= this.config.maxSize) {
      // Find LRU entry (oldest lastAccessAt)
      let lruKey: string | null = null;
      let oldestAccess = Infinity;
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.lastAccessAt < oldestAccess) {
          oldestAccess = entry.lastAccessAt;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
        this.log('evicted', `Evicted LRU key: ${lruKey}`);
      }
    }
    
    // Set the entry (or update if exists)
    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      lastAccessAt: now
    });
    
    this.log('set', `Set key: ${key}, TTL: ${ttl}ms`);
    this.saveToStorage();
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.log('miss', `Cache miss for key: ${key}`);
      return undefined;
    }
    
    const now = Date.now();
    
    // Check if expired
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      this.log('expired', `Key expired and removed: ${key}`);
      this.saveToStorage();
      return undefined;
    }
    
    // Update last access time (LRU tracking)
    entry.lastAccessAt = now;
    this.log('hit', `Cache hit for key: ${key}`);
    return entry.value;
  }

  delete(key: string): void {
    if (this.cache.delete(key)) {
      this.log('set', `Deleted key: ${key}`);
      this.saveToStorage();
    }
  }

  clear(): void {
    this.cache.clear();
    this.log('set', 'Cache cleared');
    this.saveToStorage();
  }

  getAll(): Array<[string, CacheEntry]> {
    // Return sorted by lastAccessAt (MRU first)
    return Array.from(this.cache.entries()).sort((a, b) => 
      b[1].lastAccessAt - a[1].lastAccessAt
    );
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.entries());
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.config.storageKey, serialized);
      this.log('saved', `Persisted ${data.length} entries to localStorage`);
    } catch (error) {
      this.log('parse-error', `Failed to save: ${error}`);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        this.log('loaded', 'No stored data found, starting fresh');
        return;
      }

      const data = JSON.parse(stored) as Array<[string, CacheEntry]>;
      const now = Date.now();
      let loadedCount = 0;
      let expiredCount = 0;

      for (const [key, entry] of data) {
        // Skip expired entries
        if (now >= entry.expiresAt) {
          expiredCount++;
          continue;
        }
        this.cache.set(key, entry);
        loadedCount++;
      }

      this.log('loaded', `Loaded ${loadedCount} entries from localStorage (${expiredCount} expired entries discarded)`);
    } catch (error) {
      this.log('parse-error', `Failed to load from storage (${error}), starting fresh`);
      this.cache.clear();
    }
  }

  updateConfig(config: CacheConfig): void {
    this.config = config;
  }
}

// ============================================================================
// React Component
// ============================================================================

export default function CacheDemo() {
  const [config, setConfig] = useState<CacheConfig>({
    maxSize: 5,
    defaultTTLms: 10000,
    storageKey: 'ttl-cache-demo'
  });

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [cache, setCache] = useState<TTLCache | null>(null);
  const [, setTrigger] = useState(0); // Force re-render
  
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newTTL, setNewTTL] = useState('');
  const [getKey, setGetKey] = useState('');
  
  const [showConfig, setShowConfig] = useState(false);
  const [testProgress, setTestProgress] = useState<TestProgress>({
    running: false,
    current: '',
    results: []
  });

  const addLog = useCallback((event: LogEvent) => {
    setLogs(prev => [event, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  const forceUpdate = useCallback(() => setTrigger(t => t + 1), []);

  // Initialize cache
  useEffect(() => {
    const c = new TTLCache(config, addLog);
    setCache(c);
  }, [config, addLog]);

  const handleSet = () => {
    if (!cache || !newKey) return;
    const ttl = newTTL ? parseInt(newTTL) : undefined;
    cache.set(newKey, newValue || 'empty', ttl);
    setNewKey('');
    setNewValue('');
    setNewTTL('');
    forceUpdate();
  };

  const handleGet = () => {
    if (!cache || !getKey) return;
    const value = cache.get(getKey);
    if (value !== undefined) {
      alert(`Value: ${value}`);
    }
    setGetKey('');
    forceUpdate();
  };

  const handleDelete = (key: string) => {
    if (!cache) return;
    cache.delete(key);
    forceUpdate();
  };

  const handleClear = () => {
    if (!cache) return;
    cache.clear();
    forceUpdate();
  };

  const runLRUScenario = () => {
    if (!cache) return;
    cache.clear();
    setLogs([]);
    
    // Set maxSize to 3 for demo
    const newConfig = { ...config, maxSize: 3 };
    setConfig(newConfig);
    cache.updateConfig(newConfig);
    
    setTimeout(() => {
      cache.set('A', 'Apple', 60000);
      forceUpdate();
      setTimeout(() => {
        cache.set('B', 'Banana', 60000);
        forceUpdate();
        setTimeout(() => {
          cache.set('C', 'Cherry', 60000);
          forceUpdate();
          setTimeout(() => {
            // This should evict 'A' (LRU)
            cache.set('D', 'Date', 60000);
            forceUpdate();
            setTimeout(() => {
              // Access B to make it MRU
              cache.get('B');
              forceUpdate();
              setTimeout(() => {
                // This should evict 'C' (now LRU)
                cache.set('E', 'Elderberry', 60000);
                forceUpdate();
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 100);
  };

  // ============================================================================
  // Test Suite
  // ============================================================================
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const runTests = async () => {
    if (!cache) return;
    
    setTestProgress({ running: true, current: 'Starting tests...', results: [] });
    const results: TestResult[] = [];
    
    const addResult = (group: string, name: string, passed: boolean, error?: string) => {
      const result = { group, name, passed, error };
      results.push(result);
      setTestProgress(prev => ({ ...prev, results: [...results] }));
      
      if (!passed) {
        console.error(`❌ ${group} - ${name}: ${error}`);
      } else {
        console.log(`✅ ${group} - ${name}`);
      }
    };
    
    try {
      // Test Group A: Basic Operations
      setTestProgress(prev => ({ ...prev, current: 'Group A: Basic Operations' }));
      
      // A1: set + get basic
      cache.clear();
      cache.set('a', '1');
      const a1Result = cache.get('a');
      addResult('A', 'A1: set + get basic', a1Result === '1', 
        a1Result !== '1' ? `Expected "1", got "${a1Result}"` : undefined);
      
      // A2: overwrite existing key
      cache.clear();
      cache.set('a', '1');
      cache.set('a', '2');
      const a2Result = cache.get('a');
      addResult('A', 'A2: overwrite existing key', a2Result === '2',
        a2Result !== '2' ? `Expected "2", got "${a2Result}"` : undefined);
      
      // A3: delete removes key
      cache.clear();
      cache.set('a', '1');
      cache.delete('a');
      const a3Result = cache.get('a');
      addResult('A', 'A3: delete removes key', a3Result === undefined,
        a3Result !== undefined ? `Expected undefined, got "${a3Result}"` : undefined);
      
      // A4: clear empties cache
      cache.clear();
      cache.set('a', '1');
      cache.set('b', '2');
      cache.clear();
      const a4ResultA = cache.get('a');
      const a4ResultB = cache.get('b');
      addResult('A', 'A4: clear empties cache', 
        a4ResultA === undefined && a4ResultB === undefined,
        (a4ResultA !== undefined || a4ResultB !== undefined) 
          ? `Expected both undefined, got a="${a4ResultA}", b="${a4ResultB}"` 
          : undefined);
      
      // A5: size reflects entries
      cache.clear();
      cache.set('a', '1');
      cache.set('b', '2');
      const a5Size = cache.size();
      addResult('A', 'A5: size reflects entries', a5Size === 2,
        a5Size !== 2 ? `Expected size 2, got ${a5Size}` : undefined);
      
      await sleep(100);
      
      // Test Group B: TTL
      setTestProgress(prev => ({ ...prev, current: 'Group B: TTL (includes 1s wait)' }));
      
      // B1: TTL not expired yet
      cache.clear();
      cache.set('a', '1', 5000);
      await sleep(1000); // Wait 1 second (less than 5s TTL)
      const b1Result = cache.get('a');
      addResult('B', 'B1: TTL not expired yet', b1Result === '1',
        b1Result !== '1' ? `Expected "1", got "${b1Result}"` : undefined);
      
      // B2: TTL expired
      cache.clear();
      cache.set('a', '1', 1000);
      await sleep(1500); // Wait 1.5 seconds (more than 1s TTL)
      const b2Result = cache.get('a');
      addResult('B', 'B2: TTL expired', b2Result === undefined,
        b2Result !== undefined ? `Expected undefined, got "${b2Result}"` : undefined);
      
      // B3: expired entry removed on get
      cache.clear();
      cache.set('a', '1', 1000);
      await sleep(1500);
      cache.get('a'); // Should remove it
      const b3Size = cache.size();
      addResult('B', 'B3: expired entry removed on get', b3Size === 0,
        b3Size !== 0 ? `Expected size 0, got ${b3Size}` : undefined);
      
      // B4: expired entry removed on set cleanup
      cache.clear();
      cache.set('a', '1', 1000);
      await sleep(1500);
      cache.set('b', '2'); // Should trigger cleanup
      const b4HasA = cache.has('a');
      addResult('B', 'B4: expired entry removed on set cleanup', !b4HasA,
        b4HasA ? 'Expected "a" to be removed' : undefined);
      
      // B5: defaultTTL used when ttlMs not provided
      cache.clear();
      const oldDefaultTTL = config.defaultTTLms;
      cache.updateConfig({ ...config, defaultTTLms: 1000 });
      cache.set('a', '1'); // No TTL specified, should use default
      await sleep(1500);
      const b5Result = cache.get('a');
      cache.updateConfig({ ...config, defaultTTLms: oldDefaultTTL });
      addResult('B', 'B5: defaultTTL used when ttlMs not provided', b5Result === undefined,
        b5Result !== undefined ? `Expected undefined, got "${b5Result}"` : undefined);
      
      // B6: custom ttl overrides defaultTTL
      cache.clear();
      cache.updateConfig({ ...config, defaultTTLms: 10000 });
      cache.set('a', '1', 1000); // Custom TTL=1s, default=10s
      await sleep(1500);
      const b6Result = cache.get('a');
      cache.updateConfig({ ...config, defaultTTLms: oldDefaultTTL });
      addResult('B', 'B6: custom ttl overrides defaultTTL', b6Result === undefined,
        b6Result !== undefined ? `Expected undefined, got "${b6Result}"` : undefined);
      
      await sleep(100);
      
      // Test Group C: LRU
      setTestProgress(prev => ({ ...prev, current: 'Group C: LRU Eviction' }));
      
      // C1: no eviction when under capacity
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 60000);
      cache.set('B', '2', 60000);
      const c1Size = cache.size();
      addResult('C', 'C1: no eviction when under capacity', c1Size === 2,
        c1Size !== 2 ? `Expected size 2, got ${c1Size}` : undefined);
      
      // C2: evict LRU on overflow
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 60000);
      await sleep(50);
      cache.set('B', '2', 60000);
      await sleep(50);
      cache.set('C', '3', 60000);
      await sleep(50);
      cache.set('D', '4', 60000); // Should evict A
      const c2HasA = cache.has('A');
      const c2HasD = cache.has('D');
      addResult('C', 'C2: evict LRU on overflow', !c2HasA && c2HasD,
        c2HasA ? 'Expected A to be evicted' : !c2HasD ? 'Expected D to be present' : undefined);
      
      // C3: get refreshes recency
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 60000);
      await sleep(50);
      cache.set('B', '2', 60000);
      await sleep(50);
      cache.set('C', '3', 60000);
      await sleep(50);
      cache.get('A'); // Refresh A's recency
      await sleep(50);
      cache.set('D', '4', 60000); // Should evict B (not A)
      const c3HasB = cache.has('B');
      const c3HasA = cache.has('A');
      addResult('C', 'C3: get refreshes recency', !c3HasB && c3HasA,
        c3HasB ? 'Expected B to be evicted' : !c3HasA ? 'Expected A to still be present' : undefined);
      
      // C4: set refreshes recency
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 60000);
      await sleep(50);
      cache.set('B', '2', 60000);
      await sleep(50);
      cache.set('C', '3', 60000);
      await sleep(50);
      cache.set('A', '1-updated', 60000); // Refresh A's recency
      await sleep(50);
      cache.set('D', '4', 60000); // Should evict B
      const c4HasB = cache.has('B');
      const c4HasA = cache.has('A');
      addResult('C', 'C4: set refreshes recency', !c4HasB && c4HasA,
        c4HasB ? 'Expected B to be evicted' : !c4HasA ? 'Expected A to still be present' : undefined);
      
      // C5: LRU order visible
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 5 });
      cache.set('A', '1', 60000);
      await sleep(50);
      cache.set('B', '2', 60000);
      await sleep(50);
      cache.set('C', '3', 60000);
      await sleep(50);
      cache.get('A'); // A becomes MRU
      const c5Entries = cache.getAll();
      const c5Order = c5Entries.map(([k]) => k);
      const c5Correct = c5Order[0] === 'A'; // A should be first (MRU)
      addResult('C', 'C5: LRU order visible (MRU first)', c5Correct,
        !c5Correct ? `Expected A first, got order: ${c5Order.join(', ')}` : undefined);
      
      // C6: eviction removes exactly one entry
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 60000);
      cache.set('B', '2', 60000);
      cache.set('C', '3', 60000);
      cache.set('D', '4', 60000); // Overflow by one
      const c6Size = cache.size();
      addResult('C', 'C6: eviction removes exactly one entry', c6Size === 3,
        c6Size !== 3 ? `Expected size 3, got ${c6Size}` : undefined);
      
      // C7: LRU respects get on expired key
      cache.clear();
      cache.updateConfig({ ...config, maxSize: 3 });
      cache.set('A', '1', 1000);
      await sleep(1500); // A expires
      cache.get('A'); // Should remove expired A
      cache.set('B', '2', 60000);
      cache.set('C', '3', 60000);
      cache.set('D', '4', 60000);
      const c7Size = cache.size();
      const c7HasA = cache.has('A');
      addResult('C', 'C7: expired key not counted in LRU', c7Size === 3 && !c7HasA,
        c7Size !== 3 ? `Expected size 3, got ${c7Size}` : 
        c7HasA ? 'Expired A should not be present' : undefined);
      
      await sleep(100);
      
      // Test Group D: Persistence (simulated since localStorage unavailable)
      setTestProgress(prev => ({ ...prev, current: 'Group D: Persistence' }));
      
      // D1: persist after set
      cache.clear();
      localStorage.removeItem(config.storageKey);
      cache.set('A', '1', 60000);
      const d1Stored = localStorage.getItem(config.storageKey);
      const d1Valid = d1Stored !== null && d1Stored.includes('"A"');
      addResult('D', 'D1: persist after set', d1Valid,
        !d1Valid ? 'localStorage does not contain serialized cache' : undefined);
      
      // D2: load restores non-expired entries
      cache.clear();
      localStorage.removeItem(config.storageKey);
      cache.set('A', '1', 60000);
      cache.set('B', '2', 60000);
      // Create new cache instance to test loading
      const testCache = new TTLCache(config, addLog);
      const d2HasA = testCache.has('A');
      const d2HasB = testCache.has('B');
      addResult('D', 'D2: load restores non-expired entries', d2HasA && d2HasB,
        !d2HasA || !d2HasB ? 'Expected both A and B to be restored' : undefined);
      
      // D3: expired entries not restored
      cache.clear();
      localStorage.removeItem(config.storageKey);
      cache.set('A', '1', 500);
      await sleep(800); // Wait for expiration
      // Create new cache instance - should not load expired entry
      const testCache2 = new TTLCache(config, addLog);
      const d3HasA = testCache2.has('A');
      addResult('D', 'D3: expired entries not restored', !d3HasA,
        d3HasA ? 'Expected expired A to not be restored' : undefined);
      
      // D4: corrupted storage handled safely
      localStorage.setItem(config.storageKey, 'invalid{json}data');
      try {
        const testCache3 = new TTLCache(config, addLog);
        const d4Initialized = testCache3.size() === 0;
        addResult('D', 'D4: corrupted storage handled safely', d4Initialized,
          !d4Initialized ? 'Cache should initialize empty on corrupt data' : undefined);
      } catch (error) {
        addResult('D', 'D4: corrupted storage handled safely', false,
          'Cache crashed on corrupted storage');
      }
      
      // Clean up and restore
      localStorage.removeItem(config.storageKey);
      cache.updateConfig(config);
      forceUpdate();
      
    } catch (error) {
      addResult('System', 'Test Suite', false, `Unexpected error: ${error}`);
    }
    
    setTestProgress(prev => ({ ...prev, running: false, current: 'Tests complete' }));
  };

  const runTTLScenario = () => {
    if (!cache) return;
    cache.clear();
    setLogs([]);
    
    setTimeout(() => {
      // Set short TTL items
      cache.set('temp1', 'Expires in 2s', 2000);
      forceUpdate();
      setTimeout(() => {
        cache.set('temp2', 'Expires in 4s', 4000);
        forceUpdate();
        setTimeout(() => {
          cache.set('permanent', 'Lasts 1 minute', 60000);
          forceUpdate();
          
          // Show instruction
          addLog({
            timestamp: Date.now(),
            type: 'loaded',
            message: '⏳ Wait 2-4 seconds, then try getting "temp1" or "temp2" to see expiration'
          });
        }, 300);
      }, 300);
    }, 100);
  };

  if (!cache) return <div className="p-4">Initializing...</div>;

  const entries = cache.getAll();
  const now = Date.now();

  return (
    <div className="w-full h-screen bg-gray-50 flex">
      {/* Left side: Event Log & Testing */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Event Log */}
        <div className="flex-1 flex flex-col border-b border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-800 text-white">
            <h2 className="text-lg font-bold">Event Log</h2>
            <p className="text-xs text-gray-300 mt-1">Real-time cache operations</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <div className="text-gray-400 text-center py-8">No events yet</div>
            )}
            {logs.map((log, idx) => {
              const typeColors = {
                hit: 'text-green-700 bg-green-50',
                miss: 'text-yellow-700 bg-yellow-50',
                expired: 'text-orange-700 bg-orange-50',
                evicted: 'text-red-700 bg-red-50',
                saved: 'text-blue-700 bg-blue-50',
                loaded: 'text-purple-700 bg-purple-50',
                'parse-error': 'text-red-900 bg-red-100',
                set: 'text-gray-700 bg-gray-50'
              };
              
              return (
                <div key={idx} className={`p-2 rounded ${typeColors[log.type]}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold uppercase text-[10px]">{log.type}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1">{log.message}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testing Panel */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-indigo-800 text-white">
            <h2 className="text-lg font-bold">Testing Panel</h2>
            <p className="text-xs text-indigo-200 mt-1">Automated test suite</p>
          </div>
          
          <div className="p-4 border-b border-gray-200 bg-indigo-50">
            <button
              onClick={runTests}
              disabled={testProgress.running}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded font-medium flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {testProgress.running ? 'Running Tests...' : 'Run Sanity Tests'}
            </button>
            {testProgress.running && (
              <div className="mt-2 text-sm text-indigo-700">
                {testProgress.current}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {testProgress.results.length === 0 && !testProgress.running && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Click "Run Sanity Tests" to start
              </div>
            )}
            
            {testProgress.results.length > 0 && (
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <div className="text-sm font-bold text-gray-700">Summary</div>
                <div className="text-xs text-gray-600 mt-1">
                  Passed: <span className="font-bold text-green-600">
                    {testProgress.results.filter(r => r.passed).length}
                  </span>
                  {' / '}
                  Failed: <span className="font-bold text-red-600">
                    {testProgress.results.filter(r => !r.passed).length}
                  </span>
                  {' / '}
                  Total: {testProgress.results.length}
                </div>
              </div>
            )}

            {testProgress.results.map((result, idx) => (
              <div 
                key={idx} 
                className={`p-2 rounded border text-xs ${
                  result.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`font-bold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-700">
                      {result.group}: {result.name}
                    </div>
                    {result.error && (
                      <div className="text-red-600 mt-1 font-mono text-[10px]">
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Cache & Controls */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h1 className="text-2xl font-bold">Cache with TTL & LRU Eviction</h1>
          <p className="text-sm text-blue-100 mt-1">
            Storage Key: <code className="bg-blue-800 px-2 py-1 rounded">{config.storageKey}</code>
            {' '} | Max Size: <strong>{config.maxSize}</strong>
            {' '} | Default TTL: <strong>{config.defaultTTLms}ms</strong>
          </p>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="mt-3 px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded text-sm flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {showConfig ? 'Hide' : 'Show'} Configuration
          </button>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Size</label>
                <input
                  type="number"
                  value={config.maxSize}
                  onChange={e => setConfig({ ...config, maxSize: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default TTL (ms)</label>
                <input
                  type="number"
                  value={config.defaultTTLms}
                  onChange={e => setConfig({ ...config, defaultTTLms: parseInt(e.target.value) || 1000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Storage Key</label>
                <input
                  type="text"
                  value={config.storageKey}
                  onChange={e => setConfig({ ...config, storageKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex gap-3">
            <button
              onClick={runLRUScenario}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-2 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Demo: LRU Eviction
            </button>
            <button
              onClick={runTTLScenario}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-2 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Demo: TTL Expiration
            </button>
            <button
              onClick={handleClear}
              className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Set Entry */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Set Entry</h3>
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Key"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                onKeyPress={e => e.key === 'Enter' && handleSet()}
              />
              <input
                type="text"
                placeholder="Value"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                onKeyPress={e => e.key === 'Enter' && handleSet()}
              />
              <input
                type="number"
                placeholder={`TTL (default: ${config.defaultTTLms}ms)`}
                value={newTTL}
                onChange={e => setNewTTL(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                onKeyPress={e => e.key === 'Enter' && handleSet()}
              />
              <button
                onClick={handleSet}
                disabled={!newKey}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded text-sm font-medium"
              >
                Set
              </button>
            </div>
          </div>

          {/* Get Entry */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Get Entry</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Key to retrieve"
                value={getKey}
                onChange={e => setGetKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
                onKeyPress={e => e.key === 'Enter' && handleGet()}
              />
              <button
                onClick={handleGet}
                disabled={!getKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded text-sm font-medium"
              >
                Get
              </button>
            </div>
          </div>

          {/* Cache Contents */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">
                Cache Contents ({entries.length}/{config.maxSize}) — MRU → LRU
              </h3>
            </div>
            
            {entries.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Cache is empty. Add entries above.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Key</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Value</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Expires At</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([key, entry], idx) => {
                    const isExpired = now >= entry.expiresAt;
                    const timeLeft = Math.max(0, entry.expiresAt - now);
                    
                    return (
                      <tr key={key} className={`border-b border-gray-100 ${isExpired ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-mono font-medium">{key}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{entry.value}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(entry.expiresAt).toLocaleString()}
                          <div className="text-[10px] text-gray-400 mt-1">
                            ({timeLeft > 0 ? `${Math.round(timeLeft / 1000)}s left` : 'expired'})
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              VALID
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(key)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}