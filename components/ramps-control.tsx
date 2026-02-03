"use client"

import { useState, useEffect } from "react"
import { RampCell } from "./ramp-cell"
import { InputCell } from "./input-cell"

export default function RampsControl() {
  // State to track the status of each ramp
  const [rampStatus, setRampStatus] = useState<
    Record<
      number,
      {
        active: boolean
        red: boolean
        yellow: boolean
        inputValue: string
      }
    >
  >({})

  // Initialize ramp status
  useEffect(() => {
    const initialStatus: Record<number, any> = {}

    // Initialize ramps 60-36
    for (let i = 60; i >= 36; i--) {
      initialStatus[i] = {
        active: false,
        red: false,
        yellow: false,
        inputValue: "",
      }
    }

    setRampStatus(initialStatus)
  }, [])

  // Handle ramp cell click
  const handleRampClick = (rampNumber: number) => {
    setRampStatus((prev) => ({
      ...prev,
      [rampNumber]: {
        ...prev[rampNumber],
        active: !prev[rampNumber].active,
      },
    }))
  }

  // Handle input change
  const handleInputChange = (rampNumber: number, value: string) => {
    const lowerValue = value.trim().toLowerCase()

    setRampStatus((prev) => ({
      ...prev,
      [rampNumber]: {
        ...prev[rampNumber],
        inputValue: value,
        yellow: lowerValue === "defect",
        red: lowerValue !== "" && lowerValue !== "defect",
      },
    }))
  }

  // Scale table based on window size
  useEffect(() => {
    const scaleTable = () => {
      const table = document.querySelector(".vertical-table")
      const container = document.querySelector(".table-container")

      if (!table || !container) return

      const isPortrait = window.innerHeight > window.innerWidth

      if (!isPortrait) {
        const scale = Math.min(
          (window.innerWidth / table.clientWidth) * 0.9,
          (window.innerHeight / table.clientHeight) * 0.9,
        )
        ;(container as HTMLElement).style.transform = `scale(${scale})`
      } else {
        ;(container as HTMLElement).style.transform = ""
      }
    }

    window.addEventListener("resize", scaleTable)
    // Initial scaling
    setTimeout(scaleTable, 100) // Small delay to ensure DOM is ready

    return () => {
      window.removeEventListener("resize", scaleTable)
    }
  }, [])

  // Generate rows for ramps 60-50 and 49-45
  const generateTopRows = () => {
    const rows = []

    // Rows 60-50
    for (let i = 60; i >= 50; i--) {
      rows.push(createTableRow(i, 80 - i))
    }

    // Rows 49-45
    for (let i = 49; i >= 45; i--) {
      rows.push(createTableRow(i, 80 - i))
    }

    return rows
  }

  // Create a table row with left and right ramp numbers
  const createTableRow = (leftNum: number, rightNum: number) => {
    return (
      <tr key={`row-${leftNum}`}>
        <RampCell number={leftNum} status={rampStatus[leftNum]} onClick={() => handleRampClick(leftNum)} />
        <td colSpan={3} data-input-for={leftNum}>
          <InputCell
            value={rampStatus[leftNum]?.inputValue || ""}
            onChange={(value) => handleInputChange(leftNum, value)}
          />
        </td>
        <td></td>
        <td></td>
        <td colSpan={3} data-input-for={rightNum}>
          <InputCell
            value={rampStatus[rightNum]?.inputValue || ""}
            onChange={(value) => handleInputChange(rightNum, value)}
          />
        </td>
        <RampCell number={rightNum} status={rampStatus[rightNum]} onClick={() => handleRampClick(rightNum)} />
      </tr>
    )
  }

  return (
    <div className="table-container">
      <table className="vertical-table" id="ramps-table">
        <tbody>
          {/* Top rows (60-45) */}
          {generateTopRows()}

          {/* Special row for 44 */}
          <tr>
            <RampCell number={44} status={rampStatus[44]} onClick={() => handleRampClick(44)} />
            <td colSpan={3} data-input-for="44">
              <InputCell value={rampStatus[44]?.inputValue || ""} onChange={(value) => handleInputChange(44, value)} />
            </td>
            <td></td>
            <td></td>
            <td colSpan={4}></td>
          </tr>

          {/* Empty row */}
          <tr>
            <td colSpan={4}></td>
            <td></td>
            <td></td>
            <td colSpan={4}></td>
          </tr>

          {/* Bottom input row */}
          <tr>
            <td></td>
            {Array.from({ length: 8 }, (_, i) => (
              <td key={`input-${43 - i}`} data-input-for={43 - i}>
                <InputCell
                  value={rampStatus[43 - i]?.inputValue || ""}
                  onChange={(value) => handleInputChange(43 - i, value)}
                />
              </td>
            ))}
          </tr>

          {/* Bottom number row (43-36) */}
          <tr>
            <td></td>
            {Array.from({ length: 8 }, (_, i) => (
              <RampCell
                key={`cell-${43 - i}`}
                number={43 - i}
                status={rampStatus[43 - i]}
                onClick={() => handleRampClick(43 - i)}
              />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
