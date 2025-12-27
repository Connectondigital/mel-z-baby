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
    .replace(/^-|-$/g, '');
};

// GET /categories - List all categories
const getAll = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
        children: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Kategoriler alınamadı' });
  }
};

// GET /categories/:id - Get single category
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        products: {
          where: { active: true },
          take: 20
        },
        children: true,
        parent: true
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }

    res.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Kategori alınamadı' });
  }
};

// POST /categories - Create category (admin)
const create = async (req, res) => {
  try {
    const { name, description, image, parentId } = req.body;
    const slug = generateSlug(name);

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        parentId: parentId ? parseInt(parentId) : null
      }
    });

    res.status(201).json({ message: 'Kategori oluşturuldu', category });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Bu isimde bir kategori zaten var' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Kategori oluşturulamadı' });
  }
};

// PUT /categories/:id - Update category (admin)
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, parentId } = req.body;

    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = generateSlug(name);
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId) : null;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ message: 'Kategori güncellendi', category });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Kategori güncellenemedi' });
  }
};

// DELETE /categories/:id - Delete category (admin)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Kategori silindi' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Kategori silinemedi' });
  }
};

module.exports = { getAll, getById, create, update, remove };
