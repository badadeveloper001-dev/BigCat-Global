import { AdminAuthGuard } from '@/components/admin-auth-guard'
import { PalmpayAdminDashboard } from '@/components/palmpay-admin-dashboard'

export default function OrchidAdminPage() {
  return (
    <AdminAuthGuard>
      <PalmpayAdminDashboard bypassAccessCheck />
    </AdminAuthGuard>
  )
}
