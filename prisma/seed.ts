import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...\n')

  // Clean existing data (optional - comment out if you want to keep existing data)
  await cleanDatabase()

  // Seed data in order of dependencies
  await seedShopSettings()
  await seedUsers()
  await seedCategories()
  await seedProducts()
  await seedClients()
  await seedSuppliers()
  await seedRepairs()
  await seedSales()
  await seedPurchases()
  await seedCashRegister()
  await seedActivityLogs()
  await seedNotifications()

  console.log('\n✅ Database seed completed successfully!')
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...')
  
  // Delete in reverse order of dependencies
  await prisma.notification.deleteMany({})
  await prisma.activityLog.deleteMany({})
  await prisma.saleItem.deleteMany({})
  await prisma.sale.deleteMany({})
  await prisma.purchaseItem.deleteMany({})
  await prisma.purchase.deleteMany({})
  await prisma.inventoryLog.deleteMany({})
  await prisma.cashMovement.deleteMany({})
  await prisma.cashRegister.deleteMany({})
  await prisma.repairPart.deleteMany({})
  await prisma.repair.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.category.deleteMany({})
  await prisma.supplier.deleteMany({})
  await prisma.client.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.shopSettings.deleteMany({})
  
  console.log('✓ Database cleaned')
}

async function seedShopSettings() {
  console.log('🏪 Seeding shop settings...')
  
  await prisma.shopSettings.create({
    data: {
      shopName: 'RepairPro Mobile Shop',
      address: '123 Repair Street, Tech City, TC 12345',
      phone: '+1 (555) 123-4567',
      email: 'contact@repairpro.com',
      taxId: 'TAX-12345-678',
      currency: 'USD',
      timezone: 'America/New_York',
      receiptFooter: 'Thank you for choosing RepairPro!\nFollow us @RepairPro',
      lowStockThreshold: 10,
    },
  })
  
  console.log('✓ Shop settings created')
}

async function seedUsers() {
  console.log('👤 Seeding users...')
  
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const users = [
    {
      name: 'Admin User',
      email: 'admin@repairpro.com',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '+1 (555) 100-0001',
      isActive: true,
    },
    {
      name: 'Manager User',
      email: 'manager@repairpro.com',
      password: hashedPassword,
      role: 'MANAGER',
      phone: '+1 (555) 100-0002',
      isActive: true,
    },
    {
      name: 'Technician One',
      email: 'tech1@repairpro.com',
      password: hashedPassword,
      role: 'TECHNICIAN',
      phone: '+1 (555) 100-0003',
      isActive: true,
    },
    {
      name: 'Technician Two',
      email: 'tech2@repairpro.com',
      password: hashedPassword,
      role: 'TECHNICIAN',
      phone: '+1 (555) 100-0004',
      isActive: true,
    },
    {
      name: 'Sales Rep',
      email: 'sales@repairpro.com',
      password: hashedPassword,
      role: 'SELLER',
      phone: '+1 (555) 100-0005',
      isActive: true,
    },
    {
      name: 'Cashier',
      email: 'cashier@repairpro.com',
      password: hashedPassword,
      role: 'CASHIER',
      phone: '+1 (555) 100-0006',
      isActive: true,
    },
  ]
  
  for (const user of users) {
    await prisma.user.create({ data: user as any })
  }
  
  console.log(`✓ ${users.length} users created`)
}

async function seedCategories() {
  console.log('📁 Seeding categories...')
  
  const categories = [
    {
      name: 'Screen Protectors',
      description: 'Tempered glass and plastic screen protectors for all phone models',
    },
    {
      name: 'Charging Cables',
      description: 'USB, USB-C, Lightning, and wireless charging cables',
    },
    {
      name: 'Phone Cases',
      description: 'Protective cases, covers, and sleeves for mobile phones',
    },
    {
      name: 'Batteries',
      description: 'Replacement batteries for various phone models',
    },
    {
      name: 'Screens',
      description: 'LCD and OLED replacement screens',
    },
    {
      name: 'Audio Accessories',
      description: 'Headphones, earphones, speakers, and audio cables',
    },
    {
      name: 'Power Adapters',
      description: 'Wall chargers, car chargers, and power banks',
    },
    {
      name: 'Repair Tools',
      description: 'Screwdrivers, prying tools, and repair kits',
    },
    {
      name: 'Cleaning Supplies',
      description: 'Screen cleaners, wipes, and dust removal tools',
    },
    {
      name: 'SIM Accessories',
      description: 'SIM cards, ejector tools, and SIM adapters',
    },
  ]
  
  for (const category of categories) {
    await prisma.category.create({ data: category })
  }
  
  console.log(`✓ ${categories.length} categories created`)
}

async function seedProducts() {
  console.log('📦 Seeding products...')
  
  const products = [
    // Screen Protectors
    { name: 'iPhone 14 Pro Max Tempered Glass', sku: 'SP-IP14PM-001', category: 'Screen Protectors', price: 24.99, cost: 8.50, stock: 50 },
    { name: 'iPhone 14 Pro Tempered Glass', sku: 'SP-IP14P-001', category: 'Screen Protectors', price: 22.99, cost: 7.50, stock: 45 },
    { name: 'Samsung S23 Ultra Tempered Glass', sku: 'SP-S23U-001', category: 'Screen Protectors', price: 26.99, cost: 9.00, stock: 40 },
    { name: 'Google Pixel 7 Pro Screen Protector', sku: 'SP-P7P-001', category: 'Screen Protectors', price: 19.99, cost: 6.50, stock: 35 },
    
    // Charging Cables
    { name: 'USB-C to Lightning Cable 6ft', sku: 'CBL-UC-L-001', category: 'Charging Cables', price: 19.99, cost: 5.50, stock: 80 },
    { name: 'USB-C to USB-C Cable 6ft', sku: 'CBL-UC-UC-001', category: 'Charging Cables', price: 15.99, cost: 4.50, stock: 75 },
    { name: 'USB-A to Lightning Cable 3ft', sku: 'CBL-UA-L-001', category: 'Charging Cables', price: 14.99, cost: 4.00, stock: 70 },
    { name: 'MagSafe Charging Cable', sku: 'CBL-MS-001', category: 'Charging Cables', price: 39.99, cost: 15.00, stock: 30 },
    
    // Phone Cases
    { name: 'iPhone 14 Pro Max Clear Case', sku: 'CAS-IP14PM-C-001', category: 'Phone Cases', price: 29.99, cost: 8.50, stock: 60 },
    { name: 'iPhone 14 Pro Leather Case', sku: 'CAS-IP14P-L-001', category: 'Phone Cases', price: 59.99, cost: 20.00, stock: 25 },
    { name: 'Samsung S23 Ultra Protective Case', sku: 'CAS-S23U-P-001', category: 'Phone Cases', price: 34.99, cost: 10.00, stock: 45 },
    { name: 'Universal Flip Wallet Case', sku: 'CAS-FW-001', category: 'Phone Cases', price: 24.99, cost: 7.50, stock: 55 },
    
    // Batteries
    { name: 'iPhone 12/12 Pro Replacement Battery', sku: 'BAT-IP12-001', category: 'Batteries', price: 49.99, cost: 18.00, stock: 30 },
    { name: 'iPhone 13 Pro Max Battery', sku: 'BAT-IP13PM-001', category: 'Batteries', price: 59.99, cost: 22.00, stock: 25 },
    { name: 'Samsung Galaxy S21 Battery', sku: 'BAT-S21-001', category: 'Batteries', price: 44.99, cost: 16.00, stock: 20 },
    { name: 'Portable Power Bank 10000mAh', sku: 'PB-10K-001', category: 'Batteries', price: 34.99, cost: 12.00, stock: 50 },
    
    // Screens
    { name: 'iPhone 11 LCD Screen Assembly', sku: 'SCR-IP11-001', category: 'Screens', price: 89.99, cost: 35.00, stock: 15 },
    { name: 'iPhone 12 OLED Screen Premium', sku: 'SCR-IP12-O-001', category: 'Screens', price: 149.99, cost: 65.00, stock: 10 },
    { name: 'Samsung S20 FE Screen Assembly', sku: 'SCR-S20FE-001', category: 'Screens', price: 119.99, cost: 48.00, stock: 12 },
    { name: 'Google Pixel 5 Screen OLED', sku: 'SCR-P5-001', category: 'Screens', price: 129.99, cost: 55.00, stock: 8 },
    
    // Audio Accessories
    { name: 'Wired Earphones with Mic', sku: 'AUD-WE-001', category: 'Audio Accessories', price: 14.99, cost: 4.50, stock: 70 },
    { name: 'Bluetooth Wireless Earbuds', sku: 'AUD-BT-001', category: 'Audio Accessories', price: 49.99, cost: 18.00, stock: 40 },
    { name: 'Premium Over-Ear Headphones', sku: 'AUD-OE-001', category: 'Audio Accessories', price: 89.99, cost: 35.00, stock: 20 },
    { name: '3.5mm Audio Adapter USB-C', sku: 'AUD-AD-001', category: 'Audio Accessories', price: 9.99, cost: 2.50, stock: 60 },
    
    // Power Adapters
    { name: '20W USB-C Power Adapter', sku: 'PWR-20W-001', category: 'Power Adapters', price: 19.99, cost: 6.50, stock: 65 },
    { name: '30W Fast Charger USB-C', sku: 'PWR-30W-001', category: 'Power Adapters', price: 29.99, cost: 10.00, stock: 45 },
    { name: '65W GaN Multi-Port Charger', sku: 'PWR-65G-001', category: 'Power Adapters', price: 59.99, cost: 22.00, stock: 25 },
    { name: 'Car Charger Dual USB 36W', sku: 'PWR-CC-001', category: 'Power Adapters', price: 24.99, cost: 8.00, stock: 40 },
    
    // Repair Tools
    { name: 'Precision Screwdriver Set 25-in-1', sku: 'TL-SD-001', category: 'Repair Tools', price: 19.99, cost: 6.00, stock: 35 },
    { name: 'Phone Opening Tool Kit', sku: 'TL-OP-001', category: 'Repair Tools', price: 14.99, cost: 4.50, stock: 45 },
    { name: 'Suction Cup Screen Removal Tool', sku: 'TL-SC-001', category: 'Repair Tools', price: 7.99, cost: 2.00, stock: 55 },
    { name: 'Anti-Static Mat and Wrist Strap', sku: 'TL-ESD-001', category: 'Repair Tools', price: 24.99, cost: 8.00, stock: 25 },
    { name: 'Heat Gun for Phone Repair', sku: 'TL-HG-001', category: 'Repair Tools', price: 39.99, cost: 15.00, stock: 15 },
    
    // Cleaning Supplies
    { name: 'Screen Cleaning Solution 200ml', sku: 'CLN-SOL-001', category: 'Cleaning Supplies', price: 9.99, cost: 3.00, stock: 50 },
    { name: 'Microfiber Cleaning Cloths (5-pack)', sku: 'CLN-MF-001', category: 'Cleaning Supplies', price: 7.99, cost: 2.50, stock: 60 },
    { name: 'Compressed Air Duster', sku: 'CLN-AIR-001', category: 'Cleaning Supplies', price: 12.99, cost: 4.00, stock: 40 },
    { name: 'Cleaning Brush Set for Electronics', sku: 'CLN-BR-001', category: 'Cleaning Supplies', price: 8.99, cost: 2.80, stock: 45 },
    
    // SIM Accessories
    { name: 'Nano SIM Card (Various Carriers)', sku: 'SIM-NANO-001', category: 'SIM Accessories', price: 4.99, cost: 1.50, stock: 100 },
    { name: 'SIM Card Ejector Tool (5-pack)', sku: 'SIM-EJ-001', category: 'SIM Accessories', price: 3.99, cost: 0.80, stock: 80 },
    { name: 'SIM Card Adapter Kit (Nano/Micro/Standard)', sku: 'SIM-AD-001', category: 'SIM Accessories', price: 5.99, cost: 1.50, stock: 60 },
    { name: 'Dual SIM Card Holder Case', sku: 'SIM-CASE-001', category: 'SIM Accessories', price: 6.99, cost: 2.00, stock: 40 },
  ]

  // Create products
  const createdProducts = []
  for (const product of products) {
    const category = await prisma.category.findFirst({
      where: { name: product.category },
    })

    if (category) {
      const created = await prisma.product.create({
        data: {
          name: product.name,
          sku: product.sku,
          description: `High quality ${product.name.toLowerCase()} for mobile devices`,
          price: product.price,
          costPrice: product.cost,
          stock: product.stock,
          minStock: 5,
          categoryId: category.id,
          barcode: `BAR${Math.random().toString().slice(2, 14)}`,
          isActive: true,
        },
      })
      createdProducts.push(created)
    }
  }

  console.log(`✓ ${createdProducts.length} products created`)
}

async function seedClients() {
  console.log('👥 Seeding clients...')
  
  const clients = [
    { name: 'John Smith', email: 'john.smith@email.com', phone: '+1 (555) 200-0001', address: '123 Main St, City A' },
    { name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+1 (555) 200-0002', address: '456 Oak Ave, City B' },
    { name: 'Michael Brown', email: 'mbrown@email.com', phone: '+1 (555) 200-0003', address: '789 Pine Rd, City C' },
    { name: 'Emily Davis', email: 'emily.davis@email.com', phone: '+1 (555) 200-0004', address: '321 Elm St, City D' },
    { name: 'David Wilson', email: 'd.wilson@email.com', phone: '+1 (555) 200-0005', address: '654 Maple Dr, City E' },
    { name: 'Jessica Taylor', email: 'jessica.t@email.com', phone: '+1 (555) 200-0006', address: '987 Cedar Ln, City F' },
    { name: 'Christopher Anderson', email: 'c.anderson@email.com', phone: '+1 (555) 200-0007', address: '147 Birch Way, City G' },
    { name: 'Amanda Martinez', email: 'amanda.m@email.com', phone: '+1 (555) 200-0008', address: '258 Spruce Ct, City H' },
    { name: 'Matthew Robinson', email: 'm.robinson@email.com', phone: '+1 (555) 200-0009', address: '369 Willow Pl, City I' },
  ]
  
  for (const client of clients) {
    await prisma.client.create({
      data: {
        ...client,
        notes: `Regular customer since ${new Date().getFullYear()}`,
      },
    })
  }
  
  console.log(`✓ ${clients.length} clients created`)
}

async function seedSuppliers() {
  console.log('🏭 Seeding suppliers...')
  
  const suppliers = [
    { name: 'TechParts Wholesale', email: 'orders@techparts.com', phone: '+1 (555) 300-0001', address: '100 Industrial Blvd, Tech City' },
    { name: 'Mobile Supply Co', email: 'sales@mobilesupply.com', phone: '+1 (555) 300-0002', address: '200 Commerce St, Business City' },
    { name: 'Global Phone Parts', email: 'contact@globalphoneparts.com', phone: '+1 (555) 300-0003', address: '300 Import Ave, Port City' },
    { name: 'Premium Accessories Ltd', email: 'orders@premiumacc.com', phone: '+1 (555) 300-0004', address: '400 Quality Rd, Premium City' },
    { name: 'Repair Tools Depot', email: 'sales@repairtools.com', phone: '+1 (555) 300-0005', address: '500 Workshop Ln, Tool City' },
  ]
  
  for (const supplier of suppliers) {
    await prisma.supplier.create({
      data: {
        ...supplier,
        notes: 'Reliable supplier with good pricing',
      },
    })
  }
  
  console.log(`✓ ${suppliers.length} suppliers created`)
}

async function seedRepairs() {
  console.log('🔧 Seeding repairs...')
  
  const devices = [
    { brand: 'Apple', models: ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 13', 'iPhone 12', 'iPad Pro'] },
    { brand: 'Samsung', models: ['Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy Z Fold 4', 'Galaxy Z Flip 4', 'Galaxy Note 20'] },
    { brand: 'Google', models: ['Pixel 7 Pro', 'Pixel 7', 'Pixel 6a', 'Pixel 6 Pro'] },
    { brand: 'OnePlus', models: ['OnePlus 11', 'OnePlus 10 Pro', 'OnePlus 9'] },
    { brand: 'Xiaomi', models: ['Mi 13 Pro', 'Mi 12', 'Redmi Note 12'] },
  ]
  
  const issues = [
    { issue: 'Screen Replacement', description: 'Cracked or damaged display needs replacement', priceRange: [80, 350] },
    { issue: 'Battery Replacement', description: 'Battery not holding charge or swollen', priceRange: [40, 100] },
    { issue: 'Charging Port Repair', description: 'Phone not charging or loose connection', priceRange: [50, 120] },
    { issue: 'Water Damage', description: 'Device exposed to liquid, needs cleaning and repair', priceRange: [60, 200] },
    { issue: 'Camera Replacement', description: 'Blurry photos or camera not working', priceRange: [60, 180] },
    { issue: 'Speaker/Mic Repair', description: 'No sound during calls or poor audio quality', priceRange: [40, 100] },
    { issue: 'Software Issue', description: 'System crashes, boot loops, or software errors', priceRange: [30, 80] },
    { issue: 'Back Glass Replacement', description: 'Cracked rear glass panel', priceRange: [50, 150] },
    { issue: 'Button Repair', description: 'Power, volume, or home button not working', priceRange: [40, 90] },
  ]

  const clients = await prisma.client.findMany({ select: { id: true } })
  const technicians = await prisma.user.findMany({
    where: { role: 'TECHNICIAN' },
    select: { id: true },
  })

  const repairs = []
  const now = new Date()
  
  // Generate repairs for the past 90 days
  for (let i = 0; i < 150; i++) {
    const deviceBrand = devices[Math.floor(Math.random() * devices.length)]
    const deviceModel = deviceBrand.models[Math.floor(Math.random() * deviceBrand.models.length)]
    const issue = issues[Math.floor(Math.random() * issues.length)]
    const client = clients[Math.floor(Math.random() * clients.length)]
    const technician = technicians[Math.floor(Math.random() * technicians.length)]
    
    const daysAgo = Math.floor(Math.random() * 90)
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - daysAgo)
    
    const price = Math.floor(Math.random() * (issue.priceRange[1] - issue.priceRange[0]) + issue.priceRange[0])
    
    let status = 'PENDING'
    let priority = 'MEDIUM'
    let completedAt = null
    
    if (daysAgo > 60) {
      status = 'COMPLETED'
      priority = ['LOW', 'MEDIUM'][Math.floor(Math.random() * 2)]
      completedAt = new Date(createdAt)
      completedAt.setDate(completedAt.getDate() + Math.floor(Math.random() * 5) + 1)
    } else if (daysAgo > 30) {
      status = ['IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 2)]
      priority = ['MEDIUM', 'HIGH'][Math.floor(Math.random() * 2)]
      if (status === 'COMPLETED') {
        completedAt = new Date(createdAt)
        completedAt.setDate(completedAt.getDate() + Math.floor(Math.random() * 5) + 1)
      }
    } else {
      status = ['PENDING', 'IN_PROGRESS'][Math.floor(Math.random() * 2)]
      priority = ['HIGH', 'URGENT'][Math.floor(Math.random() * 2)]
    }
    
    repairs.push({
      ticketNumber: `REP-${Date.now()}-${i}`,
      deviceBrand: deviceBrand.brand,
      deviceModel,
      serialNumber: `SN${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      issue: issue.issue,
      issueDescription: issue.description,
      status,
      priority,
      price,
      deposit: status !== 'PENDING' ? Math.floor(price * 0.3) : 0,
      assignedToId: technician.id,
      clientId: client.id,
      createdAt,
      updatedAt: completedAt || createdAt,
      completedAt,
    })
  }
  
  for (const repair of repairs) {
    await prisma.repair.create({ data: repair as any })
  }
  
  console.log(`✓ ${repairs.length} repairs created`)
}

async function seedSales() {
  console.log('💰 Seeding sales...')
  
  const products = await prisma.product.findMany()
  const clients = await prisma.client.findMany()
  const users = await prisma.user.findMany({ where: { role: { in: ['SELLER', 'CASHIER', 'ADMIN'] } } })
  
  const sales = []
  const now = new Date()
  
  // Generate sales for the past 90 days
  for (let i = 0; i < 200; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const saleDate = new Date(now)
    saleDate.setDate(saleDate.getDate() - daysAgo)
    
    const numItems = Math.floor(Math.random() * 5) + 1
    const saleItems = []
    let subtotal = 0
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)]
      const quantity = Math.floor(Math.random() * 3) + 1
      const unitPrice = product.price
      const totalPrice = unitPrice * quantity
      
      saleItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
      })
      
      subtotal += totalPrice
    }
    
    const tax = subtotal * 0.1
    const discount = Math.random() > 0.7 ? Math.floor(subtotal * 0.1) : 0
    const total = subtotal + tax - discount
    
    const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT']
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
    
    const client = Math.random() > 0.3 ? clients[Math.floor(Math.random() * clients.length)] : null
    const user = users[Math.floor(Math.random() * users.length)]
    
    const sale = {
      invoiceNumber: `INV-${Date.now()}-${i}`,
      clientId: client?.id || null,
      userId: user.id,
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      status: 'COMPLETED',
      notes: Math.random() > 0.8 ? 'Customer requested gift wrapping' : null,
      createdAt: saleDate,
      updatedAt: saleDate,
      items: {
        create: saleItems,
      },
    }
    
    sales.push(sale)
  }
  
  for (const sale of sales) {
    await prisma.sale.create({ data: sale as any })
  }
  
  console.log(`✓ ${sales.length} sales created`)
}

async function seedPurchases() {
  console.log('📦 Seeding purchases...')
  
  const products = await prisma.product.findMany()
  const suppliers = await prisma.supplier.findMany()
  const users = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'ADMIN'] } } })
  
  const purchases = []
  const now = new Date()
  
  // Generate purchases for the past 90 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const purchaseDate = new Date(now)
    purchaseDate.setDate(purchaseDate.getDate() - daysAgo)
    
    const numItems = Math.floor(Math.random() * 5) + 1
    const purchaseItems = []
    let subtotal = 0
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)]
      const quantity = Math.floor(Math.random() * 20) + 5
      const unitPrice = product.costPrice || product.price * 0.6
      const totalPrice = unitPrice * quantity
      
      purchaseItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
      })
      
      subtotal += totalPrice
    }
    
    const tax = subtotal * 0.08
    const total = subtotal + tax
    
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    
    const statuses = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    const purchase = {
      orderNumber: `PO-${Date.now()}-${i}`,
      supplierId: supplier.id,
      userId: user.id,
      subtotal,
      tax,
      total,
      status,
      notes: Math.random() > 0.8 ? 'Urgent order - low stock' : null,
      orderDate: purchaseDate,
      expectedDate: new Date(purchaseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      receivedDate: status === 'RECEIVED' ? new Date(purchaseDate.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
      items: {
        create: purchaseItems,
      },
    }
    
    purchases.push(purchase)
  }
  
  for (const purchase of purchases) {
    await prisma.purchase.create({ data: purchase as any })
  }
  
  console.log(`✓ ${purchases.length} purchases created`)
}

async function seedCashRegister() {
  console.log('💵 Seeding cash registers...')
  
  const users = await prisma.user.findMany()
  const now = new Date()
  
  // Create daily cash registers for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    const openingUser = users[Math.floor(Math.random() * users.length)]
    const openingBalance = 200 + Math.floor(Math.random() * 300)
    
    // Simulate sales and movements
    const salesTotal = Math.floor(Math.random() * 2000) + 500
    const expensesTotal = Math.floor(Math.random() * 200)
    const expectedBalance = openingBalance + salesTotal - expensesTotal
    
    // Create cash register
    const register = await prisma.cashRegister.create({
      data: {
        date,
        openingBalance,
        closingBalance: expectedBalance,
        expectedBalance,
        difference: 0,
        status: i === 0 ? 'OPEN' : 'CLOSED',
        notes: i === 0 ? 'Current day register' : null,
        openedById: openingUser.id,
        closedById: i === 0 ? null : users[Math.floor(Math.random() * users.length)].id,
        openedAt: new Date(date.setHours(8, 0, 0, 0)),
        closedAt: i === 0 ? null : new Date(date.setHours(20, 0, 0, 0)),
      },
    })
    
    // Add cash movements
    const movements = [
      { type: 'SALE', amount: salesTotal, description: 'Daily sales' },
      { type: 'EXPENSE', amount: -expensesTotal, description: 'Daily expenses' },
    ]
    
    for (const movement of movements) {
      if (movement.amount !== 0) {
        await prisma.cashMovement.create({
          data: {
            type: movement.type as any,
            amount: Math.abs(movement.amount),
            description: movement.description,
            registerId: register.id,
            userId: openingUser.id,
            createdAt: new Date(date),
          },
        })
      }
    }
  }
  
  console.log('✓ Cash registers and movements created')
}

async function seedActivityLogs() {
  console.log('📝 Seeding activity logs...')
  
  const users = await prisma.user.findMany()
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT']
  const modules = ['AUTH', 'USER', 'CLIENT', 'PRODUCT', 'INVENTORY', 'REPAIR', 'SALE', 'PURCHASE', 'CASH_REGISTER', 'REPORT', 'SETTING']
  
  const logs = []
  const now = new Date()
  
  for (let i = 0; i < 500; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const timestamp = new Date(now)
    timestamp.setDate(timestamp.getDate() - daysAgo)
    
    const user = users[Math.floor(Math.random() * users.length)]
    const action = actions[Math.floor(Math.random() * actions.length)]
    const module = modules[Math.floor(Math.random() * modules.length)]
    
    const descriptions: Record<string, string[]> = {
      CREATE: ['Created new record', 'Added item to inventory', 'Registered new customer', 'Created new order'],
      UPDATE: ['Updated record information', 'Modified product details', 'Changed customer data', 'Updated order status'],
      DELETE: ['Deleted record', 'Removed item from inventory', 'Cancelled order'],
      VIEW: ['Viewed record details', 'Checked inventory levels', 'Reviewed customer history'],
      LOGIN: ['User logged in', 'Session started'],
      LOGOUT: ['User logged out', 'Session ended'],
      EXPORT: ['Exported data to CSV', 'Generated report PDF'],
      PRINT: ['Printed invoice', 'Printed receipt', 'Printed report'],
    }
    
    const descList = descriptions[action] || ['Performed action']
    const description = `${descList[Math.floor(Math.random() * descList.length)]} in ${module}`
    
    logs.push({
      userId: user.id,
      action,
      module,
      description,
      ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: JSON.stringify({ module, action, timestamp }),
      createdAt: timestamp,
    })
  }
  
  for (const log of logs) {
    await prisma.activityLog.create({ data: log as any })
  }
  
  console.log(`✓ ${logs.length} activity logs created`)
}

async function seedNotifications() {
  console.log('🔔 Seeding notifications...')
  
  const users = await prisma.user.findMany()
  const types = ['info', 'success', 'warning', 'error']
  const titles = [
    { type: 'info', title: 'New Feature Available', message: 'Check out the new barcode scanner feature!' },
    { type: 'success', title: 'Daily Sales Target Met', message: 'Congratulations! You\'ve reached today\'s sales goal.' },
    { type: 'warning', title: 'Low Stock Alert', message: 'Product inventory is running low. Please reorder soon.' },
    { type: 'error', title: 'Payment Processing Failed', message: 'There was an error processing a customer payment.' },
    { type: 'info', title: 'New Repair Ticket', message: 'A new repair has been assigned to you.' },
    { type: 'success', title: 'Repair Completed', message: 'A repair has been marked as completed.' },
    { type: 'warning', title: 'Overdue Repair', message: 'A repair ticket is past its promised completion date.' },
    { type: 'info', title: 'Staff Meeting Reminder', message: 'Team meeting scheduled for tomorrow at 9 AM.' },
    { type: 'success', title: 'Customer Feedback', message: 'You received a 5-star review from a customer!' },
  ]
  
  const notifications = []
  const now = new Date()
  
  for (let i = 0; i < 300; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - daysAgo)
    
    const user = users[Math.floor(Math.random() * users.length)]
    const titleInfo = titles[Math.floor(Math.random() * titles.length)]
    
    notifications.push({
      userId: user.id,
      title: titleInfo.title,
      message: titleInfo.message,
      type: titleInfo.type,
      read: Math.random() > 0.3,
      data: JSON.stringify({ source: 'system', category: 'general' }),
      createdAt,
      updatedAt: createdAt,
    })
  }
  
  for (const notification of notifications) {
    await prisma.notification.create({ data: notification as any })
  }
  
  console.log(`✓ ${notifications.length} notifications created`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
