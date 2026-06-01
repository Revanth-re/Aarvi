"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Series, Episode } from "@/types";
import { usePlayer, useApp } from "@/store";
import { Play, Pause, Lock, Heart, Star, Clock, ArrowLeft, Mic, FileText, Globe, Users } from "lucide-react";

function fmt(s: number) { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

export default function SeriesDetail() {
  const { id } = useParams() as { id: string };
  const [series, setSeries] = useState<Series|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"episodes"|"about"|"transcript">("episodes");
  const [activeEp, setActiveEp] = useState<Episode|null>(null);
  const { ep: curEp, playing, setEp, setPlaying } = usePlayer();
  const { liked, toggleLike } = useApp();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/series/${id}`).then(r => r.json()).then(d => { setSeries(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="container-sm" style={{ paddingTop: 40 }}>
      <div className="skeleton" style={{ height: 300, borderRadius: 16, marginBottom: 24 }}/>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 8 }}/>)}
    </div>
  );
  if (!series?._id) return <div style={{ textAlign: "center", padding: "100px 24px", color: "var(--text3)" }}>Series not found.</div>;

  const isLiked = liked.includes(series._id);
  const firstFree = series.episodes?.find(e => !e.isLocked);

  return (
    <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <Link href="/series" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, marginBottom: 24, transition: "color .15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--text3)"}>
        <ArrowLeft size={14}/>Back to Series
      </Link>

      {/* Hero */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
        {series.coverImage && (
          <div style={{ height: 200, overflow: "hidden", position: "relative" }}>
            <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(1px)", transform: "scale(1.03)", opacity: .25 }}/>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--surface) 35%, transparent)" }}/>
          </div>
        )}
        <div style={{ display: "flex", gap: 20, padding: "24px", marginTop: series.coverImage ? -100 : 0, position: "relative", flexWrap: "wrap" }}>
          <div style={{ width: 130, height: 130, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "3px solid var(--border2)", boxShadow: "var(--shadow-lg)" }}>
            {series.coverImage ? <img src={series.coverImage} alt={series.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <div style={{ width: "100%", height: "100%", background: "var(--surface2)" }}/>}
          </div>
          <div style={{ flex: 1, minWidth: 200, paddingTop: series.coverImage ? 36 : 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="badge badge-accent">{series.genre}</span>
              {series.isTrending && <span className="badge badge-accent2">Trending</span>}
              {series.isFeatured && <span className="badge badge-muted">Featured</span>}
            </div>
            <h1 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 700, color: "var(--text)", marginBottom: 10, letterSpacing: "-.02em", lineHeight: 1.2 }}>{series.title}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Star size={13} color="#f59e0b" fill="#f59e0b"/>{series.rating}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13}/>{(series.totalPlays/1000).toFixed(0)}K plays</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13}/>{series.totalEpisodes} episodes</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={13}/>{series.language}</span>
              {series.narrator && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mic size={13}/>by {series.narrator}</span>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {firstFree && (
                <button className="btn btn-primary" onClick={() => setEp(firstFree, series)} style={{ boxShadow: "0 4px 16px var(--accent)30" }}>
                  <Play size={14} fill="currentColor"/>Play Episode 1
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => toggleLike(series._id)} style={{ color: isLiked ? "var(--accent2)" : "var(--text2)" }}>
                <Heart size={14} fill={isLiked ? "currentColor" : "none"}/>{isLiked ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--surface)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
        {(["episodes", "about", "transcript"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, textTransform: "capitalize", background: tab===t ? "var(--accent)" : "transparent", color: tab===t ? "#fff" : "var(--text3)", transition: "all .15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Episodes */}
      {tab === "episodes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {series.episodes?.map(ep => {
            const isCur = curEp?._id === ep._id;
            return (
              <div key={ep._id} onClick={() => { if (ep.isLocked) return; isCur ? setPlaying(!playing) : setEp(ep, series); setActiveEp(ep); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: ep.isLocked ? "default" : "pointer", background: isCur ? "var(--accent)12" : "var(--surface)", border: `1px solid ${isCur ? "var(--accent)44" : "var(--border)"}`, opacity: ep.isLocked ? .55 : 1, transition: "all .15s" }}
                onMouseEnter={e => { if (!ep.isLocked) (e.currentTarget as HTMLDivElement).style.borderColor = isCur ? "var(--accent)44" : "var(--border2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isCur ? "var(--accent)44" : "var(--border)"; }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: isCur ? "var(--accent)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ep.isLocked ? <Lock size={13} color="var(--text3)"/> :
                   isCur && playing ? <div className="eq" style={{ height: 14 }}><span style={{height:6}}/><span/><span/><span style={{height:10}}/></div> :
                   isCur ? <Pause size={13} color="#fff" fill="#fff"/> :
                   <span style={{ fontFamily: "var(--ff-mono)", fontSize: 12, color: "var(--text3)" }}>{ep.episodeNumber}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isCur ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title}</span>
                    {ep.isLocked && <span className="badge badge-muted" style={{ fontSize: 10, flexShrink: 0 }}>Premium</span>}
                    {ep.transcript && <FileText size={11} color="var(--text3)" style={{ flexShrink: 0 }}/>}
                  </div>
                  {ep.description && <p style={{ fontSize: 12, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{ep.description}</p>}
                </div>
                <span style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>{fmt(ep.duration)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* About */}
      {tab === "about" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text2)", marginBottom: 24 }}>{series.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
            {[["Genre",series.genre],["Language",series.language],["Narrator",series.narrator||"—"],["Episodes",series.totalEpisodes]].map(([k,v])=>(
              <div key={k} style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 5 }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{v}</p>
              </div>
            ))}
          </div>
          {series.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {series.tags.map(t => <span key={t} className="badge badge-muted">#{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {tab === "transcript" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {series.episodes?.filter(e => e.transcript).map(ep => (
              <button key={ep._id} onClick={() => setActiveEp(ep)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${activeEp?._id===ep._id?"var(--accent)":"var(--border2)"}`, background: activeEp?._id===ep._id?"var(--accent)":"var(--surface)", color: activeEp?._id===ep._id?"#fff":"var(--text3)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                Ep {ep.episodeNumber}: {ep.title}
              </button>
            ))}
          </div>
          {activeEp?.transcript ? (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20, fontFamily: "var(--ff-serif)", fontStyle: "italic" }}>{activeEp.title}</h3>
              <div style={{ fontSize: 15, color: "var(--text2)", lineHeight: 2, whiteSpace: "pre-wrap" }}>{activeEp.transcript}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <FileText size={32} color="var(--text3)" style={{ margin: "0 auto 12px" }}/>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>Select an episode above to read its transcript.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
