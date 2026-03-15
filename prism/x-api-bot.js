const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config({ path: '.env.local' });

// Initialize with credentials
const client = new TwitterApi({
    appKey: process.env.X_CONSUMER_KEY,
    appSecret: process.env.X_CONSUMER_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

// Read-write client
const rwClient = client.readWrite;

async function postTweet(text) {
    try {
        console.log(`📝 Posting tweet...\n"${text}"\n`);
        
        const response = await rwClient.v2.tweet(text);
        
        console.log(`✅ Tweet posted!\n`);
        console.log(`Tweet ID: ${response.data.id}`);
        console.log(`Link: https://x.com/prism_ops/status/${response.data.id}\n`);
        
        return response.data.id;
    } catch (error) {
        console.error('❌ Error posting tweet:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 X API Bot Started\n');
    
    // Validation launch tweet
    const launchTweet = `📢 Shipping Prism — one platform for freelance ops.

Contracts ✍️ • Proposals 📋 • CRM 👥 • Crypto Payments ⚡

Tired of juggling 5+ tools? Let's validate this together.

Who's a freelancer/agency owner? 30-min chat about your workflow?

#buildinpublic #freelance`;
    
    const tweetId = await postTweet(launchTweet);
    
    if (tweetId) {
        console.log('🎉 Validation tweet live!\n');
        console.log('Next: Monitor replies, engage with commenters, schedule interviews');
    } else {
        console.log('⚠️  Tweet failed. Check credentials.');
    }
}

main().catch(console.error);
