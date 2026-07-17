const swaggerJSDoc = require('swagger-jsdoc');

/**
 * DYNAMIC SWAGGER SETUP
 * ----------------------
 * We do NOT hand-write a static swagger.json. Instead swagger-jsdoc scans
 * every file matched by `apis` (all route files) at server boot, reads the
 * `@swagger` / `@openapi` JSDoc blocks placed above each route, and builds
 * the OpenAPI spec dynamically in memory.
 *
 * => Add a new route file + JSDoc block => it automatically appears in
 *    Swagger UI on next server restart. No manual spec editing needed.
 */

const BASE_URL =
  process.env.BASE_URL ||
  "https://hrms-backend-monk.onrender.com";

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'HRMS Mobile App API',
    version: '1.0.0',
    description:
      'Next-Gen HRMS Backend API — Auth, Attendance (QR/GPS/Face), Leave, Payroll, Performance & OKRs, ' +
      'Recruitment, Documents, Announcements, Helpdesk and Admin Analytics. ' +
      'Generated dynamically from JSDoc comments in route files via swagger-jsdoc.',
    contact: {
      name: 'HRMS Dev Team',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: `${BASE_URL}/api/v1`,
      description: 'Current environment',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Registration, login, tokens, MFA/OTP' },
    { name: 'Employees', description: 'Employee profile & self-service' },
    { name: 'Attendance', description: 'QR / GPS geo-fence / Face liveness attendance' },
    { name: 'Leave', description: 'Leave application, approval, balances' },
    { name: 'Payroll', description: 'Payslips, tax planner, reimbursements' },
    { name: 'Performance', description: 'OKRs & 360° performance reviews' },
    { name: 'Recruitment', description: 'Job postings & applicant tracking' },
    { name: 'Documents', description: 'Document vault & digital ID card' },
    { name: 'Announcements', description: 'Company announcements & chat' },
    { name: 'Helpdesk', description: 'Support tickets' },
    { name: 'Admin', description: 'Admin analytics dashboard & org chart' },
  ],
};

const options = {
  swaggerDefinition,
  // Every route file's JSDoc @swagger blocks are auto-collected from here.
  apis: [
    './src/routes/*.js',
    './src/models/*.js', // allows shared @swagger component schemas defined next to models
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
