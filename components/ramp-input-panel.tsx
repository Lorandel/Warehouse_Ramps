"use client"

import type { RampStatus } from "./warehouse-visualization"

interface RampInputPanelProps {
  rampStatus: Record<number, RampStatus>
  onInputChange: (rampNumber: number, value: string) => void
}

export default function RampInputPanel({ rampStatus = {}, onInputChange }: RampInputPanelProps) {
  // Group ramps by section for better organization
  const topRamps = Array.from({ length: 11 }, (_, i) => 60 - i) // 60-50
  const rightRamps = Array.from({ length: 6 }, (_, i) => 49 - i) // 49-44
  const bottomRamps = Array.from({ length: 8 }, (_, i) => 43 - i) // 43-36

  // Safe input handler
  const handleInputChange = (rampNum: number, value: string) => {
    if (typeof onInputChange === "function") {
      onInputChange(rampNum, value)
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white/90 rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">Ramp Controls</h2>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Top Ramps (60-50)</h3>
          <div className="input-panel">
            {topRamps.map((rampNum) => (
              <div key={`input-${rampNum}`} className="input-group">
                <label htmlFor={`ramp-${rampNum}`} className="input-label">
                  Ramp {rampNum}
                </label>
                <input
                  id={`ramp-${rampNum}`}
                  type="text"
                  className="ramp-input"
                  value={rampStatus?.[rampNum]?.inputValue || ""}
                  onChange={(e) => handleInputChange(rampNum, e.target.value)}
                  placeholder="Enter status"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Right Ramps (49-44)</h3>
          <div className="input-panel">
            {rightRamps.map((rampNum) => (
              <div key={`input-${rampNum}`} className="input-group">
                <label htmlFor={`ramp-${rampNum}`} className="input-label">
                  Ramp {rampNum}
                </label>
                <input
                  id={`ramp-${rampNum}`}
                  type="text"
                  className="ramp-input"
                  value={rampStatus?.[rampNum]?.inputValue || ""}
                  onChange={(e) => handleInputChange(rampNum, e.target.value)}
                  placeholder="Enter status"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Bottom Ramps (43-36)</h3>
          <div className="input-panel">
            {bottomRamps.map((rampNum) => (
              <div key={`input-${rampNum}`} className="input-group">
                <label htmlFor={`ramp-${rampNum}`} className="input-label">
                  Ramp {rampNum}
                </label>
                <input
                  id={`ramp-${rampNum}`}
                  type="text"
                  className="ramp-input"
                  value={rampStatus?.[rampNum]?.inputValue || ""}
                  onChange={(e) => handleInputChange(rampNum, e.target.value)}
                  placeholder="Enter status"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
