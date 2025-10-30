const bcrypt = require('bcryptjs');
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const password = 'test1234';

bcrypt.compare(password, hash).then(result => {
  console.log('Password match:', result);
  if (result) {
    console.log('✅ Password is correct!');
  } else {
    console.log('❌ Password does not match. Generating new hash...');
    return bcrypt.hash(password, 10);
  }
}).then(newHash => {
  if (newHash) {
    console.log('New hash for test1234:', newHash);
  }
}).catch(err => console.error('Error:', err));
