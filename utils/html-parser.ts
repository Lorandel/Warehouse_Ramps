import { parseDocument } from "htmlparser2"
import { DomUtils } from "htmlparser2"

// Define the structure of our truck-trailer mapping
export interface TruckTrailerMapping {
  truck: string
  trailer: string
  row: number
}

// Parse HTML file and extract truck-trailer mappings
export async function parseHtmlFile(file: File): Promise<TruckTrailerMapping[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file")
        }

        const htmlText = e.target.result as string
        const dom = parseDocument(htmlText)

        const trs = DomUtils.findAll((elem) => elem.name === "tr", dom.children)
        const truckTrailerPairs: TruckTrailerMapping[] = []
        const seenTrucks = new Set<string>()

        for (let i = 0; i < trs.length; i++) {
          const span = DomUtils.findOne(
            (el) =>
              el.name === "span" &&
              (el.attribs?.class === "x14" || el.attribs?.class === "x15") &&
              /^\d{2,3}$/.test(DomUtils.textContent(el).trim()),
            [trs[i]],
          )

          if (span) {
            const truckText = DomUtils.textContent(span).trim()
            const truckNum = Number.parseInt(truckText, 10)

            if (truckNum >= 80 && truckNum <= 399) {
              const truckID = truckNum.toString().padStart(3, "0")

              if (seenTrucks.has(truckID)) continue
              seenTrucks.add(truckID)

              let trailer = ""

              // Look for trailer in subsequent rows
              for (let j = 1; j <= 20; j++) {
                const nextTr = trs[i + j]
                if (!nextTr) break

                const tds = DomUtils.findAll((el) => el.name === "td", [nextTr])
                if (tds.length >= 8) {
                  const tdText = DomUtils.textContent(tds[7]).trim()
                  if (/^o-\d{3}$/i.test(tdText)) {
                    trailer = tdText.toUpperCase()
                    break
                  }
                }
              }

              truckTrailerPairs.push({
                truck: truckID,
                trailer: trailer,
                row: truckTrailerPairs.length + 2, // Start from row 2 like Excel
              })
            }
          }
        }

        resolve(truckTrailerPairs)
      } catch (error) {
        console.error("HTML parsing error:", error)
        reject(error instanceof Error ? error : new Error("Unknown error parsing HTML file"))
      }
    }

    reader.onerror = (error) => {
      console.error("File reading error:", error)
      reject(new Error("Failed to read file"))
    }

    reader.readAsText(file)
  })
}
