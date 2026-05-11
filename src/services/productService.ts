export interface Product {
  id: string
  name: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  category?: {
    id: string
    name: string
  }
  unit?: string
  quantity: number
  minQuantity?: number
  price: number
  cost?: number
  sellingPrice?: number
  isActive: boolean
  location?: string
  weight?: number
  dimensions?: string
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
  unit?: string
  quantity?: number
  minQuantity?: number
  price: number
  cost?: number
  sellingPrice?: number
  isActive?: boolean
  location?: string
  weight?: number
  dimensions?: string
  image?: string
}

export interface UpdateProductData {
  name?: string
  sku?: string
  barcode?: string
  description?: string
  categoryId?: string
  unit?: string
  quantity?: number
  minQuantity?: number
  price?: number
  cost?: number
  sellingPrice?: number
  isActive?: boolean
  location?: string
  weight?: number
  dimensions?: string
  image?: string
}

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
  barcode?: string
}

// Access the electronAPI exposed by preload script
declare global {
  interface Window {
    electronAPI: {
      db: {
        query: (params: { model: string; operation: string; args?: any }) => Promise<any>
      }
    }
  }
}

const electronAPI = window.electronAPI

class ProductService {
  private static instance: ProductService

  private constructor() {}

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
          },
          orderBy: {
            name: 'asc',
          },
        },
      })
      return result?.data || []
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
          },
        },
      })
      return result?.data || null
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
          },
        },
      })
      return result
    } catch (error) {
      console.error('Error fetching product by barcode:', error)
      throw new Error('Failed to fetch product by barcode')
    }
  }

  // Create a new product
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      // Build the create data object dynamically
      const createData: any = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        unit: data.unit,
        quantity: data.quantity || 0,
        minQuantity: data.minQuantity || 0,
        price: data.price,
        costPrice: data.cost,
        salePrice: data.sellingPrice,
        isActive: data.isActive ?? true,
        location: data.location,
        weight: data.weight,
        dimensions: data.dimensions,
        image: data.image,
      }

      // Use Prisma's connect syntax for category relation
      if (data.categoryId) {
        createData.category = {
          connect: { id: data.categoryId }
        }
      }

      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'create',
        args: {
          data: createData,
          include: {
            category: true,
          },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error creating product:', error)
      throw new Error('Failed to create product')
    }
  }

  // Update a product
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    try {
      // Build update data dynamically
      const updateData: any = {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        unit: data.unit,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        price: data.price,
        costPrice: data.cost,
        salePrice: data.sellingPrice,
        isActive: data.isActive,
        location: data.location,
        weight: data.weight,
        dimensions: data.dimensions,
        image: data.image,
      }

      // Use Prisma's connect/disconnect syntax for category
      if (data.categoryId !== undefined) {
        if (data.categoryId === null || data.categoryId === '') {
          // Disconnect category
          updateData.category = { disconnect: true }
        } else {
          // Connect new category
          updateData.category = { connect: { id: data.categoryId } }
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
          },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error updating product:', error)
      throw new Error('Failed to update product')
    }
  }

  // Delete a product
  async deleteProduct(id: string): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'product',
        operation: 'delete',
        args: {
          where: { id },
        },
      })
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error('Failed to delete product')
    }
  }

  // Update product quantity (for inventory adjustments)
  async updateQuantity(id: string, quantity: number): Promise<Product> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'update',
        args: {
          where: { id },
          data: { quantity },
          include: {
            category: true,
          },
        },
      })
      return result
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
    const newQuantity = product.quantity + adjustment
    return this.updateQuantity(id, newQuantity)
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'product',
        operation: 'findMany',
        args: {
          where: {
            isActive: true,
            minQuantity: {
              gt: 0,
            },
            quantity: {
              lte: { minQuantity: true },
            },
          },
          include: {
            category: true,
          },
          orderBy: {
            quantity: 'asc',
          },
        },
      })
      return result || []
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
        (sum, p) => sum + p.quantity * (p.cost || p.price || 0),
        0
      )
      const lowStock = products.filter(
        (p) => p.isActive && p.minQuantity && p.quantity <= p.minQuantity
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
