const templates = {
    layout: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB User Management</title>
    <link rel="stylesheet" href="/css/design-system.css">
    <style>
        /* Custom app styles */
        .app-header {
            background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
            color: white;
            padding: var(--space-xl) 0;
            margin-bottom: var(--space-xl);
        }
        
        .app-header__content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--space-lg);
        }
        
        .app-title {
            color: white;
            margin-bottom: var(--space-sm);
        }
        
        .app-subtitle {
            color: rgba(255, 255, 255, 0.8);
            font-size: var(--font-size-lg);
        }
        
        .connection-form {
            background: white;
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
            box-shadow: var(--shadow-lg);
            margin-bottom: var(--space-xl);
        }
        
        .dashboard {
            background: white;
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
            box-shadow: var(--shadow-lg);
        }
        
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: var(--space-lg);
            margin-top: var(--space-lg);
        }
        
        .connection-examples {
            background-color: var(--gray-50);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-top: var(--space-md);
        }
        
        .connection-examples code {
            display: block;
            margin: var(--space-xs) 0;
            padding: var(--space-xs) var(--space-sm);
            background-color: white;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-xs);
        }
        
        @media (max-width: 768px) {
            .app-header__content {
                padding: 0 var(--space-md);
            }
            
            .container {
                padding: var(--space-md);
            }
            
            .users-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="app-header">
        <div class="app-header__content">
            <div class="group group--apart group--responsive">
                <div class="stack stack--sm">
                    <h1 class="title--h1 app-title">MongoDB User Management</h1>
                    <p class="app-subtitle">Manage database users with ease</p>
                </div>
                <div id="connection-status-container"></div>
            </div>
        </div>
    </div>

    <div class="container">
        <%- body %>
    </div>

    <!-- Include JavaScript files -->
    <script src="/js/icons.js"></script>
    <script src="/js/components.js"></script>
    
    <script>
        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            // Setup URI validation if connection form exists
            if (typeof ConnectionManager !== 'undefined') {
                ConnectionManager.setupURIValidation();
            }
            
            // Close modals when clicking outside
            document.addEventListener('click', function(event) {
                if (event.target.classList.contains('modal')) {
                    if (typeof Modal !== 'undefined') {
                        Modal.close(event.target.id);
                    }
                }
            });
            
            // Handle escape key to close modals
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    if (typeof Modal !== 'undefined') {
                        Modal.closeAll();
                    }
                }
            });
        });
    </script>
</body>
</html>
`,

    index: `
<% if (!isConnected && !isDemoMode) { %>
    <div class="connection-form">
        <div class="stack stack--lg">
            <div class="stack stack--sm">
                <h2 class="title--h3">Connect to MongoDB</h2>
                <p class="text text--dimmed">
                    Enter your MongoDB connection URI to get started. The URI will be automatically updated to use the 'admin' database if not specified.
                </p>
            </div>

            <form id="connectionForm" onsubmit="event.preventDefault(); ConnectionManager.connect();">
                <div class="stack stack--md">
                    <div class="form-group">
                        <label class="form-label" for="uri">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                            MongoDB Connection URI
                        </label>
                        <input 
                            type="text" 
                            id="uri" 
                            name="uri" 
                            class="input" 
                            placeholder="mongodb://localhost:27017/?directConnection=true"
                            title="Enter your MongoDB connection URI"
                            required
                        >
                    </div>

                    <div class="connection-examples">
                        <div class="text text--sm text--dimmed" style="margin-bottom: var(--space-sm);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Connection Examples:
                        </div>
                        <code>mongodb://localhost:27017/?directConnection=true</code>
                        <code>mongodb://username:password@localhost:27017/?authSource=admin</code>
                        <code>mongodb+srv://cluster.mongodb.net/?retryWrites=true</code>
                        <code>demo (for demo mode)</code>
                    </div>

                    <button type="submit" class="btn btn--filled btn--md">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                            <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>
                        Connect to MongoDB
                    </button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        // Update connection status in header
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof UIComponents !== 'undefined') {
                document.getElementById('connection-status-container').innerHTML = 
                    '<span class="badge badge--error"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Disconnected</span>';
            }
        });
    </script>
<% } else { %>
    <div class="dashboard">
        <div class="stack stack--xl">
            <div class="group group--apart group--responsive">
                <div class="stack stack--xs">
                    <h2 class="title--h2">Users Dashboard</h2>
                    <p class="text text--dimmed">Manage your MongoDB database users</p>
                </div>
                <div class="group group--sm">
                    <button class="btn btn--success btn--md" onclick="Modal.open('addUserModal')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Add New User
                    </button>
                    <button class="btn btn--outline btn--md" onclick="RoleManager.openManageRolesModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <path d="M9 12l2 2 4-4"></path>
                            <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-3l-1-1h-4l-1 1H9c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1"></path>
                            <path d="M3 12c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1h3l1 1h4l1-1h3c.552 0 1-.448 1-1v-3c0-.552-.448-1-1-1"></path>
                        </svg>
                        Manage Roles
                    </button>
                </div>
            </div>

            <% if (users && users.length > 0) { %>
                <div class="stack stack--sm">
                    <div class="group group--sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span class="text text--dimmed"><%= users.length %> user<%= users.length === 1 ? '' : 's' %> found</span>
                    </div>
                    <div class="users-grid">
                        <% users.forEach(user => { %>
                            <div class="card">
                                <div class="card__body">
                                    <div class="stack stack--sm">
                                        <div class="group group--apart">
                                            <h3 class="title--h5"><%= user.name %></h3>
                                            <span class="badge badge--success">Active</span>
                                        </div>
                                        <div class="group group--sm text--dimmed">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <circle cx="12" cy="16" r="1"></circle>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                            <span>Password protected</span>
                                        </div>
                                        <% if (user.createdAt && user.createdAt !== 'N/A') { %>
                                            <div class="text text--xs text--dimmed">
                                                Created: <%= new Date(user.createdAt).toLocaleDateString() %>
                                            </div>
                                        <% } %>
                                    </div>
                                </div>
                                <div class="card__footer">
                                    <div class="group group--sm">
                                        <button type="button" class="btn btn--warning btn--xs" onclick="UserManager.editUser('<%- user._id %>', '<%- user.name.replace(/'/g, "\\'") %>')">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                            Edit
                                        </button>
                                        <button type="button" class="btn btn--error btn--xs" onclick="UserManager.deleteUser('<%- user._id %>', '<%- user.name.replace(/'/g, "\\'") %>')">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                                <polyline points="3,6 5,6 21,6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        <% }) %>
                    </div>
                </div>
            <% } else { %>
                <div class="empty-state">
                    <div class="empty-state__icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <div class="stack stack--sm">
                        <h3 class="title--h4">No users found</h3>
                        <p class="text text--dimmed">Add your first user to get started managing your MongoDB database.</p>
                        <div style="margin-top: var(--space-lg);">
                            <button class="btn btn--filled btn--md" onclick="Modal.open('addUserModal')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Add Your First User
                            </button>
                        </div>
                    </div>
                </div>
            <% } %>
        </div>
    </div>

    <!-- Add User Modal -->
    <div id="addUserModal" class="modal">
        <div class="modal__content">
            <div class="modal__header">
                <h3 class="title--h4">Add New User</h3>
                <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('addUserModal')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal__body">
                <form id="addUserForm" class="stack stack--md">
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            User Name
                        </label>
                        <input type="text" id="addUserName" name="name" class="input" placeholder="Enter username" required>
                        <div class="form-help">Choose a unique username for the new user</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <circle cx="12" cy="16" r="1"></circle>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Password
                        </label>
                        <input type="password" id="addUserPassword" name="password" class="input" placeholder="Enter secure password" required>
                        <div class="form-help">Use a strong password with at least 8 characters</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <path d="M9 12l2 2 4-4"></path>
                                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-3l-1-1h-4l-1 1H9c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1"></path>
                            </svg>
                            Roles
                        </label>
                        <select multiple id="addUserRoles" name="roles" class="input" style="min-height: 120px;">
                            <option value="">Loading roles...</option>
                        </select>
                        <div class="form-help">Hold Ctrl/Cmd to select multiple roles. Leave empty for default readWrite role.</div>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button type="button" class="btn btn--outline btn--md" onclick="Modal.close('addUserModal')">
                    Cancel
                </button>
                <button 
                    type="button" 
                    class="btn btn--success btn--md" 
                    onclick="UserManager.submitForm('addUserForm', '/users', 'POST', 'User created successfully!')"
                    data-original-text="Create User"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17,21 17,13 7,13 7,21"></polyline>
                        <polyline points="7,3 7,8 15,8"></polyline>
                    </svg>
                    Create User
                </button>
            </div>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div id="editUserModal" class="modal">
        <div class="modal__content">
            <div class="modal__header">
                <h3 class="title--h4">Edit User</h3>
                <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('editUserModal')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal__body">
                <form id="editUserForm" class="stack stack--md">
                    <input type="hidden" id="editUserId" name="id">
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            User Name
                        </label>
                        <input type="text" id="editUserName" name="name" class="input" placeholder="Enter username" required readonly>
                        <div class="form-help">Username cannot be changed after creation</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <circle cx="12" cy="16" r="1"></circle>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            New Password
                        </label>
                        <input type="password" id="editUserPassword" name="password" class="input" placeholder="Enter new password">
                        <div class="form-help">Enter a new password for this user (leave empty to keep current password)</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <path d="M9 12l2 2 4-4"></path>
                                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-3l-1-1h-4l-1 1H9c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1"></path>
                            </svg>
                            Roles
                        </label>
                        <select multiple id="editUserRoles" name="roles" class="input" style="min-height: 120px;">
                            <option value="">Loading roles...</option>
                        </select>
                        <div class="form-help">Hold Ctrl/Cmd to select multiple roles</div>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button type="button" class="btn btn--outline btn--md" onclick="Modal.close('editUserModal')">
                    Cancel
                </button>
                <button 
                    type="button" 
                    class="btn btn--warning btn--md" 
                    onclick="UserManager.submitForm('editUserForm', '/users/update', 'PUT', 'User updated successfully!')"
                    data-original-text="Update User"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17,21 17,13 7,13 7,21"></polyline>
                        <polyline points="7,3 7,8 15,8"></polyline>
                    </svg>
                    Update User
                </button>
            </div>
        </div>
    </div>

    <!-- Delete User Modal -->
    <div id="deleteUserModal" class="modal">
        <div class="modal__content">
            <div class="modal__header">
                <h3 class="title--h4">Delete User</h3>
                <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('deleteUserModal')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal__body">
                <div class="stack stack--md">
                    <div class="alert alert--error">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                            <strong>This action cannot be undone!</strong>
                            <br>Are you sure you want to delete user <strong id="deleteUserName"></strong>?
                        </div>
                    </div>
                    <form id="deleteUserForm">
                        <input type="hidden" id="deleteUserId" name="id">
                    </form>
                </div>
            </div>
            <div class="modal__footer">
                <button type="button" class="btn btn--outline btn--md" onclick="Modal.close('deleteUserModal')">
                    Cancel
                </button>
                <button 
                    type="button" 
                    class="btn btn--error btn--md" 
                    onclick="UserManager.submitForm('deleteUserForm', '/users/delete', 'DELETE', 'User deleted successfully!')"
                    data-original-text="Delete User"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete User
                </button>
            </div>
        </div>
    </div>

    <!-- Manage Roles Modal -->
    <div id="manageRolesModal" class="modal">
        <div class="modal__content" style="max-width: 800px;">
            <div class="modal__header">
                <h3 class="title--h4">Manage Roles</h3>
                <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('manageRolesModal')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal__body">
                <div class="stack stack--lg">
                    <div class="group group--apart">
                        <h4 class="title--h5">Built-in Roles</h4>
                    </div>
                    <div id="builtinRolesList" class="stack stack--sm">
                        <p class="text text--dimmed">Loading built-in roles...</p>
                    </div>
                    
                    <div class="group group--apart">
                        <h4 class="title--h5">Custom Roles</h4>
                        <button class="btn btn--success btn--sm" onclick="RoleManager.openCreateRoleModal()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Create Custom Role
                        </button>
                    </div>
                    <div id="customRolesList" class="stack stack--sm">
                        <p class="text text--dimmed">Loading custom roles...</p>
                    </div>
                </div>
            </div>
            <div class="modal__footer">
                <button type="button" class="btn btn--outline btn--md" onclick="Modal.close('manageRolesModal')">
                    Close
                </button>
            </div>
        </div>
    </div>

    <!-- Create Custom Role Modal -->
    <div id="createRoleModal" class="modal">
        <div class="modal__content" style="max-width: 700px;">
            <div class="modal__header">
                <h3 class="title--h4">Create Custom Role</h3>
                <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('createRoleModal')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal__body">
                <form id="createRoleForm" class="stack stack--lg">
                    <div class="form-group">
                        <label class="form-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                <path d="M9 12l2 2 4-4"></path>
                                <path d="M21 12c.552 0 1-.448 1-1V8c0-.552-.448-1-1-1h-3l-1-1h-4l-1 1H9c-.552 0-1 .448-1 1v3c0 .552.448 1 1 1"></path>
                            </svg>
                            Role Name
                        </label>
                        <input type="text" name="roleName" class="input" placeholder="Enter role name" required>
                        <div class="form-help">Choose a unique name for your custom role</div>
                    </div>
                    
                    <div class="stack stack--sm">
                        <div class="group group--apart">
                            <label class="form-label">Privileges</label>
                            <button type="button" class="btn btn--outline btn--xs" onclick="RoleManager.addPrivilegeRow()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add Privilege
                            </button>
                        </div>
                        <div id="privilegesContainer" class="stack stack--sm">
                            <!-- Privilege rows will be added here -->
                        </div>
                        <div class="form-help">Define what databases and collections this role can access and what actions it can perform</div>
                    </div>
                </form>
            </div>
            <div class="modal__footer">
                <button type="button" class="btn btn--outline btn--md" onclick="Modal.close('createRoleModal')">
                    Cancel
                </button>
                <button type="button" class="btn btn--success btn--md" onclick="RoleManager.submitCreateRole()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17,21 17,13 7,13 7,21"></polyline>
                        <polyline points="7,3 7,8 15,8"></polyline>
                    </svg>
                    Create Role
                </button>
            </div>
        </div>
    </div>

    <script>
        // Update connection status in header
        document.addEventListener('DOMContentLoaded', function() {
            const isDemoMode = <%= isDemoMode || false %>;
            const statusHtml = isDemoMode ? 
                '<span class="badge badge--warning"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Demo Mode</span>' :
                '<span class="badge badge--success"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>Connected</span>';
            
            document.getElementById('connection-status-container').innerHTML = statusHtml;
            
            // Load roles when page loads
            if (typeof RoleManager !== 'undefined') {
                RoleManager.loadBuiltinRoles().then(() => {
                    UserManager.populateRoleSelectors();
                });
                RoleManager.loadCustomRoles();
            }
        });
    </script>
<% } %>
`
};

module.exports = templates;