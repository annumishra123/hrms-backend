/**
 * Seed script - creates demo users so you can log in and try the API/Swagger immediately.
 * Run with: npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

const demoUsers = [
  {
    name: 'Anurag Mishra',
    email: 'admin@techsoft.com',
    password: 'Admin@123',
    role: 'admin',
    designation: 'HR Admin',
    department: 'Human Resources',
    salary: { basic: 50000, hra: 15000, specialAllowance: 10000, otherAllowance: 5000, pf: 6000, professionalTax: 200 },
  },
  {
    name: 'Priya Sharma',
    email: 'manager@techsoft.com',
    password: 'Manager@123',
    role: 'manager',
    designation: 'Engineering Manager',
    department: 'Engineering',
    salary: { basic: 70000, hra: 21000, specialAllowance: 12000, otherAllowance: 5000, pf: 8400, professionalTax: 200 },
  },
  {
    name: 'Rohit Verma',
    email: 'employee@techsoft.com',
    password: 'Employee@123',
    role: 'employee',
    designation: 'Software Developer',
    department: 'Engineering',
    salary: { basic: 45000, hra: 13500, specialAllowance: 8000, otherAllowance: 4000, pf: 5400, professionalTax: 200 },
  },
];

(async () => {
  await connectDB();

  for (const u of demoUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      console.log(`✅ Seeded: ${u.email} / password: ${u.password}`);
    } else {
      console.log(`ℹ️  Already exists: ${u.email}`);
    }
  }

  console.log('\nSeed complete. Login via POST /api/v1/auth/login with any of the emails above.');
  await mongoose.connection.close();
  process.exit(0);
})();
