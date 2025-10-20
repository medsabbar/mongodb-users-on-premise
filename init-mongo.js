// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to admin database
db = db.getSiblingDB('admin');

// Create a user management application user with appropriate permissions
db.createUser({
  user: 'appuser',
  pwd: 'apppassword123',
  roles: [
    {
      role: 'userAdminAnyDatabase',
      db: 'admin'
    },
    {
      role: 'readWriteAnyDatabase',
      db: 'admin'
    },
    {
      role: 'dbAdminAnyDatabase',
      db: 'admin'
    }
  ]
});

print('MongoDB initialization completed successfully');
print('Created application user with user management permissions');
print('Connection URI: mongodb://appuser:apppassword123@mongodb:27017/admin');