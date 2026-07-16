const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new employee account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Anurag Mishra }
 *               email: { type: string, example: anurag@techsoft.com }
 *               password: { type: string, example: SecurePass123 }
 *               phone: { type: string, example: "+91-9876543210" }
 *               role: { type: string, enum: [employee, manager, hr, admin], example: employee }
 *               designation: { type: string, example: Software Developer }
 *               department: { type: string, example: Engineering }
 *     responses:
 *       201: { description: Employee registered successfully }
 *       409: { description: Email already exists }
 */
router.post('/register', ctrl.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email & password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: anurag@techsoft.com }
 *               password: { type: string, example: SecurePass123 }
 *     responses:
 *       200: { description: Login successful, returns accessToken & refreshToken }
 *       401: { description: Invalid credentials }
 */
router.post('/login', ctrl.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Get a new access token using a valid refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh-token', ctrl.refreshToken);

/**
 * @swagger
 * /auth/otp/request:
 *   post:
 *     summary: Request an OTP for two-factor authentication (sent via SMS/WhatsApp)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: OTP generated and dispatched }
 */
router.post('/otp/request', ctrl.requestOtp);

/**
 * @swagger
 * /auth/otp/verify:
 *   post:
 *     summary: Verify OTP code
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200: { description: OTP verified }
 *       400: { description: Invalid or expired OTP }
 */
router.post('/otp/verify', ctrl.verifyOtp);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get currently logged-in user's profile
 *     tags: [Auth]
 *     responses:
 *       200: { description: Current user profile }
 *       401: { description: Not authorized }
 */
router.get('/me', protect, ctrl.getMe);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout - invalidates the stored refresh token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post('/logout', protect, ctrl.logout);

module.exports = router;
