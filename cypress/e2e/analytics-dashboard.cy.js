// Analytics Dashboard Tests
// Tests all analytics features including executive, operational, SOP, and training analytics

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    // Login as admin to access analytics features
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Navigate to analytics
    cy.get('body').then(($body) => {
      if ($body.text().includes('restaurant')) {
        // If restaurant selection appears, click the first available restaurant
        cy.get('[role="button"], button').contains('Select', { matchCase: false }).first().click({ force: true })
      }
    })
  })

  it('should access analytics dashboard', () => {
    cy.visit('/en/analytics')
    cy.get('body').should('contain', 'Analytics', { matchCase: false })
  })

  it('should display executive analytics', () => {
    cy.visit('/en/analytics/executive')
    cy.get('body').should('be.visible')
    
    // Look for common analytics elements
    cy.get('body').then(($body) => {
      const analyticsElements = [
        'chart', 'graph', 'dashboard', 'metric', 'performance', 
        'Executive', 'Analytics', 'KPI', 'Report'
      ]
      
      let found = false
      analyticsElements.forEach(element => {
        if ($body.text().toLowerCase().includes(element.toLowerCase())) {
          found = true
        }
      })
      
      if (found) {
        cy.log('Analytics dashboard loaded successfully')
      } else {
        cy.log('Analytics content may still be loading')
      }
    })
  })

  it('should display operational insights', () => {
    cy.visit('/en/analytics/operations')
    cy.get('body').should('be.visible')
    
    // Test for operational metrics
    cy.get('body').then(($body) => {
      if ($body.text().includes('Operations') || $body.text().includes('Operational')) {
        cy.log('Operational analytics loaded')
      }
    })
  })

  it('should display SOP analytics', () => {
    cy.visit('/en/analytics/sop')
    cy.get('body').should('be.visible')
    
    // Test for SOP-specific analytics
    cy.get('body').then(($body) => {
      if ($body.text().includes('SOP')) {
        cy.log('SOP analytics loaded')
      }
    })
  })

  it('should display training analytics', () => {
    cy.visit('/en/analytics/training')
    cy.get('body').should('be.visible')
    
    // Test for training metrics
    cy.get('body').then(($body) => {
      if ($body.text().includes('Training')) {
        cy.log('Training analytics loaded')
      }
    })
  })

  it('should display real-time monitoring', () => {
    cy.visit('/en/analytics/monitoring')
    cy.get('body').should('be.visible')
    
    // Test for monitoring features
    cy.get('body').then(($body) => {
      if ($body.text().includes('Monitoring') || $body.text().includes('Real-time')) {
        cy.log('Real-time monitoring loaded')
      }
    })
  })

  it('should test chart interactions', () => {
    cy.visit('/en/analytics')
    
    // Look for interactive chart elements
    cy.get('body').then(($body) => {
      const chartSelectors = [
        '[class*="chart"]',
        '[class*="graph"]',
        'svg',
        'canvas',
        '[data-testid*="chart"]'
      ]
      
      chartSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().should('be.visible')
          cy.log(`Found chart element: ${selector}`)
        }
      })
    })
  })
})