// Custom Cypress commands for Krong Thai SOP System

Cypress.Commands.add('login', (email, pin) => {
  cy.visit('/')
  cy.get('input[type="email"]').type(email)
  // Type PIN in individual inputs
  for (let i = 0; i < 4; i++) {
    cy.get('input[inputmode="numeric"]').eq(i).type(pin[i])
  }
  cy.get('button[type="submit"]').click()
})

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login(Cypress.env('ADMIN_EMAIL'), Cypress.env('ADMIN_PIN'))
})

Cypress.Commands.add('loginAsManager', () => {
  cy.login(Cypress.env('MANAGER_EMAIL'), Cypress.env('MANAGER_PIN'))
})

Cypress.Commands.add('checkForErrorMessage', (message) => {
  cy.get('[class*="error"], .alert-error, [role="alert"]')
    .should('be.visible')
    .and('contain.text', message)
})

Cypress.Commands.add('checkForSuccessMessage', (message) => {
  cy.get('[class*="success"], .alert-success, [role="status"]')
    .should('be.visible')
    .and('contain.text', message)
})

Cypress.Commands.add('fillRestaurantForm', (restaurantData) => {
  if (restaurantData.name) {
    cy.get('input[name="name"]').type(restaurantData.name)
  }
  if (restaurantData.name_th) {
    cy.get('input[name="name_th"]').type(restaurantData.name_th)
  }
  if (restaurantData.address) {
    cy.get('input[name="address"]').type(restaurantData.address)
  }
  if (restaurantData.address_th) {
    cy.get('input[name="address_th"]').type(restaurantData.address_th)
  }
  if (restaurantData.phone) {
    cy.get('input[name="phone"]').type(restaurantData.phone)
  }
  if (restaurantData.email) {
    cy.get('input[name="email"]').type(restaurantData.email)
  }
})

Cypress.Commands.add('takeFullPageScreenshot', (name) => {
  cy.screenshot(name, { 
    capture: 'fullPage',
    overwrite: true 
  })
})

Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible')
  cy.wait(1000) // Allow for dynamic content to load
})