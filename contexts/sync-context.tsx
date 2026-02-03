"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"

interface SyncContextType {
  syncId: string
  setSyncId: (id: string) => void
  isSyncing: boolean
  syncError: string | null
  lastSynced: Date | null
  syncLookupData: (data: any[]) => Promise<void>
  syncRampStatus: (status: Record<number, any>) => Promise<void>
  isFirebaseAvailable: boolean
  isInitializing: boolean
}

// Default values for the context
const defaultContextValue: SyncContextType = {
  syncId: "",
  setSyncId: () => {},
  isSyncing: false,
  syncError: null,
  lastSynced: null,
  syncLookupData: async () => {},
  syncRampStatus: async () => {},
  isFirebaseAvailable: false,
  isInitializing: true,
}

const SyncContext = createContext<SyncContextType>(defaultContextValue)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // Use ref to track initialization state
  const isInitialized = useRef(false)

  // State declarations
  const [syncId, setSyncId] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [isFirebaseAvailable] = useState<boolean>(false) // Always false since we're using local storage only
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  // Initialize sync ID - using useEffect to avoid state updates during render
  useEffect(() => {
    // Skip if already initialized
    if (isInitialized.current) return

    // Mark as initialized to prevent duplicate initialization
    isInitialized.current = true

    // Get saved sync ID
    const savedSyncId = localStorage.getItem("warehouseSyncId")
    if (savedSyncId) {
      setSyncId(savedSyncId)
    } else {
      // Generate a random ID if none exists
      const newSyncId = Math.random().toString(36).substring(2, 15)
      localStorage.setItem("warehouseSyncId", newSyncId)
      setSyncId(newSyncId)
    }

    // Set Firebase as unavailable
    setSyncError("Firebase disabled. Using local storage only.")
    console.warn("Firebase is disabled. The app will use local storage only.")

    // Mark initialization as complete
    setIsInitializing(false)
  }, [])

  // Function to sync lookup data (local storage only)
  const syncLookupData = useCallback(
    async (data: any[]) => {
      if (!syncId) return

      setIsSyncing(true)
      setSyncError(null)

      try {
        // Save to localStorage
        localStorage.setItem("truckTrailerLookup", JSON.stringify(data))

        // Update last synced timestamp
        const now = new Date()
        setLastSynced(now)
        localStorage.setItem("lookupLastUpdated", now.toISOString())
      } catch (error) {
        console.error("Error saving lookup data:", error)
        setSyncError("Failed to save data to local storage.")
      } finally {
        setIsSyncing(false)
      }
    },
    [syncId],
  )

  // Function to sync ramp status (local storage only)
  const syncRampStatus = useCallback(
    async (status: Record<number, any>) => {
      if (!syncId) return

      setIsSyncing(true)
      setSyncError(null)

      try {
        // Save to localStorage
        localStorage.setItem("warehouseRampStatus", JSON.stringify(status))

        // Update last synced timestamp
        const now = new Date()
        setLastSynced(now)
        localStorage.setItem("rampStatusLastUpdated", now.toISOString())
      } catch (error) {
        console.error("Error saving ramp status:", error)
        setSyncError("Failed to save data to local storage.")
      } finally {
        setIsSyncing(false)
      }
    },
    [syncId],
  )

  return (
    <SyncContext.Provider
      value={{
        syncId,
        setSyncId,
        isSyncing,
        syncError,
        lastSynced,
        syncLookupData,
        syncRampStatus,
        isFirebaseAvailable,
        isInitializing,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider")
  }
  return context
}
