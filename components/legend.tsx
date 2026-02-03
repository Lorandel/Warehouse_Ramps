export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-item">
        <div className="legend-color inactive"></div>
        <span>Free ramp</span>
      </div>
      <div className="legend-item">
        <div className="legend-color active"></div>
        <span>Occupied</span>
      </div>
      <div className="legend-item">
        <div className="legend-color defect"></div>
        <span>Defect</span>
      </div>
    </div>
  )
}
