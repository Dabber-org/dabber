import { db } from '@/core/config/database'

const products = [
  // Mobile phones
  {
    name: 'iPhone 15 Pro',
    description:
      'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system.',
    category: 'mobile' as const,
    price: 999.99,
    imageUrl: '/iphone-15-pro.png',
    stock: 25,
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description:
      'Premium Android phone with S Pen, 200MP camera, and AI features.',
    category: 'mobile' as const,
    price: 1199.99,
    imageUrl: '/samsung-galaxy-s24-ultra.png',
    stock: 18,
  },
  {
    name: 'Google Pixel 8 Pro',
    description:
      "Google's flagship with advanced AI photography and pure Android experience.",
    category: 'mobile' as const,
    price: 899.99,
    imageUrl: '/google-pixel-8-pro-smartphone.jpg',
    stock: 22,
  },

  // Laptops
  {
    name: 'MacBook Pro 16"',
    description:
      'Powerful laptop with M3 Pro chip, perfect for professionals and creators.',
    category: 'laptop' as const,
    price: 2499.99,
    imageUrl: '/macbook-pro-16-inch-laptop.jpg',
    stock: 12,
  },
  {
    name: 'Dell XPS 13',
    description:
      'Ultra-portable laptop with stunning InfinityEdge display and premium build.',
    category: 'laptop' as const,
    price: 1299.99,
    imageUrl: '/dell-xps-13-laptop.jpg',
    stock: 15,
  },
  {
    name: 'ThinkPad X1 Carbon',
    description:
      'Business laptop with legendary keyboard, security features, and durability.',
    category: 'laptop' as const,
    price: 1599.99,
    imageUrl: '/thinkpad-x1-carbon-laptop.jpg',
    stock: 10,
  },

  // PCs
  {
    name: 'Gaming PC RTX 4080',
    description:
      'High-performance gaming desktop with RTX 4080, Intel i7, and 32GB RAM.',
    category: 'pc' as const,
    price: 2899.99,
    imageUrl: '/gaming-desktop-computer-rtx-4080.jpg',
    stock: 8,
  },
  {
    name: 'Mac Studio',
    description:
      'Compact powerhouse with M2 Ultra chip for professional workflows.',
    category: 'pc' as const,
    price: 3999.99,
    imageUrl: '/mac-studio-desktop-computer.jpg',
    stock: 6,
  },
  {
    name: 'Workstation PC',
    description:
      'Professional workstation with Xeon processor, Quadro graphics, and ECC memory.',
    category: 'pc' as const,
    price: 4599.99,
    imageUrl: '/professional-workstation-desktop-computer.jpg',
    stock: 4,
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  await db.cartItem.deleteMany()
  await db.order.deleteMany()
  await db.product.deleteMany()

  // Seed products
  for (const product of products) {
    await db.product.create({ data: product })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
