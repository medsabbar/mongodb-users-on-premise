import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import path from "path";
import { MongoClient, type Db } from "mongodb";
import {
  createUser,
  updateUser,
  deleteUser,
  validateAndNormalizeMongoURI,
  getUserEffectivePrivileges,
  createTemporaryUser,
  cleanupExpiredTemporaryUsers,
  listTemporaryUsers,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  listRoles,
  getBuiltinRoles,
  getBuiltinRolesGrouped,
  formatRoleForDisplay,
  type InheritedRole,
} from "./lib";
import { getActionsTree } from "./lib/actionsTree";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Global variables
let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let uri = "";

// Demo mode data for testing when MongoDB is not available
let demoMode = false;

export interface DashboardUser {
  _id: string;
  name: string;
  password?: string;
  createdAt: Date | string;
  roles?: { role: string; db: string }[];
  isTemporary?: boolean;
  expiresAt?: Date | null;
}

const demoUsers: DashboardUser[] = [
  {
    _id: "507f1f77bcf86cd799439011",
    name: "admin",
    password: "hashed_password_1",
    createdAt: new Date("2023-01-15"),
    roles: [{ role: "root", db: "admin" }],
  },
  {
    _id: "507f1f77bcf86cd799439012",
    name: "Jane Smith",
    password: "hashed_password_2",
    createdAt: new Date("2023-02-20"),
    roles: [{ role: "readWrite", db: "admin" }],
  },
  {
    _id: "507f1f77bcf86cd799439013",
    name: "Bob Johnson",
    password: "hashed_password_3",
    createdAt: new Date("2023-03-10"),
    roles: [{ role: "read", db: "admin" }],
  },
];

// Built-in roles that are treated as mutually exclusive \"default\" choices
// when assigning roles to a user. A user can have at most one of these,
// plus any number of custom roles.
const SINGLE_SELECT_BUILTIN_ROLES = new Set<string>([
  "clusterAdmin",
  "readWriteAnyDatabase",
  "readAnyDatabase",
]);

export type UserRolePayload = { role: string; db: string };

function validateUserRolesPayload(roles: unknown): void {
  if (!Array.isArray(roles)) {
    return;
  }

  let builtinCount = 0;
  for (const entry of roles as UserRolePayload[]) {
    if (!entry || typeof entry !== "object") continue;
    const name = entry.role;
    if (typeof name !== "string") continue;
    if (SINGLE_SELECT_BUILTIN_ROLES.has(name)) {
      builtinCount += 1;
      if (builtinCount > 1) {
        throw new Error(
          "Only one built-in default role (clusterAdmin, readWriteAnyDatabase, or readAnyDatabase) may be assigned to a user",
        );
      }
    }
  }
}

// Simple admin authentication (optional, enabled when ADMIN_PASSWORD is set)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_PASSWORD) {
    // Auth disabled when no password configured
    return next();
  }

  const header = (req.headers["authorization"] as string | undefined) || "";
  if (!header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm=\"Mongo Users Admin\"');
    res.status(401).send("Authentication required");
    return;
  }

  const encoded = header.split(" ")[1];
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    res.set("WWW-Authenticate", 'Basic realm=\"Mongo Users Admin\"');
    res.status(401).send("Invalid authentication");
    return;
  }

  const [user, pass] = decoded.split(":");
  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    next();
    return;
  }

  res.set("WWW-Authenticate", 'Basic realm=\"Mongo Users Admin\"');
  res.status(401).send("Authentication failed");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files
app.use(adminAuth);

// Helper to load users with temporary user metadata
async function loadUsersWithMetadata(): Promise<{ users: DashboardUser[] }> {
  let users: DashboardUser[] = [];

  if (isConnected && db) {
    // Best-effort cleanup of expired temporary users on each dashboard load
    try {
      await cleanupExpiredTemporaryUsers(db);
    } catch (cleanupError) {
      // eslint-disable-next-line no-console
      console.error("Temporary users cleanup error:", cleanupError);
    }

    // Load temporary users metadata
    let tempUsersMeta: { username: string; expiresAt: Date }[] = [];
    try {
      const tempUsers = await listTemporaryUsers(db);
      tempUsersMeta = tempUsers.map((t) => ({
        username: t.username,
        expiresAt: t.expiresAt,
      }));
    } catch (metaError) {
      // eslint-disable-next-line no-console
      console.error("Failed to load temporary users metadata:", metaError);
    }

    const tempMap = new Map<string, { username: string; expiresAt: Date }>(
      tempUsersMeta.map((t) => [t.username, t]),
    );

    const results = await db.command({
      usersInfo: 1,
      showCredentials: false,
      showCustomData: true,
      showPrivileges: false,
      showAuthenticationRestrictions: false,
      filter: {},
    });

    users = (results.users || []).map(
      (user: {
        _id: string;
        user?: string;
        db?: string;
        customData?: {
          createdAt?: Date;
          isTemporary?: boolean;
          tempExpiresAt?: Date;
        };
        roles?: InheritedRole[];
      }): DashboardUser => {
        // MongoDB user documents have both `user` (username) and `_id` (db.user).
        // Temporary user metadata is keyed by the bare username.
        const username =
          user.user ||
          (typeof user._id === "string"
            ? (user._id.split(".")[1] ?? user._id)
            : user._id);
        const tempMeta = tempMap.get(username);

        // Prefer the MongoDB user document's own customData as the source of truth
        // for temporary status and expiry, falling back to tempUsers metadata for
        // older records created before this field existed.
        const isTemporaryFromCustom = user.customData?.isTemporary === true;
        const tempExpiresFromCustom = user.customData?.tempExpiresAt ?? null;

        const isTemporary = isTemporaryFromCustom || !!tempMeta;
        const expiresAt = tempExpiresFromCustom ?? tempMeta?.expiresAt ?? null;

        return {
          _id: user._id,
          name: username,
          createdAt: user.customData?.createdAt || "N/A",
          roles: user.roles ?? [],
          isTemporary,
          expiresAt,
        };
      },
    );
  } else if (demoMode) {
    users = demoUsers;
  }

  return { users };
}

// API Routes
function getServerNameFromUri(currentUri: string): string | null {
  try {
    if (!currentUri) return null;
    const withoutProtocol = currentUri.split("://")[1] ?? currentUri;
    const atIndex = withoutProtocol.indexOf("@");
    const hostPart =
      atIndex >= 0 ? withoutProtocol.slice(atIndex + 1) : withoutProtocol;
    const hostOnly = hostPart.split("/")[0]?.split("?")[0] ?? hostPart;
    return hostOnly || null;
  } catch {
    return null;
  }
}

app.get("/api/health", (req: Request, res: Response): void => {
  void req;
  res.json({
    status: "ok",
    connected: isConnected,
    demoMode,
  });
});

app.get("/api/config", (req: Request, res: Response): void => {
  void req;
  res.json({
    isConnected,
    demoMode,
    hasAdminPassword: !!ADMIN_PASSWORD,
    adminUsername: ADMIN_USERNAME,
    mongoUriFromEnv: process.env.MONGODB_URI || null,
    serverName: !demoMode && isConnected ? getServerNameFromUri(uri) : null,
  });
});

app.get("/api/users", async (req: Request, res: Response): Promise<void> => {
  void req;
  try {
    const { users } = await loadUsersWithMetadata();
    res.json({
      users,
      isConnected: isConnected || demoMode,
      demoMode,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error loading users:", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to load users: " + message });
  }
});

// Validate MongoDB URI endpoint
app.post(
  "/validate-uri",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { uri: bodyUri } = req.body as { uri?: string };

      if (!bodyUri) {
        res.status(400).json({ error: "MongoDB URI is required" });
        return;
      }

      const normalizedUri = validateAndNormalizeMongoURI(bodyUri);

      res.json({
        valid: true,
        originalUri: bodyUri,
        normalizedUri,
        wasModified: normalizedUri !== bodyUri.trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({
        valid: false,
        error: message,
      });
    }
  },
);

// Connect to MongoDB
app.post("/connect", async (req: Request, res: Response): Promise<void> => {
  try {
    const { uri: bodyUri } = req.body as { uri?: string };

    if (!bodyUri) {
      res.status(400).json({ error: "MongoDB URI is required" });
      return;
    }

    // Validate and normalize the URI
    try {
      uri = validateAndNormalizeMongoURI(bodyUri);
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : String(validationError);
      res.status(400).json({ error: message });
      return;
    }

    // Special demo mode trigger
    if (uri.includes("demo") || uri.includes("test-demo")) {
      demoMode = true;
      isConnected = false; // Keep MongoDB connection false but enable demo mode
      res.json({
        success: true,
        message: "Connected to demo database successfully",
      });
      return;
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
    const dbName = "admin";
    db = mongoClient.db(dbName);

    isConnected = true;
    demoMode = false;

    res.json({ success: true, message: "Connected to MongoDB successfully" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", error);
    isConnected = false;
    mongoClient = null;
    db = null;
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to connect to MongoDB: " + message });
  }
});

// Disconnect from MongoDB or demo mode
app.post("/disconnect", async (req: Request, res: Response): Promise<void> => {
  void req;
  try {
    if (mongoClient) {
      await mongoClient.close();
    }
    mongoClient = null;
    db = null;
    isConnected = false;
    demoMode = false;
    uri = "";
    res.json({ success: true, message: "Disconnected from MongoDB" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("MongoDB disconnect error:", error);
    const message = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ error: "Failed to disconnect from MongoDB: " + message });
  }
});

function validatePasswordCharacters(password: string): void {
  if (typeof password !== "string" || !password) return;
  if (!/^[A-Za-z0-9]+$/.test(password)) {
    throw new Error(
      "Password may only contain letters and numbers (no special characters)",
    );
  }
}

// Create user
app.post("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isConnected && !demoMode) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }

    if (demoMode) {
      res.json({
        success: true,
        message: "User created successfully (demo mode)",
      });
      return;
    }

    if (!db) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }
    const {
      name,
      password,
      roles = [],
    } = req.body as {
      name?: string;
      password?: string;
      roles?: InheritedRole[];
    };
    if (!name || !password) {
      res.status(400).json({ error: "Name and password are required" });
      return;
    }

    try {
      validatePasswordCharacters(password);
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : String(validationError);
      res.status(400).json({ error: message });
      return;
    }

    try {
      validateUserRolesPayload(roles);
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : String(validationError);
      res.status(400).json({ error: message });
      return;
    }

    const existingUser = await db.command({
      usersInfo: { user: name, db: db.databaseName },
    });
    if ((existingUser.users || []).length > 0) {
      res.status(400).json({ error: "User with this name already exists" });
      return;
    }

    await createUser(uri, db, { name, password, roles });

    res.json({ success: true, message: "User created successfully" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating user:", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to create user: " + message });
  }
});

// Create temporary user
app.post(
  "/users/temporary",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const {
        name,
        password,
        roles = [],
        expiresInHours,
      } = req.body as {
        name?: string;
        password?: string;
        roles?: InheritedRole[];
        expiresInHours?: number | string;
      };

      if (!name || !password) {
        res.status(400).json({ error: "Name and password are required" });
        return;
      }

      try {
        validatePasswordCharacters(password);
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        res.status(400).json({ error: message });
        return;
      }

      const ttlHours = Number(expiresInHours || 0);
      if (!ttlHours || Number.isNaN(ttlHours) || ttlHours <= 0) {
        res
          .status(400)
          .json({ error: "expiresInHours must be a positive number" });
        return;
      }

      try {
        validateUserRolesPayload(roles);
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        res.status(400).json({ error: message });
        return;
      }

      if (demoMode) {
        res.json({
          success: true,
          message: "Temporary user created successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const existingUser = await db.command({
        usersInfo: { user: name, db: db.databaseName },
      });
      if ((existingUser.users || []).length > 0) {
        res.status(400).json({ error: "User with this name already exists" });
        return;
      }

      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      await createTemporaryUser(uri, db, { name, password, roles, expiresAt });

      res.json({
        success: true,
        message: "Temporary user created successfully",
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating temporary user:", error);
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Failed to create temporary user: " + message });
    }
  },
);

// Update user
app.put("/users/update", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isConnected && !demoMode) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }

    const { id, password, roles } = req.body as {
      id?: string;
      password?: string;
      roles?: InheritedRole[];
    };

    if (!id) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    if (!db) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }

    const userName = id.split(".")[1];

    // Prevent editing root users; they may only change passwords via the dedicated endpoint
    const currentDbName = db.databaseName;
    const userDetailsResult = await db.command({
      usersInfo: { user: userName, db: currentDbName },
      showCredentials: false,
      showCustomData: false,
      showPrivileges: false,
      showAuthenticationRestrictions: false,
    });

    if (!userDetailsResult.users || userDetailsResult.users.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userDoc = userDetailsResult.users[0] as { roles?: InheritedRole[] };
    const isRootUser = userDoc.roles?.some(
      (role) => role.role === "root" && role.db === currentDbName,
    );

    if (isRootUser) {
      res.status(400).json({
        error:
          "Root users cannot be edited. Use the dedicated password change action instead.",
      });
      return;
    }

    // Check if user already exists for other users
    const existingUser = await db.command({
      usersInfo: { user: userName, db: db.databaseName },
    });
    if (
      (existingUser.users || []).length > 0 &&
      existingUser.users[0]._id !== id
    ) {
      res.status(400).json({ error: "User with this name already exists" });
      return;
    }

    const updateData: {
      name: string;
      password?: string;
      roles?: InheritedRole[];
    } = {
      name: userName,
    };
    if (password) {
      try {
        validatePasswordCharacters(password);
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        res.status(400).json({ error: message });
        return;
      }
      updateData.password = password;
    }
    if (roles) {
      try {
        validateUserRolesPayload(roles);
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        res.status(400).json({ error: message });
        return;
      }
      updateData.roles = roles;
    }

    await updateUser(uri, db, updateData);

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating user:", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to update user: " + message });
  }
});

// Update user password (separate action)
app.put(
  "/users/password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const { id, password } = req.body as {
        id?: string;
        password?: string;
      };

      if (!id || !password) {
        res.status(400).json({ error: "User ID and password are required" });
        return;
      }

      if (demoMode) {
        res.json({
          success: true,
          message: "Password updated successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      try {
        validatePasswordCharacters(password);
      } catch (validationError) {
        const message =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        res.status(400).json({ error: message });
        return;
      }

      const userName = id.split(".")[1];

      if (!userName) {
        res.status(400).json({ error: "Invalid user ID format" });
        return;
      }

      // Ensure user exists before updating
      const existingUser = await db.command({
        usersInfo: { user: userName, db: db.databaseName },
      });

      if (!existingUser.users || existingUser.users.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      await updateUser(uri, db, { name: userName, password });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating user password:", error);
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Failed to update user password: " + message });
    }
  },
);

// Delete user
app.delete(
  "/users/delete",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const { id } = req.body as { id?: string };

      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const userName = id.split(".")[1];

      if (demoMode) {
        // Demo mode validations
        const userToDelete = demoUsers.find((user) => user.name === userName);
        const remainingUsers = demoUsers.filter(
          (user) => user.name !== userName,
        );

        if (remainingUsers.length === 0) {
          res.status(400).json({
            error:
              "Cannot delete the last user. At least one user must remain to access the database.",
          });
          return;
        }

        // Check if user has root role or critical administrative roles
        if (
          userToDelete?.roles?.some(
            (role) =>
              role.role === "root" ||
              role.role === "userAdminAnyDatabase" ||
              role.role === "dbAdminAnyDatabase" ||
              role.role === "clusterAdmin",
          )
        ) {
          res.status(400).json({
            error:
              "Root users and users with administrative privileges cannot be deleted for security reasons.",
          });
          return;
        }

        res.json({
          success: true,
          message: "User deleted successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      // Real MongoDB validations
      // First, get all users to count them
      const allUsersResult = await db.command({
        usersInfo: 1,
        showCredentials: false,
        showCustomData: false,
        showPrivileges: false,
        showAuthenticationRestrictions: false,
        filter: {},
      });

      const totalUsers = (allUsersResult.users || []).length;

      // Prevent deleting the last user
      if (totalUsers <= 1) {
        res.status(400).json({
          error:
            "Cannot delete the last user. At least one user must remain to access the database.",
        });
        return;
      }

      // Get detailed user info including roles to check for root privileges
      const userDetailsResult = await db.command({
        usersInfo: { user: userName, db: db.databaseName },
        showCredentials: false,
        showCustomData: false,
        showPrivileges: false,
        showAuthenticationRestrictions: false,
      });

      if (!userDetailsResult.users || userDetailsResult.users.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const userToDelete = userDetailsResult.users[0] as {
        roles?: InheritedRole[];
      };

      // Check if user has root role or other critical administrative roles
      const hasRootRole = userToDelete.roles?.some(
        (role) =>
          role.role === "root" ||
          role.role === "userAdminAnyDatabase" ||
          role.role === "dbAdminAnyDatabase" ||
          role.role === "clusterAdmin",
      );

      if (hasRootRole) {
        res.status(400).json({
          error:
            "Root users and users with administrative privileges cannot be deleted for security reasons.",
        });
        return;
      }

      // eslint-disable-next-line no-console
      console.log("Deleting user with ID:", id);

      await deleteUser(uri, db, userName);

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting user:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Failed to delete user: " + message });
    }
  },
);

// Effective privileges for a specific user
app.get(
  "/users/:name/effective-privileges",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const userName = req.params.name;

      if (demoMode) {
        // Simplified demo response
        res.json({
          id: `admin.${userName}`,
          db: "admin",
          roles: [{ role: "readWrite", db: "admin" }],
          inheritedRoles: [],
          privileges: [],
          customData: {},
          authenticationRestrictions: [],
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const info = await getUserEffectivePrivileges(db, userName);
      if (!info) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json(info);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error getting effective privileges:", error);
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Failed to get effective privileges: " + message });
    }
  },
);

// Actions tree (source of truth for custom role creation UI)
app.get("/roles/actions-tree", (req: Request, res: Response): void => {
  void req;
  try {
    res.json(getActionsTree());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting actions tree:", error);
    res.status(500).json({ error: "Failed to get actions tree" });
  }
});

// Get built-in roles
app.get("/roles/builtin", (req: Request, res: Response): void => {
  void req;
  try {
    const builtinRoles = getBuiltinRoles();
    res.json({ roles: builtinRoles });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting built-in roles:", error);
    res.status(500).json({ error: "Failed to get built-in roles" });
  }
});

// Get built-in roles grouped by category
app.get("/roles/builtin/grouped", (req: Request, res: Response): void => {
  void req;
  try {
    const groupedRoles = getBuiltinRolesGrouped();
    res.json({ roles: groupedRoles });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting grouped built-in roles:", error);
    res.status(500).json({ error: "Failed to get grouped built-in roles" });
  }
});

// List custom roles
app.get("/roles/custom", async (req: Request, res: Response): Promise<void> => {
  void req;
  try {
    if (!isConnected && !demoMode) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }

    if (demoMode) {
      // Return demo custom roles
      const demoRoles = [
        {
          role: "dataAnalyst",
          privileges: [
            {
              resource: { db: "analytics" },
              actions: ["find", "listCollections"],
            },
          ],
          roles: [] as InheritedRole[],
          isCustom: true,
        },
      ];
      res.json({ roles: demoRoles.map((r) => formatRoleForDisplay(r)) });
      return;
    }

    if (!db) {
      res.status(400).json({ error: "Not connected to database" });
      return;
    }

    const customRoles = await listRoles(uri, db);
    // Debug: log roles retrieved from MongoDB
    // eslint-disable-next-line no-console
    console.log(
      "[roles/custom] listRoles result:",
      (customRoles || []).map((r) => r.role),
    );
    res.json({ roles: customRoles });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error listing custom roles:", error);
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to list custom roles: " + message });
  }
});

// Create custom role
app.post(
  "/roles/custom",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const {
        roleName,
        privileges = [],
        inheritedRoles = [],
      } = req.body as {
        roleName?: string;
        privileges?: unknown[];
        inheritedRoles?: (string | InheritedRole)[];
      };

      if (!roleName) {
        res.status(400).json({ error: "Role name is required" });
        return;
      }

      if (demoMode) {
        res.json({
          success: true,
          message: "Custom role created successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      // Debug: log incoming payload for custom role creation
      // eslint-disable-next-line no-console
      console.log("[roles/custom] create request:", {
        roleName,
        privilegesCount: Array.isArray(privileges) ? privileges.length : 0,
        inheritedRolesCount: Array.isArray(inheritedRoles)
          ? inheritedRoles.length
          : 0,
      });

      await createCustomRole(uri, db, {
        role: roleName,
        privileges: privileges as unknown as [],
        roles: inheritedRoles as unknown as (string | InheritedRole)[],
      });

      // Debug: confirm create completed
      // eslint-disable-next-line no-console
      console.log("[roles/custom] createRole completed for", roleName);

      res.json({ success: true, message: "Custom role created successfully" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating custom role:", error);
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Failed to create custom role: " + message });
    }
  },
);

// Update custom role
app.put(
  "/roles/custom/:roleName",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const { roleName } = req.params;
      const { privileges, inheritedRoles } = req.body as {
        privileges?: unknown[];
        inheritedRoles?: (string | InheritedRole)[];
      };

      if (demoMode) {
        res.json({
          success: true,
          message: "Custom role updated successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      await updateCustomRole(uri, db, roleName, {
        privileges: privileges as unknown as [],
        roles: inheritedRoles as unknown as (string | InheritedRole)[],
      });

      res.json({ success: true, message: "Custom role updated successfully" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating custom role:", error);
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .json({ error: "Failed to update custom role: " + message });
    }
  },
);

// Delete custom role
app.delete(
  "/roles/custom/:roleName",
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isConnected && !demoMode) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      const { roleName } = req.params;

      if (demoMode) {
        res.json({
          success: true,
          message: "Custom role deleted successfully (demo mode)",
        });
        return;
      }

      if (!db) {
        res.status(400).json({ error: "Not connected to database" });
        return;
      }

      await deleteCustomRole(uri, db, roleName);

      res.json({ success: true, message: "Custom role deleted successfully" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting custom role:", error);
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = message.includes('Cannot delete role "') ? 400 : 500;
      res
        .status(statusCode)
        .json({ error: "Failed to delete custom role: " + message });
    }
  },
);

// Serve React client build in production, if available.
// When compiled, __dirname points at "dist", so we go one level up.
const clientBuildPath = path.join(__dirname, "..", "client", "dist");

app.use(express.static(clientBuildPath));

app.get("*", (req: Request, res: Response, next: NextFunction): void => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/users") ||
    req.path.startsWith("/roles") ||
    req.path.startsWith("/connect") ||
    req.path.startsWith("/validate-uri")
  ) {
    next();
    return;
  }

  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Graceful shutdown
process.on("SIGINT", async () => {
  // eslint-disable-next-line no-console
  console.log("Shutting down gracefully...");
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log("MongoDB User Management API + React dashboard");
});
