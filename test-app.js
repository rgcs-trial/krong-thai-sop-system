const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Testing Krong Thai SOP App with Playwright...\n');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-fullscreen']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'homepage.png', fullPage: true });
    console.log('📸 Homepage screenshot saved as homepage.png');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're on login page or another page
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Look for login elements
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const pinInput = await page.locator('input[type="password"], input[name="pin"]').first();
    
    if (await emailInput.isVisible()) {
      console.log('✅ Login form found - testing authentication...');
      
      // Fill in login form
      await emailInput.fill('admin@krongthai.com');
      await pinInput.fill('1234');
      
      // Take screenshot before submitting
      await page.screenshot({ path: 'login-form.png' });
      console.log('📸 Login form screenshot saved as login-form.png');
      
      // Submit form
      const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("เข้าสู่ระบบ")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('🔑 Login form submitted...');
        
        // Wait for navigation or response
        await page.waitForTimeout(3000);
        
        // Take screenshot after login
        await page.screenshot({ path: 'after-login.png', fullPage: true });
        console.log('📸 After login screenshot saved as after-login.png');
        
        const newTitle = await page.title();
        console.log(`📄 New page title: ${newTitle}`);
      }
    } else {
      console.log('ℹ️  No login form found - might be on a different page');
    }
    
    // Check for any error messages
    const errorElements = await page.locator('.error, .alert-error, [class*="error"]').all();
    if (errorElements.length > 0) {
      console.log('⚠️  Error messages found:');
      for (const error of errorElements) {
        const text = await error.textContent();
        console.log(`   - ${text}`);
      }
    }
    
    console.log('\n✅ App testing completed!');
    console.log('📁 Screenshots saved:');
    console.log('   - homepage.png');
    console.log('   - login-form.png (if login found)');
    console.log('   - after-login.png (if login attempted)');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Error screenshot saved as error-screenshot.png');
  } finally {
    await browser.close();
  }
})();