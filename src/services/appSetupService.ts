export interface SetupStatus {
  hasAdmin: boolean
  hasShopSettings: boolean
  needsOnboarding: boolean
}

export interface InitialSetupPayload {
  admin: {
    username: string
    email: string
    password: string
    fullName: string
    phone?: string
  }
  shop: {
    shopName: string
    shopAddress?: string
    shopPhone?: string
    shopEmail?: string
    shopLogo?: string
    currency?: string
    language?: string
  }
}

class AppSetupService {
  private static instance: AppSetupService

  static getInstance() {
    if (!AppSetupService.instance) {
      AppSetupService.instance = new AppSetupService()
    }

    return AppSetupService.instance
  }

  async getStatus(): Promise<SetupStatus> {
    const result = await window.electronAPI.setup.getStatus()

    if (!result.success) {
      throw new Error(result.error || 'Failed to get setup status')
    }

    return {
      hasAdmin: result.hasAdmin,
      hasShopSettings: result.hasShopSettings,
      needsOnboarding: result.needsOnboarding,
    }
  }

  async completeInitialSetup(payload: InitialSetupPayload): Promise<void> {
    const result = await window.electronAPI.setup.completeInitialSetup(payload)

    if (!result.success) {
      throw new Error(result.error || 'Failed to complete initial setup')
    }
  }
}

export const appSetupService = AppSetupService.getInstance()
