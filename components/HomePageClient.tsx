// // "use client";

// // import { useEffect, useState } from "react";
// // import Link from "next/link";
// // import { Series, Product } from "@/types";
// // import SeriesCard from "@/components/SeriesCard";
// // import ProductCard from "@/components/ProductCard";
// // import { ArrowRight, Headphones, TrendingUp, Sparkles, Radio } from "lucide-react";

// // export default function HomePageClient() {
// //   const [featured, setFeatured] = useState<Series[]>([]);
// //   const [trending, setTrending] = useState<Series[]>([]);
// //   const [products, setProducts] = useState<Product[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [seeded, setSeeded] = useState(false);

// //   const seed = async () => {
// //     const res = await fetch("/api/seed", { method: "POST" });
// //     const data = await res.json();
// //     if (data.series) setSeeded(true);
// //     fetchData();
// //   };

// //   const fetchData = async () => {
// //     try {
// //       const [featRes, trendRes, prodRes] = await Promise.all([
// //         fetch("/api/series?featured=true&limit=4"),
// //         fetch("/api/series?trending=true&limit=6"),
// //         fetch("/api/products?limit=4"),
// //       ]);
// //       const [feat, trend, prods] = await Promise.all([
// //         featRes.json(), trendRes.json(), prodRes.json()
// //       ]);
// //       if (Array.isArray(feat)) setFeatured(feat);
// //       if (Array.isArray(trend)) setTrending(trend);
// //       if (Array.isArray(prods)) setProducts(prods);
// //     } catch (err) {
// //       console.error(err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => { fetchData(); }, []);

// //   const isEmpty = !loading && featured.length === 0 && trending.length === 0;

// //   return (
// //     <div>
// //       {/* Hero */}
// //       <section
// //         className="relative overflow-hidden"
// //         style={{ background: "linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)" }}
// //       >
// //         <div className="absolute inset-0 overflow-hidden pointer-events-none">
// //           <div
// //             className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10"
// //             style={{ background: "var(--color-accent)", transform: "translate(30%, -30%)" }}
// //           />
// //           <div
// //             className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
// //             style={{ background: "var(--color-accent-2)", transform: "translate(-20%, 20%)" }}
// //           />
// //         </div>

// //         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
// //           <div className="max-w-2xl">
// //             <div
// //               className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
// //               style={{ background: "var(--color-surface-2)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
// //             >
// //               <Radio size={12} />
// //               Audio Stories & FM Series
// //             </div>

// //             <h1
// //               className="mb-6 leading-none"
// //               style={{
// //                 fontFamily: "var(--font-display)",
// //                 fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
// //                 fontWeight: 600,
// //                 color: "var(--color-text)",
// //                 lineHeight: 1.1,
// //               }}
// //             >
// //               Stories that
// //               <br />
// //               <span className="gradient-text italic">live in your ears.</span>
// //             </h1>

// //             <p className="text-base mb-8 max-w-lg" style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
// //               Immersive audio series across thriller, romance, sci-fi, and folklore. Listen with transcript. Shop exclusive merchandise. All in one place.
// //             </p>

// //             <div className="flex flex-wrap gap-3">
// //               <Link
// //                 href="/series"
// //                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
// //                 style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
// //               >
// //                 <Headphones size={16} />
// //                 Start Listening
// //               </Link>
// //               <Link
// //                 href="/shop"
// //                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
// //                 style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
// //               >
// //                 Visit Shop
// //                 <ArrowRight size={15} />
// //               </Link>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Decorative waveform */}
// //         <div className="absolute bottom-0 right-0 w-1/3 h-20 hidden lg:flex items-end justify-end pr-12 pb-4 gap-1">
// //           {[20,35,55,40,65,50,30,45,60,35,25,50,40,70,45,30,55,40,25,50].map((h, i) => (
// //             <div
// //               key={i}
// //               className="rounded-full flex-shrink-0"
// //               style={{
// //                 width: "4px",
// //                 height: `${h}%`,
// //                 background: "var(--color-accent)",
// //                 opacity: 0.3 + (i % 5) * 0.14,
// //               }}
// //             />
// //           ))}
// //         </div>
// //       </section>

// //       {/* Seed button if empty */}
// //       {isEmpty && (
// //         <div className="max-w-7xl mx-auto px-6 py-16 text-center">
// //           <p className="text-lg mb-6" style={{ color: "var(--color-text-muted)" }}>
// //             No content yet. Seed demo data to get started.
// //           </p>
// //           <button
// //             onClick={seed}
// //             className="px-8 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
// //             style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
// //           >
// //             <Sparkles size={16} className="inline mr-2" />
// //             Seed Demo Data
// //           </button>
// //         </div>
// //       )}

// //       {/* Featured */}
// //       {(loading || featured.length > 0) && (
// //         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
// //           <div className="flex items-center justify-between mb-6">
// //             <div className="flex items-center gap-2">
// //               <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
// //               <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
// //                 Featured Series
// //               </h2>
// //             </div>
// //             <Link href="/series?filter=featured" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
// //               View all <ArrowRight size={14} />
// //             </Link>
// //           </div>

// //           {loading ? (
// //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //               {[...Array(4)].map((_, i) => (
// //                 <div key={i} className="skeleton rounded-2xl h-64" />
// //               ))}
// //             </div>
// //           ) : (
// //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //               {featured.map((s) => <SeriesCard key={s._id} series={s} />)}
// //             </div>
// //           )}
// //         </section>
// //       )}

// //       {/* Trending */}
// //       {(loading || trending.length > 0) && (
// //         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
// //           <div className="flex items-center justify-between mb-6">
// //             <div className="flex items-center gap-2">
// //               <TrendingUp size={18} style={{ color: "var(--color-accent)" }} />
// //               <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
// //                 Trending Now
// //               </h2>
// //             </div>
// //             <Link href="/series" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
// //               All series <ArrowRight size={14} />
// //             </Link>
// //           </div>

// //           {loading ? (
// //             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
// //               {[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
// //             </div>
// //           ) : (
// //             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
// //               {trending.map((s) => <SeriesCard key={s._id} series={s} size="sm" />)}
// //             </div>
// //           )}
// //         </section>
// //       )}

// //       {/* Genre banner */}
// //       <section
// //         className="py-12"
// //         style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
// //       >
// //         <div className="max-w-7xl mx-auto px-4 sm:px-6">
// //           <h2 className="text-center text-lg font-medium mb-8" style={{ color: "var(--color-text-muted)" }}>
// //             Browse by genre
// //           </h2>
// //           <div className="flex flex-wrap gap-3 justify-center">
// //             {["Thriller", "Historical Adventure", "Romance Drama", "Sci-Fi", "Folklore", "Cyber Thriller"].map((genre) => (
// //               <Link
// //                 key={genre}
// //                 href={`/series?genre=${encodeURIComponent(genre)}`}
// //                 className="px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
// //                 style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
// //               >
// //                 {genre}
// //               </Link>
// //             ))}
// //           </div>
// //         </div>
// //       </section>

// //       {/* Shop preview */}
// //       {(loading || products.length > 0) && (
// //         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
// //           <div className="flex items-center justify-between mb-6">
// //             <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
// //               From the Shop
// //             </h2>
// //             <Link href="/shop" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
// //               See all <ArrowRight size={14} />
// //             </Link>
// //           </div>

// //           {loading ? (
// //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //               {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-72" />)}
// //             </div>
// //           ) : (
// //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //               {products.slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
// //             </div>
// //           )}
// //         </section>
// //       )}

// //       {/* Bottom CTA */}
// //       <section
// //         className="py-20"
// //         style={{ background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)", borderTop: "1px solid var(--color-border)" }}
// //       >
// //         <div className="max-w-2xl mx-auto text-center px-6">
// //           <h2
// //             className="mb-4"
// //             style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-text)", fontWeight: 600 }}
// //           >
// //             Your listening universe awaits.
// //           </h2>
// //           <p className="mb-8" style={{ color: "var(--color-text-muted)" }}>
// //             Hundreds of hours of original audio content. New episodes every week.
// //           </p>
// //           <Link
// //             href="/series"
// //             className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all hover:scale-105"
// //             style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
// //           >
// //             <Headphones size={18} />
// //             Explore All Series
// //           </Link>
// //         </div>
// //       </section>
// //     </div>
// //   );
// // }
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { Series, Product } from "@/types";
// import SeriesCard from "@/components/SeriesCard";
// import ProductCard from "@/components/ProductCard";
// import { ArrowRight, Headphones, TrendingUp, Sparkles, Radio } from "lucide-react";

// export default function HomePageClient() {
//   const [featured, setFeatured] = useState<Series[]>([]);
//   const [trending, setTrending] = useState<Series[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [seeded, setSeeded] = useState(false);

//   const seed = async () => {
//     const res = await fetch("/api/seed", { method: "POST" });
//     const data = await res.json();
//     if (data.series) setSeeded(true);
//     fetchData();
//   };

//   const fetchData = async () => {
//     try {
//       const [featRes, trendRes, prodRes] = await Promise.all([
//         fetch("/api/series?featured=true&limit=4"),
//         fetch("/api/series?trending=true&limit=6"),
//         fetch("/api/products?limit=4"),
//       ]);
//       const [feat, trend, prods] = await Promise.all([
//         featRes.json(), trendRes.json(), prodRes.json()
//       ]);
//       if (Array.isArray(feat)) setFeatured(feat);
//       if (Array.isArray(trend)) setTrending(trend);
//       if (Array.isArray(prods)) setProducts(prods);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchData(); }, []);

//   const isEmpty = !loading && featured.length === 0 && trending.length === 0;

//   return (
//     <div>
//       {/* Hero */}
//       <section
//         className="relative overflow-hidden"
//         style={{ background: "linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)" }}
//       >
//         <div className="absolute inset-0 overflow-hidden pointer-events-none">
//           <div
//             className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10"
//             style={{ background: "var(--color-accent)", transform: "translate(30%, -30%)" }}
//           />
//           <div
//             className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
//             style={{ background: "var(--color-accent-2)", transform: "translate(-20%, 20%)" }}
//           />
//         </div>

//         <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
//           <div className="max-w-2xl">
//             <div
//               className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
//               style={{ background: "var(--color-surface-2)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
//             >
//               <Radio size={12} />
//               Audio Stories & FM Series
//             </div>

//             <h1
//               className="mb-6 leading-none"
//               style={{
//                 fontFamily: "var(--font-display)",
//                 fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
//                 fontWeight: 600,
//                 color: "var(--color-text)",
//                 lineHeight: 1.1,
//               }}
//             >
//               Stories that
//               <br />
//               <span className="gradient-text italic">live in your ears.</span>
//             </h1>

//             <p className="text-base mb-8 max-w-lg" style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
//               Immersive audio series across thriller, romance, sci-fi, and folklore. Listen with transcript. Shop exclusive merchandise. All in one place.
//             </p>

//             <div className="flex flex-wrap gap-3">
//               <Link
//                 href="/series"
//                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
//                 style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
//               >
//                 <Headphones size={16} />
//                 Start Listening
//               </Link>
//               <Link
//                 href="/shop"
//                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
//                 style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
//               >
//                 Visit Shop
//                 <ArrowRight size={15} />
//               </Link>
//             </div>
//           </div>
//         </div>

//         {/* Decorative waveform */}
//         <div className="absolute bottom-0 right-0 w-1/3 h-20 hidden lg:flex items-end justify-end pr-12 pb-4 gap-1">
//           {[20,35,55,40,65,50,30,45,60,35,25,50,40,70,45,30,55,40,25,50].map((h, i) => (
//             <div
//               key={i}
//               className="rounded-full flex-shrink-0"
//               style={{
//                 width: "4px",
//                 height: `${h}%`,
//                 background: "var(--color-accent)",
//                 opacity: 0.3 + (i % 5) * 0.14,
//               }}
//             />
//           ))}
//         </div>
//       </section>

//       {/* Seed button if empty */}
//       {isEmpty && (
//         <div className="max-w-7xl mx-auto px-6 py-16 text-center">
//           <p className="text-lg mb-6" style={{ color: "var(--color-text-muted)" }}>
//             No content yet. Seed demo data to get started.
//           </p>
//           <button
//             onClick={seed}
//             className="px-8 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
//             style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
//           >
//             <Sparkles size={16} className="inline mr-2" />
//             Seed Demo Data
//           </button>
//         </div>
//       )}

//       {/* Featured */}
//       {(loading || featured.length > 0) && (
//         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center gap-2">
//               <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
//               <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
//                 Featured Series
//               </h2>
//             </div>
//             <Link href="/series?filter=featured" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
//               View all <ArrowRight size={14} />
//             </Link>
//           </div>

//           {loading ? (
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {[...Array(4)].map((_, i) => (
//                 <div key={i} className="skeleton rounded-2xl h-64" />
//               ))}
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {featured.map((s) => <SeriesCard key={s._id} series={s} />)}
//             </div>
//           )}
//         </section>
//       )}

//       {/* Trending */}
//       {(loading || trending.length > 0) && (
//         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center gap-2">
//               <TrendingUp size={18} style={{ color: "var(--color-accent)" }} />
//               <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
//                 Trending Now
//               </h2>
//             </div>
//             <Link href="/series" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
//               All series <ArrowRight size={14} />
//             </Link>
//           </div>

//           {loading ? (
//             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
//               {[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
//               {trending.map((s) => <SeriesCard key={s._id} series={s} size="sm" />)}
//             </div>
//           )}
//         </section>
//       )}

//       {/* Genre banner */}
//       <section
//         className="py-12"
//         style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
//       >
//         <div className="max-w-7xl mx-auto px-4 sm:px-6">
//           <h2 className="text-center text-lg font-medium mb-8" style={{ color: "var(--color-text-muted)" }}>
//             Browse by genre
//           </h2>
//           <div className="flex flex-wrap gap-3 justify-center">
//             {["Thriller", "Historical Adventure", "Romance Drama", "Sci-Fi", "Folklore", "Cyber Thriller"].map((genre) => (
//               <Link
//                 key={genre}
//                 href={`/series?genre=${encodeURIComponent(genre)}`}
//                 className="px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
//                 style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
//               >
//                 {genre}
//               </Link>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Shop preview */}
//       {(loading || products.length > 0) && (
//         <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
//               From the Shop
//             </h2>
//             <Link href="/shop" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
//               See all <ArrowRight size={14} />
//             </Link>
//           </div>

//           {loading ? (
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-72" />)}
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {products.slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
//             </div>
//           )}
//         </section>
//       )}

//       {/* Bottom CTA */}
//       <section
//         className="py-20"
//         style={{ background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)", borderTop: "1px solid var(--color-border)" }}
//       >
//         <div className="max-w-2xl mx-auto text-center px-6">
//           <h2
//             className="mb-4"
//             style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-text)", fontWeight: 600 }}
//           >
//             Your listening universe awaits.
//           </h2>
//           <p className="mb-8" style={{ color: "var(--color-text-muted)" }}>
//             Hundreds of hours of original audio content. New episodes every week.
//           </p>
//           <Link
//             href="/series"
//             className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all hover:scale-105"
//             style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
//           >
//             <Headphones size={18} />
//             Explore All Series
//           </Link>
//         </div>
//       </section>
//     </div>
//   );
// }
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Series, Product } from "@/types";
import SeriesCard from "@/components/SeriesCard";
import ProductCard from "@/components/ProductCard";
import { ArrowRight, Headphones, TrendingUp, Sparkles, Radio } from "lucide-react";

export default function HomePageClient() {
  const [featured, setFeatured] = useState<Series[]>([]);
  const [trending, setTrending] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const seed = async () => {
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    if (data.series) setSeeded(true);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [featRes, trendRes, prodRes] = await Promise.all([
        fetch("/api/series?featured=true&limit=4"),
        fetch("/api/series?trending=true&limit=6"),
        fetch("/api/products?limit=4"),
      ]);
      const [feat, trend, prods] = await Promise.all([
        featRes.json(), trendRes.json(), prodRes.json()
      ]);
      if (Array.isArray(feat)) setFeatured(feat);
      if (Array.isArray(trend)) setTrending(trend);
      if (Array.isArray(prods)) setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const isEmpty = !loading && featured.length === 0 && trending.length === 0;

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10"
            style={{ background: "var(--color-accent)", transform: "translate(30%, -30%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
            style={{ background: "var(--color-accent-2)", transform: "translate(-20%, 20%)" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: "var(--color-surface-2)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
            >
              <Radio size={12} />
              Audio Stories & FM Series
            </div>

            <h1
              className="mb-6 leading-none"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 600,
                color: "var(--color-text)",
                lineHeight: 1.1,
              }}
            >
              Stories that
              <br />
              <span className="gradient-text italic">live in your ears.</span>
            </h1>

            <p className="text-base mb-8 max-w-lg" style={{ color: "var(--color-text-muted)", lineHeight: 1.7 }}>
              Immersive audio series across thriller, romance, sci-fi, and folklore. Listen with transcript. Shop exclusive merchandise. All in one place.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/series"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
              >
                <Headphones size={16} />
                Start Listening
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
              >
                Visit Shop
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative waveform */}
        <div className="absolute bottom-0 right-0 w-1/3 h-20 hidden lg:flex items-end justify-end pr-12 pb-4 gap-1">
          {[20,35,55,40,65,50,30,45,60,35,25,50,40,70,45,30,55,40,25,50].map((h, i) => (
            <div
              key={i}
              className="rounded-full flex-shrink-0"
              style={{
                width: "4px",
                height: `${h}%`,
                background: "var(--color-accent)",
                opacity: 0.3 + (i % 5) * 0.14,
              }}
            />
          ))}
        </div>
      </section>

      {/* Seed button if empty */}
      {isEmpty && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-lg mb-6" style={{ color: "var(--color-text-muted)" }}>
            No content yet. Seed demo data to get started.
          </p>
          <button
            onClick={seed}
            className="px-8 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            <Sparkles size={16} className="inline mr-2" />
            Seed Demo Data
          </button>
        </div>
      )}

      {/* Featured */}
      {(loading || featured.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
              <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
                Featured Series
              </h2>
            </div>
            <Link href="/series?filter=featured" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton rounded-2xl h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {featured.map((s) => <SeriesCard key={s._id} series={s} />)}
            </div>
          )}
        </section>
      )}

      {/* Trending */}
      {(loading || trending.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} style={{ color: "var(--color-accent)" }} />
              <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
                Trending Now
              </h2>
            </div>
            <Link href="/series" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
              All series <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {trending.map((s) => <SeriesCard key={s._id} series={s} size="sm" />)}
            </div>
          )}
        </section>
      )}

      {/* Genre banner */}
      <section
        className="py-12"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-center text-lg font-medium mb-8" style={{ color: "var(--color-text-muted)" }}>
            Browse by genre
          </h2>
          <div className="scroll-x no-scroll" style={{ display: "flex", gap: 10, justifyContent: "center", paddingBottom: 4 }}>
            {["Thriller", "Historical Adventure", "Romance Drama", "Sci-Fi", "Folklore", "Cyber Thriller"].map((genre) => (
              <Link
                key={genre}
                href={`/series?genre=${encodeURIComponent(genre)}`}
                style={{
                  padding: "8px 20px",
                  borderRadius: 99,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  textDecoration: "none",
                  transition: "all .2s",
                }}
                className="hover:scale-105"
              >
                {genre}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop preview */}
      {(loading || products.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-text)" }}>
              From the Shop
            </h2>
            <Link href="/shop" className="text-sm flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-accent)" }}>
              See all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-72" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {products.slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </section>
      )}

      {/* Bottom CTA */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg) 100%)", borderTop: "1px solid var(--color-border)" }}
      >
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2
            className="mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-text)", fontWeight: 600 }}
          >
            Your listening universe awaits.
          </h2>
          <p className="mb-8" style={{ color: "var(--color-text-muted)" }}>
            Hundreds of hours of original audio content. New episodes every week.
          </p>
          <Link
            href="/series"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all hover:scale-105"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            <Headphones size={18} />
            Explore All Series
          </Link>
        </div>
      </section>
    </div>
  );
}