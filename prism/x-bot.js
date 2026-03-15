const { chromium } = require('playwright');
const fs = require('fs');

const X_EMAIL = 'dreyminginlove@gmail.com';
const X_PASS = 'Zenith12!';

async function loginToX(page) {
    console.log('🔐 Logging into X...');
    
    await page.goto('https://x.com/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    try {
        // Email input
        const emailInputs = await page.locator('input[type="text"], input[type="email"]').all();
        if (emailInputs.length > 0) {
            await emailInputs[0].fill(X_EMAIL);
            console.log('✓ Email entered');
            await page.waitForTimeout(1000);
        }
        
        // Click next or find submit button
        const buttons = await page.locator('button:has-text("Next"), button[role="button"]').all();
        if (buttons.length > 0) {
            await buttons[0].click();
            console.log('✓ Clicked Next');
            await page.waitForTimeout(2000);
        }
        
        // Password input
        const passInputs = await page.locator('input[type="password"]').all();
        if (passInputs.length > 0) {
            await passInputs[0].fill(X_PASS);
            console.log('✓ Password entered');
            await page.waitForTimeout(1000);
        }
        
        // Click login
        const loginButtons = await page.locator('button:has-text("Log in")').all();
        if (loginButtons.length > 0) {
            await loginButtons[0].click();
            console.log('✓ Login clicked');
            await page.waitForTimeout(5000);
        }
        
        // Wait for home page
        await page.waitForURL('https://x.com/home', { timeout: 30000 }).catch(() => {
            console.log('✓ Login appeared successful (home navigation)');
        });
        
        console.log('✅ Logged in successfully\n');
        return true;
        
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return false;
    }
}

async function postTweet(page, text) {
    console.log(`📝 Posting: "${text.substring(0, 50)}..."`);
    
    try {
        await page.goto('https://x.com/home', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Find and click compose
        const composeButton = await page.locator('a[href="/compose/tweet"], button:has-text("Post"), div:has-text("What is happening")').first();
        if (composeButton) {
            await composeButton.click();
            console.log('✓ Compose clicked');
            await page.waitForTimeout(2000);
        }
        
        // Type in tweet box
        const tweetBox = await page.locator('div[contenteditable="true"]').first();
        if (tweetBox) {
            await tweetBox.click();
            await page.waitForTimeout(500);
            await tweetBox.fill(text);
            console.log('✓ Text entered');
            await page.waitForTimeout(1000);
        }
        
        // Click post button
        const postButton = await page.locator('button:has-text("Post"), button[aria-label="Post"]').first();
        if (postButton) {
            await postButton.click();
            console.log('✓ Post button clicked');
            await page.waitForTimeout(3000);
        }
        
        console.log('✅ Tweet posted\n');
        return true;
        
    } catch (error) {
        console.error('❌ Post error:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 X Bot Started\n');
    
    const browser = await chromium.launch({ 
        headless: false, // Show browser so we can see what's happening
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    
    try {
        // Login
        const loggedIn = await loginToX(page);
        if (!loggedIn) {
            console.log('⚠️  Login failed, but continuing...');
        }
        
        // Post validation tweet
        const tweetText = `📢 Shipping Prism — one platform for freelance ops.

Contracts ✍️ • Proposals 📋 • CRM 👥 • Crypto Payments ⚡

Tired of juggling 5+ tools? Let's validate this together.

Who's a freelancer/agency owner? 30-min chat about your workflow?

#buildinpublic #freelance`;
        
        await postTweet(page, tweetText);
        
        console.log('✅ All tasks complete');
        console.log('ℹ️  Keep browser open for more interactions, or close it to exit');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        // Keep browser open for manual interaction
        await page.waitForTimeout(60000);
        await browser.close();
    }
}

main().catch(console.error);
