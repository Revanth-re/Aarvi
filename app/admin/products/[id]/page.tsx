"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { Product } from "@/types";
export default function EditProduct() {
  const { id } = useParams() as { id:string };
  const [product, setProduct] = useState<Product|null>(null);
  useEffect(()=>{ fetch(`/api/products/${id}`).then(r=>r.json()).then(setProduct); },[id]);
  if(!product) return <div style={{padding:32,color:"var(--muted)"}}>Loading...</div>;
  return <ProductForm initial={product} isEdit/>;
}
