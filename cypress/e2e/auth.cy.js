describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should display the login page', () => {
    cy.title().should('include', 'Restaurant Krong Thai')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
  })

  it('should show validation errors for empty fields', () => {
    cy.get('button[type="submit"]').click()
    cy.contains('required').should('be.visible')
  })

  it('should show error for invalid PIN format', () => {
    cy.get('input[type="email"]').type('admin@krongthai.com')
    cy.get('input[type="password"]').type('123') // Only 3 digits
    cy.get('button[type="submit"]').click()
    cy.contains('4 digits').should('be.visible')
  })

  it('should successfully login with admin credentials', () => {
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PIN'))
    cy.get('button[type="submit"]').click()
    
    // Should redirect to dashboard or show success
    cy.url().should('not.include', '/login')
    cy.contains('dashboard', { matchCase: false }).should('be.visible')
  })

  it('should successfully login with manager credentials', () => {
    cy.get('input[type="email"]').type(Cypress.env('MANAGER_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('MANAGER_PIN'))
    cy.get('button[type="submit"]').click()
    
    // Should redirect successfully
    cy.url().should('not.include', '/login')
  })

  it('should show error for invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@email.com')
    cy.get('input[type="password"]').type('9999')
    cy.get('button[type="submit"]').click()
    
    cy.contains('not found', { matchCase: false }).should('be.visible')
  })

  it('should handle rate limiting gracefully', () => {
    // Try multiple failed attempts
    for (let i = 0; i < 3; i++) {
      cy.get('input[type="email"]').clear().type('test@test.com')
      cy.get('input[type="password"]').clear().type('0000')
      cy.get('button[type="submit"]').click()
      cy.wait(1000)
    }
    
    // Should show rate limiting message eventually
    cy.contains('too many', { matchCase: false }).should('be.visible')
  })
})

describe('Restaurant Selection', () => {
  it('should show restaurant selection after login', () => {
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PIN'))
    cy.get('button[type="submit"]').click()
    
    // Should show restaurant selection
    cy.contains('restaurant', { matchCase: false }).should('be.visible')
  })

  it('should show add location button for admin users', () => {
    cy.visit('/')
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'))
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PIN'))
    cy.get('button[type="submit"]').click()
    
    // Admin should see add location option
    cy.contains('add location', { matchCase: false }).should('be.visible')
  })
})