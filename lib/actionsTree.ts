export type ActionNodeType = 'action' | 'role';

export interface ActionsTreeNode {
  name: string;
  type?: ActionNodeType;
  children?: ActionsTreeNode[];
}

// Single source of truth for privilege actions and built-in roles used in custom role creation.
// Tree is recursive: each node has name and optional children. Leaves have type "action" or "role".
// - type "action": valid in privileges[].actions
// - type "role": valid in inherited roles (built-in role name)
export const ACTIONS_TREE: ActionsTreeNode[] = [
  {
    name: 'Collection Actions',
    children: [
      {
        name: 'Query and Write Actions',
        children: [
          { name: 'find', type: 'action' },
          { name: 'insert', type: 'action' },
          { name: 'remove', type: 'action' },
          { name: 'update', type: 'action' },
          { name: 'bypassDocumentValidation', type: 'action' }
        ]
      },
      {
        name: 'Database Management Actions',
        children: [
          { name: 'createCollection', type: 'action' },
          { name: 'createIndex', type: 'action' },
          { name: 'dropCollection', type: 'action' },
          { name: 'killAnyCursor', type: 'action' }
        ]
      },
      {
        name: 'Change Stream Actions',
        children: [{ name: 'changeStream', type: 'action' }]
      },
      {
        name: 'Server Administration Actions',
        children: [
          { name: 'collMod', type: 'action' },
          { name: 'compact', type: 'action' },
          { name: 'convertToCapped', type: 'action' },
          { name: 'dropIndex', type: 'action' },
          { name: 'reIndex', type: 'action' }
        ]
      },
      {
        name: 'Diagnostic Actions',
        children: [
          { name: 'collStats', type: 'action' },
          { name: 'dbHash', type: 'action' },
          { name: 'listIndexes', type: 'action' },
          { name: 'validate', type: 'action' }
        ]
      },
      {
        name: 'Sharding Actions',
        children: [
          { name: 'moveChunk', type: 'action' },
          { name: 'splitChunk', type: 'action' },
          { name: 'analyzeShardKey', type: 'action' },
          { name: 'refineCollectionShardKey', type: 'action' },
          { name: 'clearJumboFlag', type: 'action' },
          { name: 'reshardCollection', type: 'action' }
        ]
      }
    ]
  },
  {
    name: 'Database Actions and Roles',
    children: [
      {
        name: 'Actions',
        children: [
          {
            name: 'Database Management Actions',
            children: [{ name: 'enableProfiler', type: 'action' }]
          },
          {
            name: 'Server Administration Actions',
            children: [
              { name: 'dropDatabase', type: 'action' },
              { name: 'renameCollectionSameDB', type: 'action' }
            ]
          },
          {
            name: 'Diagnostic Actions',
            children: [
              { name: 'dbStats', type: 'action' },
              { name: 'listCollections', type: 'action' }
            ]
          }
        ]
      },
      {
        name: 'Built-In Roles',
        children: [
          { name: 'read', type: 'role' },
          { name: 'readWrite', type: 'role' },
          { name: 'dbAdmin', type: 'role' }
        ]
      }
    ]
  },
  {
    name: 'Global Actions and Roles',
    children: [
      {
        name: 'Actions',
        children: [
          {
            name: 'Query and Write Actions',
            children: [
              { name: 'useUUID', type: 'action' },
              { name: 'killop', type: 'action' },
              { name: 'bypassDefaultMaxTimeMS', type: 'action' }
            ]
          },
          {
            name: 'Server Administration Actions',
            children: [
              { name: 'setUserWriteBlockMode', type: 'action' },
              { name: 'bypassWriteBlockingMode', type: 'action' }
            ]
          },
          {
            name: 'Session Actions',
            children: [
              { name: 'listSessions', type: 'action' },
              { name: 'killAnySession', type: 'action' }
            ]
          },
          {
            name: 'Diagnostic Actions',
            children: [
              { name: 'connPoolStats', type: 'action' },
              { name: 'getCmdLineOpts', type: 'action' },
              { name: 'getLog', type: 'action' },
              { name: 'getParameter', type: 'action' },
              { name: 'getShardMap', type: 'action' },
              { name: 'hostInfo', type: 'action' },
              { name: 'inprog', type: 'action' },
              { name: 'listDatabases', type: 'action' },
              { name: 'listShards', type: 'action' },
              { name: 'netstat', type: 'action' },
              { name: 'replSetGetConfig', type: 'action' },
              { name: 'replSetGetStatus', type: 'action' },
              { name: 'serverStatus', type: 'action' },
              { name: 'shardingState', type: 'action' },
              { name: 'top', type: 'action' }
            ]
          },
          {
            name: 'Atlas Data Federation Actions',
            children: [
              { name: 'sqlGetSchema', type: 'action' },
              { name: 'sqlSetSchema', type: 'action' },
              { name: 'viewAllHistory', type: 'action' },
              { name: 'outToS3', type: 'action' },
              { name: 'outToAzure', type: 'action' },
              { name: 'outToGCS', type: 'action' },
              { name: 'storageGetConfig', type: 'action' },
              { name: 'storageSetConfig', type: 'action' }
            ]
          },
          {
            name: 'Sharding Actions',
            children: [
              { name: 'flushRouterConfig', type: 'action' },
              { name: 'enableSharding', type: 'action' },
              { name: 'checkMetadataConsistency', type: 'action' },
              { name: 'shardedDataDistribution', type: 'action' }
            ]
          },
          {
            name: 'Atlas Streams Processing Actions',
            children: [
              { name: 'getStreamProcessor', type: 'action' },
              { name: 'createStreamProcessor', type: 'action' },
              { name: 'processStreamProcessor', type: 'action' },
              { name: 'startStreamProcessor', type: 'action' },
              { name: 'stopStreamProcessor', type: 'action' },
              { name: 'dropStreamProcessor', type: 'action' },
              { name: 'sampleStreamProcessor', type: 'action' },
              { name: 'listStreamProcessors', type: 'action' },
              { name: 'listStreamConnections', type: 'action' },
              { name: 'streamProcessorStats', type: 'action' }
            ]
          }
        ]
      },
      {
        name: 'Built-In Roles',
        children: [
          { name: 'readAnyDatabase', type: 'role' },
          { name: 'readWriteAnyDatabase', type: 'role' },
          { name: 'backup', type: 'role' },
          { name: 'enableSharding', type: 'role' },
          { name: 'dbAdminAnyDatabase', type: 'role' },
          { name: 'clusterMonitor', type: 'role' },
          { name: 'killOpSession', type: 'role' },
          { name: 'autoCompact', type: 'role' },
          { name: 'manageShardBalancer', type: 'role' }
        ]
      }
    ]
  }
];

export function getActionsTree(): ActionsTreeNode[] {
  return ACTIONS_TREE;
}

export function collectLeaves(
  node: ActionsTreeNode | undefined,
  typeFilter?: ActionNodeType,
  out: string[] = []
): string[] {
  if (!node) return out;
  const { children } = node;
  if (!children || children.length === 0) {
    const type: ActionNodeType = node.type ?? 'action';
    if (!typeFilter || type === typeFilter) out.push(node.name);
    return out;
  }
  children.forEach((child) => collectLeaves(child, typeFilter, out));
  return out;
}

export function getAllowedActions(): Set<string> {
  const list: string[] = [];
  ACTIONS_TREE.forEach((root) => collectLeaves(root, 'action', list));
  return new Set(list);
}

export function getAllowedRoleNamesFromTree(): string[] {
  const list: string[] = [];
  ACTIONS_TREE.forEach((root) => collectLeaves(root, 'role', list));
  return list;
}

