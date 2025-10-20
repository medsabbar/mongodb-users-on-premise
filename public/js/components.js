// Reusable UI Components
class UIComponents {
  // Modal component
  static createModal(id, title, content, footer = '') {
    return `
      <div id="${id}" class="modal">
        <div class="modal__content">
          <div class="modal__header">
            <h3 class="title--h4">${title}</h3>
            <button type="button" class="btn btn--subtle btn--xs" onclick="Modal.close('${id}')">
              ${Icons.x(20)}
            </button>
          </div>
          <div class="modal__body">
            ${content}
          </div>
          ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Alert component
  static createAlert(message, type = 'info', dismissible = true) {
    const iconMap = {
      success: Icons.checkCircle(20),
      error: Icons.alertCircle(20),
      warning: Icons.alertCircle(20),
      info: Icons.info(20)
    };

    return `
      <div class="alert alert--${type}">
        ${iconMap[type] || iconMap.info}
        <div class="stack stack--xs" style="flex: 1;">
          <div>${message}</div>
        </div>
        ${dismissible ? `
          <button type="button" class="btn btn--subtle btn--xs" onclick="this.parentElement.remove()">
            ${Icons.x(16)}
          </button>
        ` : ''}
      </div>
    `;
  }

  // Card component
  static createCard(title, content, actions = '', className = '') {
    return `
      <div class="card ${className}">
        ${title ? `
          <div class="card__header">
            <h3 class="title--h5">${title}</h3>
          </div>
        ` : ''}
        <div class="card__body">
          ${content}
        </div>
        ${actions ? `
          <div class="card__footer">
            <div class="group group--sm">
              ${actions}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Form group component
  static createFormGroup(label, input, help = '', error = '') {
    return `
      <div class="form-group">
        <label class="form-label">${label}</label>
        ${input}
        ${help ? `<div class="form-help">${help}</div>` : ''}
        ${error ? `<div class="form-error">${error}</div>` : ''}
      </div>
    `;
  }

  // Badge component
  static createBadge(text, variant = 'gray', icon = '') {
    return `
      <span class="badge badge--${variant}">
        ${icon}
        ${text}
      </span>
    `;
  }

  // Button component
  static createButton(text, variant = 'filled', size = 'sm', icon = '', onClick = '', disabled = false) {
    return `
      <button 
        type="button" 
        class="btn btn--${variant} btn--${size}" 
        ${onClick ? `onclick="${onClick}"` : ''}
        ${disabled ? 'disabled' : ''}
      >
        ${icon}
        ${text}
      </button>
    `;
  }

  // Empty state component
  static createEmptyState(icon, title, description, action = '') {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">${icon}</div>
        <div class="stack stack--sm">
          <h3 class="title--h4">${title}</h3>
          <p class="text text--dimmed">${description}</p>
          ${action ? `<div style="margin-top: var(--space-lg);">${action}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Connection status component
  static createConnectionStatus(isConnected, isDemoMode = false) {
    if (isDemoMode) {
      return UIComponents.createBadge('Demo Mode', 'warning', Icons.settings(16));
    }
    
    return UIComponents.createBadge(
      isConnected ? 'Connected' : 'Disconnected',
      isConnected ? 'success' : 'error',
      isConnected ? Icons.checkCircle(16) : Icons.alertCircle(16)
    );
  }

  // User card component
  static createUserCard(user) {
    const editButton = UIComponents.createButton(
      'Edit', 
      'warning', 
      'xs', 
      Icons.edit(16), 
      `UserManager.editUser('${user._id}', '${user.name.replace(/'/g, "\\'")}')`
    );

    const deleteButton = UIComponents.createButton(
      'Delete', 
      'error', 
      'xs', 
      Icons.trash(16), 
      `UserManager.deleteUser('${user._id}', '${user.name.replace(/'/g, "\\'")}')`
    );

    const content = `
      <div class="stack stack--sm">
        <div class="group group--apart">
          <h3 class="title--h5">${user.name}</h3>
          ${UIComponents.createBadge('Active', 'success')}
        </div>
        <div class="group group--sm text--dimmed">
          ${Icons.lock(16)}
          <span>Password protected</span>
        </div>
        ${user.createdAt && user.createdAt !== 'N/A' ? `
          <div class="text text--xs text--dimmed">
            Created: ${new Date(user.createdAt).toLocaleDateString()}
          </div>
        ` : ''}
      </div>
    `;

    return UIComponents.createCard('', content, `${editButton}${deleteButton}`);
  }
}

// Modal management
class Modal {
  static open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('modal--open');
      document.body.style.overflow = 'hidden';
    }
  }

  static close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('modal--open');
      document.body.style.overflow = 'auto';
    }
  }

  static closeAll() {
    document.querySelectorAll('.modal--open').forEach(modal => {
      modal.classList.remove('modal--open');
    });
    document.body.style.overflow = 'auto';
  }
}

// Role management functions
class RoleManager {
  static builtinRoles = {};
  static customRoles = [];

  static async loadBuiltinRoles() {
    try {
      const response = await fetch('/roles/builtin');
      const result = await response.json();
      if (response.ok) {
        this.builtinRoles = result.roles;
      }
    } catch (error) {
      console.error('Error loading built-in roles:', error);
    }
  }

  static async loadCustomRoles() {
    try {
      const response = await fetch('/roles/custom');
      const result = await response.json();
      if (response.ok) {
        this.customRoles = result.roles;
      }
    } catch (error) {
      console.error('Error loading custom roles:', error);
    }
  }

  static async createCustomRole(roleName, privileges, inheritedRoles) {
    try {
      const response = await fetch('/roles/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleName,
          privileges,
          inheritedRoles
        })
      });

      const result = await response.json();

      if (response.ok) {
        NotificationManager.show(result.message, 'success');
        await this.loadCustomRoles();
        return true;
      } else {
        NotificationManager.show(result.error || 'Failed to create role', 'error');
        return false;
      }
    } catch (error) {
      NotificationManager.show('Network error: ' + error.message, 'error');
      return false;
    }
  }

  static async deleteCustomRole(roleName) {
    try {
      const response = await fetch(`/roles/custom/${roleName}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        NotificationManager.show(result.message, 'success');
        await this.loadCustomRoles();
        return true;
      } else {
        NotificationManager.show(result.error || 'Failed to delete role', 'error');
        return false;
      }
    } catch (error) {
      NotificationManager.show('Network error: ' + error.message, 'error');
      return false;
    }
  }

  static openCreateRoleModal() {
    Modal.open('createRoleModal');
  }

  static async openManageRolesModal() {
    await this.loadBuiltinRoles();
    await this.loadCustomRoles();
    this.displayBuiltinRoles();
    this.displayCustomRoles();
    Modal.open('manageRolesModal');
  }

  static displayBuiltinRoles() {
    const container = document.getElementById('builtinRolesList');
    if (!container) return;

    if (Object.keys(this.builtinRoles).length === 0) {
      container.innerHTML = '<p class="text text--dimmed">No built-in roles available</p>';
      return;
    }

    let html = '';
    Object.entries(this.builtinRoles).forEach(([key, role]) => {
      html += `
        <div class="card">
          <div class="card__body">
            <div class="group group--apart">
              <div class="stack stack--xs">
                <h5 class="title--h6">${role.role}</h5>
                <p class="text text--sm text--dimmed">${role.description}</p>
              </div>
              <span class="badge badge--info">Built-in</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  static displayCustomRoles() {
    const container = document.getElementById('customRolesList');
    if (!container) return;

    if (this.customRoles.length === 0) {
      container.innerHTML = '<p class="text text--dimmed">No custom roles created yet</p>';
      return;
    }

    let html = '';
    this.customRoles.forEach(role => {
      const privilegesCount = role.privileges ? role.privileges.length : 0;
      html += `
        <div class="card">
          <div class="card__body">
            <div class="group group--apart">
              <div class="stack stack--xs">
                <h5 class="title--h6">${role.role}</h5>
                <p class="text text--sm text--dimmed">${privilegesCount} privilege${privilegesCount === 1 ? '' : 's'}</p>
              </div>
              <div class="group group--xs">
                <span class="badge badge--success">Custom</span>
                <button class="btn btn--error btn--xs" onclick="RoleManager.confirmDeleteRole('${role.role}')">
                  ${Icons.trash(14)}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  static confirmDeleteRole(roleName) {
    if (confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      this.deleteCustomRole(roleName).then(success => {
        if (success) {
          this.displayCustomRoles();
        }
      });
    }
  }

  static addPrivilegeRow() {
    const container = document.getElementById('privilegesContainer');
    const privilegeRow = document.createElement('div');
    privilegeRow.className = 'privilege-row';
    privilegeRow.innerHTML = `
      <div class="group group--sm" style="align-items: end;">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Database</label>
          <input type="text" class="input privilege-db" placeholder="Database name" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Collection (optional)</label>
          <input type="text" class="input privilege-collection" placeholder="Collection name">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Actions</label>
          <select multiple class="input privilege-actions" required>
            <option value="find">find</option>
            <option value="insert">insert</option>
            <option value="update">update</option>
            <option value="remove">remove</option>
            <option value="createCollection">createCollection</option>
            <option value="dropCollection">dropCollection</option>
            <option value="createIndex">createIndex</option>
            <option value="dropIndex">dropIndex</option>
            <option value="listCollections">listCollections</option>
            <option value="listIndexes">listIndexes</option>
          </select>
        </div>
        <button type="button" class="btn btn--error btn--xs" onclick="this.parentElement.parentElement.remove()">
          ${Icons.trash(16)}
        </button>
      </div>
    `;
    container.appendChild(privilegeRow);
  }

  static async submitCreateRole() {
    const form = document.getElementById('createRoleForm');
    const formData = new FormData(form);
    const roleName = formData.get('roleName');

    if (!roleName) {
      NotificationManager.show('Role name is required', 'error');
      return;
    }

    // Collect privileges
    const privileges = [];
    const privilegeRows = document.querySelectorAll('.privilege-row');
    
    privilegeRows.forEach(row => {
      const db = row.querySelector('.privilege-db').value;
      const collection = row.querySelector('.privilege-collection').value;
      const actionsSelect = row.querySelector('.privilege-actions');
      const actions = Array.from(actionsSelect.selectedOptions).map(option => option.value);

      if (db && actions.length > 0) {
        const resource = collection ? { db, collection } : { db };
        privileges.push({ resource, actions });
      }
    });

    const success = await this.createCustomRole(roleName, privileges, []);
    if (success) {
      Modal.close('createRoleModal');
      form.reset();
      document.getElementById('privilegesContainer').innerHTML = '';
    }
  }
}

// User management functions
class UserManager {
  static editUser(userId, userName) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = userName;
    this.loadUserRoles(userId);
    Modal.open('editUserModal');
  }

  static async loadUserRoles(userId) {
    // In a real implementation, you would fetch the user's current roles
    // For now, we'll just populate the role selection UI
    await RoleManager.loadBuiltinRoles();
    await RoleManager.loadCustomRoles();
    this.populateRoleSelectors();
  }

  static populateRoleSelectors() {
    const addRoleSelect = document.getElementById('addUserRoles');
    const editRoleSelect = document.getElementById('editUserRoles');
    
    if (addRoleSelect) {
      addRoleSelect.innerHTML = this.generateRoleOptions();
    }
    if (editRoleSelect) {
      editRoleSelect.innerHTML = this.generateRoleOptions();
    }
  }

  static generateRoleOptions() {
    let options = '<option value="">Select roles...</option>';
    
    // Built-in roles
    Object.entries(RoleManager.builtinRoles).forEach(([key, role]) => {
      options += `<option value="${key}" data-type="builtin">${role.role} - ${role.description}</option>`;
    });
    
    // Custom roles
    RoleManager.customRoles.forEach(role => {
      options += `<option value="${role.role}" data-type="custom">${role.role} (Custom)</option>`;
    });
    
    return options;
  }

  static deleteUser(userId, userName) {
    document.getElementById('deleteUserId').value = userId;
    document.getElementById('deleteUserName').textContent = userName;
    Modal.open('deleteUserModal');
  }

  static async submitForm(formId, actionUrl, method, successMessage) {
    const form = document.getElementById(formId);
    const submitButton = form.querySelector('button[type="submit"], .modal__footer button:last-child');
    
    // Show loading state
    if (submitButton) {
      const originalContent = submitButton.innerHTML;
      submitButton.innerHTML = `${Icons.loader(16)} Loading...`;
      submitButton.disabled = true;
    }

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Handle role selection for user forms
      if (formId === 'addUserForm' || formId === 'editUserForm') {
        const roleSelect = form.querySelector('select[name="roles"]');
        if (roleSelect) {
          const selectedRoles = Array.from(roleSelect.selectedOptions).map(option => {
            const roleType = option.getAttribute('data-type');
            const roleName = option.value;
            
            if (roleType === 'builtin') {
              return { role: roleName, db: 'admin' }; // Built-in roles typically go on admin db
            } else {
              return { role: roleName, db: 'admin' }; // Custom roles
            }
          });
          data.roles = selectedRoles;
        }
      }

      const response = await fetch(actionUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        NotificationManager.show(successMessage, 'success');
        Modal.closeAll();
        setTimeout(() => location.reload(), 1000);
      } else {
        NotificationManager.show(result.error || 'An error occurred', 'error');
      }
    } catch (error) {
      NotificationManager.show('Network error: ' + error.message, 'error');
    } finally {
      // Reset button state
      if (submitButton) {
        submitButton.innerHTML = submitButton.getAttribute('data-original-text') || 'Submit';
        submitButton.disabled = false;
      }
    }
  }
}

// Notification management
class NotificationManager {
  static show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: var(--space-lg);
      right: var(--space-lg);
      z-index: 1100;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = UIComponents.createAlert(message, type, true);
    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

// Connection management
class ConnectionManager {
  static async connect() {
    const form = document.getElementById('connectionForm');
    const uriInput = document.getElementById('uri');
    const connectButton = form.querySelector('button[type="submit"]');
    const originalUri = uriInput.value;

    // Validate URI
    const validationError = this.validateMongoURI(originalUri);
    if (validationError) {
      NotificationManager.show(validationError, 'error');
      return;
    }

    // Show loading state
    const originalButtonText = connectButton.innerHTML;
    connectButton.innerHTML = `${Icons.loader(16)} Connecting...`;
    connectButton.disabled = true;

    try {
      // Normalize URI to include /admin database
      const normalizedUri = this.normalizeMongoURI(originalUri);
      
      // Update the input field to show the normalized URI
      if (normalizedUri !== originalUri) {
        uriInput.value = normalizedUri;
        NotificationManager.show('URI automatically updated to use admin database', 'info');
      }

      const response = await fetch('/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri: normalizedUri })
      });

      const result = await response.json();

      if (response.ok) {
        NotificationManager.show('Connected to database successfully!', 'success');
        setTimeout(() => location.reload(), 1000);
      } else {
        NotificationManager.show(result.error || 'Failed to connect to database', 'error');
      }
    } catch (error) {
      NotificationManager.show('Network error: ' + error.message, 'error');
    } finally {
      // Reset button state
      connectButton.innerHTML = originalButtonText;
      connectButton.disabled = false;
    }
  }

  static validateMongoURI(uri) {
    if (!uri || typeof uri !== 'string') {
      return 'URI is required';
    }

    uri = uri.trim();

    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return 'URI must start with mongodb:// or mongodb+srv://';
    }

    try {
      const url = new URL(uri);
      if (!url.host) {
        return 'URI must include a valid host';
      }
      return null; // Valid
    } catch (error) {
      return 'Invalid URI format';
    }
  }

  static normalizeMongoURI(uri) {
    if (!uri) return uri;

    uri = uri.trim();

    try {
      const url = new URL(uri);
      const protocol = url.protocol;
      const host = url.host;
      const pathname = url.pathname;
      const search = url.search;

      // If pathname is empty or just '/', add '/admin'
      if (!pathname || pathname === '/') {
        return `${protocol}//${host}/admin${search}`;
      }

      // Check if pathname contains a database name
      const pathParts = pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length === 0) {
        // No database specified, add admin
        return `${protocol}//${host}/admin${search}`;
      } else if (pathParts[0] !== 'admin') {
        // Database specified but not admin, replace with admin
        pathParts[0] = 'admin';
        const newPath = '/' + pathParts.join('/');
        return `${protocol}//${host}${newPath}${search}`;
      }

      // Already has admin database
      return uri;
    } catch (error) {
      return uri; // Return original if parsing fails
    }
  }

  static setupURIValidation() {
    const uriInput = document.getElementById('uri');
    if (!uriInput) return;

    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'uri-feedback';
    feedbackDiv.className = 'form-help';
    feedbackDiv.style.display = 'none';
    uriInput.parentNode.appendChild(feedbackDiv);

    uriInput.addEventListener('input', function() {
      const uri = this.value.trim();
      
      if (!uri) {
        this.className = 'input';
        feedbackDiv.style.display = 'none';
        return;
      }

      const validationError = ConnectionManager.validateMongoURI(uri);
      
      if (validationError) {
        this.className = 'input input--error';
        feedbackDiv.className = 'form-error';
        feedbackDiv.textContent = validationError;
        feedbackDiv.style.display = 'block';
      } else {
        const normalizedUri = ConnectionManager.normalizeMongoURI(uri);
        
        if (normalizedUri !== uri) {
          this.className = 'input input--success';
          feedbackDiv.className = 'form-help';
          feedbackDiv.innerHTML = `${Icons.info(16)} Will be normalized to: <code>${normalizedUri}</code>`;
          feedbackDiv.style.display = 'block';
        } else {
          this.className = 'input input--success';
          feedbackDiv.className = 'form-help';
          feedbackDiv.innerHTML = `${Icons.checkCircle(16)} Valid MongoDB URI`;
          feedbackDiv.style.display = 'block';
        }
      }
    });

    uriInput.addEventListener('blur', function() {
      const uri = this.value.trim();
      if (uri && !ConnectionManager.validateMongoURI(uri)) {
        const normalizedUri = ConnectionManager.normalizeMongoURI(uri);
        if (normalizedUri !== uri) {
          this.value = normalizedUri;
          feedbackDiv.className = 'form-help';
          feedbackDiv.innerHTML = `${Icons.checkCircle(16)} URI automatically normalized to use admin database`;
        }
      }
    });
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }

  code {
    background-color: var(--gray-100);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    font-size: 0.875em;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .privilege-row {
    padding: var(--space-md);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    background-color: var(--gray-50);
  }

  .privilege-row:not(:last-child) {
    margin-bottom: var(--space-sm);
  }

  .privilege-actions {
    min-height: 100px;
  }

  .privilege-actions option {
    padding: 4px 8px;
  }

  .role-card {
    transition: all 0.2s ease;
  }

  .role-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-xl);
  }
`;
document.head.appendChild(style);

// Make components available globally
if (typeof window !== 'undefined') {
  window.UIComponents = UIComponents;
  window.Modal = Modal;
  window.UserManager = UserManager;
  window.RoleManager = RoleManager;
  window.NotificationManager = NotificationManager;
  window.ConnectionManager = ConnectionManager;
}