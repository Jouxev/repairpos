import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export type ExportEntity =
  | 'repairs'
  | 'products'
  | 'clients'
  | 'providers'
  | 'sales'
  | 'purchases'
  | 'cash_register'

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf'

export interface ExportPeriod {
  startDate: Date
  endDate: Date
}

type ExportRowValue = string | number | boolean
type ExportRow = Record<string, ExportRowValue>

const entityLabels: Record<ExportEntity, string> = {
  repairs: 'Repairs',
  products: 'Products',
  clients: 'Clients',
  providers: 'Providers',
  sales: 'Sales',
  purchases: 'Purchases',
  cash_register: 'Cash Register',
}

const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.db) {
    return window.electronAPI
  }

  throw new Error('Electron API not available')
}

const dbQuery = async (params: { model: string; operation: string; args?: any }) => {
  const api = getElectronAPI()
  return api.db.query(params)
}

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString()
}

const formatDateForFile = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toCsvValue = (value: ExportRowValue) => `"${String(value).replace(/"/g, '""')}"`

const buildPdf = (title: string, rows: ExportRow[], filename: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const columns = rows.length > 0 ? Object.keys(rows[0]) : ['Message']
  const printableRows = rows.length > 0 ? rows : [{ Message: 'No data available' }]
  const margin = 10
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usableWidth = pageWidth - margin * 2
  const columnWidth = usableWidth / columns.length

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(title, margin, 14)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, 20)

    let headerX = margin
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    columns.forEach((column) => {
      doc.rect(headerX, 24, columnWidth, 8)
      doc.text(doc.splitTextToSize(column, columnWidth - 2), headerX + 1, 29)
      headerX += columnWidth
    })
  }

  drawHeader()

  let cursorY = 32
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  printableRows.forEach((row) => {
    const wrappedCells = columns.map((column) =>
      doc.splitTextToSize(String(row[column] ?? ''), Math.max(10, columnWidth - 2)),
    )
    const rowHeight = Math.max(...wrappedCells.map((lines) => lines.length * 3.5 + 3), 8)

    if (cursorY + rowHeight > pageHeight - margin) {
      doc.addPage()
      drawHeader()
      cursorY = 32
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
    }

    let cellX = margin
    wrappedCells.forEach((lines) => {
      doc.rect(cellX, cursorY, columnWidth, rowHeight)
      doc.text(lines, cellX + 1, cursorY + 4)
      cellX += columnWidth
    })

    cursorY += rowHeight
  })

  doc.save(filename)
}

class DataExportService {
  private static instance: DataExportService

  static getInstance() {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService()
    }

    return DataExportService.instance
  }

  async exportEntity(entity: ExportEntity, format: ExportFormat, period: ExportPeriod) {
    const rows = await this.getRows(entity, period)
    const entityLabel = entityLabels[entity]
    const filenameBase = `${entity}-${formatDateForFile(period.startDate)}-${formatDateForFile(period.endDate)}`

    switch (format) {
      case 'json':
        downloadBlob(
          `${filenameBase}.json`,
          new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' }),
        )
        return
      case 'csv': {
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        const lines = headers.length > 0 ? [headers.map(toCsvValue).join(',')] : ['"Message"']
        if (rows.length > 0) {
          rows.forEach((row) => {
            lines.push(headers.map((header) => toCsvValue(row[header] ?? '')).join(','))
          })
        } else {
          lines.push('"No data available"')
        }
        downloadBlob(`${filenameBase}.csv`, new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
        return
      }
      case 'xlsx': {
        const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Message: 'No data available' }])
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, entityLabel)
        const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        downloadBlob(
          `${filenameBase}.xlsx`,
          new Blob([xlsxBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        )
        return
      }
      case 'pdf':
        buildPdf(`${entityLabel} Export`, rows, `${filenameBase}.pdf`)
        return
      default:
        throw new Error('Unsupported export format')
    }
  }

  private async getRows(entity: ExportEntity, period: ExportPeriod): Promise<ExportRow[]> {
    switch (entity) {
      case 'repairs':
        return this.getRepairRows(period)
      case 'products':
        return this.getProductRows()
      case 'clients':
        return this.getClientRows()
      case 'providers':
        return this.getProviderRows()
      case 'sales':
        return this.getSaleRows(period)
      case 'purchases':
        return this.getPurchaseRows(period)
      case 'cash_register':
        return this.getCashRegisterRows(period)
      default:
        return []
    }
  }

  private async getRepairRows(period: ExportPeriod): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'repair',
      operation: 'findMany',
      args: {
        where: {
          createdAt: {
            gte: period.startDate.toISOString(),
            lte: period.endDate.toISOString(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          client: true,
          technician: true,
        },
      },
    })

    return (result?.data || []).map((repair: any) => ({
      Ticket: repair.ticketNumber || '',
      Customer: repair.client?.fullName || '',
      Phone: repair.client?.phone || '',
      Device: [repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' '),
      Status: repair.status || '',
      Priority: repair.priority || '',
      RepairCost: repair.repairCost || 0,
      Prepayment: repair.prepayment || 0,
      DueAmount: repair.dueAmount || 0,
      Technician: repair.technician?.fullName || '',
      ReceivedAt: formatDateTime(repair.receivedAt || repair.createdAt),
      CompletedAt: formatDateTime(repair.completedAt),
    }))
  }

  private async getProductRows(): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'product',
      operation: 'findMany',
      args: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          category: true,
          supplier: true,
        },
      },
    })

    return (result?.data || []).map((product: any) => ({
      Name: product.name || '',
      SKU: product.sku || '',
      Barcode: product.barcode || '',
      Category: product.category?.name || '',
      Supplier: product.supplier?.name || '',
      CostPrice: product.costPrice || 0,
      SalePrice: product.salePrice || 0,
      Quantity: product.quantity || 0,
      MinStockAlert: product.minStockAlert || 0,
      Location: product.location || '',
      IsActive: Boolean(product.isActive),
      CreatedAt: formatDateTime(product.createdAt),
    }))
  }

  private async getClientRows(): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'client',
      operation: 'findMany',
      args: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    })

    return (result?.data || []).map((client: any) => ({
      FullName: client.fullName || '',
      Phone: client.phone || '',
      Email: client.email || '',
      Address: client.address || '',
      Balance: client.balance || 0,
      LoyaltyPoints: client.loyaltyPoints || 0,
      IsActive: Boolean(client.isActive),
      CreatedAt: formatDateTime(client.createdAt),
    }))
  }

  private async getProviderRows(): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'supplier',
      operation: 'findMany',
      args: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          purchases: {
            select: {
              total: true,
              paidAmount: true,
              dueAmount: true,
            },
          },
        },
      },
    })

    return (result?.data || []).map((supplier: any) => {
      const purchases = supplier.purchases || []
      const totalPurchases = purchases.reduce((sum: number, purchase: any) => sum + (purchase.total || 0), 0)
      const totalPaid = purchases.reduce((sum: number, purchase: any) => sum + (purchase.paidAmount || 0), 0)
      return {
        Name: supplier.name || '',
        Phone: supplier.phone || '',
        Email: supplier.email || '',
        Address: supplier.address || '',
        Balance: supplier.balance || 0,
        PurchaseCount: purchases.length,
        TotalPurchases: totalPurchases,
        TotalPaid: totalPaid,
        IsActive: Boolean(supplier.isActive),
        CreatedAt: formatDateTime(supplier.createdAt),
      }
    })
  }

  private async getSaleRows(period: ExportPeriod): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'sale',
      operation: 'findMany',
      args: {
        where: {
          saleDate: {
            gte: period.startDate.toISOString(),
            lte: period.endDate.toISOString(),
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
        include: {
          client: true,
          seller: true,
          items: true,
        },
      },
    })

    return (result?.data || []).map((sale: any) => ({
      Invoice: sale.invoiceNumber || '',
      Customer: sale.client?.fullName || 'Walk-in Customer',
      Seller: sale.seller?.fullName || '',
      Total: sale.total || 0,
      PaidAmount: sale.paidAmount || 0,
      DueAmount: sale.dueAmount || 0,
      PaymentMethod: sale.paymentMethod || '',
      PaymentStatus: sale.paymentStatus || '',
      ItemCount: (sale.items || []).length,
      SaleDate: formatDateTime(sale.saleDate),
      CreatedAt: formatDateTime(sale.createdAt),
    }))
  }

  private async getPurchaseRows(period: ExportPeriod): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'purchase',
      operation: 'findMany',
      args: {
        where: {
          orderedAt: {
            gte: period.startDate.toISOString(),
            lte: period.endDate.toISOString(),
          },
        },
        orderBy: {
          orderedAt: 'desc',
        },
        include: {
          supplier: true,
          items: true,
        },
      },
    })

    return (result?.data || []).map((purchase: any) => ({
      Invoice: purchase.invoiceNumber || '',
      Supplier: purchase.supplier?.name || '',
      Total: purchase.total || 0,
      PaidAmount: purchase.paidAmount || 0,
      DueAmount: purchase.dueAmount || 0,
      PaymentStatus: purchase.paymentStatus || '',
      Status: purchase.status || '',
      ItemCount: (purchase.items || []).length,
      OrderedAt: formatDateTime(purchase.orderedAt),
      ReceivedAt: formatDateTime(purchase.receivedAt),
    }))
  }

  private async getCashRegisterRows(period: ExportPeriod): Promise<ExportRow[]> {
    const result = await dbQuery({
      model: 'cashRegister',
      operation: 'findMany',
      args: {
        where: {
          openedAt: {
            gte: period.startDate.toISOString(),
            lte: period.endDate.toISOString(),
          },
        },
        orderBy: {
          openedAt: 'desc',
        },
        include: {
          openedBy: true,
          closedBy: true,
        },
      },
    })

    return (result?.data || []).map((register: any) => ({
      Status: register.status || '',
      OpeningAmount: register.openingAmount || 0,
      ClosingAmount: register.closingAmount || 0,
      CurrentBalance: register.currentBalance || 0,
      TotalSales: register.totalSales || 0,
      TotalRefunds: register.totalRefunds || 0,
      CashIn: register.cashIn || 0,
      CashOut: register.cashOut || 0,
      Difference: register.difference || 0,
      OpenedBy: register.openedBy?.fullName || '',
      ClosedBy: register.closedBy?.fullName || '',
      OpenedAt: formatDateTime(register.openedAt),
      ClosedAt: formatDateTime(register.closedAt),
    }))
  }
}

export const dataExportService = DataExportService.getInstance()
