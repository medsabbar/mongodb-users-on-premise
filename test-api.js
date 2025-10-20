#!/usr/bin/env node

/**
 * Simple test to verify the validation API endpoint works
 */

const http = require('http');

// Test data
const testUri = "mongodb://localhost:27017/?directConnection=true";

const postData = JSON.stringify({
    uri: testUri
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/validate-uri',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🧪 Testing URI Validation API Endpoint');
console.log('='.repeat(50));
console.log(`Input URI: ${testUri}`);

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log(`Status Code: ${res.statusCode}`);
            console.log('Response:', JSON.stringify(response, null, 2));

            if (res.statusCode === 200 && response.valid) {
                console.log('✅ API validation endpoint works correctly!');
            } else {
                console.log('❌ API validation failed');
            }
        } catch (error) {
            console.log('❌ Failed to parse response:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
    console.log('💡 Make sure the server is running with: npm start');
});

req.write(postData);
req.end();