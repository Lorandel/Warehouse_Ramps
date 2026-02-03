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

// Memoized truck component (realistic top‑down semi-truck + articulated tractor)
// NOTE: We keep the surrounding layout structure intact; only the SVG drawing + motion behavior changed.
const Truck = memo(
  ({
    x,
    y,
    side,
    flip,
    animationClass,
  }: { x: number; y: number; side: string; flip: boolean; animationClass: string }) => {
    // Base orientation by side (final docked orientation)
    // Local coords: the *dock contact point* (rear bumper center) is at (0,0)
    // and the rig extends towards negative X (away from the building face).
    const rotation = side === "bottom" ? 270 : 0
    const s = 1.1

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* This is the element that gets translated/rotated during the approach/exit */}
        <g className={`truck-motion ${animationClass}`} filter="url(#truckShadow)">
          {/* Final orientation (flip + base rotation) lives here, separate from the motion group */}
          <g transform={`${flip ? "scale(-1,1)" : ""} rotate(${rotation}) scale(${s})`}>
            {/*
              TOP‑DOWN RIG
              - Dock contact (rear bumper) at (0,0)
              - Trailer extends to negative X
              - Tractor is articulated and rotates around the kingpin
            */}

            {/* TRAILER */}
            <g className="truck-trailer">
              {/* body */}
              <rect x="-182" y="-24" width="182" height="48" rx="4" fill="url(#trailerGrad)" stroke="#0b1220" strokeWidth="1" />
              {/* subtle edge shading */}
              <rect x="-182" y="-24" width="182" height="8" rx="4" fill="#ffffff" opacity="0.35" />
              <rect x="-182" y="16" width="182" height="8" rx="4" fill="#0b1220" opacity="0.06" />

              {/* rear door frame at dock */}
              <rect x="-12" y="-22" width="12" height="44" rx="2" fill="#0b1220" opacity="0.9" />
              <line x1="-10" y1="-18" x2="-10" y2="18" stroke="#e5e7eb" strokeWidth="1" opacity="0.8" />
              <line x1="-6" y1="-18" x2="-6" y2="18" stroke="#e5e7eb" strokeWidth="1" opacity="0.55" />
              <circle cx="-4" cy="0" r="1.6" fill="#e5e7eb" opacity="0.9" />

              {/* ribs / panel lines */}
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={`rib-${i}`}
                  x1={-170 + i * 15}
                  y1={-22}
                  x2={-170 + i * 15}
                  y2={22}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  opacity="0.22"
                />
              ))}

              {/* reflective strip */}
              <rect x="-176" y="16" width="164" height="4" rx="2" fill="#fbbf24" opacity="0.55" />

              {/* underride guard */}
              <rect x="-16" y="18" width="16" height="6" rx="2" fill="#030712" opacity="0.9" />

              {/* landing gear */}
              <rect x="-132" y="24" width="6" height="10" rx="1" fill="#111827" opacity="0.7" />
              <rect x="-122" y="24" width="6" height="10" rx="1" fill="#111827" opacity="0.7" />

              {/* tail lights */}
              <rect x="-18" y="-14" width="6" height="8" rx="2" fill="#ef4444" opacity="0.95" />
              <rect x="-18" y="6" width="6" height="8" rx="2" fill="#ef4444" opacity="0.95" />
            </g>

            {/* FIFTH WHEEL / KINGPIN AREA */}
            <g opacity="0.85">
              <rect x="-66" y="-14" width="34" height="28" rx="4" fill="#0b1220" opacity="0.6" />
              <rect x="-58" y="-10" width="18" height="20" rx="3" fill="#111827" opacity="0.7" />
            </g>

            {/* TRACTOR (inner group rotates; translate anchors to kingpin) */}
            <g transform="translate(-66, 0)">
              <g className="truck-tractor">
                {/* chassis */}
                <rect x="-86" y="-14" width="86" height="28" rx="6" fill="#0f172a" opacity="0.85" />

                {/* cab + sleeper */}
                <path
                  d="M -74 -18 h 40 a 8 8 0 0 1 8 8 v 20 a 8 8 0 0 1 -8 8 h -32 l -10 -6 v -22 z"
                  fill="url(#cabGrad)"
                  stroke="#0b1220"
                  strokeWidth="1"
                />

                {/* hood */}
                <rect x="-92" y="-16" width="20" height="32" rx="8" fill="#111827" opacity="0.92" />

                {/* windshield */}
                <rect x="-56" y="-11" width="16" height="22" rx="4" fill="#93c5fd" opacity="0.85" />
                {/* side window */}
                <rect x="-40" y="-10" width="10" height="10" rx="3" fill="#93c5fd" opacity="0.75" />

                {/* fuel tank */}
                <rect x="-60" y="16" width="26" height="6" rx="3" fill="#9ca3af" opacity="0.8" />

                {/* headlights */}
                <rect x="-96" y="-10" width="6" height="6" rx="2" fill="#fef9c3" opacity="0.95" />
                <rect x="-96" y="4" width="6" height="6" rx="2" fill="#fef9c3" opacity="0.95" />

                {/* hint shadow */}
                <rect x="-92" y="-4" width="92" height="8" fill="#0b1220" opacity="0.08" />
              </g>
            </g>

            {/* TIRES (rects, top-down) */}
            {[
              // trailer: 2 axles near rear
              { x: -66, y: -30 },
              { x: -50, y: -30 },
              { x: -66, y: 22 },
              { x: -50, y: 22 },
              { x: -92, y: -30 },
              { x: -76, y: -30 },
              { x: -92, y: 22 },
              { x: -76, y: 22 },

              // tractor rear axle
              { x: -140, y: -30 },
              { x: -124, y: -30 },
              { x: -140, y: 22 },
              { x: -124, y: 22 },

              // tractor front axle
              { x: -164, y: -26 },
              { x: -164, y: 18 },
            ].map((t, idx) => (
              <g key={`tire-${idx}`}>
                <rect className="truck-tire" x={t.x} y={t.y} width="10" height="8" rx="2" />
                <rect className="truck-rim" x={t.x + 3} y={t.y + 2} width="4" height="4" rx="1" />
              </g>
            ))}
          </g>
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
      {/* Dock door + shelter (visual only; click area stays on the colored ramp) */}
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        {/* Door recess */}
        <rect x="-36" y="-30" width="72" height="60" fill="#475569" opacity="0.65" rx="4" />
        {/* Shelter frame */}
        <rect x="-30" y="-24" width="60" height="48" fill="#0f172a" opacity="0.75" rx="4" />
        {/* Dock door */}
        <rect x="-22" y="-18" width="44" height="36" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" rx="3" />
        {/* Door slats */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`door-slat-${i}`}
            x1={-20}
            y1={-12 + i * 6}
            x2={20}
            y2={-12 + i * 6}
            stroke="#cbd5e1"
            strokeWidth="2"
            opacity="0.85"
          />
        ))}
        {/* Bumpers */}
        <rect x="-34" y="-10" width="6" height="20" rx="2" fill="#111827" opacity="0.9" />
        <rect x="28" y="-10" width="6" height="20" rx="2" fill="#111827" opacity="0.9" />

        {/* Status light */}
        <circle
          cx="0"
          cy="-36"
          r="6"
          fill={status.yellow ? "#fbbf24" : status.active ? "#ef4444" : "#22c55e"}
          stroke="#0f172a"
          strokeWidth="2"
          opacity="0.95"
        />
      </g>

      {/* Ramp click target (kept as the existing colored rectangle) */}
      <g
        className={`ramp ${status.active ? "active" : ""} ${status.yellow ? "yellow" : ""}`}
        onClick={onClick}
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
      >
        {/* Dock plate / leveler */}
        <rect className="ramp-base" x="-26" y="-18" width="52" height="36" rx="5" />

        {/* Ramp number - always upright */}
        <g transform={`rotate(${-rotation})`}>
          <text className="ramp-number" x="0" y="1" textAnchor="middle" dominantBaseline="middle">
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
    // how close the trailer sits to the dock face (smaller = tighter to ramp)
    const dockSnap = 52
    switch (side) {
      case "left":
        return {
          x: rampX - dockSnap,
          y: rampY,
          flip: false,
          animationClass: isExiting ? "truck-left-exit" : "truck-left-enter",
        }
      case "right":
        return {
          x: rampX + dockSnap,
          y: rampY,
          flip: true,
          animationClass: isExiting ? "truck-right-exit" : "truck-right-enter",
        }
      case "bottom":
        return {
          x: rampX,
          y: rampY + dockSnap,
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
      <defs>
        {/* Yard / asphalt texture */}
        <filter id="asphaltNoise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix
            type="matrix"
            values="0.35 0 0 0 0.25  0 0.35 0 0 0.25  0 0 0.35 0 0.25  0 0 0 1 0"
            result="tint"
          />
          <feComposite in="tint" in2="SourceGraphic" operator="overlay" />
        </filter>

        {/* Concrete apron / dock zone */}
        <linearGradient id="concreteGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>

        {/* Building facade + roof */}
        <linearGradient id="buildingWall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9aa3ad" />
          <stop offset="0.5" stopColor="#b6bec7" />
          <stop offset="1" stopColor="#8b949e" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b7280" />
          <stop offset="1" stopColor="#4b5563" />
        </linearGradient>

        {/* Truck paint */}
        <linearGradient id="trailerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>

        {/* Shadows */}
        <filter id="buildingShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.25" />
        </filter>
        <filter id="truckShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Yard background */}
      <rect x="0" y="0" width={config.svgWidth} height={config.svgHeight} fill="#6b7280" filter="url(#asphaltNoise)" />

      {/* Parking / maneuvering lanes */}
      <rect
        x={config.buildingX - config.parkingZoneWidth}
        y={config.buildingY}
        width={config.parkingZoneWidth}
        height={config.buildingHeight}
        fill="#7c8796"
        opacity="0.95"
      />
      <rect
        x={config.buildingX + config.buildingWidth}
        y={config.buildingY}
        width={config.parkingZoneWidth}
        height={config.buildingHeight}
        fill="#7c8796"
        opacity="0.95"
      />
      <rect
        x={config.buildingX}
        y={config.buildingY + config.buildingHeight}
        width={config.buildingWidth}
        height={config.parkingZoneWidth}
        fill="#7c8796"
        opacity="0.95"
      />

      {/* Concrete apron directly at dock faces */}
      <rect x={config.buildingX - 22} y={config.buildingY} width="22" height={config.buildingHeight} fill="url(#concreteGrad)" opacity="0.95" />
      <rect x={config.buildingX + config.buildingWidth} y={config.buildingY} width="22" height={config.buildingHeight} fill="url(#concreteGrad)" opacity="0.95" />
      <rect x={config.buildingX} y={config.buildingY + config.buildingHeight} width={config.buildingWidth} height="22" fill="url(#concreteGrad)" opacity="0.95" />

      {/* Lane markings */}
      <g opacity="0.9">
        <line
          x1={config.buildingX - config.parkingZoneWidth / 2}
          y1={config.buildingY}
          x2={config.buildingX - config.parkingZoneWidth / 2}
          y2={config.buildingY + config.buildingHeight}
          stroke="#e5e7eb"
          strokeWidth="3"
          strokeDasharray="18 14"
        />
        <line
          x1={config.buildingX + config.buildingWidth + config.parkingZoneWidth / 2}
          y1={config.buildingY}
          x2={config.buildingX + config.buildingWidth + config.parkingZoneWidth / 2}
          y2={config.buildingY + config.buildingHeight}
          stroke="#e5e7eb"
          strokeWidth="3"
          strokeDasharray="18 14"
        />
        <line
          x1={config.buildingX}
          y1={config.buildingY + config.buildingHeight + config.parkingZoneWidth / 2}
          x2={config.buildingX + config.buildingWidth}
          y2={config.buildingY + config.buildingHeight + config.parkingZoneWidth / 2}
          stroke="#e5e7eb"
          strokeWidth="3"
          strokeDasharray="18 14"
        />
      </g>

      {/* Main warehouse building (shadow + facade) */}
      <rect
        x={config.buildingX}
        y={config.buildingY}
        width={config.buildingWidth}
        height={config.buildingHeight}
        fill="url(#buildingWall)"
        stroke="#475569"
        strokeWidth="8"
        filter="url(#buildingShadow)"
      />

      {/* Roof strip + slight perspective edge */}
      <g opacity="0.95">
        <rect
          x={config.buildingX + 6}
          y={config.buildingY + 6}
          width={config.buildingWidth - 12}
          height="54"
          fill="url(#roofGrad)"
          opacity="0.55"
        />
        <line
          x1={config.buildingX + 6}
          y1={config.buildingY + 60}
          x2={config.buildingX + config.buildingWidth - 6}
          y2={config.buildingY + 60}
          stroke="#334155"
          strokeWidth="2"
          opacity="0.6"
        />
      </g>

      {/* Paneling lines */}
      <g opacity="0.22">
        {Array.from({ length: 22 }).map((_, i) => (
          <line
            key={`panel-${i}`}
            x1={config.buildingX + 20 + i * 64}
            y1={config.buildingY + 70}
            x2={config.buildingX + 20 + i * 64}
            y2={config.buildingY + config.buildingHeight - 20}
            stroke="#0f172a"
            strokeWidth="2"
          />
        ))}
      </g>

      {/* Central area */}
      <rect
        x={config.buildingX + (config.buildingWidth - centralAreaWidth) / 2}
        y={config.buildingY + 80}
        width={centralAreaWidth}
        height={config.buildingHeight - 240}
        fill="#6b7280"
        stroke="#475569"
        strokeWidth="2"
        opacity="0.65"
      />

      {/* Input areas (kept in same places) */}
      <rect x={config.buildingX + 60} y={config.buildingY + 20} width="320" height={config.buildingHeight - 40} fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="1" opacity="0.92" />
      <rect x={config.buildingX + config.buildingWidth - 380} y={config.buildingY + 20} width="320" height={config.buildingHeight - 40} fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="1" opacity="0.92" />
      <rect x={config.buildingX + 80} y={config.buildingY + config.buildingHeight - 150} width={config.buildingWidth - 160} height="100" fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="1" opacity="0.92" />

      {/* Label */}
      <text
        x={config.buildingX + config.buildingWidth / 2}
        y={config.buildingY + 45}
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="#0f172a"
        opacity="0.55"
      >
        WAREHOUSE
      </text>

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
