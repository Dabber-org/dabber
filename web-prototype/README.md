# ElectroStore - E-commerce Electronics Website

A modern, production-grade e-commerce website built with Next.js 15, TypeScript, and a clean feature-based architecture. Specializes in mobile phones, laptops, and desktop computers.

## ✨ Features

- **Product Catalog**: Browse electronics by category with filtering
- **Shopping Cart**: Add/remove items, quantity management, persistent cart
- **Checkout Flow**: Complete order processing with form validation
- **Order Management**: Order confirmation and tracking
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Clean Architecture**: Feature-based organization with separation of concerns

## 🏗️ Architecture

This project follows a clean, feature-based architecture:

```
src/
├── core/                 # Core utilities and configuration
│   ├── config/          # Database, environment config
│   ├── types/           # Shared type definitions
│   └── utils/           # Common utilities
├── features/            # Feature-based modules
│   ├── products/        # Product catalog feature
│   ├── cart/           # Shopping cart feature
│   └── orders/         # Order processing feature
├── shared/             # Shared UI components
│   └── ui/             # Common UI components
└── app/                # Next.js app router pages
```

### Architecture Principles

- **Separation of Concerns**: Each feature has its own repository, service, and components
- **Clean Dependencies**: Core → Features → Shared → App
- **Type Safety**: Comprehensive TypeScript and Zod validation
- **Testability**: Modular design enables easy testing
- **Scalability**: Easy to add new features without affecting existing code

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Validation**: Zod
- **Language**: TypeScript
- **Runtime**: Node.js/Bun

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm/yarn/pnpm/bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd electrostore
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Set up the database:
```bash
npm run setup:db
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database
- `npm run setup:db` - Complete database setup

## 🗄️ Database Schema

### Product
- Unique identifier, name, description
- Category (mobile, laptop, pc)
- Price, image URL, stock quantity
- Activation status, timestamps

### CartItem
- Links to products with quantities
- Timestamps for tracking

### Order
- JSON storage of ordered products
- Total price, status tracking
- Creation and update timestamps

## 🎯 Feature Modules

### Products Feature
- **Repository**: Database operations for products
- **Service**: Business logic for product management
- **Components**: Product cards, grids, filters
- **Types**: Product-specific type definitions

### Cart Feature
- **Repository**: Cart item persistence
- **Service**: Cart calculations and operations
- **Components**: Cart items, summaries, buttons
- **Types**: Cart-specific interfaces

### Orders Feature
- **Repository**: Order creation and management
- **Service**: Order processing logic
- **Components**: Checkout forms, order summaries
- **Types**: Order and customer interfaces

## 🔧 Environment Variables

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## 🚀 Deployment

The application is ready for deployment on Vercel, Netlify, or any Node.js hosting platform:

1. Set up environment variables in your hosting platform
2. Configure your production database
3. Run database migrations in production
4. Deploy the application

## 📁 Project Structure

```
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── src/
│   ├── core/           # Core utilities
│   ├── features/       # Feature modules
│   ├── shared/         # Shared components
│   ├── app/            # Next.js pages
│   └── db/             # Database utilities
├── components.json     # shadcn/ui configuration
├── tailwind.config.js  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.