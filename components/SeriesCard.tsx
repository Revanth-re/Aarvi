// "use client";

// import Link from "next/link";
// import { Series } from "@/types";
// import { Play, Heart, Star, Clock } from "lucide-react";
// import { useApp } from "@/store";

// function formatPlays(n: number) {
//   if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
//   if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
//   return n.toString();
// }

// export default function SeriesCard({ series, size = "md" }: { series: Series; size?: "sm" | "md" | "lg" }) {
//   const { liked, toggleLike } = useApp();
//   const liked = liked.includes(series._id);

//   const isLg = size === "lg";
//   const isSm = size === "sm";

//   return (
//     <Link href={`/series/${series._id}`} className="block group">
//       <div
//         className="card-glow rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
//         style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
//       >
//         {/* Cover */}
//         <div
//           className={`relative overflow-hidden ${isLg ? "h-56" : isSm ? "h-36" : "h-44"}`}
//           style={{ background: "var(--color-surface-2)" }}
//         >
//           {series.coverImage ? (
//             // eslint-disable-next-line @next/next/no-img-element
//             <img
//               src={series.coverImage}
//               alt={series.title}
//               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
//             />
//           ) : (
//             <div className="w-full h-full flex items-center justify-center">
//               <Play size={32} style={{ color: "var(--color-text-muted)" }} />
//             </div>
//           )}

//           {/* Gradient overlay */}
//           <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />

//           {/* Genre badge */}
//           <div className="absolute top-3 left-3">
//             <span
//               className="px-2 py-0.5 rounded-full text-xs font-medium"
//               style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
//             >
//               {series.genre}
//             </span>
//           </div>

//           {/* Trending badge */}
//           {series.isTrending && (
//             <div className="absolute top-3 right-10">
//               <span
//                 className="px-2 py-0.5 rounded-full text-xs font-medium"
//                 style={{ background: "var(--color-accent-2)", color: "var(--color-bg)" }}
//               >
//                 Trending
//               </span>
//             </div>
//           )}

//           {/* Like button */}
//           <button
//             onClick={e => { e.preventDefault(); toggleLike(series._id); }}
//             className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
//             style={{ background: "rgba(0,0,0,0.4)", color: liked ? "var(--color-accent-2)" : "white" }}
//           >
//             <Heart size={14} fill={liked ? "currentColor" : "none"} />
//           </button>

//           {/* Play icon center on hover */}
//           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
//             <div
//               className="w-12 h-12 rounded-full flex items-center justify-center"
//               style={{ background: "var(--color-accent)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
//             >
//               <Play size={20} style={{ color: "var(--color-bg)" }} fill="currentColor" />
//             </div>
//           </div>
//         </div>

//         {/* Info */}
//         <div className={`${isSm ? "p-3" : "p-4"}`}>
//           <h3
//             className={`font-semibold leading-tight mb-1 ${isLg ? "text-lg" : "text-sm"}`}
//             style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", fontSize: isLg ? "1.1rem" : "0.95rem" }}
//           >
//             {series.title}
//           </h3>

//           {!isSm && (dfdv
//             <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--color-text-muted)" }}>
//               {series.description}
//             </p>
//           )}

//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="flex items-center gap-1">
//                 <Star size={11} style={{ color: "#f59e0b" }} fill="#f59e0b" />
//                 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{series.rating}</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <Clock size={11} style={{ color: "var(--color-text-muted)" }} />
//                 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{series.totalEpisodes} eps</span>
//               </div>
//             </div>
//             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
//               {formatPlays(series.totalPlays)} plays
//             </span>
//           </div>
//         </div>
//       </div>
//     </Link>
//   );dxfv
// }
"use client";

import Link from "next/link";
import { Series } from "@/types";
import { Play, Heart, Star, Clock } from "lucide-react";
import { useApp } from "@/store";

function formatPlays(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export default function SeriesCard({ series, size = "md" }: { series: Series; size?: "sm" | "md" | "lg" }) {
  const { liked, toggleLike } = useApp();
  const isLiked = liked.includes(series._id);

  const isLg = size === "lg";
  const isSm = size === "sm";

  return (
    <Link href={`/series/${series._id}`} className="block group w-full">
      <div
        className="card-glow rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer h-full w-full"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Cover */}
        <div
          className={`relative overflow-hidden w-full ${isLg ? "h-56" : isSm ? "h-36" : "h-44"}`}
          style={{ background: "var(--color-surface-2)" }}
        >
          {series.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={series.coverImage}
              alt={series.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={32} style={{ color: "var(--color-text-muted)" }} />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />

          {/* Genre badge */}
          <div className="absolute top-3 left-3">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
            >
              {series.genre}
            </span>
          </div>

          {/* Trending badge */}
          {series.isTrending && (
            <div className="absolute top-3 right-10">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "var(--color-accent-2)", color: "var(--color-bg)" }}
              >
                Trending
              </span>
            </div>
          )}

          {/* Like button */}
          <button
            onClick={e => { e.preventDefault(); toggleLike(series._id); }}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", color: isLiked ? "var(--color-accent-2)" : "white" }}
          >
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
          </button>

          {/* Play icon center on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-accent)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
            >
              <Play size={20} style={{ color: "var(--color-bg)" }} fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className={`${isSm ? "p-3" : "p-4"}`}>
          <h3
            className={`font-semibold leading-tight mb-1 ${isLg ? "text-lg" : "text-sm"}`}
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", fontSize: isLg ? "1.1rem" : "0.95rem" }}
          >
            {series.title}
          </h3>

          {!isSm && (
            <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--color-text-muted)" }}>
              {series.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star size={11} style={{ color: "#f59e0b" }} fill="#f59e0b" />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{series.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{series.totalEpisodes} eps</span>
              </div>
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatPlays(series.totalPlays)} plays
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

