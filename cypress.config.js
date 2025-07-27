import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Test credentials
      ADMIN_EMAIL: 'admin@krongthai.com',
      ADMIN_PIN: '1234',
      MANAGER_EMAIL: 'manager@krongthai.com',
      MANAGER_PIN: '2345'
    }
  },
})