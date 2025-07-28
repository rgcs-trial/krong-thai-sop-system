/**
 * Background Sync Service for Critical SOP Operations
 * Ensures critical restaurant operations are synchronized even when offline
 */

import { openDB, IDBPDatabase } from 'idb';

interface BackgroundSyncOperation {
  id: string;
  type: 'sop_access' | 'form_submission' | 'training_progress' | 'audit_log' | 'emergency_report' | 'shift_action';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: any;
  createdAt: number;
  scheduledFor?: number;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deviceId: string;
  userId: string;
  restaurantId: string;
  networkRequired: boolean;
  dependencies?: string[];
}

interface SyncStrategy {
  immediate: boolean;
  retryDelay: number;
  maxRetries: number;
  batchSize: number;
  requireNetwork: boolean;
  fallbackAction?: (operation: BackgroundSyncOperation) => Promise<void>;
}

class BackgroundSyncService {
  private db: IDBPDatabase | null = null;
  private isOnline = navigator.onLine;
  private isProcessing = false;
  private syncWorker: ServiceWorkerRegistration | null = null;
  private operationQueue: Map<string, BackgroundSyncOperation> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();

  private readonly DB_NAME = 'KrongThaiSOP_BackgroundSync';
  private readonly DB_VERSION = 2;
  private readonly SYNC_TAG = 'krong-thai-background-sync';

  // Sync strategies for different operation types
  private readonly syncStrategies: Record<string, SyncStrategy> = {
    emergency_report: {
      immediate: true,
      retryDelay: 1000, // 1 second
      maxRetries: 10,
      batchSize: 1,
      requireNetwork: true,
    },
    sop_access: {
      immediate: false,
      retryDelay: 5000, // 5 seconds
      maxRetries: 5,
      batchSize: 10,
      requireNetwork: true,
    },
    form_submission: {
      immediate: true,
      retryDelay: 2000, // 2 seconds
      maxRetries: 8,
      batchSize: 5,
      requireNetwork: true,
    },
    training_progress: {
      immediate: false,
      retryDelay: 10000, // 10 seconds
      maxRetries: 3,
      batchSize: 20,
      requireNetwork: true,
    },
    audit_log: {
      immediate: false,
      retryDelay: 30000, // 30 seconds
      maxRetries: 3,
      batchSize: 50,
      requireNetwork: true,
    },
    shift_action: {
      immediate: true,
      retryDelay: 3000, // 3 seconds
      maxRetries: 6,
      batchSize: 3,
      requireNetwork: true,
    },
  };

  constructor(
    private userId: string,
    private restaurantId: string,
    private deviceId: string
  ) {
    this.initialize();
    this.setupNetworkListeners();
    this.registerServiceWorker();
  }

  private async initialize(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Background sync operations store
          if (!db.objectStoreNames.contains('sync_operations')) {
            const syncStore = db.createObjectStore('sync_operations', { keyPath: 'id' });
            syncStore.createIndex('type', 'type');
            syncStore.createIndex('priority', 'priority');
            syncStore.createIndex('status', 'status');
            syncStore.createIndex('createdAt', 'createdAt');
            syncStore.createIndex('scheduledFor', 'scheduledFor');
            syncStore.createIndex('userId', 'userId');
            syncStore.createIndex('restaurantId', 'restaurantId');
          }

          // Sync statistics and metadata
          if (!db.objectStoreNames.contains('sync_stats')) {
            const statsStore = db.createObjectStore('sync_stats', { keyPath: 'key' });
          }

          // Operation dependencies tracking
          if (!db.objectStoreNames.contains('sync_dependencies')) {
            const depsStore = db.createObjectStore('sync_dependencies', { keyPath: 'id' });
            depsStore.createIndex('parentId', 'parentId');
            depsStore.createIndex('dependentId', 'dependentId');
          }
        },
      });

      // Load pending operations
      await this.loadPendingOperations();
      
      console.log('[BackgroundSync] Initialized successfully');
    } catch (error) {
      console.error('[BackgroundSync] Initialization failed:', error);
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

    // Listen for visibility change to trigger sync when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.syncWorker = registration;

        // Listen for sync events from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'BACKGROUND_SYNC_COMPLETED') {
            this.handleSyncCompletion(event.data.operations);
          }
        });

        console.log('[BackgroundSync] Service Worker registered for background sync');
      } catch (error) {
        console.error('[BackgroundSync] Service Worker registration failed:', error);
      }
    }
  }

  // Public API Methods

  async queueOperation(
    type: BackgroundSyncOperation['type'],
    payload: any,
    options: {
      priority?: BackgroundSyncOperation['priority'];
      scheduledFor?: number;
      dependencies?: string[];
      immediate?: boolean;
    } = {}
  ): Promise<string> {
    const operation: BackgroundSyncOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options.priority || this.getDefaultPriority(type),
      payload,
      createdAt: Date.now(),
      scheduledFor: options.scheduledFor,
      retryCount: 0,
      maxRetries: this.syncStrategies[type]?.maxRetries || 3,
      status: 'pending',
      deviceId: this.deviceId,
      userId: this.userId,
      restaurantId: this.restaurantId,
      networkRequired: this.syncStrategies[type]?.requireNetwork !== false,
      dependencies: options.dependencies,
    };

    await this.storeOperation(operation);
    this.operationQueue.set(operation.id, operation);

    // Emit event for UI updates
    this.emit('operation-queued', { operation });

    // Handle immediate operations
    const strategy = this.syncStrategies[type];
    if ((strategy?.immediate || options.immediate) && this.isOnline) {
      await this.processOperation(operation);
    } else {
      // Register for background sync
      await this.registerBackgroundSync();
    }

    return operation.id;
  }

  // Specialized methods for different operation types

  async reportEmergency(emergencyData: {
    type: string;
    location: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reportedBy: string;
    timestamp: number;
  }): Promise<string> {
    return this.queueOperation('emergency_report', emergencyData, {
      priority: 'critical',
      immediate: true,
    });
  }

  async logSOPAccess(sopData: {
    sopId: string;
    category: string;
    action: 'view' | 'search' | 'bookmark' | 'complete';
    duration?: number;
    searchQuery?: string;
    timestamp: number;
  }): Promise<string> {
    return this.queueOperation('sop_access', sopData, {
      priority: 'medium',
    });
  }

  async submitForm(formData: {
    formType: string;
    formId: string;
    data: any;
    signatures?: string[];
    attachments?: string[];
    submitTime: number;
  }): Promise<string> {
    return this.queueOperation('form_submission', formData, {
      priority: 'high',
      immediate: true,
    });
  }

  async updateTrainingProgress(progressData: {
    moduleId: string;
    progress: number;
    completedSections: string[];
    assessmentScores?: Record<string, number>;
    timeSpent: number;
    timestamp: number;
  }): Promise<string> {
    return this.queueOperation('training_progress', progressData, {
      priority: 'medium',
    });
  }

  async logAuditEvent(auditData: {
    action: string;
    resource: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: number;
  }): Promise<string> {
    return this.queueOperation('audit_log', auditData, {
      priority: 'low',
    });
  }

  async recordShiftAction(shiftData: {
    action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
    timestamp: number;
    location?: string;
    notes?: string;
    supervisorOverride?: boolean;
  }): Promise<string> {
    return this.queueOperation('shift_action', shiftData, {
      priority: 'high',
      immediate: true,
    });
  }

  // Sync Management

  async triggerSync(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.emit('sync-started');

    try {
      await this.processPendingOperations();
      await this.cleanupCompletedOperations();
      this.emit('sync-completed');
    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
      this.emit('sync-failed', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processPendingOperations(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('sync_operations', 'readwrite');
    const store = tx.objectStore('sync_operations');
    const statusIndex = store.index('status');

    // Get pending operations sorted by priority and creation time
    const pendingOps = await statusIndex.getAll('pending');
    const sortedOps = this.sortOperationsByPriority(pendingOps);

    // Group operations by type for batch processing
    const operationGroups = new Map<string, BackgroundSyncOperation[]>();
    
    for (const op of sortedOps) {
      if (!operationGroups.has(op.type)) {
        operationGroups.set(op.type, []);
      }
      
      const strategy = this.syncStrategies[op.type];
      const group = operationGroups.get(op.type)!;
      
      if (group.length < (strategy?.batchSize || 10)) {
        group.push(op);
      }
    }

    // Process each group
    for (const [type, operations] of operationGroups) {
      try {
        await this.processBatch(type, operations);
      } catch (error) {
        console.error(`[BackgroundSync] Batch processing failed for ${type}:`, error);
      }
    }
  }

  private async processBatch(
    type: string, 
    operations: BackgroundSyncOperation[]
  ): Promise<void> {
    const strategy = this.syncStrategies[type];
    
    // Check if network is required and available
    if (strategy?.requireNetwork && !this.isOnline) {
      console.log(`[BackgroundSync] Skipping ${type} batch - network required but offline`);
      return;
    }

    // Check dependencies
    const readyOperations = await this.filterReadyOperations(operations);
    
    if (readyOperations.length === 0) {
      return;
    }

    // Process operations based on type
    switch (type) {
      case 'emergency_report':
        await this.processEmergencyReports(readyOperations);
        break;
      case 'sop_access':
        await this.processSOPAccessLogs(readyOperations);
        break;
      case 'form_submission':
        await this.processFormSubmissions(readyOperations);
        break;
      case 'training_progress':
        await this.processTrainingProgress(readyOperations);
        break;
      case 'audit_log':
        await this.processAuditLogs(readyOperations);
        break;
      case 'shift_action':
        await this.processShiftActions(readyOperations);
        break;
      default:
        console.warn(`[BackgroundSync] Unknown operation type: ${type}`);
    }
  }

  // Operation processors

  private async processEmergencyReports(operations: BackgroundSyncOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        await this.updateOperationStatus(operation.id, 'processing');
        
        const response = await fetch('/api/emergency/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
          body: JSON.stringify({
            ...operation.payload,
            operationId: operation.id,
            deviceId: this.deviceId,
            offlineSubmission: true,
          }),
        });

        if (response.ok) {
          await this.updateOperationStatus(operation.id, 'completed');
          this.emit('operation-completed', { operation, response: await response.json() });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async processSOPAccessLogs(operations: BackgroundSyncOperation[]): Promise<void> {
    try {
      // Batch process SOP access logs
      const logs = operations.map(op => ({
        ...op.payload,
        operationId: op.id,
        deviceId: this.deviceId,
      }));

      const response = await fetch('/api/sop/access-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Device-ID': this.deviceId,
        },
        body: JSON.stringify({ logs }),
      });

      if (response.ok) {
        // Mark all operations as completed
        for (const operation of operations) {
          await this.updateOperationStatus(operation.id, 'completed');
          this.emit('operation-completed', { operation });
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Handle individual operations on batch failure
      for (const operation of operations) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async processFormSubmissions(operations: BackgroundSyncOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        await this.updateOperationStatus(operation.id, 'processing');
        
        const formData = operation.payload;
        const endpoint = `/api/forms/${formData.formType}/submit`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
          body: JSON.stringify({
            ...formData,
            operationId: operation.id,
            offlineSubmission: true,
          }),
        });

        if (response.ok) {
          await this.updateOperationStatus(operation.id, 'completed');
          const result = await response.json();
          
          // Handle confirmation notifications
          if (result.confirmationId) {
            this.emit('form-submitted', { 
              operation, 
              confirmationId: result.confirmationId,
              formType: formData.formType 
            });
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async processTrainingProgress(operations: BackgroundSyncOperation[]): Promise<void> {
    try {
      // Merge progress updates for the same module
      const progressMap = new Map<string, any>();
      const operationMap = new Map<string, BackgroundSyncOperation>();

      for (const operation of operations) {
        const moduleId = operation.payload.moduleId;
        if (!progressMap.has(moduleId)) {
          progressMap.set(moduleId, operation.payload);
          operationMap.set(moduleId, operation);
        } else {
          // Merge progress data
          const existing = progressMap.get(moduleId);
          const merged = this.mergeTrainingProgress(existing, operation.payload);
          progressMap.set(moduleId, merged);
        }
      }

      // Submit merged progress
      const progressUpdates = Array.from(progressMap.entries()).map(([moduleId, progress]) => ({
        moduleId,
        ...progress,
        operationId: operationMap.get(moduleId)!.id,
      }));

      const response = await fetch('/api/training/progress/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Device-ID': this.deviceId,
        },
        body: JSON.stringify({ updates: progressUpdates }),
      });

      if (response.ok) {
        for (const operation of operations) {
          await this.updateOperationStatus(operation.id, 'completed');
          this.emit('operation-completed', { operation });
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      for (const operation of operations) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async processAuditLogs(operations: BackgroundSyncOperation[]): Promise<void> {
    try {
      const auditLogs = operations.map(op => ({
        ...op.payload,
        operationId: op.id,
        deviceId: this.deviceId,
      }));

      const response = await fetch('/api/audit/logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Device-ID': this.deviceId,
        },
        body: JSON.stringify({ logs: auditLogs }),
      });

      if (response.ok) {
        for (const operation of operations) {
          await this.updateOperationStatus(operation.id, 'completed');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      for (const operation of operations) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async processShiftActions(operations: BackgroundSyncOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        await this.updateOperationStatus(operation.id, 'processing');
        
        const response = await fetch('/api/shifts/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'X-Device-ID': this.deviceId,
          },
          body: JSON.stringify({
            ...operation.payload,
            operationId: operation.id,
            userId: this.userId,
            restaurantId: this.restaurantId,
          }),
        });

        if (response.ok) {
          await this.updateOperationStatus(operation.id, 'completed');
          const result = await response.json();
          
          this.emit('shift-action-completed', { 
            operation, 
            action: operation.payload.action,
            result 
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  // Helper methods

  private async processOperation(operation: BackgroundSyncOperation): Promise<void> {
    await this.processBatch(operation.type, [operation]);
  }

  private sortOperationsByPriority(operations: BackgroundSyncOperation[]): BackgroundSyncOperation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return operations.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time (older first)
      return a.createdAt - b.createdAt;
    });
  }

  private async filterReadyOperations(operations: BackgroundSyncOperation[]): Promise<BackgroundSyncOperation[]> {
    const ready: BackgroundSyncOperation[] = [];
    
    for (const operation of operations) {
      // Check if scheduled time has passed
      if (operation.scheduledFor && operation.scheduledFor > Date.now()) {
        continue;
      }
      
      // Check dependencies
      if (operation.dependencies) {
        const dependenciesMet = await this.checkDependencies(operation.dependencies);
        if (!dependenciesMet) {
          continue;
        }
      }
      
      ready.push(operation);
    }
    
    return ready;
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    if (!this.db) return true;
    
    const tx = this.db.transaction('sync_operations', 'readonly');
    const store = tx.objectStore('sync_operations');
    
    for (const depId of dependencies) {
      const dep = await store.get(depId);
      if (!dep || dep.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }

  private async handleOperationError(operation: BackgroundSyncOperation, error: any): Promise<void> {
    console.error(`[BackgroundSync] Operation ${operation.id} failed:`, error);
    
    operation.retryCount++;
    operation.lastAttempt = Date.now();
    
    const strategy = this.syncStrategies[operation.type];
    
    if (operation.retryCount >= operation.maxRetries) {
      await this.updateOperationStatus(operation.id, 'failed');
      this.emit('operation-failed', { operation, error });
      
      // Execute fallback action if available
      if (strategy?.fallbackAction) {
        try {
          await strategy.fallbackAction(operation);
        } catch (fallbackError) {
          console.error(`[BackgroundSync] Fallback action failed for ${operation.id}:`, fallbackError);
        }
      }
    } else {
      // Schedule retry
      const retryDelay = strategy?.retryDelay || 5000;
      const backoffDelay = retryDelay * Math.pow(2, operation.retryCount - 1);
      
      setTimeout(() => {
        this.processOperation(operation);
      }, backoffDelay);
      
      // Update operation in database
      await this.storeOperation(operation);
      this.emit('operation-retrying', { operation, nextRetry: Date.now() + backoffDelay });
    }
  }

  private mergeTrainingProgress(existing: any, update: any): any {
    return {
      ...existing,
      ...update,
      progress: Math.max(existing.progress || 0, update.progress || 0),
      completedSections: [...new Set([...(existing.completedSections || []), ...(update.completedSections || [])])],
      assessmentScores: { ...(existing.assessmentScores || {}), ...(update.assessmentScores || {}) },
      timeSpent: (existing.timeSpent || 0) + (update.timeSpent || 0),
      timestamp: Math.max(existing.timestamp || 0, update.timestamp || 0),
    };
  }

  private getDefaultPriority(type: BackgroundSyncOperation['type']): BackgroundSyncOperation['priority'] {
    switch (type) {
      case 'emergency_report':
        return 'critical';
      case 'form_submission':
      case 'shift_action':
        return 'high';
      case 'sop_access':
      case 'training_progress':
        return 'medium';
      case 'audit_log':
        return 'low';
      default:
        return 'medium';
    }
  }

  // Database operations

  private async storeOperation(operation: BackgroundSyncOperation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('sync_operations', 'readwrite');
    const store = tx.objectStore('sync_operations');
    
    await store.put(operation);
  }

  private async updateOperationStatus(
    operationId: string, 
    status: BackgroundSyncOperation['status']
  ): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('sync_operations', 'readwrite');
    const store = tx.objectStore('sync_operations');
    
    const operation = await store.get(operationId);
    if (operation) {
      operation.status = status;
      if (status === 'completed' || status === 'failed') {
        operation.lastAttempt = Date.now();
      }
      await store.put(operation);
      
      // Update in-memory queue
      this.operationQueue.set(operationId, operation);
    }
  }

  private async loadPendingOperations(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('sync_operations', 'readonly');
    const store = tx.objectStore('sync_operations');
    const statusIndex = store.index('status');
    
    const pendingOps = await statusIndex.getAll('pending');
    const processingOps = await statusIndex.getAll('processing');
    
    [...pendingOps, ...processingOps].forEach(op => {
      this.operationQueue.set(op.id, op);
    });
  }

  private async cleanupCompletedOperations(): Promise<void> {
    if (!this.db) return;
    
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    const tx = this.db.transaction('sync_operations', 'readwrite');
    const store = tx.objectStore('sync_operations');
    const statusIndex = store.index('status');
    
    // Clean up old completed operations
    const completedOps = await statusIndex.getAll('completed');
    const oldOps = completedOps.filter(op => op.lastAttempt && op.lastAttempt < cutoffTime);
    
    for (const op of oldOps) {
      await store.delete(op.id);
      this.operationQueue.delete(op.id);
    }
    
    console.log(`[BackgroundSync] Cleaned up ${oldOps.length} old operations`);
  }

  private async registerBackgroundSync(): Promise<void> {
    if (this.syncWorker && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        await this.syncWorker.sync.register(this.SYNC_TAG);
      } catch (error) {
        console.error('[BackgroundSync] Failed to register background sync:', error);
      }
    }
  }

  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  // Event system

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
        console.error(`[BackgroundSync] Event callback error for ${event}:`, error);
      }
    });
  }

  // Public status methods

  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const operations = Array.from(this.operationQueue.values());
    
    return {
      pending: operations.filter(op => op.status === 'pending').length,
      processing: operations.filter(op => op.status === 'processing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      total: operations.length,
    };
  }

  async getOperationHistory(limit = 50): Promise<BackgroundSyncOperation[]> {
    if (!this.db) return [];
    
    const tx = this.db.transaction('sync_operations', 'readonly');
    const store = tx.objectStore('sync_operations');
    const createdAtIndex = store.index('createdAt');
    
    const operations = await createdAtIndex.getAll();
    return operations
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  async retryFailedOperations(): Promise<void> {
    const failedOps = Array.from(this.operationQueue.values())
      .filter(op => op.status === 'failed');
    
    for (const op of failedOps) {
      op.status = 'pending';
      op.retryCount = 0;
      await this.storeOperation(op);
    }
    
    if (failedOps.length > 0) {
      this.emit('operations-retried', { count: failedOps.length });
      await this.triggerSync();
    }
  }

  private handleSyncCompletion(completedOperations: string[]): void {
    completedOperations.forEach(opId => {
      const operation = this.operationQueue.get(opId);
      if (operation) {
        operation.status = 'completed';
        this.emit('operation-completed', { operation });
      }
    });
  }
}

export default BackgroundSyncService;
export type { BackgroundSyncOperation, SyncStrategy };