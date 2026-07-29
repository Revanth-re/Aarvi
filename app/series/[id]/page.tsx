import SeriesDetail from "@/components/screens/SeriesDetail";

export default async function SeriesPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SeriesDetail seriesId={id}/>;
}
