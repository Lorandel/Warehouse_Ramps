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

// Memoized truck component (top-down articulated semi-truck)
// We keep the app "skeleton" intact — only the SVG drawing + animation target.
const Truck = memo(
  ({
    x,
    y,
    side,
    flip, // kept for backward-compat with the existing call site (not used)
    animationClass,
  }: { x: number; y: number; side: string; flip: boolean; animationClass: string }) => {
    // Base drawing: rear bumper (dock contact) is at (0,0); trailer extends towards negative X.
    // Orientation per side so we don't rely on mirroring (mirroring tends to look wrong for detailed trucks).
    const rotation = side === "bottom" ? 270 : side === "right" ? 180 : 0

    return (
      <g
        className={`truck-motion ${animationClass}`}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
          {/* Shadow */}
          <g opacity="0.35" transform="translate(-2, 2)">
            <rect x="-226" y="-26" width="226" height="52" rx="6" fill="#000000" />
            <rect x="-304" y="-24" width="78" height="48" rx="10" fill="#000000" />
          </g>

          {/* TRAILER */}
          <g>
            {/* outer */}
            <rect
              className="truck-trailer"
              x="-226"
              y="-26"
              width="226"
              height="52"
              rx="6"
              fill="#f8fafc"
              stroke="#0b1220"
              strokeWidth="1.3"
            />
            {/* inner panel */}
            <rect x="-220" y="-20" width="214" height="40" rx="5" fill="#ffffff" opacity="0.55" />
            {/* ribs */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={`rib-${i}`}
                x1={-212 + i * 18}
                y1={-23}
                x2={-212 + i * 18}
                y2={23}
                stroke="#64748b"
                strokeWidth="1"
                opacity="0.22"
              />
            ))}
            {/* reflective strip */}
            <rect x="-214" y="18" width="178" height="4" rx="2" fill="#f59e0b" opacity="0.55" />

            {/* rear bumper + doors at dock */}
            <rect x="-10" y="-24" width="10" height="48" rx="3" fill="#0b1220" opacity="0.92" />
            <rect x="-6.5" y="-18" width="3" height="36" rx="1.5" fill="#e5e7eb" opacity="0.8" />
            <rect x="-3" y="-18" width="2" height="36" rx="1" fill="#e5e7eb" opacity="0.45" />

            {/* tail lights */}
            <rect x="-18" y="-16" width="7" height="9" rx="2" fill="#ef4444" opacity="0.95" />
            <rect x="-18" y="7" width="7" height="9" rx="2" fill="#ef4444" opacity="0.95" />

            {/* landing gear */}
            <rect x="-178" y="-30" width="8" height="10" rx="2" fill="#111827" opacity="0.85" />
            <rect x="-178" y="20" width="8" height="10" rx="2" fill="#111827" opacity="0.85" />
            <rect x="-176" y="-20" width="4" height="40" rx="2" fill="#334155" opacity="0.75" />
          </g>

          {/* FIFTH WHEEL / KINGPIN AREA */}
          <g opacity="0.95">
            <rect x="-244" y="-16" width="18" height="32" rx="6" fill="#0f172a" opacity="0.75" />
            <rect x="-238" y="-10" width="10" height="20" rx="4" fill="#111827" opacity="0.8" />
          </g>

          {/* TRACTOR (separate group so it can articulate during the maneuver) */}
          <g
            className="truck-tractor"
            style={{ transformBox: "fill-box", transformOrigin: "70% 50%" }}
            transform="translate(-226, 0)"
          >
            {/* chassis */}
            <rect x="-86" y="-20" width="86" height="40" rx="10" fill="#0f172a" opacity="0.92" />
            {/* cab */}
            <path
              d="M -78 -24 h 44 a 10 10 0 0 1 10 10 v 28 a 10 10 0 0 1 -10 10 h -30 l -14 -9 v -30 z"
              fill="#e5e7eb"
              stroke="#0b1220"
              strokeWidth="1.3"
            />
            {/* hood */}
            <rect x="-98" y="-18" width="20" height="36" rx="10" fill="#111827" opacity="0.95" />
            {/* grille */}
            <rect x="-98" y="-6" width="9" height="12" rx="3" fill="#0b1220" opacity="0.35" />
            {/* windshield */}
            <rect x="-58" y="-14" width="16" height="28" rx="5" fill="#93c5fd" opacity="0.85" />
            {/* side window */}
            <rect x="-40" y="-12" width="10" height="10" rx="3" fill="#93c5fd" opacity="0.65" />
            {/* roof fairing */}
            <path d="M -46 -24 h 12 a 8 8 0 0 1 8 8 v 4 h -20 z" fill="#cbd5e1" opacity="0.95" />
            {/* tanks */}
            <rect x="-62" y="20" width="28" height="6" rx="3" fill="#9ca3af" opacity="0.85" />
            {/* lights */}
            <rect x="-102" y="-10" width="6" height="6" rx="2" fill="#fef9c3" opacity="0.95" />
            <rect x="-102" y="4" width="6" height="6" rx="2" fill="#fef9c3" opacity="0.95" />
          </g>

          {/* WHEELS (top-down) */}
          {[
            // trailer tandem axles (dual wheels)
            { x: -54, y: -34 },
            { x: -72, y: -34 },
            { x: -54, y: 26 },
            { x: -72, y: 26 },
            { x: -94, y: -34 },
            { x: -112, y: -34 },
            { x: -94, y: 26 },
            { x: -112, y: 26 },

            // tractor rear axle (duals)
            { x: -286, y: -34 },
            { x: -304, y: -34 },
            { x: -286, y: 26 },
            { x: -304, y: 26 },

            // tractor front axle (singles)
            { x: -322, y: -30 },
            { x: -322, y: 22 },
          ].map((t, idx) => (
            <g key={`wheel-${idx}`}>
              <rect className="truck-tire" x={t.x} y={t.y} width="14" height="10" rx="3" />
              <rect className="truck-rim" x={t.x + 4} y={t.y + 3} width="6" height="4" rx="2" />
            </g>
          ))}
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
    // Rear bumper (dock contact) sits almost on the ramp face.
    // Tiny offsets keep the ramp still visible and avoid overlapping click targets.
    const dockOffset = 2

    switch (side) {
      case "left":
        return {
          x: rampX - dockOffset,
          y: rampY,
          flip: false,
          animationClass: isExiting ? "truck-left-exit" : "truck-left-enter",
        }
      case "right":
        return {
          x: rampX + dockOffset,
          y: rampY,
          flip: true,
          animationClass: isExiting ? "truck-right-exit" : "truck-right-enter",
        }
      case "bottom":
        return {
          x: rampX,
          y: rampY + dockOffset,
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
