const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@melzbaby.com' },
    update: {},
    create: {
      email: 'admin@melzbaby.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: userPassword,
      name: 'Test Kullanıcı',
      role: 'USER',
      phone: '05551234567'
    }
  });
  console.log('✅ Test user created:', user.email);

  // Create categories
  const categories = [
    { name: 'Bebek Giyim', slug: 'bebek-giyim', description: 'Bebek kıyafetleri ve giyim ürünleri' },
    { name: 'Kız Çocuk', slug: 'kiz-cocuk', description: 'Kız çocuklar için giyim' },
    { name: 'Erkek Çocuk', slug: 'erkek-cocuk', description: 'Erkek çocuklar için giyim' },
    { name: 'Oyuncak', slug: 'oyuncak', description: 'Eğlenceli oyuncaklar' },
    { name: 'Beslenme', slug: 'beslenme', description: 'Bebek beslenme ürünleri' },
    { name: 'Banyo & Bakım', slug: 'banyo-bakim', description: 'Banyo ve bakım ürünleri' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('✅ Categories created:', categories.length);

  // Get category IDs
  const bebekGiyim = await prisma.category.findUnique({ where: { slug: 'bebek-giyim' } });
  const kizCocuk = await prisma.category.findUnique({ where: { slug: 'kiz-cocuk' } });
  const erkekCocuk = await prisma.category.findUnique({ where: { slug: 'erkek-cocuk' } });
  const oyuncak = await prisma.category.findUnique({ where: { slug: 'oyuncak' } });

  // Create sample products
  const products = [
    {
      name: 'Organik Pamuklu Bebek Tulumu',
      slug: 'organik-pamuklu-bebek-tulumu',
      description: '%100 organik pamuktan üretilmiş, bebeğinizin hassas cildine uygun yumuşacık tulum. Kolay giydirilip çıkarılabilir çıtçıt detayları ile.',
      price: 249.90,
      salePrice: 199.90,
      stock: 50,
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400'],
      sizes: ['0-3 Ay', '3-6 Ay', '6-9 Ay', '9-12 Ay'],
      colors: ['Beyaz', 'Pembe', 'Mavi'],
      featured: true,
      categoryId: bebekGiyim.id
    },
    {
      name: 'Unicorn Baskılı Kız Elbise',
      slug: 'unicorn-baskili-kiz-elbise',
      description: 'Sevimli unicorn baskılı, pamuklu kız çocuk elbisesi. Yaz ayları için ideal.',
      price: 179.90,
      stock: 35,
      images: ['https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400'],
      sizes: ['2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'],
      colors: ['Pembe', 'Mor', 'Beyaz'],
      featured: true,
      categoryId: kizCocuk.id
    },
    {
      name: 'Dinozor Desenli Erkek Pijama Takımı',
      slug: 'dinozor-desenli-erkek-pijama',
      description: 'Eğlenceli dinozor desenleri ile çocukların seveceği rahat pijama takımı.',
      price: 149.90,
      salePrice: 119.90,
      stock: 40,
      images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400'],
      sizes: ['2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'],
      colors: ['Yeşil', 'Mavi'],
      featured: false,
      categoryId: erkekCocuk.id
    },
    {
      name: 'Ahşap Eğitici Bloklar Seti',
      slug: 'ahsap-egitici-bloklar',
      description: 'Doğal ahşaptan üretilmiş, rengarenk eğitici bloklar. Motor becerilerini geliştirir.',
      price: 299.90,
      stock: 25,
      images: ['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400'],
      sizes: [],
      colors: [],
      featured: true,
      categoryId: oyuncak.id
    },
    {
      name: 'Bebek Mama Sand.',
      slug: 'bebek-mama-sandalyesi',
      description: 'Katlanabilir, taşıması kolay bebek mama sandalyesi. Güvenlik kemeri ile.',
      price: 899.90,
      salePrice: 749.90,
      stock: 15,
      images: ['https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400'],
      sizes: [],
      colors: ['Gri', 'Beyaz', 'Pembe'],
      featured: true,
      categoryId: bebekGiyim.id
    },
    {
      name: 'Peluş Tavsan',
      slug: 'pelus-tavsan',
      description: 'Yumuşacık peluş tavşan, bebekler için güvenli malzemeden.',
      price: 129.90,
      stock: 60,
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
      sizes: [],
      colors: ['Beyaz', 'Pembe', 'Kahverengi'],
      featured: false,
      categoryId: oyuncak.id
    },
    {
      name: 'Çizgili Bebek Çorap Seti (5li)',
      slug: 'cizgili-bebek-corap-seti',
      description: '5 çift pamuklu bebek çorabı. Yumsacık ve rahat.',
      price: 79.90,
      stock: 100,
      images: ['https://images.unsplash.com/photo-1519278409-1f56fdda7fe5?w=400'],
      sizes: ['0-6 Ay', '6-12 Ay', '12-24 Ay'],
      colors: ['Karışık'],
      featured: false,
      categoryId: bebekGiyim.id
    },
    {
      name: 'Prenses Kostum Elbise',
      slug: 'prenses-kostum-elbise',
      description: 'Ozel günler için prenses temasalı kostüm elbise.',
      price: 349.90,
      salePrice: 279.90,
      stock: 20,
      images: ['https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400'],
      sizes: ['2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş', '6-7 Yaş'],
      colors: ['Pembe', 'Mavi', 'Mor'],
      featured: true,
      categoryId: kizCocuk.id
    },
    {
      name: 'Supermen T-shirt',
      slug: 'supermen-tshirt',
      description: 'Supermen logolu pamuklu erkek çocuk tişörtü.',
      price: 89.90,
      stock: 45,
      images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400'],
      sizes: ['2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'],
      colors: ['Mavi', 'Kırmızı'],
      featured: false,
      categoryId: erkekCocuk.id
    },
    {
      name: 'Bebek Banyo Seti',
      slug: 'bebek-banyo-seti',
      description: 'Bebek şampuanı, losyon ve banyo oyuncağı içeren set.',
      price: 199.90,
      stock: 30,
      images: ['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400'],
      sizes: [],
      colors: [],
      featured: false,
      categoryId: bebekGiyim.id
    }
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod
    });
  }
  console.log('✅ Products created:', products.length);

  console.log('\n🎉 Seeding completed!');
  console.log('\n🔑 Admin credentials:');
  console.log('   Email: admin@melzbaby.com');
  console.log('   Password: admin123');
  console.log('\n👤 Test user credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: user123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
