const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Geçerli bir e-posta adresi girin'),
    body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
    body('name').notEmpty().withMessage('İsim gerekli')
  ],
  validate,
  register
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Geçerli bir e-posta adresi girin'),
    body('password').notEmpty().withMessage('Şifre gerekli')
  ],
  validate,
  login
);

// GET /auth/me
router.get('/me', authenticate, getMe);

module.exports = router;
