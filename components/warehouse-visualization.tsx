"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import WarehouseLayout from "./warehouse-layout"
import Legend from "./legend"
import HtmlUploader from "./html-uploader"
import { LookupProvider } from "@/contexts/lookup-context"
import { SupabaseSyncProvider, useSupabaseSync } from "@/contexts/supabase-sync-context"

export interface RampStatus {
  active: boolean
  red: boolean
  yellow: boolean
  inputValue: string
  truckValue: string
  trailerValue: string
  hasTruck: boolean
  isExiting?: boolean
}

// Create a default status object to use as fallback
const createDefaultStatus = (): RampStatus => ({
  active: false,
  red: false,
  yellow: false,
  inputValue: "",
  truckValue: "",
  trailerValue: "",
  hasTruck: false,
  isExiting: false,
})

// Animation duration constants
// Keep this in sync with the CSS exit animations (.truck-*-exit)
const TRUCK_EXIT_ANIMATION_DURATION = 1400 // ms

function WarehouseVisualizationContent() {
  const isMounted = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initialLoadDone = useRef(false)

  // Get Supabase sync functions (only for HTML DB)
  const { syncRampStatus, isInitializing, isSupabaseAvailable } = useSupabaseSync()

  // Initialize with empty state first, then load from localStorage in useEffect
  const [rampStatus, setRampStatus] = useState<Record<number, RampStatus>>({})
  const [scale, setScale] = useState(1)
  const [isReady, setIsReady] = useState(false)
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape")
  const [showUploader, setShowUploader] = useState(true) // Show uploader by default

  // Load saved status from localStorage - in useEffect to avoid state updates during render
  useEffect(() => {
    if (initialLoadDone.current) return

    // Mark as loaded to prevent multiple loads
    initialLoadDone.current = true

    if (typeof window !== "undefined") {
      try {
        // Load from LOCAL ONLY storage key
        const savedStatus = localStorage.getItem("warehouseRampStatus_localOnly")
        if (savedStatus) {
          const parsedStatus = JSON.parse(savedStatus)
          // Validate and ensure all ramp numbers have proper status objects
          const validatedStatus: Record<number, RampStatus> = {}

          // Initialize all valid ramp numbers (20-60)
          for (let i = 20; i <= 60; i++) {
            validatedStatus[i] = parsedStatus[i]
              ? { ...createDefaultStatus(), ...parsedStatus[i] }
              : createDefaultStatus()
          }

          setRampStatus(validatedStatus)
          console.log("💾 Loaded ramp status from LOCAL STORAGE ONLY")
        } else {
          // Initialize with default values for all ramps
          const status: Record<number, RampStatus> = {}
          for (let i = 20; i <= 60; i++) {
            status[i] = createDefaultStatus()
          }
          setRampStatus(status)
          console.log("🆕 Initialized default ramp status")
        }
      } catch (e) {
        console.error("❌ Failed to load ramp status from localStorage", e)
        // Initialize with default values on error
        const status: Record<number, RampStatus> = {}
        for (let i = 20; i <= 60; i++) {
          status[i] = createDefaultStatus()
        }
        setRampStatus(status)
      }
    }
  }, [])

  // Save status to localStorage ONLY (no Supabase for ramp status)
  const saveRampStatus = useCallback(
    (status: Record<number, RampStatus>) => {
      if (typeof window !== "undefined") {
        try {
          // Save to localStorage using local-only sync function
          syncRampStatus(status).catch((error) => {
            console.error("❌ Error saving ramp status locally:", error)
          })
        } catch (e) {
          console.error("❌ Failed to save ramp status", e)
        }
      }
    },
    [syncRampStatus],
  )

  // Function to update orientation state
  const updateOrientation = useCallback(() => {
    if (window.innerHeight > window.innerWidth) {
      setOrientation("portrait")
    } else {
      setOrientation("landscape")
    }
  }, [])

  // Set mounted flag and mark as ready after initial render
  useEffect(() => {
    isMounted.current = true
    setIsReady(true)
    updateOrientation()
    updateScale()

    const handleResize = () => {
      updateOrientation()
      updateScale()
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      isMounted.current = false
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
    }
  }, [updateOrientation])

  // Scale visualization based on window size and orientation
  const updateScale = useCallback(() => {
    if (!isMounted.current) return

    const container = containerRef.current
    const visualization = document.querySelector("#warehouse-svg")

    if (!container || !visualization) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const visualizationWidth = visualization.clientWidth
    const visualizationHeight = visualization.clientHeight

    if (!containerWidth || !containerHeight || !visualizationWidth || !visualizationHeight) return

    if (window.innerHeight > window.innerWidth) {
      // Portrait mode - prioritize fitting width
      const scaleX = (containerWidth - 20) / visualizationWidth
      setScale(Math.max(scaleX, 0.15))
    } else {
      // Landscape mode - balance width and height
      const scaleX = (containerWidth - 40) / visualizationWidth
      const scaleY = (containerHeight - 40) / visualizationHeight
      const newScale = Math.min(scaleX, scaleY, 0.9)
      setScale(Math.max(newScale, 0.2))
    }
  }, [])

  // Handle ramp click - toggle between active and inactive with animations
  const handleRampClick = useCallback(
    (rampNumber: number) => {
      if (!isMounted.current) return

      // Validate ramp number
      if (rampNumber < 20 || rampNumber > 60) {
        console.warn(`Invalid ramp number: ${rampNumber}`)
        return
      }

      setRampStatus((prev) => {
        const currentStatus = prev[rampNumber] || createDefaultStatus()

        // If we're deactivating, start the exit animation and clear input values
        if (currentStatus.active) {
          const result = {
            ...prev,
            [rampNumber]: {
              ...currentStatus,
              isExiting: true,
            },
          }

          setTimeout(() => {
            if (isMounted.current) {
              setRampStatus((current) => {
                const newStatus = {
                  ...current,
                  [rampNumber]: {
                    ...current[rampNumber],
                    active: false,
                    red: false,
                    yellow: false,
                    hasTruck: false,
                    isExiting: false,
                    // Clear all input values when making ramp free (green)
                    inputValue: "",
                    truckValue: "",
                    trailerValue: "",
                  },
                }
                saveRampStatus(newStatus)
                return newStatus
              })
            }
          }, TRUCK_EXIT_ANIMATION_DURATION)

          saveRampStatus(result)
          return result
        }

        // If we're activating, first set active state without truck
        const result = {
          ...prev,
          [rampNumber]: {
            ...currentStatus,
            active: true,
            red: true,
            yellow: false,
            hasTruck: false,
            isExiting: false,
          },
        }

        setTimeout(() => {
          if (isMounted.current) {
            setRampStatus((current) => {
              const newStatus = {
                ...current,
                [rampNumber]: {
                  ...current[rampNumber],
                  hasTruck: true,
                },
              }
              saveRampStatus(newStatus)
              return newStatus
            })
          }
        }, 50)

        saveRampStatus(result)
        return result
      })
    },
    [saveRampStatus],
  )

  // Handle input change with animations and validation
  const handleInputChange = useCallback(
    (rampNumber: number, value: string, inputType: "truck" | "trailer") => {
      if (!isMounted.current) return

      // Validate ramp number
      if (rampNumber < 20 || rampNumber > 60) {
        console.warn(`Invalid ramp number: ${rampNumber}`)
        return
      }

      setRampStatus((prev) => {
        const currentStatus = prev[rampNumber] || createDefaultStatus()

        // Update the appropriate input value
        const updatedStatus = {
          ...currentStatus,
          [inputType === "truck" ? "truckValue" : "trailerValue"]: value,
        }

        // Combine values for backward compatibility
        updatedStatus.inputValue = `${updatedStatus.truckValue || ""} ${updatedStatus.trailerValue || ""}`.trim()

        // Check if the input indicates a defect
        const lowerTruckValue = updatedStatus.truckValue?.trim().toLowerCase() || ""
        const lowerTrailerValue = updatedStatus.trailerValue?.trim().toLowerCase() || ""
        const isYellow = lowerTruckValue === "defect" || lowerTrailerValue === "defect"
        const hasAnyInput =
          (lowerTruckValue !== "" && lowerTruckValue !== "defect") ||
          (lowerTrailerValue !== "" && lowerTrailerValue !== "defect")
        const isActive = hasAnyInput || isYellow

        // If both inputs are empty or only contain "defect" that's being removed, make ramp green (free)
        if (!isActive) {
          // If we had a truck, start exit animation
          if (currentStatus.hasTruck) {
            const result = {
              ...prev,
              [rampNumber]: {
                ...updatedStatus,
                isExiting: true,
              },
            }

            setTimeout(() => {
              if (isMounted.current) {
                setRampStatus((current) => {
                  const newStatus = {
                    ...current,
                    [rampNumber]: {
                      ...current[rampNumber],
                      active: false,
                      red: false,
                      yellow: false,
                      hasTruck: false,
                      isExiting: false,
                    },
                  }
                  saveRampStatus(newStatus)
                  return newStatus
                })
              }
            }, TRUCK_EXIT_ANIMATION_DURATION)

            saveRampStatus(result)
            return result
          } else {
            // No truck, just make it green immediately
            const newStatus = {
              ...prev,
              [rampNumber]: {
                ...updatedStatus,
                active: false,
                red: false,
                yellow: false,
                hasTruck: false,
                isExiting: false,
              },
            }
            saveRampStatus(newStatus)
            return newStatus
          }
        }

        // If we're removing a truck (changing from active to inactive)
        if (currentStatus.active && !isActive) {
          const result = {
            ...prev,
            [rampNumber]: {
              ...updatedStatus,
              isExiting: true,
            },
          }

          setTimeout(() => {
            if (isMounted.current) {
              setRampStatus((current) => {
                const newStatus = {
                  ...current,
                  [rampNumber]: {
                    ...current[rampNumber],
                    active: isActive,
                    red: hasAnyInput,
                    yellow: isYellow,
                    hasTruck: false,
                    isExiting: false,
                  },
                }
                saveRampStatus(newStatus)
                return newStatus
              })
            }
          }, TRUCK_EXIT_ANIMATION_DURATION)

          saveRampStatus(result)
          return result
        }

        // If we're changing to defect, remove truck with animation
        if (isYellow && currentStatus.hasTruck && !currentStatus.yellow) {
          const result = {
            ...prev,
            [rampNumber]: {
              ...updatedStatus,
              yellow: isYellow,
              isExiting: true,
            },
          }

          setTimeout(() => {
            if (isMounted.current) {
              setRampStatus((current) => {
                const newStatus = {
                  ...current,
                  [rampNumber]: {
                    ...current[rampNumber],
                    active: isActive,
                    red: false,
                    yellow: isYellow,
                    hasTruck: false,
                    isExiting: false,
                  },
                }
                saveRampStatus(newStatus)
                return newStatus
              })
            }
          }, TRUCK_EXIT_ANIMATION_DURATION)

          saveRampStatus(result)
          return result
        }

        // If we're adding a truck (changing from inactive to active)
        if (!currentStatus.active && isActive && hasAnyInput) {
          const result = {
            ...prev,
            [rampNumber]: {
              ...updatedStatus,
              active: isActive,
              red: hasAnyInput,
              yellow: isYellow,
              hasTruck: false,
              isExiting: false,
            },
          }

          setTimeout(() => {
            if (isMounted.current) {
              setRampStatus((current) => {
                const newStatus = {
                  ...current,
                  [rampNumber]: {
                    ...current[rampNumber],
                    hasTruck: hasAnyInput,
                  },
                }
                saveRampStatus(newStatus)
                return newStatus
              })
            }
          }, 50)

          saveRampStatus(result)
          return result
        }

        // For all other cases (no animation needed)
        const newStatus = {
          ...prev,
          [rampNumber]: {
            ...updatedStatus,
            active: isActive,
            red: hasAnyInput,
            yellow: isYellow,
            hasTruck: hasAnyInput,
            isExiting: false,
          },
        }
        saveRampStatus(newStatus)
        return newStatus
      })
    },
    [saveRampStatus],
  )

  // Toggle uploader visibility
  const toggleUploader = useCallback(() => {
    setShowUploader((prev) => !prev)
  }, [])

  // Don't render until we're ready
  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Show loading state while initializing HTML DB sync
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Initializing HTML Database Sync...</h2>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Setting up truck-trailer lookup sync...</p>
          <p className="text-xs text-gray-500 mt-2">Ramp controls are local only</p>
        </div>
      </div>
    )
  }

  return (
    <div id="app" className={`app-container ${orientation}`}>
      {/* HTML Upload Button */}
      <div className="flex justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">
            {isSupabaseAvailable ? "🟢 HTML DB Sync Active" : "🔴 HTML DB Local Only"}
          </span>
          <span className="text-xs text-gray-500">• Ramp Status: Local Only</span>
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" onClick={toggleUploader}>
          {showUploader ? "Hide Database Tools" : "Show Database Tools"}
        </button>
      </div>

      {/* Database Tools */}
      {showUploader && <HtmlUploader />}

      <div className="warehouse-container" ref={containerRef}>
        <div
          id="warehouse-svg"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: orientation === "portrait" ? "top center" : "center center",
          }}
        >
          <WarehouseLayout
            rampStatus={rampStatus}
            onRampClick={handleRampClick}
            onInputChange={handleInputChange}
            orientation={orientation}
          />
        </div>
      </div>
      <Legend />
    </div>
  )
}

function WarehouseVisualization() {
  return (
    <SupabaseSyncProvider>
      <LookupProvider>
        <WarehouseVisualizationContent />
      </LookupProvider>
    </SupabaseSyncProvider>
  )
}

export default memo(WarehouseVisualization)
