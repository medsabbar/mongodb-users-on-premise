const exec = require('child_process').exec;

// URI validation function
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

async function createUser(uri, db, user) {
    const { name, password } = user;
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        const command = `mongosh "${validatedUri}" --eval "db.createUser({user: '${name}', pwd: '${password}', roles: [{ role: 'readWrite', db: '${db.databaseName}' }], customData: { createdAt: new Date() }})" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    })

    return promise;
}

async function updateUser(uri, db, user) {
    const { name, password } = user;
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        const command = `mongosh "${validatedUri}" --eval "db.updateUser('${name}', {pwd: '${password}'})" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    })

    return promise;
}

async function deleteUser(uri, db, name) {
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        const command = `mongosh "${validatedUri}" --eval "db.dropUser('${name}')" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    })

    return promise;
}

module.exports = { createUser, updateUser, deleteUser, validateAndNormalizeMongoURI }