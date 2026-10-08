// Runs every time the server starts.
// 1. In production, refuses to start if secrets are missing (so you never go live with weak defaults).
// 2. Creates the owner account if none exists, using settings from environment variables.
const bcrypt = require('bcryptjs');
const db = require('./db');

function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const missing = ['JWT_SECRET', 'OWNER_PASSWORD'].filter((name) => !process.env[name]);
    if (missing.length > 0) {
      console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
      process.exit(1);
    }
    if (process.env.OWNER_PASSWORD.length < 8) {
      console.error('OWNER_PASSWORD must be at least 8 characters in production.');
      process.exit(1);
    }
  }

  const ownerExists = db.prepare("SELECT id FROM users WHERE role = 'owner'").get();
  if (!ownerExists) {
    const username = process.env.OWNER_USERNAME || 'owner';
    const password = process.env.OWNER_PASSWORD || 'changeme123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Shop Owner', username, hash, 'owner');
    console.log(`Owner account created (username: ${username}).`);
    if (!process.env.OWNER_PASSWORD) {
      console.log('Using the default local password "changeme123" - fine for testing only.');
    }
  }
}

module.exports = bootstrap;
