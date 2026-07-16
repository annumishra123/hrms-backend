# HRMS Mobile App — Backend API

Node.js + Express + MongoDB backend for the Next-Gen HRMS Mobile App, with **dynamic Swagger API docs**
(auto-generated from JSDoc comments in the route files — no hand-written spec file to keep in sync).

## Features Implemented

- **Auth**: register, login, JWT access + refresh tokens, OTP request/verify (2FA hook), logout
- **Employees**: profile CRUD, search & pagination, salary structure, activate/deactivate
- **Attendance**: QR code check-in, GPS geo-fenced check-in (Haversine radius check), Face-login
  liveness check-in, check-out, offline-event bulk sync, regularization requests, monthly summary
- **Leave**: apply, approve/reject (manager/HR), cancel, team leave view, company leave calendar,
  automatic leave-balance deduction
- **Payroll**: payslip generation & listing, indicative old-vs-new regime tax planner, OCR-assisted
  expense claim submission & approval workflow
- **Performance**: OKRs with key-result progress tracking, 360° review ratings (self/manager/peer/direct-reports)
- **Recruitment**: job postings, applicant pipeline (applied → shortlisted → interview → offered → hired/rejected)
- **Documents**: document vault upload (Multer), digital ID card data, expiry reminders
- **Engagement**: company announcements, helpdesk/ticketing with comments & status tracking
- **Admin**: dashboard KPIs, attendance trend, department headcount, org chart tree
- **Security**: Helmet, CORS, rate limiting, Mongo query sanitization, RBAC (`employee` / `manager` / `hr` / `admin`)

## Tech Stack

Node.js • Express • MongoDB (Mongoose) • JWT • Multer • Swagger (swagger-jsdoc + swagger-ui-express)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env — set MONGO_URI, JWT_SECRET, OFFICE_LAT/LNG (for GPS geofence), etc.

# 3. Start MongoDB locally, or point MONGO_URI to Atlas

# 4. (Optional) seed 3 demo accounts (admin/manager/employee)
npm run seed

# 5. Run the server
npm run dev     # nodemon, auto-restart on change
# or
npm start
```

Server runs on `http://localhost:5000` by default.

## Swagger / API Docs (Dynamic)

Open **`http://localhost:5000/api-docs`** in your browser.

This is generated **dynamically at boot** by `swagger-jsdoc`, which scans every file in
`src/routes/*.js` for `@swagger` JSDoc blocks and assembles the OpenAPI 3.0 spec in memory
(see `src/config/swagger.js`). To document a new endpoint:

1. Add your route in the relevant `src/routes/*.js` file.
2. Write a `@swagger` JSDoc comment directly above it (copy the pattern from any existing route).
3. Restart the server — it appears in Swagger UI automatically. No manual spec editing required.

Raw JSON spec (for Postman import): `http://localhost:5000/api-docs.json`

## Demo Login (after `npm run seed`)

| Role     | Email                  | Password      |
|----------|-------------------------|---------------|
| Admin/HR | admin@techsoft.com      | Admin@123     |
| Manager  | manager@techsoft.com    | Manager@123   |
| Employee | employee@techsoft.com   | Employee@123  |

Use `POST /api/v1/auth/login` to get an `accessToken`, then click **Authorize** in Swagger UI
and paste `Bearer <accessToken>` to call protected routes.

## Folder Structure

```
hrms-backend/
├── server.js                 # entry point
├── src/
│   ├── app.js                 # express app, middleware, swagger mount
│   ├── config/                # db.js, swagger.js, upload.js
│   ├── middleware/            # auth (JWT+RBAC), errorHandler
│   ├── models/                # Mongoose schemas (also hold @swagger component schemas)
│   ├── controllers/           # business logic
│   ├── routes/                # route definitions + @swagger JSDoc annotations
│   └── utils/                 # geo.js (haversine), qr.js (QR token), seed.js
├── uploads/                   # uploaded documents/receipts (gitignored)
├── .env.example
└── package.json
```

## Notes / Where To Plug Real Integrations

- **Face liveness**: `POST /attendance/face/checkin` expects `livenessVerified` boolean — wire this up
  to AWS Rekognition / on-device ML Kit liveness SDK on the mobile app, then just call this endpoint.
- **OCR receipts**: `POST /payroll/expenses` accepts `ocrExtractedText` — plug Google Vision / Tesseract
  on the client or a separate OCR microservice and pass extracted fields here.
- **SMS/WhatsApp OTP**: `authController.requestOtp` has a `TODO` marker — integrate Twilio/MSG91/WhatsApp
  Business API there; currently it only logs/returns the OTP in non-production mode for testing.
- **Tax planner**: `payrollController.taxPlanner` uses simplified illustrative slabs — replace with a
  proper compliance rule engine (or CA-reviewed logic) before using in production payroll.
# hrms-backend
