"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { Save, ArrowLeft, Plus, X } from "lucide-react";
import FileUpload from "./FileUpload";

const CATS = ["accessories","clothing","handicrafts","merchandise"];

interface Props { initial?: Partial<Product>; isEdit?: boolean; }

export default function ProductForm({ initial={}, isEdit=false }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: initial.name||"",
    description: initial.description||"",
    price: initial.price||0,
    category: initial.category||"accessories",
    relatedSeries: initial.relatedSeries||"",
    stock: initial.stock||100,
    rating: initial.rating||4.5,
    reviews: initial.reviews||0,
    tags: initial.tags?.join(", ")||"",
  });
  const [images, setImages] = useState<string[]>(initial.images||[]);

  const set = (k:string, v: unknown) => setForm(f=>({...f,[k]:v}));

  const addImg = (url: string) => { if(url){setImages(i=>[...i,url]);} };
  const removeImg = (i:number) => setImages(imgs=>imgs.filter((_,j)=>j!==i));

  const submit = async () => {
    if(!form.name.trim()){setErr("Name is required.");return;}
    if(!form.price){setErr("Price is required.");return;}
    setSaving(true); setErr("");
    try {
      const payload = { ...form, price:+form.price, stock:+form.stock, rating:+form.rating, reviews:+form.reviews,
        images:images.filter(Boolean), tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean) };
      const url = isEdit?`/api/products/${(initial as Product)._id}`:"/api/products";
      const method = isEdit?"PUT":"POST";
      const r = await fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d = await r.json();
      if(d.error){setErr(d.error);setSaving(false);return;}
      setMsg(isEdit?"Product updated!":"Product created!");
      setTimeout(()=>router.push("/admin/products"),1200);
    } catch(e){setErr(String(e));setSaving(false);}
  };

  const inp = (label:string, key:string, type="text", placeholder="") => (
    <div>
      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>{label}</label>
      <input className="inp" type={type} placeholder={placeholder} value={String((form as Record<string,unknown>)[key]||"")} onChange={e=>set(key, type==="number"?+e.target.value:e.target.value)}/>
    </div>
  );

  return (
    <div style={{padding:"32px",maxWidth:800}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>router.back()}><ArrowLeft size={15}/></button>
        <div>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:600,color:"var(--text)"}}>{isEdit?"Edit Product":"New Product"}</h1>
          <p style={{color:"var(--muted)",fontSize:13}}>Fill in the product details below</p>
        </div>
      </div>

      {err&&<div style={{padding:"12px 16px",borderRadius:10,background:"rgba(248,113,113,.1)",color:"var(--danger)",fontSize:13,marginBottom:20,border:"1px solid rgba(248,113,113,.3)"}}>{err}</div>}
      {msg&&<div style={{padding:"12px 16px",borderRadius:10,background:"rgba(74,222,128,.1)",color:"var(--success)",fontSize:13,marginBottom:20,border:"1px solid rgba(74,222,128,.3)"}}>{msg}</div>}

      <div style={{display:"grid",gap:24}}>
        {/* Basic Info */}
        <div className="card" style={{padding:24}}>
          <h2 style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:20,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>Product Details</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{gridColumn:"1/-1"}}>{inp("Product Name *","name","text","Enter product name")}</div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Description *</label>
              <textarea className="inp" rows={4} placeholder="Product description..." value={form.description} onChange={e=>set("description",e.target.value)} style={{resize:"vertical"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Category *</label>
              <select className="inp" value={form.category} onChange={e=>set("category",e.target.value)}>
                {CATS.map(c=><option key={c} style={{textTransform:"capitalize"}}>{c}</option>)}
              </select>
            </div>
            {inp("Price (₹) *","price","number","999")}
            {inp("Stock","stock","number","100")}
            {inp("Rating (0-5)","rating","number","4.5")}
            {inp("Reviews Count","reviews","number","0")}
            {inp("Related Series","relatedSeries","text","Series name (optional)")}
            <div style={{gridColumn:"1/-1"}}>{inp("Tags (comma separated)","tags","text","accessories, premium, gift")}</div>
          </div>
        </div>

        {/* Images */}
        <div className="card" style={{padding:24}}>
          <h2 style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:20,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>Product Images</h2>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            {images.map((img,i)=>(
              <div key={i} style={{position:"relative",width:100,height:100}}>
                <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12,border:"1px solid var(--border)"}}/>
                <button onClick={()=>removeImg(i)} style={{position:"absolute",top:-6,right:-6,width:24,height:24,borderRadius:"50%",background:"var(--danger)",border:"2px solid var(--bg)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12} color="white"/></button>
              </div>
            ))}
            <div style={{ width: 100, height: 100 }}>
              <FileUpload type="image" onUpload={addImg} compact={true} />
            </div>
          </div>
          <p style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Click the plus icon above to upload product images from your device.</p>
        </div>

        {/* Save */}
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={()=>router.back()}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            <Save size={15}/>{saving?"Saving...":isEdit?"Update Product":"Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
