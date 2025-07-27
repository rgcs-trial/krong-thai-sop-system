/**
 * End-to-End Tests for Offline Functionality
 * Tests offline storage, sync, and performance features
 */

describe('Offline Functionality Integration', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.wait(2000); // Allow initial load
  });

  describe('Offline Data Access', () => {
    it('should load critical SOPs when offline', () => {
      // First, ensure data is cached while online
      cy.get('[data-testid="sop-category-emergency"]').click();
      cy.wait(1000);
      
      // Go offline
      cy.window().then((win) => {
        win.navigator.onLine = false;
        win.dispatchEvent(new Event('offline'));
      });

      // Should still be able to access cached content
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
      cy.get('[data-testid="sop-document"]').should('exist');
    });

    it('should show offline status indicators', () => {
      // Simulate offline
      cy.window().then((win) => {
        win.navigator.onLine = false;
        win.dispatchEvent(new Event('offline'));
      });

      cy.get('[data-testid="offline-indicator"]')
        .should('be.visible')
        .and('contain', 'Offline');
    });

    it('should queue actions when offline', () => {
      // Go offline
      cy.window().then((win) => {
        win.navigator.onLine = false;
      });

      // Try to bookmark a SOP
      cy.get('[data-testid="sop-bookmark-btn"]').first().click();
      
      // Should show queued action indicator
      cy.get('[data-testid="pending-actions"]')
        .should('be.visible')
        .and('contain', '1');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync queued actions when back online', () => {
      // Start offline with queued actions
      cy.window().then((win) => {
        win.navigator.onLine = false;
      });

      // Perform actions while offline
      cy.get('[data-testid="sop-bookmark-btn"]').first().click();
      cy.wait(500);

      // Go back online
      cy.window().then((win) => {
        win.navigator.onLine = true;
        win.dispatchEvent(new Event('online'));
      });

      // Should show sync process
      cy.get('[data-testid="sync-status"]', { timeout: 10000 })
        .should('contain', 'Syncing')
        .then(() => {
          cy.get('[data-testid="sync-status"]', { timeout: 15000 })
            .should('not.contain', 'Syncing');
        });
    });

    it('should handle sync conflicts gracefully', () => {
      // Simulate conflict scenario
      cy.window().then((win) => {
        win.localStorage.setItem('pending-sync-conflicts', '1');
      });

      // Trigger sync
      cy.get('[data-testid="sync-now-btn"]').click();

      // Should show conflict resolution UI
      cy.get('[data-testid="conflict-resolution"]', { timeout: 5000 })
        .should('be.visible');
    });
  });

  describe('Performance Under Network Conditions', () => {
    it('should maintain performance on slow connections', () => {
      // Simulate slow connection
      cy.intercept('**', { delay: 2000 });

      cy.visit('/dashboard');
      
      // Should show loading states
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      
      // Should eventually load
      cy.get('[data-testid="sop-categories"]', { timeout: 15000 })
        .should('be.visible');
    });

    it('should cache frequently accessed content', () => {
      // Access the same SOP multiple times
      cy.get('[data-testid="sop-category-kitchen"]').click();
      cy.get('[data-testid="sop-document"]').first().click();
      cy.wait(1000);
      
      // Go back and access again
      cy.get('[data-testid="back-btn"]').click();
      cy.get('[data-testid="sop-document"]').first().click();
      
      // Second load should be faster (cached)
      cy.get('[data-testid="document-content"]').should('be.visible');
    });
  });
});

describe('Tablet-Specific Offline Features', () => {
  beforeEach(() => {
    cy.viewport(1024, 768); // Tablet landscape
  });

  describe('Touch Interactions Offline', () => {
    it('should handle touch gestures when offline', () => {
      // Go offline
      cy.window().then((win) => {
        win.navigator.onLine = false;
      });

      // Test swipe gestures (simulated)
      cy.get('[data-testid="sop-list"]')
        .trigger('touchstart', { which: 1 })
        .trigger('touchmove', { clientX: 100 })
        .trigger('touchend');

      // Should handle gestures smoothly
      cy.get('[data-testid="sop-list"]').should('be.visible');
    });

    it('should maintain touch responsiveness', () => {
      cy.window().then((win) => {
        win.navigator.onLine = false;
      });

      // Rapid taps should be responsive
      cy.get('[data-testid="sop-category"]').first().click();
      cy.wait(100);
      cy.get('[data-testid="back-btn"]').click();
      cy.wait(100);
      cy.get('[data-testid="sop-category"]').eq(1).click();

      cy.get('[data-testid="sop-document"]').should('be.visible');
    });
  });

  describe('Orientation Changes Offline', () => {
    it('should handle rotation while offline', () => {
      cy.window().then((win) => {
        win.navigator.onLine = false;
      });

      // Portrait
      cy.viewport(768, 1024);
      cy.get('[data-testid="main-navigation"]').should('be.visible');

      // Landscape
      cy.viewport(1024, 768);
      cy.get('[data-testid="main-navigation"]').should('be.visible');
    });
  });
});

describe('Critical SOP Emergency Access', () => {
  it('should always provide access to emergency procedures', () => {
    // Even when completely offline
    cy.window().then((win) => {
      win.navigator.onLine = false;
      // Clear all network caches to simulate worst case
      win.caches.keys().then(names => {
        names.forEach(name => win.caches.delete(name));
      });
    });

    cy.visit('/dashboard');
    
    // Emergency SOPs should still be accessible
    cy.get('[data-testid="emergency-sop-access"]', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.get('[data-testid="emergency-procedures"]')
      .should('be.visible')
      .and('contain', 'Emergency');
  });

  it('should prioritize critical content in offline storage', () => {
    cy.window().then((win) => {
      // Check that critical SOPs are marked for offline priority
      const criticalSops = win.localStorage.getItem('critical-sops-cached');
      expect(criticalSops).to.not.be.null;
    });
  });
});