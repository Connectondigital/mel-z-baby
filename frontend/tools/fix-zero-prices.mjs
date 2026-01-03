import fs from 'fs';
import path from 'path';

async function fixZeroPrices() {
  const dataPath = path.resolve('frontend/assets/data/products.json');
  const backupPath = path.resolve(`frontend/assets/data/products.json.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`);

  // Read products.json
  let productsRaw;
  try {
    productsRaw = await fs.promises.readFile(dataPath, 'utf-8');
  } catch (err) {
    console.error('Error reading products.json:', err);
    process.exit(1);
  }

  // Backup original file
  try {
    await fs.promises.writeFile(backupPath, productsRaw, 'utf-8');
  } catch (err) {
    console.error('Error creating backup file:', err);
    process.exit(1);
  }

  let products;
  try {
    products = JSON.parse(productsRaw);
  } catch (err) {
    console.error('Error parsing products.json:', err);
    process.exit(1);
  }

  let normalizedHugeCount = 0;
  let fixedZeroCount = 0;

  for (const product of products) {
    // Normalize huge prices (>= 5000) by dividing by 100 and rounding to 2 decimals
    if (typeof product.price === 'number' && product.price >= 5000) {
      product.price = Math.round((product.price / 100) * 100) / 100;
      normalizedHugeCount++;
    }
    if (typeof product.salePrice === 'number' && product.salePrice >= 5000) {
      product.salePrice = Math.round((product.salePrice / 100) * 100) / 100;
      normalizedHugeCount++;
    }

    // Determine effective price
    const effective = (product.salePrice > 0 ? product.salePrice : product.price > 0 ? product.price : 0);

    // Fix zero effective price by setting price to 250
    if (effective === 0) {
      product.price = 250;
      fixedZeroCount++;
    }
  }

  // Write back updated products.json with 2-space indentation
  try {
    await fs.promises.writeFile(dataPath, JSON.stringify(products, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing updated products.json:', err);
    process.exit(1);
  }

  // Console summary
  console.log(`Total products: ${products.length}`);
  console.log(`Normalized huge prices count: ${normalizedHugeCount}`);
  console.log(`Fixed zero prices count: ${fixedZeroCount}`);
  console.log(`Backup file created at: ${backupPath}`);
}

fixZeroPrices();
