export interface Category {
  id: string
  name: string
  description?: string
  color: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface CreateCategoryData {
  name: string
  description?: string
  color?: string
  isActive?: boolean
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  color?: string
  isActive?: boolean
}

export interface CategoryFilters {
  search?: string
  isActive?: boolean
}


const electronAPI = window.electronAPI

class CategoryService {
  private static instance: CategoryService

  private constructor() {}

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService()
    }
    return CategoryService.instance
  }

  // Get all categories
  async getCategories(filters?: CategoryFilters): Promise<Category[]> {
    try {
      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'findMany',
        args: {
          where: this.buildFilters(filters),
          include: {
            _count: {
              select: {
                products: true
              }
            }
          },
          orderBy: {
            name: 'asc',
          },
        },
      })
      return result?.data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw new Error('Failed to fetch categories')
    }
  }

  // Get a single category by ID
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'findUnique',
        args: {
          where: { id },
          include: {
            _count: {
              select: {
                products: true
              }
            }
          }
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error fetching category:', error)
      throw new Error('Failed to fetch category')
    }
  }

  // Create a new category
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      // Check if category with same name already exists
      const existing = await electronAPI.db.query({
        model: 'category',
        operation: 'findFirst',
        args: {
          where: {
            name: {
              equals: data.name,
              mode: 'insensitive'
            }
          }
        }
      })

      if (existing?.data) {
        throw new Error('A category with this name already exists')
      }

      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'create',
        args: {
          data: {
            name: data.name,
            description: data.description,
            color: data.color || '#3b82f6',
            isActive: data.isActive ?? true,
          },
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  }

  // Update a category
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      // If name is being changed, check for duplicates
      if (data.name) {
        const existing = await electronAPI.db.query({
          model: 'category',
          operation: 'findFirst',
          args: {
            where: {
              name: {
                equals: data.name,
                mode: 'insensitive'
              },
              NOT: {
                id: id
              }
            }
          }
        })

        if (existing?.data) {
          throw new Error('A category with this name already exists')
        }
      }

      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'update',
        args: {
          where: { id },
          data,
        },
      })
      return result?.data
    } catch (error) {
      console.error('Error updating category:', error)
      throw error
    }
  }

  // Delete a category
  async deleteCategory(id: string): Promise<void> {
    try {
      // Check if category has products
      const category = await this.getCategoryById(id)
      if (category?._count?.products && category._count.products > 0) {
        throw new Error('Cannot delete category with existing products')
      }

      await electronAPI.db.query({
        model: 'category',
        operation: 'delete',
        args: {
          where: { id },
        },
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      throw error
    }
  }

  // Build Prisma where clause from filters
  private buildFilters(filters?: CategoryFilters): any {
    const where: any = {}

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    return where
  }
}

export const categoryService = CategoryService.getInstance()