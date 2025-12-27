const express = require('express');
const { create, getMyOrders, getAll, updateStatus } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// User routes (authenticated)
router.post('/', authenticate, create);
router.get('/my', authenticate, getMyOrders);

// Admin routes
router.get('/', authenticate, requireAdmin, getAll);
router.put('/:id/status', authenticate, requireAdmin, updateStatus);

module.exports = router;
