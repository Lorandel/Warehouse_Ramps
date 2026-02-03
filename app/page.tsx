import WarehouseVisualization from "@/components/warehouse-visualization"
import { LookupProvider } from "@/contexts/lookup-context"
import { SupabaseSyncProvider } from "@/contexts/supabase-sync-context"

export default function Home() {
  return (
    <main>
      <SupabaseSyncProvider>
        <LookupProvider>
          <WarehouseVisualization />
        </LookupProvider>
      </SupabaseSyncProvider>
    </main>
  )
}
