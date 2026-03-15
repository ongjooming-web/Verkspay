const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config({ path: '.env.local' });

// Use OAuth 1.0a User Context
const client = new TwitterApi({
    appKey: process.env.X_CONSUMER_KEY,
    appSecret: process.env.X_CONSUMER_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

const rwClient = client.readWrite;

async function postTweet(text) {
    try {
        console.log(`📝 Posting tweet...\n`);
        
        const tweet = await rwClient.v2.tweet(text);
        
        console.log(`✅ SUCCESS!\n`);
        console.log(`Tweet ID: ${tweet.data.id}`);
        console.log(`View: https://x.com/prism_ops/status/${tweet.data.id}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error(`Code: ${error.code}`);
        if (error.data) console.error(`Details:`, error.data);
        return false;
    }
}

async function main() {
    console.log('🚀 X API Post Bot\n');
    
    const tweet = `📢 Shipping Prism — one platform for freelance ops.

Contracts ✍️ • Proposals 📋 • CRM 👥 • Crypto Payments ⚡

Tired of juggling 5+ tools? Let's validate this together.

Who's a freelancer/agency owner? 30-min chat about your workflow?

#buildinpublic #freelance`;
    
    await postTweet(tweet);
}

main();
