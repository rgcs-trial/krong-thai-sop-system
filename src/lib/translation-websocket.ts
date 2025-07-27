/**
 * Translation WebSocket Integration
 * Restaurant Krong Thai SOP Management System
 * 
 * Provides real-time translation updates via WebSocket for live translation management
 */

'use client';

import { type TranslationUpdateEvent } from '@/types/translation';

// WebSocket configuration
const WS_CONFIG = {
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
  MESSAGE_QUEUE_SIZE: 100,
} as const;

// WebSocket message types
export interface WebSocketMessage {
  type: 'heartbeat' | 'subscribe' | 'unsubscribe' | 'translation_update';
  payload?: any;
  timestamp: number;
  id: string;
}

// Subscription options
export interface SubscriptionOptions {
  locales?: string[];
  namespaces?: string[];
  keys?: string[];
  restaurantId?: string;
}

// Connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Event handlers
export interface TranslationWebSocketEvents {
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;
  onUpdate: (event: TranslationUpdateEvent) => void;
  onReconnect: (attempt: number) => void;
}

/**
 * Enhanced WebSocket manager for translation updates
 */
export class TranslationWebSocketManager {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Set<SubscriptionOptions> = new Set();
  private eventHandlers: Partial<TranslationWebSocketEvents> = {};
  private isDestroyed = false;

  constructor(private baseUrl?: string) {
    this.baseUrl = baseUrl || this.getWebSocketUrl();
    
    // Auto-connect on instantiation
    this.connect();
    
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Handle network status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3000/api/translations/ws';
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/translations/ws`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.isDestroyed || this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.setConnectionState('connecting');
    
    try {
      this.ws = new WebSocket(this.baseUrl);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.handleError(new Error('Connection timeout'));
          this.ws?.close();
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.setConnectionState('connected');
        this.reconnectAttempts = 0;
        this.eventHandlers.onConnect?.();
        
        // Send queued messages
        this.flushMessageQueue();
        
        // Re-establish subscriptions
        this.reestablishSubscriptions();
        
        // Start heartbeat
        this.startHeartbeat();
        
        console.debug('Translation WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.stopHeartbeat();
        
        const reason = event.reason || `WebSocket closed with code ${event.code}`;
        console.debug('Translation WebSocket closed:', reason);
        
        this.eventHandlers.onDisconnect?.(reason);
        
        if (!this.isDestroyed && event.code !== 1000) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState('disconnected');
        }
      };

      this.ws.onerror = (event) => {
        clearTimeout(connectionTimeout);
        const error = new Error('WebSocket connection error');
        this.handleError(error);
      };

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.isDestroyed = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
  }

  /**
   * Subscribe to translation updates
   */
  public subscribe(options: SubscriptionOptions = {}): () => void {
    this.subscriptions.add(options);
    
    if (this.connectionState === 'connected') {
      this.sendSubscription(options);
    }
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(options);
      if (this.connectionState === 'connected') {
        this.sendUnsubscription(options);
      }
    };
  }

  /**
   * Set event handlers
   */
  public on<T extends keyof TranslationWebSocketEvents>(
    event: T,
    handler: TranslationWebSocketEvents[T]
  ): void {
    this.eventHandlers[event] = handler;
  }

  /**
   * Remove event handler
   */
  public off<T extends keyof TranslationWebSocketEvents>(event: T): void {
    delete this.eventHandlers[event];
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      isDestroyed: this.isDestroyed,
    };
  }

  /**
   * Send a message to the server
   */
  private sendMessage(type: WebSocketMessage['type'], payload?: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.warn('Failed to send WebSocket message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= WS_CONFIG.MESSAGE_QUEUE_SIZE) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push(message);
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.connectionState !== 'connected' || !this.ws) return;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.warn('Failed to send queued message:', error);
          break;
        }
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'translation_update':
          this.eventHandlers.onUpdate?.(data.payload as TranslationUpdateEvent);
          break;
          
        case 'heartbeat':
          // Respond to server heartbeat
          this.sendMessage('heartbeat');
          break;
          
        default:
          console.debug('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send subscription request
   */
  private sendSubscription(options: SubscriptionOptions): void {
    this.sendMessage('subscribe', options);
  }

  /**
   * Send unsubscription request
   */
  private sendUnsubscription(options: SubscriptionOptions): void {
    this.sendMessage('unsubscribe', options);
  }

  /**
   * Re-establish all subscriptions after reconnect
   */
  private reestablishSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      this.sendSubscription(subscription);
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendMessage('heartbeat');
      }
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Set connection state and notify handlers
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      console.debug(`Translation WebSocket state: ${state}`);
    }
  }

  /**
   * Handle connection errors
   */
  private handleError(error: Error): void {
    console.warn('Translation WebSocket error:', error);
    this.setConnectionState('error');
    this.eventHandlers.onError?.(error);
    
    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.setConnectionState('disconnected');
      return;
    }

    this.setConnectionState('reconnecting');
    this.clearReconnectTimer();
    
    const delay = Math.min(
      WS_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.eventHandlers.onReconnect?.(this.reconnectAttempts);
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.connectionState === 'disconnected') {
      this.connect();
    }
  };

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    if (this.connectionState === 'disconnected') {
      this.reconnectAttempts = 0; // Reset attempts on network recovery
      this.connect();
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    // WebSocket will close automatically, just stop trying to reconnect
    this.clearReconnectTimer();
  };

  /**
   * Cleanup when instance is destroyed
   */
  public destroy(): void {
    this.disconnect();
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    this.subscriptions.clear();
    this.eventHandlers = {};
    this.messageQueue = [];
  }
}

// Create singleton instance for global use
export const translationWebSocket = new TranslationWebSocketManager();

// React hook for easy WebSocket integration
export function useTranslationWebSocket(options: SubscriptionOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Set initial state
    setConnectionState(translationWebSocket.getConnectionState());
    
    // Set up event handlers
    translationWebSocket.on('onConnect', () => {
      setConnectionState('connected');
      setError(null);
    });
    
    translationWebSocket.on('onDisconnect', () => {
      setConnectionState('disconnected');
    });
    
    translationWebSocket.on('onError', (err) => {
      setError(err);
      setConnectionState('error');
    });
    
    translationWebSocket.on('onReconnect', () => {
      setConnectionState('reconnecting');
    });
    
    // Subscribe to updates
    const unsubscribe = translationWebSocket.subscribe(options);
    
    return () => {
      unsubscribe();
      // Note: We don't destroy the singleton, just clean up this hook's subscriptions
    };
  }, []);
  
  return {
    connectionState,
    error,
    stats: translationWebSocket.getStats(),
    disconnect: () => translationWebSocket.disconnect(),
    connect: () => translationWebSocket.connect(),
  };
}

// Export for external use
export { translationWebSocket as default };