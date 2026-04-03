import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabase.js";

const STATUSES = ["已入手","預購中","尋找中","已轉售"];
const TYPES = ["全部","手辦","壓克力立牌","徽章套組","娃娃","掛畫","鑰匙圈","其他"];
const STATUS_COLORS = {
  "已入手":{ bg:"#1a3a2a", text:"#4ade80", border:"#22543d" },
  "預購中":{ bg:"#1a2a3a", text:"#60a5fa", border:"#1e3a5f" },
  "尋找中":{ bg:"#3a2a1a", text:"#fbbf24", border:"#5f3e1e" },
  "已轉售":{ bg:"#2a2a2a", text:"#9ca3af", border:"#404040" },
};
const EMOJI_OPTIONS = ["⭐","🌸","⛩️","🎴","💎","🥜","💀","🔮","🗡️","🌙","🔥","❄️","🎭","🐉","🦊","🌊","⚡","🌺","🎪","🏮"];
const emptyForm = { ip:"", character:"", type:"手辦", brand:"", series:"", status:"已入手", condition:"全新", price:"", date:"", note:"", emoji:"⭐" };

// ── Image compress ─────────────────────────────────────────
function compressImage(file, maxW=1200, quality=0.85) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob), "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── PhotoThumb ─────────────────────────────────────────────
function PhotoThumb({ src, size=80, onClick, onRemove }) {
  return (
    <div onClick={onClick} style={{ position:"relative", width:size, height:size, borderRadius:8, overflow:"hidden", cursor:onClick?"pointer":"default", flexShrink:0, border:"1px solid #2a2a35" }}>
      <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      {onRemove && (
        <button onClick={e=>{ e.stopPropagation(); onRemove(); }}
          style={{ position:"absolute", top:3, right:3, background:"rgba(0,0,0,0.75)", border:"none", color:"#fff", borderRadius:"50%", width:18, height:18, cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      )}
    </div>
  );
}

// ── PhotoUploader ──────────────────────────────────────────
function PhotoUploader({ photos, onAdd, onRemove, uploading }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(async files => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    for (const file of imageFiles) {
      const blob = await compressImage(file);
      await onAdd(blob, file.name);
    }
  }, [onAdd]);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  return (
    <div>
      <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>照片（{photos.length} 張）</div>
      {photos.length > 0 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {photos.map((p,i) => <PhotoThumb key={p.id||i} src={p.url} size={72} onRemove={()=>onRemove(p)} />)}
        </div>
      )}
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        onClick={()=>!uploading&&inputRef.current.click()}
        style={{ border:`2px dashed ${dragging?"#c8a96e":"#2a2a35"}`, borderRadius:10, padding:"18px 16px", textAlign:"center", cursor:uploading?"wait":"pointer", background:dragging?"#c8a96e0a":"transparent", color:"#555", fontSize:13, transition:"all 0.15s" }}>
        {uploading ? (
          <><div style={{ fontSize:22, marginBottom:5 }}>⏳</div><div>上傳中...</div></>
        ) : (
          <><div style={{ fontSize:22, marginBottom:5 }}>📷</div><div>點擊上傳 或 拖曳圖片</div><div style={{ fontSize:11, marginTop:3, color:"#444" }}>支援 JPG、PNG、WEBP，可多選</div></>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:"none" }}
          onChange={e=>{ addFiles(e.target.files); e.target.value=""; }} />
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const handler = e => { if(e.key==="Escape") onClose(); if(e.key==="ArrowLeft") setIdx(i=>(i-1+photos.length)%photos.length); if(e.key==="ArrowRight") setIdx(i=>(i+1)%photos.length); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos, onClose]);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative" }}>
        <img src={photos[idx].url} alt="" style={{ maxWidth:"85vw", maxHeight:"85vh", objectFit:"contain", borderRadius:8 }} />
        <button onClick={onClose} style={{ position:"absolute", top:-40, right:0, background:"none", border:"none", color:"#aaa", fontSize:28, cursor:"pointer" }}>✕</button>
        {photos.length>1 && <>
          <button onClick={()=>setIdx(i=>(i-1+photos.length)%photos.length)} style={{ position:"absolute", left:-50, top:"50%", transform:"translateY(-50%)", background:"#ffffff18", border:"none", color:"#fff", fontSize:24, width:38, height:38, borderRadius:"50%", cursor:"pointer" }}>‹</button>
          <button onClick={()=>setIdx(i=>(i+1)%photos.length)} style={{ position:"absolute", right:-50, top:"50%", transform:"translateY(-50%)", background:"#ffffff18", border:"none", color:"#fff", fontSize:24, width:38, height:38, borderRadius:"50%", cursor:"pointer" }}>›</button>
          <div style={{ textAlign:"center", marginTop:10, color:"#666", fontSize:13 }}>{idx+1} / {photos.length}</div>
        </>}
      </div>
    </div>
  );
}

// ── IP Selector ────────────────────────────────────────────
function IPSelector({ ipList, value, onChange, onAddIP }) {
  const [adding, setAdding] = useState(false);
  const [newIP, setNewIP] = useState("");

  const handleAdd = async () => {
    const name = newIP.trim();
    if (!name || ipList.find(ip=>ip.name===name)) { setAdding(false); setNewIP(""); return; }
    await onAddIP(name);
    onChange(name);
    setAdding(false); setNewIP("");
  };

  return (
    <div>
      <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>IP 名稱 *</div>
      {adding ? (
        <div style={{ display:"flex", gap:6 }}>
          <input autoFocus value={newIP} onChange={e=>setNewIP(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") handleAdd(); if(e.key==="Escape"){setAdding(false);setNewIP("");} }}
            placeholder="輸入新 IP 名稱..." />
          <button onClick={handleAdd} style={{ flexShrink:0, background:"#c8a96e", color:"#0a0a0f", border:"none", borderRadius:6, padding:"0 14px", cursor:"pointer", fontWeight:"bold", fontSize:13 }}>確認</button>
          <button onClick={()=>{setAdding(false);setNewIP("");}} style={{ flexShrink:0, background:"#1a1a22", color:"#666", border:"1px solid #2a2a35", borderRadius:6, padding:"0 10px", cursor:"pointer", fontSize:13 }}>取消</button>
        </div>
      ) : (
        <div style={{ display:"flex", gap:6 }}>
          <select value={value} onChange={e=>onChange(e.target.value)} style={{ flex:1 }}>
            <option value="">— 選擇 IP —</option>
            {ipList.map(ip=><option key={ip.id} value={ip.name}>{ip.name}</option>)}
          </select>
          <button onClick={()=>setAdding(true)} title="新增 IP"
            style={{ flexShrink:0, background:"#c8a96e22", color:"#c8a96e", border:"1px solid #c8a96e44", borderRadius:6, padding:"0 12px", cursor:"pointer", fontSize:16, fontWeight:"bold" }}>＋</button>
        </div>
      )}
    </div>
  );
}

// ── IP Manager Modal ───────────────────────────────────────
function IPManager({ ipList, items, onAdd, onDelete, onRename, onClose }) {
  const [newIP, setNewIP] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");

  const handleAdd = async () => {
    const name = newIP.trim();
    if (!name || ipList.find(ip=>ip.name===name)) return;
    await onAdd(name); setNewIP("");
  };

  const handleRename = async ip => {
    const name = renameVal.trim();
    if (!name) { setRenamingId(null); return; }
    await onRename(ip, name);
    setRenamingId(null);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontSize:18, color:"#c8a96e" }}>⚙ 管理 IP 列表</h2>
          <button className="btn" onClick={onClose} style={{ background:"#1a1a22", color:"#666" }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <input value={newIP} onChange={e=>setNewIP(e.target.value)} placeholder="新增 IP 名稱..." onKeyDown={e=>e.key==="Enter"&&handleAdd()} />
          <button className="btn" onClick={handleAdd} style={{ flexShrink:0, background:"#c8a96e", color:"#0a0a0f", fontWeight:"bold" }}>新增</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {ipList.map(ip => {
            const count = items.filter(i=>i.ip===ip.name).length;
            return (
              <div key={ip.id} style={{ display:"flex", alignItems:"center", gap:8, background:"#1a1a22", borderRadius:8, padding:"10px 12px" }}>
                {renamingId===ip.id ? (
                  <>
                    <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") handleRename(ip); if(e.key==="Escape") setRenamingId(null); }}
                      style={{ flex:1, padding:"4px 8px" }} />
                    <button className="btn" onClick={()=>handleRename(ip)} style={{ background:"#c8a96e22", color:"#c8a96e", border:"1px solid #c8a96e44", padding:"4px 10px" }}>✓</button>
                    <button className="btn" onClick={()=>setRenamingId(null)} style={{ background:"transparent", color:"#555", padding:"4px 10px" }}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex:1, fontSize:14 }}>{ip.name}</span>
                    <span style={{ fontSize:11, color:"#555", marginRight:4 }}>{count} 件</span>
                    <button className="btn" onClick={()=>{ setRenamingId(ip.id); setRenameVal(ip.name); }} style={{ background:"transparent", color:"#888", padding:"4px 8px" }}>✏️</button>
                    <button className="btn" onClick={()=>{ if(count>0&&!confirm(`「${ip.name}」有 ${count} 件收藏，確定刪除？`)) return; onDelete(ip); }} style={{ background:"transparent", color:"#f87171", padding:"4px 8px" }}>🗑️</button>
                  </>
                )}
              </div>
            );
          })}
          {ipList.length===0 && <div style={{ textAlign:"center", color:"#444", padding:20 }}>尚無 IP，請新增</div>}
        </div>
      </div>
    </div>
  );
}

// ── Loading ────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, color:"#555" }}>
      <div style={{ fontSize:40 }}>✦</div>
      <div style={{ fontSize:14, color:"#c8a96e", letterSpacing:"0.1em" }}>載入收藏庫...</div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState([]);
  const [ipList, setIpList] = useState([]);
  const [photoMap, setPhotoMap] = useState({}); // { item_id: [{id, url}] }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [filterIP, setFilterIP] = useState("全部");
  const [filterType, setFilterType] = useState("全部");
  const [filterStatus, setFilterStatus] = useState("全部");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("grid");
  const [selectedItem, setSelectedItem] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [showIPManager, setShowIPManager] = useState(false);
  // Temp photos for form (not yet saved to item)
  const [formPhotos, setFormPhotos] = useState([]);

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: itemsData }, { data: ipData }, { data: photosData }] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("ip_list").select("*").order("created_at"),
      supabase.from("photos").select("*").order("created_at"),
    ]);
    setItems(itemsData || []);
    setIpList(ipData || []);
    // Group photos by item_id
    const map = {};
    (photosData || []).forEach(p => {
      if (!map[p.item_id]) map[p.item_id] = [];
      map[p.item_id].push(p);
    });
    setPhotoMap(map);
    setLoading(false);
  }

  // ── IP operations ──────────────────────────────────────
  const addIP = async name => {
    const { data } = await supabase.from("ip_list").insert({ name }).select().single();
    if (data) setIpList(prev => [...prev, data]);
  };

  const deleteIP = async ip => {
    await supabase.from("ip_list").delete().eq("id", ip.id);
    setIpList(prev => prev.filter(i => i.id !== ip.id));
    setItems(prev => prev.map(i => i.ip === ip.name ? { ...i, ip:"（已刪除）" } : i));
  };

  const renameIP = async (ip, newName) => {
    await supabase.from("ip_list").update({ name: newName }).eq("id", ip.id);
    // Update all items with this IP name
    await supabase.from("items").update({ ip: newName }).eq("ip", ip.name);
    setIpList(prev => prev.map(i => i.id === ip.id ? { ...i, name: newName } : i));
    setItems(prev => prev.map(i => i.ip === ip.name ? { ...i, ip: newName } : i));
  };

  // ── Photo operations ───────────────────────────────────
  const uploadPhoto = async (blob, filename, itemId) => {
    setUploadingPhoto(true);
    const ext = filename.split(".").pop() || "jpg";
    const path = `${itemId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType:"image/jpeg" });
    if (error) { setUploadingPhoto(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);
    const { data: photoRow } = await supabase.from("photos").insert({ item_id: itemId, url: publicUrl }).select().single();
    setPhotoMap(prev => ({ ...prev, [itemId]: [...(prev[itemId]||[]), photoRow] }));
    setUploadingPhoto(false);
    return photoRow;
  };

  const removePhoto = async (photo, itemId) => {
    await supabase.from("photos").delete().eq("id", photo.id);
    // Extract path from URL
    const urlParts = photo.url.split("/photos/");
    if (urlParts[1]) await supabase.storage.from("photos").remove([decodeURIComponent(urlParts[1])]);
    setPhotoMap(prev => ({ ...prev, [itemId]: (prev[itemId]||[]).filter(p=>p.id!==photo.id) }));
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ ...prev, _photos:(prev._photos||[]).filter(p=>p.id!==photo.id) }));
    }
  };

  // ── Item save ──────────────────────────────────────────
  const handleSave = async () => {
    if (!form.ip || !form.character) return;
    setSaving(true);
    const payload = { ip:form.ip, character:form.character, type:form.type, brand:form.brand, series:form.series, status:form.status, condition:form.condition, price:Number(form.price)||0, date:form.date, note:form.note, emoji:form.emoji };

    if (editingId) {
      const { data } = await supabase.from("items").update(payload).eq("id", editingId).select().single();
      setItems(prev => prev.map(i => i.id===editingId ? data : i));
      // Upload any pending form photos
      for (const fp of formPhotos) {
        await uploadPhoto(fp.blob, fp.name, editingId);
      }
      setSelectedItem({ ...data, _photos: photoMap[editingId]||[] });
    } else {
      const { data } = await supabase.from("items").insert(payload).select().single();
      if (data) {
        setItems(prev => [data, ...prev]);
        // Upload pending photos
        for (const fp of formPhotos) {
          await uploadPhoto(fp.blob, fp.name, data.id);
        }
      }
    }
    setFormPhotos([]);
    setSaving(false);
    setShowForm(false); setEditingId(null); setForm(emptyForm);
  };

  const handleEdit = item => {
    setForm({ ip:item.ip, character:item.character, type:item.type, brand:item.brand, series:item.series, status:item.status, condition:item.condition, price:String(item.price), date:item.date, note:item.note, emoji:item.emoji });
    setFormPhotos([]);
    setEditingId(item.id); setShowForm(true); setSelectedItem(null);
  };

  const handleDelete = async id => {
    await supabase.from("items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id!==id));
    setPhotoMap(prev => { const next={...prev}; delete next[id]; return next; });
    setSelectedItem(null);
  };

  // ── Derived data ───────────────────────────────────────
  const filterIPOptions = useMemo(() => ["全部", ...ipList.map(ip=>ip.name)], [ipList]);

  const filtered = useMemo(() => items.filter(item => {
    if (filterIP!=="全部" && item.ip!==filterIP) return false;
    if (filterType!=="全部" && item.type!==filterType) return false;
    if (filterStatus!=="全部" && item.status!==filterStatus) return false;
    if (search && !`${item.ip}${item.character}${item.brand}${item.note}`.includes(search)) return false;
    return true;
  }), [items, filterIP, filterType, filterStatus, search]);

  const stats = useMemo(() => {
    const owned = items.filter(i=>i.status==="已入手");
    const totalValue = owned.reduce((s,i)=>s+(Number(i.price)||0), 0);
    const byIP={}, byType={};
    items.forEach(i=>{ byIP[i.ip]=(byIP[i.ip]||0)+1; byType[i.type]=(byType[i.type]||0)+1; });
    return { total:items.length, owned:owned.length, totalValue, byIP, byType };
  }, [items]);

  const getPhotos = id => photoMap[id] || [];
  const getCover = id => getPhotos(id)[0]?.url || null;

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", color:"#e8e0d5", fontFamily:"'Georgia', serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
        input,select,textarea{background:#1a1a22;border:1px solid #333;color:#e8e0d5;border-radius:6px;padding:8px 12px;font-family:inherit;font-size:14px;outline:none;width:100%}
        input:focus,select:focus,textarea:focus{border-color:#c8a96e}
        select option{background:#1a1a22}
        .card-hover{transition:transform 0.2s,box-shadow 0.2s}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.4)}
        .btn{cursor:pointer;border:none;border-radius:6px;padding:8px 16px;font-family:inherit;font-size:13px;transition:all 0.15s}
        .btn:hover{filter:brightness(1.15)}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#13131a;border:1px solid #2a2a35;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:28px}
        .tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:bold;letter-spacing:0.05em}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.3s ease}
      `}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#13131a 0%,#1a1a2e 100%)", borderBottom:"1px solid #2a2a35", padding:"20px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <h1 style={{ fontSize:26, fontWeight:"bold", color:"#c8a96e", letterSpacing:"0.05em" }}>✦ 收藏庫</h1>
              <p style={{ fontSize:12, color:"#666", marginTop:2 }}>Anime Collection Manager</p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button className="btn" onClick={()=>setShowIPManager(true)} style={{ background:"#1a1a22", color:"#888", border:"1px solid #2a2a35", fontSize:12 }}>⚙ 管理 IP</button>
              <div style={{ display:"flex", background:"#1a1a22", border:"1px solid #2a2a35", borderRadius:8, overflow:"hidden" }}>
                {[["grid","▦"],["list","≡"],["stats","◈"]].map(([v,icon])=>(
                  <button key={v} className="btn" onClick={()=>setView(v)} style={{ borderRadius:0, background:view===v?"#c8a96e22":"transparent", color:view===v?"#c8a96e":"#666", padding:"8px 14px" }}>{icon}</button>
                ))}
              </div>
              <button className="btn" onClick={()=>{ setForm(emptyForm); setFormPhotos([]); setEditingId(null); setShowForm(true); }}
                style={{ background:"#c8a96e", color:"#0a0a0f", fontWeight:"bold" }}>＋ 新增收藏</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, marginTop:16, flexWrap:"wrap" }}>
            {[["總收藏",stats.total+" 件"],["已入手",stats.owned+" 件"],["總價值","NT$ "+stats.totalValue.toLocaleString()],["IP 數量",ipList.length+" 個"]].map(([label,val])=>(
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:"bold", color:"#c8a96e" }}>{val}</div>
                <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 24px" }}>
        {/* Filters */}
        <div style={{ background:"#13131a", border:"1px solid #2a2a35", borderRadius:12, padding:16, marginBottom:20, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
          <input placeholder="🔍 搜尋 IP、角色、品牌..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:220, flexShrink:0 }} />
          <select value={filterIP} onChange={e=>setFilterIP(e.target.value)} style={{ width:140 }}>{filterIPOptions.map(ip=><option key={ip}>{ip}</option>)}</select>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ width:130 }}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ width:110 }}>{["全部",...STATUSES].map(s=><option key={s}>{s}</option>)}</select>
          <div style={{ marginLeft:"auto", color:"#555", fontSize:13 }}>顯示 {filtered.length} / {items.length} 件</div>
        </div>

        {/* Grid */}
        {view==="grid" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:16 }}>
            {filtered.map(item => {
              const sc=STATUS_COLORS[item.status]; const cover=getCover(item.id); const photoCount=getPhotos(item.id).length;
              return (
                <div key={item.id} className="card-hover fade-in" onClick={()=>setSelectedItem(item)} style={{ background:"#13131a", border:"1px solid #2a2a35", borderRadius:12, overflow:"hidden", cursor:"pointer" }}>
                  <div style={{ width:"100%", aspectRatio:"1/1", background:"#1a1a22", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                    {cover ? <img src={cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:52 }}>{item.emoji}</span>}
                    {photoCount>1 && <div style={{ position:"absolute", bottom:6, right:6, background:"rgba(0,0,0,0.65)", borderRadius:10, padding:"2px 7px", fontSize:11, color:"#ddd" }}>📷 {photoCount}</div>}
                    <div style={{ position:"absolute", top:6, left:6 }}><span className="tag" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{item.status}</span></div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:11, color:"#c8a96e", marginBottom:3, letterSpacing:"0.05em" }}>{item.ip}</div>
                    <div style={{ fontSize:15, fontWeight:"bold", marginBottom:4 }}>{item.character}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:12, color:"#555" }}>{item.type}</span>
                      {item.price>0 && <span style={{ fontSize:13, color:"#c8a96e" }}>NT${item.price.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length===0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:"#444" }}><div style={{ fontSize:48, marginBottom:12 }}>📦</div><div>沒有符合條件的收藏品</div></div>}
          </div>
        )}

        {/* List */}
        {view==="list" && (
          <div style={{ background:"#13131a", border:"1px solid #2a2a35", borderRadius:12, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"52px 1fr 1fr 100px 90px 90px 80px", padding:"10px 16px", borderBottom:"1px solid #2a2a35", fontSize:11, color:"#555", letterSpacing:"0.05em" }}>
              <span/><span>角色 / IP</span><span>品牌 / 系列</span><span>類型</span><span>狀態</span><span>價格</span><span>日期</span>
            </div>
            {filtered.map(item => {
              const sc=STATUS_COLORS[item.status]; const cover=getCover(item.id);
              return (
                <div key={item.id} onClick={()=>setSelectedItem(item)} style={{ display:"grid", gridTemplateColumns:"52px 1fr 1fr 100px 90px 90px 80px", padding:"10px 16px", borderBottom:"1px solid #1e1e28", cursor:"pointer", alignItems:"center" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#1a1a22"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:38, height:38, borderRadius:8, overflow:"hidden", background:"#1a1a22", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {cover ? <img src={cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:22 }}>{item.emoji}</span>}
                  </div>
                  <div><div style={{ fontSize:14, fontWeight:"bold" }}>{item.character}</div><div style={{ fontSize:11, color:"#c8a96e", marginTop:2 }}>{item.ip}</div></div>
                  <div><div style={{ fontSize:13 }}>{item.brand}</div><div style={{ fontSize:11, color:"#555", marginTop:2 }}>{item.series}</div></div>
                  <span style={{ fontSize:12, color:"#888" }}>{item.type}</span>
                  <span className="tag" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}`, width:"fit-content" }}>{item.status}</span>
                  <span style={{ fontSize:13, color:item.price?"#c8a96e":"#444" }}>{item.price?`NT$${item.price.toLocaleString()}`:"—"}</span>
                  <span style={{ fontSize:11, color:"#555" }}>{item.date||"—"}</span>
                </div>
              );
            })}
            {filtered.length===0 && <div style={{ textAlign:"center", padding:40, color:"#444" }}>沒有符合條件的收藏品</div>}
          </div>
        )}

        {/* Stats */}
        {view==="stats" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[["IP 分佈",stats.byIP,"#c8a96e","linear-gradient(90deg,#c8a96e,#e8c98e)"],["類型分佈",stats.byType,"#60a5fa","linear-gradient(90deg,#3b82f6,#60a5fa)"]].map(([title,data,tc,grad])=>(
              <div key={title} style={{ background:"#13131a", border:"1px solid #2a2a35", borderRadius:12, padding:20 }}>
                <h3 style={{ fontSize:14, color:"#c8a96e", marginBottom:16, letterSpacing:"0.05em" }}>◈ {title}</h3>
                {Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([k,count])=>(
                  <div key={k} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}><span>{k}</span><span style={{ color:tc }}>{count} 件</span></div>
                    <div style={{ background:"#1a1a22", borderRadius:4, height:6 }}><div style={{ background:grad, borderRadius:4, height:6, width:`${(count/items.length)*100}%`, transition:"width 0.5s" }} /></div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ background:"#13131a", border:"1px solid #2a2a35", borderRadius:12, padding:20, gridColumn:"1/-1" }}>
              <h3 style={{ fontSize:14, color:"#c8a96e", marginBottom:16, letterSpacing:"0.05em" }}>◈ 狀態總覽</h3>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {STATUSES.map(s=>{ const sc=STATUS_COLORS[s]; const count=items.filter(i=>i.status===s).length; return (
                  <div key={s} style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:10, padding:"16px 24px", textAlign:"center", flex:1 }}>
                    <div style={{ fontSize:28, fontWeight:"bold", color:sc.text }}>{count}</div>
                    <div style={{ fontSize:12, color:sc.text, marginTop:4, opacity:0.8 }}>{s}</div>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (() => {
        const photos = getPhotos(selectedItem.id);
        return (
          <div className="overlay" onClick={()=>setSelectedItem(null)}>
            <div className="modal fade-in" onClick={e=>e.stopPropagation()} style={{ maxWidth:580 }}>
              {photos.length>0 ? (
                <div style={{ marginBottom:20 }}>
                  <div style={{ borderRadius:12, overflow:"hidden", marginBottom:8, cursor:"zoom-in" }} onClick={()=>setLightbox({ photos, index:0 })}>
                    <img src={photos[0].url} alt="" style={{ width:"100%", maxHeight:260, objectFit:"cover", display:"block" }} />
                  </div>
                  {photos.length>1 && <div style={{ display:"flex", gap:6, overflowX:"auto" }}>{photos.map((p,i)=><PhotoThumb key={p.id} src={p.url} size={62} onClick={()=>setLightbox({ photos, index:i })} />)}</div>}
                </div>
              ) : (
                <div style={{ textAlign:"center", fontSize:64, marginBottom:16 }}>{selectedItem.emoji}</div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:12, color:"#c8a96e", marginBottom:3 }}>{selectedItem.ip}</div>
                  <h2 style={{ fontSize:22 }}>{selectedItem.character}</h2>
                  <div style={{ fontSize:13, color:"#666", marginTop:3 }}>{selectedItem.type} · {selectedItem.brand} · {selectedItem.series}</div>
                </div>
                <button className="btn" onClick={()=>setSelectedItem(null)} style={{ background:"#1a1a22", color:"#666", flexShrink:0 }}>✕</button>
              </div>

              {/* Inline photo management in detail view */}
              <div style={{ margin:"14px 0", padding:"12px 14px", background:"#1a1a22", borderRadius:8 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>管理照片</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:photos.length?8:0 }}>
                  {photos.map(p => <PhotoThumb key={p.id} src={p.url} size={64} onClick={()=>setLightbox({ photos, index:photos.indexOf(p) })} onRemove={()=>removePhoto(p, selectedItem.id)} />)}
                </div>
                <label style={{ display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer", color:"#c8a96e", fontSize:12, padding:"6px 10px", background:"#c8a96e11", borderRadius:6, border:"1px solid #c8a96e33" }}>
                  {uploadingPhoto ? "⏳ 上傳中..." : "＋ 新增照片"}
                  <input type="file" accept="image/*" multiple style={{ display:"none" }} disabled={uploadingPhoto}
                    onChange={async e=>{ for(const f of e.target.files){ const blob=await compressImage(f); await uploadPhoto(blob,f.name,selectedItem.id); } e.target.value=""; }} />
                </label>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[["狀態",selectedItem.status],["品相",selectedItem.condition],["購入價格",selectedItem.price?`NT$ ${Number(selectedItem.price).toLocaleString()}`:"—"],["入手日期",selectedItem.date||"—"]].map(([label,val])=>(
                  <div key={label} style={{ background:"#1a1a22", borderRadius:8, padding:"11px 14px" }}>
                    <div style={{ fontSize:11, color:"#555", marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:14, fontWeight:"bold" }}>{val}</div>
                  </div>
                ))}
              </div>
              {selectedItem.note && <div style={{ background:"#1a1a22", borderRadius:8, padding:"11px 14px", marginBottom:14 }}><div style={{ fontSize:11, color:"#555", marginBottom:3 }}>備註</div><div style={{ fontSize:13, color:"#aaa" }}>{selectedItem.note}</div></div>}
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn" onClick={()=>handleEdit(selectedItem)} style={{ background:"#c8a96e22", color:"#c8a96e", border:"1px solid #c8a96e44", flex:1 }}>✏️ 編輯</button>
                <button className="btn" onClick={()=>{ if(confirm("確定刪除？")) handleDelete(selectedItem.id); }} style={{ background:"#f8717122", color:"#f87171", border:"1px solid #f8717144" }}>🗑️</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form Modal */}
      {showForm && (
        <div className="overlay" onClick={()=>{ setShowForm(false); setEditingId(null); setFormPhotos([]); }}>
          <div className="modal fade-in" onClick={e=>e.stopPropagation()}>
            <h2 style={{ fontSize:18, marginBottom:20, color:"#c8a96e" }}>{editingId?"✏️ 編輯收藏":"＋ 新增收藏"}</h2>
            <div style={{ marginBottom:18 }}>
              <PhotoUploader
                photos={[...formPhotos.map((fp,i)=>({ id:`tmp-${i}`, url:fp.previewUrl })), ...(editingId?getPhotos(editingId):[])]}
                onAdd={async (blob, name) => {
                  if (editingId) {
                    await uploadPhoto(blob, name, editingId);
                  } else {
                    const url = URL.createObjectURL(blob);
                    setFormPhotos(prev=>[...prev, { blob, name, previewUrl:url }]);
                  }
                }}
                onRemove={p => {
                  if (p.id?.toString().startsWith("tmp-")) {
                    setFormPhotos(prev=>prev.filter(fp=>fp.previewUrl!==p.url));
                  } else if (editingId) {
                    removePhoto(p, editingId);
                  }
                }}
                uploading={uploadingPhoto}
              />
            </div>
            {formPhotos.length===0 && !getPhotos(editingId).length && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>備用圖示</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {EMOJI_OPTIONS.map(e=>(
                    <button key={e} className="btn" onClick={()=>setForm(f=>({...f,emoji:e}))}
                      style={{ padding:"6px 10px", background:form.emoji===e?"#c8a96e22":"#1a1a22", border:`1px solid ${form.emoji===e?"#c8a96e":"#2a2a35"}`, fontSize:18 }}>{e}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <IPSelector ipList={ipList} value={form.ip} onChange={ip=>setForm(f=>({...f,ip}))} onAddIP={addIP} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>角色名稱 *</div>
                <input value={form.character} onChange={e=>setForm(f=>({...f,character:e.target.value}))} placeholder="角色名稱" />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>類型</div>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {[...TYPES.filter(t=>t!=="全部"),"其他"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>品牌</div>
                <input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} placeholder="品牌" />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>系列</div>
                <input value={form.series} onChange={e=>setForm(f=>({...f,series:e.target.value}))} placeholder="系列" />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>狀態</div>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>品相</div>
                <select value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}>
                  {["全新","良好","普通","破損","-"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>購入價格 (NT$)</div>
                <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0" />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>入手日期</div>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>備註</div>
                <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="限定版、附特典、購入地點……" style={{ height:72, resize:"vertical" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button className="btn" onClick={handleSave} disabled={saving}
                style={{ background:"#c8a96e", color:"#0a0a0f", fontWeight:"bold", flex:1, opacity:saving?0.7:1 }}>
                {saving ? "儲存中..." : editingId?"儲存變更":"新增"}
              </button>
              <button className="btn" onClick={()=>{ setShowForm(false); setEditingId(null); setFormPhotos([]); }} style={{ background:"#1a1a22", color:"#666", border:"1px solid #2a2a35" }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {showIPManager && <IPManager ipList={ipList} items={items} onAdd={addIP} onDelete={deleteIP} onRename={renameIP} onClose={()=>setShowIPManager(false)} />}
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={()=>setLightbox(null)} />}
    </div>
  );
}
