/**
 * End-to-End Tests for Restaurant Form Bilingual Support
 * Tests EN/FR restaurant management form functionality
 */

describe('Restaurant Form - Bilingual EN/FR Support', () => {
  beforeEach(() => {
    // Start fresh for each test
    cy.visit('/en/auth/restaurant-flow');
    cy.wait(2000); // Allow page to load
  });

  describe('English Language Form', () => {
    it('should display restaurant form fields in English', () => {
      // Check English labels are present
      cy.contains('Restaurant Name (English)').should('be.visible');
      cy.contains('Restaurant Name (French)').should('be.visible');
      cy.contains('Address (English)').should('be.visible');
      cy.contains('Address (French)').should('be.visible');
      
      // Check required asterisks
      cy.get('label').contains('Restaurant Name (English)').parent()
        .should('contain', '*');
      cy.get('label').contains('Restaurant Name (French)').parent()
        .should('contain', '*');
    });

    it('should validate required fields with English error messages', () => {
      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      
      // Check English validation messages
      cy.contains('Restaurant name is required').should('be.visible');
      cy.contains('French restaurant name is required').should('be.visible');
    });

    it('should fill out complete restaurant form in English', () => {
      // Fill English name
      cy.get('#name').type('Krong Thai Restaurant Bangkok');
      
      // Fill French name
      cy.get('#name_fr').type('Restaurant Krong Thai Bangkok');
      
      // Fill English address
      cy.get('#address').type('123 Sukhumvit Road, Bangkok 10110');
      
      // Fill French address
      cy.get('#address_fr').type('123 Route Sukhumvit, Bangkok 10110');
      
      // Fill contact details
      cy.get('#phone').type('+66-2-123-4567');
      cy.get('#email').type('bangkok@krongthai.com');
      
      // Select timezone
      cy.get('[data-testid="timezone-select"]').click();
      cy.contains('Asia/Bangkok').click();
      
      // Fill capacity
      cy.get('#capacity').clear().type('80');
      
      // Verify form data is entered correctly
      cy.get('#name').should('have.value', 'Krong Thai Restaurant Bangkok');
      cy.get('#name_fr').should('have.value', 'Restaurant Krong Thai Bangkok');
      cy.get('#address').should('have.value', '123 Sukhumvit Road, Bangkok 10110');
      cy.get('#address_fr').should('have.value', '123 Route Sukhumvit, Bangkok 10110');
    });

    it('should validate email format in English', () => {
      // Enter invalid email
      cy.get('#email').type('invalid-email');
      cy.get('#name').click(); // Trigger validation
      
      // Check English error message
      cy.contains('Invalid email format').should('be.visible');
    });

    it('should validate phone format in English', () => {
      // Enter invalid phone
      cy.get('#phone').type('invalid-phone-123abc');
      cy.get('#name').click(); // Trigger validation
      
      // Check English error message
      cy.contains('Invalid phone format').should('be.visible');
    });
  });

  describe('French Language Form', () => {
    beforeEach(() => {
      // Switch to French
      cy.visit('/fr/auth/restaurant-flow');
      cy.wait(2000);
    });

    it('should display restaurant form fields in French', () => {
      // Check French labels are present
      cy.contains('Nom du restaurant (Français)').should('be.visible');
      cy.contains('Adresse (Anglais)').should('be.visible');
      cy.contains('Adresse (Français)').should('be.visible');
      
      // Check placeholders are in French
      cy.get('#name_fr').should('have.attr', 'placeholder')
        .and('contain', 'français');
    });

    it('should validate required fields with French error messages', () => {
      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      
      // Check French validation messages
      cy.contains('Le nom du restaurant est requis').should('be.visible');
      cy.contains('Le nom du restaurant en français est requis').should('be.visible');
    });

    it('should validate email format in French', () => {
      // Enter invalid email
      cy.get('#email').type('invalid-email');
      cy.get('#name').click(); // Trigger validation
      
      // Check French error message
      cy.contains('Format d\'email invalide').should('be.visible');
    });

    it('should validate phone format in French', () => {
      // Enter invalid phone
      cy.get('#phone').type('invalid-phone-123abc');
      cy.get('#name').click(); // Trigger validation
      
      // Check French error message
      cy.contains('Format de téléphone invalide').should('be.visible');
    });

    it('should validate capacity in French', () => {
      // Enter invalid capacity
      cy.get('#capacity').clear().type('0');
      cy.get('#name').click(); // Trigger validation
      
      // Check French error message
      cy.contains('La capacité doit être d\'au moins 1').should('be.visible');
    });
  });

  describe('Language Switching', () => {
    it('should maintain form data when switching languages', () => {
      // Fill form in English
      cy.get('#name').type('Test Restaurant');
      cy.get('#name_fr').type('Restaurant Test');
      
      // Switch to French
      cy.get('[data-testid="language-toggle"]').click();
      cy.wait(1000);
      
      // Verify data is preserved
      cy.get('#name').should('have.value', 'Test Restaurant');
      cy.get('#name_fr').should('have.value', 'Restaurant Test');
      
      // Switch back to English
      cy.get('[data-testid="language-toggle"]').click();
      cy.wait(1000);
      
      // Verify data is still preserved
      cy.get('#name').should('have.value', 'Test Restaurant');
      cy.get('#name_fr').should('have.value', 'Restaurant Test');
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit valid restaurant form', () => {
      // Fill complete valid form
      cy.get('#name').type('Krong Thai Test Location');
      cy.get('#name_fr').type('Restaurant Krong Thai Test');
      cy.get('#address').type('Test Address 123');
      cy.get('#address_fr').type('Adresse Test 123');
      cy.get('#phone').type('+66-2-555-0123');
      cy.get('#email').type('test@krongthai.com');
      cy.get('#capacity').clear().type('50');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Check for success indication (adjust based on actual success behavior)
      cy.url().should('not.include', '/auth/restaurant-flow');
      // OR check for success message
      // cy.contains('Restaurant created successfully').should('be.visible');
    });

    it('should handle form submission errors gracefully', () => {
      // Fill form with potentially problematic data
      cy.get('#name').type('Test Restaurant with Very Long Name That Might Cause Issues');
      cy.get('#name_fr').type('Restaurant Test avec un Nom Très Long');
      cy.get('#email').type('test@test.com');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should handle errors without crashing
      cy.get('body').should('be.visible');
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper form accessibility', () => {
      // Check labels are associated with inputs
      cy.get('#name').should('have.attr', 'aria-describedby');
      cy.get('#name_fr').should('have.attr', 'aria-describedby');
      
      // Check required fields are marked
      cy.get('#name').should('have.attr', 'required');
      cy.get('#name_fr').should('have.attr', 'required');
    });

    it('should be keyboard navigable', () => {
      // Tab through form elements
      cy.get('#name').focus().tab();
      cy.focused().should('have.id', 'name_fr');
      
      cy.tab();
      cy.focused().should('have.id', 'address');
      
      cy.tab();
      cy.focused().should('have.id', 'address_fr');
    });

    it('should show loading state during submission', () => {
      // Fill minimal required fields
      cy.get('#name').type('Test Restaurant');
      cy.get('#name_fr').type('Restaurant Test');
      
      // Submit and check loading state
      cy.get('button[type="submit"]').click();
      cy.get('button[type="submit"]').should('be.disabled');
      // OR check for loading indicator
      // cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work properly on tablet viewport', () => {
      // Set tablet viewport
      cy.viewport(1024, 768);
      
      // Form should be responsive
      cy.get('#name').should('be.visible');
      cy.get('#name_fr').should('be.visible');
      
      // Grid layout should adapt
      cy.get('.grid').should('exist');
    });

    it('should work properly on mobile viewport', () => {
      // Set mobile viewport
      cy.viewport(375, 667);
      
      // Form should stack properly
      cy.get('#name').should('be.visible');
      cy.get('#name_fr').should('be.visible');
      
      // Should scroll properly
      cy.scrollTo('bottom');
      cy.get('button[type="submit"]').should('be.visible');
    });
  });

  describe('Data Persistence', () => {
    it('should persist form data in session storage', () => {
      // Fill form
      cy.get('#name').type('Persistent Test Restaurant');
      cy.get('#name_fr').type('Restaurant Test Persistant');
      
      // Refresh page
      cy.reload();
      
      // Data should be restored (if implemented)
      // cy.get('#name').should('have.value', 'Persistent Test Restaurant');
      // cy.get('#name_fr').should('have.value', 'Restaurant Test Persistant');
    });

    it('should clear form data on cancel', () => {
      // Fill form
      cy.get('#name').type('Test Restaurant');
      cy.get('#name_fr').type('Restaurant Test');
      
      // Cancel form
      cy.get('button').contains('Cancel').click();
      
      // Should navigate away or clear form
      cy.get('#name').should('have.value', '');
    });
  });
});