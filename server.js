const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const ejs = require('ejs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Global variables
let mongoClient = null;
let db = null;
let isConnected = false;

// Demo mode data for testing when MongoDB is not available
let demoMode = false;
let demoUsers = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 28,
    role: 'Admin',
    createdAt: new Date('2023-01-15')
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    age: 32,
    role: 'Manager',
    createdAt: new Date('2023-02-20')
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    age: 25,
    role: 'User',
    createdAt: new Date('2023-03-10')
  }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Embedded EJS Templates
const templates = {
  layout: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB User Management</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .header h1 {
            color: #4a5568;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        
        .connection-status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 500;
            margin-top: 10px;
        }
        
        .status-connected {
            background: #48bb78;
            color: white;
        }
        
        .status-disconnected {
            background: #f56565;
            color: white;
        }
        
        .connection-form {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #4a5568;
        }
        
        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a67d8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .btn-success {
            background: #48bb78;
            color: white;
        }
        
        .btn-success:hover {
            background: #38a169;
        }
        
        .btn-danger {
            background: #f56565;
            color: white;
        }
        
        .btn-danger:hover {
            background: #e53e3e;
        }
        
        .btn-warning {
            background: #ed8936;
            color: white;
        }
        
        .btn-warning:hover {
            background: #dd6b20;
        }
        
        .dashboard {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .dashboard-header h2 {
            color: #4a5568;
            font-size: 1.8rem;
        }
        
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .user-card {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s;
        }
        
        .user-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .user-card h3 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 1.2rem;
        }
        
        .user-card p {
            color: #718096;
            margin-bottom: 8px;
        }
        
        .user-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .user-actions .btn {
            padding: 8px 16px;
            font-size: 14px;
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            position: relative;
            background-color: white;
            margin: 5% auto;
            padding: 0;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            padding: 20px 30px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            color: #4a5568;
            font-size: 1.4rem;
        }
        
        .close {
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            color: #a0aec0;
            transition: color 0.3s;
        }
        
        .close:hover {
            color: #f56565;
        }
        
        .modal-body {
            padding: 30px;
        }
        
        .modal-footer {
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 15px;
        }
        
        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .alert-success {
            background: #c6f6d5;
            color: #22543d;
            border: 1px solid #9ae6b4;
        }
        
        .alert-danger {
            background: #fed7d7;
            color: #742a2a;
            border: 1px solid #feb2b2;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #a0aec0;
        }
        
        .empty-state i {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .empty-state h3 {
            margin-bottom: 10px;
            color: #718096;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .dashboard-header {
                flex-direction: column;
                align-items: stretch;
            }
            
            .users-grid {
                grid-template-columns: 1fr;
            }
            
            .modal-content {
                width: 95%;
                margin: 10% auto;
            }
            
            .user-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <%- body %>
    </div>

    <script>
        // Modal functionality
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    closeModal(modal.id);
                }
            });
        }

        // Form submission handlers
        async function submitForm(formId, actionUrl, method, successMessage) {
            const form = document.getElementById(formId);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch(actionUrl, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(successMessage, 'success');
                    closeModal(form.closest('.modal').id);
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showAlert(result.error || 'An error occurred', 'danger');
                }
            } catch (error) {
                showAlert('Network error: ' + error.message, 'danger');
            }
        }

        function showAlert(message, type) {
            // Escape HTML to prevent XSS
            const escapedMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const alertHtml = \`<div class="alert alert-\${type}">\${escapedMessage}</div>\`;
            const alertContainer = document.createElement('div');
            alertContainer.innerHTML = alertHtml;
            document.body.appendChild(alertContainer);
            
            setTimeout(() => {
                alertContainer.remove();
            }, 5000);
        }

        // Edit user functionality
        function editUser(user) {
            document.getElementById('editUserId').value = user._id;
            document.getElementById('editUserName').value = user.name;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserAge').value = user.age;
            document.getElementById('editUserRole').value = user.role;
            openModal('editUserModal');
        }

        // Delete user functionality
        function deleteUser(userId, userName) {
            document.getElementById('deleteUserId').value = userId;
            document.getElementById('deleteUserName').textContent = userName;
            openModal('deleteUserModal');
        }

        // Connection form handler
        async function connectToDatabase() {
            const form = document.getElementById('connectionForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert('Connected to database successfully!', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showAlert(result.error || 'Failed to connect to database', 'danger');
                }
            } catch (error) {
                showAlert('Network error: ' + error.message, 'danger');
            }
        }
    </script>
</body>
</html>
  `,

  index: `
<% if (!isConnected) { %>
    <div class="header">
        <h1>MongoDB User Management</h1>
        <div class="connection-status status-disconnected">
            ● Disconnected
        </div>
    </div>

    <div class="connection-form">
        <h2>Connect to MongoDB</h2>
        <form id="connectionForm" onsubmit="event.preventDefault(); connectToDatabase();">
            <div class="form-group">
                <label for="uri">MongoDB Connection URI:</label>
                <input type="text" id="uri" name="uri" class="form-control" 
                       placeholder="mongodb://localhost:27017/usermanagement" required>
            </div>
            <button type="submit" class="btn btn-primary">Connect</button>
        </form>
    </div>
<% } else { %>
    <div class="header">
        <h1>MongoDB User Management</h1>
        <div class="connection-status status-connected">
            ● Connected
        </div>
    </div>

    <div class="dashboard">
        <div class="dashboard-header">
            <h2>Users Dashboard</h2>
            <button class="btn btn-success" onclick="openModal('addUserModal')">
                + Add New User
            </button>
        </div>

        <% if (users && users.length > 0) { %>
            <div class="users-grid">
                <% users.forEach(user => { %>
                    <div class="user-card">
                        <h3><%= user.name %></h3>
                        <p><strong>Email:</strong> <%= user.email %></p>
                        <p><strong>Age:</strong> <%= user.age %></p>
                        <p><strong>Role:</strong> <%= user.role %></p>
                        <div class="user-actions">
                            <button class="btn btn-warning" 
                                    onclick="editUser({_id: '<%- user._id %>', name: '<%- user.name.replace(/'/g, '\\\'') %>', email: '<%- user.email.replace(/'/g, '\\\'') %>', age: <%- user.age %>, role: '<%- user.role.replace(/'/g, '\\\'') %>'})">
                                Edit
                            </button>
                            <button class="btn btn-danger" 
                                    onclick="deleteUser('<%- user._id %>', '<%- user.name.replace(/'/g, '\\\'') %>')">
                                Delete
                            </button>
                        </div>
                    </div>
                <% }) %>
            </div>
        <% } else { %>
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 20px;">👥</div>
                <h3>No users found</h3>
                <p>Add your first user to get started!</p>
            </div>
        <% } %>
    </div>

    <!-- Add User Modal -->
    <div id="addUserModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New User</h3>
                <span class="close" onclick="closeModal('addUserModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="addUserForm">
                    <div class="form-group">
                        <label for="addUserName">Name:</label>
                        <input type="text" id="addUserName" name="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="addUserEmail">Email:</label>
                        <input type="email" id="addUserEmail" name="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="addUserAge">Age:</label>
                        <input type="number" id="addUserAge" name="age" class="form-control" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="addUserRole">Role:</label>
                        <select id="addUserRole" name="role" class="form-control" required>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="User">User</option>
                            <option value="Manager">Manager</option>
                            <option value="Guest">Guest</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" onclick="closeModal('addUserModal')">Cancel</button>
                <button type="button" class="btn btn-success" 
                        onclick="submitForm('addUserForm', '/users', 'POST', 'User added successfully!')">
                    Add User
                </button>
            </div>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div id="editUserModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit User</h3>
                <span class="close" onclick="closeModal('editUserModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" id="editUserId" name="id">
                    <div class="form-group">
                        <label for="editUserName">Name:</label>
                        <input type="text" id="editUserName" name="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="editUserEmail">Email:</label>
                        <input type="email" id="editUserEmail" name="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="editUserAge">Age:</label>
                        <input type="number" id="editUserAge" name="age" class="form-control" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="editUserRole">Role:</label>
                        <select id="editUserRole" name="role" class="form-control" required>
                            <option value="Admin">Admin</option>
                            <option value="User">User</option>
                            <option value="Manager">Manager</option>
                            <option value="Guest">Guest</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" onclick="closeModal('editUserModal')">Cancel</button>
                <button type="button" class="btn btn-warning" 
                        onclick="submitForm('editUserForm', '/users/update', 'PUT', 'User updated successfully!')">
                    Update User
                </button>
            </div>
        </div>
    </div>

    <!-- Delete User Modal -->
    <div id="deleteUserModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Delete User</h3>
                <span class="close" onclick="closeModal('deleteUserModal')">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete user <strong id="deleteUserName"></strong>?</p>
                <p style="color: #f56565; font-weight: 500;">This action cannot be undone.</p>
                <form id="deleteUserForm">
                    <input type="hidden" id="deleteUserId" name="id">
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="closeModal('deleteUserModal')">Cancel</button>
                <button type="button" class="btn btn-danger" 
                        onclick="submitForm('deleteUserForm', '/users/delete', 'DELETE', 'User deleted successfully!')">
                    Delete User
                </button>
            </div>
        </div>
    </div>
<% } %>
  `
};

// Routes
app.get('/', async (req, res) => {
  try {
    let users = [];
    if (isConnected && db) {
      users = await db.collection('users').find({}).toArray();
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

// Connect to MongoDB
app.post('/connect', async (req, res) => {
  try {
    const { uri } = req.body;
    
    if (!uri) {
      return res.status(400).json({ error: 'MongoDB URI is required' });
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
    const dbName = uri.split('/').pop().split('?')[0] || 'usermanagement';
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

    const { name, email, age, role } = req.body;
    
    if (!name || !email || !age || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (demoMode) {
      // Demo mode - simulate user creation
      const existingUser = demoUsers.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const newUser = {
        _id: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name,
        email,
        age: parseInt(age),
        role,
        createdAt: new Date()
      };
      demoUsers.push(newUser);
      return res.json({ success: true, userId: newUser._id, message: 'User created successfully' });
    }

    // Check if email already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = {
      name,
      email,
      age: parseInt(age),
      role,
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    res.json({ success: true, userId: result.insertedId, message: 'User created successfully' });
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

    const { id, name, email, age, role } = req.body;
    
    if (!id || !name || !email || !age || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (demoMode) {
      // Demo mode - simulate user update
      const userIndex = demoUsers.findIndex(u => u._id === id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingUser = demoUsers.find(u => u.email === email && u._id !== id);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      demoUsers[userIndex] = {
        ...demoUsers[userIndex],
        name,
        email,
        age: parseInt(age),
        role,
        updatedAt: new Date()
      };
      return res.json({ success: true, message: 'User updated successfully' });
    }

    // Check if email already exists for other users
    const existingUser = await db.collection('users').findOne({ 
      email, 
      _id: { $ne: new ObjectId(id) } 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          name, 
          email, 
          age: parseInt(age), 
          role,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    if (demoMode) {
      // Demo mode - simulate user deletion
      const userIndex = demoUsers.findIndex(u => u._id === id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      demoUsers.splice(userIndex, 1);
      return res.json({ success: true, message: 'User deleted successfully' });
    }

    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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