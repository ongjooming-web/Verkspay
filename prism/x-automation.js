const { chromium } = require('playwright');

const X_EMAIL = 'dreyminginlove@gmail.com';
const X_PASS = 'Zenith12!';
const X_HANDLE = '@prism_ops';

async function loginToX(page) {
    console.log('🔐 Logging into X...');
    
    await page.goto('https://x.com/login');
    await page.waitForLoadState('networkidle');
    
    // Enter email
    await page.fill('input[type="text"]', X_EMAIL);
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(2000);
    
    // Enter password
    await page.fill('input[type="password"]', X_PASS);
    await page.click('button:has-text("Log in")');
    
    // Wait for dashboard
    await page.waitForURL('https://x.com/home', { timeout: 30000 });
    console.log('✅ Logged in successfully');
    
    return page;
}

async function postTweet(page, text) {
    console.log(`📝 Posting tweet: "${text}"`);
    
    await page.goto('https://x.com/home');
    await page.waitForTimeout(2000);
    
    // Click compose
    await page.click('a[href="/compose/tweet"]');
    await page.waitForTimeout(1000);
    
    // Type tweet
    await page.fill('div[contenteditable="true"]', text);
    await page.waitForTimeout(500);
    
    // Post
    await page.click('button:has-text("Post")');
    await page.waitForTimeout(3000);
    
    console.log('✅ Tweet posted');
}

async function sendDM(page, handle, message) {
    console.log(`💬 Sending DM to ${handle}: "${message}"`);
    
    await page.goto('https://x.com/messages');
    await page.waitForTimeout(2000);
    
    // Start new message
    await page.click('button[aria-label="Compose a new message"]');
    await page.waitForTimeout(1000);
    
    // Search for user
    await page.fill('input[placeholder="Search for people"]', handle);
    await page.waitForTimeout(2000);
    
    // Click first result
    await page.click('div[role="option"]');
    await page.waitForTimeout(1000);
    
    // Type message
    await page.fill('div[contenteditable="true"]', message);
    
    // Send
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(2000);
    
    console.log('✅ DM sent');
}

async function main() {
    console.log('🚀 X Automation Bot Started\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Login
        await loginToX(page);
        
        // Post launch tweet
        await postTweet(page, `📢 Shipping Prism — one platform for freelance ops.\n\nContracts, proposals, CRM, payments. Built for indie hackers & builders.\n\nWho's tired of tool sprawl? Let's validate this together 👇\n\n#buildinpublic #crypto`);
        
        // Send validation DMs to potential early users
        const validationTargets = [
            { handle: '@thisisbenzo', message: 'Hey! Building Prism (unified freelance ops + crypto payments). Would love 20 min to ask about your current workflow. Interested?' },
            { handle: '@dvinci', message: 'Building Prism for freelancers. Quick question: how many tools do you use for contracts, proposals, invoicing? DM me? 🙂' },
        ];
        
        for (const target of validationTargets) {
            await sendDM(page, target.handle, target.message);
            await page.waitForTimeout(5000); // Rate limit
        }
        
        console.log('\n✅ All tasks complete');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

main();
