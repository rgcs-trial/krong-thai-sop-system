// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests in command log for cleaner output
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch
  win.fetch = function (...args) {
    return originalFetch.apply(this, args)
  }
})

// Handle uncaught exceptions to prevent test failures from application errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error but don't fail the test
  console.log('Uncaught exception:', err.message)
  return false
})