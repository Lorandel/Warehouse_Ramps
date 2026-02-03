"use client"

interface RampCellProps {
  number: number
  status:
    | {
        active: boolean
        red: boolean
        yellow: boolean
      }
    | undefined
  onClick: () => void
}

export function RampCell({ number, status, onClick }: RampCellProps) {
  if (!status) {
    return <td data-number={number}>{number}</td>
  }

  const { active, red, yellow } = status

  const classNames = ["data-number", active ? "active" : "", red ? "red" : "", yellow ? "yellow" : ""]
    .filter(Boolean)
    .join(" ")

  return (
    <td data-number={number} className={classNames || undefined} onClick={onClick}>
      {number}
    </td>
  )
}
