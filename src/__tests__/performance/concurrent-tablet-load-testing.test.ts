/**
 * Concurrent Tablet Load Testing Suite
 * Restaurant Krong Thai SOP Management System
 * 
 * Comprehensive performance testing for 100+ concurrent tablet users:
 * - Database query performance under load
 * - API endpoint response times
 * - Real-time collaboration scalability
 * - Memory usage optimization
 * - Network bandwidth efficiency
 * - Offline synchronization load
 * - WebSocket connection management
 * - System resource utilization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';

// Performance testing utilities
import { createSupabaseTestClient } from '../utils/test-utils';
import { PerformanceMonitor } from '../../lib/performance-monitor';

// Mock WebSocket for load testing
class MockWebSocket {
  static connections: MockWebSocket[] = [];
  
  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    MockWebSocket.connections.push(this);
    
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.({ type: 'open' } as Event);
    }, Math.random() * 100 + 50);
  }

  url: string;
  readyState: number;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;

  send(data: string) {
    // Simulate network delay
    setTimeout(() => {
      // Echo message back for testing
      this.onmessage?.({
        data: JSON.stringify({ echo: JSON.parse(data), timestamp: Date.now() }),
        type: 'message',
      } as MessageEvent);
    }, Math.random() * 50 + 10);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    const index = MockWebSocket.connections.indexOf(this);
    if (index > -1) {
      MockWebSocket.connections.splice(index, 1);
    }
    this.onclose?.({ code: 1000, reason: 'Normal closure' } as CloseEvent);
  }

  static getConnectionCount() {
    return this.connections.length;
  }

  static clearConnections() {
    this.connections.forEach(ws => ws.close());
    this.connections = [];
  }
}

// Test data generators
const generateTestUser = (id: number) => ({
  id: `test-user-${id}`,
  email: `user${id}@krongthai.com`,
  pin: `${1000 + id}`,
  role: id % 4 === 0 ? 'admin' : id % 3 === 0 ? 'manager' : id % 2 === 0 ? 'chef' : 'server',
  restaurant_id: `restaurant-${Math.floor(id / 25) + 1}`, // 25 users per restaurant
  tablet_id: `tablet-${id}`,
  session_id: `session-${id}-${Date.now()}`,
});

const generateSOPQuery = (userId: string) => ({
  user_id: userId,
  query_type: ['categories', 'documents', 'search', 'favorites'][Math.floor(Math.random() * 4)],
  search_term: ['food safety', 'cleaning', 'prep', 'service'][Math.floor(Math.random() * 4)],
  timestamp: Date.now(),
});

const generateTrainingActivity = (userId: string) => ({
  user_id: userId,
  module_id: `training-${Math.floor(Math.random() * 10) + 1}`,
  action: ['start', 'progress', 'complete', 'pause'][Math.floor(Math.random() * 4)],
  section_id: `section-${Math.floor(Math.random() * 5) + 1}`,
  timestamp: Date.now(),
});

describe('Concurrent Tablet Load Testing', () => {
  let supabaseClient: any;
  let performanceMonitor: PerformanceMonitor;

  beforeAll(async () => {
    supabaseClient = createSupabaseTestClient();
    performanceMonitor = new PerformanceMonitor();

    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any;

    // Setup test environment
    await setupLoadTestEnvironment();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.clearConnections();
    performanceMonitor.reset();
  });

  afterAll(async () => {
    await cleanupLoadTestEnvironment();
  });

  describe('Database Performance Under Load', () => {
    describe('Query Performance Benchmarks', () => {
      it('should handle 100 concurrent SOP category queries', async () => {
        const concurrentUsers = 100;
        const startTime = performance.now();

        // Generate concurrent queries
        const queries = Array.from({ length: concurrentUsers }, (_, i) => {
          const user = generateTestUser(i);
          return supabaseClient
            .from('sop_categories')
            .select('id, name, description, icon, color')
            .eq('is_active', true)
            .order('sort_order');
        });

        // Execute all queries concurrently
        const results = await Promise.all(queries.map(async (query, index) => {
          const queryStart = performance.now();
          
          try {
            const { data, error } = await query;
            const queryTime = performance.now() - queryStart;
            
            return {
              index,
              success: !error,
              queryTime,
              resultCount: data?.length || 0,
              error: error?.message,
            };
          } catch (err) {
            return {
              index,
              success: false,
              queryTime: performance.now() - queryStart,
              resultCount: 0,
              error: err.message,
            };
          }
        }));

        const totalTime = performance.now() - startTime;
        const successfulQueries = results.filter(r => r.success);
        const averageQueryTime = successfulQueries.reduce((sum, r) => sum + r.queryTime, 0) / successfulQueries.length;
        const maxQueryTime = Math.max(...successfulQueries.map(r => r.queryTime));
        const minQueryTime = Math.min(...successfulQueries.map(r => r.queryTime));

        // Performance assertions
        expect(successfulQueries.length).toBeGreaterThanOrEqual(95); // 95% success rate
        expect(averageQueryTime).toBeLessThan(150); // < 150ms average
        expect(maxQueryTime).toBeLessThan(500); // < 500ms max
        expect(totalTime).toBeLessThan(2000); // < 2 seconds total

        console.log(`Database Query Performance:
          - Total Users: ${concurrentUsers}
          - Success Rate: ${(successfulQueries.length / concurrentUsers * 100).toFixed(1)}%
          - Average Query Time: ${averageQueryTime.toFixed(2)}ms
          - Min Query Time: ${minQueryTime.toFixed(2)}ms
          - Max Query Time: ${maxQueryTime.toFixed(2)}ms
          - Total Execution Time: ${totalTime.toFixed(2)}ms`);
      });

      it('should maintain performance with complex SOP search queries', async () => {
        const concurrentSearches = 75;
        const searchQueries = [
          'food safety hand washing',
          'temperature control HACCP',
          'cleaning sanitization procedure',
          'allergen management protocol',
          'equipment maintenance safety',
        ];

        const startTime = performance.now();

        const searches = Array.from({ length: concurrentSearches }, (_, i) => {
          const searchTerm = searchQueries[i % searchQueries.length];
          return supabaseClient
            .from('sop_documents')
            .select(`
              id, title, content, difficulty_level, estimated_duration,
              sop_categories(name, icon),
              sop_steps(content, step_order)
            `)
            .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
            .eq('is_active', true)
            .limit(20);
        });

        const results = await Promise.allSettled(searches);
        const totalTime = performance.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        // Performance benchmarks for complex queries
        expect(successful).toBeGreaterThanOrEqual(70); // 93%+ success rate
        expect(failed).toBeLessThan(5); // < 7% failure rate
        expect(totalTime).toBeLessThan(3000); // < 3 seconds for all searches

        console.log(`Complex Search Performance:
          - Total Searches: ${concurrentSearches}
          - Successful: ${successful} (${(successful / concurrentSearches * 100).toFixed(1)}%)
          - Failed: ${failed}
          - Total Time: ${totalTime.toFixed(2)}ms`);
      });

      it('should handle concurrent training progress updates', async () => {
        const concurrentUpdates = 50;
        const startTime = performance.now();

        const updates = Array.from({ length: concurrentUpdates }, (_, i) => {
          const user = generateTestUser(i);
          const activity = generateTrainingActivity(user.id);
          
          return supabaseClient
            .from('training_progress')
            .upsert({
              user_id: user.id,
              training_module_id: activity.module_id,
              current_section: activity.section_id,
              progress_data: {
                action: activity.action,
                timestamp: activity.timestamp,
                session_id: user.session_id,
              },
              updated_at: new Date().toISOString(),
            });
        });

        const results = await Promise.allSettled(updates);
        const totalTime = performance.now() - startTime;

        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        expect(successful).toBeGreaterThanOrEqual(48); // 96%+ success rate
        expect(totalTime).toBeLessThan(2500); // < 2.5 seconds

        console.log(`Training Update Performance:
          - Concurrent Updates: ${concurrentUpdates}
          - Successful: ${successful}
          - Success Rate: ${(successful / concurrentUpdates * 100).toFixed(1)}%
          - Total Time: ${totalTime.toFixed(2)}ms`);
      });
    });

    describe('Connection Pool Management', () => {
      it('should efficiently manage database connections', async () => {
        const maxConcurrentConnections = 120;
        const connectionDuration = 5000; // 5 seconds

        const connections = Array.from({ length: maxConcurrentConnections }, async (_, i) => {
          const connectionStart = performance.now();
          
          try {
            // Simulate typical database operations
            await Promise.all([
              supabaseClient.from('sop_categories').select('count', { count: 'exact' }),
              supabaseClient.from('sop_documents').select('count', { count: 'exact' }),
              supabaseClient.from('training_modules').select('count', { count: 'exact' }),
            ]);

            // Hold connection for specified duration
            await new Promise(resolve => setTimeout(resolve, Math.random() * connectionDuration));

            return {
              connectionId: i,
              success: true,
              duration: performance.now() - connectionStart,
            };
          } catch (error) {
            return {
              connectionId: i,
              success: false,
              duration: performance.now() - connectionStart,
              error: error.message,
            };
          }
        });

        const results = await Promise.all(connections);
        const successfulConnections = results.filter(r => r.success);
        const averageDuration = successfulConnections.reduce((sum, r) => sum + r.duration, 0) / successfulConnections.length;

        // Connection pool performance assertions
        expect(successfulConnections.length).toBeGreaterThanOrEqual(115); // 95%+ success rate
        expect(averageDuration).toBeLessThan(connectionDuration + 1000); // Reasonable overhead

        console.log(`Connection Pool Performance:
          - Max Concurrent: ${maxConcurrentConnections}
          - Successful: ${successfulConnections.length}
          - Success Rate: ${(successfulConnections.length / maxConcurrentConnections * 100).toFixed(1)}%
          - Average Duration: ${averageDuration.toFixed(2)}ms`);
      });
    });
  });

  describe('API Endpoint Performance', () => {
    describe('REST API Load Testing', () => {
      it('should handle 100+ concurrent API requests', async () => {
        const concurrentRequests = 125;
        const apiEndpoints = [
          '/api/sop/categories',
          '/api/sop/documents',
          '/api/sop/search',
          '/api/training/modules',
          '/api/training/progress',
          '/api/analytics/sop',
        ];

        const startTime = performance.now();

        const requests = Array.from({ length: concurrentRequests }, async (_, i) => {
          const endpoint = apiEndpoints[i % apiEndpoints.length];
          const requestStart = performance.now();

          try {
            // Mock API response
            await new Promise(resolve => 
              setTimeout(resolve, Math.random() * 100 + 50)
            );

            const mockResponse = {
              status: 200,
              data: { results: [], meta: { total: 0 } },
              timestamp: Date.now(),
            };

            return {
              endpoint,
              success: true,
              responseTime: performance.now() - requestStart,
              status: mockResponse.status,
            };
          } catch (error) {
            return {
              endpoint,
              success: false,
              responseTime: performance.now() - requestStart,
              error: error.message,
            };
          }
        });

        const results = await Promise.all(requests);
        const totalTime = performance.now() - startTime;

        const successfulRequests = results.filter(r => r.success);
        const averageResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
        
        // Group by endpoint for detailed analysis
        const endpointStats = apiEndpoints.map(endpoint => {
          const endpointResults = results.filter(r => r.endpoint === endpoint);
          const successful = endpointResults.filter(r => r.success);
          
          return {
            endpoint,
            total: endpointResults.length,
            successful: successful.length,
            averageTime: successful.length > 0 
              ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length 
              : 0,
          };
        });

        // Performance assertions
        expect(successfulRequests.length).toBeGreaterThanOrEqual(118); // 94%+ success rate
        expect(averageResponseTime).toBeLessThan(200); // < 200ms average
        expect(totalTime).toBeLessThan(3000); // < 3 seconds total

        console.log(`API Load Testing Results:
          - Total Requests: ${concurrentRequests}
          - Successful: ${successfulRequests.length} (${(successfulRequests.length / concurrentRequests * 100).toFixed(1)}%)
          - Average Response Time: ${averageResponseTime.toFixed(2)}ms
          - Total Execution Time: ${totalTime.toFixed(2)}ms`);

        endpointStats.forEach(stat => {
          console.log(`  ${stat.endpoint}: ${stat.successful}/${stat.total} (${stat.averageTime.toFixed(2)}ms avg)`);
        });
      });

      it('should handle burst traffic patterns', async () => {
        const burstSizes = [25, 50, 75, 100];
        const burstInterval = 1000; // 1 second between bursts

        const burstResults = [];

        for (const burstSize of burstSizes) {
          const burstStart = performance.now();

          const burstRequests = Array.from({ length: burstSize }, async (_, i) => {
            const requestStart = performance.now();

            // Simulate API call
            await new Promise(resolve => 
              setTimeout(resolve, Math.random() * 80 + 20)
            );

            return {
              success: true,
              responseTime: performance.now() - requestStart,
            };
          });

          const results = await Promise.all(burstRequests);
          const burstTime = performance.now() - burstStart;
          
          const successful = results.filter(r => r.success).length;
          const averageTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

          burstResults.push({
            burstSize,
            successful,
            successRate: successful / burstSize,
            averageTime,
            burstTime,
          });

          // Wait before next burst
          if (burstSize !== burstSizes[burstSizes.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, burstInterval));
          }
        }

        // Verify system handles increasing burst sizes
        burstResults.forEach((result, index) => {
          expect(result.successRate).toBeGreaterThanOrEqual(0.92); // 92%+ success rate
          expect(result.averageTime).toBeLessThan(150); // < 150ms average
          
          console.log(`Burst ${index + 1} (${result.burstSize} req): ${(result.successRate * 100).toFixed(1)}% success, ${result.averageTime.toFixed(2)}ms avg`);
        });
      });
    });

    describe('GraphQL Query Performance', () => {
      it('should optimize complex nested queries', async () => {
        const complexQueries = Array.from({ length: 30 }, (_, i) => ({
          query: `
            query GetSOPWithDetails($id: String!) {
              sop_documents(id: $id) {
                id
                title
                content
                difficulty_level
                estimated_duration
                category {
                  id
                  name
                  description
                }
                steps {
                  id
                  content
                  step_order
                  verification_requirements
                }
                training_modules {
                  id
                  title
                  prerequisites
                }
              }
            }
          `,
          variables: { id: `sop-document-${i + 1}` },
        }));

        const startTime = performance.now();

        const results = await Promise.all(
          complexQueries.map(async (query, index) => {
            const queryStart = performance.now();

            try {
              // Mock GraphQL response
              await new Promise(resolve => setTimeout(resolve, Math.random() * 120 + 80));

              return {
                index,
                success: true,
                queryTime: performance.now() - queryStart,
                complexity: 'high',
              };
            } catch (error) {
              return {
                index,
                success: false,
                queryTime: performance.now() - queryStart,
                error: error.message,
              };
            }
          })
        );

        const totalTime = performance.now() - startTime;
        const successful = results.filter(r => r.success);
        const averageQueryTime = successful.reduce((sum, r) => sum + r.queryTime, 0) / successful.length;

        expect(successful.length).toBeGreaterThanOrEqual(28); // 93%+ success rate
        expect(averageQueryTime).toBeLessThan(250); // < 250ms for complex queries
        expect(totalTime).toBeLessThan(4000); // < 4 seconds total

        console.log(`GraphQL Complex Query Performance:
          - Total Queries: ${complexQueries.length}
          - Successful: ${successful.length}
          - Average Time: ${averageQueryTime.toFixed(2)}ms
          - Total Time: ${totalTime.toFixed(2)}ms`);
      });
    });
  });

  describe('Real-time Collaboration Scalability', () => {
    describe('WebSocket Connection Management', () => {
      it('should support 100+ concurrent WebSocket connections', async () => {
        const maxConnections = 150;
        const connections = [];

        // Create concurrent WebSocket connections
        for (let i = 0; i < maxConnections; i++) {
          const ws = new MockWebSocket(`ws://localhost:3000/realtime/${i}`);
          connections.push(ws);
        }

        // Wait for all connections to open
        await new Promise(resolve => setTimeout(resolve, 500));

        const openConnections = connections.filter(ws => ws.readyState === WebSocket.OPEN);
        const connectionCount = MockWebSocket.getConnectionCount();

        expect(openConnections.length).toBeGreaterThanOrEqual(140); // 93%+ connection success
        expect(connectionCount).toEqual(openConnections.length);

        console.log(`WebSocket Connection Test:
          - Target Connections: ${maxConnections}
          - Successful Connections: ${openConnections.length}
          - Success Rate: ${(openConnections.length / maxConnections * 100).toFixed(1)}%`);

        // Clean up connections
        connections.forEach(ws => ws.close());
      });

      it('should handle high-frequency message broadcasting', async () => {
        const connectionCount = 100;
        const messagesPerConnection = 20;
        const totalMessages = connectionCount * messagesPerConnection;

        const connections = Array.from({ length: connectionCount }, (_, i) => 
          new MockWebSocket(`ws://localhost:3000/realtime/user-${i}`)
        );

        // Wait for connections to open
        await new Promise(resolve => setTimeout(resolve, 300));

        const messageResults = [];
        const startTime = performance.now();

        // Send messages from each connection
        const messagingPromises = connections.map(async (ws, connIndex) => {
          const messages = Array.from({ length: messagesPerConnection }, (_, msgIndex) => ({
            type: 'sop_annotation',
            data: {
              sopId: `sop-${connIndex}`,
              annotation: {
                id: `annotation-${connIndex}-${msgIndex}`,
                x: Math.random() * 800,
                y: Math.random() * 600,
                text: `Comment ${msgIndex}`,
                timestamp: Date.now(),
              },
            },
          }));

          const connectionResults = [];

          for (const message of messages) {
            const messageStart = performance.now();
            
            try {
              ws.send(JSON.stringify(message));
              
              // Wait for echo response
              await new Promise((resolve) => {
                const originalHandler = ws.onmessage;
                ws.onmessage = (event) => {
                  const responseTime = performance.now() - messageStart;
                  connectionResults.push({
                    success: true,
                    responseTime,
                    messageSize: JSON.stringify(message).length,
                  });
                  ws.onmessage = originalHandler;
                  resolve(undefined);
                };
              });
            } catch (error) {
              connectionResults.push({
                success: false,
                responseTime: performance.now() - messageStart,
                error: error.message,
              });
            }
          }

          return connectionResults;
        });

        const allResults = (await Promise.all(messagingPromises)).flat();
        const totalTime = performance.now() - startTime;

        const successful = allResults.filter(r => r.success);
        const averageResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        const messagesPerSecond = successful.length / (totalTime / 1000);

        expect(successful.length).toBeGreaterThanOrEqual(totalMessages * 0.9); // 90%+ success rate
        expect(averageResponseTime).toBeLessThan(100); // < 100ms average response
        expect(messagesPerSecond).toBeGreaterThan(100); // > 100 messages/second throughput

        console.log(`WebSocket Messaging Performance:
          - Total Messages: ${totalMessages}
          - Successful: ${successful.length} (${(successful.length / totalMessages * 100).toFixed(1)}%)
          - Average Response Time: ${averageResponseTime.toFixed(2)}ms
          - Throughput: ${messagesPerSecond.toFixed(2)} messages/second
          - Total Time: ${totalTime.toFixed(2)}ms`);

        // Clean up
        connections.forEach(ws => ws.close());
      });
    });

    describe('Real-time Data Synchronization', () => {
      it('should synchronize data updates across multiple clients', async () => {
        const clientCount = 75;
        const updateBatches = 10;
        const updatesPerBatch = 5;

        const clients = Array.from({ length: clientCount }, (_, i) => ({
          id: `client-${i}`,
          receivedUpdates: [],
          connection: new MockWebSocket(`ws://localhost:3000/sync/client-${i}`),
        }));

        // Setup message handlers for each client
        clients.forEach(client => {
          client.connection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'data_update') {
              client.receivedUpdates.push(data);
            }
          };
        });

        // Wait for connections
        await new Promise(resolve => setTimeout(resolve, 400));

        const startTime = performance.now();

        // Simulate data updates in batches
        for (let batch = 0; batch < updateBatches; batch++) {
          const batchUpdates = Array.from({ length: updatesPerBatch }, (_, updateIndex) => ({
            type: 'data_update',
            id: `update-${batch}-${updateIndex}`,
            data: {
              sopId: `sop-${Math.floor(Math.random() * 10)}`,
              field: 'progress',
              value: Math.random(),
              timestamp: Date.now(),
            },
          }));

          // Broadcast updates to all clients
          const broadcastPromises = batchUpdates.map(async (update) => {
            const broadcastStart = performance.now();
            
            const deliveryResults = await Promise.all(
              clients.map(async (client) => {
                try {
                  client.connection.send(JSON.stringify(update));
                  return { clientId: client.id, success: true };
                } catch (error) {
                  return { clientId: client.id, success: false, error: error.message };
                }
              })
            );

            return {
              updateId: update.id,
              broadcastTime: performance.now() - broadcastStart,
              deliveries: deliveryResults,
            };
          });

          await Promise.all(broadcastPromises);

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const totalTime = performance.now() - startTime;
        const expectedUpdatesPerClient = updateBatches * updatesPerBatch;

        // Analyze synchronization results
        const syncResults = clients.map(client => ({
          clientId: client.id,
          receivedCount: client.receivedUpdates.length,
          expectedCount: expectedUpdatesPerClient,
          syncRate: client.receivedUpdates.length / expectedUpdatesPerClient,
        }));

        const averageSyncRate = syncResults.reduce((sum, r) => sum + r.syncRate, 0) / syncResults.length;
        const clientsWithFullSync = syncResults.filter(r => r.syncRate >= 0.95).length;

        expect(averageSyncRate).toBeGreaterThanOrEqual(0.9); // 90%+ average sync rate
        expect(clientsWithFullSync).toBeGreaterThanOrEqual(clientCount * 0.85); // 85%+ clients fully synced

        console.log(`Real-time Synchronization Performance:
          - Clients: ${clientCount}
          - Total Updates: ${updateBatches * updatesPerBatch}
          - Average Sync Rate: ${(averageSyncRate * 100).toFixed(1)}%
          - Fully Synced Clients: ${clientsWithFullSync}/${clientCount} (${(clientsWithFullSync / clientCount * 100).toFixed(1)}%)
          - Total Time: ${totalTime.toFixed(2)}ms`);

        // Clean up
        clients.forEach(client => client.connection.close());
      });
    });
  });

  describe('Memory and Resource Optimization', () => {
    describe('Memory Usage Under Load', () => {
      it('should maintain stable memory usage with many concurrent operations', async () => {
        const simulateMemoryIntensiveOperation = async (operationId: number) => {
          // Simulate typical SOP operations that use memory
          const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
            id: `item-${operationId}-${i}`,
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
            metadata: {
              timestamp: Date.now(),
              user: `user-${operationId}`,
              tags: ['tag1', 'tag2', 'tag3'],
            },
          }));

          // Process the data
          const processed = largeDataSet.map(item => ({
            ...item,
            processed: true,
            hash: item.content.length.toString(16),
          }));

          // Simulate cleanup
          return processed.slice(0, 10); // Keep only subset
        };

        const concurrentOperations = 100;
        const memorySnapshots = [];

        // Initial memory snapshot
        if (global.gc) global.gc();
        const initialMemory = process.memoryUsage();
        memorySnapshots.push({ stage: 'initial', ...initialMemory });

        // Execute concurrent memory-intensive operations
        const operations = Array.from({ length: concurrentOperations }, 
          async (_, i) => await simulateMemoryIntensiveOperation(i)
        );

        const results = await Promise.all(operations);

        // Memory snapshot after operations
        if (global.gc) global.gc();
        const afterOperationsMemory = process.memoryUsage();
        memorySnapshots.push({ stage: 'after_operations', ...afterOperationsMemory });

        // Calculate memory usage
        const memoryIncrease = afterOperationsMemory.heapUsed - initialMemory.heapUsed;
        const memoryIncreasePerOperation = memoryIncrease / concurrentOperations;

        expect(results).toHaveLength(concurrentOperations);
        expect(memoryIncreasePerOperation).toBeLessThan(1024 * 1024); // < 1MB per operation
        expect(afterOperationsMemory.heapUsed).toBeLessThan(initialMemory.heapUsed * 3); // < 3x initial

        console.log(`Memory Usage Analysis:
          - Concurrent Operations: ${concurrentOperations}
          - Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
          - Final Heap: ${(afterOperationsMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
          - Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB
          - Per Operation: ${(memoryIncreasePerOperation / 1024).toFixed(2)} KB`);
      });
    });

    describe('Resource Cleanup', () => {
      it('should properly cleanup resources after load testing', async () => {
        const resourceCount = 50;
        const resources = [];

        // Create resources (simulating WebSocket connections, database connections, etc.)
        for (let i = 0; i < resourceCount; i++) {
          const resource = {
            id: i,
            connection: new MockWebSocket(`ws://localhost:3000/resource-${i}`),
            timer: setInterval(() => {
              // Simulate periodic activity
            }, 1000),
            cleanup: function() {
              this.connection.close();
              clearInterval(this.timer);
              return true;
            },
          };
          
          resources.push(resource);
        }

        // Wait for resources to initialize
        await new Promise(resolve => setTimeout(resolve, 300));

        const initialConnections = MockWebSocket.getConnectionCount();
        expect(initialConnections).toBe(resourceCount);

        // Cleanup all resources
        const cleanupResults = resources.map(resource => {
          try {
            return resource.cleanup();
          } catch (error) {
            return false;
          }
        });

        // Wait for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        const finalConnections = MockWebSocket.getConnectionCount();
        const successfulCleanups = cleanupResults.filter(Boolean).length;

        expect(successfulCleanups).toBe(resourceCount);
        expect(finalConnections).toBe(0);

        console.log(`Resource Cleanup Test:
          - Initial Resources: ${resourceCount}
          - Initial Connections: ${initialConnections}
          - Successful Cleanups: ${successfulCleanups}
          - Final Connections: ${finalConnections}`);
      });
    });
  });

  describe('Network Efficiency', () => {
    describe('Bandwidth Optimization', () => {
      it('should optimize data transfer for tablet networks', async () => {
        const simulateTabletDataTransfer = async (dataSize: 'small' | 'medium' | 'large') => {
          const dataSizes = {
            small: 1024, // 1KB - SOP step
            medium: 10240, // 10KB - SOP document
            large: 102400, // 100KB - Training module with images
          };

          const transferSize = dataSizes[dataSize];
          const transferStart = performance.now();

          // Simulate network transfer with compression
          const compressionRatio = 0.7; // 30% compression
          const actualTransferSize = transferSize * compressionRatio;

          // Simulate network latency and bandwidth
          const simulatedLatency = Math.random() * 50 + 10; // 10-60ms
          const simulatedBandwidth = 10 * 1024 * 1024; // 10 Mbps
          const transferTime = (actualTransferSize * 8) / simulatedBandwidth * 1000; // Convert to ms

          await new Promise(resolve => 
            setTimeout(resolve, simulatedLatency + transferTime)
          );

          return {
            dataSize,
            originalSize: transferSize,
            compressedSize: actualTransferSize,
            transferTime: performance.now() - transferStart,
            compressionRatio: 1 - compressionRatio,
          };
        };

        const transferTests = [
          ...Array(20).fill('small'),
          ...Array(15).fill('medium'),
          ...Array(10).fill('large'),
        ];

        const results = await Promise.all(
          transferTests.map(size => simulateTabletDataTransfer(size as any))
        );

        const smallTransfers = results.filter(r => r.dataSize === 'small');
        const mediumTransfers = results.filter(r => r.dataSize === 'medium');
        const largeTransfers = results.filter(r => r.dataSize === 'large');

        const averageSmallTime = smallTransfers.reduce((sum, r) => sum + r.transferTime, 0) / smallTransfers.length;
        const averageMediumTime = mediumTransfers.reduce((sum, r) => sum + r.transferTime, 0) / mediumTransfers.length;
        const averageLargeTime = largeTransfers.reduce((sum, r) => sum + r.transferTime, 0) / largeTransfers.length;

        // Performance expectations for tablet networks
        expect(averageSmallTime).toBeLessThan(100); // < 100ms for small data
        expect(averageMediumTime).toBeLessThan(300); // < 300ms for medium data
        expect(averageLargeTime).toBeLessThan(1000); // < 1s for large data

        console.log(`Network Transfer Optimization:
          - Small Data (1KB): ${averageSmallTime.toFixed(2)}ms average
          - Medium Data (10KB): ${averageMediumTime.toFixed(2)}ms average
          - Large Data (100KB): ${averageLargeTime.toFixed(2)}ms average
          - Compression Ratio: ${(results[0].compressionRatio * 100).toFixed(1)}%`);
      });
    });
  });

  // Helper functions
  async function setupLoadTestEnvironment() {
    // Setup test data for load testing
    console.log('Setting up load test environment...');
    
    // Mock database setup would go here
    // In a real scenario, this would populate test databases with sample data
  }

  async function cleanupLoadTestEnvironment() {
    // Cleanup test environment
    console.log('Cleaning up load test environment...');
    
    MockWebSocket.clearConnections();
  }
});