"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import { useLookup } from "@/contexts/lookup-context"
import { useSupabaseSync } from "@/contexts/supabase-sync-context"

// Memoized table row component to prevent unnecessary re-renders
const DataRow = memo(({ item, index }: { item: any; index: number }) => (
  <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
    <td className="px-1">{item.row}</td>
    <td className="px-1">{item.truck || "(empty)"}</td>
    <td className="px-1">{item.trailer || "(empty)"}</td>
  </tr>
))

DataRow.displayName = "DataRow"

// Memoized history row component
const HistoryRow = memo(({ item, index }: { item: any; index: number }) => (
  <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
    <td className="px-1">{item.input}</td>
    <td className="px-1">{item.type}</td>
    <td className="px-1">{item.result || "(not found)"}</td>
  </tr>
))

HistoryRow.displayName = "HistoryRow"

function DebugPanel() {
  const lookup = useLookup()
  const { syncId, syncError, connectionStatus, isSupabaseAvailable } = useSupabaseSync()

  // Safely destructure with defaults
  const {
    lookupData = [],
    lastUpdated = null,
    debugInfo = "No data loaded",
    lookupHistory = [],
    lookupTrailerByTruck,
    lookupTruckByTrailer,
  } = lookup || {}

  const [testInput, setTestInput] = useState("")
  const [testType, setTestType] = useState<"truck" | "trailer">("truck")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [matchType, setMatchType] = useState<"exact" | "prefix" | "none">("none")

  const runTest = useCallback(() => {
    if (!testInput || !lookupTrailerByTruck || !lookupTruckByTrailer) return

    if (testType === "truck") {
      const result = lookupTrailerByTruck(testInput)
      setTestResult(result)
      setMatchType(result ? "exact" : "none")
    } else {
      // For trailer lookups, we need to determine if it was an exact match or a prefix match
      const input = testInput.trim()

      // Check if there's an exact match first
      const exactMatch = lookupData.find((item) => item.trailer === input)

      // If no exact match and input doesn't start with "o-", check for "o-" prefix match
      const prefixMatch =
        !exactMatch && !input.toLowerCase().startsWith("o-")
          ? lookupData.find((item) => item.trailer === `o-${input}`)
          : null

      const result = lookupTruckByTrailer(input)
      setTestResult(result)

      if (exactMatch) {
        setMatchType("exact")
      } else if (prefixMatch) {
        setMatchType("prefix")
      } else {
        setMatchType("none")
      }
    }
  }, [testInput, testType, lookupTrailerByTruck, lookupTruckByTrailer, lookupData])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTestInput(e.target.value)
    setTestResult(null)
    setMatchType("none")
  }, [])

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTestType(e.target.value as "truck" | "trailer")
    setTestResult(null)
    setMatchType("none")
  }, [])

  return (
    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Debug Panel</h3>
        <span className="text-xs text-gray-500">
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : "No data loaded"}
        </span>
      </div>

      {/* Storage status */}
      <div className="mt-1 p-1 bg-gray-200 rounded">
        <span className="font-semibold">Storage Status:</span>{" "}
        {isSupabaseAvailable ? (
          <span className="text-green-600">Supabase connected - real-time sync active</span>
        ) : (
          <span className="text-orange-600">Local storage only (Device ID: {syncId.substring(0, 8)}...)</span>
        )}
        {syncError && <div className="text-red-500 text-xs mt-1">{syncError}</div>}
      </div>

      {/* Connection status */}
      <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded">
        <span className="font-semibold">Connection:</span>{" "}
        <span
          className={`font-medium ${
            connectionStatus === "connected"
              ? "text-green-600"
              : connectionStatus === "connecting"
                ? "text-yellow-600"
                : "text-red-600"
          }`}
        >
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
      </div>

      {/* Direct test section */}
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold">Direct Test:</h4>
        <div className="flex items-center mt-1 space-x-2">
          <select value={testType} onChange={handleTypeChange} className="border border-gray-300 rounded px-1 py-0.5">
            <option value="truck">Truck</option>
            <option value="trailer">Trailer</option>
          </select>
          <input
            type="text"
            value={testInput}
            onChange={handleInputChange}
            placeholder="Enter value to test"
            className="border border-gray-300 rounded px-1 py-0.5 flex-1"
          />
          <button
            onClick={runTest}
            className="bg-blue-500 text-white px-2 py-0.5 rounded disabled:opacity-50"
            disabled={!lookupTrailerByTruck || !lookupTruckByTrailer}
          >
            Test
          </button>
        </div>
        {testResult !== null && (
          <div className="mt-1">
            <span className="font-semibold">Result:</span> {testResult || "(not found)"}
            {matchType === "prefix" && testType === "trailer" && (
              <span className="ml-1 text-green-600 font-semibold">(matched with "o-" prefix)</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h4 className="font-semibold">Current Data ({lookupData.length} pairs):</h4>
        <div className="max-h-32 overflow-y-auto mt-1 border border-gray-300 p-1">
          {lookupData.length === 0 ? (
            <p className="text-gray-500 italic">No lookup data loaded</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-1">Row</th>
                  <th className="px-1">Truck</th>
                  <th className="px-1">Trailer</th>
                </tr>
              </thead>
              <tbody>
                {lookupData.map((item, index) => (
                  <DataRow key={index} item={item} index={index} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-2">
        <h4 className="font-semibold">Recent Lookups:</h4>
        <div className="max-h-32 overflow-y-auto mt-1 border border-gray-300 p-1">
          {lookupHistory.length === 0 ? (
            <p className="text-gray-500 italic">No lookups performed yet</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-1">Input</th>
                  <th className="px-1">Type</th>
                  <th className="px-1">Result</th>
                </tr>
              </thead>
              <tbody>
                {lookupHistory.map((item, index) => (
                  <HistoryRow key={index} item={item} index={index} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-2">
        <h4 className="font-semibold">Debug Info:</h4>
        <p className="mt-1">{debugInfo}</p>
      </div>

      {/* Add special note about trailer search */}
      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
        <h4 className="font-semibold text-green-700">Smart Trailer Search:</h4>
        <p className="mt-1">
          Trailer search works with or without the "o-" prefix. For example, if the database has "o-154", you can search
          for either "o-154" or just "154".
        </p>
      </div>
    </div>
  )
}

export default memo(DebugPanel)
