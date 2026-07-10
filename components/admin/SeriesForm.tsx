"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Series, Episode } from "@/types";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, ArrowLeft } from "lucide-react";
import FileUpload from "./FileUpload";
import { adminFetch } from "@/lib/adminFetch";

const GENRES = ["Thriller","Historical Adventure","Romance Drama","Sci-Fi","Folklore","Cyber Thriller","Comedy","Horror","Fantasy","True Crime","News","Education","Kids"];

interface Props { initial?: Partial<Series>; isEdit?: boolean; }

export default function SeriesForm({ initial={}, isEdit=false }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: initial.title||"",
    description: initial.description||"",
    coverImage: initial.coverImage||"",
    genre: initial.genre||"Thriller",
    language: initial.language||"English",
    narrator: initial.narrator||"",
    rating: initial.rating||4.5,
    isFeatured: initial.isFeatured||false,
    isTrending: initial.isTrending||false,
    tags: initial.tags?.join(", ")||"",
  });

  const [episodes, setEps] = useState<Partial<Episode>[]>(
    initial.episodes?.map(e=>({...e}))||[]
  );
  const [expandedEp, setExpandedEp] = useState<number|null>(null);

  const set = (k:string,v: unknown) => setForm(f=>({...f,[k]:v}));

  const addEp = () => {
    setEps(eps=>[...eps,{title:"",description:"",duration:0,audioUrl:"",episodeNumber:eps.length+1,isLocked:false,transcript:"",playCount:0}]);
    setExpandedEp(episodes.length);
  };
  const delEp = (i:number) => setEps(eps=>eps.filter((_,j)=>j!==i).map((e,j)=>({...e,episodeNumber:j+1})));
  const setEp = (i:number,k:string,v: unknown) => setEps(eps=>eps.map((e,j)=>j===i?{...e,[k]:v}:e));

  const submit = async () => {
    if(!form.title.trim()){setErr("Title is required.");return;}
    setSaving(true); setErr("");
    try {
      const payload = { ...form, tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean), episodes };
      const url = isEdit?`/api/series/${(initial as Series)._id}`:"/api/series";
      const method = isEdit?"PUT":"POST";
      const r = await adminFetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d = await r.json();
      if(d.error){setErr(d.error);setSaving(false);return;}
      setMsg(isEdit?"Series updated!":"Series created!");
      setTimeout(()=>router.push("/admin/series"),1200);
    } catch(e){setErr(String(e));setSaving(false);}
  };

  const inp = (label:string, key:string, type="text", placeholder="") => (
    <div>
      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>{label}</label>
      <input className="inp" type={type} placeholder={placeholder} value={String((form as Record<string,unknown>)[key]||"")} onChange={e=>set(key, type==="number"?+e.target.value:e.target.value)}/>
    </div>
  );

  return (
    <div style={{padding:"32px",maxWidth:900, marginBottom: 80}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
        <button className="btn btn-ghost btn-sm" onClick={()=>router.back()} style={{padding:"8px 12px"}}><ArrowLeft size={15}/></button>
        <div>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:600,color:"var(--text)"}}>{isEdit?"Edit Series":"New Audio Series"}</h1>
          <p style={{color:"var(--muted)",fontSize:13}}>Fill in the details below</p>
        </div>
      </div>

      {err&&<div style={{padding:"12px 16px",borderRadius:10,background:"rgba(248,113,113,.1)",color:"var(--danger)",fontSize:13,marginBottom:20,border:"1px solid rgba(248,113,113,.3)"}}>{err}</div>}
      {msg&&<div style={{padding:"12px 16px",borderRadius:10,background:"rgba(74,222,128,.1)",color:"var(--success)",fontSize:13,marginBottom:20,border:"1px solid rgba(74,222,128,.3)"}}>{msg}</div>}

      <div style={{display:"grid",gap:24}}>
        {/* Basic Info */}
        <div className="card" style={{padding:24}}>
          <h2 style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:20,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>Basic Information</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{gridColumn:"1/-1"}}>{inp("Series Title *","title","text","Enter series title")}</div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Description *</label>
              <textarea className="inp" rows={4} placeholder="Series description..." value={form.description} onChange={e=>set("description",e.target.value)} style={{resize:"vertical"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Genre</label>
              <select className="inp" value={form.genre} onChange={e=>set("genre",e.target.value)}>
                {GENRES.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            {inp("Language","language","text","English")}
            {inp("Narrator","narrator","text","Narrator name")}
            <FileUpload
              label="Cover Image *"
              type="image"
              currentUrl={form.coverImage}
              onUpload={(url) => set("coverImage", url)}
            />
            {inp("Rating (0-5)","rating","number")}
            <div style={{gridColumn:"1/-1"}}>{inp("Tags (comma separated)","tags","text","thriller, mystery, dark")}</div>
            <div style={{display:"flex",gap:20, gridColumn:"1/-1"}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"var(--text)"}}>
                <input type="checkbox" checked={form.isFeatured} onChange={e=>set("isFeatured",e.target.checked)} style={{accentColor:"var(--accent)",width:16,height:16}}/>
                Featured
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"var(--text)"}}>
                <input type="checkbox" checked={form.isTrending} onChange={e=>set("isTrending",e.target.checked)} style={{accentColor:"var(--accent)",width:16,height:16}}/>
                Trending
              </label>
            </div>
          </div>
        </div>

        {/* Episodes */}
        <div className="card" style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>
            <div>
              <h2 style={{fontSize:15,fontWeight:600,color:"var(--text)"}}>Episodes</h2>
              <p style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{episodes.length} episode{episodes.length!==1?"s":""}</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={addEp}><Plus size={14}/>Add Episode</button>
          </div>
          {episodes.length===0&&(
            <div style={{textAlign:"center",padding:"32px 0",color:"var(--muted)"}}>
              <p style={{fontSize:13,marginBottom:12}}>No episodes yet.</p>
              <button className="btn btn-ghost btn-sm" onClick={addEp}><Plus size={13}/>Add First Episode</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {episodes.map((ep,i)=>(
              <div key={i} style={{border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"var(--surface2)",cursor:"pointer"}} onClick={()=>setExpandedEp(expandedEp===i?null:i)}>
                  <span style={{width:28,height:28,borderRadius:7,background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--bg)",flexShrink:0}}>{i+1}</span>
                  <span style={{flex:1,fontSize:14,fontWeight:500,color:"var(--text)"}}>{ep.title||`Episode ${i+1}`}</span>
                  {ep.isLocked&&<span className="badge" style={{background:"var(--surface)",color:"var(--muted)",border:"1px solid var(--border)"}}>Premium</span>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={e=>{e.stopPropagation();delEp(i);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--danger)",padding:4}}><Trash2 size={14}/></button>
                    {expandedEp===i?<ChevronUp size={16} color="var(--muted)"/>:<ChevronDown size={16} color="var(--muted)"/>}
                  </div>
                </div>
                {expandedEp===i&&(
                  <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Episode Title *</label>
                      <input className="inp" value={ep.title||""} onChange={e=>setEp(i,"title",e.target.value)} placeholder="Episode title"/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Description</label>
                      <input className="inp" value={ep.description||""} onChange={e=>setEp(i,"description",e.target.value)} placeholder="Short description"/>
                    </div>
                    <FileUpload
                      label="Audio File *"
                      type="audio"
                      currentUrl={ep.audioUrl}
                      onUpload={(url) => setEp(i, "audioUrl", url)}
                    />
                    <div>
                      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Duration (seconds)</label>
                      <input className="inp" type="number" value={ep.duration||0} onChange={e=>setEp(i,"duration",+e.target.value)}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{display:"block",fontSize:12,fontWeight:500,color:"var(--muted)",marginBottom:6}}>Transcript</label>
                      <textarea className="inp" rows={5} value={ep.transcript||""} onChange={e=>setEp(i,"transcript",e.target.value)} placeholder="Full episode transcript..." style={{resize:"vertical"}}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"var(--text)"}}>
                        <input type="checkbox" checked={ep.isLocked||false} onChange={e=>setEp(i,"isLocked",e.target.checked)} style={{accentColor:"var(--accent)",width:16,height:16}}/>
                        Premium / Locked Episode
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={()=>router.back()}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            <Save size={15}/>{saving?"Saving...":isEdit?"Update Series":"Create Series"}
          </button>
        </div>
      </div>
    </div>
  );
}
