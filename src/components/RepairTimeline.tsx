import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  User,
  Wrench,
  Package,
  MessageSquare,
  FileText,
  Phone,
  Mail,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'status_change' | 'note' | 'part_added' | 'customer_contact' | 'assignment' | 'diagnosis'
  title: string
  description: string
  timestamp: Date
  user?: {
    name: string
    role: string
    avatar?: string
  }
  metadata?: Record<string, any>
}

interface RepairTimelineProps {
  repairId: string
  className?: string
}

const eventIcons: Record<string, any> = {
  status_change: Clock,
  note: MessageSquare,
  part_added: Package,
  customer_contact: Phone,
  assignment: User,
  diagnosis: Wrench,
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  WAITING_PARTS: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
}

function generateMockTimeline(repairId: string): TimelineEvent[] {
  const now = new Date()
  const events: TimelineEvent[] = []
  
  // Ticket created (5 days ago)
  events.push({
    id: '1',
    type: 'status_change',
    title: 'Repair Ticket Created',
    description: 'Ticket #' + repairId + ' was created for screen replacement',
    timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    user: { name: 'Sarah Johnson', role: 'Sales Rep' },
    metadata: { oldStatus: null, newStatus: 'PENDING' }
  })
  
  // Initial diagnosis (5 days ago)
  events.push({
    id: '2',
    type: 'diagnosis',
    title: 'Initial Diagnosis',
    description: 'Screen has multiple cracks and touch responsiveness is affected. LCD appears to be damaged.',
    timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    user: { name: 'Mike Chen', role: 'Technician' }
  })
  
  // Assigned (4 days ago)
  events.push({
    id: '3',
    type: 'assignment',
    title: 'Repair Assigned',
    description: 'Repair assigned to Mike Chen',
    timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    user: { name: 'Manager', role: 'Manager' },
    metadata: { assignedTo: 'Mike Chen' }
  })
  
  // Status change to In Progress (4 days ago)
  events.push({
    id: '4',
    type: 'status_change',
    title: 'Status Changed',
    description: 'Status changed from PENDING to IN_PROGRESS',
    timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    user: { name: 'Mike Chen', role: 'Technician' },
    metadata: { oldStatus: 'PENDING', newStatus: 'IN_PROGRESS' }
  })
  
  // Note added (3 days ago)
  events.push({
    id: '5',
    type: 'note',
    title: 'Note Added',
    description: 'Customer called to check on status. Informed that we are waiting for OEM screen part.',
    timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    user: { name: 'Sarah Johnson', role: 'Sales Rep' }
  })
  
  // Waiting for parts (3 days ago)
  events.push({
    id: '6',
    type: 'status_change',
    title: 'Status Changed',
    description: 'Status changed from IN_PROGRESS to WAITING_PARTS',
    timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    user: { name: 'Mike Chen', role: 'Technician' },
    metadata: { oldStatus: 'IN_PROGRESS', newStatus: 'WAITING_PARTS' }
  })
  
  // Part ordered (2 days ago)
  events.push({
    id: '7',
    type: 'part_added',
    title: 'Part Ordered',
    description: 'OEM iPhone 14 Pro Max screen assembly ordered from TechParts Wholesale. Expected delivery tomorrow.',
    timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    user: { name: 'Manager', role: 'Manager' },
    metadata: { partName: 'iPhone 14 Pro Max OEM Screen', supplier: 'TechParts Wholesale', cost: 85.00 }
  })
  
  // Part received (1 day ago)
  events.push({
    id: '8',
    type: 'part_added',
    title: 'Part Received',
    description: 'iPhone 14 Pro Max screen assembly received and verified. Part in good condition, ready for installation.',
    timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    user: { name: 'Mike Chen', role: 'Technician' }
  })
  
  // Back in progress (1 day ago)
  events.push({
    id: '9',
    type: 'status_change',
    title: 'Status Changed',
    description: 'Status changed from WAITING_PARTS to IN_PROGRESS',
    timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    user: { name: 'Mike Chen', role: 'Technician' },
    metadata: { oldStatus: 'WAITING_PARTS', newStatus: 'IN_PROGRESS' }
  })
  
  // Customer contact (few hours ago)
  events.push({
    id: '10',
    type: 'customer_contact',
    title: 'Customer Contacted',
    description: 'Called customer to inform that repair is complete and device is ready for pickup. Customer will pick up tomorrow morning.',
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    user: { name: 'Sarah Johnson', role: 'Sales Rep' },
    metadata: { contactMethod: 'phone', customerResponse: 'Will pickup tomorrow' }
  })
  
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export default function RepairTimeline({ repairId, className = '' }: RepairTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, generate mock data
    const mockEvents = generateMockTimeline(repairId)
    setEvents(mockEvents)
    setIsLoading(false)
  }, [repairId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-20 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Repair Timeline
          <Badge variant="secondary" className="ml-2">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative pl-8">
            {/* Vertical timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

            {events.map((event, index) => {
              const Icon = eventIcons[event.type] || Circle
              const isLast = index === events.length - 1

              return (
                <div
                  key={event.id}
                  className={`relative pb-8 ${isLast ? '' : ''}`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-5 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                      event.type === 'status_change'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  {/* Event card */}
                  <div className="ml-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">
                            {event.title}
                          </h4>
                          {event.type === 'status_change' && (
                            <Badge
                              variant="outline"
                              className={`${
                                statusColors[
                                  event.metadata?.newStatus || ''
                                ] || 'bg-gray-500'
                              } text-white text-xs`}
                            >
                              {event.metadata?.newStatus}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(event.timestamp, 'MMM d, h:mm a')}
                      </time>
                    </div>

                    {/* User info */}
                    {event.user && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {event.user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {event.user.name} • {event.user.role}
                        </span>
                      </div>
                    )}

                    {/* Metadata for specific event types */}
                    {event.type === 'part_added' && event.metadata && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          <span className="font-medium">
                            {event.metadata.partName}
                          </span>
                        </div>
                        {event.metadata.supplier && (
                          <div className="text-muted-foreground mt-1">
                            Supplier: {event.metadata.supplier}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
