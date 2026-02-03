"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseSync } from "./supabase-sync-context"
import { parseHtmlFile, type TruckTrailerMapping } from "@/utils/html-parser"

interface LookupContextType {
  lookupData: TruckTrailerMapping[]
  isLoading: boolean
  error: string | null
  uploadHtml: (file: File, mergeMode?: boolean) => Promise<void>
  clearData: () => void
  addTruckTrailerPair: (truck: string, trailer: string) => Promise<string>
  lookupTrailerByTruck: (truck: string) => string | null
  lookupTruckByTrailer: (trailer: string) => string | null
  lastUpdated: Date | null
  dataCount: number
  forceRefresh: () => Promise<void>
}

const defaultContextValue: LookupContextType = {
  lookupData: [],
  isLoading: false,
  error: null,
  uploadHtml: async () => {},
  clearData: () => {},
  addTruckTrailerPair: async () => "",
  lookupTrailerByTruck: () => null,
  lookupTruckByTrailer: () => null,
  lastUpdated: null,
  dataCount: 0,
  forceRefresh: async () => {},
}

const LookupContext = createContext<LookupContextType>(defaultContextValue)

export function LookupProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useRef(false)
  const lastUpdateTime = useRef<number>(0)
  const retryCount = useRef<number>(0)
  const maxRetries = 3
  const syncInProgress = useRef(false)

  const [lookupData, setLookupData] = useState<TruckTrailerMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Add a trigger state to force re-renders when data changes
  const [updateTrigger, setUpdateTrigger] = useState(0)

  const { syncLookupData, isSupabaseAvailable, connectionStatus } = useSupabaseSync()

  // Create optimized lookup maps - now depends on updateTrigger to ensure fresh maps
  const truckMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of lookupData) {
      if (item.truck) {
        map.set(item.truck, item.trailer || "")
      }
    }
    console.log(`🔍 Truck map updated with ${map.size} entries (trigger: ${updateTrigger})`)
    return map
  }, [lookupData, updateTrigger])

  const trailerMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of lookupData) {
      if (item.trailer) {
        map.set(item.trailer, item.truck || "")
        if (item.trailer.toLowerCase().startsWith("o-")) {
          const normalizedTrailer = item.trailer.substring(2)
          if (!map.has(normalizedTrailer)) {
            map.set(normalizedTrailer, item.truck || "")
          }
        }
      }
    }
    console.log(`🔍 Trailer map updated with ${map.size} entries (trigger: ${updateTrigger})`)
    return map
  }, [lookupData, updateTrigger])

  // Helper function to trigger updates and notify components
  const triggerLookupUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1)
    // Dispatch a custom event to notify warehouse components
    window.dispatchEvent(
      new CustomEvent("lookupDataChanged", {
        detail: {
          dataCount: lookupData.length,
          timestamp: new Date(),
        },
      }),
    )
    console.log(`🔄 Lookup update triggered (${lookupData.length} entries)`)
  }, [lookupData.length])

  // Smart merge function for HTML data
  const mergeHtmlData = useCallback(
    (existingData: TruckTrailerMapping[], newData: TruckTrailerMapping[]): TruckTrailerMapping[] => {
      console.log(`🔄 Starting smart merge: ${existingData.length} existing + ${newData.length} new entries`)

      // Create a map of trucks from the new HTML data
      const newTrucksMap = new Map<string, TruckTrailerMapping>()
      for (const item of newData) {
        if (item.truck) {
          newTrucksMap.set(item.truck, item)
        }
      }

      // Start with existing data, but filter out trucks that appear in new data
      const preservedData = existingData.filter((item) => {
        const shouldPreserve = !newTrucksMap.has(item.truck)
        if (!shouldPreserve) {
          console.log(`🔄 Updating truck ${item.truck}: ${item.trailer} → ${newTrucksMap.get(item.truck)?.trailer}`)
        }
        return shouldPreserve
      })

      // Add all new data
      const mergedData = [...preservedData, ...newData]

      // Re-assign row numbers and ensure data consistency
      const finalData = mergedData
        .filter((item) => item.truck && item.trailer) // Remove any invalid entries
        .map((item, index) => ({
          truck: item.truck.trim(),
          trailer: item.trailer.trim(),
          row: index + 1,
        }))

      console.log(
        `✅ Merge complete: ${preservedData.length} preserved + ${newData.length} new = ${finalData.length} total`,
      )

      // Log detailed changes
      const updatedTrucks = newData.filter((newItem) =>
        existingData.some((existingItem) => existingItem.truck === newItem.truck),
      )
      const addedTrucks = newData.filter(
        (newItem) => !existingData.some((existingItem) => existingItem.truck === newItem.truck),
      )

      if (updatedTrucks.length > 0) {
        console.log(`📝 Updated trucks: ${updatedTrucks.map((t) => t.truck).join(", ")}`)
      }
      if (addedTrucks.length > 0) {
        console.log(`➕ Added trucks: ${addedTrucks.map((t) => t.truck).join(", ")}`)
      }

      return finalData
    },
    [],
  )

  // ENHANCED: Safe data fetching with better error handling and consistency checks
  const fetchLookupDataSafely = useCallback(
    async (retryAttempt = 0): Promise<TruckTrailerMapping[] | null> => {
      try {
        // Check if Supabase is available and connected
        if (!isSupabaseAvailable || connectionStatus !== "connected") {
          console.log("Supabase not available or not connected, skipping fetch")
          return null
        }

        // Prevent concurrent fetches
        if (syncInProgress.current) {
          console.log("Sync already in progress, skipping fetch")
          return null
        }

        syncInProgress.current = true

        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        console.log(`🔍 Fetching lookup data from Supabase (attempt ${retryAttempt + 1})...`)

        const { data, error, count } = await supabase
          .from("lookup_data")
          .select("*", { count: "exact" })
          .order("row_number", { ascending: true })
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)
        syncInProgress.current = false

        if (error) {
          throw error
        }

        console.log(`📊 Supabase returned ${data?.length || 0} entries (count: ${count})`)

        if (data && data.length > 0) {
          // Clean and validate the data
          const mappings: TruckTrailerMapping[] = data
            .filter((row) => row.truck && row.trailer) // Only include valid entries
            .map((row, index) => ({
              truck: (row.truck || "").toString().trim(),
              trailer: (row.trailer || "").toString().trim(),
              row: row.row_number || index + 1,
            }))
            .filter((item) => item.truck && item.trailer) // Double-check after mapping

          console.log(`✅ Processed ${mappings.length} valid entries from Supabase`)
          return mappings
        }

        console.log("📭 No data found in Supabase")
        return []
      } catch (error) {
        syncInProgress.current = false
        console.error(`❌ Fetch attempt ${retryAttempt + 1} failed:`, error)

        // If it's an abort error, don't retry
        if (error.name === "AbortError") {
          console.log("⏰ Request was aborted due to timeout")
          return null
        }

        // If it's a network error and we haven't exceeded max retries, try again
        if (retryAttempt < maxRetries && (error.message?.includes("fetch") || error.message?.includes("network"))) {
          console.log(`🔄 Retrying fetch in ${(retryAttempt + 1) * 2000}ms...`)
          await new Promise((resolve) => setTimeout(resolve, (retryAttempt + 1) * 2000))
          return fetchLookupDataSafely(retryAttempt + 1)
        }

        throw error
      }
    },
    [isSupabaseAvailable, connectionStatus],
  )

  // ENHANCED: Force refresh function to manually sync data
  const forceRefresh = useCallback(async () => {
    console.log("🔄 Force refresh requested...")
    setIsLoading(true)
    setError(null)

    try {
      if (isSupabaseAvailable && connectionStatus === "connected") {
        const mappings = await fetchLookupDataSafely()

        if (mappings !== null) {
          console.log(`🔄 Force refresh: Setting ${mappings.length} entries`)
          setLookupData(mappings)
          setLastUpdated(new Date())

          // Update localStorage to match Supabase
          localStorage.setItem("truckTrailerLookup", JSON.stringify(mappings))
          localStorage.setItem("lookupLastUpdated", new Date().toISOString())

          // Trigger lookup maps update
          setTimeout(triggerLookupUpdate, 100)

          console.log(`✅ Force refresh complete: ${mappings.length} entries loaded`)
        } else {
          console.log("❌ Force refresh failed: No data received")
          setError("Failed to refresh data from server")
        }
      } else {
        console.log("❌ Force refresh failed: Supabase not available")
        setError("Cannot refresh: Database not connected")
      }
    } catch (error) {
      console.error("❌ Force refresh error:", error)
      setError(`Refresh failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isSupabaseAvailable, connectionStatus, fetchLookupDataSafely, triggerLookupUpdate])

  // ENHANCED: Load initial data with better consistency
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const loadInitialData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log("🚀 Loading initial lookup data...")

        if (isSupabaseAvailable && connectionStatus === "connected") {
          console.log("📡 Loading from Supabase...")
          const mappings = await fetchLookupDataSafely()

          if (mappings && mappings.length > 0) {
            console.log(`✅ Loaded ${mappings.length} entries from Supabase`)
            setLookupData(mappings)
            setLastUpdated(new Date())

            // Update localStorage to match Supabase exactly
            localStorage.setItem("truckTrailerLookup", JSON.stringify(mappings))
            localStorage.setItem("lookupLastUpdated", new Date().toISOString())

            // Trigger lookup maps update
            setTimeout(triggerLookupUpdate, 100)
          } else {
            console.log("📭 No data in Supabase, checking localStorage...")
            loadFromLocalStorage()
          }
        } else {
          console.log("💾 Loading from localStorage only...")
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error("❌ Error loading initial data:", error)
        setError(`Failed to load data: ${error.message}`)
        loadFromLocalStorage()
      } finally {
        setIsLoading(false)
      }
    }

    const loadFromLocalStorage = () => {
      try {
        const savedData = localStorage.getItem("truckTrailerLookup")
        const savedTimestamp = localStorage.getItem("lookupLastUpdated")

        if (savedData) {
          const parsedData = JSON.parse(savedData)
          console.log(`💾 Loaded ${parsedData.length} entries from localStorage`)
          setLookupData(parsedData)

          if (savedTimestamp) {
            setLastUpdated(new Date(savedTimestamp))
          }

          // Trigger lookup maps update
          setTimeout(triggerLookupUpdate, 100)
        } else {
          console.log("📭 No data in localStorage")
        }
      } catch (e) {
        console.error("❌ Failed to load saved lookup data", e)
        setError("Failed to load saved data")
      }
    }

    loadInitialData()
  }, [isSupabaseAvailable, connectionStatus, fetchLookupDataSafely, triggerLookupUpdate])

  // ENHANCED: Real-time updates with better debouncing and consistency
  useEffect(() => {
    if (!isSupabaseAvailable) return

    const handleLookupDataUpdate = async (event: CustomEvent) => {
      try {
        const { payload, timestamp } = event.detail

        // Debounce rapid updates more aggressively
        const updateTime = new Date(timestamp).getTime()
        if (updateTime - lastUpdateTime.current < 2000) {
          console.log("⏭️ Skipping rapid update (debounced)")
          return
        }
        lastUpdateTime.current = updateTime

        console.log(`📡 Real-time update received: ${payload.eventType}`)

        // Only reload data if Supabase is connected
        if (connectionStatus !== "connected") {
          console.log("❌ Supabase not connected, skipping real-time update")
          return
        }

        // Add a small delay to ensure database consistency
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Try to fetch updated data with retry logic
        const mappings = await fetchLookupDataSafely()

        if (mappings !== null) {
          console.log(`📡 Real-time update: Setting ${mappings.length} entries`)
          setLookupData(mappings)
          setLastUpdated(new Date())
          setError(null) // Clear any previous errors
          retryCount.current = 0 // Reset retry count on success

          // Update localStorage to match Supabase exactly
          localStorage.setItem("truckTrailerLookup", JSON.stringify(mappings))
          localStorage.setItem("lookupLastUpdated", new Date().toISOString())

          // Trigger lookup maps update
          setTimeout(triggerLookupUpdate, 100)

          console.log(`✅ Real-time update complete: ${mappings.length} entries`)
        } else {
          console.log("❌ Real-time update failed: No data received")
        }
      } catch (error) {
        console.error("❌ Error handling real-time update:", error)
        retryCount.current++

        // If we've failed too many times, stop trying real-time updates
        if (retryCount.current >= maxRetries) {
          setError(`Real-time updates failed: ${error.message}`)
        }
      }
    }

    // Listen for the correct event name
    window.addEventListener("lookupDataUpdated", handleLookupDataUpdate as EventListener)

    return () => {
      window.removeEventListener("lookupDataUpdated", handleLookupDataUpdate as EventListener)
    }
  }, [isSupabaseAvailable, connectionStatus, fetchLookupDataSafely, triggerLookupUpdate])

  // ENHANCED: Upload with better sync consistency
  const uploadHtml = useCallback(
    async (file: File, mergeMode = true) => {
      setIsLoading(true)
      setError(null)

      try {
        console.log(`🚀 Starting HTML upload (merge: ${mergeMode})...`)
        const newData = await parseHtmlFile(file)
        console.log(`📄 Parsed ${newData.length} entries from HTML`)

        let finalData: TruckTrailerMapping[]

        if (mergeMode && lookupData.length > 0) {
          // Smart merge: preserve existing data, update only trucks from new HTML
          finalData = mergeHtmlData(lookupData, newData)
          console.log(`🔄 Smart merge completed: ${finalData.length} total entries`)
        } else {
          // Full replace mode
          finalData = newData
          console.log(`🔄 Full replace mode: ${finalData.length} entries`)
        }

        // Update local state FIRST
        console.log(`💾 Setting local state: ${finalData.length} entries`)
        setLookupData(finalData)

        // Sync to Supabase with better error handling
        try {
          console.log(`📡 Syncing ${finalData.length} entries to Supabase...`)
          await syncLookupData(finalData)
          console.log(`✅ Supabase sync successful`)
        } catch (syncError) {
          console.warn("⚠️ Failed to sync to Supabase, but data is saved locally:", syncError)
          setError(
            "Upload successful locally, but sync to server failed. Other devices may not see changes immediately.",
          )
        }

        // Update localStorage to match exactly
        localStorage.setItem("truckTrailerLookup", JSON.stringify(finalData))
        const now = new Date()
        setLastUpdated(now)
        localStorage.setItem("lookupLastUpdated", now.toISOString())

        // Clear any previous errors if we got this far
        if (!error) {
          setError(null)
        }

        // Trigger immediate lookup update
        setTimeout(triggerLookupUpdate, 100)

        console.log(`🎉 Upload complete: ${finalData.length} entries ready`)
      } catch (e) {
        console.error("❌ Upload failed:", e)
        const errorMsg = "Failed to parse HTML file. Please check the format and try again."
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    },
    [syncLookupData, triggerLookupUpdate, lookupData, mergeHtmlData, error],
  )

  const addTruckTrailerPair = useCallback(
    async (truck: string, trailer: string): Promise<string> => {
      setError(null)

      try {
        const trimmedTruck = truck.trim()
        const trimmedTrailer = trailer.trim()

        if (!trimmedTruck || !trimmedTrailer) {
          throw new Error("Both truck and trailer numbers are required")
        }

        // Check if this exact truck-trailer pair already exists
        const exactMatch = lookupData.find((item) => item.truck === trimmedTruck && item.trailer === trimmedTrailer)

        if (exactMatch) {
          throw new Error(`Truck ${trimmedTruck} and Trailer ${trimmedTrailer} pair already exists`)
        }

        // Find existing truck or trailer entries
        const existingTruckIndex = lookupData.findIndex((item) => item.truck === trimmedTruck)
        const existingTrailerIndex = lookupData.findIndex((item) => item.trailer === trimmedTrailer)

        const updatedData = [...lookupData]
        let actionMessage = ""

        // Handle truck re-pairing
        if (existingTruckIndex !== -1) {
          const oldTrailer = lookupData[existingTruckIndex].trailer
          updatedData[existingTruckIndex] = {
            ...updatedData[existingTruckIndex],
            trailer: trimmedTrailer,
          }
          actionMessage = `Updated: Truck ${trimmedTruck} re-paired from trailer ${oldTrailer} to ${trimmedTrailer}`
        }
        // Handle trailer re-pairing
        else if (existingTrailerIndex !== -1) {
          const oldTruck = lookupData[existingTrailerIndex].truck
          updatedData[existingTrailerIndex] = {
            ...updatedData[existingTrailerIndex],
            truck: trimmedTruck,
          }
          actionMessage = `Updated: Trailer ${trimmedTrailer} re-paired from truck ${oldTruck} to ${trimmedTruck}`
        }
        // Handle new pair
        else {
          const newMapping: TruckTrailerMapping = {
            truck: trimmedTruck,
            trailer: trimmedTrailer,
            row: lookupData.length + 1,
          }
          updatedData.push(newMapping)
          actionMessage = `Added: New pair ${trimmedTruck} ↔ ${trimmedTrailer}`
        }

        // Update local state IMMEDIATELY
        setLookupData(updatedData)

        // Trigger immediate lookup update for warehouse inputs
        setTimeout(() => {
          triggerLookupUpdate()
          console.log(`🚀 IMMEDIATE UPDATE: ${actionMessage}`)
        }, 10) // Very short delay to ensure state is updated

        // Try to sync to Supabase in background
        try {
          await syncLookupData(updatedData)
          console.log(`✅ ${actionMessage} - Synced to Supabase`)
        } catch (syncError) {
          console.warn("Failed to sync to Supabase, but data is saved locally:", syncError)
          // Still update localStorage as fallback
          localStorage.setItem("truckTrailerLookup", JSON.stringify(updatedData))
          localStorage.setItem("lookupLastUpdated", new Date().toISOString())
        }

        const now = new Date()
        setLastUpdated(now)

        // Return the action message for the UI
        return actionMessage
      } catch (error) {
        console.error("Error adding truck-trailer pair:", error)
        setError(error.message || "Failed to add truck-trailer pair")
        throw error // Re-throw so the component can handle it
      }
    },
    [lookupData, syncLookupData, triggerLookupUpdate],
  )

  const clearData = useCallback(async () => {
    console.log("🗑️ Clearing all lookup data...")
    setLookupData([])
    setError(null)

    // Try to sync to Supabase, but don't fail if it doesn't work
    try {
      await syncLookupData([])
      console.log("✅ Data cleared in Supabase")
    } catch (syncError) {
      console.warn("Failed to clear data in Supabase:", syncError)
    }

    // Clear localStorage
    localStorage.removeItem("truckTrailerLookup")
    localStorage.removeItem("lookupLastUpdated")
    setLastUpdated(null)

    // Trigger lookup update to clear maps
    triggerLookupUpdate()
    console.log("🗑️ All data cleared")
  }, [syncLookupData, triggerLookupUpdate])

  const lookupTrailerByTruck = useCallback(
    (truck: string): string | null => {
      if (!truck || truck.trim() === "") return null

      const input = truck.trim()
      const result = truckMap.get(input) || null

      if (result) {
        console.log(`🔍 Truck lookup: ${input} → ${result}`)
      }

      return result
    },
    [truckMap],
  )

  const lookupTruckByTrailer = useCallback(
    (trailer: string): string | null => {
      if (!trailer || trailer.trim() === "") return null

      const input = trailer.trim()
      let result = trailerMap.get(input)

      if (result === undefined && !input.toLowerCase().startsWith("o-")) {
        result = trailerMap.get(`o-${input}`)
      }

      if (result) {
        console.log(`🔍 Trailer lookup: ${input} → ${result}`)
      }

      return result || null
    },
    [trailerMap],
  )

  const contextValue = useMemo(
    () => ({
      lookupData,
      isLoading,
      error,
      uploadHtml,
      clearData,
      addTruckTrailerPair,
      lookupTrailerByTruck,
      lookupTruckByTrailer,
      lastUpdated,
      dataCount: lookupData.length,
      forceRefresh,
    }),
    [
      lookupData,
      isLoading,
      error,
      uploadHtml,
      clearData,
      addTruckTrailerPair,
      lookupTrailerByTruck,
      lookupTruckByTrailer,
      lastUpdated,
      forceRefresh,
    ],
  )

  return <LookupContext.Provider value={contextValue}>{children}</LookupContext.Provider>
}

export function useLookup() {
  const context = useContext(LookupContext)
  if (!context) {
    throw new Error("useLookup must be used within a LookupProvider")
  }
  return context
}
