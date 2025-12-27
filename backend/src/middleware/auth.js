const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../config/env');

const prisma = new PrismaClient();

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkilendirme token\'ı gerekli' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş' });
    }
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Optional auth - attach user if token exists, but don't require it
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true }
      });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

module.exports = { authenticate, optionalAuth };
