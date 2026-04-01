import { useState, useEffect, useRef } from "react";
import { BR, NODES, C2N, CATS, SIG_TYPES } from "./data";
import { useAuth, useEntries, useSignals, useMilestones } from "./hooks";

const AKEY = "in-motion-2026"; // legacy, kept for reference

const IC = {
  root: c=><g><path d="M0-8L5 0 0 8-5 0Z" fill={c}/><circle cx="0" cy="0" r="3" fill={c} opacity=".4"/></g>,
  controllership: c=><g><rect x="-5" y="-6" width="10" height="12" rx="1" fill="none" stroke={c} strokeWidth="1.5"/><line x1="-3" y1="-2" x2="3" y2="-2" stroke={c}/><line x1="-3" y1="1" x2="3" y2="1" stroke={c}/><line x1="-3" y1="4" x2="1" y2="4" stroke={c}/></g>,
  fpa: c=><g><polyline points="-5,5 -2,-1 1,3 5,-5" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><line x1="-6" y1="6" x2="6" y2="6" stroke={c} opacity=".4"/><line x1="-6" y1="6" x2="-6" y2="-6" stroke={c} opacity=".4"/></g>,
  cap_markets: c=><g><path d="M-4-3V5h10" fill="none" stroke={c} strokeWidth="1.2"/><rect x="-2" y="1" width="2.5" height="4" fill={c} opacity=".7"/><rect x="1.5" y="-2" width="2.5" height="7" fill={c}/></g>,
  corp_dev: c=><g><circle cx="-3" cy="0" r="3.5" fill="none" stroke={c} strokeWidth="1.5"/><circle cx="3" cy="0" r="3.5" fill="none" stroke={c} strokeWidth="1.5"/></g>,
  valuation: c=><g><circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="1.3"/><path d="M-3-1L0 4 3-1" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><line x1="0" y1="-4" x2="0" y2="-2" stroke={c} strokeWidth="1.5"/></g>,
  macro: c=><g><circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="1.2"/><path d="M-5 1Q-2-4 0 0Q2 4 5-1" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></g>,
  ai_transform: c=><g><rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="none" stroke={c} strokeWidth="1.3"/><circle cx="-2" cy="0" r="1.5" fill={c} opacity=".6"/><circle cx="3" cy="0" r="1.5" fill={c} opacity=".6"/><line x1="-.5" y1="0" x2="1.5" y2="0" stroke={c} strokeDasharray="1.5,1"/></g>,
  cap_alloc: c=><g><circle cx="0" cy="0" r="5.5" fill="none" stroke={c} strokeWidth="1.3"/><path d="M0-5.5A5.5 5.5 0 0 1 5.5 0L0 0Z" fill={c} opacity=".5"/><path d="M0 0L-4 4" stroke={c}/></g>,
  performance: c=><g><path d="M-6 4L-2 0 1 2 6-4" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><polygon points="6,-4 3,-2 5,-1" fill={c}/></g>,
  stakeholders: c=><g><circle cx="0" cy="-3" r="2.5" fill="none" stroke={c} strokeWidth="1.2"/><path d="M-5 5Q-5 1 0 0Q5 1 5 5" fill="none" stroke={c} strokeWidth="1.2"/><circle cx="-6" cy="-1" r="1.5" fill="none" stroke={c} strokeWidth=".8" opacity=".5"/><circle cx="6" cy="-1" r="1.5" fill="none" stroke={c} strokeWidth=".8" opacity=".5"/></g>,
  risk_mgmt: c=><g><path d="M0-7C-4-7-6-4-6 0C-6 4-1 7 0 8C1 7 6 4 6 0C6-4 4-7 0-7Z" fill="none" stroke={c} strokeWidth="1.3"/><line x1="0" y1="-3" x2="0" y2="2" stroke={c} strokeWidth="1.5"/><circle cx="0" cy="4" r=".8" fill={c}/></g>,
  cfo: c=><g><path d="M0-7L2-3 7-3 3 0 5 5 0 2-5 5-3 0-7-3-2-3Z" fill={c} opacity=".8"/><circle cx="0" cy="-1" r="2" fill="#faf8f5"/></g>,
};
const gid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fd=iso=>new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fsize=b=>b<1048576?`${(b/1024).toFixed(0)} KB`:`${(b/1048576).toFixed(1)} MB`;
const normalizeUrl = (url) => {
  if (!url) return url;
  if (url.match(/^https?:\/\//)) return url;
  return "https://" + url;
};
const fmtRelative = (iso) => {
  const d = new Date(iso), now = new Date(), diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return fd(iso);
};

function Highlight({ text, term }) {
  if (!term || !text) return text || null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? <mark key={i} style={{background:"#fef08a",padding:"0 1px",borderRadius:2}}>{p}</mark> : p
  );
}

// Render markdown-style formatting: **bold**, *italic*, [text](url)
function RichText({ text, style: s, hlTerm }) {
  if (!text) return null;
  // Parse into segments
  const parse = (str) => {
    const parts = [];
    let i = 0;
    while (i < str.length) {
      // Link: [text](url)
      const linkMatch = str.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push({ type: "link", text: linkMatch[1], url: linkMatch[2] });
        i += linkMatch[0].length;
        continue;
      }
      // Bold: **text**
      const boldMatch = str.slice(i).match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push({ type: "bold", text: boldMatch[1] });
        i += boldMatch[0].length;
        continue;
      }
      // Italic: *text*
      const italicMatch = str.slice(i).match(/^\*(.+?)\*/);
      if (italicMatch) {
        parts.push({ type: "italic", text: italicMatch[1] });
        i += italicMatch[0].length;
        continue;
      }
      // Plain text: collect until next special char
      let end = i + 1;
      while (end < str.length && str[end] !== '*' && str[end] !== '[') end++;
      parts.push({ type: "text", text: str.slice(i, end) });
      i = end;
    }
    return parts;
  };
  const segments = parse(text);
  const applyHl = (t) => hlTerm ? <Highlight text={t} term={hlTerm} /> : t;
  return (
    <span style={s}>
      {segments.map((seg, i) => {
        if (seg.type === "bold") return <strong key={i}>{applyHl(seg.text)}</strong>;
        if (seg.type === "italic") return <em key={i}>{applyHl(seg.text)}</em>;
        if (seg.type === "link") return <a key={i} href={normalizeUrl(seg.url)} target="_blank" rel="noopener noreferrer" style={{color:"#8b6508",textDecoration:"underline"}}>{applyHl(seg.text)}</a>;
        return <span key={i}>{applyHl(seg.text)}</span>;
      })}
    </span>
  );
}

// ─── WEIGHTED XP ───
// Block helpers
function getTextFromBlocks(blocks) {
  if (!blocks) return "";
  if (typeof blocks === "string") return blocks;
  return blocks.filter(b => b.type === "text").map(b => b.content).join(" ");
}
function blocksHaveImage(blocks) {
  if (!blocks || typeof blocks === "string") return false;
  return blocks.some(b => b.type === "image");
}
function entryWeight(e) {
  let w = 1;
  const insightText = getTextFromBlocks(e.insightBlocks || e.insight);
  const connText = getTextFromBlocks(e.connectionBlocks || e.careerConnection);
  if (insightText.length > 200) w += 1;
  if (connText.length > 20) w += 1;
  const hasAttach = (e.pdfs && e.pdfs.length > 0) || (e.sources && e.sources.some(s => s.url)) || (e.links && e.links.length > 0) || blocksHaveImage(e.insightBlocks) || blocksHaveImage(e.connectionBlocks);
  if (hasAttach) w += 1;
  // Use AI score if available (0-5), otherwise fall back to mechanical (1-4)
  if (e.ai_score !== undefined && e.ai_score !== null) return e.ai_score;
  return w;
}

function calcXP(entries, completedMilestones) {
  const raw = {};
  entries.forEach(e => {
    const w = entryWeight(e);
    (C2N[e.category]||[]).forEach(n => { raw[n]=(raw[n]||0)+w; });
  });
  const xp = {};
  const hasMilestone = nid => {
    const node = NODES.find(x=>x.id===nid);
    const ms = completedMilestones[nid] || [];
    if (!node?.milestones || node.milestones.length === 0) return true;
    return node.milestones.every((_, i) => ms[i] === true);
  };
  const ul = n => (xp[n]||0) >= (NODES.find(x=>x.id===n)?.xp||999) && hasMilestone(n);
  const av = n => { const nd=NODES.find(x=>x.id===n); if(!nd) return false; const r=nd.req||[]; return r.length===0||r.every(ul); };
  for (let i=0;i<10;i++) { let ch=false; NODES.forEach(n => { const p=xp[n.id]||0,v=av(n.id)?(raw[n.id]||0):0; if(v!==p){xp[n.id]=v;ch=true;} }); if(!ch) break; }
  return { raw, xp, ul, av, hasMilestone };
}

// ─── POPOVER ───
function Popover({ node, xpVal, rawVal, entries, isAvail, hasMilestone, completedMs, onToggleMs, pos, onClose, admin, onNavigateEntry }) {
  const ref = useRef(null);
  const xpMet = (xpVal||0) >= node.xp;
  const msMet = hasMilestone;
  const fullyUnlocked = xpMet && msMet && isAvail;
  const v = Math.min(1,(xpVal||0)/node.xp);
  const c = node.b ? BR[node.b]?.color||"#1a1a1a" : "#1a1a1a";
  const rel = entries.filter(e => (C2N[e.category]||[]).includes(node.id));
  const q = (rawVal||0)-(xpVal||0);
  const rq = node.req||[], lk = !isAvail && rq.length>0;
  const ms = node.milestones||[];
  const msState = completedMs || ms.map(()=>false);

  const popW=300, popH=300;
  let left=pos.x-popW/2, top=pos.y+40;
  if(left<8) left=8; if(left+popW>592) left=592-popW;
  if(top+popH>520) top=pos.y-popH-10;

  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[onClose]);

  return <g>
    <line x1={pos.x} y1={pos.y+20} x2={left+popW/2} y2={top} stroke={c} strokeWidth="1" strokeDasharray="3,3" opacity=".4"/>
    <foreignObject x={left} y={top} width={popW} height={popH+120}>
      <div ref={ref} xmlns="http://www.w3.org/1999/xhtml" style={{background:"#fff",border:`2px solid ${c}`,borderRadius:8,padding:14,boxShadow:"0 8px 32px rgba(0,0,0,.18)",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#333",maxHeight:popH+110,overflow:"auto",animation:"fi .15s ease-out"}}>
        <style>{`@keyframes fi{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{fontFamily:"'Newsreader',Georgia,serif",fontSize:15,fontWeight:700,color:c,lineHeight:1.2}}>{node.label}</div>
          <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:".08em",color:fullyUnlocked?"#2a6e4e":lk?"#c44":"#aaa",flexShrink:0,marginLeft:8}}>{fullyUnlocked?"✓ Done":lk?"🔒":"T"+node.t}</span>
        </div>
        <p style={{fontSize:11,color:"#666",lineHeight:1.5,margin:"0 0 8px"}}>{node.desc}</p>

        {lk ? <div style={{background:"#f8f6f3",padding:"8px 10px",borderRadius:4,marginBottom:6}}>
          <div style={{fontSize:9,textTransform:"uppercase",color:"#999",fontWeight:600,marginBottom:3}}>Requires</div>
          {rq.map(rid=><span key={rid} style={{display:"inline-block",background:"#e5e2dc",padding:"1px 6px",borderRadius:3,fontSize:10,marginRight:4,color:"#666"}}>{NODES.find(n=>n.id===rid)?.label||rid}</span>)}
          {q>0&&<div style={{fontSize:10,color:"#a08040",fontStyle:"italic",marginTop:4}}>{q} XP queued</div>}
        </div> : <div>
          {/* XP progress */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{flex:1,height:6,background:"#e5e2dc",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${v*100}%`,background:xpMet?"#2a6e4e":c,borderRadius:3,transition:"width .4s",minWidth:1}}/></div>
            <span style={{fontSize:10,color:xpMet?"#2a6e4e":"#999",fontWeight:xpMet?700:400}}>{xpVal||0}/{node.xp} XP</span>
          </div>
          {!xpMet&&<div style={{fontSize:9,color:"#aaa",marginBottom:6,fontStyle:"italic"}}>Deeper entries earn more XP (add details, career connection, attachments)</div>}
        </div>}

        {/* Milestones */}
        {ms.length>0&&!lk&&<div style={{borderTop:"1px solid #eee",paddingTop:8,marginTop:4}}>
          <div style={{fontSize:9,textTransform:"uppercase",color:msMet?"#2a6e4e":"#c4882a",fontWeight:600,marginBottom:6}}>{msMet?"✓ All milestones complete":"⚑ Complete all to unlock"}</div>
          {ms.map((m,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:5,cursor:admin?"pointer":"default",opacity:admin||msState[i]?1:.7}} onClick={()=>{if(admin)onToggleMs(node.id,i);}}>
            <span style={{width:14,height:14,borderRadius:3,border:msState[i]?"none":"1.5px solid #ccc",background:msState[i]?c:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:"#fff",marginTop:1}}>{msState[i]?"✓":""}</span>
            <span style={{fontSize:10,color:msState[i]?"#555":"#888",lineHeight:1.4,textDecoration:msState[i]?"line-through":"none"}}>{m}</span>
          </div>)}
        </div>}

        {/* Recent entries */}
        {rel.length>0&&<div style={{borderTop:"1px solid #eee",paddingTop:6,marginTop:6}}>
          <div style={{fontSize:9,textTransform:"uppercase",color:"#bbb",marginBottom:4}}>Recent</div>
          {rel.slice(0,3).map(e=><div key={e.id} onClick={()=>{if(onNavigateEntry)onNavigateEntry(e.id);}} style={{fontSize:10,color:"#4a7ab5",marginBottom:3,lineHeight:1.35,cursor:"pointer",textDecoration:"underline"}}>{e.title || e.insight?.slice(0,70)}{(!e.title && e.insight?.length>70)?"...":""}</div>)}
          {rel.length>3&&<div style={{fontSize:9,color:"#ccc",fontStyle:"italic"}}>+{rel.length-3} more</div>}
        </div>}
      </div>
    </foreignObject>
  </g>;
}

// ─── TREE SVG ───
function Tree({ xp, raw, sel, onSel, entries, av, hasMilestone, completedMs, onToggleMs, admin, onNavigateEntry }) {
  const W=600,H=520,cW=W/6,rH=H/5.2,nR=24;
  const gp=n=>({x:20+n.col*cW,y:36+n.row*rH});
  const pr=id=>{const n=NODES.find(x=>x.id===id);return n?Math.min(1,(xp[id]||0)/n.xp):0;};
  const ulFull=id=>{const n=NODES.find(x=>x.id===id);if(!n)return false;return(xp[id]||0)>=n.xp&&hasMilestone(id);};
  const cl=n=>{const v=pr(n.id);if(ulFull(n.id))return n.b?BR[n.b]?.color||"#1a1a1a":"#1a1a1a";if(v>0)return n.b?BR[n.b]?.color||"#888":"#555";return "#bbb";};
  const op=n=>{if(ulFull(n.id))return 1;const v=pr(n.id);if(v>0)return 0.8;const r=n.req||[];return(r.length===0||r.every(rid=>ulFull(rid)))?0.55:0.3;};
  const sn=sel?NODES.find(n=>n.id===sel):null;

  return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxWidth:600,display:"block",margin:"0 auto",overflow:"visible"}}>
    <defs>
      <filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity=".12"/></filter>
    </defs>
    {NODES.map(n=>(n.req||[]).map(rid=>{
      const rn=NODES.find(x=>x.id===rid);if(!rn)return null;
      const f=gp(rn),t=gp(n),sd=ulFull(rid),ta=(n.req||[]).every(r=>ulFull(r)),bd=sd&&ulFull(n.id);
      const lc=bd?(n.b?BR[n.b]?.color||"#1a1a1a":"#1a1a1a"):(sd&&ta)?(n.b?BR[n.b]?.color||"#999":"#999"):"#ddd";
      return <line key={`${rid}-${n.id}`} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={lc} strokeWidth={bd?3.5:(sd&&ta)?2.2:1} strokeDasharray={(sd&&ta)||bd?"none":"4,4"} opacity={bd?0.9:(sd&&ta)?0.65:0.3}/>;
    }))}
    {NODES.map(n=>{
      const pp=gp(n),v=pr(n.id),c=cl(n),o=op(n),s=sel===n.id;
      const r=n.t<=0||n.t>=4?nR+7:n.t>=3?nR+3:nR;
      const ci=2*Math.PI*(r+3);
      const done=ulFull(n.id);
      const ic=IC[n.id],icC=done?"#fff":c;
      return <g key={n.id} onClick={e=>{e.stopPropagation();onSel(n.id===sel?null:n.id);}} style={{cursor:"pointer"}} opacity={o}>
        <circle cx={pp.x} cy={pp.y} r={r+3} fill="none" stroke="#e5e2dc" strokeWidth={2.5}/>
        <circle cx={pp.x} cy={pp.y} r={r+3} fill="none" stroke={c} strokeWidth={2.5} strokeDasharray={ci} strokeDashoffset={ci*(1-v)} strokeLinecap="round" transform={`rotate(-90 ${pp.x} ${pp.y})`} style={{transition:"stroke-dashoffset .5s"}}/>
        <circle cx={pp.x} cy={pp.y} r={r} fill={done?c:"#faf8f5"} stroke={s?c:"none"} strokeWidth={s?3:0} filter={done?"url(#gl)":"url(#sh)"}/>
        <g transform={`translate(${pp.x},${pp.y}) scale(${r>27?1.1:.85})`}>{ic?ic(icC):null}</g>
        <text x={pp.x} y={pp.y+r+14} textAnchor="middle" dominantBaseline="central" fontSize={n.t>=4?11:9} fontWeight={n.t>=3?700:600} fill={done?"#1a1a1a":"#888"} fontFamily="'DM Sans',sans-serif" style={{pointerEvents:"none"}}>{n.label}</text>
      </g>;
    })}
    {sn&&<Popover node={sn} xpVal={xp[sn.id]} rawVal={raw[sn.id]} entries={entries} isAvail={av(sn.id)} hasMilestone={hasMilestone(sn.id)} completedMs={completedMs[sn.id]} onToggleMs={onToggleMs} pos={gp(sn)} onClose={()=>onSel(null)} admin={admin} onNavigateEntry={onNavigateEntry}/>}
  </svg>;
}

// ─── PDF THUMB ───
function FileThumbnail({file, onRemove, onUpdateCaption, isAdmin}){
  const ext = (file.name||"").split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isExcel = ['xlsx','xls','xlsm','csv'].includes(ext);
  const icon = isPdf ? "📄" : isExcel ? "📊" : "📎";
  const badge = isPdf ? "PDF" : isExcel ? ext.toUpperCase() : "FILE";
  const badgeColor = isPdf ? "#e74c3c" : isExcel ? "#217346" : "#666";
  const mimeTypes = {pdf:"application/pdf",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xls:"application/vnd.ms-excel",xlsm:"application/vnd.ms-excel.sheet.macroEnabled.12",csv:"text/csv"};
  const download = (e) => {
    e.stopPropagation();
    if (!file.data) return;
    const byteChars = atob(file.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArray], { type: mimeTypes[ext] || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name || "download"; a.click();
    URL.revokeObjectURL(url);
  };
  return <div style={{position:"relative",display:"inline-flex",flexDirection:"column",width:160}}>
    <div style={{borderRadius:4,border:"1px solid #ddd",background:"#fff",padding:10,position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:24}}>{icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",color:"#555",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name?.slice(0,30)||"File"}</div>
          {file.size&&<div style={{fontSize:8,color:"#bbb",fontFamily:"'DM Sans',sans-serif"}}>{fsize(file.size)}</div>}
        </div>
        <span style={{fontSize:8,fontFamily:"'DM Sans',sans-serif",padding:"1px 5px",borderRadius:2,fontWeight:700,background:badgeColor,color:"#fff"}}>{badge}</span>
      </div>
      {isAdmin && onUpdateCaption ? (
        <input value={file.caption||""} onChange={e=>onUpdateCaption(e.target.value)} placeholder="Add note..." onClick={e=>e.stopPropagation()}
          style={{width:"100%",padding:"4px 6px",border:"1px solid #e5e2dc",borderRadius:3,fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",color:"#555",marginBottom:4}}/>
      ) : file.caption ? (
        <div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",color:"#888",fontStyle:"italic",lineHeight:1.3,marginBottom:4}}>{file.caption}</div>
      ) : null}
      {file.data && <button onClick={download} style={{width:"100%",padding:"4px",background:"#f7f5f2",border:"1px solid #e5e2dc",borderRadius:3,fontSize:10,fontFamily:"'DM Sans',sans-serif",color:"#555",cursor:"pointer",fontWeight:600}}>Download</button>}
    </div>
    {isAdmin&&onRemove&&<button onClick={e=>{e.stopPropagation();onRemove();}} style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:9,background:"#e74c3c",color:"#fff",border:"none",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
  </div>;
}

// ─── BLOCK EDITOR ───
function BlockEditor({ blocks, onChange, placeholder, label, autoFocus }) {
  const imgRef = useRef(null);
  const textRefs = useRef({});
  const addText = () => onChange([...blocks, { type: "text", content: "" }]);
  const addImage = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 3 * 1024 * 1024) { alert("Max ~3MB per image"); continue; }
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      onChange([...blocks, { type: "image", data, name: file.name }]);
    }
    if (imgRef.current) imgRef.current.value = "";
  };
  const updateBlock = (i, val) => { const n = [...blocks]; n[i] = { ...n[i], content: val }; onChange(n); };
  const removeBlock = (i) => onChange(blocks.filter((_, j) => j !== i));

  const wrapSelection = (i, before, after) => {
    const ta = textRefs.current[i];
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const txt = blocks[i].content;
    if (s === e) return;
    const selected = txt.slice(s, e);
    const newText = txt.slice(0, s) + before + selected + after + txt.slice(e);
    updateBlock(i, newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, e + before.length); }, 10);
  };

  const insertLink = (i) => {
    const ta = textRefs.current[i];
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const txt = blocks[i].content;
    const selected = txt.slice(s, e);
    const url = prompt("URL:", "https://");
    if (!url) return;
    const linkText = selected || "link";
    const newText = txt.slice(0, s) + "[" + linkText + "](" + url + ")" + txt.slice(e);
    updateBlock(i, newText);
  };

  const tbtn = { background: "none", border: "1px solid #ddd", borderRadius: 3, padding: "2px 7px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans',sans-serif", color: "#666", lineHeight: 1 };

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={i} style={{ position: "relative", marginBottom: 6 }}>
          {block.type === "text" ? (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <button type="button" onClick={() => wrapSelection(i, "**", "**")} style={{ ...tbtn, fontWeight: 700 }} title="Bold">B</button>
                <button type="button" onClick={() => wrapSelection(i, "*", "*")} style={{ ...tbtn, fontStyle: "italic" }} title="Italic">I</button>
                <button type="button" onClick={() => insertLink(i)} style={tbtn} title="Insert link">🔗</button>
              </div>
              <textarea
                ref={el => { textRefs.current[i] = el; }}
                autoFocus={autoFocus && i === 0}
                style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", minHeight: i === 0 ? 80 : 56, resize: "vertical" }}
                value={block.content}
                onChange={e => updateBlock(i, e.target.value)}
                placeholder={i === 0 ? placeholder : "Continue writing..."}
              />
            </div>
          ) : (
            <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid #e5e2dc" }}>
              <img src={block.data} alt={block.name || "image"} style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block", background: "#f8f6f3" }} />
            </div>
          )}
          {(blocks.length > 1 || block.type === "image") && (
            <button onClick={() => removeBlock(i)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: "#e74c3c", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={addText} style={{ padding: "4px 10px", border: "1px dashed #ccc", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans',sans-serif", color: "#999" }}>+ Text</button>
        <button onClick={() => imgRef.current?.click()} style={{ padding: "4px 10px", border: "1px dashed #ccc", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans',sans-serif", color: "#999" }}>🖼 Image</button>
        <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={addImage} />
      </div>
    </div>
  );
}

// ─── STATS DASHBOARD ───
function StatsDashboard({ entries, signals, xpData, completedMs }) {
  const { raw, xp, ul, hasMilestone } = xpData;
  const DM = "'DM Sans',sans-serif";
  const NR = "'Newsreader',Georgia,serif";

  // Overall progress
  const totalXP = Object.values(xp).reduce((a, b) => a + b, 0);
  const maxXP = NODES.reduce((a, n) => a + n.xp, 0);
  const nodesUnlocked = NODES.filter(n => ul(n.id)).length;
  const totalMilestones = NODES.reduce((a, n) => a + (n.milestones?.length || 0), 0);
  const completedMilestoneCount = NODES.reduce((a, n) => {
    const ms = completedMs[n.id] || [];
    return a + ms.filter(v => v === true).length;
  }, 0);

  // Activity by week (last 12 weeks)
  const now = new Date();
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const wStart = new Date(now);
    wStart.setDate(wStart.getDate() - (i * 7 + now.getDay()));
    wStart.setHours(0, 0, 0, 0);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    const count = entries.filter(e => { const d = new Date(e.date); return d >= wStart && d < wEnd; }).length;
    const sigCount = signals.filter(s => { const d = new Date(s.date); return d >= wStart && d < wEnd; }).length;
    const label = wStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeks.push({ label, count, sigCount, total: count + sigCount });
  }
  const maxWeek = Math.max(...weeks.map(w => w.total), 1);

  // Branch breakdown
  const branchData = Object.entries(BR).map(([key, b]) => {
    const branchNodes = NODES.filter(n => n.b === key);
    const branchXP = branchNodes.reduce((a, n) => a + (xp[n.id] || 0), 0);
    const branchMax = branchNodes.reduce((a, n) => a + n.xp, 0);
    const branchUnlocked = branchNodes.filter(n => ul(n.id)).length;
    const branchMsTotal = branchNodes.reduce((a, n) => a + (n.milestones?.length || 0), 0);
    const branchMsDone = branchNodes.reduce((a, n) => {
      const ms = completedMs[n.id] || [];
      return a + ms.filter(v => v === true).length;
    }, 0);
    return { key, name: b.name, color: b.color, xp: branchXP, max: branchMax, unlocked: branchUnlocked, total: branchNodes.length, msDone: branchMsDone, msTotal: branchMsTotal };
  });

  // Node-level detail
  const nodeData = NODES.map(n => {
    const msArr = completedMs[n.id] || [];
    const msDone = msArr.filter(v => v === true).length;
    const msTotal = n.milestones?.length || 0;
    const xpVal = xp[n.id] || 0;
    const pct = Math.min(1, xpVal / n.xp);
    const entryCount = entries.filter(e => (C2N[e.category] || []).includes(n.id)).length;
    return { ...n, xpVal, pct, msDone, msTotal, entryCount, unlocked: ul(n.id) };
  });

  // Streak: consecutive days with at least 1 entry
  const daySet = new Set(entries.map(e => new Date(e.date).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  // Category distribution
  const catCounts = {};
  entries.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCats.length > 0 ? topCats[0][1] : 1;

  // Avg XP weight
  const avgWeight = entries.length > 0 ? (entries.reduce((a, e) => a + entryWeight(e), 0) / entries.length).toFixed(1) : "—";

  const card = { background: "#fff", border: "1px solid #e5e2dc", borderRadius: 8, padding: "16px 18px" };
  const sLabel = { fontSize: 10, fontFamily: DM, textTransform: "uppercase", letterSpacing: ".08em", color: "#aaa", fontWeight: 600, marginBottom: 8 };
  const bigNum = { fontSize: 32, fontWeight: 700, fontFamily: DM, color: "#1a1a1a", lineHeight: 1 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: DM }}>

      {/* Top row: key numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <div style={card}>
          <div style={sLabel}>Entries</div>
          <div style={bigNum}>{entries.length}</div>
        </div>
        <div style={card}>
          <div style={sLabel}>Signals</div>
          <div style={bigNum}>{signals.length}</div>
        </div>
        <div style={card}>
          <div style={sLabel}>Streak</div>
          <div style={bigNum}>{streak}<span style={{ fontSize: 14, color: "#aaa", fontWeight: 400 }}>d</span></div>
        </div>
        <div style={card}>
          <div style={sLabel}>Avg XP</div>
          <div style={bigNum}>{avgWeight}<span style={{ fontSize: 14, color: "#aaa", fontWeight: 400 }}>x</span></div>
        </div>
      </div>

      {/* Progress overview */}
      <div style={card}>
        <div style={sLabel}>Overall Progress</div>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{nodesUnlocked}</span>
            <span style={{ fontSize: 13, color: "#999" }}>/{NODES.length} nodes</span>
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{completedMilestoneCount}</span>
            <span style={{ fontSize: 13, color: "#999" }}>/{totalMilestones} milestones</span>
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{totalXP}</span>
            <span style={{ fontSize: 13, color: "#999" }}>/{maxXP} XP</span>
          </div>
        </div>
      </div>

      {/* Activity chart: 12-week bar chart */}
      <div style={card}>
        <div style={sLabel}>Activity (last 12 weeks)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
          {weeks.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 80 }}>
                {w.sigCount > 0 && <div style={{ width: "100%", height: Math.max(2, (w.sigCount / maxWeek) * 80), background: "#d0e0f0", borderRadius: "2px 2px 0 0" }} />}
                {w.count > 0 && <div style={{ width: "100%", height: Math.max(2, (w.count / maxWeek) * 80), background: "#1a1a1a", borderRadius: w.sigCount > 0 ? "0" : "2px 2px 0 0" }} />}
                {w.total === 0 && <div style={{ width: "100%", height: 2, background: "#e5e2dc" }} />}
              </div>
              <div style={{ fontSize: 7, color: "#bbb", whiteSpace: "nowrap" }}>{i % 2 === 0 ? w.label : ""}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: "#999" }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#1a1a1a", borderRadius: 1, marginRight: 4 }} />Entries</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#d0e0f0", borderRadius: 1, marginRight: 4 }} />Signals</span>
        </div>
      </div>

      {/* Branch breakdown */}
      <div style={card}>
        <div style={sLabel}>Branch Progress</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {branchData.map(b => {
            const pct = b.max > 0 ? b.xp / b.max : 0;
            return (
              <div key={b.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: b.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{b.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#999" }}>{b.unlocked}/{b.total} nodes · {b.msDone}/{b.msTotal} ms</span>
                </div>
                <div style={{ height: 6, background: "#e5e2dc", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct * 100}%`, background: b.color, borderRadius: 3, transition: "width .4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node-by-node detail */}
      <div style={card}>
        <div style={sLabel}>Node Detail</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {nodeData.map(n => {
            const c = n.b ? BR[n.b]?.color : "#1a1a1a";
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f1ee" }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: n.unlocked ? c : "#ddd", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: n.unlocked ? "#333" : "#999", flex: 1, minWidth: 0 }}>{n.label}</span>
                <span style={{ fontSize: 10, color: "#bbb", whiteSpace: "nowrap" }}>{n.entryCount} entries</span>
                <span style={{ fontSize: 10, color: n.xpVal >= n.xp ? "#2a6e4e" : "#bbb", fontWeight: n.xpVal >= n.xp ? 600 : 400, whiteSpace: "nowrap" }}>{n.xpVal}/{n.xp} XP</span>
                <span style={{ fontSize: 10, color: n.msDone >= n.msTotal ? "#2a6e4e" : "#c4882a", whiteSpace: "nowrap" }}>{n.msDone}/{n.msTotal} ms</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top categories */}
      <div style={card}>
        <div style={sLabel}>Top Categories</div>
        {topCats.length === 0 ? <div style={{ fontSize: 12, color: "#bbb" }}>No entries yet.</div> :
          topCats.map(([cat, count]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#666", flex: 1, minWidth: 0 }}>{cat}</span>
              <div style={{ width: 120, height: 6, background: "#e5e2dc", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(count / maxCat) * 100}%`, background: "#1a1a1a", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, color: "#999", width: 20, textAlign: "right" }}>{count}</span>
            </div>
          ))
        }
      </div>

      {/* Weakest links */}
      <div style={card}>
        <div style={sLabel}>Weakest Links (lowest XP relative to threshold)</div>
        {(() => {
          const weak = nodeData.filter(n => !n.unlocked && n.id !== "cfo").sort((a, b) => a.pct - b.pct).slice(0, 4);
          if (weak.length === 0) return <div style={{ fontSize: 12, color: "#2a6e4e" }}>All nodes progressing well.</div>;
          return weak.map(n => {
            const c = n.b ? BR[n.b]?.color : "#1a1a1a";
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: c, opacity: 0.5 }} />
                <span style={{ fontSize: 12, color: "#666", flex: 1 }}>{n.label}</span>
                <span style={{ fontSize: 11, color: "#c4882a", fontWeight: 600 }}>{Math.round(n.pct * 100)}%</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ─── FORMATTED TEXTAREA (shared toolbar for signal form) ───
function FormattedArea({ value, onChange, placeholder, minHeight, style: s }) {
  const ref = useRef(null);
  const tbtn = { background: "none", border: "1px solid #ddd", borderRadius: 3, padding: "2px 7px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans',sans-serif", color: "#666", lineHeight: 1 };
  const wrap = (before, after) => {
    const ta = ref.current; if (!ta) return;
    const ss = ta.selectionStart, se = ta.selectionEnd;
    if (ss === se) return;
    const n = value.slice(0, ss) + before + value.slice(ss, se) + after + value.slice(se);
    onChange(n);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ss + before.length, se + before.length); }, 10);
  };
  const insertLink = () => {
    const ta = ref.current; if (!ta) return;
    const ss = ta.selectionStart, se = ta.selectionEnd;
    const sel = value.slice(ss, se);
    const url = prompt("URL:", "https://");
    if (!url) return;
    const lt = sel || "link";
    onChange(value.slice(0, ss) + "[" + lt + "](" + url + ")" + value.slice(se));
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <button type="button" onClick={() => wrap("**", "**")} style={{ ...tbtn, fontWeight: 700 }} title="Bold">B</button>
        <button type="button" onClick={() => wrap("*", "*")} style={{ ...tbtn, fontStyle: "italic" }} title="Italic">I</button>
        <button type="button" onClick={insertLink} style={tbtn} title="Insert link">🔗</button>
      </div>
      <textarea ref={ref} style={{ ...s, minHeight: minHeight || 60 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ─── SIGNAL BOARD ───
function SignalBoard({ signals, onAdd, onRemove, admin, onPromote, onEditSignal }) {
  const [showForm, setShowForm] = useState(false);
  const [editSig, setEditSig] = useState(null);
  const [filterNode, setFilterNode] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const selecting = selected.size > 0;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = signals.filter(s => {
    if (filterNode !== "All" && !s.nodes.includes(filterNode)) return false;
    if (filterType !== "All" && s.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const fields = [s.title, s.note || "", s.source || "", s.quote || "", s.url || ""].map(f => f.toLowerCase());
      if (!fields.some(f => f.includes(q))) return false;
    }
    return true;
  });
  const q = search.trim().toLowerCase();

  const handlePromote = () => {
    const sigs = signals.filter(s => selected.has(s.id));
    if (sigs.length > 0) { onPromote(sigs); setSelected(new Set()); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{position:"relative",flex:1,minWidth:140}}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search signals..."
            style={{ width:"100%", padding: "8px 12px 8px 32px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing:"border-box" }} />
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#bbb",pointerEvents:"none"}}>🔍</span>
          {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:14,color:"#aaa",cursor:"pointer"}}>✕</button>}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: "8px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="All">All types</option>
          {SIG_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filterNode} onChange={e => setFilterNode(e.target.value)}
          style={{ padding: "8px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="All">All nodes</option>
          {NODES.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
        {admin && (
          <button onClick={() => setShowForm(true)}
            style={{ padding: "8px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
            + Signal
          </button>
        )}
      </div>

      {/* Selection bar */}
      {admin && selecting && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f0faf5", border: "1px solid #c5e8d5", borderRadius: 6, marginBottom: 12, fontFamily: "'DM Sans',sans-serif" }}>
          <span style={{ fontSize: 12, color: "#2a6e4e", fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={handlePromote} style={{ padding: "6px 14px", background: "#2a6e4e", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Promote to Archive →
          </button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "6px 10px", background: "none", border: "1px solid #ccc", borderRadius: 4, fontSize: 11, cursor: "pointer", color: "#888" }}>
            Cancel
          </button>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#999", fontFamily: "'DM Sans',sans-serif", marginBottom: 12 }}>
        {filtered.length} signal{filtered.length !== 1 ? "s" : ""}{filterNode !== "All" ? ` tagged ${NODES.find(n => n.id === filterNode)?.label}` : ""}
        {q && ` matching "${search}"`}
        {admin && !selecting && filtered.length > 0 && <span style={{ color: "#bbb", marginLeft: 8 }}>· click cards to select for promotion</span>}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📡</div>
          <p style={{ color: "#999", fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
            {signals.length === 0 ? "No signals yet. Capture articles, tweets, podcasts, and observations as you find them." : "No signals match your filters."}
          </p>
        </div>
      ) : (
        <>
          {/* Expanded card rendered full-width above grid */}
          {expandedId && (() => {
            const s = filtered.find(x => x.id === expandedId);
            if (!s) return null;
            return <div style={{ marginBottom: 16 }}>
              <SignalCard key={s.id} signal={s} admin={admin} onRemove={() => onRemove(s.id)} searchTerm={q}
                isSelected={selected.has(s.id)} onSelect={() => toggleSelect(s.id)}
                onPromoteSingle={() => onPromote([s])}
                onEdit={() => { setEditSig(s); setShowForm(true); }}
                expanded={true} onToggleExpand={() => setExpandedId(null)} fullWidth />
            </div>;
          })()}
          {/* Column grid with non-expanded cards */}
          <div style={{ columnCount: 2, columnGap: 12 }}>
            {filtered.filter(s => s.id !== expandedId).map(s => (
              <SignalCard key={s.id} signal={s} admin={admin} onRemove={() => onRemove(s.id)} searchTerm={q}
                isSelected={selected.has(s.id)} onSelect={() => toggleSelect(s.id)}
                onPromoteSingle={() => onPromote([s])}
                onEdit={() => { setEditSig(s); setShowForm(true); }}
                expanded={false} onToggleExpand={() => setExpandedId(s.id)} />
            ))}
          </div>
        </>
      )}
      {showForm && <SignalForm initial={editSig} onSave={(sig) => { if (editSig) { onEditSignal(sig); } else { onAdd(sig); } setShowForm(false); setEditSig(null); }} onCancel={() => { setShowForm(false); setEditSig(null); }} />}
    </div>
  );
}

function SignalCard({ signal, admin, onRemove, searchTerm, isSelected, onSelect, onPromoteSingle, onEdit, expanded, onToggleExpand, fullWidth }) {
  const typeInfo = SIG_TYPES.find(t => t.id === signal.type) || SIG_TYPES[0];
  const nodeNames = (signal.nodes || []).map(nid => NODES.find(n => n.id === nid)).filter(Boolean);
  const secLabel=(color)=>({fontSize:13,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:".06em",color:color,fontWeight:800,marginBottom:4});
  const secWrap=(color)=>({borderLeft:`3px solid ${color}`,paddingLeft:14,marginBottom:12,borderRadius:0});

  const renderParas = (text, term) => {
    if (!text) return null;
    const paras = text.split(/\n\n+/);
    return paras.map((p, i) => {
      if (!p.trim()) return null;
      const lines = p.split(/\n/);
      return (<p key={i} style={{fontSize:fullWidth?15:13,lineHeight:1.6,margin:"0 0 8px",color:"#1a1a1a"}}>
        {lines.map((line, li) => (<span key={li}>{li > 0 && <br/>}<RichText text={line} hlTerm={term} /></span>))}
      </p>);
    });
  };

  return (
    <div style={{ breakInside: "avoid", marginBottom: fullWidth ? 0 : 12, background: isSelected ? "#f0faf5" : "#fff", border: isSelected ? "2px solid #2a6e4e" : "1px solid #e5e2dc", borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "all .15s" }}
      onClick={onToggleExpand}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"; }}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ height: 3, background: typeInfo.color }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          {admin && <span onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ width: 16, height: 16, borderRadius: 3, border: isSelected ? "none" : "1.5px solid #ccc", background: isSelected ? "#2a6e4e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: "#fff", marginTop: 2, cursor: "pointer" }}>{isSelected ? "✓" : ""}</span>}
          <span style={{ fontSize: 16, lineHeight: 1 }}>{typeInfo.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: fullWidth ? 20 : 15, fontWeight: 700, fontFamily: "'Newsreader',Georgia,serif", lineHeight: 1.3 }}><Highlight text={signal.title} term={searchTerm} /></div>
            <div style={{ fontSize: 11, color: "#aaa", fontFamily: "'DM Sans',sans-serif", marginTop: 3 }}>{fmtRelative(signal.date)}</div>
          </div>
        </div>

        {signal.quote && (
          <div style={secWrap("#8b2500")}>
            <div style={secLabel("#8b2500")}>Key Quote</div>
            {expanded ? renderParas(signal.quote, searchTerm) : <p style={{fontSize:13,color:"#666",fontStyle:"italic",margin:0,lineHeight:1.5}}><RichText text={signal.quote.length > 120 ? signal.quote.slice(0, 120) + "..." : signal.quote} hlTerm={searchTerm} /></p>}
          </div>
        )}

        {signal.note && expanded && (
          <div style={secWrap("#1a4a7a")}>
            <div style={secLabel("#1a4a7a")}>Your Take</div>
            {renderParas(signal.note, searchTerm)}
          </div>
        )}

        {signal.source && expanded && (
          <div style={secWrap("#5a4a3a")}>
            <div style={secLabel("#5a4a3a")}>Source</div>
            <div style={{fontSize:13,color:"#666",fontFamily:"'DM Sans',sans-serif",fontStyle:"italic"}}><Highlight text={signal.source} term={searchTerm} /></div>
          </div>
        )}

        {signal.url && expanded && (
          <div style={secWrap("#5a4a3a")}>
            <div style={secLabel("#5a4a3a")}>Link</div>
            <a href={normalizeUrl(signal.url)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "#8b6508", fontFamily: "'DM Sans',sans-serif", wordBreak: "break-all", textDecoration: "underline" }}>
              {signal.url}
            </a>
          </div>
        )}

        {signal.pdfs && signal.pdfs.length > 0 && expanded && (
          <div style={secWrap("#5a4a3a")}>
            <div style={secLabel("#5a4a3a")}>Attachments</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{signal.pdfs.map((p,i)=><FileThumbnail key={i} file={p} isAdmin={false}/>)}</div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {nodeNames.map(n => {
            const nc = n.b ? BR[n.b]?.color : "#1a1a1a";
            return <span key={n.id} style={{ fontSize: 9, padding: "2px 7px", background: nc + "15", color: nc, borderRadius: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{n.label}</span>;
          })}
        </div>

        {admin && expanded && (
          <div style={{ marginTop: 10, display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #f0ede8" }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{ background: "none", border: "none", fontSize: 11, color: "#555", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "underline" }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onPromoteSingle(); }}
              style={{ background: "none", border: "none", fontSize: 11, color: "#2a6e4e", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "underline" }}>Promote →</button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
              style={{ background: "none", border: "none", fontSize: 11, color: "#c44", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "underline" }}>Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalForm({ onSave, onCancel, initial }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [type, setType] = useState(initial?.type || "article");
  const [source, setSource] = useState(initial?.source || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [quote, setQuote] = useState(initial?.quote || "");
  const [note, setNote] = useState(initial?.note || "");
  const [nodes, setNodes] = useState(initial?.nodes || []);
  const [pdfs, setPdfs] = useState(initial?.pdfs || []);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const toggleNode = (nid) => setNodes(prev => prev.includes(nid) ? prev.filter(x => x !== nid) : [...prev, nid]);
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      if (file.size > 4.5 * 1024 * 1024) { alert("Max ~4.5MB per file"); continue; }
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      setPdfs(p => [...p, { name: file.name, size: file.size, data, caption: "" }]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const S = { lb: { fontSize: 11, fontFamily: "'DM Sans',sans-serif", textTransform: "uppercase", letterSpacing: ".06em", color: "#888", fontWeight: 600, marginTop: 12 }, inp: { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" } };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px 0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{initial ? "Edit Signal" : "Capture Signal"}</h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
        </div>
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={S.lb}>Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SIG_TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                style={{ padding: "6px 12px", borderRadius: 20, border: type === t.id ? "2px solid #1a1a1a" : "1px solid #ddd", background: type === t.id ? t.color : "#fff", fontSize: 12, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", fontWeight: type === t.id ? 700 : 400 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <label style={S.lb}>Title / Headline *</label>
          <input style={S.inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="What caught your eye?" />
          <label style={S.lb}>Source</label>
          <input style={S.inp} value={source} onChange={e => setSource(e.target.value)} placeholder="Author, publication, podcast..." />
          <label style={S.lb}>URL (optional)</label>
          <input style={S.inp} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          <label style={S.lb}>Key Quote / Excerpt</label>
          <FormattedArea style={{ ...S.inp, resize: "vertical" }} minHeight={70} value={quote} onChange={setQuote} placeholder="The line that made you stop scrolling..." />
          <label style={S.lb}>Your Take (optional)</label>
          <FormattedArea style={{ ...S.inp, resize: "vertical" }} minHeight={50} value={note} onChange={setNote} placeholder="Why does this matter? What does it connect to?" />
          <label style={S.lb}>Attachments (PDFs, Excel)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {pdfs.map((p, i) => <FileThumbnail key={i} file={p} isAdmin onRemove={() => setPdfs(pr => pr.filter((_, j) => j !== i))} onUpdateCaption={(cap) => setPdfs(pr => { const n = [...pr]; n[i] = { ...n[i], caption: cap }; return n; })} />)}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: 140, height: 80, borderRadius: 4, border: "2px dashed #ccc", background: "none", cursor: "pointer", color: "#aaa", fontSize: 12, fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>{uploading ? "..." : <><span style={{ fontSize: 20 }}>+</span>Upload</>}</button>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.xlsm,.csv" multiple style={{ display: "none" }} onChange={handleFiles} />
          </div>
          <label style={S.lb}>Tag to Skill Nodes</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {NODES.map(n => {
              const nc = n.b ? BR[n.b]?.color : "#1a1a1a";
              const sel = nodes.includes(n.id);
              return (
                <button key={n.id} onClick={() => toggleNode(n.id)}
                  style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, fontFamily: "'DM Sans',sans-serif", border: sel ? `2px solid ${nc}` : "1px solid #e0ddd6", background: sel ? nc + "18" : "#fff", color: sel ? nc : "#999", fontWeight: sel ? 700 : 400, cursor: "pointer" }}>
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 22px 18px" }}>
          <button onClick={onCancel} style={{ background: "transparent", border: "1px solid #ddd", padding: "10px 18px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", borderRadius: 4, color: "#666" }}>Cancel</button>
          <button onClick={() => { if (!title.trim()) return; onSave({ id: initial?.id || gid(), title: title.trim(), type, source: source.trim(), url: url.trim(), quote: quote.trim(), note: note.trim(), nodes, pdfs, date: initial?.date || new Date().toISOString() }); }} disabled={!title.trim()}
            style={{ background: "#1a1a1a", color: "#fff", border: "none", padding: "10px 22px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: "pointer", borderRadius: 4, opacity: title.trim() ? 1 : 0.4 }}>{initial ? "Update" : "Capture"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM ───
function Form({onSave,onCancel,xpData,initial,completedMs}){
  const {xp,raw}=xpData;
  const [title, setTitle] = useState(initial?.title || "");
  // Multiple sources: array of {name, url}
  const initSources = initial?.sources || (initial?.source ? [{name: initial.source, url: ""}] : []);
  const [sources, setSources] = useState(initSources);
  const [newSrcName, setNewSrcName] = useState("");
  const [newSrcUrl, setNewSrcUrl] = useState("");
  const addSource = () => {
    if (!newSrcName.trim() && !newSrcUrl.trim()) return;
    setSources(p => [...p, { name: newSrcName.trim(), url: newSrcUrl.trim() }]);
    setNewSrcName(""); setNewSrcUrl("");
  };
  // Convert legacy plain text to blocks
  const initInsight = initial?.insightBlocks || (initial?.insight ? [{type:"text",content:initial.insight}] : [{type:"text",content:""}]);
  const initConn = initial?.connectionBlocks || (initial?.careerConnection ? [{type:"text",content:initial.careerConnection}] : [{type:"text",content:""}]);
  const [insightBlocks,setInsightBlocks]=useState(initInsight);
  const [connectionBlocks,setConnectionBlocks]=useState(initConn);
  const [cat,setCat]=useState(initial?.category||CATS[0]);
  const [links,setLinks]=useState(initial?.links||[]);
  const [pdfs,setPdfs]=useState(initial?.pdfs||[]);
  const [nUrl,setNUrl]=useState("");const [nLbl,setNLbl]=useState("");
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef(null);
  const addUrl=()=>{if(!nUrl.trim())return;setLinks(p=>[...p,{url:nUrl.trim(),label:nLbl.trim()||null}]);setNUrl("");setNLbl("");};
  const handleFiles=async e=>{const files=Array.from(e.target.files||[]);if(!files.length)return;setUploading(true);const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel","text/csv"];for(const file of files){if(!allowed.includes(file.type)&&!file.name.match(/\.(pdf|xlsx|xls|xlsm|csv)$/i))continue;if(file.size>4.5*1024*1024){alert("Max ~4.5MB per file");continue;}const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});setPdfs(p=>[...p,{name:file.name,size:file.size,data,caption:""}]);}setUploading(false);if(fileRef.current)fileRef.current.value="";};

  // Milestone claims
  const initClaims = initial?.milestoneClaims || {};
  const [claims, setClaims] = useState(initClaims);
  const affectedNodes = (C2N[cat]||[]).map(id=>NODES.find(n=>n.id===id)).filter(Boolean);
  const toggleClaim = (nodeId, msIdx) => {
    setClaims(prev => {
      const nc = [...(prev[nodeId] || [])];
      const i = nc.indexOf(msIdx);
      if (i >= 0) nc.splice(i, 1); else nc.push(msIdx);
      return { ...prev, [nodeId]: nc };
    });
  };
  // Check which milestones are already completed
  const isMsDone = (nodeId, msIdx) => {
    const ms = completedMs?.[nodeId] || [];
    return ms[msIdx] === true;
  };

  const insightText = getTextFromBlocks(insightBlocks);
  const connText = getTextFromBlocks(connectionBlocks);
  const hasAttach = pdfs.length > 0 || (sources && sources.some(s => s.url)) || blocksHaveImage(insightBlocks) || blocksHaveImage(connectionBlocks);
  const previewWeight = (() => { let w=1; if(insightText.length>200)w+=1; if(connText.length>20)w+=1; if(hasAttach)w+=1; return w; })();
  const hasInsight = insightText.trim().length > 0 || insightBlocks.some(b => b.type === "image");

  const aff=(C2N[cat]||[]).map(id=>NODES.find(n=>n.id===id)).filter(Boolean);
  const S={lb:{fontSize:11,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:".06em",color:"#888",fontWeight:600},inp:{padding:"10px 12px",border:"1px solid #ddd",borderRadius:4,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"}};

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
    <div style={{background:"#fff",borderRadius:8,width:"100%",maxWidth:540,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 0"}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>{initial?"Edit Entry":"Log a Learning"}</h2>
        <button onClick={onCancel} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#999"}}>✕</button>
      </div>
      <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:10}}>
        <label style={S.lb}>Title *</label>
        <input style={{...S.inp,fontSize:16,fontWeight:600,fontFamily:"'Newsreader',Georgia,serif"}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What is this learning about?" />
        <label style={S.lb}>Sources</label>
        {sources.map((src, i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,padding:"6px 10px",background:"#f0ede8",borderRadius:4,border:"1px solid #e0ddd6"}}>
              <div style={{fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600,color:"#555"}}>{src.name || "Untitled source"}</div>
              {src.url && <div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",color:"#8b6508",wordBreak:"break-all"}}>{src.url}</div>}
            </div>
            <button onClick={()=>setSources(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#c44",fontSize:14,cursor:"pointer"}}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input style={{...S.inp,flex:1}} value={newSrcName} onChange={e=>setNewSrcName(e.target.value)} placeholder="Source name (book, podcast, author...)" onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addSource())}/>
          <input style={{...S.inp,width:120}} value={newSrcUrl} onChange={e=>setNewSrcUrl(e.target.value)} placeholder="URL (optional)" onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addSource())}/>
          <button onClick={addSource} disabled={!newSrcName.trim()&&!newSrcUrl.trim()} style={{width:32,height:38,background:"#1a1a1a",color:"#fff",border:"none",borderRadius:4,fontSize:18,cursor:"pointer",opacity:(newSrcName.trim()||newSrcUrl.trim())?1:0.3}}>+</button>
        </div>
        <label style={S.lb}>Key Insight * <span style={{textTransform:"none",fontWeight:400,color:"#bbb"}}>(add text and images)</span></label>
        <BlockEditor blocks={insightBlocks} onChange={setInsightBlocks} placeholder="What did you learn? Longer, deeper entries earn more XP." autoFocus />
        <label style={S.lb}>Career Connection <span style={{textTransform:"none",fontWeight:400,color:"#bbb"}}>(add text and images)</span></label>
        <BlockEditor blocks={connectionBlocks} onChange={setConnectionBlocks} placeholder="How does this connect? (fills this = +1 XP)" />
        <label style={S.lb}>Attachments (PDFs, Excel)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {pdfs.map((p,i)=><FileThumbnail key={i} file={p} isAdmin onRemove={()=>setPdfs(pr=>pr.filter((_,j)=>j!==i))} onUpdateCaption={(cap)=>setPdfs(pr=>{const n=[...pr];n[i]={...n[i],caption:cap};return n;})}/>)}
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{width:140,height:80,borderRadius:4,border:"2px dashed #ccc",background:"none",cursor:"pointer",color:"#aaa",fontSize:12,fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>{uploading?"...":<><span style={{fontSize:20}}>+</span>Upload</>}</button>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.xlsm,.csv" multiple style={{display:"none"}} onChange={handleFiles}/>
        </div>
        <label style={S.lb}>Category → Skill Nodes</label>
        <select style={{...S.inp,background:"#fff"}} value={cat} onChange={e=>setCat(e.target.value)}>
          {CATS.map(c => {
            const nodeNames = (C2N[c]||[]).map(nid => NODES.find(n=>n.id===nid)?.label).filter(Boolean).join(", ");
            return <option key={c} value={c}>{c}  →  {nodeNames}</option>;
          })}
        </select>
        {/* Milestone claims */}
        {affectedNodes.some(n => n.milestones?.length > 0) && (
          <div style={{padding:"12px 14px",background:"#fdf8f0",border:"1px solid #e8dcc5",borderRadius:6}}>
            <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:".06em",color:"#c4882a",fontWeight:700,marginBottom:8}}>⚑ Claim Milestone</div>
            <div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",color:"#999",marginBottom:10}}>Does this entry satisfy a milestone? Check to mark it complete.</div>
            {affectedNodes.filter(n => n.milestones?.length > 0).map(node => {
              const nc = node.b ? BR[node.b]?.color : "#1a1a1a";
              return (
                <div key={node.id} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:700,color:nc,marginBottom:4}}>{node.label}</div>
                  {node.milestones.map((ms, mi) => {
                    const done = isMsDone(node.id, mi);
                    const claimed = (claims[node.id] || []).includes(mi);
                    return (
                      <div key={mi} onClick={() => { if (!done) toggleClaim(node.id, mi); }}
                        style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4,cursor:done?"default":"pointer",opacity:done?0.5:1}}>
                        <span style={{width:14,height:14,borderRadius:3,border:(claimed||done)?"none":"1.5px solid #ccc",background:done?"#aaa":claimed?nc:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:"#fff",marginTop:1}}>{(claimed||done)?"✓":""}</span>
                        <span style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",color:done?"#aaa":"#666",lineHeight:1.4,textDecoration:done?"line-through":"none"}}>{ms}{done?" (done)":""}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        <div style={{padding:"10px 14px",background:previewWeight>=3?"#f0faf5":"#f7f5f2",borderRadius:6,border:`1px solid ${previewWeight>=3?"#c5e8d5":"#e8e5e0"}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:previewWeight>=3?"#2a6e4e":"#888"}}>{previewWeight}x</span>
          <div style={{fontSize:11,fontFamily:"'DM Sans',sans-serif",color:"#888",lineHeight:1.4}}>
            <div>XP multiplier for this entry</div>
            <div style={{fontSize:10,color:"#aaa"}}>
              {insightText.length>200?"✓":"○"} Deep insight (200+ chars) · {connText.length>20?"✓":"○"} Career connection · {hasAttach?"✓":"○"} Attachment
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,padding:"0 22px 18px"}}>
        <button onClick={onCancel} style={{background:"transparent",border:"1px solid #ddd",padding:"10px 18px",fontSize:13,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",borderRadius:4,color:"#666"}}>Cancel</button>
        <button onClick={()=>{if(!hasInsight||!title.trim())return;onSave({id:initial?.id||gid(),title:title.trim(),sources,source:sources.map(s=>s.name).join(", "),insightBlocks,connectionBlocks,insight:insightText,careerConnection:connText,category:cat,pdfs,milestoneClaims:claims,date:initial?.date||new Date().toISOString()});}} disabled={!hasInsight||!title.trim()} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 22px",fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:600,cursor:"pointer",borderRadius:4,opacity:(hasInsight&&title.trim())?1:0.4}}>{initial?"Update":"Save"}</button>
      </div>
    </div>
  </div>;
}

// ─── MAIN ───
export default function App(){
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { entries, loaded: entriesLoaded, save: saveEntry, remove: removeEntry } = useEntries();
  const { signals, loaded: signalsLoaded, add: addSignal, remove: removeSignal, update: updateSignal } = useSignals();
  const { completedMs, loaded: msLoaded, toggle: toggleMs } = useMilestones();

  const [sel,setSel]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [editEntry,setEditEntry]=useState(null);
  const [showAuth,setShowAuth]=useState(false);
  const [authEmail,setAuthEmail]=useState("");
  const [authPass,setAuthPass]=useState("");
  const [authError,setAuthError]=useState("");
  const [tab,setTab]=useState("tree");
  const [search,setSearch]=useState("");
  const [archiveNode,setArchiveNode]=useState("All");

  const admin = !!user;
  const loaded = entriesLoaded && signalsLoaded && msLoaded;

  const xpData=calcXP(entries,completedMs);
  const {raw,xp,ul,av,hasMilestone}=xpData;

  const save = async (entry) => {
    // Process milestone claims
    if (entry.milestoneClaims) {
      for (const [nodeId, indices] of Object.entries(entry.milestoneClaims)) {
        for (const idx of indices) {
          const current = completedMs[nodeId] || [];
          if (!current[idx]) {
            await toggleMs(nodeId, idx);
          }
        }
      }
    }

    // Save entry immediately (no waiting for AI scoring)
    const { milestoneClaims, ...cleanEntry } = entry;
    await saveEntry(cleanEntry);
    setShowForm(false);
    setEditEntry(null);

    // Score async in background — updates the entry after scoring completes
    try {
      const insightText = getTextFromBlocks(entry.insightBlocks || entry.insight);
      const connText = getTextFromBlocks(entry.connectionBlocks || entry.careerConnection);
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight: insightText,
          careerConnection: connText,
          category: entry.category,
          title: entry.title,
          sources: entry.sources,
        }),
      });
      if (res.ok) {
        const { score, reasoning, error } = await res.json();
        if (!error && score >= 1) {
          // Update the entry with the score
          await saveEntry({ ...cleanEntry, ai_score: score, ai_reasoning: reasoning });
        }
      }
    } catch (e) {
      console.error('Scoring failed (entry saved without score):', e);
    }
  };

  const doAuth = async () => {
    setAuthError("");
    const { error } = await signIn(authEmail, authPass);
    if (error) { setAuthError(error.message); }
    else { setShowAuth(false); setAuthEmail(""); setAuthPass(""); }
  };

  const promoteSignals = (sigs) => {
    const sources = sigs.map(s => ({ name: s.source || s.title, url: s.url || "" })).filter(s => s.name);
    const quotes = sigs.map(s => s.quote).filter(Boolean);
    const notes = sigs.map(s => s.note).filter(Boolean);
    const allText = [...quotes.map(q => `> ${q}`), ...notes].join("\n\n");
    const prefill = {
      title: sigs.length === 1 ? sigs[0].title : "",
      sources,
      source: sources.map(s => s.name).join(", "),
      insightBlocks: [{ type: "text", content: allText }],
      connectionBlocks: [{ type: "text", content: "" }],
      links: sigs.filter(s => s.url).map(s => ({ url: s.url, label: s.source || s.title })),
      category: CATS[0],
      pdfs: [],
    };
    setEditEntry(prefill);
    setShowForm(true);
    setTab("archive");
  };

  const uc=NODES.filter(n=>ul(n.id)).length;
  const tx=Object.values(xp).reduce((a,b)=>a+b,0),tn=NODES.reduce((a,n)=>a+n.xp,0);
  const pct=Math.min(1,tx/tn);

  if(!loaded || authLoading) return (<div style={{background:"#faf8f5",minHeight:"100vh"}}><p style={{color:"#999",textAlign:"center",paddingTop:80,fontFamily:"'DM Sans',sans-serif"}}>Loading...</p></div>);

  return (
    <div>
    <style>{`html,body,#root{margin:0;padding:0;background:#faf8f5;min-height:100%}*{box-sizing:border-box}`}</style>
    <div style={{maxWidth:700,margin:"0 auto",padding:"32px 20px 48px",fontFamily:"'Newsreader',Georgia,serif",color:"#1a1a1a"}}>

      <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,borderBottom:"2px solid #1a1a1a",paddingBottom:20}}>
        <div>
          <h1 style={{fontSize:38,fontWeight:700,margin:0,letterSpacing:"-.03em",lineHeight:1}}>Brave New World</h1>
          <p style={{fontSize:14,color:"#666",margin:"10px 0 0",maxWidth:420,lineHeight:1.55,fontFamily:"'DM Sans',sans-serif"}}>A living record of what I'm learning as a finance professional in a crazy, new world.</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e2dc" strokeWidth="4"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeDasharray={2*Math.PI*28} strokeDashoffset={2*Math.PI*28*(1-pct)} strokeLinecap="round" transform="rotate(-90 32 32)" style={{transition:"stroke-dashoffset .5s"}}/>
            <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fontFamily="'DM Sans',sans-serif" fill="#1a1a1a">{Math.round(pct*100)}%</text>
          </svg>
          {admin
            ? <button onClick={signOut} style={{background:"none",border:"1px solid #ddd",borderRadius:4,padding:"6px 10px",fontSize:12,cursor:"pointer",color:"#888",fontFamily:"'DM Sans',sans-serif"}}>Sign out</button>
            : <button onClick={()=>setShowAuth(true)} style={{background:"none",border:"1px solid #ddd",borderRadius:4,padding:"6px 10px",fontSize:14,cursor:"pointer",color:"#aaa"}}>✎</button>}
        </div>
      </header>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#888",flexWrap:"wrap"}}>
        <span style={{color:"#666"}}><strong>{entries.length}</strong> learnings</span><span style={{color:"#ccc"}}>·</span>
        <span style={{color:"#666"}}><strong>{uc}</strong>/{NODES.length} unlocked</span><span style={{color:"#ccc"}}>·</span>
        <span style={{color:"#666"}}>{entries.length>0?`Since ${fd(entries[entries.length-1]?.date)}`:"Just getting started"}</span>
      </div>

      <div style={{display:"flex",gap:14,marginBottom:14,flexWrap:"wrap"}}>
        {Object.entries(BR).map(([k,b])=><span key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#666"}}><span style={{width:10,height:10,borderRadius:5,background:b.color}}/>{b.name}</span>)}
      </div>

      <div style={{display:"flex",borderBottom:"1px solid #ddd",marginBottom:24,alignItems:"center",flexWrap:"wrap"}}>
        {[["tree","Skill Tree"],["archive","Archive"],["signals","Signal Board"],["stats","Stats"],["about","About"]].map(([t,label])=><button key={t} onClick={()=>{setSel(null);setTab(t);}} style={{background:"none",border:"none",borderBottom:tab===t?"2px solid #1a1a1a":"2px solid transparent",padding:"10px 20px",fontSize:14,fontFamily:"'DM Sans',sans-serif",fontWeight:tab===t?700:500,cursor:"pointer",color:tab===t?"#1a1a1a":"#999",marginBottom:-1}}>
          {label}{t==="signals"&&signals.length>0&&<span style={{marginLeft:6,fontSize:10,background:"#e8e5e0",padding:"1px 6px",borderRadius:8,color:"#888"}}>{signals.length}</span>}
        </button>)}
        {admin&&tab==="archive"&&<button onClick={()=>{setEditEntry(null);setShowForm(true);}} style={{marginLeft:"auto",background:"#1a1a1a",color:"#fff",border:"none",padding:"8px 16px",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600,cursor:"pointer",borderRadius:4}}>+ Entry</button>}
      </div>

      {tab==="tree"&&<Tree xp={xp} raw={raw} sel={sel} onSel={setSel} entries={entries} av={av} hasMilestone={hasMilestone} completedMs={completedMs} onToggleMs={toggleMs} admin={admin} onNavigateEntry={(entryId)=>{setSel(null);setTab("archive");setTimeout(()=>{const el=document.getElementById(`entry-${entryId}`);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.boxShadow="0 0 0 3px #2a6e4e";setTimeout(()=>{el.style.boxShadow="none";},2000);}},100);}}/>}

      {tab==="archive"&&(()=>{
        const q = search.trim().toLowerCase();
        const filtered = entries.filter(e => {
          if (archiveNode !== "All") {
            const entryNodes = C2N[e.category] || [];
            if (!entryNodes.includes(archiveNode)) return false;
          }
          if (q) {
            const it = getTextFromBlocks(e.insightBlocks || e.insight);
            const ct = getTextFromBlocks(e.connectionBlocks || e.careerConnection);
            if (!(it.toLowerCase().includes(q) || (e.source||"").toLowerCase().includes(q) || ct.toLowerCase().includes(q) || (e.category||"").toLowerCase().includes(q))) return false;
          }
          return true;
        });
        const hl = (text) => {
          if (!q || !text) return text;
          const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"));
          return parts.map((part, i) => 
            part.toLowerCase() === q ? <mark key={i} style={{background:"#fef08a",padding:"0 1px",borderRadius:2}}>{part}</mark> : part
          );
        };
        const renderBlocks = (blocks, fallbackText, sectionStyle) => {
          const renderText = (text, key) => {
            const paragraphs = text.split(/\n\n+/);
            return paragraphs.map((para, pi) => {
              if (!para.trim()) return null;
              const lines = para.split(/\n/);
              return (<p key={key + '-' + pi} style={{fontSize:sectionStyle?.fontSize||15,lineHeight:1.6,margin:"0 0 10px",color:sectionStyle?.color||"#1a1a1a",fontFamily:sectionStyle?.fontFamily||"inherit"}}>
                {lines.map((line, li) => (<span key={li}>{li > 0 && <br/>}<RichText text={line} hlTerm={q} /></span>))}
              </p>);
            });
          };
          if (blocks && Array.isArray(blocks)) {
            return blocks.map((block, i) => {
              if (block.type === "text" && block.content) return renderText(block.content, i);
              if (block.type === "image") return (<img key={i} src={block.data} alt={block.name||"image"} style={{width:"100%",maxHeight:400,objectFit:"contain",borderRadius:6,border:"1px solid #e5e2dc",marginBottom:8,display:"block",background:"#f8f6f3"}}/>);
              return null;
            });
          }
          if (fallbackText) return renderText(fallbackText, 'fb');
          return null;
        };
        return (<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:140}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entries..." style={{width:"100%",padding:"10px 14px 10px 36px",border:"1px solid #ddd",borderRadius:6,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",background:"#fff"}}/>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#bbb",pointerEvents:"none"}}>🔍</span>
              {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,color:"#aaa",cursor:"pointer"}}>✕</button>}
            </div>
            <select value={archiveNode} onChange={e=>setArchiveNode(e.target.value)} style={{padding:"8px 8px",border:"1px solid #ddd",borderRadius:4,fontSize:12,fontFamily:"'DM Sans',sans-serif",background:"#fff"}}>
              <option value="All">All nodes</option>
              {NODES.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </div>
          <div style={{fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#aaa"}}>
            {filtered.length} entr{filtered.length!==1?"ies":"y"}
            {q && ` matching "${search}"`}
            {archiveNode!=="All" && ` in ${NODES.find(n=>n.id===archiveNode)?.label}`}
          </div>
          {filtered.length===0 ? <p style={{textAlign:"center",color:"#aaa",padding:"40px 0",fontFamily:"'DM Sans',sans-serif"}}>{q?"No matching entries.":"No entries yet."}</p>
            : filtered.map(e => {const w=entryWeight(e); const insightText=getTextFromBlocks(e.insightBlocks||e.insight); const connText=getTextFromBlocks(e.connectionBlocks||e.careerConnection);
              const secLabel=(color)=>({fontSize:13,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:".06em",color:color,fontWeight:800,marginBottom:4});
              const secWrap=(color)=>({borderLeft:`3px solid ${color}`,paddingLeft:14,marginBottom:14,borderRadius:0});
              return (<div key={e.id} id={`entry-${e.id}`} style={{background:"#fff",border:"1px solid #e5e2dc",borderRadius:6,padding:"20px 22px"}}>
              {e.title && <div style={{fontSize:20,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",marginBottom:6,lineHeight:1.3}}>{hl(e.title)}</div>}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:6}}>
                <span style={{fontSize:12,color:"#aaa",fontFamily:"'DM Sans',sans-serif"}}>{fd(e.date)}<span style={{marginLeft:6,color:(w>=3)?"#2a6e4e":"#bbb",fontWeight:600}}>{w}x XP</span>{e.ai_score && <span style={{marginLeft:6,padding:"1px 6px",background:e.ai_score>=4?"#f0faf5":e.ai_score>=3?"#fdf8f0":"#f7f5f2",border:`1px solid ${e.ai_score>=4?"#c5e8d5":e.ai_score>=3?"#e8dcc5":"#e8e5e0"}`,borderRadius:3,fontSize:10,color:e.ai_score>=4?"#2a6e4e":e.ai_score>=3?"#b8860b":"#888",fontWeight:600}}>AI: {e.ai_score}/5</span>}</span>
                <span style={{fontSize:11,color:"#777",fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:".06em",background:"#f3f1ee",padding:"2px 8px",borderRadius:3}}>{e.category}</span>
              </div>
              {e.ai_reasoning && <div style={{fontSize:11,color:"#aaa",fontFamily:"'DM Sans',sans-serif",fontStyle:"italic",marginBottom:12}}>"{e.ai_reasoning}"</div>}

              <div style={secWrap("#8b2500")}>
                <div style={secLabel("#8b2500")}>Key Insight</div>
                {renderBlocks(e.insightBlocks, e.insight, {fontSize:15,color:"#1a1a1a"})}
              </div>

              {connText.length > 0 &&
              <div style={secWrap("#1a4a7a")}>
                <div style={secLabel("#1a4a7a")}>Career Connection</div>
                {renderBlocks(e.connectionBlocks, e.careerConnection, {fontSize:14,color:"#555",fontFamily:"'DM Sans',sans-serif"})}
              </div>}

              {(e.sources?.length > 0 || e.source) &&
              <div style={secWrap("#5a4a3a")}>
                <div style={secLabel("#5a4a3a")}>Source{e.sources?.length > 1 ? "s" : ""}</div>
                {e.sources?.length > 0 ? e.sources.map((src, si) => (
                  <div key={si} style={{fontSize:13,color:"#666",fontFamily:"'DM Sans',sans-serif",fontStyle:"italic",marginBottom:si<e.sources.length-1?4:0}}>
                    {src.url ? <a href={normalizeUrl(src.url)} target="_blank" rel="noopener noreferrer" style={{color:"#8b6508",textDecoration:"underline"}}>{hl(src.name)}</a> : hl(src.name)}
                  </div>
                )) : <div style={{fontSize:13,color:"#666",fontFamily:"'DM Sans',sans-serif",fontStyle:"italic"}}>{hl(e.source)}</div>}
              </div>}

              {e.pdfs && e.pdfs.length > 0 &&
              <div style={secWrap("#5a4a3a")}>
                <div style={secLabel("#5a4a3a")}>Attachments</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10}}>{e.pdfs.map((p,i)=><FileThumbnail key={i} file={p} isAdmin={admin}/>)}</div>
              </div>}

              <div style={secWrap("#2a6e4e")}>
                <div style={secLabel("#2a6e4e")}>Feeds</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(C2N[e.category]||[]).map(nid=>{const nd=NODES.find(n=>n.id===nid);return nd?<span key={nid} style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",padding:"3px 8px",background:"#f7f5f2",borderRadius:3,color:"#888",border:"1px solid #eee"}}>{nd.label}</span>:null;})}
                </div>
              </div>

              {admin&&<div style={{display:"flex",gap:14,paddingTop:10,borderTop:"1px solid #f0ede8"}}>
                <button onClick={()=>{setEditEntry(e);setShowForm(true);}} style={{background:"none",border:"none",color:"#555",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",textDecoration:"underline"}}>Edit</button>
                <button onClick={()=>removeEntry(e.id)} style={{background:"none",border:"none",color:"#c44",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",textDecoration:"underline"}}>Remove</button>
              </div>}
            </div>);})}
        </div>);
      })()}

      {tab==="signals"&&<SignalBoard signals={signals} onAdd={addSignal} onRemove={removeSignal} admin={admin} onPromote={promoteSignals} onEditSignal={updateSignal}/>}

      {tab==="stats"&&<StatsDashboard entries={entries} signals={signals} xpData={xpData} completedMs={completedMs}/>}

      {tab==="about"&&(
        <div style={{fontFamily:"'DM Sans',sans-serif",color:"#333",lineHeight:1.7}}>
          <div style={{background:"#fff",border:"1px solid #e5e2dc",borderRadius:8,padding:"28px 26px",marginBottom:16}}>
            <h2 style={{fontSize:22,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",margin:"0 0 12px",color:"#1a1a1a"}}>What is Brave New World?</h2>
            <p style={{fontSize:15,margin:"0 0 12px"}}>
              A living record of what I'm learning as a finance professional navigating a rapidly changing world. Part skill tracker, part learning journal, part accountability system.
            </p>
            <p style={{fontSize:15,margin:"0 0 12px"}}>
              The premise: the CFO role is bifurcating under AI. The top tier becomes more strategically powerful because accountability, relationships, and judgment are inalienable. Everything below that compresses into automated workflows. The scarce resource isn't capital or technology. It's management talent: people who can synthesize finance, relationships, and judgment across domains.
            </p>
            <p style={{fontSize:15,margin:0}}>
              This app tracks my progression toward that standard, not through credentials or titles, but through demonstrated understanding logged in real time.
            </p>
          </div>

          <div style={{background:"#fff",border:"1px solid #e5e2dc",borderRadius:8,padding:"28px 26px",marginBottom:16}}>
            <h2 style={{fontSize:18,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",margin:"0 0 16px",color:"#1a1a1a"}}>How It Works</h2>

            <div style={{borderLeft:"3px solid #5a4a3a",paddingLeft:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#5a4a3a",marginBottom:4}}>Skill Tree</div>
              <p style={{fontSize:14,margin:0,color:"#555"}}>
                13 nodes organized across 5 tiers, from Finance Foundation through the four atomic CFO duties (Capital Allocation, Driving Performance, Stakeholders, Risk Management) to the CFO seat itself. Each node requires both accumulated XP from logged learnings AND completion of all milestone challenges to unlock. Nodes cascade: you can't unlock Valuation until FP&A and Capital Markets are done.
              </p>
            </div>

            <div style={{borderLeft:"3px solid #8b2500",paddingLeft:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#8b2500",marginBottom:4}}>Archive</div>
              <p style={{fontSize:14,margin:0,color:"#555"}}>
                Deep learning entries with structured fields: title, sources, key insight, and career connection. Each entry is scored by Claude AI on a 0-5 scale based on depth of understanding relative to the category. Surface-level notes get 0-1. Genuine analysis gets 3. Synthesized, cross-domain thinking that changes how you approach decisions gets 4-5. The AI score determines how much XP the entry contributes to your skill tree.
              </p>
            </div>

            <div style={{borderLeft:"3px solid #1a4a7a",paddingLeft:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1a4a7a",marginBottom:4}}>Signal Board</div>
              <p style={{fontSize:14,margin:0,color:"#555"}}>
                Quick captures for articles, tweets, podcasts, book excerpts, and observations. The stuff you want to grab fast without writing a full archive entry. Tag signals to skill tree nodes, then promote one or multiple signals into a full Archive entry when you're ready to process them deeply.
              </p>
            </div>

            <div style={{borderLeft:"3px solid #2a6e4e",paddingLeft:14,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#2a6e4e",marginBottom:4}}>Stats</div>
              <p style={{fontSize:14,margin:0,color:"#555"}}>
                Activity tracking, branch progress, streak counting, weakest links, and node-by-node detail. The accountability layer: am I actually doing this consistently, and where are the gaps?
              </p>
            </div>
          </div>

          <div style={{background:"#fff",border:"1px solid #e5e2dc",borderRadius:8,padding:"28px 26px"}}>
            <h2 style={{fontSize:18,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",margin:"0 0 12px",color:"#1a1a1a"}}>The Scoring System</h2>
            <p style={{fontSize:14,margin:"0 0 12px",color:"#555"}}>
              Every archive entry is evaluated by Claude against the specific knowledge domain of its category. A post about bond covenants filed under Capital Markets is scored on capital markets depth. A post about cooking filed under Capital Markets gets a 0.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {s:"0",c:"#999",d:"Junk or off-topic. No finance content."},
                {s:"1",c:"#c44",d:"Surface-level. Mentions the topic, shows no understanding."},
                {s:"2",c:"#b8860b",d:"Descriptive. Summarizes without analysis."},
                {s:"3",c:"#5a4a3a",d:"Analytical. Genuine engagement, connections, implications."},
                {s:"4",c:"#1a4a7a",d:"Synthesized. Cross-domain pattern recognition. Could teach it."},
                {s:"5",c:"#2a6e4e",d:"Applied. Changes a decision or framework. Original thinking."},
              ].map(r=>(
                <div key={r.s} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:28,height:28,borderRadius:4,background:r.c+"18",color:r.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{r.s}</span>
                  <span style={{fontSize:13,color:"#555"}}>{r.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showAuth&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
        <div style={{background:"#fff",borderRadius:8,width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 0"}}><h2 style={{fontSize:20,fontWeight:700,margin:0}}>Sign In</h2><button onClick={()=>{setShowAuth(false);setAuthError("");}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#999"}}>✕</button></div>
          <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:10}}>
            <input style={{padding:"10px 12px",border:"1px solid #ddd",borderRadius:4,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"}} type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="Email"/>
            <input style={{padding:"10px 12px",border:"1px solid #ddd",borderRadius:4,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"}} type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="Password" onKeyDown={e=>e.key==="Enter"&&doAuth()}/>
            {authError&&<div style={{fontSize:12,color:"#c44",fontFamily:"'DM Sans',sans-serif"}}>{authError}</div>}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",padding:"0 22px 18px"}}><button onClick={doAuth} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 22px",fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:600,cursor:"pointer",borderRadius:4}}>Sign In</button></div>
        </div>
      </div>}
      {showForm&&<Form xpData={xpData} initial={editEntry} onSave={save} onCancel={()=>{setShowForm(false);setEditEntry(null);}} completedMs={completedMs}/>}
    </div>
    </div>
  );
}
