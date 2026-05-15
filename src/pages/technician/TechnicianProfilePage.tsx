import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { TechnicianProfile } from '@/components/technician/TechnicianProfile'
import { TechnicianEarningsHistory } from '@/components/technician/TechnicianEarningsHistory'
import { Loader2 } from 'lucide-react'

export default function TechnicianProfilePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading to ensure all data is ready
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to view your profile</p>
      </div>
    )
  }

  // Check if user is a technician
  const isTechnician = user.role === 'TECHNICIAN'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTechnician ? 'My Technician Profile' : 'Technician Profile'}
          </h1>
          <p className="text-muted-foreground">
            {isTechnician 
              ? 'View your balance, commission rate, and earnings history' 
              : 'View technician details, balance, and earnings'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile">Profile & Balance</TabsTrigger>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <TechnicianProfile 
            technicianId={user.id} 
            isAdmin={!isTechnician} 
          />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <TechnicianEarningsHistory 
            technicianId={user.id}
            isAdmin={!isTechnician}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
