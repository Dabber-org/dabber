import { execSync } from "child_process"

console.log("🔧 Setting up database...")

try {
  // Generate Prisma client
  console.log("📦 Generating Prisma client...")
  execSync("bunx prisma generate", { stdio: "inherit" })

  // Run database migrations
  console.log("🗄️ Running database migrations...")
  execSync("bunx prisma migrate dev --name init", { stdio: "inherit" })

  // Seed the database
  console.log("🌱 Seeding database...")
  execSync("bunx prisma db seed", { stdio: "inherit" })

  console.log("✅ Database setup complete!")
} catch (error) {
  console.error("❌ Database setup failed:", error)
  process.exit(1)
}
