const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate unique order number
const generateOrderNumber = () => {
  const prefix = 'MLZ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// POST /orders - Create order (authenticated user)
const create = async (req, res) => {
  try {
    const { items, shippingName, shippingPhone, shippingAddress, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sepet boş' });
    }

    // Validate products and calculate total
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(item.productId) }
      });

      if (!product) {
        return res.status(400).json({ error: `Ürün bulunamadı: ${item.productId}` });
      }

      if (!product.active) {
        return res.status(400).json({ error: `Ürün aktif değil: ${product.name}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Yetersiz stok: ${product.name}` });
      }

      const price = product.salePrice || product.price;
      total += parseFloat(price) * item.quantity;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: parseFloat(price),
        size: item.size || null,
        color: item.color || null
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user.id,
        total,
        shippingName,
        shippingPhone,
        shippingAddress,
        notes: notes || null,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: { product: { select: { name: true, images: true } } }
        }
      }
    });

    // Update stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: parseInt(item.productId) },
        data: { stock: { decrement: item.quantity } }
      });
    }

    res.status(201).json({
      message: 'Sipariş oluşturuldu',
      order: {
        ...order,
        total: parseFloat(order.total)
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
};

// GET /orders/my - Get user's own orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { product: { select: { name: true, images: true, slug: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = orders.map(o => ({
      ...o,
      total: parseFloat(o.total),
      items: o.items.map(i => ({ ...i, price: parseFloat(i.price) }))
    }));

    res.json({ orders: formatted });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Siparişler alınamadı' });
  }
};

// GET /orders - Get all orders (admin)
const getAll = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: { product: { select: { name: true, images: true } } }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    const formatted = orders.map(o => ({
      ...o,
      total: parseFloat(o.total),
      items: o.items.map(i => ({ ...i, price: parseFloat(i.price) }))
    }));

    res.json({
      orders: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Siparişler alınamadı' });
  }
};

// PUT /orders/:id/status - Update order status (admin)
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz sipariş durumu' });
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        items: true
      }
    });

    res.json({
      message: 'Sipariş durumu güncellendi',
      order: {
        ...order,
        total: parseFloat(order.total)
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Sipariş durumu güncellenemedi' });
  }
};

module.exports = { create, getMyOrders, getAll, updateStatus };
