import React, { useState } from 'react';

// Email validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Test cases
const testCases = [
  { email: 'user@example.com', expected: true },
  { email: 'test.email@domain.co.uk', expected: true },
  { email: 'invalid@', expected: false },
  { email: '@invalid.com', expected: false },
  { email: 'no-at-sign.com', expected: false },
  { email: 'spaces in@email.com', expected: false },
  { email: 'user@domain', expected: false },
];

export default function EmailValidator() {
  const [testResults, setTestResults] = useState<Array<{
    email: string;
    expected: boolean;
    actual: boolean;
    passed: boolean;
  }> | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customResult, setCustomResult] = useState<boolean | null>(null);

  const runTests = () => {
    const results = testCases.map(test => ({
      email: test.email,
      expected: test.expected,
      actual: validateEmail(test.email),
      passed: validateEmail(test.email) === test.expected,
    }));
    setTestResults(results);
  };

  const testCustomEmail = () => {
    setCustomResult(validateEmail(customEmail));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Email Validator</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Test Suite</h2>
          <button
            onClick={runTests}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Run Tests
          </button>
          
          {testResults && (
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono">{result.email}</code>
                      <span
                        className={`text-sm font-semibold ${
                          result.passed ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {result.passed ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Expected: {result.expected.toString()} | Got: {result.actual.toString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {testResults.filter(r => r.passed).length} / {testResults.length} tests passed
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Try Your Own</h2>
          <textarea
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="Enter test cases (one per line)&#10;Format: (note) expected email&#10;Example: (no @ format) false no-at-sign.com"
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
          <button
            onClick={testCustomEmail}
            className="mt-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Validate All
          </button>
          
          {customResult !== null && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
              {customEmail.split('\n').filter(e => e.trim()).map((line, index) => {
                // Extract note from parentheses
                const noteMatch = line.match(/\(([^)]*)\)/);
                const note = noteMatch ? noteMatch[1] : null;
                
                // Remove content inside parentheses
                let processed = line.replace(/\([^)]*\)/g, '').trim();
                
                // Extract expected result (true/false) and email
                const parts = processed.split(/\s+/);
                const expectedStr = parts[0]?.toLowerCase();
                const expected = expectedStr === 'true' || expectedStr === 'false' 
                  ? expectedStr === 'true' 
                  : null;
                const email = parts.slice(1).join(' ').trim();
                
                if (!email) return null;
                
                const actual = validateEmail(email);
                const passed = expected !== null ? actual === expected : null;
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      passed === null
                        ? actual
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {note && (
                      <div className="text-xs text-gray-500 mb-1 italic">
                        {note}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono">{email}</code>
                      <span
                        className={`text-sm font-semibold ${
                          passed === null
                            ? actual
                              ? 'text-green-700'
                              : 'text-red-700'
                            : passed
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {passed === null
                          ? actual
                            ? '✓ Valid'
                            : '✗ Invalid'
                          : passed
                          ? '✓ PASS'
                          : '✗ FAIL'}
                      </span>
                    </div>
                    {expected !== null && (
                      <div className="text-xs text-gray-600 mt-1">
                        Expected: {expected.toString()} | Got: {actual.toString()}
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {(() => {
                  const results = customEmail.split('\n').filter(e => e.trim()).map(line => {
                    let processed = line.replace(/\([^)]*\)/g, '').trim();
                    const parts = processed.split(/\s+/);
                    const expectedStr = parts[0]?.toLowerCase();
                    const expected = expectedStr === 'true' || expectedStr === 'false' 
                      ? expectedStr === 'true' 
                      : null;
                    const email = parts.slice(1).join(' ').trim();
                    if (!email || expected === null) return null;
                    const actual = validateEmail(email);
                    return actual === expected;
                  }).filter(r => r !== null);
                  
                  const passedCount = results.filter(r => r).length;
                  const totalCount = results.length;
                  
                  return totalCount > 0 ? `${passedCount} / ${totalCount} tests passed` : '';
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Regex Pattern</h2>
          <code className="text-sm bg-gray-100 p-2 rounded block">
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          </code>
          <p className="text-sm text-gray-600 mt-2">
            This pattern checks for: characters before @, then @, then characters, then a dot, then characters after the dot.
          </p>
        </div>
      </div>
    </div>
  );
}