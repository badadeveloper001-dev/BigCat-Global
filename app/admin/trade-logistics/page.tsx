import { AdminAuthGuard } from '@/components/admin-auth-guard'
import { LogisticsAdminDashboard } from '@/components/logistics-admin-dashboard'

export default function TradeLogisticsAdminPage() {
  return (
    <AdminAuthGuard>
      <LogisticsAdminDashboard bypassAccessCheck />
    </AdminAuthGuard>
  )
}
