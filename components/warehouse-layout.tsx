"use client"

import { useState, useCallback, useMemo, memo, useRef, useEffect } from "react"
import type { RampStatus } from "./warehouse-visualization"
import { useLookup } from "@/contexts/lookup-context"
import RampInputField from "./ramp-input-field"

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

interface WarehouseLayoutProps {
  rampStatus: Record<number, RampStatus>
  onRampClick: (rampNumber: number) => void
  onInputChange: (rampNumber: number, value: string, inputType: "truck" | "trailer") => void
  orientation: "portrait" | "landscape"
}

// Warehouse configuration with EXACTLY equal input sizes
const config = {
  buildingX: 250,
  buildingY: 50,
  buildingWidth: 1400,
  buildingHeight: 1100,
  bottomSectionHeight: 150,
  leftRampCount: 17, // 60-44
  rightRampCount: 16, // 20-35
  bottomRampCount: 8, // 36-43
  // EXACTLY the same width for both truck and trailer inputs
  inputWidth: 100, // Single width value for ALL inputs
  truckOffset: 100,
  svgWidth: 1900,
  svgHeight: 1300,
  parkingZoneWidth: 180,
}

// Memoized truck component
const Truck = memo(
  ({
    x,
    y,
    side,
    flip,
    animationClass,
  }: { x: number; y: number; side: string; flip: boolean; animationClass: string }) => {
    let wheels
    let cabinX = -40

    switch (side) {
      case "left":
        wheels = (
          <>
            <circle className="truck-wheel" cx="-30" cy="15" r="4" />
            <circle className="truck-wheel" cx="15" cy="15" r="4" />
            <circle className="truck-wheel" cx="30" cy="15" r="4" />
          </>
        )
        cabinX = -40
        break

      case "right":
        wheels = (
          <>
            <circle className="truck-wheel" cx="-30" cy="15" r="4" />
            <circle className="truck-wheel" cx="15" cy="15" r="4" />
            <circle className="truck-wheel" cx="30" cy="15" r="4" />
          </>
        )
        cabinX = -40
        break

      case "bottom":
        wheels = (
          <>
            <circle className="truck-wheel" cx="15" cy="15" r="4" />
            <circle className="truck-wheel" cx="-30" cy="15" r="4" />
            <circle className="truck-wheel" cx="30" cy="15" r="4" />
          </>
        )
        cabinX = -40
        break
    }

    const rotation = side === "bottom" ? 270 : 0

    return (
      <g className={`truck ${animationClass}`}>
        <g transform={`translate(${x}, ${y}) rotate(${rotation}) ${flip ? "scale(-1,1)" : ""}`}>
          <rect className="truck-trailer" x="-40" y="-15" width="80" height="30" rx="2" />
          <rect x="-35" y="-10" width="70" height="20" fill="#FAFAFA" rx="1" />
          <rect className="truck-cabin" x={cabinX} y="-15" width="18" height="30" rx="2" />
          <rect className="truck-window" x={cabinX + 5} y="-10" width="10" height="8" rx="1" />
          {wheels}
        </g>
      </g>
    )
  },
)

Truck.displayName = "Truck"

// Memoized ramp component
const Ramp = memo(
  ({
    rampNum,
    x,
    y,
    rotation,
    status,
    onClick,
  }: {
    rampNum: number
    x: number
    y: number
    rotation: number
    status: RampStatus
    onClick: () => void
  }) => (
    <>
      {/* Loading dock detail */}
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        <rect x="-30" y="-25" width="60" height="50" fill="#555555" stroke="#444444" strokeWidth="1" rx="2" />
        <rect x="-25" y="-20" width="50" height="40" fill="#666666" stroke="#555555" strokeWidth="1" rx="2" />
      </g>

      {/* Ramp */}
      <g
        className={`ramp ${status.active ? "active" : ""} ${status.yellow ? "yellow" : ""}`}
        onClick={onClick}
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
      >
        {/* Ramp base */}
        <rect className="ramp-base" x="-25" y="-20" width="50" height="40" rx="3" />

        {/* Ramp number - always upright */}
        <g transform={`rotate(${-rotation})`}>
          <text className="ramp-number" x="0" y="0" textAnchor="middle" dominantBaseline="middle">
            {rampNum}
          </text>
        </g>
      </g>
    </>
  ),
)

Ramp.displayName = "Ramp"

function WarehouseLayout({
  rampStatus = {},
  onRampClick,
  onInputChange,
  orientation = "landscape",
}: WarehouseLayoutProps) {
  // Track recently filled inputs for highlighting
  const [recentlyFilled, setRecentlyFilled] = useState<{
    rampNum: number
    inputType: "truck" | "trailer"
    timestamp: number
  } | null>(null)

  // Store the last lookup values to prevent duplicate lookups
  const lastLookupRef = useRef<Record<number, { truck: string; trailer: string }>>({})

  // Force re-render trigger for lookups
  const [lookupUpdateTrigger, setLookupUpdateTrigger] = useState(0)

  // Get lookup functions from context
  const { lookupTrailerByTruck, lookupTruckByTrailer, dataCount } = useLookup()

  // Listen for lookup data changes to force re-evaluation
  useEffect(() => {
    const handleLookupDataChanged = (event: CustomEvent) => {
      console.log(`🔄 Warehouse received lookup data change: ${event.detail.dataCount} entries`)
      setLookupUpdateTrigger((prev) => prev + 1)
      // Clear the last lookup cache to force fresh lookups
      lastLookupRef.current = {}
    }

    window.addEventListener("lookupDataChanged", handleLookupDataChanged as EventListener)

    return () => {
      window.removeEventListener("lookupDataChanged", handleLookupDataChanged as EventListener)
    }
  }, [])

  // Calculate positions for ramps around the warehouse - ALL inputs use the same width
  const rampPositions = useMemo(() => {
    const positions: Record<
      number,
      {
        x: number
        y: number
        truckInputX: number
        truckInputY: number
        trailerInputX: number
        trailerInputY: number
        side: "bottom" | "left" | "right"
        inputWidth: number
      }
    > = {}

    const sideRampAreaHeight = config.buildingHeight - config.bottomSectionHeight
    const maxRampCount = Math.max(config.leftRampCount, config.rightRampCount)
    const sideRampSpacing = sideRampAreaHeight / maxRampCount

    // Left side ramps (60-44) - EXACTLY the same width for both inputs
    for (let i = 0; i < config.leftRampCount; i++) {
      const rampNumber = 60 - i
      const y = config.buildingY + (i + 0.5) * sideRampSpacing
      positions[rampNumber] = {
        x: config.buildingX,
        y: y,
        // Truck input - using config.inputWidth
        truckInputX: config.buildingX + 70,
        truckInputY: y - 20,
        // Trailer input - using EXACTLY the same config.inputWidth
        trailerInputX: config.buildingX + 180,
        trailerInputY: y - 20,
        side: "left",
        inputWidth: config.inputWidth, // SAME width for both
      }
    }

    // Right side ramps (20-35) - EXACTLY the same width for both inputs
    for (let i = 0; i < config.rightRampCount; i++) {
      const rampNumber = 20 + i
      const y = config.buildingY + (i + 0.5) * sideRampSpacing
      positions[rampNumber] = {
        x: config.buildingX + config.buildingWidth,
        y: y,
        // Truck input - using config.inputWidth
        truckInputX: config.buildingX + config.buildingWidth - 180,
        truckInputY: y - 20,
        // Trailer input - using EXACTLY the same config.inputWidth
        trailerInputX: config.buildingX + config.buildingWidth - 290,
        trailerInputY: y - 20,
        side: "right",
        inputWidth: config.inputWidth, // SAME width for both
      }
    }

    // Bottom ramps (36-43) - EXACTLY the same width for both inputs
    const bottomRampSpacing = config.buildingWidth / config.bottomRampCount
    for (let i = 0; i < config.bottomRampCount; i++) {
      const rampNumber = 43 - i
      const x = config.buildingX + (i + 0.5) * bottomRampSpacing

      // Use a consistent width for bottom inputs too
      const bottomInputWidth = Math.min(bottomRampSpacing - 30, config.inputWidth)

      positions[rampNumber] = {
        x: x,
        y: config.buildingY + config.buildingHeight,
        // Truck input - using bottomInputWidth
        truckInputX: x - bottomInputWidth / 2,
        truckInputY: config.buildingY + config.buildingHeight - 85,
        // Trailer input - using EXACTLY the same bottomInputWidth
        trailerInputX: x - bottomInputWidth / 2,
        trailerInputY: config.buildingY + config.buildingHeight - 135,
        side: "bottom",
        inputWidth: bottomInputWidth, // SAME width for both
      }
    }

    return positions
  }, [])

  // Generate grid lines - memoized for performance
  const gridLines = useMemo(() => {
    const lines = []
    const sideRampAreaHeight = config.buildingHeight - config.bottomSectionHeight
    const parkingZoneEndLeft = config.buildingX - config.parkingZoneWidth
    const parkingZoneEndRight = config.buildingX + config.buildingWidth + config.parkingZoneWidth
    const parkingZoneEndBottom = config.buildingY + config.buildingHeight + config.parkingZoneWidth

    const maxRampCount = Math.max(config.leftRampCount, config.rightRampCount)
    const sideRampSpacing = sideRampAreaHeight / maxRampCount

    // Left side grid lines (horizontal)
    for (let i = 0; i <= maxRampCount; i++) {
      const y = config.buildingY + i * sideRampSpacing
      lines.push(
        <line
          key={`left-grid-${i}`}
          className="grid-line"
          x1={parkingZoneEndLeft}
          y1={y}
          x2={config.buildingX}
          y2={y}
        />,
      )
    }

    // Right side grid lines (horizontal)
    for (let i = 0; i <= config.rightRampCount; i++) {
      const y = config.buildingY + i * sideRampSpacing
      lines.push(
        <line
          key={`right-grid-${i}`}
          className="grid-line"
          x1={config.buildingX + config.buildingWidth}
          y1={y}
          x2={parkingZoneEndRight}
          y2={y}
        />,
      )
    }

    // Bottom grid lines (vertical)
    const bottomRampSpacing = config.buildingWidth / config.bottomRampCount
    for (let i = 0; i < config.bottomRampCount; i++) {
      const x = config.buildingX + i * bottomRampSpacing
      lines.push(
        <line
          key={`bottom-grid-${i}`}
          className="grid-line"
          x1={x}
          y1={config.buildingY + config.buildingHeight}
          x2={x}
          y2={parkingZoneEndBottom}
        />,
      )
    }

    return lines
  }, [])

  // Safe click handler
  const handleRampClick = useCallback(
    (rampNum: number) => {
      if (typeof onRampClick === "function") {
        onRampClick(rampNum)
      }
    },
    [onRampClick],
  )

  // Enhanced input handler with real-time lookup functionality - now with immediate lookup trigger
  const handleInputChange = useCallback(
    (rampNum: number, value: string, inputType: "truck" | "trailer") => {
      if (typeof onInputChange !== "function") return

      // Initialize the last lookup record for this ramp if it doesn't exist
      if (!lastLookupRef.current[rampNum]) {
        lastLookupRef.current[rampNum] = { truck: "", trailer: "" }
      }

      // First, update the current input field
      onInputChange(rampNum, value, inputType)

      // If the value is being cleared (deleted), also clear the associated field
      if (value.trim() === "") {
        const otherInputType = inputType === "truck" ? "trailer" : "truck"

        // Check if the other field has a value before clearing
        const currentStatus = rampStatus[rampNum] || createDefaultStatus()
        const otherFieldValue = inputType === "truck" ? currentStatus.trailerValue : currentStatus.truckValue

        if (otherFieldValue && otherFieldValue.trim() !== "") {
          // Clear the other field
          onInputChange(rampNum, "", otherInputType)
        }

        // Reset the last lookup value for this input type
        lastLookupRef.current[rampNum][inputType] = ""
        return
      }

      // Skip lookup if no data is loaded
      if (dataCount === 0) {
        console.log(`🚫 No lookup data available (dataCount: ${dataCount})`)
        return
      }

      // Check if we've already looked up this exact value to prevent duplicate lookups
      // BUT allow re-lookup if lookup data has changed (different trigger)
      const lookupKey = `${value}-${lookupUpdateTrigger}`
      if (lastLookupRef.current[rampNum][inputType] === lookupKey) {
        return
      }

      // Update the last lookup value with trigger
      lastLookupRef.current[rampNum][inputType] = lookupKey

      console.log(`🔍 Performing lookup for ${inputType}: "${value}" (trigger: ${lookupUpdateTrigger})`)

      // Perform the lookup based on input type
      if (inputType === "truck") {
        // If truck number is entered, look up the trailer
        const trailer = lookupTrailerByTruck(value)

        if (trailer) {
          // Only update if we found a match and the trailer field is different
          const currentStatus = rampStatus[rampNum] || createDefaultStatus()

          if (currentStatus.trailerValue !== trailer) {
            // Update the trailer field
            onInputChange(rampNum, trailer, "trailer")

            // Mark this field as recently filled for highlighting
            setRecentlyFilled({
              rampNum,
              inputType: "trailer",
              timestamp: Date.now(),
            })

            // Clear the highlight after 2 seconds
            setTimeout(() => {
              setRecentlyFilled((current) => {
                if (current?.rampNum === rampNum && current?.inputType === "trailer") {
                  return null
                }
                return current
              })
            }, 2000)

            console.log(`✅ Truck lookup success: ${value} → ${trailer}`)
          }
        } else {
          // If no match found and there's a value in the trailer field, clear it
          const currentStatus = rampStatus[rampNum] || createDefaultStatus()
          if (currentStatus.trailerValue) {
            onInputChange(rampNum, "", "trailer")
            console.log(`❌ Truck lookup failed: ${value} (cleared trailer)`)
          }
        }
      } else if (inputType === "trailer") {
        // If trailer number is entered, look up the truck
        const truck = lookupTruckByTrailer(value)

        if (truck) {
          // Only update if we found a match and the truck field is different
          const currentStatus = rampStatus[rampNum] || createDefaultStatus()

          if (currentStatus.truckValue !== truck) {
            // Update the truck field
            onInputChange(rampNum, truck, "truck")

            // Mark this field as recently filled for highlighting
            setRecentlyFilled({
              rampNum,
              inputType: "truck",
              timestamp: Date.now(),
            })

            // Clear the highlight after 2 seconds
            setTimeout(() => {
              setRecentlyFilled((current) => {
                if (current?.rampNum === rampNum && current?.inputType === "truck") {
                  return null
                }
                return current
              })
            }, 2000)

            console.log(`✅ Trailer lookup success: ${value} → ${truck}`)
          }
        } else {
          // If no match found and there's a value in the truck field, clear it
          const currentStatus = rampStatus[rampNum] || createDefaultStatus()
          if (currentStatus.truckValue) {
            onInputChange(rampNum, "", "truck")
            console.log(`❌ Trailer lookup failed: ${value} (cleared truck)`)
          }
        }
      }
    },
    [onInputChange, rampStatus, dataCount, lookupTrailerByTruck, lookupTruckByTrailer, lookupUpdateTrigger],
  )

  // Function to get truck position and animation classes based on ramp position
  const getTruckPosition = useCallback((rampX: number, rampY: number, side: string, isExiting: boolean) => {
    switch (side) {
      case "left":
        return {
          x: rampX - config.truckOffset,
          y: rampY,
          flip: false,
          animationClass: isExiting ? "truck-left-exit" : "truck-left-enter",
        }
      case "right":
        return {
          x: rampX + config.truckOffset,
          y: rampY,
          flip: true,
          animationClass: isExiting ? "truck-right-exit" : "truck-right-enter",
        }
      case "bottom":
        return {
          x: rampX,
          y: rampY + config.truckOffset,
          flip: false,
          animationClass: isExiting ? "truck-bottom-exit" : "truck-bottom-enter",
        }
      default:
        return {
          x: rampX,
          y: rampY,
          flip: false,
          animationClass: "",
        }
    }
  }, [])

  // Adjust input field height based on orientation
  const inputHeight = orientation === "portrait" ? "50" : "40"

  // Adjust central area for wider layout
  const centralAreaWidth = config.buildingWidth - 700

  // Function to determine if an input should be highlighted
  const isHighlighted = useCallback(
    (rampNum: number, inputType: "truck" | "trailer") => {
      return recentlyFilled?.rampNum === rampNum && recentlyFilled?.inputType === inputType
    },
    [recentlyFilled],
  )

  return (
    <svg width={config.svgWidth} height={config.svgHeight} viewBox={`0 0 ${config.svgWidth} ${config.svgHeight}`}>
      <rect x="0" y="0" width={config.svgWidth} height={config.svgHeight} fill="#888888" />

      {/* Parking areas */}
      <rect
        x={config.buildingX - config.parkingZoneWidth}
        y={config.buildingY}
        width={config.parkingZoneWidth}
        height={config.buildingHeight}
        fill="#aaaaaa"
      />
      <rect
        x={config.buildingX + config.buildingWidth}
        y={config.buildingY}
        width={config.parkingZoneWidth}
        height={config.buildingHeight}
        fill="#aaaaaa"
      />
      <rect
        x={config.buildingX}
        y={config.buildingY + config.buildingHeight}
        width={config.buildingWidth}
        height={config.parkingZoneWidth}
        fill="#aaaaaa"
      />

      {/* Main warehouse building */}
      <rect
        x={config.buildingX}
        y={config.buildingY}
        width={config.buildingWidth}
        height={config.buildingHeight}
        fill="#999999"
        stroke="#666666"
        strokeWidth="8"
      />

      {/* Central area */}
      <rect
        x={config.buildingX + (config.buildingWidth - centralAreaWidth) / 2}
        y={config.buildingY + 50}
        width={centralAreaWidth}
        height={config.buildingHeight - 200}
        fill="#777777"
        stroke="#666666"
        strokeWidth="2"
      />

      {/* Input areas */}
      <rect
        x={config.buildingX + 60}
        y={config.buildingY + 20}
        width="320"
        height={config.buildingHeight - 40}
        fill="#d9d9d9"
        stroke="#cccccc"
        strokeWidth="1"
      />
      <rect
        x={config.buildingX + config.buildingWidth - 380}
        y={config.buildingY + 20}
        width="320"
        height={config.buildingHeight - 40}
        fill="#d9d9d9"
        stroke="#cccccc"
        strokeWidth="1"
      />
      <rect
        x={config.buildingX + 80}
        y={config.buildingY + config.buildingHeight - 150}
        width={config.buildingWidth - 160}
        height="100"
        fill="#d9d9d9"
        stroke="#cccccc"
        strokeWidth="1"
      />

      {/* Grid lines */}
      {gridLines}

      {/* Ramps, trucks, and inputs */}
      {Object.entries(rampPositions).map(([rampNumberStr, position]) => {
        const rampNum = Number.parseInt(rampNumberStr, 10)

        // Ensure we have a valid status object with all required properties
        const status = rampStatus?.[rampNum] || createDefaultStatus()

        // Determine if we should show a truck
        const showTruck = (status.active || status.red || status.isExiting) && status.hasTruck

        // Get truck position and animation class
        const truckPosition = getTruckPosition(position.x, position.y, position.side, status.isExiting || false)

        // Determine ramp orientation
        const rotation = position.side === "bottom" ? 270 : 0

        return (
          <g key={`ramp-group-${rampNum}`} className="ramp-group" data-ramp={rampNum}>
            {/* Ramp with loading dock */}
            <Ramp
              rampNum={rampNum}
              x={position.x}
              y={position.y}
              rotation={rotation}
              status={status}
              onClick={() => handleRampClick(rampNum)}
            />

            {/* Truck if ramp is active or exiting */}
            {showTruck && (
              <Truck
                x={truckPosition.x}
                y={truckPosition.y}
                side={position.side}
                flip={truckPosition.flip}
                animationClass={truckPosition.animationClass}
              />
            )}

            {/* Truck input field - EXACTLY the same size as trailer */}
            <foreignObject
              x={position.truckInputX}
              y={position.truckInputY}
              width={position.inputWidth}
              height={inputHeight}
            >
              <div style={{ width: "100%", height: "100%", padding: "0", margin: "0" }}>
                <RampInputField
                  value={status?.truckValue || ""}
                  onChange={(value) => handleInputChange(rampNum, value, "truck")}
                  placeholder="truck"
                  inputType="truck"
                  rampNum={rampNum}
                  isHighlighted={isHighlighted(rampNum, "truck")}
                />
              </div>
            </foreignObject>

            {/* Trailer input field - EXACTLY the same size as truck */}
            <foreignObject
              x={position.trailerInputX}
              y={position.trailerInputY}
              width={position.inputWidth}
              height={inputHeight}
            >
              <div style={{ width: "100%", height: "100%", padding: "0", margin: "0" }}>
                <RampInputField
                  value={status?.trailerValue || ""}
                  onChange={(value) => handleInputChange(rampNum, value, "trailer")}
                  placeholder="trailer"
                  inputType="trailer"
                  rampNum={rampNum}
                  isHighlighted={isHighlighted(rampNum, "trailer")}
                />
              </div>
            </foreignObject>
          </g>
        )
      })}
    </svg>
  )
}

export default memo(WarehouseLayout)
