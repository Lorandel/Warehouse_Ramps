"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type TruckTrailerMapping, parseExcelFile } from "@/utils/excel-parser"

interface MappingContextType {
  mappings: TruckTrailerMapping[]
  isLoading: boolean
  error: string | null
  uploadExcel: (file: File) => Promise<void>
  findTrailerByTruck: (truck: string) => string
  findTruckByTrailer: (trailer: string) => string
  lastUpdated: Date | null
}

const MappingContext = createContext<MappingContextType | undefined>(undefined)

export function MappingProvider({ children }: { children: React.ReactNode }) {
  const [mappings, setMappings] = useState<TruckTrailerMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load mappings from localStorage on initial render
  useEffect(() => {
    const savedMappings = localStorage.getItem("truckTrailerMappings")
    const savedTimestamp = localStorage.getItem("mappingsLastUpdated")

    if (savedMappings) {
      try {
        setMappings(JSON.parse(savedMappings))
        if (savedTimestamp) {
          setLastUpdated(new Date(savedTimestamp))
        }
      } catch (e) {
        console.error("Failed to load saved mappings", e)
      }
    }
  }, [])

  // Function to upload and parse Excel file
  const uploadExcel = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const newMappings = await parseExcelFile(file)
      setMappings(newMappings)

      // Save to localStorage for persistence
      localStorage.setItem("truckTrailerMappings", JSON.stringify(newMappings))

      const now = new Date()
      setLastUpdated(now)
      localStorage.setItem("mappingsLastUpdated", now.toISOString())

      setIsLoading(false)
    } catch (e) {
      setError("Failed to parse Excel file. Please check the format and try again.")
      setIsLoading(false)
      console.error(e)
    }
  }

  // Lookup functions
  const findTrailerByTruck = (truck: string): string => {
    if (!truck) return ""
    const mapping = mappings.find((m) => m.truck.toLowerCase() === truck.toLowerCase())
    return mapping?.trailer || ""
  }

  const findTruckByTrailer = (trailer: string): string => {
    if (!trailer) return ""
    const mapping = mappings.find((m) => m.trailer.toLowerCase() === trailer.toLowerCase())
    return mapping?.truck || ""
  }

  return (
    <MappingContext.Provider
      value={{
        mappings,
        isLoading,
        error,
        uploadExcel,
        findTrailerByTruck,
        findTruckByTrailer,
        lastUpdated,
      }}
    >
      {children}
    </MappingContext.Provider>
  )
}

export function useMapping() {
  const context = useContext(MappingContext)
  if (context === undefined) {
    throw new Error("useMapping must be used within a MappingProvider")
  }
  return context
}
