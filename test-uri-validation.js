#!/usr/bin/env node

/**
 * Test script to demonstrate MongoDB URI validation functionality
 * Run with: node test-uri-validation.js
 */

// Copy the validation function from server.js
function validateAndNormalizeMongoURI(uri) {
    if (!uri || typeof uri !== 'string') {
        throw new Error('URI is required and must be a string');
    }

    // Remove leading/trailing whitespace
    uri = uri.trim();

    // Basic MongoDB URI format validation
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        throw new Error('URI must start with mongodb:// or mongodb+srv://');
    }

    try {
        // Parse the URI to validate its structure
        const url = new URL(uri);

        // Extract components
        const protocol = url.protocol; // mongodb: or mongodb+srv:
        const host = url.host;
        const pathname = url.pathname;
        const search = url.search;

        // Validate host
        if (!host) {
            throw new Error('URI must include a valid host');
        }

        // Check if database is already specified in the path
        let normalizedURI = uri;

        // If pathname is empty or just '/', we need to add '/admin'
        if (!pathname || pathname === '/') {
            // Add /admin before query parameters
            if (search) {
                normalizedURI = `${protocol}//${host}/admin${search}`;
            } else {
                normalizedURI = `${protocol}//${host}/admin`;
            }
        } else {
            // Check if pathname contains a database name other than admin
            const pathParts = pathname.split('/').filter(part => part.length > 0);

            if (pathParts.length === 0) {
                // No database specified, add admin
                if (search) {
                    normalizedURI = `${protocol}//${host}/admin${search}`;
                } else {
                    normalizedURI = `${protocol}//${host}/admin`;
                }
            } else if (pathParts[0] !== 'admin') {
                // Database specified but not admin, replace with admin
                pathParts[0] = 'admin';
                const newPath = '/' + pathParts.join('/');
                normalizedURI = `${protocol}//${host}${newPath}${search}`;
            }
            // If already admin, keep as is
        }

        // Validate the final URI by attempting to parse it again
        new URL(normalizedURI);

        return normalizedURI;
    } catch (error) {
        throw new Error(`Invalid URI format: ${error.message}`);
    }
}

// Test cases
const testCases = [
    {
        description: "Basic localhost URI without database",
        input: "mongodb://localhost:27017",
        shouldPass: true
    },
    {
        description: "Localhost URI with directConnection parameter",
        input: "mongodb://localhost:27017/?directConnection=true",
        shouldPass: true
    },
    {
        description: "URI with different database (should be replaced with admin)",
        input: "mongodb://localhost:27017/myapp?directConnection=true",
        shouldPass: true
    },
    {
        description: "URI with admin database already specified",
        input: "mongodb://localhost:27017/admin?directConnection=true",
        shouldPass: true
    },
    {
        description: "URI with authentication",
        input: "mongodb://username:password@localhost:27017/?authSource=admin",
        shouldPass: true
    },
    {
        description: "MongoDB Atlas URI",
        input: "mongodb+srv://cluster.mongodb.net/?retryWrites=true&w=majority",
        shouldPass: true
    },
    {
        description: "Invalid URI - no protocol",
        input: "localhost:27017",
        shouldPass: false
    },
    {
        description: "Invalid URI - wrong protocol",
        input: "http://localhost:27017",
        shouldPass: false
    },
    {
        description: "Invalid URI - empty string",
        input: "",
        shouldPass: false
    },
    {
        description: "Invalid URI - no host",
        input: "mongodb://",
        shouldPass: false
    }
];

console.log('🧪 MongoDB URI Validation Tests\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);

    try {
        const result = validateAndNormalizeMongoURI(testCase.input);

        if (testCase.shouldPass) {
            console.log(`   ✅ PASS - Normalized: "${result}"`);

            // Check if URI was modified
            if (result !== testCase.input.trim()) {
                console.log(`   📝 Note: URI was automatically modified to include admin database`);
            }
            passCount++;
        } else {
            console.log(`   ❌ FAIL - Expected error but got: "${result}"`);
            failCount++;
        }
    } catch (error) {
        if (!testCase.shouldPass) {
            console.log(`   ✅ PASS - Expected error: ${error.message}`);
            passCount++;
        } else {
            console.log(`   ❌ FAIL - Unexpected error: ${error.message}`);
            failCount++;
        }
    }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);

if (failCount === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
}