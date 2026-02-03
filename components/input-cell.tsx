"use client"

interface InputCellProps {
  value: string
  onChange: (value: string) => void
}

export function InputCell({ value, onChange }: InputCellProps) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
}
