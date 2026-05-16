/**
 * Image Upload Utility
 * Handles saving images to the media folder and returning file paths
 */

const MEDIA_FOLDER = '/media/products/'

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
    if (window.electronAPI?.saveImage) {
      // Use electron to save to filesystem
      const result = await window.electronAPI.saveImage({
        base64Data,
        filename,
        folder: 'products'
      })
      return result // Returns the full path or URL
    } else {
      // Fallback: Save to localStorage or return base64
      // In production, you'd want to upload to a server here
      console.warn('Electron API not available, storing base64')
      return base64Data
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
  
  // If it's already a full URL or base64, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath
  }
  
  // If it's a relative path starting with /, add the origin
  if (imagePath.startsWith('/')) {
    return `${window.location.origin}${imagePath}`
  }
  
  // Otherwise, assume it's a relative path and prepend the media folder
  return `${window.location.origin}${MEDIA_FOLDER}${imagePath}`
}

/**
 * Delete an image file
 */
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    if (window.electronAPI?.deleteImage) {
      await window.electronAPI.deleteImage(imagePath)
    }
  } catch (error) {
    console.error('Error deleting image:', error)
  }
}

// Extend the Window interface to include our custom API
declare global {
  interface Window {
    electronAPI?: {
      saveImage: (data: { base64Data: string; filename: string; folder: string }) => Promise<string>
      deleteImage?: (path: string) => Promise<void>
    }
  }
}