"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import { useLookup } from "@/contexts/lookup-context"

function ManualEntry() {
  const { addTruckTrailerPair, isLoading } = useLookup()
  const [truckNumber, setTruckNumber] = useState("")
  const [trailerNumber, setTrailerNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null)

  const handleTruckChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTruckNumber(e.target.value.trim())
    setMessage(null) // Clear message when typing
  }, [])

  const handleTrailerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTrailerNumber(e.target.value.trim())
    setMessage(null) // Clear message when typing
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!truckNumber || !trailerNumber) {
        setMessage({ type: "error", text: "Both truck and trailer numbers are required" })
        return
      }

      setIsSubmitting(true)
      setMessage(null)

      try {
        const actionMessage = await addTruckTrailerPair(truckNumber, trailerNumber)

        // Determine message type based on action
        const messageType = actionMessage.startsWith("Updated") ? "warning" : "success"
        setMessage({ type: messageType, text: `✅ ${actionMessage}` })

        // Clear the form after successful submission
        setTruckNumber("")
        setTrailerNumber("")
      } catch (error) {
        setMessage({ type: "error", text: error.message || "Failed to add pair" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [truckNumber, trailerNumber, addTruckTrailerPair],
  )

  const handleClear = useCallback(() => {
    setTruckNumber("")
    setTrailerNumber("")
    setMessage(null)
  }, [])

  const isFormValid = truckNumber.trim() !== "" && trailerNumber.trim() !== ""

  return (
    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
      <h4 className="font-semibold text-green-700 text-sm mb-2">Add New Truck-Trailer Pair:</h4>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={truckNumber}
            onChange={handleTruckChange}
            placeholder="Truck (e.g., 123)"
            className="px-2 py-1 border border-gray-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            disabled={isSubmitting || isLoading}
          />
          <input
            type="text"
            value={trailerNumber}
            onChange={handleTrailerChange}
            placeholder="Trailer (e.g., 321)"
            className="px-2 py-1 border border-gray-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="flex justify-center space-x-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting || isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Processing..." : "Add/Update Pair"}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting || isLoading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Message */}
      {message && (
        <div
          className={`mt-2 p-1 rounded text-xs text-center ${
            message.type === "success"
              ? "bg-green-100 text-green-700 border border-green-300"
              : message.type === "warning"
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}

export default memo(ManualEntry)
