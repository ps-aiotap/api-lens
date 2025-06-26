const { chromium } = require('playwright');
require('dotenv').config();

async function testHealthmugLogin() {
    let browser;
    try {
        console.log('🚀 Launching Chromium browser...');
        browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('🌐 Navigating to healthmug.com...');
        await page.goto('https://www.healthmug.com', { waitUntil: 'networkidle' });
        console.log('✅ Page loaded successfully');
        
        console.log('👤 Clicking user icon to open menu...');
        const userIcon = page.locator('svg.w-8.h-8.inline.text-white').first();
        await userIcon.waitFor({ timeout: 10000 });
        await userIcon.click();
        console.log('✅ User menu opened');
        
        console.log('🔍 Waiting for Login button in dropdown...');
        const loginButton = page.locator('.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-7.text-base.px-6.bg-warning.text-white.w-full.rounded-sm');
        await loginButton.waitFor({ timeout: 8000 });
        await loginButton.click();
        console.log('✅ Login button clicked');
        
        console.log('⏳ Waiting for login modal...');
        const loginInput = page.locator('input[placeholder="Email ID / Mobile Number"]');
        await loginInput.waitFor({ timeout: 10000 });
        console.log('✅ Login modal appeared');
        
        console.log('📧 Clearing and filling user email...');
        await loginInput.clear();
        await loginInput.fill(process.env.USER_EMAIL);
        await page.waitForTimeout(1000);
        console.log('✅ Email entered:', process.env.USER_EMAIL);
        
        console.log('🔘 Looking for Continue button...');
        const continueBtn = page.locator('text=Continue').first();
        await continueBtn.waitFor({ timeout: 5000 });
        await continueBtn.click();
        console.log('✅ Continue button clicked');
        
        console.log('🔑 Waiting for password field...');
        const passwordInput = page.locator('input[type="password"]').first();
        await passwordInput.waitFor({ timeout: 10000 });
        await passwordInput.fill(process.env.USER_PASSWORD);
        console.log('✅ Password entered');
        
        await page.waitForTimeout(2000);
        console.log('🎉 Login flow completed successfully!');
        
    } catch (error) {
        console.log(`❌ Error occurred: ${error.message}`);
    } finally {
        if (browser) {
            console.log('🔒 Closing browser...');
            await browser.close();
            console.log('✅ Browser closed cleanly');
        }
    }
}

testHealthmugLogin();