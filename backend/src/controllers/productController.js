const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
};

// GET /products - List products with filters
const getAll = async (req, res) => {
  try {
    const { search, category, featured, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (category) {
      // Support both id and slug
      const categoryId = parseInt(category);
      if (!isNaN(categoryId)) {
        where.categoryId = categoryId;
      } else {
        const cat = await prisma.category.findUnique({ where: { slug: category } });
        if (cat) where.categoryId = cat.id;
      }
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    // Convert Decimal to number for JSON
    const formattedProducts = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      salePrice: p.salePrice ? parseFloat(p.salePrice) : null
    }));

    res.json({
      products: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Ürünler alınamadı' });
  }
};

// GET /products/:id - Get single product by ID or slug
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let product;
    const numId = parseInt(id);
    
    if (!isNaN(numId)) {
      product = await prisma.product.findUnique({
        where: { id: numId },
        include: { category: true }
      });
    } else {
      product = await prisma.product.findUnique({
        where: { slug: id },
        include: { category: true }
      });
    }

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Format decimals
    const formatted = {
      ...product,
      price: parseFloat(product.price),
      salePrice: product.salePrice ? parseFloat(product.salePrice) : null
    };

    res.json({ product: formatted });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ürün alınamadı' });
  }
};

// POST /products - Create product (admin)
const create = async (req, res) => {
  try {
    const { name, description, price, salePrice, stock, images, sizes, colors, featured, categoryId } = req.body;
    const slug = generateSlug(name);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        stock: parseInt(stock) || 0,
        images: images || [],
        sizes: sizes || [],
        colors: colors || [],
        featured: featured || false,
        categoryId: categoryId ? parseInt(categoryId) : null
      },
      include: { category: true }
    });

    res.status(201).json({
      message: 'Ürün oluşturuldu',
      product: {
        ...product,
        price: parseFloat(product.price),
        salePrice: product.salePrice ? parseFloat(product.salePrice) : null
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Ürün oluşturulamadı' });
  }
};

// PUT /products/:id - Update product (admin)
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, salePrice, stock, images, sizes, colors, featured, active, categoryId } = req.body;

    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = generateSlug(name);
    }
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (salePrice !== undefined) updateData.salePrice = salePrice ? parseFloat(salePrice) : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (images !== undefined) updateData.images = images;
    if (sizes !== undefined) updateData.sizes = sizes;
    if (colors !== undefined) updateData.colors = colors;
    if (featured !== undefined) updateData.featured = featured;
    if (active !== undefined) updateData.active = active;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { category: true }
    });

    res.json({
      message: 'Ürün güncellendi',
      product: {
        ...product,
        price: parseFloat(product.price),
        salePrice: product.salePrice ? parseFloat(product.salePrice) : null
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Ürün güncellenemedi' });
  }
};

// DELETE /products/:id - Delete product (admin)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Ürün silindi' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Ürün silinemedi' });
  }
};

module.exports = { getAll, getById, create, update, remove };
