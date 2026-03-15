const https = require('https');
require('dotenv').config({ path: '.env.local' });

const bearerToken = process.env.X_BEARER_TOKEN;

async function postTweet(text) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ text });
        
        const options = {
            hostname: 'api.twitter.com',
            port: 443,
            path: '/2/tweets',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 201) {
                    const response = JSON.parse(data);
                    console.log(`✅ SUCCESS!\n`);
                    console.log(`Tweet ID: ${response.data.id}`);
                    console.log(`View: https://x.com/prism_ops/status/${response.data.id}`);
                    resolve(true);
                } else {
                    console.error(`❌ Error: ${res.statusCode}`);
                    console.error(data);
                    reject(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Request error:', error);
            reject(false);
        });
        
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('🚀 X Bearer Token Bot\n📝 Posting tweet...\n');
    
    const tweet = `📢 Shipping Prism — one platform for freelance ops.

Contracts ✍️ • Proposals 📋 • CRM 👥 • Crypto Payments ⚡

Tired of juggling 5+ tools? Let's validate this together.

Who's a freelancer/agency owner? 30-min chat about your workflow?

#buildinpublic #freelance`;
    
    try {
        await postTweet(tweet);
    } catch (error) {
        console.error('Failed');
    }
}

main();
