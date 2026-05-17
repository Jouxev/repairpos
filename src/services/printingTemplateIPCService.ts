import { PrintTemplate } from '@/types/printing'
import { 
  defaultThermalReceiptTemplate, 
  defaultA4InvoiceTemplate, 
  defaultRepairTicketTemplate, 
  defaultThermalLabelTemplate 
} from './printingTemplateService'

const STORAGE_KEY = 'printTemplates'

// Get the electron API from the window
declare global {
  interface Window {
    electronAPI?: {
      printingTemplate: {
        getAll: () => Promise<PrintTemplate[]>
        getById: (id: string) => Promise<PrintTemplate | null>
        getDefault: (type: string) => Promise<PrintTemplate | null>
        create: (template: PrintTemplate) => Promise<PrintTemplate>
        update: (id: string, template: Partial<PrintTemplate>) => Promise<PrintTemplate>
        delete: (id: string) => Promise<void>
        deleteAll: () => Promise<void>
        setDefault: (id: string, type: string) => Promise<void>
      }
    }
  }
}

// Check if we're in Electron with the printing template API
const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined &&
         window.electronAPI.printingTemplate !== undefined
}

// Local storage fallback for browser development
class LocalStorageService {
  private getStorage(): PrintTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error reading from storage:', e)
    }
    // Return default templates if nothing in storage
    return [
      { ...defaultThermalReceiptTemplate },
      { ...defaultA4InvoiceTemplate },
      { ...defaultRepairTicketTemplate },
      { ...defaultThermalLabelTemplate },
    ]
  }

  private saveStorage(templates: PrintTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    } catch (e) {
      console.error('Error saving to storage:', e)
    }
  }

  async getAllTemplates(): Promise<PrintTemplate[]> {
    return this.getStorage()
  }

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    const templates = this.getStorage()
    return templates.find(t => t.id === id) || null
  }

  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    const templates = this.getStorage()
    return templates.find(t => t.type === type && t.isDefault) || null
  }

  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    const templates = this.getStorage()
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
    }
    templates.push(newTemplate)
    this.saveStorage(templates)
    return newTemplate
  }

  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const templates = this.getStorage()
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error('Template not found')
    }
    templates[index] = { ...templates[index], ...template }
    this.saveStorage(templates)
    return templates[index]
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = this.getStorage()
    const filtered = templates.filter(t => t.id !== id)
    this.saveStorage(filtered)
  }

  async deleteAllTemplates(): Promise<void> {
    this.saveStorage([])
  }

  async setAsDefault(id: string, type: string): Promise<void> {
    const templates = this.getStorage()
    // Remove default from all templates of this type
    templates.forEach(t => {
      if (t.type === type) {
        t.isDefault = false
      }
    })
    // Set new default
    const template = templates.find(t => t.id === id)
    if (template) {
      template.isDefault = true
    }
    this.saveStorage(templates)
  }
}

// Create the appropriate service based on environment
const localStorageService = new LocalStorageService()

export const printingTemplateIPCService = {
  async getAllTemplates(): Promise<PrintTemplate[]> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.getAll()
    }
    // Fallback to localStorage for browser development
    return localStorageService.getAllTemplates()
  },

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.getById(id)
    }
    return localStorageService.getTemplateById(id)
  },

  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.getDefault(type)
    }
    return localStorageService.getDefaultTemplate(type)
  },

  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.create(template)
    }
    return localStorageService.createTemplate(template)
  },

  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.update(id, template)
    }
    return localStorageService.updateTemplate(id, template)
  },

  async deleteTemplate(id: string): Promise<void> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.delete(id)
    }
    return localStorageService.deleteTemplate(id)
  },

  async deleteAllTemplates(): Promise<void> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.deleteAll()
    }
    return localStorageService.deleteAllTemplates()
  },

  async setAsDefault(id: string, type: string): Promise<void> {
    if (isElectron()) {
      return window.electronAPI!.printingTemplate.setDefault(id, type)
    }
    return localStorageService.setAsDefault(id, type)
  },
}

export default printingTemplateIPCService
