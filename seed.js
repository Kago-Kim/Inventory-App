// Run once with: npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');

const ownerUsername = 'owner';
const ownerPassword = 'changeme123'; // change this after your first login

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(ownerUsername);

if (!existing) {
  const hash = bcrypt.hashSync(ownerPassword, 10);
  db.prepare(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run('Shop Owner', ownerUsername, hash, 'owner');
  console.log(`Owner account created -> username: ${ownerUsername}, password: ${ownerPassword}`);
} else {
  console.log('Owner account already exists.');
}

const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const insert = db.prepare('INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)');
  insert.run('Bread', 80, 20);
  insert.run('Milk 500ml', 60, 30);
  insert.run('Cooking Oil 1L', 350, 15);
  console.log('Sample products added.');
}

console.log('Seed complete.');
