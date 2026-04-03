import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PublicLibrary() {
  const navigate = useNavigate();

  const contents = useMemo(
    () => [
      {
        id: "intro_conservation",
        title: "Introduction to Animal Conservation",
        category: "Basics",
        summary: "What conservation is, why it matters, and how communities can help.",
        link: "https://www.worldwildlife.org/",
        body:
          "Animal conservation focuses on protecting species and habitats...\n\n" +
          "Key threats include habitat loss, pollution, disease spread, and exploitation.\n\n" +
          "Communities can help by reporting sightings responsibly, protecting habitats, and educating others.",
      },
      {
        id: "habitat_loss",
        title: "Habitat Loss: The Biggest Threat",
        category: "Threats",
        summary: "How habitat loss affects endangered species and what can be done.",
        link: "https://www.conservation.org/priorities/protecting-nature",
        body:
          "Habitat loss reduces food, shelter, and breeding grounds...\n\n" +
          "Solutions include protecting key areas, restoring ecosystems, and sustainable land use.",
      },
      {
        id: "responsible_sightings",
        title: "Responsible Wildlife Sighting Reports",
        category: "Action Guide",
        summary: "How to report sightings without putting animals or people at risk.",
        link: "https://www.iucnredlist.org/",
        body:
          "When reporting sightings, avoid sharing exact locations publicly...\n\n" +
          "Use verified channels, include time/date, and attach safe evidence where possible.",
      },
      {
        id: "endemic_species",
        title: "Indonesia’s Endemic Species",
        category: "Species",
        summary: "A brief overview of endemic and endangered species and why they’re unique.",
        link: "https://www.wwf.or.id/",
        body:
          "Endemic species exist only in specific regions...\n\n" +
          "Protecting endemic species also protects ecosystems and biodiversity.",
      },
      {
        id: "komodo_dragon",
        title: "Komodo Dragon Research",
        category: "Species",
        summary: "Learn more about Komodo Dragons.",
        link: "https://www.nationalgeographic.com/animals/reptiles/facts/komodo-dragon",
        body:
          "Komodo dragons are the largest living lizards...\n\n" +
          "Their survival depends on habitat protection and responsible tourism.\n\n" +
          "Read more from the official resource link below.",
      },
      {
        id: "wildlife_reporting_guide",
        title: "How to Report Wildlife Sightings",
        category: "Guide",
        summary: "Guide for safe wildlife reporting.",
        link: "https://www.iucnredlist.org/",
        body:
          "A good sighting report includes:\n" +
          "- Date and time\n" +
          "- General area (avoid exact locations publicly)\n" +
          "- Species (if known)\n" +
          "- Evidence (photo/video if safe)\n\n" +
          "Use official channels and follow local guidelines.",
      },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(contents[0]?.id || null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contents;
    return contents.filter((c) => {
      return (
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      );
    });
  }, [contents, query]);

  const active = useMemo(
    () => contents.find((c) => c.id === activeId) || null,
    [contents, activeId]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent", // if App.jsx handles background
        padding: 20,
        fontFamily: "Times New Roman, serif",
      }}
    >
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <h1 style={{ color: "#2E7D32", marginTop: 0 }}>Public Content Library</h1>
        <p style={{ marginTop: -6, color: "#111", opacity: 0.9 }}>
          Search and read resources about animal conservation.
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Login Page
        </button>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, category, or keyword..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #cfd8dc",
            outline: "none",
            background: "#fff",
            color: "#111",
            marginBottom: 16,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 16,
          }}
        >
          {/* Left: list */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e0e0e0",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                fontWeight: 700,
                color: "#111",
              }}
            >
              Contents ({filtered.length})
            </div>

            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {filtered.map((c) => {
                const selected = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      border: "none",
                      borderBottom: "1px solid #f2f2f2",
                      background: selected ? "#e8f5e9" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#111" }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: "#2E7D32", marginTop: 4 }}>
                      {c.category}
                    </div>
                    <div style={{ fontSize: 13, color: "#333", marginTop: 6 }}>
                      {c.summary}
                    </div>

                    {/*  Step 2: link button (only if link exists) */}
                    {c.link && (
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // prevent changing active item unexpectedly
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          padding: "6px 10px",
                          background: "#2E7D32",
                          color: "white",
                          borderRadius: 6,
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        📖 Open Resource
                      </a>
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ padding: 12, color: "#111" }}>
                  No results. Try a different search.
                </div>
              )}
            </div>
          </div>

          {/* Right: reader */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e0e0e0",
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
              padding: 16,
              minHeight: 300,
            }}
          >
            {!active ? (
              <div style={{ color: "#111" }}>Select a content item to read.</div>
            ) : (
              <>
                <h2 style={{ marginTop: 0, color: "#111" }}>{active.title}</h2>
                <div
                  style={{
                    color: "#2E7D32",
                    fontWeight: 700,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{active.category}</span>

                  {/*  also show link in reader */}
                  {active.link && (
                    <a
                      href={active.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "6px 10px",
                        background: "#2E7D32",
                        color: "white",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      📖 Open Resource
                    </a>
                  )}
                </div>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    color: "#111",
                  }}
                >
                  {active.body}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}