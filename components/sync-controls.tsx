"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useSupabaseSync } from "@/contexts/supabase-sync-context"

export default function SyncControls() {
  const { syncId, setSyncId, isSyncing, syncError, lastSynced, isSupabaseAvailable, connectionStatus } =
    useSupabaseSync()

  const [isEditing, setIsEditing] = useState(false)
  const [newSyncId, setNewSyncId] = useState(syncId)
  const [copied, setCopied] = useState(false)

  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => !prev)
    setNewSyncId(syncId)
  }, [syncId])

  const handleSyncIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSyncId(e.target.value)
  }, [])

  const handleSyncIdSubmit = useCallback(() => {
    if (newSyncId && newSyncId !== syncId) {
      setSyncId(newSyncId)
      localStorage.setItem("warehouseSyncId", newSyncId)
    }
    setIsEditing(false)
  }, [newSyncId, syncId, setSyncId])

  const handleCopySyncId = useCallback(() => {
    navigator.clipboard.writeText(syncId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [syncId])

  const getStatusIcon = () => {
    if (!isSupabaseAvailable) return "🔴"
    if (connectionStatus === "connected") return "🟢"
    if (connectionStatus === "connecting") return "🟡"
    return "🔴"
  }

  const getStatusText = () => {
    if (!isSupabaseAvailable) return "HTML DB Local Only"
    if (connectionStatus === "connected") return "HTML DB Synced"
    if (connectionStatus === "connecting") return "Connecting HTML DB..."
    return "HTML DB Connection Failed"
  }

  return (
    <div className="flex items-center space-x-2">
      {isEditing ? (
        <>
          <input
            type="text"
            value={newSyncId}
            onChange={handleSyncIdChange}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
            placeholder="Enter HTML DB ID"
          />
          <button
            onClick={handleSyncIdSubmit}
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
          >
            Save
          </button>
          <button
            onClick={handleEditToggle}
            className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600">HTML DB ID:</span>
            <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded">{syncId.substring(0, 8)}...</span>
            <button
              onClick={handleCopySyncId}
              className="text-blue-500 hover:text-blue-700 text-xs"
              title="Copy HTML DB ID"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
          <button
            onClick={handleEditToggle}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
          >
            Change
          </button>
          <div className="flex items-center space-x-1">
            <span className="text-xs">{getStatusIcon()}</span>
            <span className="text-xs font-semibold">{getStatusText()}</span>
          </div>
          {isSyncing && <span className="text-xs text-blue-500">Syncing HTML DB...</span>}
          {syncError && (
            <span className="text-xs text-red-500" title={syncError}>
              HTML DB Error
            </span>
          )}
          {lastSynced && (
            <span className="text-xs text-gray-500">HTML DB synced: {lastSynced.toLocaleTimeString()}</span>
          )}
        </>
      )}
    </div>
  )
}
