const express = require('express');
const { MongoClient } = require('mongodb');
const ejs = require('ejs');
const templates = require('./templtes/index');
const { createUser, updateUser, deleteUser, validateAndNormalizeMongoURI } = require('./lib/index');

const app = express();
const PORT = process.env.PORT || 3000;

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
        name: 'John Doe',
        password: 'hashed_password_1',
        createdAt: new Date('2023-01-15')
    },
    {
        _id: '507f1f77bcf86cd799439012',
        name: 'Jane Smith',
        password: 'hashed_password_2',
        createdAt: new Date('2023-02-20')
    },
    {
        _id: '507f1f77bcf86cd799439013',
        name: 'Bob Johnson',
        password: 'hashed_password_3',
        createdAt: new Date('2023-03-10')
    }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
            body: ejs.render(templates.index, { isConnected: isConnected || demoMode, users })
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
        if (!db) {
            return res.status(400).json({ error: 'Not connected to database' });
        }
        const { name, password } = req.body;
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        const existingUser = await db.command({
            usersInfo: { user: name, db: db.databaseName }
        });
        if (existingUser.users.length > 0) {
            return res.status(400).json({ error: 'User with this name already exists' });
        }

        await createUser(uri, db, { name, password });

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

        const { id, password } = req.body;

        // Check if user already exists for other users
        const existingUser = await db.command({
            usersInfo: { user: id.split('.')[1], db: db.databaseName }
        });
        if (existingUser.users.length > 0 && existingUser.users[0]._id !== id) {
            return res.status(400).json({ error: 'User with this name already exists' });
        }

        await updateUser(uri, db, { name: id.split('.')[1], password });

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


        console.log('Deleting user with ID:', id);

        await deleteUser(uri, db, id.split('.')[1]);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
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