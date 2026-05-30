import { PrintTemplate } from '@/types/printing'
import { printingTemplateService } from './printingTemplateService'

export const printingTemplateIPCService = {
  async getAllTemplates(): Promise<PrintTemplate[]> {
    return printingTemplateService.getAllTemplates()
  },

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    return printingTemplateService.getTemplateById(id)
  },

  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    return printingTemplateService.getDefaultTemplate(type)
  },

  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    return printingTemplateService.createTemplate(template)
  },

  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    return printingTemplateService.updateTemplate(id, template)
  },

  async deleteTemplate(id: string): Promise<void> {
    return printingTemplateService.deleteTemplate(id)
  },

  async deleteAllTemplates(): Promise<void> {
    return printingTemplateService.deleteAllTemplates()
  },

  async setAsDefault(id: string, type: string): Promise<void> {
    return printingTemplateService.setAsDefault(id, type)
  },
}

export default printingTemplateIPCService
