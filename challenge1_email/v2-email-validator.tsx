import React, { useState } from 'react';

// Email validation function using a single regex
function isValidEmail(email: string): boolean {
  // Regex breakdown:
  // ^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*(?:\+[a-zA-Z0-9]+)?
  //   - Local part: starts with alphanumeric, can have dots (but not consecutive, not at start/end)
  //   - Plus addressing: optional +something
  // @
  // (?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+
  //   - Domain labels: must start/end with alphanumeric, can have hyphens in middle
  //   - One or more labels followed by dots
  // [a-zA-Z]{2,}$
  //   - TLD: at least 2 letters
  
  const regex = /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*(?:\+[a-zA-Z0-9]+)?@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(email);
}

// Test cases
const testCases = [
  // Valid cases (12)
  { email: 'simple@example.com', expected: true, description: 'Basic email' },
  { email: 'user+tag@example.com', expected: true, description: 'Plus addressing' },
  { email: 'user+123@example.com', expected: true, description: 'Plus with numbers' },
  { email: 'first.last@example.com', expected: true, description: 'Dot in local part' },
  { email: 'a.b.c@example.com', expected: true, description: 'Multiple dots in local' },
  { email: 'user@sub.example.com', expected: true, description: 'Subdomain' },
  { email: 'user@a.b.c.d.com', expected: true, description: 'Multiple subdomains' },
  { email: 'test123@example.co', expected: true, description: 'Two letter TLD' },
  { email: 'user@domain.co.uk', expected: true, description: 'Country TLD' },
  { email: 'a@b.com', expected: true, description: 'Minimal valid email' },
  { email: 'user@ex-ample.com', expected: true, description: 'Hyphen in domain' },
  { email: 'user.name+tag@sub.domain.example.com', expected: true, description: 'Complex valid' },
  
  // Invalid cases (12)
  { email: 'plaintext', expected: false, description: 'Missing @' },
  { email: 'user@@example.com', expected: false, description: 'Multiple @' },
  { email: 'user@exam ple.com', expected: false, description: 'Space in domain' },
  { email: 'us er@example.com', expected: false, description: 'Space in local' },
  { email: 'user..name@example.com', expected: false, description: 'Consecutive dots' },
  { email: '.user@example.com', expected: false, description: 'Starts with dot' },
  { email: 'user.@example.com', expected: false, description: 'Ends with dot' },
  { email: 'user@-example.com', expected: false, description: 'Domain starts with hyphen' },
  { email: 'user@example-.com', expected: false, description: 'Domain ends with hyphen' },
  { email: 'user@example.c', expected: false, description: 'TLD too short' },
  { email: 'user@.com', expected: false, description: 'Missing domain label' },
  { email: '@example.com', expected: false, description: 'Missing local part' },
];

export default function EmailValidator() {
  const [customInput, setCustomInput] = useState('');
  const [customResults, setCustomResults] = useState<Array<{input: string, expected: boolean, actual: boolean, pass: boolean}>>([]);
  
  // Run built-in tests
  const results = testCases.map(test => ({
    ...test,
    actual: isValidEmail(test.email),
    pass: isValidEmail(test.email) === test.expected
  }));
  
  const allPassed = results.every(r => r.pass);
  const passCount = results.filter(r => r.pass).length;
  
  const handleCustomTest = () => {
    if (!customInput.trim()) return;
    
    const lines = customInput.trim().split('\n');
    const newResults = lines.map(line => {
      // Remove content in parentheses
      const withoutParens = line.replace(/\([^)]*\)/g, '').trim();
      
      // Extract expected result (first 'true' or 'false')
      const expectedMatch = withoutParens.match(/\b(true|false)\b/i);
      const expected = expectedMatch ? expectedMatch[1].toLowerCase() === 'true' : true;
      
      // Extract email (everything after the expected result)
      const email = withoutParens.replace(/\b(true|false)\b/i, '').trim();
      
      const actual = isValidEmail(email);
      return {
        input: line,
        expected,
        actual,
        pass: actual === expected
      };
    });
    
    setCustomResults(newResults);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Email Validator</h1>
          <p className="text-gray-600 mb-4">TypeScript regex-based email validation with comprehensive tests</p>
          
          <div className={`p-4 rounded-lg ${allPassed ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="text-xl font-semibold mb-2">
              {allPassed ? '✓ All Tests Passed!' : '✗ Some Tests Failed'}
            </h2>
            <p className="text-lg">
              {passCount} / {testCases.length} tests passing
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Left side: Test Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Test Results</h3>
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border-l-4 ${
                    result.pass ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className={`font-mono text-sm ${result.pass ? 'text-green-800' : 'text-red-800'}`}>
                        {result.email}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{result.description}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <span className={`font-semibold ${result.pass ? 'text-green-600' : 'text-red-600'}`}>
                        {result.pass ? 'PASS' : 'FAIL'}
                      </span>
                      <p className="text-xs text-gray-500">
                        Expected: {result.expected.toString()} | Got: {result.actual.toString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right side: Try Your Own */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Try Your Own</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter test cases (one per line) in format: <code className="bg-gray-100 px-2 py-1 rounded">(note) true/false email@example.com</code>
            </p>
            
            <textarea
              className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(standard email) true simple@example.com&#10;(multiple domains) true user.name@domain.co.uk&#10;(invalid format) false user@domain"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
            />
            
            <button
              onClick={handleCustomTest}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Run Custom Tests
            </button>
            
            {customResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-700">
                  Custom Results ({customResults.filter(r => r.pass).length} / {customResults.length} passing)
                </h3>
                {customResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border-l-4 ${
                      result.pass ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{result.input}</p>
                        <span className={`font-mono text-sm ${result.pass ? 'text-green-800' : 'text-red-800'}`}>
                          {result.input.replace(/\([^)]*\)/g, '').replace(/\b(true|false)\b/i, '').trim()}
                        </span>
                      </div>
                      <div className="ml-4 text-right">
                        <span className={`font-semibold ${result.pass ? 'text-green-600' : 'text-red-600'}`}>
                          {result.pass ? 'PASS' : 'FAIL'}
                        </span>
                        <p className="text-xs text-gray-500">
                          Expected: {result.expected.toString()} | Got: {result.actual.toString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}