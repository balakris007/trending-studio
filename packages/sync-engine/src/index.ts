/**
 * TRENDING STUDIO — SYNC ENGINE
 * Robust offline synchronization protocols, idempotency key checks,
 * version conflict detection, and merge policies.
 */

import {
  ISyncOperation,
  SyncOperationType,
  SyncStatus,
} from '@trending-studio/shared-types';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  reason?: string;
  strategy?: 'AUTO_RESOLVE' | 'REQUIRE_MANUAL_RESOLUTION';
  mergedPayload?: any;
}

/**
 * Generate a unique idempotency key for an operation
 */
export function generateOperationId(
  deviceId: string,
  entity: string,
  localId: string,
  timestamp: string | number
): string {
  return `${deviceId}_${entity}_${localId}_${timestamp}`;
}

/**
 * Detect conflict between incoming client operation and existing server state
 */
export function detectSyncConflict(
  clientOp: ISyncOperation,
  serverDoc: any | null
): ConflictDetectionResult {
  // If entity does not exist on server, a CREATE operation has no conflict
  if (!serverDoc) {
    return { hasConflict: false };
  }

  // If server document was already deleted
  if (serverDoc.deletedAt) {
    return {
      hasConflict: true,
      reason: 'Entity was deleted on server',
      strategy: 'REQUIRE_MANUAL_RESOLUTION',
    };
  }

  // Version check (Optimistic Locking)
  const serverVersion = serverDoc.version || 1;
  const clientVersion = clientOp.version || 1;

  if (serverVersion > clientVersion) {
    // Server has progressed beyond the client's base version
    // Check if fields modified by client conflict with server modifications
    const canAutoMerge = canAttemptThreeWayMerge(
      clientOp.payload,
      serverDoc,
      clientOp.entity
    );

    if (canAutoMerge.canMerge) {
      return {
        hasConflict: false,
        strategy: 'AUTO_RESOLVE',
        mergedPayload: canAutoMerge.merged,
      };
    }

    return {
      hasConflict: true,
      reason: `Version conflict: client version ${clientVersion} < server version ${serverVersion}`,
      strategy: 'REQUIRE_MANUAL_RESOLUTION',
    };
  }

  return { hasConflict: false };
}

/**
 * Field-level non-overlapping merge for master entities like Customers
 */
export function canAttemptThreeWayMerge(
  clientPayload: any,
  serverDoc: any,
  entityType: string
): { canMerge: boolean; merged?: any } {
  // Never auto-merge financial documents (invoices, payments)
  if (entityType === 'invoice' || entityType === 'payment') {
    return { canMerge: false };
  }

  const merged = { ...serverDoc };
  let hasOverlap = false;

  // Compare modified keys
  for (const key of Object.keys(clientPayload)) {
    if (['version', '_id', 'id', 'updatedAt', 'createdAt'].includes(key)) {
      continue;
    }

    const clientVal = clientPayload[key];
    const serverVal = serverDoc[key];

    // If both modified the same field to different values -> Hard conflict
    if (
      serverVal !== undefined &&
      clientVal !== undefined &&
      JSON.stringify(serverVal) !== JSON.stringify(clientVal)
    ) {
      hasOverlap = true;
      break;
    }

    if (clientVal !== undefined) {
      merged[key] = clientVal;
    }
  }

  if (hasOverlap) {
    return { canMerge: false };
  }

  merged.version = (serverDoc.version || 1) + 1;
  return { canMerge: true, merged };
}

/**
 * Apply conflict resolution choice
 */
export function applyConflictResolution(
  choice: 'KEEP_LOCAL' | 'KEEP_SERVER' | 'MANUAL_MERGE',
  clientPayload: any,
  serverDoc: any,
  manualMergePayload?: any
): any {
  switch (choice) {
    case 'KEEP_LOCAL':
      return {
        ...clientPayload,
        version: (serverDoc.version || 1) + 1,
        updatedAt: new Date().toISOString(),
      };
    case 'KEEP_SERVER':
      return serverDoc;
    case 'MANUAL_MERGE':
      return {
        ...manualMergePayload,
        version: (serverDoc.version || 1) + 1,
        updatedAt: new Date().toISOString(),
      };
  }
}
