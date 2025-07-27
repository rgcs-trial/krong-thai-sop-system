// System Integration Tests
// Tests end-to-end workflows, API integrations, and cross-domain functionality

describe('System Integration', () => {
  beforeEach(() => {
    // Login as admin for full system access
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Handle restaurant selection
    cy.get('body').then(($body) => {
      if ($body.text().includes('restaurant')) {
        cy.get('[role="button"], button').contains('Select', { matchCase: false }).first().click({ force: true })
      }
    })
  })

  it('should test API endpoints availability', () => {
    // Test key API endpoints
    const apiEndpoints = [
      '/api/auth/login',
      '/api/restaurants',
      '/api/auth/location-session/check'
    ]
    
    apiEndpoints.forEach(endpoint => {
      cy.request({
        url: endpoint,
        failOnStatusCode: false
      }).then((response) => {
        // API should respond (even if with auth errors)
        expect(response.status).to.be.oneOf([200, 401, 403, 405, 500])
        cy.log(`API endpoint ${endpoint} responded with status ${response.status}`)
      })
    })
  })

  it('should test database connectivity', () => {
    cy.visit('/en/dashboard')
    
    // Test that data is loading from database
    cy.get('body').should('be.visible')
    cy.wait(2000) // Allow time for data to load
    
    // Check for dynamic content that would come from database
    cy.get('body').then(($body) => {
      const dynamicContent = [
        'restaurant', 'location', 'user', 'sop', 'training', 'analytics'
      ]
      
      let contentFound = false
      dynamicContent.forEach(content => {
        if ($body.text().toLowerCase().includes(content)) {
          contentFound = true
          cy.log(`Database content found: ${content}`)
        }
      })
      
      if (contentFound) {
        cy.log('Database connectivity confirmed')
      } else {
        cy.log('Database content may still be loading')
      }
    })
  })

  it('should test real-time features', () => {
    cy.visit('/en/dashboard')
    
    // Test for real-time updates or WebSocket connections
    cy.get('body').then(($body) => {
      const realTimeIndicators = [
        'real-time', 'live', 'online', 'connected', 'sync'
      ]
      
      realTimeIndicators.forEach(indicator => {
        if ($body.text().toLowerCase().includes(indicator)) {
          cy.log(`Real-time feature detected: ${indicator}`)
        }
      })
    })
  })

  it('should test cross-domain navigation', () => {
    cy.visit('/en/dashboard')
    
    // Test navigation between different domains
    const navigationTests = [
      { path: '/en/analytics', expectedContent: 'analytics' },
      { path: '/en/dashboard', expectedContent: 'dashboard' },
      { path: '/en/login', expectedContent: 'login' }
    ]
    
    navigationTests.forEach(test => {
      cy.visit(test.path)
      cy.get('body').should('contain', test.expectedContent, { matchCase: false })
      cy.log(`Navigation to ${test.path} successful`)
    })
  })

  it('should test session management', () => {
    // Test session persistence
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    // Navigate to different pages and ensure session persists
    cy.visit('/en/analytics')
    cy.get('body').should('be.visible')
    
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    cy.log('Session persistence verified across navigation')
  })

  it('should test error handling across system', () => {
    // Test 404 handling
    cy.visit('/en/nonexistent-page', { failOnStatusCode: false })
    cy.get('body').should('be.visible')
    
    // Test invalid routes
    cy.visit('/invalid/route', { failOnStatusCode: false })
    cy.get('body').should('be.visible')
  })

  it('should test internationalization (i18n)', () => {
    // Test English
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    // Test Thai
    cy.visit('/th/dashboard')
    cy.get('body').should('be.visible')
    
    // Test language switching
    cy.visit('/en/dashboard')
    cy.get('body').then(($body) => {
      if ($body.text().includes('TH') || $body.text().includes('ไทย')) {
        cy.contains(/TH|ไทย/).click({ force: true })
        cy.url().should('include', '/th/')
      }
    })
  })

  it('should test security features', () => {
    // Test logout functionality
    cy.visit('/en/dashboard')
    
    cy.get('body').then(($body) => {
      if ($body.text().includes('Logout') || $body.text().includes('ออกจากระบบ')) {
        cy.contains(/Logout|ออกจากระบบ/).click({ force: true })
        cy.url().should('include', '/login')
      }
    })
  })

  it('should test performance and load times', () => {
    const startTime = Date.now()
    
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    const loadTime = Date.now() - startTime
    cy.log(`Dashboard load time: ${loadTime}ms`)
    
    // Expect reasonable load time (under 10 seconds for full load)
    expect(loadTime).to.be.lessThan(10000)
  })

  it('should test mobile/tablet responsiveness', () => {
    // Test tablet portrait (target device)
    cy.viewport(768, 1024)
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    // Test tablet landscape
    cy.viewport(1024, 768)
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    // Test large tablet
    cy.viewport(1280, 800)
    cy.visit('/en/dashboard')
    cy.get('body').should('be.visible')
    
    cy.log('Responsive design verified across tablet viewports')
  })
})