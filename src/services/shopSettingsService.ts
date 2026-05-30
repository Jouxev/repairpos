export interface ShopSettings {
  id: string
  shopName: string
  shopAddress?: string | null
  shopPhone?: string | null
  shopEmail?: string | null
  shopLogo?: string | null
  currency: string
  currencySymbol: string
  taxRate: number
  language: string
  timezone: string
  receiptFooter?: string | null
  thermalPrinterWidth: number
  createdAt: Date
  updatedAt: Date
}

export interface UpdateShopSettingsData {
  shopName?: string
  shopAddress?: string
  shopPhone?: string
  shopEmail?: string
  shopLogo?: string
  currency?: string
  currencySymbol?: string
  taxRate?: number
  language?: string
  timezone?: string
  receiptFooter?: string
  thermalPrinterWidth?: number
}

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.db) {
    return window.electronAPI
  }
  throw new Error('Electron API not available')
}

const dbQuery = async (params: { model: string; operation: string; args?: any }) => {
  const api = getElectronAPI()
  return api.db!.query(params)
}

class ShopSettingsService {
  private static instance: ShopSettingsService
  private cachedSettings: ShopSettings | null = null

  private constructor() {}

  static getInstance(): ShopSettingsService {
    if (!ShopSettingsService.instance) {
      ShopSettingsService.instance = new ShopSettingsService()
    }
    return ShopSettingsService.instance
  }

  // Get shop settings (returns first record or creates default)
  async getSettings(): Promise<ShopSettings> {
    try {
      // Return cached settings if available
      if (this.cachedSettings) {
        return this.cachedSettings
      }

      // Try to get existing settings
      const result = await dbQuery({
        model: 'shopSettings',
        operation: 'findFirst',
        args: {}
      })

      if (result?.data) {
        this.cachedSettings = result.data as ShopSettings
        return this.cachedSettings
      }

      // Create default settings if none exist
      const defaultSettings = await this.createDefaultSettings()
      this.cachedSettings = defaultSettings
      return defaultSettings
    } catch (error) {
      console.error('Error getting shop settings:', error)
      // Return default settings on error
      return this.getDefaultSettings()
    }
  }

  // Create default settings
  private async createDefaultSettings(): Promise<ShopSettings> {
    const defaultData = {
      shopName: 'RepairPro Shop',
      shopAddress: '',
      shopPhone: '',
      shopEmail: '',
      shopLogo: '',
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 0,
      language: 'en',
      timezone: 'UTC',
      receiptFooter: 'Thank you for your business!',
      thermalPrinterWidth: 80
    }

    try {
      const result = await dbQuery({
        model: 'shopSettings',
        operation: 'create',
        args: {
          data: defaultData
        }
      })

      if (result?.data) {
        return result.data as ShopSettings
      }
    } catch (error) {
      console.error('Error creating default settings:', error)
    }

    return this.getDefaultSettings()
  }

  // Get default settings object (not from DB)
  private getDefaultSettings(): ShopSettings {
    return {
      id: 'default',
      shopName: 'RepairPro Shop',
      shopAddress: '',
      shopPhone: '',
      shopEmail: '',
      shopLogo: '',
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 0,
      language: 'en',
      timezone: 'UTC',
      receiptFooter: 'Thank you for your business!',
      thermalPrinterWidth: 80,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Update shop settings
  async updateSettings(data: UpdateShopSettingsData): Promise<ShopSettings> {
    try {
      // Get current settings
      const current = await this.getSettings()

      // Update in database
      const result = await dbQuery({
        model: 'shopSettings',
        operation: 'update',
        args: {
          where: { id: current.id },
          data
        }
      })

      if (result?.data) {
        // Clear cache to force refresh
        this.cachedSettings = null
        return result.data as ShopSettings
      }

      throw new Error('Failed to update settings')
    } catch (error) {
      console.error('Error updating shop settings:', error)
      throw error
    }
  }

  // Clear cached settings (call after updates)
  clearCache(): void {
    this.cachedSettings = null
  }
}

export const shopSettingsService = ShopSettingsService.getInstance()
