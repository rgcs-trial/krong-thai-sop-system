/**
 * Offline-First Data Synchronization Manager
 * Robust offline capabilities with intelligent conflict resolution for restaurant operations
 */

import { openDB, IDBPDatabase, IDBPTransaction } from 'idb';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deviceId: string;
  userId: string;
}

interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'manual' | 'merge' | 'newest-wins';
  resolver?: (local: any, remote: any) => any;
}

interface SyncConfig {
  tables: {
    [tableName: string]: {
      conflictResolution: ConflictResolution;
      syncFrequency: number; // in milliseconds
      maxOfflineTime: number; // in milliseconds
      criticalFields?: string[];
    };
  };
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
}

class OfflineSyncManager {
  private db: IDBPDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncQueue: SyncOperation[] = [];
  private listeners: Map<string, Set<Function>> = new Map();
  private deviceId: string;
  private userId: string;
  
  private readonly DB_NAME = 'KrongThaiSOP_OfflineDB';
  private readonly DB_VERSION = 3;
  
  private readonly syncConfig: SyncConfig = {
    tables: {
      // SOP documents - critical for restaurant operations
      sop_documents: {
        conflictResolution: { strategy: 'server-wins' },
        syncFrequency: 30000, // 30 seconds
        maxOfflineTime: 24 * 60 * 60 * 1000, // 24 hours
        criticalFields: ['content', 'emergency_procedures', 'safety_guidelines']
      },
      // Training progress - user-specific data
      training_progress: {
        conflictResolution: { 
          strategy: 'merge',
          resolver: this.mergeTrainingProgress.bind(this)
        },
        syncFrequency: 60000, // 1 minute
        maxOfflineTime: 48 * 60 * 60 * 1000, // 48 hours
      },
      // Form submissions - critical data that shouldn't be lost
      form_submissions: {
        conflictResolution: { strategy: 'client-wins' },
        syncFrequency: 15000, // 15 seconds
        maxOfflineTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      // Audit logs - append-only, no conflicts
      audit_logs: {
        conflictResolution: { strategy: 'client-wins' },
        syncFrequency: 120000, // 2 minutes
        maxOfflineTime: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      // Performance metrics - time-series data
      performance_metrics: {
        conflictResolution: { strategy: 'newest-wins' },
        syncFrequency: 300000, // 5 minutes
        maxOfflineTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      // Translation cache - content updates
      translation_cache: {
        conflictResolution: { strategy: 'server-wins' },
        syncFrequency: 600000, // 10 minutes
        maxOfflineTime: 24 * 60 * 60 * 1000, // 24 hours
      }
    },
    batchSize: 50,
    maxRetries: 5,
    retryDelay: 2000
  };

  constructor(userId: string) {
    this.userId = userId;
    this.deviceId = this.generateDeviceId();
    this.initialize();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('krong-thai-device-id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('krong-thai-device-id', deviceId);
    }
    return deviceId;
  }

  private async initialize(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create object stores for offline data
          if (!db.objectStoreNames.contains('offline_data')) {
            const offlineStore = db.createObjectStore('offline_data', { keyPath: 'id' });
            offlineStore.createIndex('table', 'table');
            offlineStore.createIndex('timestamp', 'timestamp');
            offlineStore.createIndex('userId', 'userId');
          }
          
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('priority', 'priority');
            syncStore.createIndex('timestamp', 'timestamp');
            syncStore.createIndex('table', 'table');
          }
          
          if (!db.objectStoreNames.contains('conflict_log')) {
            const conflictStore = db.createObjectStore('conflict_log', { keyPath: 'id' });
            conflictStore.createIndex('table', 'table');
            conflictStore.createIndex('timestamp', 'timestamp');
            conflictStore.createIndex('resolved', 'resolved');
          }
          
          if (!db.objectStoreNames.contains('sync_metadata')) {
            db.createObjectStore('sync_metadata', { keyPath: 'key' });
          }
        },
      });
      
      // Load pending sync operations
      await this.loadSyncQueue();
      
      console.log('[OfflineSync] Initialized successfully');
    } catch (error) {
      console.error('[OfflineSync] Initialization failed:', error);
      throw error;
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('network-status', { online: true });
      this.triggerSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('network-status', { online: false });
    });
  }

  private startPeriodicSync(): void {
    // Start sync intervals for different table types
    Object.entries(this.syncConfig.tables).forEach(([table, config]) => {
      setInterval(() => {
        if (this.isOnline) {
          this.syncTable(table);
        }
      }, config.syncFrequency);
    });
  }

  // Public API Methods

  async create(table: string, data: any, options: { priority?: 'low' | 'medium' | 'high' | 'critical' } = {}): Promise<string> {
    const id = `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = { ...data, id, _offline: true, _created_at: new Date().toISOString() };
    
    // Store locally immediately
    await this.storeOfflineData(table, record);
    
    // Queue for sync
    const operation: SyncOperation = {
      id: `sync_${id}`,
      type: 'create',
      table,
      data: record,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.syncConfig.maxRetries,
      priority: options.priority || 'medium',
      deviceId: this.deviceId,
      userId: this.userId
    };
    
    await this.queueSyncOperation(operation);
    
    if (this.isOnline) {
      this.triggerSync();
    }
    
    this.emit('data-changed', { table, type: 'create', data: record });
    return id;
  }

  async update(table: string, id: string, data: any, options: { priority?: 'low' | 'medium' | 'high' | 'critical' } = {}): Promise<void> {
    // Get existing data
    const existing = await this.getOfflineData(table, id);
    if (!existing) {
      throw new Error(`Record ${id} not found in ${table}`);
    }
    
    const updated = { 
      ...existing, 
      ...data, 
      _offline: true, 
      _updated_at: new Date().toISOString(),
      _version: (existing._version || 0) + 1
    };
    
    // Store locally
    await this.storeOfflineData(table, updated);
    
    // Queue for sync
    const operation: SyncOperation = {
      id: `sync_${id}_${Date.now()}`,
      type: 'update',
      table,
      data: updated,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.syncConfig.maxRetries,
      priority: options.priority || 'medium',
      deviceId: this.deviceId,
      userId: this.userId
    };
    
    await this.queueSyncOperation(operation);
    
    if (this.isOnline) {
      this.triggerSync();
    }
    
    this.emit('data-changed', { table, type: 'update', data: updated });
  }

  async delete(table: string, id: string, options: { priority?: 'low' | 'medium' | 'high' | 'critical' } = {}): Promise<void> {
    // Mark as deleted locally (soft delete)
    const existing = await this.getOfflineData(table, id);
    if (existing) {
      const deleted = { 
        ...existing, 
        _deleted: true, 
        _deleted_at: new Date().toISOString() 
      };
      await this.storeOfflineData(table, deleted);
    }
    
    // Queue for sync
    const operation: SyncOperation = {
      id: `sync_delete_${id}_${Date.now()}`,
      type: 'delete',
      table,
      data: { id },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.syncConfig.maxRetries,
      priority: options.priority || 'medium',
      deviceId: this.deviceId,
      userId: this.userId
    };
    
    await this.queueSyncOperation(operation);
    
    if (this.isOnline) {
      this.triggerSync();
    }
    
    this.emit('data-changed', { table, type: 'delete', id });
  }

  async find(table: string, query: any = {}): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('offline_data', 'readonly');
    const store = tx.objectStore('offline_data');
    const index = store.index('table');
    
    const records = await index.getAll(table);
    
    // Filter out deleted records and apply query
    return records
      .filter(record => !record._deleted)
      .filter(record => this.matchesQuery(record, query));
  }

  async findById(table: string, id: string): Promise<any | null> {
    return this.getOfflineData(table, id);
  }

  // Sync Management

  async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    this.emit('sync-started');
    
    try {
      await this.processSyncQueue();
      await this.syncFromServer();
      this.emit('sync-completed');
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      this.emit('sync-failed', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const index = store.index('priority');
    
    // Get operations by priority (critical first)
    const priorities = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const operations = await index.getAll(priority);
      
      for (const operation of operations.slice(0, this.syncConfig.batchSize)) {
        try {
          await this.executeSyncOperation(operation);
          await store.delete(operation.id);
        } catch (error) {
          console.error('[OfflineSync] Operation failed:', error);
          
          // Increment retry count
          operation.retryCount++;
          
          if (operation.retryCount >= operation.maxRetries) {
            console.error('[OfflineSync] Max retries reached for operation:', operation.id);
            await store.delete(operation.id);
            this.emit('sync-operation-failed', { operation, error });
          } else {
            // Update retry count and reschedule
            await store.put(operation);
          }
        }
      }
    }
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    const endpoint = this.getAPIEndpoint(operation.table, operation.type);
    
    let response: Response;
    
    switch (operation.type) {
      case 'create':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
          body: JSON.stringify(operation.data),
        });
        break;
        
      case 'update':
        response = await fetch(`${endpoint}/${operation.data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
          body: JSON.stringify(operation.data),
        });
        break;
        
      case 'delete':
        response = await fetch(`${endpoint}/${operation.data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
        });
        break;
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
    
    if (!response.ok) {
      // Handle conflict (409) specially
      if (response.status === 409) {
        const serverData = await response.json();
        await this.handleConflict(operation, serverData);
        return;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Update local data with server response
    if (operation.type !== 'delete') {
      const serverData = await response.json();
      await this.updateLocalAfterSync(operation.table, serverData);
    }
  }

  private async syncFromServer(): Promise<void> {
    // Pull updates from server for each table
    for (const table of Object.keys(this.syncConfig.tables)) {
      try {
        await this.pullServerUpdates(table);
      } catch (error) {
        console.error(`[OfflineSync] Failed to pull updates for ${table}:`, error);
      }
    }
  }

  private async pullServerUpdates(table: string): Promise<void> {
    const lastSync = await this.getLastSyncTimestamp(table);
    const endpoint = `${this.getAPIEndpoint(table, 'read')}?since=${lastSync}&device_id=${this.deviceId}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const updates = await response.json();
    
    for (const update of updates) {
      await this.mergeServerUpdate(table, update);
    }
    
    await this.setLastSyncTimestamp(table, Date.now());
  }

  // Conflict Resolution

  private async handleConflict(operation: SyncOperation, serverData: any): Promise<void> {
    const config = this.syncConfig.tables[operation.table];
    const localData = operation.data;
    
    let resolvedData: any;
    
    switch (config.conflictResolution.strategy) {
      case 'client-wins':
        resolvedData = localData;
        break;
        
      case 'server-wins':
        resolvedData = serverData;
        break;
        
      case 'newest-wins':
        const localTime = new Date(localData._updated_at || localData._created_at).getTime();
        const serverTime = new Date(serverData.updated_at || serverData.created_at).getTime();
        resolvedData = localTime > serverTime ? localData : serverData;
        break;
        
      case 'merge':
        if (config.conflictResolution.resolver) {
          resolvedData = config.conflictResolution.resolver(localData, serverData);
        } else {
          resolvedData = { ...serverData, ...localData };
        }
        break;
        
      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflict(operation.table, localData, serverData);
        this.emit('conflict-detected', { 
          table: operation.table, 
          local: localData, 
          server: serverData 
        });
        return;
        
      default:
        throw new Error(`Unknown conflict resolution strategy: ${config.conflictResolution.strategy}`);
    }
    
    // Apply resolved data
    await this.storeOfflineData(operation.table, resolvedData);
    
    // Log the conflict resolution
    await this.logConflictResolution(operation.table, localData, serverData, resolvedData);
    
    this.emit('conflict-resolved', { 
      table: operation.table, 
      strategy: config.conflictResolution.strategy,
      resolved: resolvedData 
    });
  }

  private mergeTrainingProgress(local: any, server: any): any {
    // Custom merger for training progress
    const merged = { ...server };
    
    // Merge progress scores (take maximum)
    if (local.progress_scores && server.progress_scores) {
      merged.progress_scores = { ...server.progress_scores };
      Object.keys(local.progress_scores).forEach(key => {
        if (!merged.progress_scores[key] || local.progress_scores[key] > merged.progress_scores[key]) {
          merged.progress_scores[key] = local.progress_scores[key];
        }
      });
    }
    
    // Merge completion timestamps (take earliest)
    if (local.completed_modules && server.completed_modules) {
      merged.completed_modules = { ...server.completed_modules };
      Object.keys(local.completed_modules).forEach(key => {
        if (!merged.completed_modules[key] || 
            new Date(local.completed_modules[key]) < new Date(merged.completed_modules[key])) {
          merged.completed_modules[key] = local.completed_modules[key];
        }
      });
    }
    
    return merged;
  }

  // Helper Methods

  private async storeOfflineData(table: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('offline_data', 'readwrite');
    const store = tx.objectStore('offline_data');
    
    const record = {
      ...data,
      table,
      userId: this.userId,
      timestamp: Date.now(),
    };
    
    await store.put(record);
  }

  private async getOfflineData(table: string, id: string): Promise<any | null> {
    if (!this.db) return null;
    
    const tx = this.db.transaction('offline_data', 'readonly');
    const store = tx.objectStore('offline_data');
    
    const record = await store.get(id);
    return record && record.table === table && !record._deleted ? record : null;
  }

  private async queueSyncOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    
    await store.put(operation);
    this.syncQueue.push(operation);
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    
    this.syncQueue = await store.getAll();
  }

  private matchesQuery(record: any, query: any): boolean {
    // Simple query matching - can be extended
    return Object.keys(query).every(key => record[key] === query[key]);
  }

  private getAPIEndpoint(table: string, operation: string): string {
    // Map table names to API endpoints
    const endpoints = {
      sop_documents: '/api/sop',
      training_progress: '/api/training/progress',
      form_submissions: '/api/forms',
      audit_logs: '/api/audit',
      performance_metrics: '/api/metrics',
      translation_cache: '/api/translations/cache',
    };
    
    return endpoints[table] || `/api/${table}`;
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from your auth system
    return localStorage.getItem('auth_token') || '';
  }

  private async getLastSyncTimestamp(table: string): Promise<number> {
    if (!this.db) return 0;
    
    const tx = this.db.transaction('sync_metadata', 'readonly');
    const store = tx.objectStore('sync_metadata');
    
    const record = await store.get(`last_sync_${table}`);
    return record?.value || 0;
  }

  private async setLastSyncTimestamp(table: string, timestamp: number): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('sync_metadata', 'readwrite');
    const store = tx.objectStore('sync_metadata');
    
    await store.put({ key: `last_sync_${table}`, value: timestamp });
  }

  private async mergeServerUpdate(table: string, serverData: any): Promise<void> {
    const localData = await this.getOfflineData(table, serverData.id);
    
    if (!localData) {
      // New data from server
      await this.storeOfflineData(table, { ...serverData, _offline: false });
    } else if (localData._offline) {
      // Local changes exist - potential conflict
      await this.handleConflict({
        id: `merge_${serverData.id}`,
        type: 'update',
        table,
        data: localData,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 0,
        priority: 'medium',
        deviceId: this.deviceId,
        userId: this.userId
      }, serverData);
    } else {
      // Server update to existing synced data
      await this.storeOfflineData(table, { ...serverData, _offline: false });
    }
  }

  private async updateLocalAfterSync(table: string, serverData: any): Promise<void> {
    await this.storeOfflineData(table, { ...serverData, _offline: false });
  }

  private async storeConflict(table: string, localData: any, serverData: any): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('conflict_log', 'readwrite');
    const store = tx.objectStore('conflict_log');
    
    const conflict = {
      id: `conflict_${table}_${localData.id}_${Date.now()}`,
      table,
      localData,
      serverData,
      timestamp: Date.now(),
      resolved: false,
    };
    
    await store.put(conflict);
  }

  private async logConflictResolution(table: string, localData: any, serverData: any, resolvedData: any): Promise<void> {
    console.log(`[OfflineSync] Conflict resolved for ${table}:`, {
      local: localData,
      server: serverData,
      resolved: resolvedData,
    });
  }

  // Event System

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[OfflineSync] Event callback error for ${event}:`, error);
      }
    });
  }

  // Public Status Methods

  getStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    queueLength: number;
    lastSync: Record<string, number>;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      lastSync: {}, // Would be populated from metadata
    };
  }

  async getConflicts(): Promise<any[]> {
    if (!this.db) return [];
    
    const tx = this.db.transaction('conflict_log', 'readonly');
    const store = tx.objectStore('conflict_log');
    const index = store.index('resolved');
    
    return index.getAll(false);
  }

  async resolveConflict(conflictId: string, resolution: any): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction(['conflict_log', 'offline_data'], 'readwrite');
    const conflictStore = tx.objectStore('conflict_log');
    const dataStore = tx.objectStore('offline_data');
    
    const conflict = await conflictStore.get(conflictId);
    if (!conflict) return;
    
    // Apply resolution
    await dataStore.put({
      ...resolution,
      table: conflict.table,
      userId: this.userId,
      timestamp: Date.now(),
    });
    
    // Mark conflict as resolved
    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    await conflictStore.put(conflict);
    
    this.emit('manual-conflict-resolved', { conflictId, resolution });
  }
}

export default OfflineSyncManager;
export type { SyncOperation, ConflictResolution, SyncConfig };