import { useState, useRef, useEffect, useCallback } from "react";
import { loadFromFirestore, saveToFirestore, uploadPhoto } from "./firebase";
import { sendMessage, subscribeToMessages, loadMessages, sendReply, markRead } from "./supabase";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap";

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_CATEGORIES = [
  {
    id:"eat", label:"I Want to Eat", emoji:"🍽️", photo:null,
    color:"#FF6B35", dark:"#C94A1A", light:"#FFAA85", phrase:"I want to eat",
    items:[
      {id:"e1",name:"Pizza",emoji:"🍕",photo:null},
      {id:"e2",name:"Mac & Cheese",emoji:"🧀",photo:null},
      {id:"e3",name:"Apple",emoji:"🍎",photo:null},
      {id:"e4",name:"Chicken Nuggets",emoji:"🍗",photo:null},
      {id:"e5",name:"Ice Cream",emoji:"🍦",photo:null},
      {id:"e6",name:"Sandwich",emoji:"🥪",photo:null},
    ],
  },
  {
    id:"go", label:"I Want to Go", emoji:"🚗", photo:null,
    color:"#4ECDC4", dark:"#2A9990", light:"#9EEEE8", phrase:"I want to go to",
    items:[
      {id:"g1",name:"McDonald's",emoji:"🍟",photo:null},
      {id:"g2",name:"The Park",emoji:"🌳",photo:null},
      {id:"g3",name:"Grandma's",emoji:"🏠",photo:null},
      {id:"g4",name:"The Store",emoji:"🛒",photo:null},
      {id:"g5",name:"School",emoji:"🏫",photo:null},
    ],
  },
  {
    id:"do", label:"I Want to Do", emoji:"⭐", photo:null,
    color:"#A855F7", dark:"#7B22D4", light:"#D4A0FF", phrase:"I want to",
    items:[
      {id:"d1",name:"Watch TV",emoji:"📺",photo:null},
      {id:"d2",name:"Play Outside",emoji:"⚽",photo:null},
      {id:"d3",name:"Read a Book",emoji:"📚",photo:null},
      {id:"d4",name:"Take a Bath",emoji:"🛁",photo:null},
      {id:"d5",name:"Play Games",emoji:"🎮",photo:null},
    ],
  },
  {
    id:"feel", label:"I Feel", emoji:"💛", photo:null,
    color:"#F59E0B", dark:"#B86E00", light:"#FCD34D", phrase:"I feel",
    items:[
      {id:"f1",name:"Happy",emoji:"😊",photo:null},
      {id:"f2",name:"Sad",emoji:"😢",photo:null},
      {id:"f3",name:"Hungry",emoji:"😋",photo:null},
      {id:"f4",name:"Tired",emoji:"😴",photo:null},
      {id:"f5",name:"Sick",emoji:"🤒",photo:null},
      {id:"f6",name:"Excited",emoji:"🤩",photo:null},
    ],
  },
  {
    id:"help", label:"I Need Help", emoji:"🙋", photo:null,
    color:"#EF4444", dark:"#B91C1C", light:"#FCA5A5", phrase:"I need help with",
    items:[
      {id:"h1",name:"Getting Dressed",emoji:"👕",photo:null},
      {id:"h2",name:"The Bathroom",emoji:"🚽",photo:null},
      {id:"h3",name:"Opening This",emoji:"🔓",photo:null},
      {id:"h4",name:"Finding Something",emoji:"🔍",photo:null},
    ],
  },
  {
    id:"yesno", label:"Yes / No", emoji:"👍", photo:null,
    color:"#10B981", dark:"#047857", light:"#6EE7B7", phrase:"",
    items:[
      {id:"y1",name:"Yes",emoji:"✅",photo:null},
      {id:"y2",name:"No",emoji:"❌",photo:null},
      {id:"y3",name:"Maybe",emoji:"🤔",photo:null},
      {id:"y4",name:"I Don't Know",emoji:"🤷",photo:null},
      {id:"y5",name:"Please",emoji:"🙏",photo:null},
      {id:"y6",name:"Thank You",emoji:"😊",photo:null},
      {id:"y7",name:"Stop",emoji:"✋",photo:null},
      {id:"y8",name:"More",emoji:"➕",photo:null},
    ],
  },
  {
    id:"watch", label:"I Want to Watch", emoji:"📺", photo:null,
    color:"#6366F1", dark:"#3730A3", light:"#A5B4FC", phrase:"I want to watch",
    items:[
      {
        id:"w1", name:"YouTube", emoji:"▶️", photo:null,
        logo:"https://www.youtube.com/img/desktop/yt_1200.png",
        appLink:"youtube://", webLink:"https://www.youtube.com",
      },
      {
        id:"w2", name:"Disney+", emoji:"✨", photo:null,
        logo:"https://cnbl-cdn.bamgrid.com/assets/7ecc8bcb60ad77193058d63e321bd21cbac2fc67625b0a9de6c88b3155c19c69/original",
        appLink:"disneyplus://", webLink:"https://www.disneyplus.com",
      },
    ],
  },
  {
    id:"listen", label:"I Want to Listen", emoji:"🎵", photo:null,
    color:"#EC4899", dark:"#BE185D", light:"#F9A8D4", phrase:"I want to listen to",
    items:[
      {
        id:"l1", name:"Amazon Music", emoji:"🎵", photo:null,
        logo:"https://m.media-amazon.com/images/G/01/digital/music/player/web/GM-image-US-en.png",
        appLink:null,
        webLink:"https://music.amazon.com/library/albums",
      },
    ],
  },
];

// ─── Storage (Firestore + Firebase Storage for photos) ───────────────────────
const SEED_DATA = { categories: SEED_CATEGORIES, parentPin: "1234" };

function stripPhotos(categories) {
  return categories.map(cat => ({
    ...cat,
    photo: cat.photo?.startsWith("http") ? cat.photo : null,
    items: cat.items?.map(item => ({
      ...item,
      photo: item.photo?.startsWith("http") ? item.photo : null,
    })) || [],
  }));
}

function saveData(d) {
  // Only save URLs to Firestore (not base64 data)
  const stripped = { ...d, categories: stripPhotos(d.categories) };
  saveToFirestore(stripped);
}

// Upload a photo and return the URL
async function handlePhotoUpload(base64Data, path) {
  if (!base64Data || base64Data.startsWith("http")) return base64Data;
  const url = await uploadPhoto(base64Data, path);
  return url;
}

// ─── Speech (prefers male voice) ──────────────────────────────────────────────
function speak(text) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.pitch = 0.9;
  u.volume = 1;

  function pickVoiceAndSpeak() {
    const voices = window.speechSynthesis.getVoices();
    // Preferred male voices by name across iOS, macOS, Android, Windows
    const maleNames = ["Alex","Fred","Daniel","Aaron","Arthur","Gordon","Reed","Thomas","Rishi","Microsoft David","Microsoft Mark","Google US English"];
    let chosen = null;
    for (const name of maleNames) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) { chosen = match; break; }
    }
    // Fallback: any English voice, drop pitch lower to sound more male
    if (!chosen) {
      chosen = voices.find(v => v.lang.startsWith("en")) || null;
      u.pitch = 0.75;
    }
    if (chosen) u.voice = chosen;
    window.speechSynthesis.speak(u);
  }

  // Voices may not be loaded yet on first call — wait if needed
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    pickVoiceAndSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      pickVoiceAndSpeak();
    };
  }
}

// ─── Smooth Blob SVG Paths (original style) ──────────────────────────────────
const BLOB_PATHS = [
  "M50,5 C70,2 90,15 95,35 C100,55 88,75 75,85 C62,95 40,98 25,88 C10,78 2,58 5,38 C8,18 30,8 50,5 Z",
  "M50,3 C72,0 93,12 97,33 C101,54 85,78 68,88 C51,98 28,96 14,82 C0,68 -2,45 8,28 C18,11 28,6 50,3 Z",
  "M48,4 C68,0 92,10 98,32 C104,54 90,76 72,87 C54,98 30,99 16,85 C2,71 0,48 8,30 C16,12 28,8 48,4 Z",
  "M52,4 C74,1 95,14 98,36 C101,58 87,80 70,89 C53,98 29,97 15,83 C1,69 2,46 10,28 C18,10 30,7 52,4 Z",
  "M50,6 C71,2 91,16 96,37 C101,58 87,77 71,87 C55,97 32,98 18,86 C4,74 1,52 7,33 C13,14 29,10 50,6 Z",
  "M49,3 C70,-1 94,11 98,34 C102,57 87,79 69,89 C51,99 26,98 13,84 C0,70 0,46 9,29 C18,12 28,7 49,3 Z",
];

// ─── Blob Card (item button) ──────────────────────────────────────────────────
function BlobCard({ item, phrase, color, dark, light, index, onSpeak, onEdit, onDelete, parentMode }) {
  const [squish, setSquish] = useState(false);
  const blobPath = BLOB_PATHS[index % BLOB_PATHS.length];
  const uid = `bc_${item.id}`;

  // Auto deep link map — if item name matches, open the app
  const DEEP_LINKS = {
    "youtube":       { app: "youtube://",      web: "https://www.youtube.com" },
    "disney+":       { app: "disneyplus://",   web: "https://www.disneyplus.com" },
    "amazon music":  { app: "https://music.amazon.com/library/albums", web: "https://music.amazon.com/library/albums" },
    "netflix":       { app: "nflx://",         web: "https://www.netflix.com" },
    "hulu":          { app: "hulu://",         web: "https://www.hulu.com" },
    "spotify":       { app: "spotify://",      web: "https://www.spotify.com" },
    "apple music":   { app: "music://",        web: "https://music.apple.com" },
    "youtube kids":  { app: "youtubekids://",  web: "https://www.youtubekids.com" },
  };

  function handlePress() {
    if (parentMode) return;
    setSquish(true);
    setTimeout(() => setSquish(false), 300);
    const full = phrase ? `${phrase} ${item.name}` : item.name;
    speak(full);
    onSpeak(full);

    // Check item's own appLink first, then check name against deep link map
    const nameKey = item.name.toLowerCase().trim();
    const deepLink = item.appLink ? { app: item.appLink, web: item.webLink } : DEEP_LINKS[nameKey];

    if (deepLink) {
      const url = deepLink.app || deepLink.web;
      // Create a real link and click it — iOS handles universal links better this way
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch(e) {} }, 500);
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
      <button onClick={handlePress} style={{
        background:"none", border:"none",
        cursor: parentMode ? "default" : "pointer",
        padding: 0,
        display:"flex", flexDirection:"column", alignItems:"center",
        transform: squish ? "scale(1.08) scaleY(0.88)" : "scale(1)",
        transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        filter: squish
          ? `drop-shadow(0 0 12px ${color}88)`
          : `drop-shadow(0 5px 10px ${dark}55)`,
        width:"100%",
      }}>
        <svg viewBox="0 0 100 100" style={{ width:150, height:150, display:"block", overflow:"visible" }}>
          <defs>
            <radialGradient id={`${uid}_g`} cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor={light} />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
            <clipPath id={`${uid}_c`}><path d={blobPath} /></clipPath>
          </defs>
          {/* Main blob */}
          <path d={blobPath} fill={`url(#${uid}_g)`} />
          {/* White backing for logos so they show clearly */}
          {item.logo && !item.photo && (
            <path d={blobPath} fill="white" opacity="0.92" />
          )}
          {/* Photo clipped inside */}
          {item.photo && (
            <image href={item.photo} x="8" y="8" width="84" height="84"
              clipPath={`url(#${uid}_c)`} preserveAspectRatio="xMidYMid slice" opacity="0.9" />
          )}
          {/* App logo clipped inside blob */}
          {item.logo && !item.photo && (
            <image href={item.logo} x="12" y="12" width="76" height="76"
              clipPath={`url(#${uid}_c)`} preserveAspectRatio="xMidYMid meet" />
          )}
          {/* Emoji fallback */}
          {!item.photo && !item.logo && (
            <text x="50" y="55" textAnchor="middle" dominantBaseline="middle"
              fontSize="38" style={{ userSelect:"none", pointerEvents:"none" }}>{item.emoji}</text>
          )}
          {/* Gloss highlights */}
          <ellipse cx="36" cy="26" rx="14" ry="9" fill="white" opacity="0.28" transform="rotate(-20,36,26)" />
          <ellipse cx="30" cy="22" rx="6" ry="3.5" fill="white" opacity="0.38" transform="rotate(-20,30,22)" />
        </svg>
      </button>

      <span style={{
        fontSize:13, fontWeight:800, color:"#1e1e1e",
        fontFamily:"'Nunito',sans-serif", textAlign:"center",
        lineHeight:1.2, maxWidth:150, display:"block",
        marginTop:4,
      }}>{item.name}</span>

      {item.appLink && !parentMode && (
        <span style={{
          fontSize:10, fontWeight:700, color:color,
          fontFamily:"'Nunito',sans-serif", marginTop:2,
          background: light, borderRadius:8, padding:"2px 8px",
        }}>Opens App ↗</span>
      )}

      {parentMode && (
        <div style={{ display:"flex", gap:5, marginTop:5 }}>
          <button onClick={()=>onEdit(item)} style={{ background:color,border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
          <button onClick={()=>onDelete(item.id)} style={{ background:"#EF4444",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>🗑️</button>
        </div>
      )}
    </div>
  );
}

// ─── Camera Blob Card ─────────────────────────────────────────────────────────
function CameraBlobCard({ color, dark, light, onPress, index }) {
  const [squish, setSquish] = useState(false);
  const blobPath = BLOB_PATHS[(index + 2) % BLOB_PATHS.length];

  function handlePress() {
    setSquish(true);
    setTimeout(() => setSquish(false), 300);
    onPress();
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <button onClick={handlePress} style={{
        background:"none", border:"none", cursor:"pointer", padding:0,
        display:"flex", flexDirection:"column", alignItems:"center",
        transform: squish ? "scale(1.08) scaleY(0.88)" : "scale(1)",
        transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        filter: `drop-shadow(0 4px 8px ${dark}44)`,
        width:"100%", opacity:0.82,
      }}>
        <svg viewBox="0 0 100 100" style={{ width:150, height:150, display:"block", overflow:"visible" }}>
          <defs>
            <radialGradient id="cam_g" cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor={light} stopOpacity="0.45" />
              <stop offset="55%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={dark} stopOpacity="0.45" />
            </radialGradient>
          </defs>
          <path d={blobPath} fill="url(#cam_g)" stroke={color} strokeWidth="2" strokeDasharray="5,4" />
          <ellipse cx="36" cy="26" rx="12" ry="8" fill="white" opacity="0.2" transform="rotate(-20,36,26)" />
          <text x="50" y="48" textAnchor="middle" dominantBaseline="middle" fontSize="28" style={{ userSelect:"none" }}>📷</text>
          <text x="50" y="72" textAnchor="middle" dominantBaseline="middle" fontSize="11"
            fontWeight="800" fontFamily="'Nunito',sans-serif" fill={dark} style={{ userSelect:"none" }}>Add Photo</text>
        </svg>
      </button>
      <span style={{ fontSize:13, fontWeight:800, color:color, fontFamily:"'Nunito',sans-serif", textAlign:"center", marginTop:4 }}>Take Photo</span>
    </div>
  );
}

// ─── Home Blob Card ───────────────────────────────────────────────────────────
function HomeBlobCard({ cat, onClick, parentMode, index }) {
  const [squish, setSquish] = useState(false);
  const blobPath = BLOB_PATHS[index % BLOB_PATHS.length];
  const uid = `hbc_${cat.id}`;

  function handleClick() {
    setSquish(true);
    setTimeout(() => setSquish(false), 300);
    onClick();
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
      <button onClick={handleClick} style={{
        background:"none", border:"none", cursor:"pointer", padding:0,
        display:"flex", flexDirection:"column", alignItems:"center",
        transform: squish ? "scale(1.09) scaleY(0.87)" : "scale(1)",
        transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        filter: squish
          ? `drop-shadow(0 0 16px ${cat.color}99)`
          : `drop-shadow(0 6px 12px ${cat.dark}77)`,
        width:"100%",
      }}>
        <svg viewBox="0 0 100 100" style={{ width:"100%", maxWidth:180, height:"auto", display:"block", overflow:"visible" }}>
          <defs>
            <radialGradient id={`${uid}_g`} cx="38%" cy="28%" r="65%">
              <stop offset="0%" stopColor={cat.light} />
              <stop offset="48%" stopColor={cat.color} />
              <stop offset="100%" stopColor={cat.dark} />
            </radialGradient>
            <clipPath id={`${uid}_c`}><path d={blobPath} /></clipPath>
          </defs>
          <path d={blobPath} fill={`url(#${uid}_g)`} />
          {cat.photo ? (
            <image href={cat.photo} x="8" y="8" width="84" height="84"
              clipPath={`url(#${uid}_c)`} preserveAspectRatio="xMidYMid slice" opacity="0.88" />
          ) : (
            <text x="50" y="55" textAnchor="middle" dominantBaseline="middle"
              fontSize="40" style={{ userSelect:"none" }}>{cat.emoji}</text>
          )}
          <ellipse cx="36" cy="26" rx="15" ry="10" fill="white" opacity="0.3" transform="rotate(-20,36,26)" />
          <ellipse cx="30" cy="21" rx="7" ry="4" fill="white" opacity="0.4" transform="rotate(-20,30,21)" />
          {parentMode && <path d={blobPath} fill="none" stroke="#667eea" strokeWidth="3" strokeDasharray="8,6" />}
        </svg>
      </button>
      <span style={{
        fontSize:15, fontWeight:800, color:"#1a1a2e",
        fontFamily:"'Nunito',sans-serif", textAlign:"center",
        lineHeight:1.2, maxWidth:160, marginTop:6,
      }}>{cat.label}</span>
      <span style={{ fontSize:11, color:"#aaa", fontFamily:"'Nunito',sans-serif", marginTop:2 }}>{cat.items.length} items</span>
    </div>
  );
}

// ─── Edit Category Modal ──────────────────────────────────────────────────────
function EditCategoryModal({ cat, onSave, onClose }) {
  const [name, setName] = useState(cat.label);
  const [phrase, setPhrase] = useState(cat.phrase);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePhotoSave({ photo }) {
    setSaving(true);
    let photoUrl = null;
    if (photo && photo.startsWith("data:")) {
      photoUrl = await handlePhotoUpload(photo, `categories/${cat.id}/cover_${Date.now()}`);
    } else if (photo && photo.startsWith("http")) {
      photoUrl = photo;
    }
    onSave({ ...cat, label: name.trim(), phrase: phrase.trim(), photo: photoUrl });
    setSaving(false);
    setShowPhotoPicker(false);
    onClose();
  }

  function handleSaveNameOnly() {
    if (!name.trim()) return;
    onSave({ ...cat, label: name.trim(), phrase: phrase.trim() });
    onClose();
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      {showPhotoPicker ? (
        <PhotoPickerModal
          title={saving ? "Saving..." : "Change Category Image"}
          color={cat.color}
          onSave={handlePhotoSave}
          onClose={()=>setShowPhotoPicker(false)}
          showNameField={false}
        />
      ) : (
        <div style={{ background:"#fff",borderRadius:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.35)" }}>
          <div style={{ background:cat.color,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:"24px 24px 0 0" }}>
            <span style={{ color:"#fff",fontSize:18,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>Edit Category</span>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.3)",border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>
          <div style={{ padding:20 }}>
            {/* Name */}
            <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,color:"#666",marginBottom:6 }}>Button Label</div>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="e.g. I Want to Eat"
              style={{ width:"100%",padding:"12px 16px",borderRadius:14,border:"2px solid #e0e0e0",fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:14 }} />

            {/* Phrase */}
            <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,color:"#666",marginBottom:6 }}>Spoken Phrase</div>
            <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:11,color:"#aaa",marginBottom:6 }}>What it says before the item name (e.g. "I want to eat" → "I want to eat Pizza")</div>
            <input value={phrase} onChange={e=>setPhrase(e.target.value)}
              placeholder="e.g. I want to eat"
              style={{ width:"100%",padding:"12px 16px",borderRadius:14,border:"2px solid #e0e0e0",fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:16 }} />

            {/* Change image button */}
            <button onClick={()=>setShowPhotoPicker(true)} style={{
              width:"100%",padding:12,borderRadius:14,border:`2px solid ${cat.color}`,
              background:"transparent",color:cat.color,fontSize:15,fontWeight:800,
              fontFamily:"'Nunito',sans-serif",cursor:"pointer",marginBottom:12,
            }}>
              📷 Change Image
            </button>

            {/* Save button */}
            <button onClick={handleSaveNameOnly} disabled={!name.trim()} style={{
              width:"100%",padding:14,borderRadius:14,border:"none",
              background:name.trim()?cat.color:"#ccc",color:"#fff",fontSize:17,fontWeight:800,
              fontFamily:"'Nunito',sans-serif",cursor:name.trim()?"pointer":"not-allowed",
            }}>✅ Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    id:i, color:["#FF6B35","#4ECDC4","#A855F7","#F59E0B","#10B981","#EF4444","#fff"][i%7],
    x:Math.random()*100, delay:Math.random()*0.5, size:7+Math.random()*11,
  }));
  return (
    <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:200,overflow:"hidden" }}>
      {pieces.map(p=>(
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:"-20px",
          width:p.size, height:p.size, borderRadius:"50%",
          background:p.color, opacity:0.9,
          animation:`fall 1.4s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(540deg);opacity:0;}}`}</style>
    </div>
  );
}

// ─── Camera Hook ──────────────────────────────────────────────────────────────
function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(false);

  const start = useCallback(async () => {
    setError(false);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" }, audio:false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setError(true); }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capture = useCallback(() => {
    const v=videoRef.current, c=canvasRef.current;
    if (!v||!c) return null;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    return c.toDataURL("image/jpeg",0.82);
  }, []);

  return { videoRef, canvasRef, error, start, stop, capture };
}

// ─── Photo Picker Modal ───────────────────────────────────────────────────────
const EMOJIS = ["🍕","🍔","🌮","🍦","🍎","🧃","🏠","🌳","🚗","🛒","🏫","🏖️",
  "📺","🎮","⚽","📚","🎨","🎵","😊","😢","😋","😴","🤒","🤩","🐶","🐱",
  "🌈","⭐","❤️","🎉","🌟","✅","❌","🙏","✋","➕","🤷","🤔","🔑","🧸","🎁",
  "🍗","🧀","🥪","🥦","🍟","🧁","🍩","🥤","☀️","🌙","⚡","🔥","💧","🌊"];

function PhotoPickerModal({ title, color, onSave, onClose, showNameField=true, initialName="" }) {
  const cam = useCamera();
  const [photo, setPhoto] = useState(null);
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState("⭐");
  const [tab, setTab] = useState("camera");

  useEffect(() => {
    if (tab==="camera" && !photo) cam.start();
    else cam.stop();
    return () => cam.stop();
  }, [tab, photo]);

  function handleCapture() {
    const d = cam.capture();
    if (d) { setPhoto(d); cam.stop(); }
  }

  function handleFile(e) {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      setPhoto(ev.target.result);
      cam.stop();
    };
    r.onerror=()=>console.error("FileReader error");
    r.readAsDataURL(f);
  }

  function handleSave() {
    if (showNameField && !name.trim()) return;
    // On emoji tab, explicitly pass null for photo so emoji shows
    const photoToSave = tab === "emoji" ? null : photo;
    onSave({ name:name.trim(), emoji, photo:photoToSave });
  }

  const canSave = showNameField ? !!name.trim() : true;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:24,width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ background:color,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:"24px 24px 0 0" }}>
          <span style={{ color:"#fff",fontSize:18,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.3)",border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:"flex",gap:8,marginBottom:16 }}>
            {[["camera","📷 Photo"],["emoji","😊 Emoji"]].map(([t,l])=>(
              <button key={t} onClick={()=>{ setTab(t); setPhoto(null); }} style={{
                flex:1,padding:"10px 0",borderRadius:12,border:"none",fontWeight:700,
                fontFamily:"'Nunito',sans-serif",fontSize:14,cursor:"pointer",
                background:tab===t?color:"#f0f0f0",color:tab===t?"#fff":"#666"
              }}>{l}</button>
            ))}
          </div>
          {tab==="camera" && (
            <div style={{ marginBottom:16 }}>
              {!photo ? (
                cam.error ? (
                  <div style={{ textAlign:"center",padding:20 }}>
                    <p style={{ color:"#888",marginBottom:12,fontFamily:"'Nunito',sans-serif" }}>Camera not available — upload a photo instead</p>
                    <label style={{ display:"inline-block",padding:"10px 20px",borderRadius:12,background:color,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"'Nunito',sans-serif" }}>
                      Upload a Photo<input type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ position:"relative",borderRadius:16,overflow:"hidden",background:"#000",minHeight:200 }}>
                    <video ref={cam.videoRef} autoPlay playsInline style={{ width:"100%",display:"block",borderRadius:16 }} />
                    <button onClick={handleCapture} style={{ position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",width:64,height:64,borderRadius:"50%",border:"4px solid #fff",background:"#fff",cursor:"pointer",fontSize:28,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center" }}>📷</button>
                    <label style={{ position:"absolute",bottom:20,right:14,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:700 }}>
                      Upload<input type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
                    </label>
                  </div>
                )
              ) : (
                <div style={{ position:"relative" }}>
                  <img src={photo} alt="captured" style={{ width:"100%",borderRadius:16,display:"block",maxHeight:260,objectFit:"cover" }} />
                  <button onClick={()=>{ setPhoto(null); cam.start(); }} style={{ position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13 }}>Retake</button>
                </div>
              )}
              <canvas ref={cam.canvasRef} style={{ display:"none" }} />
            </div>
          )}
          {tab==="emoji" && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,maxHeight:200,overflowY:"auto",padding:8,background:"#f8f8f8",borderRadius:16 }}>
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setEmoji(e)} style={{ fontSize:24,border:"none",borderRadius:8,background:emoji===e?color+"33":"transparent",cursor:"pointer",padding:4,outline:emoji===e?`2px solid ${color}`:"none" }}>{e}</button>
                ))}
              </div>
              <div style={{ textAlign:"center",marginTop:12,fontSize:56 }}>{emoji}</div>
            </div>
          )}
          {showNameField && (
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name this item (e.g. McDonald's)"
              style={{ width:"100%",padding:"12px 16px",borderRadius:14,border:"2px solid #e0e0e0",fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:14 }} />
          )}
          <button onClick={handleSave} disabled={!canSave} style={{
            width:"100%",padding:14,borderRadius:14,border:"none",
            background:canSave?color:"#ccc",color:"#fff",fontSize:17,fontWeight:800,
            fontFamily:"'Nunito',sans-serif",cursor:canSave?"pointer":"not-allowed"
          }}>✅ Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────
function PinModal({ title, onSuccess, onClose, correctPin }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  function handleDigit(d) {
    const next = pin + d;
    if (next.length < 4) { setPin(next); return; }
    setPin(next);
    setTimeout(() => {
      if (next === correctPin) onSuccess();
      else { setShake(true); setPin(""); setTimeout(()=>setShake(false),500); }
    }, 100);
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#fff",borderRadius:24,padding:32,width:"100%",maxWidth:320,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize:36,marginBottom:8 }}>🔐</div>
        <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:18,fontWeight:800,color:"#1a1a2e",marginBottom:6 }}>{title}</div>
        <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#888",marginBottom:24 }}>Enter 4-digit PIN</div>
        <div style={{ display:"flex",justifyContent:"center",gap:12,marginBottom:28,animation:shake?"shake 0.4s ease":"none" }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ width:16,height:16,borderRadius:"50%",background:pin.length>i?"#667eea":"#e0e0e0",transition:"background 0.1s" }} />
          ))}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
            <button key={i} onClick={()=>d==="⌫"?setPin(p=>p.slice(0,-1)):d!==""?handleDigit(String(d)):null}
              disabled={d===""} style={{ padding:"16px 0",borderRadius:14,border:"none",fontSize:20,fontWeight:800,fontFamily:"'Nunito',sans-serif",cursor:d===""?"default":"pointer",background:d===""?"transparent":d==="⌫"?"#f0f0f0":"#f5f5f5",color:"#1a1a2e" }}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:"#aaa",fontFamily:"'Nunito',sans-serif",fontSize:14,cursor:"pointer" }}>Cancel</button>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
      </div>
    </div>
  );
}

// ─── Category Screen ──────────────────────────────────────────────────────────
function CategoryScreen({ category, onBack, onUpdateCategory, parentMode }) {
  const [items, setItems] = useState(category.items);
  const [search, setSearch] = useState("");
  const [lastSpoken, setLastSpoken] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confetti, setConfetti] = useState(false);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  function persist(updated) {
    setItems(updated);
    onUpdateCategory({ ...category, items: updated });
  }

  async function handleSaveItem({ name, emoji, photo }) {
    const id = `c_${Date.now()}`;
    let photoUrl = null;
    if (photo && photo.startsWith("data:")) {
      // It's a base64 image — upload to Firebase Storage
      photoUrl = await handlePhotoUpload(photo, `items/${category.id}/${id}`);
    } else if (photo && photo.startsWith("http")) {
      // Already a URL — use as is
      photoUrl = photo;
    }
    // If no photo, just use emoji (photoUrl stays null)
    persist([...items, { id, name, emoji, photo: photoUrl }]);
  }

  async function handleEditItem({ name, emoji, photo }) {
    let photoUrl = photo;
    if (photo && photo.startsWith("data:")) {
      // New base64 image — upload to Firebase Storage
      photoUrl = await handlePhotoUpload(photo, `items/${category.id}/${editItem.id}`);
    } else if (!photo) {
      // No photo selected — keep existing
      photoUrl = editItem.photo;
    }
    persist(items.map(i => i.id===editItem.id ? { ...i, name, emoji, photo:photoUrl } : i));
    setEditItem(null);
  }

  function handleDelete(id) {
    if (!window.confirm("Remove this item?")) return;
    persist(items.filter(i=>i.id!==id));
  }

  function handleSpeak(text) {
    setLastSpoken(text);
    setConfetti(true);
    setTimeout(()=>setConfetti(false), 1600);
    // Send to parent companion via Supabase
    sendMessage(text);
    // Send push notification to parent's phone via Pushover
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    }).catch(e => console.error("Notify error:", e));
    // Navigate back to home screen after a short delay so he sees the confetti
    setTimeout(() => onBack(), 2000);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)", display:"flex", flexDirection:"column" }}>
      <Confetti active={confetti} />
      {showAdd && (
        <PhotoPickerModal title="Add New Item" color={category.color}
          onSave={d=>{ handleSaveItem(d); setShowAdd(false); }} onClose={()=>setShowAdd(false)} />
      )}
      {editItem && (
        <PhotoPickerModal title={`Edit: ${editItem.name}`} color={category.color} initialName={editItem.name}
          onSave={handleEditItem} onClose={()=>setEditItem(null)} />
      )}

      {/* Header */}
      <div style={{ background:category.color,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ width:44,height:44,borderRadius:12,overflow:"hidden",flexShrink:0,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          {category.photo ? <img src={category.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span style={{ fontSize:26 }}>{category.emoji}</span>}
        </div>
        <div style={{ color:"#fff",fontSize:19,fontWeight:800,fontFamily:"'Nunito',sans-serif",flex:1 }}>{category.label}</div>
        {parentMode && (
          <button onClick={()=>setShowAdd(true)} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>+ Add</button>
        )}
      </div>

      {/* Spoken banner */}
      {lastSpoken && (
        <div onClick={()=>speak(lastSpoken)} style={{ background:"#1a1a2e",color:"#fff",padding:"13px 20px",textAlign:"center",fontSize:17,fontWeight:700,fontFamily:"'Nunito',sans-serif",cursor:"pointer",letterSpacing:0.3 }}>
          🔊 "{lastSpoken}" — tap to repeat
        </div>
      )}

      {/* Search */}
      <div style={{ padding:"14px 20px 6px" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..."
          style={{ width:"100%",padding:"12px 16px",borderRadius:18,border:"2px solid #e0e0e0",fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",background:"#fff",boxSizing:"border-box" }} />
      </div>

      {/* Grid */}
      <div style={{ flex:1,overflowY:"auto",padding:"6px 12px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:8,alignContent:"start" }}>
        {filtered.length===0 && (
          <div style={{ gridColumn:"1/-1",textAlign:"center",padding:30,color:"#aaa",fontFamily:"'Nunito',sans-serif",fontSize:15 }}>
            {search ? "Nothing found — tap the camera button to add it!" : "No items yet!"}
          </div>
        )}
        {filtered.map((item,i) => (
          <BlobCard key={item.id} item={item} phrase={category.phrase}
            color={category.color} dark={category.dark} light={category.light}
            index={i} onSpeak={handleSpeak} onEdit={setEditItem} onDelete={handleDelete} parentMode={parentMode} />
        ))}
        {/* Always-visible camera blob */}
        <CameraBlobCard color={category.color} dark={category.dark} light={category.light}
          onPress={()=>setShowAdd(true)} index={filtered.length} />
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({ categories, onUpdateCategories, onBack, onChangePin, currentPin }) {
  const [showCatPhoto, setShowCatPhoto] = useState(null);
  const [showEditCat, setShowEditCat] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);

  function handleCatEdit(updatedCat) {
    onUpdateCategories(categories.map(c => c.id===updatedCat.id ? updatedCat : c));
    setShowEditCat(null);
  }
  const [newCatName, setNewCatName] = useState("");
  const [newCatPhrase, setNewCatPhrase] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📌");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const CAT_COLORS = [
    {color:"#FF6B35",dark:"#C94A1A",light:"#FFAA85"},
    {color:"#4ECDC4",dark:"#2A9990",light:"#9EEEE8"},
    {color:"#A855F7",dark:"#7B22D4",light:"#D4A0FF"},
    {color:"#F59E0B",dark:"#B86E00",light:"#FCD34D"},
    {color:"#10B981",dark:"#047857",light:"#6EE7B7"},
    {color:"#EF4444",dark:"#B91C1C",light:"#FCA5A5"},
    {color:"#3B82F6",dark:"#1D4ED8",light:"#93C5FD"},
    {color:"#EC4899",dark:"#BE185D",light:"#F9A8D4"},
  ];
  const CAT_EMOJIS = ["📌","🏠","🎯","🌟","💡","🎨","🎵","🏆","🍀","🔔","🎒","🌍","🧠","💪","🛡️","🔑"];
  const [selColor, setSelColor] = useState(CAT_COLORS[0]);

  const [savingPhoto, setSavingPhoto] = useState(false);

  async function handleCatPhotoSave({ photo, emoji }) {
    setSavingPhoto(true);
    try {
      let photoUrl = null;
      if (photo && photo.startsWith("data:")) {
        photoUrl = await handlePhotoUpload(photo, `categories/${showCatPhoto}/cover_${Date.now()}`);
      } else if (photo && photo.startsWith("http")) {
        photoUrl = photo;
      }
      onUpdateCategories(categories.map(c=>c.id===showCatPhoto ? { ...c, photo: photoUrl } : c));
      setShowCatPhoto(null);
    } catch(e) {
      console.error("Category photo save error:", e);
      alert("Photo save failed. Please try again.");
    } finally {
      setSavingPhoto(false);
    }
  }

  function handleDeleteCat(id) {
    if (!window.confirm("Delete this whole category?")) return;
    onUpdateCategories(categories.filter(c=>c.id!==id));
  }

  function handleAddCat() {
    if (!newCatName.trim()) return;
    onUpdateCategories([...categories,{
      id:`cat_${Date.now()}`,label:newCatName.trim(),emoji:newCatEmoji,photo:null,
      ...selColor, phrase:newCatPhrase.trim(),items:[],
    }]);
    setNewCatName(""); setNewCatPhrase(""); setShowAddCat(false);
  }

  function handlePinChange() {
    if (newPin.length!==4||isNaN(Number(newPin))) { setPinMsg("PIN must be 4 digits"); return; }
    onChangePin(newPin); setNewPin(""); setPinMsg("✅ PIN updated!");
    setTimeout(()=>setPinMsg(""),2000);
  }

  return (
    <div style={{ minHeight:"100vh",background:"#f5f7ff" }}>
      {showCatPhoto && (
        <PhotoPickerModal title={savingPhoto ? "Saving..." : "Set Category Photo"} color="#667eea"
          onSave={handleCatPhotoSave} onClose={()=>!savingPhoto && setShowCatPhoto(null)} showNameField={false} />
      )}
      {showEditCat && (
        <EditCategoryModal cat={showEditCat} onSave={handleCatEdit} onClose={()=>setShowEditCat(null)} />
      )}
      <div style={{ background:"linear-gradient(135deg,#667eea,#764ba2)",padding:"16px 20px",display:"flex",alignItems:"center",gap:14 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ color:"#fff",fontSize:20,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>⚙️ Parent Settings</div>
      </div>
      <div style={{ padding:"20px 20px 40px" }}>
        <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:16,color:"#1a1a2e",marginBottom:12 }}>Categories</div>
        <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:20 }}>
          {categories.map(cat=>(
            <div key={cat.id} style={{ background:"#fff",borderRadius:18,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 3px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ width:52,height:52,borderRadius:12,overflow:"hidden",background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {cat.photo ? <img src={cat.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span style={{ fontSize:28 }}>{cat.emoji}</span>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#1a1a2e",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{cat.label}</div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999" }}>{cat.items.length} items · "{cat.phrase}"</div>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>setShowEditCat(cat)} style={{ background:"#667eea",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700 }}>✏️</button>
                <button onClick={()=>setShowCatPhoto(cat.id)} style={{ background:cat.color,border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700 }}>📷</button>
                <button onClick={()=>handleDeleteCat(cat.id)} style={{ background:"#fee2e2",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#EF4444",fontWeight:700 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        {!showAddCat ? (
          <button onClick={()=>setShowAddCat(true)} style={{ width:"100%",padding:14,borderRadius:16,border:"2px dashed #c0c0c0",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#888",cursor:"pointer" }}>
            + Add New Category
          </button>
        ) : (
          <div style={{ background:"#fff",borderRadius:18,padding:18,boxShadow:"0 3px 12px rgba(0,0,0,0.07)",marginBottom:20 }}>
            <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,marginBottom:14,color:"#1a1a2e" }}>New Category</div>
            <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Category name"
              style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:10 }} />
            <input value={newCatPhrase} onChange={e=>setNewCatPhrase(e.target.value)} placeholder='Spoken phrase (e.g. "I want to drink")'
              style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:12 }} />
            <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,color:"#666",marginBottom:8 }}>Icon</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
              {CAT_EMOJIS.map(e=>(
                <button key={e} onClick={()=>setNewCatEmoji(e)} style={{ fontSize:22,border:"none",borderRadius:8,background:newCatEmoji===e?"#667eea22":"#f0f0f0",padding:"4px 6px",cursor:"pointer",outline:newCatEmoji===e?"2px solid #667eea":"none" }}>{e}</button>
              ))}
            </div>
            <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,color:"#666",marginBottom:8 }}>Color</div>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
              {CAT_COLORS.map(c=>(
                <button key={c.color} onClick={()=>setSelColor(c)} style={{ width:32,height:32,borderRadius:"50%",background:c.color,border:selColor.color===c.color?"3px solid #1a1a2e":"3px solid transparent",cursor:"pointer" }} />
              ))}
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowAddCat(false)} style={{ flex:1,padding:12,borderRadius:12,border:"none",background:"#f0f0f0",fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer" }}>Cancel</button>
              <button onClick={handleAddCat} disabled={!newCatName.trim()} style={{ flex:1,padding:12,borderRadius:12,border:"none",background:newCatName.trim()?"#667eea":"#ccc",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,cursor:newCatName.trim()?"pointer":"not-allowed" }}>Add</button>
            </div>
          </div>
        )}
        <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:16,color:"#1a1a2e",margin:"24px 0 12px" }}>Change Parent PIN</div>
        <div style={{ background:"#fff",borderRadius:18,padding:18,boxShadow:"0 3px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#999",marginBottom:10 }}>Current PIN: {currentPin}</div>
          <input value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
            placeholder="New 4-digit PIN" maxLength={4} inputMode="numeric"
            style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:"2px solid #e0e0e0",fontSize:18,fontFamily:"'Nunito',sans-serif",fontWeight:800,outline:"none",boxSizing:"border-box",letterSpacing:8,marginBottom:10 }} />
          <button onClick={handlePinChange} style={{ width:"100%",padding:12,borderRadius:12,border:"none",background:"#667eea",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,cursor:"pointer",fontSize:15 }}>Update PIN</button>
          {pinMsg && <div style={{ textAlign:"center",marginTop:8,fontFamily:"'Nunito',sans-serif",color:pinMsg.startsWith("✅")?"#10B981":"#EF4444",fontWeight:700 }}>{pinMsg}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ categories, onSelectCategory, onOpenSettings, onOpenCompanion, parentMode, onToggleParentMode }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)" }}>
      <div style={{ background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)",padding:"24px 24px 16px",boxShadow:"0 4px 24px rgba(102,126,234,0.3)" }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:32,marginBottom:2 }}>🗣️</div>
            <div style={{ color:"#fff",fontSize:26,fontWeight:900,fontFamily:"'Nunito',sans-serif",lineHeight:1.1 }}>My Voice</div>
            <div style={{ color:"rgba(255,255,255,0.8)",fontSize:13,fontFamily:"'Nunito',sans-serif",marginTop:3 }}>
              {parentMode ? "✏️ Edit Mode" : "Tap a button to speak!"}
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end" }}>
            <button onClick={onToggleParentMode} style={{
              background:parentMode?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.22)",
              border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",
              fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
              color:parentMode?"#667eea":"#fff",
            }}>
              {parentMode ? "🔓 Exit Edit" : "🔐 Edit"}
            </button>
            {parentMode && (
              <button onClick={onOpenSettings} style={{ background:"rgba(255,255,255,0.22)",border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff" }}>
                ⚙️ Settings
              </button>
            )}
            <button onClick={onOpenCompanion} style={{ background:"rgba(255,255,255,0.22)",border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff" }}>
              📱 Parent View
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 10px 40px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, alignItems:"start" }}>
        {categories.map((cat,i) => (
          <HomeBlobCard key={cat.id} cat={cat} index={i} parentMode={parentMode} onClick={()=>onSelectCategory(cat)} />
        ))}
      </div>
    </div>
  );
}

// ─── "On My Way" Banner (shows on his screen when parent replies) ─────────────
function OnMyWayBanner({ show }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:300,
      background:"linear-gradient(135deg,#10B981,#047857)",
      padding:"20px 24px", textAlign:"center",
      boxShadow:"0 4px 24px rgba(16,185,129,0.5)",
      animation:"slideDown 0.4s ease",
    }}>
      <div style={{ fontSize:48 }}>👍</div>
      <div style={{ color:"#fff", fontSize:24, fontWeight:900, fontFamily:"'Nunito',sans-serif" }}>On my way!</div>
      <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Parent Companion Screen ──────────────────────────────────────────────────
function ParentCompanionScreen({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load recent messages
    loadMessages().then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
    // Subscribe to new messages in real time
    const sub = subscribeToMessages(msg => {
      setMessages(prev => [msg, ...prev]);
    });
    return () => sub.unsubscribe();
  }, []);

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  }

  async function handleReply(id) {
    await markRead(id);
    await sendReply();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read:true } : m));
  }

  const unread = messages.filter(m => !m.read && m.message !== "👍 On my way!");

  return (
    <div style={{ minHeight:"100vh", background:"#f5f7ff", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#667eea,#764ba2)", padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ color:"#fff", fontSize:19, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>
            📱 Parent View
          </div>
          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:13, fontFamily:"'Nunito',sans-serif" }}>
            {unread.length > 0 ? `${unread.length} new request${unread.length > 1 ? "s" : ""}` : "All caught up!"}
          </div>
        </div>
        {unread.length > 0 && (
          <div style={{ background:"#EF4444", color:"#fff", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontFamily:"'Nunito',sans-serif", fontSize:14 }}>
            {unread.length}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 40px" }}>
        {loading && (
          <div style={{ textAlign:"center", padding:40, color:"#aaa", fontFamily:"'Nunito',sans-serif" }}>Loading...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:"#aaa", fontFamily:"'Nunito',sans-serif", fontSize:15 }}>
            No messages yet — waiting for him to make a request!
          </div>
        )}
        {messages.map(msg => {
          const isReply = msg.message === "👍 On my way!";
          const isUnread = !msg.read && !isReply;
          return (
            <div key={msg.id} style={{
              background: isReply ? "#f0fdf4" : isUnread ? "#fff7ed" : "#fff",
              borderRadius:18, padding:"14px 16px", marginBottom:12,
              boxShadow:"0 3px 12px rgba(0,0,0,0.07)",
              borderLeft: isUnread ? "4px solid #F59E0B" : isReply ? "4px solid #10B981" : "4px solid #e0e0e0",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:isUnread ? 10 : 0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>{isReply ? "👍" : "🗣️"}</span>
                  <div>
                    <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:15, color:"#1a1a2e" }}>
                      {msg.message}
                    </div>
                    <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:12, color:"#999", marginTop:2 }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
                {isUnread && (
                  <span style={{ background:"#F59E0B", color:"#fff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>NEW</span>
                )}
              </div>
              {isUnread && (
                <button onClick={() => handleReply(msg.id)} style={{
                  width:"100%", padding:"10px 0", borderRadius:12, border:"none",
                  background:"linear-gradient(135deg,#10B981,#047857)",
                  color:"#fff", fontSize:15, fontWeight:800,
                  fontFamily:"'Nunito',sans-serif", cursor:"pointer",
                  boxShadow:"0 4px 12px rgba(16,185,129,0.3)",
                }}>
                  👍 On my way!
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function MyVoiceApp() {
  const [data, setData] = useState(SEED_DATA);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("home");
  const [activeCategory, setActiveCategory] = useState(null);
  const [parentMode, setParentMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [showOnMyWay, setShowOnMyWay] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT_LINK;
    document.head.appendChild(link);
    loadFromFirestore(SEED_DATA).then(d => {
      setData(d);
      setLoaded(true);
    });
    const sub = subscribeToMessages(msg => {
      if (msg.message === "👍 On my way!") {
        setShowOnMyWay(true);
        speak("On my way!");
        setTimeout(() => setShowOnMyWay(false), 4000);
      }
    });
    return () => sub?.unsubscribe?.();
  }, []);

  // Global search across all categories
  useEffect(() => {
    if (!globalSearch.trim()) { setSearchResults([]); return; }
    const q = globalSearch.toLowerCase();
    const results = [];
    data.categories.forEach(cat => {
      cat.items?.forEach(item => {
        if (item.name.toLowerCase().includes(q)) {
          results.push({ item, category: cat });
        }
      });
    });
    setSearchResults(results);
  }, [globalSearch, data.categories]);

  function persist(updated) { setData(updated); saveData(updated); }
  function updateCategory(c) { persist({ ...data, categories:data.categories.map(x=>x.id===c.id?c:x) }); }
  function updateAllCategories(cats) { persist({ ...data, categories:cats }); }

  function handleToggleParent() {
    if (parentMode) { setParentMode(false); }
    else { setPinAction("unlock"); setShowPinModal(true); }
  }

  function handlePinSuccess() {
    setShowPinModal(false);
    if (pinAction==="unlock") setParentMode(true);
  }

  function handleSearchSpeak(item, category) {
    const full = category.phrase ? `${category.phrase} ${item.name}` : item.name;
    speak(full);
    sendMessage(full);
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: full }),
    }).catch(e => console.error("Notify error:", e));
    setGlobalSearch("");
    setSearchResults([]);
  }

  return (
    <div style={{ maxWidth:480,margin:"0 auto",fontFamily:"'Nunito',sans-serif" }}>
      <OnMyWayBanner show={showOnMyWay} />
      {!loaded && (
        <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"linear-gradient(135deg,#667eea,#764ba2)" }}>
          <div style={{ fontSize:52 }}>🗣️</div>
          <div style={{ color:"#fff",fontSize:22,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>My Voice</div>
          <div style={{ color:"rgba(255,255,255,0.8)",fontSize:14,fontFamily:"'Nunito',sans-serif" }}>Loading...</div>
        </div>
      )}
      {showPinModal && (
        <PinModal title="Parent Mode" correctPin={data.parentPin}
          onSuccess={handlePinSuccess} onClose={()=>setShowPinModal(false)} />
      )}
      {loaded && screen==="home" && (
        <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)" }}>
          {/* Header */}
          <div style={{ background:"linear-gradient(135deg,#667eea 0%,#764ba2 100%)",padding:"24px 24px 16px",boxShadow:"0 4px 24px rgba(102,126,234,0.3)" }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:32,marginBottom:2 }}>🗣️</div>
                <div style={{ color:"#fff",fontSize:26,fontWeight:900,fontFamily:"'Nunito',sans-serif",lineHeight:1.1 }}>My Voice</div>
                <div style={{ color:"rgba(255,255,255,0.8)",fontSize:13,fontFamily:"'Nunito',sans-serif",marginTop:3 }}>
                  {parentMode ? "✏️ Edit Mode" : "Tap a button to speak!"}
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end" }}>
                <button onClick={handleToggleParent} style={{
                  background:parentMode?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.22)",
                  border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",
                  fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,
                  color:parentMode?"#667eea":"#fff",
                }}>
                  {parentMode ? "🔓 Exit Edit" : "🔐 Edit"}
                </button>
                {parentMode && (
                  <button onClick={()=>setScreen("settings")} style={{ background:"rgba(255,255,255,0.22)",border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff" }}>
                    ⚙️ Settings
                  </button>
                )}
                <button onClick={()=>setScreen("companion")} style={{ background:"rgba(255,255,255,0.22)",border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff" }}>
                  📱 Parent View
                </button>
              </div>
            </div>

            {/* Global Search Bar */}
            <div style={{ marginTop:14, position:"relative" }}>
              <input
                value={globalSearch}
                onChange={e=>setGlobalSearch(e.target.value)}
                placeholder="🔍 Search everything..."
                style={{
                  width:"100%", padding:"12px 16px", borderRadius:18,
                  border:"none", fontSize:16, fontFamily:"'Nunito',sans-serif",
                  fontWeight:600, outline:"none", background:"rgba(255,255,255,0.95)",
                  boxSizing:"border-box", boxShadow:"0 2px 12px rgba(0,0,0,0.15)",
                }}
              />
              {globalSearch && (
                <button onClick={()=>{ setGlobalSearch(""); setSearchResults([]); }} style={{
                  position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#999",
                }}>✕</button>
              )}
            </div>
          </div>

          {/* Category Grid OR Search Results */}
          <div style={{ padding:"16px 10px 40px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, alignItems:"start" }}>
            {globalSearch ? (
              searchResults.length > 0 ? searchResults.map(({item, category}) => (
                <div key={item.id} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <BlobCard
                    item={item}
                    phrase={category.phrase}
                    color={category.color}
                    dark={category.dark}
                    light={category.light}
                    index={0}
                    onSpeak={(text) => {
                      sendMessage(text);
                      fetch("/api/notify", {
                        method:"POST",
                        headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({ message: text }),
                      }).catch(e=>console.error(e));
                      setGlobalSearch("");
                      setSearchResults([]);
                    }}
                    onEdit={()=>{}}
                    onDelete={()=>{}}
                    parentMode={false}
                  />
                  <div style={{ fontSize:10, color:"#aaa", fontFamily:"'Nunito',sans-serif", marginTop:2 }}>{category.label}</div>
                </div>
              )) : (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:"#aaa", fontFamily:"'Nunito',sans-serif", fontSize:15 }}>
                  No results for "{globalSearch}"
                </div>
              )
            ) : (
              data.categories.map((cat,i) => (
                <HomeBlobCard key={cat.id} cat={cat} index={i} parentMode={parentMode}
                  onClick={()=>{ setActiveCategory(cat); setScreen("category"); }}
                />
              ))
            )}
          </div>
        </div>
      )}
      {screen==="category" && activeCategory && (
        <CategoryScreen
          category={data.categories.find(c=>c.id===activeCategory.id)||activeCategory}
          parentMode={parentMode}
          onBack={()=>setScreen("home")}
          onUpdateCategory={updateCategory} />
      )}
      {loaded && screen==="companion" && (
        <ParentCompanionScreen onBack={()=>setScreen("home")} />
      )}
      {loaded && screen==="settings" && (
        <SettingsScreen categories={data.categories} currentPin={data.parentPin}
          onUpdateCategories={updateAllCategories}
          onChangePin={pin=>persist({...data,parentPin:pin})}
          onBack={()=>setScreen("home")} />
      )}
    </div>
  );
}
