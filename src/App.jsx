import React, { useState } from "react";
import "./App.css";

const BEAM_LENGTH = 2700;
const NUM_BEAMS = 8;

export default function App() {
  const [requiredBeams, setRequiredBeams] = useState([
    { id: 1, length: 500, quantity: 2 },
    { id: 2, length: 800, quantity: 3 },
  ]);
  const [newLength, setNewLength] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [cuttingPlan, setCuttingPlan] = useState(null);
  const [error, setError] = useState("");

  const addBeamSize = () => {
    if (!newLength || !newQuantity || newLength <= 0 || newQuantity <= 0) {
      setError("Please enter valid length and quantity");
      return;
    }
    const id = Math.max(...requiredBeams.map((b) => b.id), 0) + 1;
    setRequiredBeams([
      ...requiredBeams,
      { id, length: parseInt(newLength), quantity: parseInt(newQuantity) },
    ]);
    setNewLength("");
    setNewQuantity("");
    setError("");
  };

  const removeBeamSize = (id) => {
    setRequiredBeams(requiredBeams.filter((b) => b.id !== id));
  };

  const calculateCuttingPlan = () => {
    setError("");

    // Flatten the required beams into a single list
    const needed = [];
    requiredBeams.forEach((b) => {
      for (let i = 0; i < b.quantity; i++) {
        needed.push(b.length);
      }
    });

    // Sort in descending order for better packing
    needed.sort((a, b) => b - a);

    const totalNeeded = needed.reduce((sum, len) => sum + len, 0);
    const totalCapacity = BEAM_LENGTH * NUM_BEAMS;

    if (totalNeeded > totalCapacity) {
      setError(
        `Impossible: Total length needed (${totalNeeded}mm) exceeds capacity (${totalCapacity}mm)`,
      );
      setCuttingPlan(null);
      return;
    }

    // First Fit Decreasing algorithm
    const beams = Array(NUM_BEAMS)
      .fill(null)
      .map(() => ({ remaining: BEAM_LENGTH, cuts: [] }));
    const unfit = [];

    needed.forEach((length) => {
      let placed = false;
      for (let i = 0; i < beams.length; i++) {
        if (beams[i].remaining >= length) {
          beams[i].cuts.push({ length, type: "keep" });
          beams[i].remaining -= length;
          placed = true;
          break;
        }
      }
      if (!placed) {
        unfit.push(length);
      }
    });

    if (unfit.length > 0) {
      setError(
        `Impossible: Cannot fit beams of lengths: ${unfit.join(", ")}mm into available space`,
      );
      setCuttingPlan(null);
      return;
    }

    setCuttingPlan(beams);
  };

  return (
    <div className="container">
      <h1>Beam Cutting Optimizer</h1>
      <p className="info">
        Total beams: {NUM_BEAMS} × {BEAM_LENGTH}mm
      </p>

      <section className="input-section">
        <h2>Required Beam Sizes</h2>
        <table className="beams-table">
          <thead>
            <tr>
              <th>Length (mm)</th>
              <th>Quantity</th>
              <th>Total (mm)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requiredBeams.map((beam) => (
              <tr key={beam.id}>
                <td>{beam.length}</td>
                <td>{beam.quantity}</td>
                <td>{beam.length * beam.quantity}</td>
                <td>
                  <button
                    onClick={() => removeBeamSize(beam.id)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="add-beam">
          <input
            type="number"
            placeholder="Length (mm)"
            value={newLength}
            onChange={(e) => setNewLength(e.target.value)}
            min="1"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            min="1"
          />
          <button onClick={addBeamSize} className="btn-primary">
            Add Size
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </section>

      <button onClick={calculateCuttingPlan} className="btn-calculate">
        Calculate Cutting Plan
      </button>

      {cuttingPlan && (
        <section className="results-section">
          <h2>Cutting Plan</h2>
          <div className="beams-visualization">
            {cuttingPlan.map((beam, beamIndex) => (
              <div key={beamIndex} className="beam-container">
                <h3>Beam {beamIndex + 1}</h3>
                <div className="beam">
                  <div className="beam-visual">
                    {beam.cuts.map((cut, cutIndex) => {
                      const percentage = (cut.length / BEAM_LENGTH) * 100;
                      return (
                        <div
                          key={cutIndex}
                          className="cut"
                          style={{ width: `${percentage}%` }}
                          title={`${cut.length}mm`}
                        >
                          {cut.length > 100 ? `${cut.length}mm` : ""}
                        </div>
                      );
                    })}
                    {beam.remaining > 0 && (
                      <div
                        className="waste"
                        style={{
                          width: `${(beam.remaining / BEAM_LENGTH) * 100}%`,
                        }}
                        title={`Waste: ${beam.remaining}mm`}
                      >
                        {beam.remaining > 100 ? `${beam.remaining}mm` : ""}
                      </div>
                    )}
                  </div>
                  <div className="beam-info">
                    <p>
                      Used: <strong>{BEAM_LENGTH - beam.remaining}mm</strong> (
                      {Math.round(
                        ((BEAM_LENGTH - beam.remaining) / BEAM_LENGTH) * 100,
                      )}
                      %)
                    </p>
                    <p>
                      Waste: <strong>{beam.remaining}mm</strong>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="summary">
            <h3>Summary</h3>
            <p>
              Total material used:{" "}
              <strong>
                {cuttingPlan.reduce(
                  (sum, b) => sum + (BEAM_LENGTH - b.remaining),
                  0,
                )}
                mm
              </strong>
            </p>
            <p>
              Total waste:{" "}
              <strong>
                {cuttingPlan.reduce((sum, b) => sum + b.remaining, 0)}mm
              </strong>
            </p>
            <p>
              Efficiency:{" "}
              <strong>
                {Math.round(
                  (cuttingPlan.reduce(
                    (sum, b) => sum + (BEAM_LENGTH - b.remaining),
                    0,
                  ) /
                    (BEAM_LENGTH * NUM_BEAMS)) *
                    100,
                )}
                %
              </strong>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
