const express = require('express');
const { MongoClient } = require('mongodb');
const ejs = require('ejs');
const templates = require('./templtes/index');
const { 
    createUser, 
    updateUser, 
    deleteUser, 
    validateAndNormalizeMongoURI,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    listRoles,
    getBuiltinRoles,
    formatRoleForDisplay
} = require('./lib/index');

const app = express();
const PORT = process.env.PORT || 3001;

// Global variables
let mongoClient = null;
let db = null;
let isConnected = false;
let uri = '';


// Demo mode data for testing when MongoDB is not available
let demoMode = false;
let demoUsers = [
    {
        _id: '507f1f77bcf86cd799439011',
        name: 'admin',
        password: 'hashed_password_1',
        createdAt: new Date('2023-01-15'),
        roles: [{ role: 'root', db: 'admin' }]
    },
    {
        _id: '507f1f77bcf86cd799439012',
        name: 'Jane Smith',
        password: 'hashed_password_2',
        createdAt: new Date('2023-02-20'),
        roles: [{ role: 'readWrite', db: 'admin' }]
    },
    {
        _id: '507f1f77bcf86cd799439013',
        name: 'Bob Johnson',
        password: 'hashed_password_3',
        createdAt: new Date('2023-03-10'),
        roles: [{ role: 'read', db: 'admin' }]
    }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs');


// Routes
app.get('/', async (req, res) => {
    try {
        let users = [];
        if (isConnected && db) {
            const results = await db.command({
                usersInfo: 1,
                showCredentials: false,
                showCustomData: false,
                showPrivileges: false,
                showAuthenticationRestrictions: false,
                filter: {}
            });
            console.log(results);
            users = results.users.map(user => ({
                _id: user._id,
                name: user._id,
                createdAt: user.customData?.createdAt || 'N/A'
            }));
            console.log(users);
        } else if (demoMode) {
            users = demoUsers;
        }

        const html = ejs.render(templates.layout, {
            body: ejs.render(templates.index, { isConnected: isConnected || demoMode, users, isDemoMode: demoMode })
        });

        res.send(html);
    } catch (error) {
        console.error('Error rendering page:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate MongoDB URI endpoint
app.post('/validate-uri', async (req, res) => {
    try {
        const { uri: bodyUri } = req.body;

        if (!bodyUri) {
            return res.status(400).json({ error: 'MongoDB URI is required' });
        }

        const normalizedUri = validateAndNormalizeMongoURI(bodyUri);

        res.json({
            valid: true,
            originalUri: bodyUri,
            normalizedUri: normalizedUri,
            wasModified: normalizedUri !== bodyUri.trim()
        });
    } catch (error) {
        res.status(400).json({
            valid: false,
            error: error.message
        });
    }
});

// Connect to MongoDB
app.post('/connect', async (req, res) => {
    try {
        const { uri: bodyUri } = req.body;

        if (!bodyUri) {
            return res.status(400).json({ error: 'MongoDB URI is required' });
        }

        // Validate and normalize the URI
        try {
            uri = validateAndNormalizeMongoURI(bodyUri);
        } catch (validationError) {
            return res.status(400).json({ error: validationError.message });
        }

        // Special demo mode trigger
        if (uri.includes('demo') || uri.includes('test-demo')) {
            demoMode = true;
            isConnected = false; // Keep MongoDB connection false but enable demo mode
            return res.json({ success: true, message: 'Connected to demo database successfully' });
        }

        // Close existing connection if any
        if (mongoClient) {
            await mongoClient.close();
        }

        // Create new connection
        mongoClient = new MongoClient(uri);
        await mongoClient.connect();

        // Test the connection
        await mongoClient.db().admin().ping();

        // Extract database name from URI or use default
        const dbName = 'admin';
        db = mongoClient.db(dbName);

        isConnected = true;
        demoMode = false;

        res.json({ success: true, message: 'Connected to MongoDB successfully' });
    } catch (error) {
        console.error('MongoDB connection error:', error);
        isConnected = false;
        mongoClient = null;
        db = null;
        res.status(500).json({ error: 'Failed to connect to MongoDB: ' + error.message });
    }
});

// Create user
app.post('/users', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        if (demoMode) {
            return res.json({ success: true, message: 'User created successfully (demo mode)' });
        }

        if (!db) {
            return res.status(400).json({ error: 'Not connected to database' });
        }
        const { name, password, roles = [] } = req.body;
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        const existingUser = await db.command({
            usersInfo: { user: name, db: db.databaseName }
        });
        if (existingUser.users.length > 0) {
            return res.status(400).json({ error: 'User with this name already exists' });
        }

        await createUser(uri, db, { name, password, roles });

        res.json({ success: true, message: 'User created successfully' });


    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
});

// Update user
app.put('/users/update', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        const { id, password, roles } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user already exists for other users
        const existingUser = await db.command({
            usersInfo: { user: id.split('.')[1], db: db.databaseName }
        });
        if (existingUser.users.length > 0 && existingUser.users[0]._id !== id) {
            return res.status(400).json({ error: 'User with this name already exists' });
        }

        const updateData = { name: id.split('.')[1] };
        if (password) updateData.password = password;
        if (roles) updateData.roles = roles;
        
        await updateUser(uri, db, updateData);

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user: ' + error.message });
    }
});

// Delete user
app.delete('/users/delete', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const userName = id.split('.')[1];

        if (demoMode) {
            // Demo mode validations
            const userToDelete = demoUsers.find(user => user.name === userName);
            const remainingUsers = demoUsers.filter(user => user.name !== userName);
            
            if (remainingUsers.length === 0) {
                return res.status(400).json({ error: 'Cannot delete the last user. At least one user must remain to access the database.' });
            }
            
            // Check if user has root role or critical administrative roles
            if (userToDelete?.roles?.some(role => 
                role.role === 'root' || 
                role.role === 'userAdminAnyDatabase' ||
                role.role === 'dbAdminAnyDatabase' ||
                role.role === 'clusterAdmin'
            )) {
                return res.status(400).json({ error: 'Root users and users with administrative privileges cannot be deleted for security reasons.' });
            }
            
            return res.json({ success: true, message: 'User deleted successfully (demo mode)' });
        }

        // Real MongoDB validations
        // First, get all users to count them
        const allUsersResult = await db.command({
            usersInfo: 1,
            showCredentials: false,
            showCustomData: false,
            showPrivileges: false,
            showAuthenticationRestrictions: false,
            filter: {}
        });

        const totalUsers = allUsersResult.users.length;
        
        // Prevent deleting the last user
        if (totalUsers <= 1) {
            return res.status(400).json({ error: 'Cannot delete the last user. At least one user must remain to access the database.' });
        }

        // Get detailed user info including roles to check for root privileges
        const userDetailsResult = await db.command({
            usersInfo: { user: userName, db: db.databaseName },
            showCredentials: false,
            showCustomData: false,
            showPrivileges: false,
            showAuthenticationRestrictions: false
        });

        if (userDetailsResult.users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userToDelete = userDetailsResult.users[0];
        
        // Check if user has root role or other critical administrative roles
        const hasRootRole = userToDelete.roles?.some(role => 
            role.role === 'root' || 
            role.role === 'userAdminAnyDatabase' ||
            role.role === 'dbAdminAnyDatabase' ||
            role.role === 'clusterAdmin'
        );

        if (hasRootRole) {
            return res.status(400).json({ error: 'Root users and users with administrative privileges cannot be deleted for security reasons.' });
        }

        console.log('Deleting user with ID:', id);

        await deleteUser(uri, db, userName);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }
});

// Get built-in roles
app.get('/roles/builtin', (req, res) => {
    try {
        const builtinRoles = getBuiltinRoles();
        res.json({ roles: builtinRoles });
    } catch (error) {
        console.error('Error getting built-in roles:', error);
        res.status(500).json({ error: 'Failed to get built-in roles' });
    }
});

// List custom roles
app.get('/roles/custom', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        if (demoMode) {
            // Return demo custom roles
            const demoRoles = [
                {
                    role: 'dataAnalyst',
                    privileges: [
                        {
                            resource: { db: 'analytics' },
                            actions: ['find', 'listCollections']
                        }
                    ],
                    roles: [],
                    isCustom: true
                }
            ];
            return res.json({ roles: demoRoles });
        }

        const rolesOutput = await listRoles(uri, db);
        // Parse the MongoDB output to extract roles
        let customRoles = [];
        try {
            // The output might need parsing depending on mongosh format
            customRoles = JSON.parse(rolesOutput);
        } catch (parseError) {
            console.log('Could not parse roles output:', rolesOutput);
            customRoles = [];
        }

        res.json({ roles: customRoles });
    } catch (error) {
        console.error('Error listing custom roles:', error);
        res.status(500).json({ error: 'Failed to list custom roles: ' + error.message });
    }
});

// Create custom role
app.post('/roles/custom', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        const { roleName, privileges = [], inheritedRoles = [] } = req.body;

        if (!roleName) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        if (demoMode) {
            return res.json({ success: true, message: 'Custom role created successfully (demo mode)' });
        }

        const roleObj = {
            role: roleName,
            privileges: privileges,
            roles: inheritedRoles
        };

        await createCustomRole(uri, db, roleObj);

        res.json({ success: true, message: 'Custom role created successfully' });
    } catch (error) {
        console.error('Error creating custom role:', error);
        res.status(500).json({ error: 'Failed to create custom role: ' + error.message });
    }
});

// Update custom role
app.put('/roles/custom/:roleName', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        const { roleName } = req.params;
        const { privileges, inheritedRoles } = req.body;

        if (demoMode) {
            return res.json({ success: true, message: 'Custom role updated successfully (demo mode)' });
        }

        const updates = {};
        if (privileges !== undefined) updates.privileges = privileges;
        if (inheritedRoles !== undefined) updates.roles = inheritedRoles;

        await updateCustomRole(uri, db, roleName, updates);

        res.json({ success: true, message: 'Custom role updated successfully' });
    } catch (error) {
        console.error('Error updating custom role:', error);
        res.status(500).json({ error: 'Failed to update custom role: ' + error.message });
    }
});

// Delete custom role
app.delete('/roles/custom/:roleName', async (req, res) => {
    try {
        if (!isConnected && !demoMode) {
            return res.status(400).json({ error: 'Not connected to database' });
        }

        const { roleName } = req.params;

        if (demoMode) {
            return res.json({ success: true, message: 'Custom role deleted successfully (demo mode)' });
        }

        await deleteCustomRole(uri, db, roleName);

        res.json({ success: true, message: 'Custom role deleted successfully' });
    } catch (error) {
        console.error('Error deleting custom role:', error);
        res.status(500).json({ error: 'Failed to delete custom role: ' + error.message });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('MongoDB User Management Application');
    console.log('Please connect to your MongoDB database to begin managing users.');
});