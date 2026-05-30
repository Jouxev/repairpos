import { useCallback, useEffect, useMemo, useState } from 'react'
import { PrintHistoryRecord, PrintPreferences, PrintTemplate, PrinterRecord, SystemPrinterInfo, TemplateAssignment } from '@/types/printing'
import { printingManagementService } from './printingManagementService'

export function usePrintingManager() {
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [printers, setPrinters] = useState<PrinterRecord[]>([])
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([])
  const [history, setHistory] = useState<PrintHistoryRecord[]>([])
  const [preferences, setPreferences] = useState<PrintPreferences | null>(null)
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinterInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      await printingManagementService.bootstrapDefaults()
      const [nextTemplates, nextPrinters, nextAssignments, nextHistory, nextPreferences, nextSystemPrinters] = await Promise.all([
        printingManagementService.getTemplates(),
        printingManagementService.getPrinters(),
        printingManagementService.getAssignments(),
        printingManagementService.getHistory(),
        printingManagementService.getPreferences(),
        printingManagementService.listSystemPrinters(),
      ])

      setTemplates(nextTemplates)
      setPrinters(nextPrinters)
      setAssignments(nextAssignments)
      setHistory(nextHistory)
      setPreferences(nextPreferences)
      setSystemPrinters(nextSystemPrinters)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load printing settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const templateById = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.id, template])),
    [templates],
  )
  const printerById = useMemo(
    () => Object.fromEntries(printers.map((printer) => [printer.id, printer])),
    [printers],
  )

  return {
    templates,
    printers,
    assignments,
    history,
    preferences,
    systemPrinters,
    isLoading,
    error,
    refresh,
    templateById,
    printerById,
  }
}
