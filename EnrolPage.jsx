import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EnrolPage() {
    const navigate = useNavigate();
  // Programs based on Komodo Hub conservation case study
    const programs = [
  { id: "species_awareness", name: "Endangered Species Awareness" },
  { id: "wildlife_reporting", name: "Wildlife Observation & Reporting" },
  { id: "conserve_animals", name: "How to conserve endangered species?" },
  { id: "importance_of_animals", name: "Importance of species" },
  { id: "community_library", name: "Community Knowledge Library" }
  ];

  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [message, setMessage] = useState("");

  const toggleProgram = (id) => {
    setMessage("");
    setSelectedPrograms((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  const handleEnrol = () => {
    if (selectedPrograms.length === 0) {
      setMessage("Please select at least one program.");
      return;
    }

    // Later you can save to Firebase here for reference
    setMessage("Successfully enrolled in selected programs!");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Times New Roman, serif",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(500px, 95vw)",
          background: "#fff",
          padding: 25,
          borderRadius: 12,
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        }}
      >
        <button onClick={() => navigate("/")}>
  ← Back to Login Page
</button>
        <h2 style={{ color: "#2E7D32", marginTop: 0 }}>
          Programs you can enrol in:
        </h2>

        {message && (
          <div
            style={{
              background: "#e6ffe6",
              padding: 10,
              marginBottom: 12,
              border: "1px solid green",
              borderRadius: 8,
              color: "#111",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {programs.map((program) => (
            <label
              key={program.id}
              style={{
                border: "1px solid #cfd8dc",
                borderRadius: 8,
                padding: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={selectedPrograms.includes(program.id)}
                onChange={() => toggleProgram(program.id)}
              />
              <span style={{ color: "#111", fontWeight: 600 }}>
                {program.name}
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleEnrol}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 12,
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Enrol Selected Programs
        </button>
      </div>
    </div>
  );
}