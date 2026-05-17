import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PrismaClient, PrintTemplate as PrismaPrintTemplate } from '@prisma/client'
import { PrintTemplate } from '@/types/printing'

const prisma = new PrismaClient()

// Convert Prisma model to app type
function toAppTemplate(prismaTemplate: PrismaPrintTemplate): PrintTemplate {
  return {
    id: prismaTemplate.id,
    name: prismaTemplate.name,
    description: prismaTemplate.description || undefined,
    type: prismaTemplate.type as any,
    status: prismaTemplate.status as any,
    isDefault: prismaTemplate.isDefault,
    paperSize: prismaTemplate.paperSize,
    orientation: prismaTemplate.orientation as any,
    marginTop: prismaTemplate.marginTop,
    marginRight: prismaTemplate.marginRight,
    marginBottom: prismaTemplate.marginBottom,
    marginLeft: prismaTemplate.marginLeft,
    headerFields: JSON.parse(prismaTemplate.headerFields),
    bodyFields: JSON.parse(prismaTemplate.bodyFields),
    footerFields: JSON.parse(prismaTemplate.footerFields),
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
    pageNumberFormat: prismaTemplate.pageNumberFormat,
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

export function registerPrintingTemplateIPC() {
  // Get all templates
  ipcMain.handle('printing-template:getAll', async () => {
    try {
      const templates = await prisma.printTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return templates.map(toAppTemplate)
    } catch (error) {
      console.error('Error getting all templates:', error)
      throw error
    }
  })

  // Get template by ID
  ipcMain.handle('printing-template:getById', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const template = await prisma.printTemplate.findUnique({
        where: { id },
      })
      return template ? toAppTemplate(template) : null
    } catch (error) {
      console.error('Error getting template by ID:', error)
      throw error
    }
  })

  // Get default template by type
  ipcMain.handle('printing-template:getDefault', async (_event: IpcMainInvokeEvent, type: string) => {
    try {
      const template = await prisma.printTemplate.findFirst({
        where: { type, isDefault: true },
      })
      return template ? toAppTemplate(template) : null
    } catch (error) {
      console.error('Error getting default template:', error)
      throw error
    }
  })

  // Create template
  ipcMain.handle('printing-template:create', async (_event: IpcMainInvokeEvent, template: PrintTemplate) => {
    try {
      const created = await prisma.printTemplate.create({
        data: toPrismaTemplate(template) as PrismaPrintTemplate,
      })
      return toAppTemplate(created)
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  })

  // Update template
  ipcMain.handle('printing-template:update', async (_event: IpcMainInvokeEvent, { id, template }: { id: string, template: Partial<PrintTemplate> }) => {
    try {
      const updated = await prisma.printTemplate.update({
        where: { id },
        data: toPrismaTemplate(template),
      })
      return toAppTemplate(updated)
    } catch (error) {
      console.error('Error updating template:', error)
      throw error
    }
  })

  // Delete template
  ipcMain.handle('printing-template:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      await prisma.printTemplate.delete({
        where: { id },
      })
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  })

  // Delete all templates
  ipcMain.handle('printing-template:deleteAll', async () => {
    try {
      await prisma.printTemplate.deleteMany({})
      return true
    } catch (error) {
      console.error('Error deleting all templates:', error)
      throw error
    }
  })

  // Set template as default
  ipcMain.handle('printing-template:setDefault', async (_event: IpcMainInvokeEvent, { id, type }: { id: string, type: string }) => {
    try {
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
      return true
    } catch (error) {
      console.error('Error setting default template:', error)
      throw error
    }
  })
}

export default registerPrintingTemplateIPC