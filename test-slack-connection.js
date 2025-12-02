import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking Slack credentials...\n');

const botToken = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;

console.log('Bot Token:', botToken ? `${botToken.substring(0, 10)}...` : '❌ NOT FOUND');
console.log('App Token:', appToken ? `${appToken.substring(0, 10)}...` : '❌ NOT FOUND');

if (!botToken || !appToken) {
  console.log('\n❌ Missing tokens in .env file');
  process.exit(1);
}

console.log('\n✅ Tokens found in .env');
console.log('\n📝 Next steps:');
console.log('1. Go to https://api.slack.com/apps');
console.log('2. Select your TERP app');
console.log('3. Go to "OAuth & Permissions"');
console.log('4. Click "Reinstall to Workspace"');
console.log('5. Copy the NEW Bot User OAuth Token');
console.log('6. Update SLACK_BOT_TOKEN in .env');
console.log('\nThe token might have expired or been revoked.');
