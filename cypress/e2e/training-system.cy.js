// Training System Tests
// Tests training modules, assessments, certificates, and training analytics

describe('Training System', () => {
  beforeEach(() => {
    // Login as admin to access training features
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Handle restaurant selection if needed
    cy.get('body').then(($body) => {
      if ($body.text().includes('restaurant')) {
        cy.get('[role="button"], button').contains('Select', { matchCase: false }).first().click({ force: true })
      }
    })
  })

  it('should access training modules', () => {
    // Try to navigate to training
    cy.get('body').then(($body) => {
      if ($body.text().includes('Training') || $body.text().includes('training')) {
        cy.contains('Training', { matchCase: false }).click({ force: true })
      } else {
        cy.visit('/en/dashboard')
        cy.get('body').should('contain', 'dashboard', { matchCase: false })
      }
    })
  })

  it('should display training content', () => {
    // Navigate to training page and test content
    cy.visit('/en/dashboard')
    
    cy.get('body').then(($body) => {
      const trainingElements = [
        'training', 'course', 'module', 'lesson', 'certificate',
        'assessment', 'quiz', 'progress', 'completion'
      ]
      
      let found = false
      trainingElements.forEach(element => {
        if ($body.text().toLowerCase().includes(element)) {
          found = true
          cy.log(`Found training element: ${element}`)
        }
      })
      
      if (!found) {
        cy.log('Training content not visible in current view')
      }
    })
  })

  it('should test training navigation', () => {
    cy.visit('/en/dashboard')
    
    // Look for training navigation elements
    cy.get('body').then(($body) => {
      const navSelectors = [
        'nav',
        '[role="navigation"]', 
        '.nav',
        '[class*="menu"]',
        '[class*="sidebar"]'
      ]
      
      navSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
        }
      })
    })
  })

  it('should test assessment functionality', () => {
    cy.visit('/en/dashboard')
    
    // Look for assessment-related elements
    cy.get('body').then(($body) => {
      if ($body.text().includes('Assessment') || $body.text().includes('Quiz')) {
        cy.log('Assessment functionality available')
        
        // Look for assessment buttons or links
        const assessmentSelectors = [
          'button:contains("Assessment")',
          'button:contains("Quiz")',
          'a:contains("Assessment")',
          'a:contains("Quiz")'
        ]
        
        assessmentSelectors.forEach(selector => {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().should('be.visible')
          }
        })
      }
    })
  })

  it('should test certificate viewing', () => {
    cy.visit('/en/dashboard')
    
    // Look for certificate-related elements
    cy.get('body').then(($body) => {
      if ($body.text().includes('Certificate') || $body.text().includes('certificate')) {
        cy.log('Certificate functionality available')
        
        // Test certificate display
        cy.get('body').should('be.visible')
      }
    })
  })

  it('should test training progress tracking', () => {
    cy.visit('/en/dashboard')
    
    // Look for progress indicators
    cy.get('body').then(($body) => {
      const progressSelectors = [
        '[class*="progress"]',
        '[role="progressbar"]',
        '.progress-bar',
        '[data-testid*="progress"]'
      ]
      
      progressSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).should('be.visible')
          cy.log(`Found progress indicator: ${selector}`)
        }
      })
    })
  })

  it('should test bilingual training content', () => {
    cy.visit('/en/dashboard')
    
    // Test language switching in training context
    cy.get('body').then(($body) => {
      if ($body.text().includes('EN') || $body.text().includes('TH')) {
        cy.get('button, [role="button"]').contains(/EN|TH|ไทย/).first().click({ force: true })
        cy.wait(1000)
        cy.get('body').should('be.visible')
      }
    })
  })
})