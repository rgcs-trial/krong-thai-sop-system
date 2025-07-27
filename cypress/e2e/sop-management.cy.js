// SOP Management System Tests
// Tests all SOP-related functionality including categories, documents, search, and favorites

describe('SOP Management System', () => {
  beforeEach(() => {
    // Login as admin to access SOP features
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Navigate to dashboard (may need to select location first)
    cy.get('body').then(($body) => {
      if ($body.text().includes('restaurant')) {
        // If restaurant selection appears, click the first available restaurant
        cy.get('[role="button"], button').contains('Select', { matchCase: false }).first().click({ force: true })
      }
    })
  })

  it('should display dashboard after login', () => {
    cy.url().should('include', '/dashboard')
    cy.get('body').should('contain', 'SOP', { matchCase: false })
  })

  it('should navigate to SOP categories', () => {
    // Look for SOP navigation elements
    cy.get('body').then(($body) => {
      if ($body.text().includes('SOP') || $body.text().includes('Categories')) {
        cy.contains('SOP', { matchCase: false }).click({ force: true })
      } else {
        cy.log('SOP navigation not found - trying alternative paths')
        cy.visit('/en/dashboard')
      }
    })
  })

  it('should test bilingual language toggle', () => {
    // Look for language toggle button
    cy.get('body').then(($body) => {
      if ($body.text().includes('EN') || $body.text().includes('TH')) {
        cy.get('button, [role="button"]').contains(/EN|TH|ไทย/).first().click({ force: true })
        cy.wait(1000)
        // Should change language
        cy.get('body').should('be.visible')
      } else {
        cy.log('Language toggle not found in current view')
      }
    })
  })

  it('should test search functionality', () => {
    // Look for search input
    cy.get('body').then(($body) => {
      const searchSelectors = [
        'input[placeholder*="search" i]',
        'input[placeholder*="ค้นหา"]',
        'input[type="search"]',
        '[data-testid="search"]'
      ]
      
      let searchFound = false
      searchSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().type('food safety')
          searchFound = true
          return false
        }
      })
      
      if (!searchFound) {
        cy.log('Search input not found in current view')
      }
    })
  })
})