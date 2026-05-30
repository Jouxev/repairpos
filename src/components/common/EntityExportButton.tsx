import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { ExportEntity, ExportFormat, dataExportService } from '@/services/dataExportService'
import { useAppSettings } from '@/contexts/AppSettingsContext'

interface EntityExportButtonProps {
  entity: ExportEntity
  label?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
}

const allTimePeriod = {
  startDate: new Date('2000-01-01T00:00:00.000Z'),
  endDate: new Date(),
}

const entityLabels: Record<ExportEntity, string> = {
  repairs: 'Repairs',
  products: 'Products',
  clients: 'Clients',
  providers: 'Providers',
  sales: 'Sales',
  purchases: 'Purchases',
  cash_register: 'Cash Register',
}

export default function EntityExportButton({
  entity,
  label,
  size = 'sm',
  variant = 'outline',
}: EntityExportButtonProps) {
  const { t } = useAppSettings()
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(format)
      await dataExportService.exportEntity(entity, format, allTimePeriod)
      toast.success(t('exportedAs', { entity: entityLabels[entity], format: format.toUpperCase() }))
    } catch (error) {
      console.error('Failed to export entity:', error)
      toast.error(t('failedToExportData'))
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={!!isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? t('exportingFormat', { format: isExporting.toUpperCase() }) : (label || t('export'))}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')}>{t('exportJson')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>{t('exportCsv')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>{t('exportXlsx')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>{t('exportPdf')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
