const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---------- Security & core middleware ----------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection guard)

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Basic rate limiting on all API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ---------- Static file serving (uploaded documents/receipts) ----------
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ---------- Dynamic Swagger UI ----------
// swaggerSpec is regenerated from JSDoc comments in route files every time
// the server boots, so docs never drift from the actual implemented routes.
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HRMS API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);
// Raw JSON spec (useful for Postman import / codegen)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ---------- API routes ----------
app.use('/api/v1', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to HRMS Mobile App API',
    docs: '/api-docs',
  });
});

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
