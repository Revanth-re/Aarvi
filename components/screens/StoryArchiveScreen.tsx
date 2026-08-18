"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mic, Image as ImageIcon, Quote, Eye, EyeOff, Trash2, MessageCircle,
} from "lucide-react";
import { Story, StoryKind, Thought } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Screen, EmptyState, Sheet } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";

/* eslint-disable @next/next/no-img-element */

const KIND_ICON: Record<StoryKind, React.ComponentType<{ size?: number }>> = {
  audio: Mic, photo: ImageIcon, quote: Quote,
};

type Tab = "stories" | "thoughts";

/**
 * "See what you've posted each day" — every story/note you've ever
 * posted (Story.kind: audio/photo/quote), plus your Thoughts, kept
 * even after a story's 24h rail window passes (models/Story.ts no
 * longer hard-deletes on expiry, specifically so this screen has
 * something to show).
 */
export default function StoryArchiveScreen() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [tab, setTab] = useState<Tab>("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState<Story | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/stories?archive=1&userId=${user._id}`).then(r => r.json()),
      fetch(`/api/thoughts?authorId=${user._id}&userId=${user._id}&limit=60`).then(r => r.json()),
    ]).then(([s, t]) => {
      if (cancelled) return;
      if (Array.isArray(s)) setStories(s);
      if (Array.isArray(t)) setThoughts(t);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?._id]);

  const groupsByDay = <T extends { createdAt: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = new Date(item.createdAt).toLocaleDateString(undefined, {
        weekday: "long", month: "short", day: "numeric",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  };

  const toggleHide = async (s: Story) => {
    if (!user) return;
    try {
      const r = await fetch(`/api/stories/${s._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, hidden: !s.hidden }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't update", "error"); return; }
      setStories(prev => prev.map(x => x._id === s._id ? { ...x, hidden: d.hidden } : x));
      setViewing(v => v && v._id === s._id ? { ...v, hidden: d.hidden } : v);
    } catch { showToast("Network error", "error"); }
  };

  const deleteStory = async (s: Story) => {
    if (!user) return;
    if (!window.confirm("Delete this permanently? This can't be undone.")) return;
    try {
      const r = await fetch(`/api/stories/${s._id}?userId=${user._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't delete", "error"); return; }
      setStories(prev => prev.filter(x => x._id !== s._id));
      setViewing(null);
      showToast("Deleted", "success");
    } catch { showToast("Network error", "error"); }
  };

  const back = (
    <button onClick={() => router.back()} aria-label="Back"
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
      <ArrowLeft size={20}/>
    </button>
  );

  if (!user) {
    return (
      <>
        <TopBar title="Your archive"/>
        <Screen>{back}<p style={{ color: "var(--text3)", fontSize: 13 }}>Log in to see your archive.</p></Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Your archive"/>
      <Screen>
        {back}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("stories")} className={`btn btn-sm ${tab === "stories" ? "btn-primary" : "btn-soft"}`} style={{ flex: 1, justifyContent: "center" }}>
            Stories & notes
          </button>
          <button onClick={() => setTab("thoughts")} className={`btn btn-sm ${tab === "thoughts" ? "btn-primary" : "btn-soft"}`} style={{ flex: 1, justifyContent: "center" }}>
            Thoughts
          </button>
        </div>

        {!loaded ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 18 }}/>
        ) : tab === "stories" ? (
          stories.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {groupsByDay(stories).map(([day, items]) => (
                <section key={day}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".03em" }}>
                    {day}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {items.map(s => {
                      const Icon = KIND_ICON[s.kind];
                      return (
                        <button key={s._id} onClick={() => setViewing(s)} style={{
                          aspectRatio: "1", borderRadius: 12, border: "none", cursor: "pointer", padding: 0,
                          overflow: "hidden", position: "relative",
                          background: s.kind === "quote" ? "var(--grad)" : "var(--surface2)",
                        }}>
                          {s.kind === "photo" && s.mediaUrl ? (
                            <img src={s.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                          ) : s.kind === "quote" ? (
                            <span style={{
                              display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
                              padding: 8, fontSize: 10.5, fontWeight: 700, color: "#fff", textAlign: "center",
                            }}>
                              {s.caption.slice(0, 40)}
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)" }}>
                              <Icon size={22}/>
                            </span>
                          )}
                          {!s.live && (
                            <span style={{
                              position: "absolute", top: 4, right: 4, fontSize: 8, fontWeight: 800,
                              padding: "2px 5px", borderRadius: "var(--r-pill)",
                              background: "rgba(0,0,0,.55)", color: "#fff",
                            }}>
                              Expired
                            </span>
                          )}
                          {s.hidden && (
                            <span style={{ position: "absolute", bottom: 4, left: 4, color: "#fff" }}>
                              <EyeOff size={12}/>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Quote size={22}/>} title="Nothing posted yet"
              body="Stories and quotes you post show up here, even after they leave the 24h rail."/>
          )
        ) : (
          thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {groupsByDay(thoughts).map(([day, items]) => (
                <section key={day}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".03em" }}>
                    {day}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {items.map(t => (
                      <ThoughtCard key={t._id} thought={t}
                        onDeleted={id => setThoughts(prev => prev.filter(x => x._id !== id))}/>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState icon={<MessageCircle size={22}/>} title="No thoughts yet"
              body="Pin one from the player while you're listening."/>
          )
        )}
      </Screen>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title="Story">
        {viewing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              borderRadius: 16, overflow: "hidden", minHeight: 120,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: viewing.kind === "quote" ? "var(--grad)" : "var(--surface2)",
            }}>
              {viewing.kind === "photo" && viewing.mediaUrl ? (
                <img src={viewing.mediaUrl} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}/>
              ) : viewing.kind === "audio" && viewing.mediaUrl ? (
                <audio controls src={viewing.mediaUrl} style={{ width: "100%", margin: 16 }}/>
              ) : (
                <p style={{ padding: 24, fontSize: 18, fontWeight: 700, color: "#fff", textAlign: "center", margin: 0 }}>
                  {viewing.caption}
                </p>
              )}
            </div>
            {viewing.kind !== "quote" && viewing.caption && (
              <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>{viewing.caption}</p>
            )}
            <p style={{ fontSize: 11.5, color: "var(--text3)", margin: 0 }}>
              Posted {timeAgo(viewing.createdAt)} ago · {viewing.viewCount} view{viewing.viewCount === 1 ? "" : "s"}
              {!viewing.live && " · No longer on your story rail"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => toggleHide(viewing)} className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                {viewing.hidden ? <><Eye size={13}/>Unhide</> : <><EyeOff size={13}/>Hide from followers</>}
              </button>
              <button onClick={() => deleteStory(viewing)} className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", color: "var(--danger)" }}>
                <Trash2 size={13}/>Delete
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
