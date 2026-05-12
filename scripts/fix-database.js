// Database fix script to add missing columns
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database fix...');
  
  try {
    // Check if isActive column exists in clients table
    const columnCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM pragma_table_info('clients') 
      WHERE name = 'isActive'
    `;
    
    const columnExists = columnCheck[0].count > 0;
    
    if (!columnExists) {
      console.log('Adding isActive column to clients table...');
      
      // Add isActive column with default value
      await prisma.$executeRaw`
        ALTER TABLE clients ADD COLUMN isActive BOOLEAN DEFAULT 1
      `;
      
      console.log('✓ isActive column added successfully!');
    } else {
      console.log('✓ isActive column already exists.');
    }
    
    // Verify the fix
    const verifyResult = await prisma.$queryRaw`
      SELECT * FROM pragma_table_info('clients') WHERE name = 'isActive'
    `;
    
    console.log('\nVerification:');
    console.log(verifyResult);
    
    console.log('\n✅ Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
