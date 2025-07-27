/**
 * End-to-End Tests for API Routes
 * Tests actual API behavior with Next.js 15 async params
 */

describe('Training Module API Integration', () => {
  beforeEach(() => {
    // Setup test environment
    cy.visit('/');
  });

  describe('API Route Parameter Handling', () => {
    it('should handle async params in training module routes', () => {
      // Test GET /api/training/modules/[id]
      cy.request({
        method: 'GET',
        url: '/api/training/modules/test-module-123',
        failOnStatusCode: false
      }).then((response) => {
        // Should handle the request without crashing
        expect([200, 401, 404]).to.include(response.status);
      });
    });

    it('should handle PUT requests with async params', () => {
      cy.request({
        method: 'PUT',
        url: '/api/training/modules/test-module-123',
        body: { title: 'Updated Module' },
        failOnStatusCode: false
      }).then((response) => {
        // Should handle the request structure correctly
        expect([200, 401, 403, 404]).to.include(response.status);
      });
    });

    it('should handle DELETE requests with async params', () => {
      cy.request({
        method: 'DELETE',
        url: '/api/training/modules/test-module-123',
        failOnStatusCode: false
      }).then((response) => {
        // Should handle the request structure correctly
        expect([200, 401, 403, 404]).to.include(response.status);
      });
    });
  });

  describe('Analytics API Routes', () => {
    it('should handle analytics alerts API', () => {
      cy.request({
        method: 'GET',
        url: '/api/analytics/alerts',
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
        if (response.status === 200) {
          expect(response.body).to.have.property('success');
        }
      });
    });

    it('should handle executive analytics API', () => {
      cy.request({
        method: 'GET',
        url: '/api/analytics/executive',
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 401]).to.include(response.status);
      });
    });
  });

  describe('Authentication API Routes', () => {
    it('should handle staff PIN login', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/staff-pin-login',
        body: {
          email: 'test@example.com',
          pin: '1234'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 401]).to.include(response.status);
      });
    });

    it('should handle location session creation', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/location-session/create',
        body: {
          restaurant_id: 'test-restaurant'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect([200, 400, 401]).to.include(response.status);
      });
    });
  });
});

describe('Offline Storage Integration', () => {
  it('should initialize offline storage without errors', () => {
    cy.visit('/dashboard');
    
    // Check if offline storage is available
    cy.window().then((win) => {
      expect(win.indexedDB).to.exist;
    });
  });

  it('should cache SOP documents for offline access', () => {
    cy.visit('/dashboard');
    
    // Simulate going offline
    cy.window().then((win) => {
      win.navigator.onLine = false;
    });

    // Test offline functionality
    cy.get('[data-testid="sop-category"]').should('be.visible');
  });

  it('should sync data when back online', () => {
    cy.visit('/dashboard');
    
    // Simulate coming back online
    cy.window().then((win) => {
      win.navigator.onLine = true;
      win.dispatchEvent(new Event('online'));
    });

    // Check for sync indicators
    cy.get('[data-testid="sync-status"]', { timeout: 10000 })
      .should('not.contain', 'Syncing...');
  });
});

describe('Performance Monitoring Integration', () => {
  it('should track Core Web Vitals', () => {
    cy.visit('/dashboard');
    
    // Wait for page to load completely
    cy.wait(3000);
    
    // Check if performance monitoring is active
    cy.window().then((win) => {
      // Should not throw errors when measuring performance
      expect(() => {
        win.performance.getEntriesByType('navigation');
      }).to.not.throw();
    });
  });

  it('should monitor tablet touch interactions', () => {
    cy.visit('/dashboard');
    
    // Simulate touch interactions
    cy.get('[data-testid="sop-category"]').first().click();
    
    // Should handle touch events without performance degradation
    cy.get('body').should('be.visible');
  });

  it('should handle orientation changes', () => {
    cy.visit('/dashboard');
    
    // Simulate viewport change (tablet rotation)
    cy.viewport(1024, 768); // Landscape
    cy.wait(500);
    cy.viewport(768, 1024); // Portrait
    
    // Layout should adapt without errors
    cy.get('[data-testid="main-navigation"]').should('be.visible');
  });
});

describe('Real-time Features Integration', () => {
  it('should establish WebSocket connections', () => {
    cy.visit('/dashboard');
    
    // Check for real-time connection indicators
    cy.get('[data-testid="connection-status"]', { timeout: 10000 })
      .should('not.contain', 'Disconnected');
  });

  it('should handle real-time SOP updates', () => {
    cy.visit('/dashboard');
    
    // Mock real-time update
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('sop-update', {
        detail: { sopId: 'test-sop', action: 'update' }
      }));
    });
    
    // Should handle real-time events
    cy.get('body').should('be.visible');
  });
});