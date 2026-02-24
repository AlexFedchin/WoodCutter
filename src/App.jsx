import React, { useState, useRef } from "react";
import "./App.css";
import html2pdf from "html2pdf.js";

const DEFAULT_BEAM_LENGTH = 2700;
const DEFAULT_NUM_BEAMS = 8;

export default function App() {
  const cuttingPlanRef = useRef();

  const [originalBeams, setOriginalBeams] = useState([
    { id: 1, length: DEFAULT_BEAM_LENGTH, quantity: DEFAULT_NUM_BEAMS },
  ]);
  const [newOriginalLength, setNewOriginalLength] = useState("");
  const [newOriginalQuantity, setNewOriginalQuantity] = useState("");

  const [requiredBeams, setRequiredBeams] = useState([
    { id: 1, length: 504, quantity: 12 },
    { id: 2, length: 281, quantity: 12 },
    { id: 3, length: 850, quantity: 12 },
  ]);
  const [newLength, setNewLength] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const [cuttingPlan, setCuttingPlan] = useState(null);
  const [error, setError] = useState("");

  // Original beams handlers
  const addOriginalBeam = () => {
    if (
      !newOriginalLength ||
      !newOriginalQuantity ||
      newOriginalLength <= 0 ||
      newOriginalQuantity <= 0
    ) {
      setError("Please enter valid length and quantity for original beams");
      return;
    }
    const id = Math.max(...originalBeams.map((b) => b.id), 0) + 1;
    setOriginalBeams([
      ...originalBeams,
      {
        id,
        length: parseInt(newOriginalLength),
        quantity: parseInt(newOriginalQuantity),
      },
    ]);
    setNewOriginalLength("");
    setNewOriginalQuantity("");
    setError("");
  };

  const removeOriginalBeam = (id) => {
    if (originalBeams.length === 1) {
      setError("You must have at least one original beam size");
      return;
    }
    setOriginalBeams(originalBeams.filter((b) => b.id !== id));
  };

  // Required beams handlers
  const addBeamSize = () => {
    if (!newLength || !newQuantity || newLength <= 0 || newQuantity <= 0) {
      setError("Please enter valid length and quantity for required beams");
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

    // Flatten the original beams into a list
    const available = [];
    originalBeams.forEach((b) => {
      for (let i = 0; i < b.quantity; i++) {
        available.push({
          length: b.length,
          index: available.length,
        });
      }
    });

    const totalNeeded = needed.reduce((sum, len) => sum + len, 0);
    const totalCapacity = available.reduce((sum, b) => sum + b.length, 0);

    if (totalNeeded > totalCapacity) {
      setError(
        `Impossible: Total length needed (${totalNeeded}mm) exceeds total capacity (${totalCapacity}mm)`,
      );
      setCuttingPlan(null);
      return;
    }

    // First Fit Decreasing algorithm
    const beams = available.map((beam) => ({
      originalLength: beam.length,
      remaining: beam.length,
      cuts: [],
      beamIndex: beam.index,
    }));
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

  const totalOriginalCapacity = originalBeams.reduce(
    (sum, b) => sum + b.length * b.quantity,
    0,
  );
  const totalRequiredLength = requiredBeams.reduce(
    (sum, b) => sum + b.length * b.quantity,
    0,
  );

  const exportToPDF = () => {
    if (!cuttingPlanRef.current) return;

    const element = cuttingPlanRef.current;
    const opt = {
      margin: 10,
      filename: "cutting-plan.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="container">
      <h1>Beam Cutting Optimizer</h1>

      <section className="input-section">
        <h2>Available Original Beams</h2>
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
            {originalBeams.map((beam) => (
              <tr key={beam.id}>
                <td>{beam.length}</td>
                <td>{beam.quantity}</td>
                <td>{beam.length * beam.quantity}</td>
                <td>
                  <button
                    onClick={() => removeOriginalBeam(beam.id)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="info">
          Total available capacity: <strong>{totalOriginalCapacity}mm</strong>
        </p>

        <div className="add-beam">
          <input
            type="number"
            placeholder="Length (mm)"
            value={newOriginalLength}
            onChange={(e) => setNewOriginalLength(e.target.value)}
            min="1"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newOriginalQuantity}
            onChange={(e) => setNewOriginalQuantity(e.target.value)}
            min="1"
          />
          <button onClick={addOriginalBeam} className="btn-primary">
            Add Original Beam Size
          </button>
        </div>
      </section>

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

        <p className="info">
          Total required length: <strong>{totalRequiredLength}mm</strong>
        </p>

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
            Add Required Size
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </section>

      <button onClick={calculateCuttingPlan} className="btn-calculate">
        Calculate Cutting Plan
      </button>

      {cuttingPlan && (
        <section className="results-section" ref={cuttingPlanRef}>
          <h2>Cutting Plan</h2>
          <button onClick={exportToPDF} className="btn-export">
            Export as PDF
          </button>
          <div className="beams-visualization">
            {cuttingPlan.map((beam, beamIndex) => (
              <div key={beamIndex} className="beam-container">
                <h3>
                  Beam {beamIndex + 1} ({beam.originalLength}mm)
                </h3>
                <div className="beam">
                  <div className="beam-visual">
                    {beam.cuts.map((cut, cutIndex) => {
                      const percentage =
                        (cut.length / beam.originalLength) * 100;
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
                          width: `${(beam.remaining / beam.originalLength) * 100}%`,
                        }}
                        title={`Waste: ${beam.remaining}mm`}
                      >
                        {beam.remaining > 100 ? `${beam.remaining}mm` : ""}
                      </div>
                    )}
                  </div>
                  <div className="beam-info">
                    <p>
                      Used:{" "}
                      <strong>{beam.originalLength - beam.remaining}mm</strong>{" "}
                      (
                      {Math.round(
                        ((beam.originalLength - beam.remaining) /
                          beam.originalLength) *
                          100,
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
                  (sum, b) => sum + (b.originalLength - b.remaining),
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
                    (sum, b) => sum + (b.originalLength - b.remaining),
                    0,
                  ) /
                    cuttingPlan.reduce((sum, b) => sum + b.originalLength, 0)) *
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
