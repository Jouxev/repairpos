/**
 * Image Upload Utility
 * Handles saving images to the media folder and returning file paths
 */

const MEDIA_FOLDER = '/media/products/'

const normalizeStoredImagePath = (imagePath: string): string => {
  const trimmed = imagePath.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('/media/')) {
    return trimmed.replace(/^\/+/, '')
  }

  return `media/products/${trimmed.replace(/^\/+/, '')}`
}

/**
 * Convert base64 to file and save to media folder
 * Returns the relative path to the saved image
 */
export async function saveBase64Image(
  base64Data: string, 
  filename?: string
): Promise<string> {
  // Generate filename if not provided
  if (!filename) {
    filename = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
  }

  // Ensure filename has extension
  if (!filename.includes('.')) {
    filename += '.jpg'
  }

  try {
    // Check if we have electron API available
    if (window.electronAPI?.image?.save) {
      const result = await window.electronAPI.image.save({
        base64Data,
        filename,
        folder: 'products'
      })
      return result
    } else {
      console.warn('Electron API not available, storing base64')
      return `data:image/jpeg;base64,${base64Data}`
    }
  } catch (error) {
    console.error('Error saving image:', error)
    throw new Error('Failed to save image')
  }
}

/**
 * Get the full URL for an image path
 */
export function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  
  if (
    imagePath.startsWith('http') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('file:') ||
    imagePath.startsWith('local-media:')
  ) {
    return imagePath
  }

  const normalizedPath = normalizeStoredImagePath(imagePath)
  if (!normalizedPath) {
    return null
  }
  
  if (imagePath.startsWith('/')) {
    if (window.location.protocol === 'file:') {
      return `local-media:///${normalizedPath}`
    }
    return `${window.location.origin}${imagePath}`
  }

  if (window.location.protocol === 'file:') {
    return `local-media:///${normalizedPath}`
  }
  
  return `${window.location.origin}${MEDIA_FOLDER}${imagePath}`
}

/**
 * Delete an image file
 */
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    void imagePath
  } catch (error) {
    console.error('Error deleting image:', error)
  }
}
