import { PrismaClient, PrintTemplate as PrismaPrintTemplate } from '@prisma/client'
import { PrintTemplate, PrintField, TemplateType, TemplateStatus } from '@/types/printing'

const prisma = new PrismaClient()

// Convert Prisma model to app type
function toAppTemplate(prismaTemplate: PrismaPrintTemplate): PrintTemplate {
  return {
    id: prismaTemplate.id,
    name: prismaTemplate.name,
    description: prismaTemplate.description || undefined,
    type: prismaTemplate.type as TemplateType,
    status: prismaTemplate.status as TemplateStatus,
    isDefault: prismaTemplate.isDefault,
    paperSize: prismaTemplate.paperSize as PrintTemplate['paperSize'],
    orientation: prismaTemplate.orientation as 'portrait' | 'landscape',
    marginTop: prismaTemplate.marginTop,
    marginRight: prismaTemplate.marginRight,
    marginBottom: prismaTemplate.marginBottom,
    marginLeft: prismaTemplate.marginLeft,
    headerFields: JSON.parse(prismaTemplate.headerFields) as PrintField[],
    bodyFields: JSON.parse(prismaTemplate.bodyFields) as PrintField[],
    footerFields: JSON.parse(prismaTemplate.footerFields) as PrintField[],
    customCss: prismaTemplate.customCss || undefined,
    logoUrl: prismaTemplate.logoUrl || undefined,
    companyName: prismaTemplate.companyName || undefined,
    companyAddress: prismaTemplate.companyAddress || undefined,
    companyPhone: prismaTemplate.companyPhone || undefined,
    companyEmail: prismaTemplate.companyEmail || undefined,
    companyWebsite: prismaTemplate.companyWebsite || undefined,
    taxNumber: prismaTemplate.taxNumber || undefined,
    footerText: prismaTemplate.footerText || undefined,
    showLogo: prismaTemplate.showLogo,
    showHeader: prismaTemplate.showHeader,
    showFooter: prismaTemplate.showFooter,
    showDate: prismaTemplate.showDate,
    showTime: prismaTemplate.showTime,
    showPageNumber: prismaTemplate.showPageNumber,
    pageNumberFormat: prismaTemplate.pageNumberFormat as PrintTemplate['pageNumberFormat'],
  }
}

// Convert app type to Prisma model
function toPrismaTemplate(template: Partial<PrintTemplate>): Partial<PrismaPrintTemplate> {
  return {
    name: template.name,
    description: template.description,
    type: template.type,
    status: template.status,
    isDefault: template.isDefault,
    paperSize: template.paperSize,
    orientation: template.orientation,
    marginTop: template.marginTop,
    marginRight: template.marginRight,
    marginBottom: template.marginBottom,
    marginLeft: template.marginLeft,
    headerFields: JSON.stringify(template.headerFields || []),
    bodyFields: JSON.stringify(template.bodyFields || []),
    footerFields: JSON.stringify(template.footerFields || []),
    customCss: template.customCss,
    logoUrl: template.logoUrl,
    companyName: template.companyName,
    companyAddress: template.companyAddress,
    companyPhone: template.companyPhone,
    companyEmail: template.companyEmail,
    companyWebsite: template.companyWebsite,
    taxNumber: template.taxNumber,
    footerText: template.footerText,
    showLogo: template.showLogo,
    showHeader: template.showHeader,
    showFooter: template.showFooter,
    showDate: template.showDate,
    showTime: template.showTime,
    showPageNumber: template.showPageNumber,
    pageNumberFormat: template.pageNumberFormat,
  }
}

export const printingTemplateDBService = {
  // Get all templates
  async getAllTemplates(): Promise<PrintTemplate[]> {
    const templates = await prisma.printTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return templates.map(toAppTemplate)
  },

  // Get template by ID
  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    const template = await prisma.printTemplate.findUnique({
      where: { id },
    })
    return template ? toAppTemplate(template) : null
  },

  // Get default template by type
  async getDefaultTemplate(type: string): Promise<PrintTemplate | null> {
    const template = await prisma.printTemplate.findFirst({
      where: { type, isDefault: true },
    })
    return template ? toAppTemplate(template) : null
  },

  // Create template
  async createTemplate(template: PrintTemplate): Promise<PrintTemplate> {
    const created = await prisma.printTemplate.create({
      data: toPrismaTemplate(template) as PrismaPrintTemplate,
    })
    return toAppTemplate(created)
  },

  // Update template
  async updateTemplate(id: string, template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const updated = await prisma.printTemplate.update({
      where: { id },
      data: toPrismaTemplate(template),
    })
    return toAppTemplate(updated)
  },

  // Delete template
  async deleteTemplate(id: string): Promise<void> {
    await prisma.printTemplate.delete({
      where: { id },
    })
  },

  // Delete all templates (for reset)
  async deleteAllTemplates(): Promise<void> {
    await prisma.printTemplate.deleteMany({})
  },

  // Set template as default
  async setAsDefault(id: string, type: string): Promise<void> {
    // First, unset any existing default for this type
    await prisma.printTemplate.updateMany({
      where: { type, isDefault: true },
      data: { isDefault: false },
    })
    // Then set this one as default
    await prisma.printTemplate.update({
      where: { id },
      data: { isDefault: true },
    })
  },
}

export default printingTemplateDBService
