"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SeriesForm from "@/components/admin/SeriesForm";
import { Series } from "@/types";
export default function EditSeries() {
  const { id } = useParams() as { id:string };
  const [series, setSeries] = useState<Series|null>(null);
  useEffect(()=>{ fetch(`/api/series/${id}`).then(r=>r.json()).then(setSeries); },[id]);
  if(!series) return <div style={{padding:32,color:"var(--muted)"}}>Loading...</div>;
  return <SeriesForm initial={series} isEdit/>;
}
