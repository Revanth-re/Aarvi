"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Plus, X, Star } from "lucide-react";
import FileUpload from "./FileUpload";

interface Product {
  _id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  tags: string[];
  rating: number;
  isFeatured: boolean;
}

interface Props {
  initial?: Product;
  isEdit?: boolean;
}

const CATS = ["accessories", "clothing", "handicrafts", "merchandise"];

const empty: Product = {
  name: "", description: "", price: 0, stock: 0,
  category: "merchandise", images: [], tags: [],
  rating: 0, isFeatured: false,
};

export default function ProductForm({ initial, isEdit }: Props) {
  const router = useRouter();
  const [form, setForm]       = useState<Product>(initial ?? empty);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [tagInput, setTagInput] = useState("");

  const set = (k: keyof Product, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag   = (t: string) => set("tags", form.tags.filter(x => x !== t));
  const addImage    = (url: string) => { if (url) set("images", [...form.images, url]); };
  const removeImage = (idx: number) => set("images", form.images.filter((_, i) => i !== idx));

  const submit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (form.price < 0)    { setError("Price cannot be negative."); return; }
    if (form.stock < 0)    { setError("Stock cannot be negative."); return; }

    setSaving(true);
    try {
      const url    = isEdit ? `/api/products/${initial!._id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        setSaving(false);
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  /* ── shared styles ── */
  const label: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--text3)", textTransform: "uppercase",
    letterSpacing: ".6px", marginBottom: 7,
  };
  const inp: React.CSSProperties = {
    width: "100%", background: "var(--surface2)",
    border: "1px solid var(--border2)", borderRadius: 9,
    padding: "10px 14px", fontSize: 14, color: "var(--text)",
    outline: "none", transition: "border-color .15s",
    fontFamily: "var(--ff-sans)",
  };
  const section: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, padding: 24, marginBottom: 20,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "var(--text)",
    marginBottom: 18, letterSpacing: "-.01em",
  };
  const row: React.CSSProperties  = { marginBottom: 22 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "var(--accent)");
  const blurBorder  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "var(--border2)");

  return (
    <div style={{ padding: "28px", maxWidth: 820, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => router.push("/admin/products")}
          style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "8px 12px", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-.02em" }}>
            {isEdit ? "Edit Product" : "New Product"}
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>
            {isEdit ? `Editing: ${initial?.name}` : "Fill in the details below"}
          </p>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <X size={15} color="var(--danger)" />
          <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── Basic Info ── */}
      <div style={section}>
        <p style={sectionTitle}>Basic Info</p>

        <div style={row}>
          <label style={label}>Product Name *</label>
          <input style={inp} value={form.name} placeholder="e.g. Handwoven Brass Anklet"
            onChange={e => set("name", e.target.value)}
            onFocus={focusBorder} onBlur={blurBorder} />
        </div>

        <div style={row}>
          <label style={label}>Description</label>
          <textarea style={{ ...inp, minHeight: 90, resize: "vertical", lineHeight: 1.6 }}
            value={form.description} placeholder="Describe the product…"
            onChange={e => set("description", e.target.value)}
            onFocus={focusBorder as React.FocusEventHandler<HTMLTextAreaElement>}
            onBlur={blurBorder as React.FocusEventHandler<HTMLTextAreaElement>} />
        </div>

        <div style={grid2}>
          <div>
            <label style={label}>Price (₹) *</label>
            <input style={inp} type="number" min={0} value={form.price || ""}
              placeholder="0"
              onChange={e => set("price", parseFloat(e.target.value) || 0)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          <div>
            <label style={label}>Stock Quantity</label>
            <input style={inp} type="number" min={0} value={form.stock || ""}
              placeholder="0"
              onChange={e => set("stock", parseInt(e.target.value) || 0)}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
        </div>
      </div>

      {/* ── Category & Meta ── */}
      <div style={section}>
        <p style={sectionTitle}>Category & Meta</p>

        <div style={{ ...grid2, marginBottom: 22 }}>
          <div>
            <label style={label}>Category</label>
            <select style={{ ...inp, cursor: "pointer" }}
              value={form.category}
              onChange={e => set("category", e.target.value)}
              onFocus={focusBorder as React.FocusEventHandler<HTMLSelectElement>}
              onBlur={blurBorder as React.FocusEventHandler<HTMLSelectElement>}>
              {CATS.map(c => (
                <option key={c} value={c} style={{ background: "var(--surface2)" }}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Rating (0–5)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input style={{ ...inp, flex: 1 }} type="number" min={0} max={5} step={0.1}
                value={form.rating || ""} placeholder="0"
                onChange={e => set("rating", Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))}
                onFocus={focusBorder} onBlur={blurBorder} />
              <Star size={18} color="#f59e0b" fill={form.rating > 0 ? "#f59e0b" : "transparent"} />
            </div>
          </div>
        </div>

        {/* Featured toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => set("isFeatured", !form.isFeatured)}
            style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
              background: form.isFeatured ? "var(--accent)" : "var(--border2)",
              position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2,
              left: form.isFeatured ? 20 : 2,
              width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left .2s" }} />
          </button>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>Featured Product</p>
            <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>Show on homepage featured section</p>
          </div>
        </div>
      </div>

      {/* ── Images ── */}
      <div style={section}>
        <p style={sectionTitle}>Product Images</p>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, marginTop: -10 }}>
          First image is the main thumbnail. Uploaded to Cloudinary automatically.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          {form.images.map((url, i) => (
            <div key={url + i} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border2)" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && (
                <div style={{ position: "absolute", top: 6, left: 6, background: "var(--accent)", borderRadius: 5, padding: "2px 7px", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                  Main
                </div>
              )}
              <button onClick={() => removeImage(i)}
                style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,.65)", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={12} color="#fff" />
              </button>
            </div>
          ))}

          {/* Upload slot */}
          <div style={{ aspectRatio: "1" }}>
            <FileUpload type="image" onUpload={addImage} compact label="" />
          </div>
        </div>
      </div>

      {/* ── Tags ── */}
      <div style={section}>
        <p style={sectionTitle}>Tags</p>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, marginTop: -10 }}>
          Used for search and filtering. Press Enter to add.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input style={{ ...inp, flex: 1 }}
            value={tagInput} placeholder="e.g. handmade, gift, brass"
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            onFocus={focusBorder} onBlur={blurBorder} />
          <button onClick={addTag}
            style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 14px", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, flexShrink: 0 }}>
            <Plus size={13} /> Add
          </button>
        </div>

        {form.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {form.tags.map(t => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent)18", border: "1px solid var(--accent)30", borderRadius: 20, padding: "4px 10px", fontSize: 12, color: "var(--accent)" }}>
                {t}
                <button onClick={() => removeTag(t)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0, color: "var(--accent)" }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={() => router.push("/admin/products")}
          style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "11px 20px", color: "var(--text2)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          style={{ background: "var(--accent)", border: "none", borderRadius: 9, padding: "11px 24px", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, opacity: saving ? .7 : 1, transition: "opacity .15s" }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>

    </div>
  );
}
