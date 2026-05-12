import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Check if isActive column exists
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM pragma_table_info('clients') WHERE name = 'isActive'
    `
    
    console.log('Column check result:', result)
    
    // Add isActive column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE clients ADD COLUMN isActive BOOLEAN DEFAULT 1
    `
    
    console.log('Successfully added isActive column to clients table')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
