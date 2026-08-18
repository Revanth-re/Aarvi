"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Credit } from "@/types";
import Avatar from "@/components/ui/Avatar";

const ROLES = ["Writer", "Narrator", "Voice Artist", "Editor", "Sound Design", "Contributor"];

interface SearchHit { _id: string; name: string; handle: string; image: string; }

/**
 * Tag other people as credits on a series (writer, narrator, voice
 * artist, etc.) — searches real accounts by name/handle so each credit
 * is tappable through to that person's profile (see Credit in
 * types/index.ts and the Credits section on SeriesDetail/[u]/[id]).
 */
export default function CreditsEditor({
  credits, onChange,
}: { credits: Credit[]; onChange: (c: Credit[]) => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim();
      if (!q) { setResults([]); return; }
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => setResults(Array.isArray(d.creators) ? d.creators : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const add = (u: SearchHit) => {
    if (credits.some(c => c.userId === u._id && c.role === role)) { setQuery(""); setResults([]); return; }
    onChange([...credits, { userId: u._id, name: u.name, image: u.image, role }]);
    setQuery(""); setResults([]);
  };
  const remove = (i: number) => onChange(credits.filter((_, j) => j !== i));

  return (
    <div>
      {!!credits.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {credits.map((c, i) => (
            <span key={`${c.userId}-${c.role}-${i}`} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 5px",
              borderRadius: "var(--r-pill)", background: "var(--surface2)", fontSize: 12,
            }}>
              <Avatar name={c.name} image={c.image} size={20}/>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
              <span style={{ color: "var(--text3)" }}>· {c.role}</span>
              <button onClick={() => remove(i)} aria-label={`Remove ${c.name}`} style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2,
              }}>
                <X size={12}/>
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input className="inp" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or @handle"/>
          {results.length > 0 && (
            <div className="card" style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
              padding: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto",
            }}>
              {results.map(u => (
                <button key={u._id} onClick={() => add(u)} type="button" style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8,
                  background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                }}>
                  <Avatar name={u.name} image={u.image} size={26}/>
                  <span style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{u.name}</span>
                    <span className="truncate" style={{ display: "block", fontSize: 11, color: "var(--text3)" }}>@{u.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select className="inp" value={role} onChange={e => setRole(e.target.value)} style={{ width: 130, flex: "none" }}>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      {searching && <p style={{ fontSize: 11, color: "var(--text3)", margin: "4px 0 0" }}>Searching…</p>}
    </div>
  );
}
