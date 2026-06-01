// "use client";
// import Link from "next/link";
// import { Series } from "@/types";
// import { Play, Heart, Star, Clock } from "lucide-react";
// import { useApp } from "@/store";

// export default function SeriesCard({ s }: { s: Series }) {
//   const { liked, toggleLike } = useApp();
//   const isLiked = liked.includes(s._id);
//   const fmtPlays = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);

//   return (
//     <Link href={`/series/${s._id}`} style={{ textDecoration: "none", display: "block" }}>
//       <article className="card card-hover" style={{ overflow: "hidden", height: "100%" }}>
//         {/* Cover */}
//         <div style={{ position: "relative", paddingBottom: "62%", overflow: "hidden", background: "var(--surface2)" }}>
//           {s.coverImage && (
//             <img src={s.coverImage} alt={s.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
//               onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
//               onMouseLeave={e => (e.currentTarget.style.transform = "")}/>
//           )}
//           <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 55%)" }}/>

//           {/* Badges */}
//           <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5 }}>
//             <span className="badge badge-accent" style={{ fontSize: 10 }}>{s.genre}</span>
//             {s.isTrending && <span className="badge badge-accent2" style={{ fontSize: 10 }}>Trending</span>}
//           </div>

//           {/* Like */}
//           <button onClick={e => { e.preventDefault(); toggleLike(s._id); }}
//             style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isLiked ? "var(--accent2)" : "#fff", backdropFilter: "blur(4px)" }}>
//             <Heart size={13} fill={isLiked ? "currentColor" : "none"}/>
//           </button>

//           {/* Play button on hover */}
//           <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }} className="play-ov">
//             <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
//               <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }}/>
//             </div>
//           </div>
//         </div>

//         {/* Info */}
//         <div style={{ padding: "14px 14px 16px" }}>
//           <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</h3>
//           <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.5 }}>{s.description}</p>
//           <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
//             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//               <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text3)" }}>
//                 <Star size={11} color="#f59e0b" fill="#f59e0b"/>{s.rating}
//               </span>
//               <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text3)" }}>
//                 <Clock size={11}/>{s.totalEpisodes} eps
//               </span>
//             </div>
//             <span style={{ color: "var(--text3)" }}>{fmtPlays(s.totalPlays)}</span>
//           </div>
//         </div>
//       </article>
//       <style>{`.card:hover .play-ov{opacity:1!important}`}</style>
//     </Link>
//   );
// }
"use client";
import Link from "next/link";
import { Series } from "@/types";
import { Play, Heart, Star, Clock } from "lucide-react";
import { useApp } from "@/store";

export default function SeriesCard({ s }: { s: Series }) {
  const { liked, toggleLike } = useApp();
  const isLiked = liked.includes(s._id);
  const fmtPlays = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);

  return (
    <Link href={`/series/${s._id}`} style={{ textDecoration: "none", display: "block", width: "100%" }}>
      <article className="card card-hover" style={{ overflow: "hidden", height: "100%", width: "100%" }}>
        {/* Cover */}
        <div style={{ position: "relative", paddingBottom: "62%", overflow: "hidden", background: "var(--surface2)" }}>
          {s.coverImage && (
            <img src={s.coverImage} alt={s.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}/>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 55%)" }}/>

          {/* Badges */}
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, maxWidth: "70%" }}>
            <span className="badge badge-accent" style={{ fontSize: 9, padding: "2px 7px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{s.genre}</span>
            {s.isTrending && <span className="badge badge-accent2" style={{ fontSize: 9, padding: "2px 7px" }}>🔥</span>}
          </div>

          {/* Like */}
          <button onClick={e => { e.preventDefault(); toggleLike(s._id); }}
            style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isLiked ? "var(--accent2)" : "#fff", backdropFilter: "blur(4px)" }}>
            <Heart size={13} fill={isLiked ? "currentColor" : "none"}/>
          </button>

          {/* Play button on hover */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }} className="play-ov">
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
              <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }}/>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card-info" style={{ padding: "14px 14px 16px" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</h3>
          <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", lineHeight: 1.5 }}>{s.description}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text3)" }}>
                <Star size={10} color="#f59e0b" fill="#f59e0b"/>{s.rating}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text3)" }}>
                <Clock size={10}/>{s.totalEpisodes} eps
              </span>
            </div>
            <span style={{ color: "var(--text3)" }}>{fmtPlays(s.totalPlays)}</span>
          </div>
        </div>
      </article>
      <style>{`.card:hover .play-ov{opacity:1!important}`}</style>
    </Link>
  );
}