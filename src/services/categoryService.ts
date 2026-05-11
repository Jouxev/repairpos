export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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
  async getCategories(filters?: { isActive?: boolean; search?: string }): Promise<Category[]> {
    try {
      const where: any = {}
      
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive
      }
      
      if (filters?.search) {
        where.name = { contains: filters.search, mode: 'insensitive' }
      }

      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'findMany',
        args: {
          where,
          orderBy: { name: 'asc' },
        },
      })
      return result || []
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
        args: { where: { id } },
      })
      return result
    } catch (error) {
      console.error('Error fetching category:', error)
      throw new Error('Failed to fetch category')
    }
  }

  // Create a new category
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
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
      return result
    } catch (error) {
      console.error('Error creating category:', error)
      throw new Error('Failed to create category')
    }
  }

  // Update a category
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      const result = await electronAPI.db.query({
        model: 'category',
        operation: 'update',
        args: {
          where: { id },
          data,
        },
      })
      return result
    } catch (error) {
      console.error('Error updating category:', error)
      throw new Error('Failed to update category')
    }
  }

  // Delete a category
  async deleteCategory(id: string): Promise<void> {
    try {
      await electronAPI.db.query({
        model: 'category',
        operation: 'delete',
        args: { where: { id } },
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      throw new Error('Failed to delete category')
    }
  }
}

export const categoryService = CategoryService.getInstance()
