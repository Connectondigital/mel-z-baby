// Admin role check middleware
// Must be used AFTER authenticate middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
  }

  next();
};

module.exports = { requireAdmin };
