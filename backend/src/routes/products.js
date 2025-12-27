const express = require('express');
const { getAll, getById, create, update, remove } = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Public routes
router.get('/', getAll);
router.get('/:id', getById);

// Admin routes
router.post('/', authenticate, requireAdmin, create);
router.put('/:id', authenticate, requireAdmin, update);
router.delete('/:id', authenticate, requireAdmin, remove);

module.exports = router;
