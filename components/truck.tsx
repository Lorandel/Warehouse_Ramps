"use client"

interface TruckProps {
  position: "left" | "right" | "bottom"
  rampX: number
  rampY: number
}

export default function Truck({ position, rampX, rampY }: TruckProps) {
  // Calculate truck position based on ramp position
  let truckX = rampX
  let truckY = rampY
  let rotation = 0

  // Position the truck near but not touching the ramp
  switch (position) {
    case "left":
      // For left ramps, truck enters from left to right
      // Truck face to the right, wheels below
      truckX = rampX - 80 // Position truck to the left of the ramp
      rotation = 0 // No rotation needed, truck faces right by default
      break

    case "right":
      // For right ramps, truck enters from right to left
      // Truck face to the left, wheels below
      truckX = rampX + 80 // Position truck to the right of the ramp
      rotation = 180 // Rotate 180 degrees so truck faces left
      break

    case "bottom":
      // For bottom ramps, truck enters from bottom to top
      // Truck face at the bottom, wheels to the right
      truckY = rampY + 80 // Position truck below the ramp
      rotation = 270 // Rotate 270 degrees so truck faces up with wheels to the right
      break
  }

  return (
    <g className="truck" transform={`translate(${truckX}, ${truckY}) rotate(${rotation})`}>
      {/* Trailer */}
      <rect x="-40" y="-15" width="80" height="30" fill="#455a64" stroke="#263238" strokeWidth="1" rx="2" />

      {/* Trailer details */}
      <rect x="-35" y="-10" width="70" height="20" fill="#546e7a" stroke="none" rx="1" />
      <line x1="-35" y1="-5" x2="35" y2="-5" stroke="#37474f" strokeWidth="0.5" />
      <line x1="-35" y1="5" x2="35" y2="5" stroke="#37474f" strokeWidth="0.5" />

      {/* Cabin */}
      <rect x="-40" y="-15" width="18" height="30" fill="#37474f" stroke="#263238" strokeWidth="1" rx="2" />

      {/* Cabin window */}
      <rect x="-35" y="-10" width="10" height="8" fill="#90caf9" stroke="#263238" strokeWidth="0.5" rx="1" />

      {/* Wheels */}
      <circle cx="-30" cy="-15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />
      <circle cx="-30" cy="15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />
      <circle cx="15" cy="-15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />
      <circle cx="15" cy="15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />
      <circle cx="30" cy="-15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />
      <circle cx="30" cy="15" r="4" fill="#212121" stroke="#000000" strokeWidth="0.5" />

      {/* Wheel details */}
      <circle cx="-30" cy="-15" r="1.5" fill="#424242" />
      <circle cx="-30" cy="15" r="1.5" fill="#424242" />
      <circle cx="15" cy="-15" r="1.5" fill="#424242" />
      <circle cx="15" cy="15" r="1.5" fill="#424242" />
      <circle cx="30" cy="-15" r="1.5" fill="#424242" />
      <circle cx="30" cy="15" r="1.5" fill="#424242" />
    </g>
  )
}
