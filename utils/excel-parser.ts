import * as XLSX from "xlsx"

// Define the structure of our truck-trailer mapping
export interface TruckTrailerMapping {
  truck: string
  trailer: string
  row: number
}

// Parse Excel file and extract truck-trailer mappings
export async function parseExcelFile(file: File): Promise<TruckTrailerMapping[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file")
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        if (!workbook.SheetNames.length) {
          throw new Error("Excel file contains no sheets")
        }

        // Assume the first sheet contains our data
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        if (!worksheet) {
          throw new Error("Failed to read worksheet")
        }

        // Convert to JSON for easier processing
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })

        const mappings: TruckTrailerMapping[] = []

        // Process each row (skip header row)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row) continue

          // Get truck and trailer values (columns A and B)
          const truck = row[0]?.toString().trim() || ""
          const trailer = row[1]?.toString().trim() || ""

          // Add to mappings (even if one is empty)
          mappings.push({
            truck,
            trailer,
            row: i + 1, // Excel rows are 1-based
          })
        }

        resolve(mappings)
      } catch (error) {
        console.error("Excel parsing error:", error)
        reject(error instanceof Error ? error : new Error("Unknown error parsing Excel file"))
      }
    }

    reader.onerror = (error) => {
      console.error("File reading error:", error)
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(file)
  })
}

// Generate test data for quick testing
export function generateTestData(): TruckTrailerMapping[] {
  const testData: TruckTrailerMapping[] = [
    { truck: "123", trailer: "A456", row: 2 },
    { truck: "124", trailer: "B789", row: 3 },
    { truck: "125", trailer: "C012", row: 4 },
    { truck: "126", trailer: "", row: 5 }, // Truck with no trailer
    { truck: "", trailer: "D345", row: 6 }, // Trailer with no truck
    { truck: "127", trailer: "E678", row: 7 },
    { truck: "128", trailer: "F901", row: 8 },
    { truck: "129", trailer: "G234", row: 9 },
    { truck: "130", trailer: "", row: 10 }, // Another truck with no trailer
    { truck: "80", trailer: "T80", row: 11 }, // Test for the specific issue
    { truck: "90", trailer: "T90", row: 12 }, // Another test case
    { truck: "100", trailer: "T100", row: 13 }, // Another test case
    // Add examples with "o-" prefix
    { truck: "200", trailer: "o-154", row: 14 },
    { truck: "201", trailer: "o-155", row: 15 },
    { truck: "202", trailer: "o-156", row: 16 },
    { truck: "203", trailer: "o-157", row: 17 },
    { truck: "204", trailer: "158", row: 18 }, // One without prefix for comparison
  ]

  return testData
}
