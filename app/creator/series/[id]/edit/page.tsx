"use client";
import { use, useEffect, useState } from "react";
import { Series } from "@/types";
import { useApp } from "@/store";
import CreatorSeriesForm from "@/components/screens/CreatorSeriesForm";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import { Mic } from "lucide-react";

// Client-fetched rather than a server component: the form needs the
// logged-in user (from the client store) to decide whether to show an
// edit screen at all. The server still re-checks ownership on every
// write — this page's check is just so you don't see someone else's
// series flash before a 403 comes back.
export default function EditCreatorSeries({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useApp(s => s.user);
  const [series, setSeries] = useState<Series | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/series/${id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d?._id) setSeries(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [id]);

  if (!loaded) return null;

  if (!series || !user || series.creatorId !== user._id) {
    return (
      <>
        <TopBar title="Edit series"/>
        <Screen>
          <EmptyState icon={<Mic size={22}/>} title="Can't edit this"
            body="This series either doesn't exist or isn't one you published."
            cta={{ href: "/creator", label: "Back to Creator Studio" }}/>
        </Screen>
      </>
    );
  }

  return <CreatorSeriesForm initial={series}/>;
}
