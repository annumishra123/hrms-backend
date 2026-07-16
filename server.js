require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 HRMS Backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📄 Swagger API docs available at: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api-docs`);
  });
});

// Safety nets for unhandled errors
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
});
