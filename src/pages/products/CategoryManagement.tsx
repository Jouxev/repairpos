import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RefreshCw, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { categoryService, Category } from '@/services/categoryService'

interface CategoryManagementProps {
  isOpen: boolean
  onClose: () => void
  onCategoriesUpdated?: () => void
}

const DEFAULT_CATEGORIES = [
  'Phone',
  'Screen Protector',
  'Cases',
  'Charger',
  'Headsets',
  'Bluetooths',
  'Phone Holder',
  'Phone Parts',
]

export default function CategoryManagement({
  isOpen,
  onClose,
  onCategoriesUpdated,
}: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await categoryService.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setIsLoading(true)
      await categoryService.createCategory({
        name: newCategoryName.trim(),
        isActive: true,
      })
      toast.success('Category created successfully')
      setNewCategoryName('')
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error: any) {
      toast.error('Failed to create category: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      setIsLoading(true)
      await categoryService.deleteCategory(id)
      toast.success('Category deleted successfully')
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error: any) {
      toast.error('Failed to delete category: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeedCategories = async () => {
    if (!confirm('This will add default categories if they don\'t exist. Continue?')) {
      return
    }

    try {
      setIsLoading(true)
      const existingCategories = await categoryService.getCategories()
      const existingNames = new Set(
        (Array.isArray(existingCategories) ? existingCategories : []).map((c) =>
          c.name.toLowerCase()
        )
      )

      let addedCount = 0
      for (const categoryName of DEFAULT_CATEGORIES) {
        if (!existingNames.has(categoryName.toLowerCase())) {
          await categoryService.createCategory({
            name: categoryName,
            isActive: true,
          })
          addedCount++
        }
      }

      toast.success(`Added ${addedCount} default categories`)
      await loadCategories()
      onCategoriesUpdated?.()
    } catch (error: any) {
      toast.error('Failed to seed categories: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Category Management
          </DialogTitle>
          <DialogDescription>
            Manage product categories for your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add New Category */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory()
                }
              }}
              disabled={isLoading}
            />
            <Button
              onClick={handleAddCategory}
              disabled={isLoading || !newCategoryName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Seed Default Categories */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedCategories}
            disabled={isLoading}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Seed Default Categories
          </Button>

          {/* Categories List */}
          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-2 space-y-1">
              {isLoading && categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No categories yet
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-md group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      />
                      <span className="font-medium">{category.name}</span>
                      {!category.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
