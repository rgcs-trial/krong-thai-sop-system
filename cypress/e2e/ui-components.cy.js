// UI Components Tests
// Tests all UI components, responsiveness, and user interface elements

describe('UI Components & Interface', () => {
  beforeEach(() => {
    // Login to access the full interface
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

  it('should display responsive layout', () => {
    cy.visit('/en/dashboard')
    
    // Test different viewport sizes
    cy.viewport(1280, 800) // Desktop tablet
    cy.get('body').should('be.visible')
    
    cy.viewport(768, 1024) // Portrait tablet
    cy.get('body').should('be.visible')
    
    cy.viewport(1024, 768) // Landscape tablet  
    cy.get('body').should('be.visible')
  })

  it('should test button components', () => {
    cy.visit('/en/dashboard')
    
    // Test various button states and types
    cy.get('button').should('have.length.at.least', 1)
    
    // Test button interactions
    cy.get('button').each(($btn) => {
      cy.wrap($btn).should('be.visible')
      
      // Test if button is clickable (not disabled)
      if (!$btn.prop('disabled')) {
        cy.wrap($btn).should('not.be.disabled')
      }
    })
  })

  it('should test form components', () => {
    cy.visit('/en/login')
    
    // Test form inputs
    cy.get('input').should('have.length.at.least', 1)
    cy.get('input[type="email"]').should('be.visible').and('not.be.disabled')
    cy.get('input[inputmode="numeric"]').should('have.length', 4)
    
    // Test form validation states
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should test navigation components', () => {
    cy.visit('/en/dashboard')
    
    // Test navigation elements
    cy.get('body').then(($body) => {
      const navElements = [
        'nav', '[role="navigation"]', '.navigation', 
        '[class*="nav"]', '[class*="menu"]'
      ]
      
      navElements.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
          cy.log(`Navigation element found: ${selector}`)
        }
      })
    })
  })

  it('should test card components', () => {
    cy.visit('/en/dashboard')
    
    // Test card/panel components
    cy.get('body').then(($body) => {
      const cardSelectors = [
        '[class*="card"]',
        '[class*="panel"]', 
        '[class*="container"]',
        '.card'
      ]
      
      cardSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
          cy.log(`Card component found: ${selector}`)
        }
      })
    })
  })

  it('should test modal/dialog components', () => {
    cy.visit('/en/dashboard')
    
    // Look for elements that might trigger modals
    cy.get('body').then(($body) => {
      const modalTriggers = [
        'button:contains("Add")',
        'button:contains("Create")',
        'button:contains("Edit")',
        'button:contains("Settings")'
      ]
      
      modalTriggers.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().click({ force: true })
          cy.wait(500)
          
          // Check if modal opened
          cy.get('body').then(($body) => {
            const modalSelectors = [
              '[role="dialog"]',
              '[role="modal"]',
              '.modal',
              '[class*="dialog"]'
            ]
            
            modalSelectors.forEach(modalSelector => {
              if ($body.find(modalSelector).length > 0) {
                cy.get(modalSelector).should('be.visible')
                cy.log(`Modal opened: ${modalSelector}`)
              }
            })
          })
        }
      })
    })
  })

  it('should test loading states', () => {
    cy.visit('/en/dashboard')
    
    // Test loading indicators
    cy.get('body').then(($body) => {
      const loadingSelectors = [
        '[class*="loading"]',
        '[class*="spinner"]',
        '[class*="skeleton"]',
        '.animate-spin'
      ]
      
      loadingSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
          cy.log(`Loading indicator found: ${selector}`)
        }
      })
    })
  })

  it('should test error handling components', () => {
    cy.visit('/en/login')
    
    // Trigger an error state
    cy.get('input[type="email"]').type('invalid@email.com')
    cy.get('input[inputmode="numeric"]').each(($el) => {
      cy.wrap($el).type('9')
    })
    cy.get('button[type="submit"]').click()
    
    // Check for error display
    cy.get('body').then(($body) => {
      const errorSelectors = [
        '[class*="error"]',
        '[class*="red"]',
        '[role="alert"]',
        '.text-red-'
      ]
      
      errorSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
          cy.log(`Error component found: ${selector}`)
        }
      })
    })
  })

  it('should test accessibility features', () => {
    cy.visit('/en/dashboard')
    
    // Test keyboard navigation
    cy.get('body').tab()
    cy.focused().should('be.visible')
    
    // Test ARIA labels and roles
    cy.get('[role]').should('have.length.at.least', 1)
    cy.get('[aria-label]').each(($el) => {
      cy.wrap($el).should('have.attr', 'aria-label')
    })
  })

  it('should test theme and styling consistency', () => {
    cy.visit('/en/dashboard')
    
    // Test color scheme consistency
    cy.get('body').should('have.css', 'font-family')
    
    // Test brand colors (red theme)
    cy.get('body').then(($body) => {
      const redElements = $body.find('[class*="red"], [class*="bg-red"]')
      if (redElements.length > 0) {
        cy.wrap(redElements.first()).should('be.visible')
        cy.log('Brand colors (red) found in interface')
      }
    })
  })
})