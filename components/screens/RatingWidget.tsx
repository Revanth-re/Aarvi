"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";

interface ReviewRow {
  _id: string; userId: string; userName: string; userHandle: string; userImage: string;
  stars: number; text: string; createdAt: string;
}

/** Tap-to-rate stars for the overall story/series, plus the average,
 *  count, and a short list of recent written reviews. Posting again
 *  edits your existing rating rather than adding a second one — same
 *  upsert behaviour the API already implements. */
export default function RatingWidget({ seriesId }: { seriesId: string }) {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [myStars, setMyStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [text, setText] = useState("");
  const [showTextBox, setShowTextBox] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/series/${seriesId}/reviews${user ? `?userId=${user._id}` : ""}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || d.error) return;
        setAvg(d.avg ?? 0); setCount(d.count ?? 0);
        setReviews(Array.isArray(d.reviews) ? d.reviews : []);
        if (d.myReview) setMyStars(d.myReview.stars);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [seriesId, user?._id]);

  const rate = async (stars: number) => {
    if (!user) { showToast("Log in to rate this", "info"); return; }
    setMyStars(stars);
    setSaving(true);
    try {
      const r = await fetch(`/api/series/${seriesId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, stars, text }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't save your rating", "error"); return; }
      setAvg(d.avg); setCount(d.count);
      showToast("Thanks for rating!", "success");
      setShowTextBox(false);
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="skeleton" style={{ height: 90, borderRadius: 16 }}/>;

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
          <Star size={15} fill="var(--coin)" color="var(--coin)"/>
          {avg.toFixed(1)} <span style={{ fontWeight: 500, color: "var(--text3)" }}>({count.toLocaleString()} rating{count === 1 ? "" : "s"})</span>
        </span>
      </div>

      <div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
          {myStars ? "Your rating" : "Rate this story"}
        </div>
        <div style={{ display: "flex", gap: 4 }} onMouseLeave={() => setHoverStars(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} disabled={saving}
              onClick={() => { rate(n); setShowTextBox(true); }}
              onMouseEnter={() => setHoverStars(n)}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <Star size={24}
                fill={n <= (hoverStars || myStars) ? "var(--coin)" : "none"}
                color={n <= (hoverStars || myStars) ? "var(--coin)" : "var(--text3)"}/>
            </button>
          ))}
        </div>
      </div>

      {showTextBox && myStars > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a short review (optional)" maxLength={800}/>
          <button onClick={() => rate(myStars)} disabled={saving} className="btn btn-soft btn-sm">
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}

      {reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          {reviews.slice(0, 5).map(r => (
            <div key={r._id} style={{ display: "flex", gap: 9 }}>
              <Avatar name={r.userName} image={r.userImage} size={26}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{r.userHandle}</span>
                  <span style={{ display: "flex", gap: 1 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={9} fill={n <= r.stars ? "var(--coin)" : "none"} color={n <= r.stars ? "var(--coin)" : "var(--text3)"}/>
                    ))}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--text3)" }}>{timeAgo(r.createdAt)}</span>
                </div>
                {r.text && <p style={{ fontSize: 12, color: "var(--text2)", margin: "3px 0 0", lineHeight: 1.5 }}>{r.text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
