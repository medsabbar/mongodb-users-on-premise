const exec = require('child_process').exec;

// Built-in MongoDB roles
const BUILTIN_ROLES = {
    // Database User Roles
    read: { role: 'read', description: 'Read data from all non-system collections' },
    readWrite: { role: 'readWrite', description: 'Read and write data to all non-system collections' },
    
    // Database Administration Roles
    dbAdmin: { role: 'dbAdmin', description: 'Administrative privileges on the database' },
    dbOwner: { role: 'dbOwner', description: 'Full privileges on the database' },
    userAdmin: { role: 'userAdmin', description: 'Create and modify roles and users on the database' },
    
    // Cluster Administration Roles (for admin database)
    clusterAdmin: { role: 'clusterAdmin', description: 'Full cluster administration access' },
    clusterManager: { role: 'clusterManager', description: 'Manage and monitor cluster operations' },
    clusterMonitor: { role: 'clusterMonitor', description: 'Read-only access to monitoring tools' },
    hostManager: { role: 'hostManager', description: 'Monitor and manage servers' },
    
    // Backup and Restore Roles
    backup: { role: 'backup', description: 'Backup database data' },
    restore: { role: 'restore', description: 'Restore database data' },
    
    // All Database Roles (for admin database)
    readAnyDatabase: { role: 'readAnyDatabase', description: 'Read data from all databases' },
    readWriteAnyDatabase: { role: 'readWriteAnyDatabase', description: 'Read and write data to all databases' },
    userAdminAnyDatabase: { role: 'userAdminAnyDatabase', description: 'User administration privileges on all databases' },
    dbAdminAnyDatabase: { role: 'dbAdminAnyDatabase', description: 'Database administration privileges on all databases' },
    
    // Superuser Roles
    root: { role: 'root', description: 'Full access to all operations and resources' }
};

// Custom role structure
class CustomRole {
    constructor(name, privileges = [], inheritedRoles = []) {
        this.role = name;
        this.privileges = privileges; // Array of { resource: { db: string, collection?: string }, actions: string[] }
        this.roles = inheritedRoles; // Array of { role: string, db: string }
        this.isCustom = true;
    }

    // Add privilege to the role
    addPrivilege(database, collection, actions) {
        const resource = collection ? { db: database, collection } : { db: database };
        this.privileges.push({ resource, actions });
    }

    // Convert to MongoDB role format
    toMongoRole() {
        return {
            role: this.role,
            privileges: this.privileges,
            roles: this.roles
        };
    }
}

// URI validation function
function validateAndNormalizeMongoURI(uri) {
    if (!uri || typeof uri !== 'string') {
        throw new Error('URI is required and must be a string');
    }

    // Remove leading/trailing whitespace
    uri = uri.trim();

    // Special case for demo mode
    if (uri.includes('demo') || uri.includes('test-demo')) {
        return uri;
    }

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
    const { name, password, roles = [] } = user;
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        
        // Default to readWrite role if no roles specified
        const userRoles = roles.length > 0 ? roles : [{ role: 'readWrite', db: db.databaseName }];
        
        // Format roles for MongoDB command
        const rolesStr = JSON.stringify(userRoles);
        
        const command = `mongosh "${validatedUri}" --eval "db.createUser({user: '${name}', pwd: '${password}', roles: ${rolesStr}, customData: { createdAt: new Date() }})" --quiet`;
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
    const { name, password, roles } = user;
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        
        // Build update object
        const updateObj = {};
        if (password) updateObj.pwd = password;
        if (roles) updateObj.roles = roles;
        
        const updateStr = JSON.stringify(updateObj);
        const command = `mongosh "${validatedUri}" --eval "db.updateUser('${name}', ${updateStr})" --quiet`;
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

// Role management functions
async function createCustomRole(uri, db, role) {
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        
        const roleObj = {
            role: role.role,
            privileges: role.privileges || [],
            roles: role.roles || []
        };
        
        const roleStr = JSON.stringify(roleObj);
        const command = `mongosh "${validatedUri}" --eval "db.createRole(${roleStr})" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    });

    return promise;
}

async function updateCustomRole(uri, db, roleName, updates) {
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        
        const updateStr = JSON.stringify(updates);
        const command = `mongosh "${validatedUri}" --eval "db.updateRole('${roleName}', ${updateStr})" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    });

    return promise;
}

async function deleteCustomRole(uri, db, roleName) {
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        const command = `mongosh "${validatedUri}" --eval "db.dropRole('${roleName}')" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    });

    return promise;
}

async function listRoles(uri, db) {
    const promise = new Promise(async (resolve, reject) => {
        // Ensure we're using the validated URI
        const validatedUri = validateAndNormalizeMongoURI(uri);
        const command = `mongosh "${validatedUri}" --eval "db.getRoles({showPrivileges: true, showBuiltinRoles: false})" --quiet`;
        exec(command, (error, stdout, stderr) => {
            console.log(error, stdout, stderr);
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    });

    return promise;
}

// Utility functions for role management
function getBuiltinRoles() {
    return BUILTIN_ROLES;
}

function createCustomRoleObject(name, privileges = [], inheritedRoles = []) {
    return new CustomRole(name, privileges, inheritedRoles);
}

function formatRoleForDisplay(role) {
    if (typeof role === 'string') {
        return BUILTIN_ROLES[role] || { role, description: 'Custom role' };
    }
    
    if (role.role && BUILTIN_ROLES[role.role]) {
        return BUILTIN_ROLES[role.role];
    }
    
    return {
        role: role.role || role,
        description: role.description || 'Custom role',
        isCustom: true
    };
}

module.exports = { 
    createUser, 
    updateUser, 
    deleteUser, 
    validateAndNormalizeMongoURI,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    listRoles,
    getBuiltinRoles,
    createCustomRoleObject,
    formatRoleForDisplay,
    BUILTIN_ROLES,
    CustomRole
}