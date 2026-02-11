import { exec } from "child_process";
import type { Db, ObjectId } from "mongodb";
import { getAllowedActions } from "./actionsTree";

export type BuiltinRoleCategory = "collection" | "database" | "global";

export interface BuiltinRole {
  role: string;
  description: string;
  category: BuiltinRoleCategory;
}

export type BuiltinRolesMap = Record<string, BuiltinRole>;

export interface PrivilegeResource {
  db: string;
  collection?: string;
}

export interface Privilege {
  resource: PrivilegeResource;
  actions: string[];
}

export interface InheritedRole {
  role: string;
  db: string;
}

export interface MongoRole {
  role: string;
  description?: string;
  privileges?: Privilege[];
  roles?: InheritedRole[];
  isCustom?: boolean;
  [key: string]: unknown;
}

export interface CreateUserInput {
  name: string;
  password: string;
  roles?: InheritedRole[];
  customData?: {
    isTemporary?: boolean;
    tempExpiresAt?: Date;
  };
}

export interface UpdateUserInput {
  name: string;
  password?: string;
  roles?: InheritedRole[];
}

export interface TemporaryUserMetadata {
  _id?: ObjectId;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  expiredAt?: Date;
  status: "active" | "expired";
  roles: InheritedRole[];
}

const BUILTIN_ROLES: BuiltinRolesMap = {
  // Collection Actions - roles that primarily affect collections
  read: {
    role: "read",
    description: "Read data from all non-system collections",
    category: "collection",
  },
  readWrite: {
    role: "readWrite",
    description: "Read and write data to all non-system collections",
    category: "collection",
  },

  // Database Actions and Roles - roles that affect database-level operations
  dbAdmin: {
    role: "dbAdmin",
    description: "Administrative privileges on the database",
    category: "database",
  },
  dbOwner: {
    role: "dbOwner",
    description: "Full privileges on the database",
    category: "database",
  },
  userAdmin: {
    role: "userAdmin",
    description: "Create and modify roles and users on the database",
    category: "database",
  },

  // Global Actions and Roles - cluster-wide and system roles
  clusterAdmin: {
    role: "clusterAdmin",
    description: "Full cluster administration access",
    category: "global",
  },
  clusterManager: {
    role: "clusterManager",
    description: "Manage and monitor cluster operations",
    category: "global",
  },
  clusterMonitor: {
    role: "clusterMonitor",
    description: "Read-only access to monitoring tools",
    category: "global",
  },
  hostManager: {
    role: "hostManager",
    description: "Monitor and manage servers",
    category: "global",
  },
  backup: {
    role: "backup",
    description: "Backup database data",
    category: "global",
  },
  restore: {
    role: "restore",
    description: "Restore database data",
    category: "global",
  },
  readAnyDatabase: {
    role: "readAnyDatabase",
    description: "Read data from all databases",
    category: "global",
  },
  readWriteAnyDatabase: {
    role: "readWriteAnyDatabase",
    description: "Read and write data to all databases",
    category: "global",
  },
  userAdminAnyDatabase: {
    role: "userAdminAnyDatabase",
    description: "User administration privileges on all databases",
    category: "global",
  },
  dbAdminAnyDatabase: {
    role: "dbAdminAnyDatabase",
    description: "Database administration privileges on all databases",
    category: "global",
  },
  root: {
    role: "root",
    description: "Full access to all operations and resources",
    category: "global",
  },
};

const ALLOWED_ACTIONS = getAllowedActions();

function validateRoleName(name: unknown): asserts name is string {
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Role name is required");
  }
}

function validatePrivilegeResource(
  resource: unknown,
): asserts resource is PrivilegeResource {
  if (!resource || typeof resource !== "object") {
    throw new Error("Privilege resource must be an object");
  }

  const { db, collection } = resource as PrivilegeResource;

  if (typeof db !== "string") {
    throw new Error(
      'Privilege resource.db must be a string (\"\" allowed for any db)',
    );
  }

  if (collection !== undefined && typeof collection !== "string") {
    throw new Error(
      'Privilege resource.collection must be a string when provided (\"\" allowed for any collection)',
    );
  }
}

function validatePrivilege(priv: unknown): asserts priv is Privilege {
  if (!priv || typeof priv !== "object") {
    throw new Error("Each privilege must be an object");
  }

  const privilege = priv as Privilege;
  validatePrivilegeResource(privilege.resource);

  if (!Array.isArray(privilege.actions) || privilege.actions.length === 0) {
    throw new Error("Each privilege must specify at least one action");
  }

  for (const action of privilege.actions) {
    if (typeof action !== "string" || !action.trim()) {
      throw new Error("Privilege actions must be non-empty strings");
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      throw new Error(`Action \"${action}\" is not allowed for custom roles`);
    }
  }
}

function validatePrivileges(
  privileges: unknown,
): asserts privileges is Privilege[] {
  if (!Array.isArray(privileges)) {
    throw new Error("privileges must be an array");
  }
  privileges.forEach((p) => validatePrivilege(p));
}

type InheritedRoleInput = string | { role: string; db?: string };

function normalizeInheritedRoles(
  inheritedRoles: InheritedRoleInput[],
  defaultDb: string,
): InheritedRole[] {
  if (!Array.isArray(inheritedRoles)) {
    throw new Error("inheritedRoles must be an array");
  }

  return inheritedRoles.map((r) => {
    if (typeof r === "string") {
      return { role: r, db: defaultDb };
    }
    if (!r || typeof r !== "object" || !r.role) {
      throw new Error(
        "Inherited roles must be strings or objects with a role field",
      );
    }
    return {
      role: r.role,
      db: r.db || defaultDb,
    };
  });
}

interface RoleInfoDoc {
  role: string;
  db: string;
}

async function assertInheritedRolesExist(
  db: Db,
  inheritedRoles: InheritedRole[],
): Promise<void> {
  if (!inheritedRoles.length) return;

  const rolesInfo = inheritedRoles.map((r) => ({ role: r.role, db: r.db }));
  const result = await db.command({
    rolesInfo,
    showPrivileges: false,
    showBuiltinRoles: true,
  });

  const existingRoles = (result.roles || []) as RoleInfoDoc[];
  const found = new Set<string>(existingRoles.map((r) => `${r.role}@${r.db}`));
  const missing = inheritedRoles.filter((r) => !found.has(`${r.role}@${r.db}`));

  if (missing.length) {
    const names = missing.map((r) => `${r.role} (db: ${r.db})`).join(", ");
    throw new Error(`Inherited roles do not exist: ${names}`);
  }
}

async function assertNoCircularInheritance(
  db: Db,
  roleName: string,
  inheritedRoles: InheritedRole[],
): Promise<void> {
  if (!inheritedRoles.length) return;

  // Load existing custom roles (user-defined only)
  const result = await db.command({
    rolesInfo: 1,
    showPrivileges: false,
    showBuiltinRoles: false,
  });

  const roles: MongoRole[] = result.roles || [];
  const graph = new Map<string, string[]>();

  for (const role of roles) {
    const name = role.role;
    const children = (role.roles || [])
      .filter((r) => r && typeof r.role === "string")
      .map((r) => r.role);
    if (name) {
      graph.set(name, children);
    }
  }

  // Override / add the edges for the role we are about to create/update.
  graph.set(
    roleName,
    inheritedRoles
      .filter((r) => r && typeof r.role === "string")
      .map((r) => r.role),
  );

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): void {
    if (visiting.has(node)) {
      throw new Error(
        `Circular role inheritance detected involving role \"${node}\"`,
      );
    }
    if (visited.has(node)) return;

    visiting.add(node);
    const neighbors = graph.get(node) || [];
    for (const next of neighbors) {
      dfs(next);
    }
    visiting.delete(node);
    visited.add(node);
  }

  dfs(roleName);
}

// Custom role structure
export class CustomRole {
  role: string;
  privileges: Privilege[];
  roles: InheritedRole[];
  isCustom: true;

  constructor(
    name: string,
    privileges: Privilege[] = [],
    inheritedRoles: InheritedRole[] = [],
  ) {
    this.role = name;
    this.privileges = privileges;
    this.roles = inheritedRoles;
    this.isCustom = true;
  }

  // Add privilege to the role
  addPrivilege(
    database: string,
    collection: string | undefined,
    actions: string[],
  ): void {
    const resource: PrivilegeResource = collection
      ? { db: database, collection }
      : { db: database };
    this.privileges.push({ resource, actions });
  }

  // Convert to MongoDB role format
  toMongoRole(): MongoRole {
    return {
      role: this.role,
      privileges: this.privileges,
      roles: this.roles,
    };
  }
}

// URI validation function
export function validateAndNormalizeMongoURI(uri: string): string {
  if (!uri || typeof uri !== "string") {
    throw new Error("URI is required and must be a string");
  }

  // Remove leading/trailing whitespace
  let normalized = uri.trim();

  // Special case for demo mode
  if (normalized.includes("demo") || normalized.includes("test-demo")) {
    return normalized;
  }

  // Basic MongoDB URI format validation
  if (
    !normalized.startsWith("mongodb://") &&
    !normalized.startsWith("mongodb+srv://")
  ) {
    throw new Error("URI must start with mongodb:// or mongodb+srv://");
  }

  try {
    // Parse the URI to validate its structure
    const url = new URL(normalized);

    // Extract components
    const protocol = url.protocol; // mongodb: or mongodb+srv:
    const host = url.host;
    const pathname = url.pathname;
    const search = url.search;

    // Validate host
    if (!host) {
      throw new Error("URI must include a valid host");
    }

    // Preserve credentials if present
    const hasAuth = !!url.username;
    const authPart = hasAuth
      ? `${encodeURIComponent(url.username)}${url.password ? ":" + encodeURIComponent(url.password) : ""}@`
      : "";

    // Check if database is already specified in the path
    let finalURI = normalized;

    // If pathname is empty or just '/', we need to add '/admin'
    if (!pathname || pathname === "/") {
      // Add /admin before query parameters
      if (search) {
        finalURI = `${protocol}//${authPart}${host}/admin${search}`;
      } else {
        finalURI = `${protocol}//${authPart}${host}/admin`;
      }
    } else {
      // Check if pathname contains a database name other than admin
      const pathParts = pathname.split("/").filter((part) => part.length > 0);

      if (pathParts.length === 0) {
        // No database specified, add admin
        if (search) {
          finalURI = `${protocol}//${authPart}${host}/admin${search}`;
        } else {
          finalURI = `${protocol}//${authPart}${host}/admin`;
        }
      } else if (pathParts[0] !== "admin") {
        // Database specified but not admin, replace with admin
        pathParts[0] = "admin";
        const newPath = "/" + pathParts.join("/");
        finalURI = `${protocol}//${authPart}${host}${newPath}${search}`;
      }
      // If already admin, keep as is
    }

    // Validate the final URI by attempting to parse it again
    new URL(finalURI);

    return finalURI;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid URI format: ${message}`);
  }
}

export async function createUser(
  uri: string,
  db: Db,
  user: CreateUserInput,
): Promise<string> {
  const { name, password, roles = [], customData } = user;
  const promise = new Promise<string>((resolve, reject) => {
    // Ensure we're using the validated URI
    const validatedUri = validateAndNormalizeMongoURI(uri);

    // Default to readWrite role if no roles specified
    const userRoles =
      roles.length > 0 ? roles : [{ role: "readWrite", db: db.databaseName }];

    // Format roles for MongoDB command, escaping quotes for the shell
    const rolesStr = JSON.stringify(userRoles).replace(/"/g, '\\"');

    // Build customData for the user document. We always include createdAt, and
    // optionally mark temporary users with an explicit expiry timestamp so a
    // TTL index on system.users can clean them up.
    const customParts: string[] = ["createdAt: new Date()"];
    if (customData) {
      if (typeof customData.isTemporary === "boolean") {
        customParts.push(
          `isTemporary: ${customData.isTemporary ? "true" : "false"}`,
        );
      }
      if (customData.tempExpiresAt instanceof Date) {
        customParts.push(
          `tempExpiresAt: new Date('${customData.tempExpiresAt.toISOString()}')`,
        );
      }
    }
    const customDataStr = customParts.join(", ");

    const command = `mongosh "${validatedUri}" --eval "db.createUser({user: '${name}', pwd: '${password}', roles: ${rolesStr}, customData: { ${customDataStr} }})" --quiet`;
    exec(command, (error, stdout, stderr) => {
      // eslint-disable-next-line no-console
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

export async function updateUser(
  uri: string,
  db: Db,
  user: UpdateUserInput,
): Promise<string> {
  void db; // db is unused here; required for signature compatibility
  const { name, password, roles } = user;
  const promise = new Promise<string>((resolve, reject) => {
    // Ensure we're using the validated URI
    const validatedUri = validateAndNormalizeMongoURI(uri);

    // Build update object
    const updateObj: { pwd?: string; roles?: InheritedRole[] } = {};
    if (password) updateObj.pwd = password;
    if (roles) updateObj.roles = roles;

    const updateStr = JSON.stringify(updateObj).replace(/"/g, '\\"');
    const command = `mongosh "${validatedUri}" --eval "db.updateUser('${name}', ${updateStr})" --quiet`;
    exec(command, (error, stdout, stderr) => {
      // eslint-disable-next-line no-console
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

export async function deleteUser(
  uri: string,
  db: Db,
  name: string,
): Promise<string> {
  void db; // db is unused here; required for signature compatibility
  const promise = new Promise<string>((resolve, reject) => {
    // Ensure we're using the validated URI
    const validatedUri = validateAndNormalizeMongoURI(uri);
    const command = `mongosh "${validatedUri}" --eval "db.dropUser('${name}')" --quiet`;
    exec(command, (error, stdout, stderr) => {
      // eslint-disable-next-line no-console
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

// Role management functions
export async function createCustomRole(
  uri: string, // kept for signature compatibility
  db: Db,
  role: {
    role: string;
    privileges?: Privilege[];
    roles?: InheritedRoleInput[];
  },
): Promise<void> {
  // uri is kept for signature compatibility but ignored; we use native driver
  void uri;
  validateRoleName(role.role);
  const privileges = role.privileges || [];
  const defaultDb = db.databaseName || "admin";
  const inheritedRoles = normalizeInheritedRoles(role.roles || [], defaultDb);

  validatePrivileges(privileges);
  await assertInheritedRolesExist(db, inheritedRoles);
  await assertNoCircularInheritance(db, role.role, inheritedRoles);

  await db.command({
    createRole: role.role,
    privileges,
    roles: inheritedRoles,
  });
}

export async function updateCustomRole(
  uri: string, // kept for signature compatibility
  db: Db,
  roleName: string,
  updates: { privileges?: Privilege[]; roles?: InheritedRoleInput[] },
): Promise<void> {
  // uri is kept for signature compatibility but ignored; we use native driver
  void uri;
  validateRoleName(roleName);

  const patch: { privileges?: Privilege[]; roles?: InheritedRole[] } = {};
  const defaultDb = db.databaseName || "admin";

  if (updates.privileges !== undefined) {
    validatePrivileges(updates.privileges || []);
    patch.privileges = updates.privileges || [];
  }

  if (updates.roles !== undefined) {
    const normalizedRoles = normalizeInheritedRoles(
      updates.roles || [],
      defaultDb,
    );
    await assertInheritedRolesExist(db, normalizedRoles);
    await assertNoCircularInheritance(db, roleName, normalizedRoles);
    patch.roles = normalizedRoles;
  }

  if (Object.keys(patch).length === 0) {
    // Nothing to update
    return;
  }

  await db.command({
    updateRole: roleName,
    ...patch,
  });
}

export async function deleteCustomRole(
  uri: string, // kept for signature compatibility
  db: Db,
  roleName: string,
): Promise<void> {
  // uri is kept for signature compatibility but ignored; we use native driver
  void uri;
  validateRoleName(roleName);

  // Prevent deleting a custom role that is still assigned to any users.
  // We scan users in the current database and check their direct and inherited roles.
  const usersResult = await db.command({
    usersInfo: 1,
    showCredentials: false,
    showCustomData: false,
    showPrivileges: false,
    showAuthenticationRestrictions: false,
    filter: {},
  });

  type UserInfoDoc = {
    _id: string;
    user?: string;
    db?: string;
    roles?: InheritedRole[];
    inheritedRoles?: InheritedRole[];
  };

  const dbName = db.databaseName || "admin";
  const users = (usersResult.users || []) as UserInfoDoc[];
  const consumers: string[] = [];

  for (const user of users) {
    const direct = user.roles || [];
    const inherited = user.inheritedRoles || [];
    const allRoles = [...direct, ...inherited];
    const hasRole = allRoles.some(
      (r) => r.role === roleName && r.db === dbName,
    );
    if (hasRole) {
      const name = user.user || user._id || "<unknown>";
      consumers.push(name);
    }
  }

  if (consumers.length > 0) {
    throw new Error(
      `Cannot delete role "${roleName}" because it is still assigned to users: ${consumers.join(
        ", ",
      )}`,
    );
  }

  await db.command({
    dropRole: roleName,
  });
}

export async function listRoles(uri: string, db: Db): Promise<MongoRole[]> {
  // Hardened implementation using native driver instead of mongosh
  void uri;
  const result = await db.command({
    rolesInfo: 1,
    showPrivileges: true,
    showBuiltinRoles: false,
  });
  return (result.roles || []) as MongoRole[];
}

// Effective privileges for a given user, using native driver
export interface EffectivePrivileges {
  id: string;
  db: string;
  roles: InheritedRole[];
  inheritedRoles: InheritedRole[];
  privileges: Privilege[];
  customData: Record<string, unknown>;
  authenticationRestrictions: unknown[];
}

export async function getUserEffectivePrivileges(
  db: Db,
  userName: string,
): Promise<EffectivePrivileges | null> {
  if (!userName) {
    throw new Error("User name is required");
  }

  const result = await db.command({
    usersInfo: { user: userName, db: db.databaseName },
    showCredentials: false,
    showCustomData: true,
    showPrivileges: true,
    showAuthenticationRestrictions: true,
  });

  if (!result.users || result.users.length === 0) {
    return null;
  }

  const user = result.users[0] as {
    _id: string;
    db: string;
    roles?: InheritedRole[];
    inheritedRoles?: InheritedRole[];
    privileges?: Privilege[];
    inheritedPrivileges?: Privilege[];
    customData?: Record<string, unknown>;
    authenticationRestrictions?: unknown[];
  };

  return {
    id: user._id,
    db: user.db,
    roles: user.roles || [],
    inheritedRoles: user.inheritedRoles || [],
    privileges: user.inheritedPrivileges || user.privileges || [],
    customData: user.customData || {},
    authenticationRestrictions: user.authenticationRestrictions || [],
  };
}

// Temporary users helpers
export async function createTemporaryUser(
  uri: string,
  db: Db,
  {
    name,
    password,
    roles = [],
    expiresAt,
  }: {
    name: string;
    password: string;
    roles?: InheritedRole[];
    expiresAt: Date;
  },
): Promise<void> {
  if (!name || !password || !expiresAt) {
    throw new Error(
      "name, password and expiresAt are required for temporary users",
    );
  }

  const now = new Date();
  const expiryDate = new Date(expiresAt);

  // Create the actual MongoDB user first, including metadata that marks it as
  // temporary and records its expiry timestamp. This allows a TTL index on
  // system.users.customData.tempExpiresAt to remove the user automatically.
  await createUser(uri, db, {
    name,
    password,
    roles,
    customData: {
      isTemporary: true,
      tempExpiresAt: expiryDate,
    },
  });

  // Store metadata in admin.tempUsers collection for auditing/history.
  const collection = db.collection<TemporaryUserMetadata>("tempUsers");

  await collection.insertOne({
    username: name,
    createdAt: now,
    expiresAt: expiryDate,
    status: "active",
    roles,
  });
}

export async function cleanupExpiredTemporaryUsers(
  db: Db,
): Promise<{ cleaned: number }> {
  const collection = db.collection<TemporaryUserMetadata>("tempUsers");
  const now = new Date();

  const expired = await collection
    .find({ status: "active", expiresAt: { $lte: now } })
    .toArray();

  if (!expired.length) {
    return { cleaned: 0 };
  }

  // We no longer drop MongoDB users here; that responsibility is delegated to
  // a TTL index on system.users.customData.tempExpiresAt. This helper now
  // strictly updates audit metadata in tempUsers.
  let cleaned = 0;

  for (const tempUser of expired) {
    await collection.updateOne(
      { _id: tempUser._id as ObjectId },
      { $set: { status: "expired", expiredAt: now } },
    );
    cleaned += 1;
  }

  return { cleaned };
}

export async function listTemporaryUsers(
  db: Db,
): Promise<TemporaryUserMetadata[]> {
  const collection = db.collection<TemporaryUserMetadata>("tempUsers");
  return collection.find({}).toArray();
}

// Utility functions for role management
export function getBuiltinRoles(): BuiltinRolesMap {
  return BUILTIN_ROLES;
}

export function getBuiltinRolesGrouped(): Record<
  BuiltinRoleCategory,
  BuiltinRole[]
> {
  const grouped: Record<BuiltinRoleCategory, BuiltinRole[]> = {
    collection: [],
    database: [],
    global: [],
  };

  Object.values(BUILTIN_ROLES).forEach((role) => {
    if (grouped[role.category]) {
      grouped[role.category].push(role);
    }
  });

  return grouped;
}

export function createCustomRoleObject(
  name: string,
  privileges: Privilege[] = [],
  inheritedRoles: InheritedRole[] = [],
): CustomRole {
  return new CustomRole(name, privileges, inheritedRoles);
}

export function formatRoleForDisplay(
  role: string | (MongoRole & { isCustom?: boolean }),
): BuiltinRole | (MongoRole & { isCustom?: boolean }) {
  if (typeof role === "string") {
    return BUILTIN_ROLES[role] || { role, description: "Custom role" };
  }

  if (role.role && BUILTIN_ROLES[role.role]) {
    return BUILTIN_ROLES[role.role];
  }

  return {
    role: role.role || (role as MongoRole).role,
    description: role.description || "Custom role",
    isCustom: true,
  };
}
