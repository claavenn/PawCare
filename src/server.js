const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pawcare_db',
  waitForConnections: true,
  connectionLimit: 10,
});

const initDb = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_name VARCHAR(100) NOT NULL,
      pet_name VARCHAR(100) NOT NULL,
      service_type VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT,
      complaint TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM appointments');
    if (rows[0].total === 0) {
      const dummyQuery = `
        INSERT INTO appointments (owner_name, pet_name, service_type, phone, address, complaint) VALUES
        ('Sarah', 'Mochi - Cat', 'Online Consultation', '+6281234567', '-', 'Vomiting water since morning and refusing treats'),
        ('David', 'Dudu - Dog', 'Home Visit', '+6285678912345', 'Bandung', 'Annual vaccination schedule and routine physical checkup'),
        ('Amelia', 'Nana - Rabbit', 'Online Consultation', '+6281234567', '-', 'Right ear appears reddish and scratching frequently');
      `;
      await pool.query(dummyQuery);
      console.log('Dummy appointments seeded successfully');
  } catch (err) {
    console.error(err.message);
  }
};

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { owner_name, pet_name, service_type, phone, address, complaint } = req.body;

  if (!owner_name || !pet_name || !service_type || !complaint) {
    return res.status(400).json({ message: 'Semua data wajib diisi' });
  }

  try {
    const query = `
      INSERT INTO appointments (owner_name, pet_name, service_type, phone, address, complaint)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const [result] = await pool.query(query, [
      owner_name,
      pet_name,
      service_type,
      phone || '-',
      address || '-',
      complaint,
    ]);

    res.status(201).json({
      message: 'Janji temu berhasil dibuat',
      data: { id: result.insertId, ...req.body },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM appointments ORDER BY id DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initDb();
});