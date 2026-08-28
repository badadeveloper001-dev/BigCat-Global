import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { BigcatAdminDashboard } from "@/components/bigcat-admin-dashboard"

export default function BigcatAdminPage() {
  return (
    <AdminAuthGuard>
      <BigcatAdminDashboard bypassAccessCheck />
    </AdminAuthGuard>
  )
}
