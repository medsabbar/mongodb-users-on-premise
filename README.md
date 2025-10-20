# MongoDB User Management

A web-based application for managing MongoDB users with built-in URI validation and automatic admin database targeting.

## Features

- 🔗 **Smart URI Validation**: Automatically validates and normalizes MongoDB connection strings
- 🛡️ **Admin Database Enforcement**: Ensures all operations use the admin database for proper user management
- 🎯 **Real-time Feedback**: Live validation with visual feedback in the connection form
- 👥 **User Management**: Create, edit, and delete MongoDB users through a clean web interface
- 🎨 **Modern UI**: Responsive design with intuitive user experience
- ⚡ **Demo Mode**: Test the interface without a MongoDB connection

## URI Validation

The application includes comprehensive MongoDB URI validation:

- **Auto-normalization**: URIs are automatically updated to use the `/admin` database
- **Format validation**: Ensures proper `mongodb://` or `mongodb+srv://` format
- **Parameter preservation**: Query parameters and authentication details are maintained
- **Real-time feedback**: Visual indicators show URI status as you type

### Example URI Transformations

| Input                                              | Output                                                  |
| -------------------------------------------------- | ------------------------------------------------------- |
| `mongodb://localhost:27017`                        | `mongodb://localhost:27017/admin`                       |
| `mongodb://localhost:27017/?directConnection=true` | `mongodb://localhost:27017/admin?directConnection=true` |
| `mongodb://localhost:27017/myapp`                  | `mongodb://localhost:27017/admin`                       |

For detailed information about URI validation, see [URI_VALIDATION.md](./URI_VALIDATION.md).

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the application**:

   ```bash
   npm start
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

4. **Connect to MongoDB**:
   Enter your MongoDB URI (it will be automatically validated and normalized)

## Usage

### Connection Examples

**Basic local connection**:

```
mongodb://localhost:27017/?directConnection=true
```

**With authentication**:

```
mongodb://username:password@localhost:27017/?authSource=admin
```

**MongoDB Atlas**:

```
mongodb+srv://cluster.mongodb.net/?retryWrites=true&w=majority
```

### Testing Validation

Run the validation test suite:

```bash
node test-uri-validation.js
```

## API Endpoints

- `POST /connect` - Connect to MongoDB with validation
- `POST /validate-uri` - Validate URI without connecting
- `POST /users` - Create a new user
- `PUT /users/update` - Update existing user
- `DELETE /users/delete` - Delete a user

## License

[MIT License](LICENSE)
