"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import { useLookup } from "@/contexts/lookup-context"
import ManualEntry from "./manual-entry"

function HtmlUploader() {
  const { uploadHtml, clearData, isLoading, error, lastUpdated, dataCount, forceRefresh } = useLookup()
  const [isDragging, setIsDragging] = useState(false)
  const [mergeMode, setMergeMode] = useState(true) // Default to merge mode
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        await uploadHtml(files[0], mergeMode)
        // Clear the input value so the same file can be uploaded again if needed
        e.target.value = ""
      }
    },
    [uploadHtml, mergeMode],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        await uploadHtml(files[0], mergeMode)
      }
    },
    [uploadHtml, mergeMode],
  )

  const handleMergeModeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMergeMode(e.target.checked)
  }, [])

  const handleForceRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await forceRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [forceRefresh])

  return (
    <div className="mb-4">
      {/* Data Count and Sync Status */}
      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-green-700">📊 Database: {dataCount} truck-trailer pairs</span>
            {lastUpdated && (
              <span className="text-xs text-green-600">(Updated: {lastUpdated.toLocaleTimeString()})</span>
            )}
          </div>
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing || isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium disabled:cursor-not-allowed transition-colors"
          >
            {isRefreshing ? "🔄 Syncing..." : "🔄 Force Sync"}
          </button>
        </div>
        <p className="text-xs text-green-600 mt-1">
          All devices should show the same count. If not, click "Force Sync" to refresh from server.
        </p>
      </div>

      {/* Merge Mode Toggle - Dynamic colors based on state */}
      <div
        className={`mb-3 p-2 rounded ${mergeMode ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
      >
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={mergeMode}
            onChange={handleMergeModeChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className={`text-sm font-medium ${mergeMode ? "text-green-700" : "text-red-700"}`}>
            Smart Merge Mode (Recommended)
          </span>
        </label>
      </div>

      <div
        className={`border-2 border-dashed p-4 rounded-lg text-center cursor-pointer ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <input id="file-upload" type="file" accept=".html,.htm" onChange={handleFileChange} className="hidden" />
        <p className="text-sm">{isLoading ? "Processing..." : "Drop HTML file here or click to upload"}</p>
        <p className="text-xs mt-1">
          {mergeMode
            ? "Smart merge: Updates only trucks from new HTML, preserves other existing pairs"
            : "Full replace: Replaces ALL existing data with new HTML"}
        </p>
        {lastUpdated && <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated.toLocaleString()}</p>}
        {dataCount > 0 && (
          <p className="text-xs text-green-600 font-semibold">{dataCount} truck-trailer pairs loaded</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex justify-center space-x-2">
        <button
          onClick={clearData}
          disabled={isLoading || isRefreshing}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm disabled:cursor-not-allowed transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Manual Entry Component */}
      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
        <ManualEntry />
      </div>
    </div>
  )
}

export default memo(HtmlUploader)
