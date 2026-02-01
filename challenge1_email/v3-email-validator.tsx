import React, { useState } from 'react';
import { CheckCircle, XCircle, Play } from 'lucide-react';

// Regex subpatterns built for readability and safety
const LOCAL_CHAR = '[a-zA-Z0-9._%+\\-]'; // allowed chars in local part
const LOCAL_PART = `${LOCAL_CHAR}+(?:\\.${LOCAL_CHAR}+)*`; // no leading/trailing/consecutive dots

const LABEL_CHAR = '[a-zA-Z0-9](?:[a-zA-Z0-9\\-]*[a-zA-Z0-9])?'; // label: no leading/trailing hyphen
const DOMAIN_LABELS = `${LABEL_CHAR}(?:\\.${LABEL_CHAR})*`; // one or more labels separated by dots

const TLD = '[a-zA-Z]{2,63}'; // letters only, 2-63 chars

// Combined regex: anchored to prevent partial matches
const EMAIL_REGEX = new RegExp(`^${LOCAL_PART}@${DOMAIN_LABELS}\\.${TLD}$`);

/**
 * Validates an email address using practical real-world rules.
 * Accepts: letters, digits, ._%+- in local part; hyphens/underscores; long TLDs; subdomains
 * Rejects: whitespace, consecutive dots, invalid chars, quoted strings, numeric-only TLDs
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Quick checks before regex
  if (/\s/.test(email)) return false; // reject any whitespace
  if (email.includes('..')) return false; // reject consecutive dots anywhere
  if (!email.includes('@')) return false; // must have exactly one @
  if (email.indexOf('@') !== email.lastIndexOf('@')) return false; // only one @
  
  const [local, domain] = email.split('@');
  
  // Check local part boundaries
  if (local.startsWith('.') || local.endsWith('.')) return false;
  
  // Check for invalid characters in local part
  if (/["()\[\]\\#]/.test(local)) return false;
  
  // Check domain structure
  if (!domain || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('.-') || domain.includes('-.')) return false;
  
  // Check TLD is not numeric-only
  const tld = domain.split('.').pop();
  if (tld && /^\d+$/.test(tld)) return false;
  
  // Final regex validation
  return EMAIL_REGEX.test(email);
}

// Test cases
const TEST_CASES = [
  // Original 12 valid cases
  { email: 'simple@example.com', expected: true, description: 'Basic valid email' },
  { email: 'user.name@example.com', expected: true, description: 'Dot in local part' },
  { email: 'user+tag@example.co.uk', expected: true, description: 'Plus sign and ccTLD' },
  { email: 'first.last@sub.domain.com', expected: true, description: 'Subdomain' },
  { email: 'user%test@example.com', expected: true, description: 'Percent in local part' },
  { email: 'a@b.co', expected: true, description: 'Minimal valid email' },
  { email: 'test@example.museum', expected: true, description: 'Long TLD' },
  { email: 'user-name@example.com', expected: true, description: 'Hyphen in local part' },
  { email: 'first_last@example.com', expected: true, description: 'Underscore in local part' },
  { email: 'TEST@EXAMPLE.COM', expected: true, description: 'Uppercase letters' },
  { email: 'user@mail.example.com', expected: true, description: 'Multiple subdomains' },
  { email: '123@example.com', expected: true, description: 'Numeric local part' },
  
  // Original 12 invalid cases
  { email: 'plainaddress', expected: false, description: 'Missing @' },
  { email: '@example.com', expected: false, description: 'Missing local part' },
  { email: 'user@', expected: false, description: 'Missing domain' },
  { email: 'user @example.com', expected: false, description: 'Space in email' },
  { email: 'user@example .com', expected: false, description: 'Space in domain' },
  { email: 'user..name@example.com', expected: false, description: 'Consecutive dots in local' },
  { email: '.user@example.com', expected: false, description: 'Leading dot in local' },
  { email: 'user.@example.com', expected: false, description: 'Trailing dot in local' },
  { email: 'user@.example.com', expected: false, description: 'Leading dot in domain' },
  { email: 'user@example..com', expected: false, description: 'Consecutive dots in domain' },
  { email: 'user@-example.com', expected: false, description: 'Leading hyphen in domain' },
  { email: 'user@example.c', expected: false, description: 'TLD too short' },
  
  // New 6 edge cases
  { email: 'customer-service@store.online', expected: true, description: 'Hyphen and long TLD' },
  { email: 'FIRST_LAST@Example.COM', expected: true, description: 'Mixed case with underscore' },
  { email: 'a@b.c.d.e.f.g.example.com', expected: true, description: 'Deep subdomain chain' },
  { email: '"a b"@example.com', expected: false, description: 'Quoted string (unsupported)' },
  { email: 'user[123]@example.com', expected: false, description: 'Brackets in local part' },
  { email: 'user@domain.technology', expected: true, description: 'Very long TLD' },
];

function EmailValidator() {
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; email: string; expected: boolean; actual: boolean; description: string }>>([]);
  const [customInput, setCustomInput] = useState('');
  const [customResults, setCustomResults] = useState<Array<{ email: string; expected: boolean; actual: boolean; passed: boolean; note: string }>>([]);

  const runTests = () => {
    const results = TEST_CASES.map(test => {
      const actual = isValidEmail(test.email);
      return {
        ...test,
        actual,
        passed: actual === test.expected
      };
    });
    setTestResults(results);
  };

  const parseCustomTests = () => {
    const lines = customInput.split('\n').filter(line => line.trim());
    const results = lines.map(line => {
      // Parse: (note) true/false email
      let note = '';
      let remaining = line.trim();
      
      // Extract note if present
      const noteMatch = remaining.match(/^\(([^)]*)\)/);
      if (noteMatch) {
        note = noteMatch[1];
        remaining = remaining.slice(noteMatch[0].length).trim();
      }
      
      // Extract expected result
      const parts = remaining.split(/\s+/);
      const expectedStr = parts[0];
      const email = parts.slice(1).join(' '); // rejoin in case of spaces (will fail validation)
      
      const expected = expectedStr === 'true';
      const actual = isValidEmail(email);
      
      return {
        email,
        expected,
        actual,
        passed: actual === expected,
        note
      };
    });
    setCustomResults(results);
  };

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Email Validator v3</h1>
        <p className="text-slate-600">
          Production-quality TypeScript email validation with regex subpatterns
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Test Results */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Validation Rules</h2>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>✓ Accepts: letters, digits, ._%+- and hyphens/underscores</li>
              <li>✓ Long TLDs (2-63 letters), deep subdomains, mixed case</li>
              <li>✗ Rejects: whitespace, consecutive dots, quoted strings, invalid chars</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <h2 className="text-sm font-semibold text-blue-800 mb-2">Regex Pattern</h2>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-blue-600 font-mono mb-1">LOCAL_PART</div>
                <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded break-all">
                  {LOCAL_CHAR}+(?:\\.{LOCAL_CHAR}+)*
                </div>
              </div>
              <div>
                <div className="text-xs text-blue-600 font-mono mb-1">DOMAIN_LABELS</div>
                <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded break-all">
                  {LABEL_CHAR}(?:\\.{LABEL_CHAR})*
                </div>
              </div>
              <div>
                <div className="text-xs text-blue-600 font-mono mb-1">TLD</div>
                <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded break-all">
                  [a-zA-Z]{'{2,63}'}
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="text-xs text-blue-600 font-mono mb-1">FINAL REGEX</div>
                <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded break-all">
                  ^{LOCAL_PART}@{DOMAIN_LABELS}\.{TLD}$
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={runTests}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors mb-6"
          >
            <Play size={20} />
            Run Tests ({TEST_CASES.length} cases)
          </button>

          {testResults.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-slate-800">Results</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  passedCount === totalCount 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {passedCount} / {totalCount} passed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      result.passed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.passed ? (
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                      ) : (
                        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-slate-800 break-all mb-1">
                          {result.email}
                        </div>
                        <div className="text-xs text-slate-600">{result.description}</div>
                        {!result.passed && (
                          <div className="text-xs text-red-700 mt-1">
                            Expected: {result.expected.toString()}, Got: {result.actual.toString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Try Your Own */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Try Your Own</h2>
          <p className="text-slate-600 mb-4">
            Format: <code className="bg-slate-100 px-2 py-1 rounded text-sm">(note) true/false email</code>
          </p>
          
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="(basic test) true user@example.com&#10;(has space) false user @example.com&#10;(long TLD) true admin@site.technology"
            className="w-full h-64 p-4 border-2 border-slate-200 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none mb-4"
          />

          <button
            onClick={parseCustomTests}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors mb-6"
          >
            <Play size={20} />
            Parse & Test
          </button>

          {customResults.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-slate-800">Results</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  customResults.filter(r => r.passed).length === customResults.length
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {customResults.filter(r => r.passed).length} / {customResults.length} passed
                </span>
              </div>

              <div className="space-y-2">
                {customResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      result.passed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.passed ? (
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                      ) : (
                        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                      )}
                      <div className="flex-1 min-w-0">
                        {result.note && (
                          <div className="text-xs text-slate-500 mb-1">{result.note}</div>
                        )}
                        <div className="font-mono text-xs text-slate-800 break-all mb-1">
                          {result.email}
                        </div>
                        {!result.passed && (
                          <div className="text-xs text-red-700">
                            Expected: {result.expected.toString()}, Got: {result.actual.toString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmailValidator;