import { redirect } from "next/navigation";

// Browsing lives on Discover now (vibe + language + genre filters all
// in one place), so this old route forwards there rather than being a
// second, weaker catalog screen.
export default async function SeriesIndex({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const genre = typeof sp.genre === "string" ? sp.genre : "";
  redirect(genre ? `/discover?genre=${encodeURIComponent(genre)}` : "/discover");
}
