"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"

interface RampInputFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputType: "truck" | "trailer"
  rampNum: number
  isHighlighted?: boolean
}

export default function RampInputField({
  value,
  onChange,
  placeholder,
  inputType,
  rampNum,
  isHighlighted = false,
}: RampInputFieldProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousValueRef = useRef(value)

  // Update local value when prop value changes
  useEffect(() => {
    if (value !== previousValueRef.current) {
      setLocalValue(value)
      previousValueRef.current = value
    }
  }, [value])

  // Handle input change - now triggers onChange immediately for every keystroke
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)

      // Immediately trigger the onChange to perform lookup on every keystroke
      onChange(newValue)
      previousValueRef.current = newValue
    },
    [onChange],
  )

  // Still keep blur handler for any edge cases
  const handleBlur = useCallback(() => {
    // Only trigger if somehow the value changed without triggering handleChange
    if (localValue !== previousValueRef.current) {
      onChange(localValue)
      previousValueRef.current = localValue
    }
  }, [localValue, onChange])

  // Keep Enter key handler for convenience
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyPress={handleKeyPress}
      className={`input-field ${isHighlighted ? "highlight-filled" : ""}`}
      placeholder={placeholder}
      data-ramp={rampNum}
      data-input-type={inputType}
    />
  )
}
