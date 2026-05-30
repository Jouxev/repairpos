export interface Product {
  id: string
  name: string
  sku?: string
  unit?: string
  barcode?: string
  description?: string
  categoryId?: string
  category?: {
    id: string
    name: string
  }
  supplierId?: string
  supplier?: {
    id: string
    name: string
  }
  quantity: number
  minStockAlert?: number
  costPrice?: number
  price?: number
  sellingPrice?: number
  salePrice?: number
  salePrice2?: number
  salePrice3?: number
  isActive: boolean
  location?: string
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateProductData {
  name: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  supplierId?: string
  quantity?: number
  minStockAlert?: number
  costPrice?: number
  salePrice?: number
  salePrice2?: number
  salePrice3?: number
  isActive?: boolean
  location?: string
  image?: string
}

export interface UpdateProductData {
  name?: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  supplierId?: string
  quantity?: number
  minStockAlert?: number
  costPrice?: number
  salePrice?: number
  salePrice2?: number
  salePrice3?: number
  isActive?: boolean
  location?: string
  image?: string
}

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
  barcode?: string
}



const electronAPI = window.electronAPI

class ProductService {
  private static instance: ProductService

  private constructor() {}

  private unwrapResult<T>(result: any, fallback: T): T {
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        throw new Error(result.error || 'Database operation failed')
      }
      return (result.data ?? fallback) as T
    }

    return (result ?? fallback) as T
  }

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService()
    }
    return ProductService.instance
  }

  // Get all products
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'findMany',
        args: {
          where: this.buildFilters(filters),
          include: {
            category: true,
            supplier: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      })
      const products = this.unwrapResult<Product[] | null>(result, [])
      return Array.isArray(products) ? products : []
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Failed to fetch products')
    }
  }

  // Get a single product by ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            category: true,
            supplier: true,
          },
        },
      })
      return this.unwrapResult<Product | null>(result, null)
    } catch (error) {
      console.error('Error fetching product:', error)
      throw new Error('Failed to fetch product')
    }
  }

  // Get product by barcode
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'findFirst',
        args: {
          where: { barcode },
          include: {
            category: true,
            supplier: true,
          },
        },
      })
      return this.unwrapResult<Product | null>(result, null)
    } catch (error) {
      console.error('Error fetching product by barcode:', error)
      throw new Error('Failed to fetch product by barcode')
    }
  }

  // Create a new product
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      // Build the create data object - match Prisma schema exactly
      const createData: any = {
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        description: data.description || null,
        quantity: data.quantity ?? 0,
        minStockAlert: data.minStockAlert ?? 5,
        costPrice: data.costPrice ?? 0,
        salePrice: data.salePrice ?? 0,
        salePrice2: data.salePrice2 ?? 0,
        salePrice3: data.salePrice3 ?? 0,
        isActive: data.isActive ?? true,
        location: data.location || null,
      
        image: data.image || null,
      }

      // Use Prisma's connect syntax for category relation
      if (data.categoryId) {
        createData.category = {
          connect: { id: data.categoryId }
        }
      }

      // Use Prisma's connect syntax for supplier relation
      if (data.supplierId) {
        createData.supplier = {
          connect: { id: data.supplierId }
        }
      }

      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'create',
        args: {
          data: createData,
          include: {
            category: true,
            supplier: true,
          },
        },
      })
      return this.unwrapResult<Product>(result, null as any)
    } catch (error) {
      console.error('Error creating product:', error)
      throw new Error('Failed to create product')
    }
  }

  // Update a product
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    try {
      // Build update data - match Prisma schema
      const updateData: any = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        quantity: data.quantity,
        minStockAlert: data.minStockAlert,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        salePrice2: data.salePrice2,
        salePrice3: data.salePrice3,
        isActive: data.isActive,
        location: data.location,
        image: data.image,
      }
     
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      // Use Prisma's connect/disconnect syntax for category
      if (data.categoryId !== undefined) {
        if (data.categoryId === null || data.categoryId === '') {
          updateData.category = { disconnect: true }
        } else {
          updateData.category = { connect: { id: data.categoryId } }
        }
      }

      // Use Prisma's connect/disconnect syntax for supplier
      if (data.supplierId !== undefined) {
        if (data.supplierId === null || data.supplierId === '') {
          updateData.supplier = { disconnect: true }
        } else {
          updateData.supplier = { connect: { id: data.supplierId } }
        }
      }
    
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'update',
        args: {
          where: { id },
          data: updateData,
          include: {
            category: true,
            supplier: true,
          },
        },
      })
      return this.unwrapResult<Product>(result, null as any)
    } catch (error) {
      console.error('Error updating product:', error)
      throw new Error('Failed to update product')
    }
  }

  // Delete a product
  async deleteProduct(id: string): Promise<void> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'delete',
        args: {
          where: { id },
        },
      })
      this.unwrapResult(result, null)
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('Failed to delete product')
    }
  }

  // Update product quantity (for inventory adjustments)
  async updateQuantity(id: string, newQuantity: number): Promise<Product> {
    try {
      // Ensure quantity is a valid integer
      const quantity = Math.max(0, Math.round(newQuantity))
      
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'update',
        args: {
          where: { id },
          data: { 
            quantity: quantity
          },
          include: {
            category: true,
            supplier: true,
          },
        },
      })
      return this.unwrapResult<Product>(result, null as any)
    } catch (error) {
      console.error('Error updating product quantity:', error)
      throw new Error('Failed to update product quantity')
    }
  }

  // Adjust product quantity (for stock movements)
  async adjustQuantity(id: string, adjustment: number): Promise<Product> {
    const product = await this.getProductById(id)
    if (!product) {
      throw new Error('Product not found')
    }
    
    const currentQuantity = Number((product as any).quantity ?? (product as any).data?.quantity ?? 0)
    const newQuantity = Math.max(0, currentQuantity + adjustment)
    
    return this.updateQuantity(id, newQuantity)
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const products = await this.getProducts()
      return products.filter(p => 
        p.isActive && 
        p.minStockAlert && 
        p.minStockAlert > 0 && 
        p.quantity <= p.minStockAlert
      )
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      throw new Error('Failed to fetch low stock products')
    }
  }

  // Get product statistics
  async getStatistics(): Promise<{
    totalProducts: number
    totalValue: number
    lowStockCount: number
    outOfStockCount: number
  }> {
    try {
      const products = await this.getProducts()
      const totalValue = products.reduce(
        (sum, p) => sum + p.quantity * (p.costPrice || 0),
        0
      )
      const lowStock = products.filter(
        (p) => p.isActive && p.minStockAlert && p.quantity <= p.minStockAlert
      )
      const outOfStock = products.filter((p) => p.isActive && p.quantity === 0)

      return {
        totalProducts: products.length,
        totalValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      }
    } catch (error) {
      console.error('Error fetching product statistics:', error)
      throw new Error('Failed to fetch product statistics')
    }
  }

  // Build Prisma where clause from filters
  private buildFilters(filters?: ProductFilters): any {
    const where: any = {}

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters?.barcode) {
      where.barcode = filters.barcode
    }

    return where
  }
}

export const productService = ProductService.getInstance()
