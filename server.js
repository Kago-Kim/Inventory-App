require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const dailyRecordRoutes = require('./routes/daily-records');
const bootstrap = require('./bootstrap');

// Checks required settings and creates the owner account on first start.
bootstrap();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/daily-records', dailyRecordRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Inventory app running at http://localhost:${PORT}`);
});
