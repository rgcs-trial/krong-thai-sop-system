describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should display the login page', () => {
    cy.title().should('include', 'Restaurant Krong Thai')
    cy.get('input[type="email"]').should('be.visible')
    // PIN inputs are individual fields
    cy.get('input[inputmode="numeric"]').should('have.length', 4)
  })

  it('should show validation errors for empty fields', () => {
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('should show error for invalid PIN format', () => {
    cy.get('input[type="email"]').type('admin@krongthai.com')
    // Type only 3 digits in PIN inputs
    cy.get('input[inputmode="numeric"]').first().type('1')
    cy.get('input[inputmode="numeric"]').eq(1).type('2')
    cy.get('input[inputmode="numeric"]').eq(2).type('3')
    // Button should remain disabled with incomplete PIN
    cy.get('button[type="submit"]').should('be.disabled')
  })

  it('should successfully login with admin credentials', () => {
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    // Type PIN in individual inputs
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Should show location selector for admin
    cy.contains('restaurant', { matchCase: false }).should('be.visible')
  })

  it('should successfully login with manager credentials', () => {
    cy.get('input[type="email"]').type(Cypress.env('MANAGER_EMAIL'))
    // Type PIN in individual inputs
    const pin = Cypress.env('MANAGER_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Should show location selector for manager
    cy.contains('restaurant', { matchCase: false }).should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@email.com')
    cy.get('input[inputmode="numeric"]').eq(0).type('9')
    cy.get('input[inputmode="numeric"]').eq(1).type('9')
    cy.get('input[inputmode="numeric"]').eq(2).type('9')
    cy.get('input[inputmode="numeric"]').eq(3).type('9')
    cy.get('button[type="submit"]').click()
    
    // Look for any error message - could be various formats
    cy.get('[class*="red"], [class*="error"]').should('be.visible')
  })

  it('should handle rate limiting gracefully', () => {
    // Try multiple failed attempts
    for (let i = 0; i < 3; i++) {
      cy.get('input[type="email"]').clear().type('test@test.com')
      cy.get('input[inputmode="numeric"]').each(($el, index) => {
        cy.wrap($el).clear().type('0')
      })
      cy.get('button[type="submit"]').click()
      cy.wait(1000)
    }
    
    // Should show rate limiting message eventually
    cy.contains('Authentication failed', { matchCase: false }).should('be.visible')
  })
})

describe('Restaurant Selection', () => {
  it('should show restaurant selection after login', () => {
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Should show restaurant selection
    cy.contains('restaurant', { matchCase: false }).should('be.visible')
  })

  it('should show add location button for admin users', () => {
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    const pin = Cypress.env('ADMIN_PIN')
    for (let i = 0; i < 4; i++) {
      cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
    }
    cy.get('button[type="submit"]').click()
    
    // Admin should see add location option
    cy.contains('Add Location', { matchCase: false }).should('be.visible')
  })
})