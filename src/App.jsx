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

// School Mode seed data — school-appropriate categories only
const SCHOOL_SEED_CATEGORIES = [
  {
    id:"school_need", label:"I Need", emoji:"🤚", photo:null,
    color:"#EF4444", dark:"#B91C1C", light:"#FCA5A5", phrase:"I need",
    items:[
      {id:"sn1",name:"Bathroom",emoji:"🚻",photo:null},
      {id:"sn2",name:"Water",emoji:"💧",photo:null},
      {id:"sn3",name:"Help",emoji:"🆘",photo:null},
      {id:"sn4",name:"Break",emoji:"⏸️",photo:null},
      {id:"sn5",name:"Nurse",emoji:"🏥",photo:null},
    ],
  },
  {
    id:"school_feel", label:"I Feel", emoji:"💛", photo:null,
    color:"#F59E0B", dark:"#C2701A", light:"#FFAA85", phrase:"I feel",
    items:[
      {id:"sf1",name:"Happy",emoji:"😄",photo:null},
      {id:"sf2",name:"Sad",emoji:"😢",photo:null},
      {id:"sf3",name:"Tired",emoji:"😴",photo:null},
      {id:"sf4",name:"Frustrated",emoji:"😤",photo:null},
      {id:"sf5",name:"Sick",emoji:"🤒",photo:null},
    ],
  },
  {
    id:"school_do", label:"I Want to Do", emoji:"⭐", photo:null,
    color:"#A855F7", dark:"#7C3AED", light:"#D8B4FE", phrase:"I want to",
    items:[
      {id:"sd1",name:"Read",emoji:"📖",photo:null},
      {id:"sd2",name:"Draw",emoji:"🎨",photo:null},
      {id:"sd3",name:"Play",emoji:"🧩",photo:null},
      {id:"sd4",name:"Recess",emoji:"🏃",photo:null},
      {id:"sd5",name:"Computer",emoji:"💻",photo:null},
    ],
  },
  {
    id:"school_yesno", label:"Yes/No", emoji:"✅", photo:null,
    color:"#10B981", dark:"#047857", light:"#6EE7B7", phrase:"",
    items:[
      {id:"sy1",name:"Yes",emoji:"✅",photo:null},
      {id:"sy2",name:"No",emoji:"❌",photo:null},
      {id:"sy3",name:"Maybe",emoji:"🤷",photo:null},
    ],
  },
];

const SCHOOL_SEED_DATA = { categories: SCHOOL_SEED_CATEGORIES, parentPin: "1234" };

// ─── Mode & Local Storage Helpers ─────────────────────────────────────────────
const MODE_KEY = "myvoice_device_mode"; // "home" or "school" — stays on THIS device only
const SCHOOL_DATA_KEY = "myvoice_school_data"; // local copy of school mode data + photos

function getDeviceMode() {
  try { return localStorage.getItem(MODE_KEY) || null; } catch { return null; }
}

function setDeviceMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
}

function loadSchoolDataLocal() {
  try {
    const s = localStorage.getItem(SCHOOL_DATA_KEY);
    return s ? JSON.parse(s) : SCHOOL_SEED_DATA;
  } catch { return SCHOOL_SEED_DATA; }
}

function saveSchoolDataLocal(data) {
  try { localStorage.setItem(SCHOOL_DATA_KEY, JSON.stringify(data)); } catch(e) { console.error("Local save error:", e); }
}

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
function BlobCard({ item, phrase, color, dark, light, index, onSpeak, onEdit, onDelete, parentMode, onOpenMenu, onManageMenu, onSchedule }) {
  const [squish, setSquish] = useState(false);
  const blobPath = BLOB_PATHS[index % BLOB_PATHS.length];
  const uid = `bc_${item.id}`;
  const hasMenu = item.subMenu?.food?.length > 0;

  // Auto deep link map — if item name matches, open the app
  const DEEP_LINKS = {
    "youtube":       { app: "youtube://",      web: "https://www.youtube.com" },
    "disney+":       { app: "disneyplus://",   web: "https://www.disneyplus.com" },
    "amazon music":  { app: "https://music.amazon.com/user-playlists/7e3811cb6f5b46e393412e79785cb73sune", web: "https://music.amazon.com/user-playlists/7e3811cb6f5b46e393412e79785cb73sune" },
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

    // If this item has a restaurant sub-menu, open the menu flow instead of speaking
    if (hasMenu) {
      onOpenMenu(item);
      return;
    }

    const full = phrase ? `${phrase} ${item.name}` : item.name;
    speak(full);

    // Check item's own appLink first, then check name against deep link map
    const nameKey = item.name.toLowerCase().trim();
    const deepLink = item.appLink ? { app: item.appLink, web: item.webLink } : DEEP_LINKS[nameKey];

    onSpeak(full, !!deepLink); // pass isAppItem = true if it has a deep link

    if (deepLink) {
      const start = Date.now();
      window.location = deepLink.app;
      setTimeout(() => {
        if (Date.now() - start < 2000) window.open(deepLink.web, "_blank");
      }, 1500);
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

      {hasMenu && !parentMode && (
        <span style={{
          fontSize:10, fontWeight:700, color:color,
          fontFamily:"'Nunito',sans-serif", marginTop:2,
          background: light, borderRadius:8, padding:"2px 8px",
        }}>🍽️ Menu</span>
      )}

      {parentMode && (
        <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap", justifyContent:"center" }}>
          {!isAvailable(item) && (
            <span style={{ fontSize:10, background:"#FEF3C7", color:"#92400E", borderRadius:6, padding:"2px 6px", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>
              {item.disabled ? "🚫 Off" : item.timeStart ? "⏰ Time" : "📅 Season"}
            </span>
          )}
          <button onClick={()=>onEdit(item)} style={{ background:color,border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
          <button onClick={()=>onSchedule(item)} style={{ background:"#F59E0B",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>⏰</button>
          <button onClick={()=>onManageMenu(item)} style={{ background:"#10B981",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:13,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>🍽️</button>
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
      {parentMode && !isAvailable(cat) && (
        <span style={{ fontSize:10, background:"#FEF3C7", color:"#92400E", borderRadius:6, padding:"2px 8px", fontFamily:"'Nunito',sans-serif", fontWeight:700, marginTop:2 }}>
          {cat.disabled ? "🚫 Off" : cat.timeStart ? "⏰ Time" : "📅 Season"}
        </span>
      )}
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

function PhotoPickerModal({ title, color, onSave, onClose, showNameField=true, initialName="", nameOptional=false }) {
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
    if (showNameField && !nameOptional && !name.trim()) return;
    // On emoji tab, explicitly pass null for photo so emoji shows
    const photoToSave = tab === "emoji" ? null : photo;
    onSave({ name:name.trim(), emoji, photo:photoToSave });
  }

  const canSave = (showNameField && !nameOptional) ? !!name.trim() : true;

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
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder={nameOptional ? "Optional: name this (e.g. Red Shirt)" : "Name this item (e.g. McDonald's)"}
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
// ─── Availability checker ─────────────────────────────────────────────────────
function isAvailable(item) {
  if (!item) return true;
  // Quick disabled
  if (item.disabled) return false;

  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMins = hours * 60 + minutes;

  // Time of day restriction
  if (item.timeStart !== undefined && item.timeEnd !== undefined) {
    const [sh, sm] = item.timeStart.split(":").map(Number);
    const [eh, em] = item.timeEnd.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins <= endMins) {
      // Normal range e.g. 11:00 - 19:00
      if (currentMins < startMins || currentMins > endMins) return false;
    } else {
      // Overnight range e.g. 19:00 - 11:00 next day
      if (currentMins < startMins && currentMins > endMins) return false;
    }
  }

  // Seasonal/month restriction
  if (item.monthStart !== undefined && item.monthEnd !== undefined) {
    const s = item.monthStart;
    const e = item.monthEnd;
    if (s <= e) {
      if (month < s || month > e) return false;
    } else {
      // Wraps year e.g. Oct(10) - Apr(4)
      if (month < s && month > e) return false;
    }
  }

  return true;
}
function RestaurantOrderScreen({ item, color, dark, light, onBack, onComplete }) {
  const [step, setStep] = useState("food"); // food | drink
  const [selectedFood, setSelectedFood] = useState(null);
  const foodOptions = item.subMenu?.food || [];
  const drinkOptions = item.subMenu?.drink || [];

  function finish(food, drink) {
    const phrase = `I want ${item.name} ${food.name}${drink ? ` and ${drink.name}` : ""}`;
    onComplete(phrase);
  }

  function handleSelect(opt) {
    if (step === "food") {
      if (drinkOptions.length > 0) {
        setSelectedFood(opt);
        setStep("drink");
      } else {
        finish(opt, null);
      }
    } else {
      finish(selectedFood, opt);
    }
  }

  const options = step === "food" ? foodOptions : drinkOptions;
  const title = step === "food" ? `What from ${item.name}?` : `What drink?`;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)", display:"flex", flexDirection:"column" }}>
      <div style={{ background:color, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ color:"#fff",fontSize:19,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>{title}</div>
      </div>
      {step === "drink" && selectedFood && (
        <div style={{ padding:"12px 20px 0", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, color:"#999" }}>
          ✅ {selectedFood.name}
        </div>
      )}
      <div style={{ flex:1, padding:"16px 12px 40px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:12, alignContent:"start" }}>
        {options.map((opt, i) => {
          const blobPath = BLOB_PATHS[i % BLOB_PATHS.length];
          const uid = `ro_${opt.id}`;
          return (
            <button key={opt.id} onClick={()=>handleSelect(opt)} style={{
              background:"none", border:"none", cursor:"pointer", padding:0,
              display:"flex", flexDirection:"column", alignItems:"center",
              filter:`drop-shadow(0 5px 10px ${dark}55)`,
            }}>
              <svg viewBox="0 0 100 100" style={{ width:140, height:140, display:"block", overflow:"visible" }}>
                <defs>
                  <radialGradient id={`${uid}_g`} cx="38%" cy="30%" r="65%">
                    <stop offset="0%" stopColor={light} />
                    <stop offset="50%" stopColor={color} />
                    <stop offset="100%" stopColor={dark} />
                  </radialGradient>
                  <clipPath id={`${uid}_c`}><path d={blobPath} /></clipPath>
                </defs>
                <path d={blobPath} fill={`url(#${uid}_g)`} />
                {opt.photo ? (
                  <image href={opt.photo} x="8" y="8" width="84" height="84"
                    clipPath={`url(#${uid}_c)`} preserveAspectRatio="xMidYMid slice" opacity="0.9" />
                ) : (
                  <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="38">{opt.emoji}</text>
                )}
                <ellipse cx="36" cy="26" rx="14" ry="9" fill="white" opacity="0.28" transform="rotate(-20,36,26)" />
              </svg>
              <span style={{ fontSize:14, fontWeight:800, color:"#1e1e1e", fontFamily:"'Nunito',sans-serif", marginTop:4, textAlign:"center" }}>{opt.name}</span>
            </button>
          );
        })}
        {options.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:30, color:"#aaa", fontFamily:"'Nunito',sans-serif" }}>
            No options yet — add some in Edit Mode!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Menu Edit Screen (parent manages food/drink options) ────────────────
function SubMenuEditScreen({ item, color, onBack, onSave }) {
  const [food, setFood] = useState(item.subMenu?.food || []);
  const [drink, setDrink] = useState(item.subMenu?.drink || []);
  const [adding, setAdding] = useState(null); // "food" | "drink" | null
  const [saving, setSaving] = useState(false);

  async function handleAddSave({ name, emoji, photo }) {
    if (!name.trim()) return;
    setSaving(true);
    let photoUrl = null;
    if (photo && photo.startsWith("data:")) {
      photoUrl = await handlePhotoUpload(photo, `submenu/${item.id}/${adding}/${Date.now()}`);
    } else if (photo) {
      photoUrl = photo;
    }
    const newOption = { id:`sm_${Date.now()}`, name:name.trim(), emoji, photo:photoUrl };
    if (adding === "food") setFood(f=>[...f, newOption]);
    else setDrink(d=>[...d, newOption]);
    setSaving(false);
    setAdding(null);
  }

  function handleDelete(type, id) {
    if (type==="food") setFood(food.filter(f=>f.id!==id));
    else setDrink(drink.filter(d=>d.id!==id));
  }

  function handleDone() {
    onSave({ ...item, subMenu: { food, drink } });
  }

  function renderList(list, type) {
    return (
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:12 }}>
        {list.map(opt => (
          <div key={opt.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:90 }}>
            <div style={{ width:80, height:80, borderRadius:16, overflow:"hidden", background:"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 10px rgba(0,0,0,0.1)" }}>
              {opt.photo ? <img src={opt.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span style={{ fontSize:36 }}>{opt.emoji}</span>}
            </div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12, color:"#1a1a2e", marginTop:4, textAlign:"center" }}>{opt.name}</div>
            <button onClick={()=>handleDelete(type, opt.id)} style={{ marginTop:4, background:"#fee2e2", border:"none", borderRadius:8, padding:"3px 10px", cursor:"pointer", fontSize:11, color:"#EF4444", fontWeight:700 }}>🗑️ Remove</button>
          </div>
        ))}
        <button onClick={()=>setAdding(type)} style={{
          width:80, height:80, borderRadius:16, border:`2px dashed ${color}`,
          background:"transparent", cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:28, color:color,
          flexShrink:0,
        }}>+</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)" }}>
      {adding && (
        <PhotoPickerModal title={saving ? "Saving..." : `Add ${adding==="food"?"Food":"Drink"} Option`} color={color}
          onSave={handleAddSave} onClose={()=>!saving && setAdding(null)} showNameField={true} />
      )}
      <div style={{ background:color, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
        <button onClick={handleDone} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ color:"#fff",fontSize:18,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>🍽️ Menu: {item.name}</div>
      </div>
      <div style={{ padding:20 }}>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:15, color:"#1a1a2e", marginBottom:8 }}>🍔 Food Options</div>
        {renderList(food, "food")}

        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:15, color:"#1a1a2e", marginBottom:8, marginTop:16 }}>🥤 Drink Options (optional)</div>
        {renderList(drink, "drink")}

        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:"#999", marginTop:8, marginBottom:20, lineHeight:1.5 }}>
          {food.length === 0
            ? "Add at least one food option to turn this into a menu. When food options exist, tapping this button will show the menu instead of speaking directly."
            : `Tapping ${item.name} will show these ${food.length} food option${food.length!==1?"s":""}${drink.length>0?` then ${drink.length} drink option${drink.length!==1?"s":""}`:""}, then say "I want ${item.name} [food]${drink.length>0?" and [drink]":""}".`
          }
        </div>

        <button onClick={handleDone} style={{
          width:"100%", padding:14, borderRadius:14, border:"none",
          background:color, color:"#fff", fontSize:17, fontWeight:800,
          fontFamily:"'Nunito',sans-serif", cursor:"pointer",
        }}>✅ Done</button>
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ScheduleModal({ item, color, onSave, onClose }) {
  const [disabled, setDisabled] = useState(item.disabled || false);
  const [useTime, setUseTime] = useState(item.timeStart !== undefined);
  const [timeStart, setTimeStart] = useState(item.timeStart || "08:00");
  const [timeEnd, setTimeEnd] = useState(item.timeEnd || "20:00");
  const [useMonth, setUseMonth] = useState(item.monthStart !== undefined);
  const [monthStart, setMonthStart] = useState(item.monthStart || 5);
  const [monthEnd, setMonthEnd] = useState(item.monthEnd || 9);

  function handleSave() {
    const updated = { ...item, disabled };
    if (useTime) { updated.timeStart = timeStart; updated.timeEnd = timeEnd; }
    else { delete updated.timeStart; delete updated.timeEnd; }
    if (useMonth) { updated.monthStart = monthStart; updated.monthEnd = monthEnd; }
    else { delete updated.monthStart; delete updated.monthEnd; }
    onSave(updated);
    onClose();
  }

  const available = isAvailable({ disabled, 
    timeStart: useTime ? timeStart : undefined, 
    timeEnd: useTime ? timeEnd : undefined,
    monthStart: useMonth ? monthStart : undefined,
    monthEnd: useMonth ? monthEnd : undefined,
  });

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.35)",maxHeight:"90vh",overflowY:"auto" }}>
        {/* Header */}
        <div style={{ background:color,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:"24px 24px 0 0",position:"sticky",top:0 }}>
          <span style={{ color:"#fff",fontSize:17,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>⏰ Availability: {item.name}</span>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.3)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:"#fff" }}>✕</button>
        </div>

        <div style={{ padding:20 }}>
          {/* Current status */}
          <div style={{ background:available?"#f0fdf4":"#fef2f2",borderRadius:14,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:20 }}>{available?"✅":"🚫"}</span>
            <span style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,color:available?"#15803d":"#dc2626" }}>
              Currently {available ? "visible to Logan" : "hidden from Logan"}
            </span>
          </div>

          {/* Quick disable */}
          <div style={{ background:"#f9fafb",borderRadius:14,padding:"14px 16px",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1a1a2e" }}>🚫 Quick Disable</div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999",marginTop:2 }}>Hide immediately, re-enable anytime</div>
              </div>
              <button onClick={()=>setDisabled(!disabled)} style={{
                width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",
                background:disabled?"#EF4444":"#e0e0e0",transition:"background 0.2s",
                position:"relative",
              }}>
                <div style={{ width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,transition:"left 0.2s",left:disabled?26:4 }} />
              </button>
            </div>
          </div>

          {/* Time of day */}
          <div style={{ background:"#f9fafb",borderRadius:14,padding:"14px 16px",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:useTime?14:0 }}>
              <div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1a1a2e" }}>⏰ Time of Day</div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999",marginTop:2 }}>Only show during certain hours</div>
              </div>
              <button onClick={()=>setUseTime(!useTime)} style={{
                width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",
                background:useTime?color:"#e0e0e0",transition:"background 0.2s",position:"relative",
              }}>
                <div style={{ width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,transition:"left 0.2s",left:useTime?26:4 }} />
              </button>
            </div>
            {useTime && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",marginBottom:6,fontWeight:700 }}>Show from</div>
                  <input type="time" value={timeStart} onChange={e=>setTimeStart(e.target.value)}
                    style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box" }} />
                </div>
                <div>
                  <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",marginBottom:6,fontWeight:700 }}>Hide after</div>
                  <input type="time" value={timeEnd} onChange={e=>setTimeEnd(e.target.value)}
                    style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box" }} />
                </div>
                <div style={{ gridColumn:"1/-1",fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999" }}>
                  Shows {timeStart} – {timeEnd} every day
                </div>
              </div>
            )}
          </div>

          {/* Seasonal */}
          <div style={{ background:"#f9fafb",borderRadius:14,padding:"14px 16px",marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:useMonth?14:0 }}>
              <div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#1a1a2e" }}>📅 Seasonal</div>
                <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999",marginTop:2 }}>Only show certain months of the year</div>
              </div>
              <button onClick={()=>setUseMonth(!useMonth)} style={{
                width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",
                background:useMonth?color:"#e0e0e0",transition:"background 0.2s",position:"relative",
              }}>
                <div style={{ width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:3,transition:"left 0.2s",left:useMonth?26:4 }} />
              </button>
            </div>
            {useMonth && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",marginBottom:6,fontWeight:700 }}>Show from</div>
                  <select value={monthStart} onChange={e=>setMonthStart(Number(e.target.value))}
                    style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none" }}>
                    {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#666",marginBottom:6,fontWeight:700 }}>Hide after</div>
                  <select value={monthEnd} onChange={e=>setMonthEnd(Number(e.target.value))}
                    style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #e0e0e0",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none" }}>
                    {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1",fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999" }}>
                  Shows {MONTHS[monthStart-1]} – {MONTHS[monthEnd-1]} every year
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSave} style={{
            width:"100%",padding:14,borderRadius:14,border:"none",
            background:color,color:"#fff",fontSize:17,fontWeight:800,
            fontFamily:"'Nunito',sans-serif",cursor:"pointer",
          }}>✅ Save Schedule</button>
        </div>
      </div>
    </div>
  );
}

function CategoryScreen({ category, onBack, onUpdateCategory, parentMode, onSpoken }) {
  const [items, setItems] = useState(category.items);
  const [search, setSearch] = useState("");
  const [lastSpoken, setLastSpoken] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [orderItem, setOrderItem] = useState(null);
  const [manageMenuItem, setManageMenuItem] = useState(null);
  const [scheduleItem, setScheduleItem] = useState(null);

  function handleSaveSubMenu(updatedItem) {
    persist(items.map(i => i.id===updatedItem.id ? updatedItem : i));
    setManageMenuItem(null);
  }

  function handleOrderComplete(phrase) {
    setOrderItem(null);
    handleSpeak(phrase);
  }

  const filtered = items
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => parentMode || isAvailable(i));

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

  function handleSpeak(text, isAppItem = false) {
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
    // Update last request bar (not for app-opening items like YouTube)
    if (!isAppItem && onSpoken) onSpoken(text);
    // Navigate back to home screen after a short delay so he sees the confetti
    setTimeout(() => onBack(), 2000);
  }

  // If ordering from a restaurant menu, show that flow instead
  if (orderItem) {
    return (
      <RestaurantOrderScreen item={orderItem} color={category.color} dark={category.dark} light={category.light}
        onBack={()=>setOrderItem(null)} onComplete={handleOrderComplete} />
    );
  }

  // If managing a restaurant's sub-menu, show that screen instead
  if (manageMenuItem) {
    return (
      <SubMenuEditScreen item={manageMenuItem} color={category.color}
        onBack={()=>setManageMenuItem(null)} onSave={handleSaveSubMenu} />
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#eef2ff 0%,#fafbff 100%)", display:"flex", flexDirection:"column" }}>
      <Confetti active={confetti} />
      {showAdd && (
        <PhotoPickerModal title="Add New Item" color={category.color}
          onSave={d=>{ handleSaveItem(d); setShowAdd(false); }} onClose={()=>setShowAdd(false)} />
      )}
      {scheduleItem && (
        <ScheduleModal item={scheduleItem} color={category.color}
          onSave={updated => { persist(items.map(i => i.id===updated.id ? updated : i)); }}
          onClose={()=>setScheduleItem(null)} />
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
            index={i} onSpeak={handleSpeak} onEdit={setEditItem} onDelete={handleDelete} parentMode={parentMode}
            onOpenMenu={setOrderItem} onManageMenu={setManageMenuItem} onSchedule={setScheduleItem} />
        ))}
        {/* Always-visible camera blob */}
        <CameraBlobCard color={category.color} dark={category.dark} light={category.light}
          onPress={()=>setShowAdd(true)} index={filtered.length} />
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({ categories, onUpdateCategories, onBack, onChangePin, currentPin, deviceMode, onSwitchMode }) {
  const [showCatPhoto, setShowCatPhoto] = useState(null);
  const [showEditCat, setShowEditCat] = useState(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [scheduleCat, setScheduleCat] = useState(null);

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
      {scheduleCat && (
        <ScheduleModal item={scheduleCat} color={scheduleCat.color || "#667eea"}
          onSave={updated => { onUpdateCategories(categories.map(c => c.id===updated.id ? updated : c)); setScheduleCat(null); }}
          onClose={()=>setScheduleCat(null)} />
      )}
      <div style={{ background:"linear-gradient(135deg,#667eea,#764ba2)",padding:"16px 20px",display:"flex",alignItems:"center",gap:14 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ color:"#fff",fontSize:20,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>⚙️ Parent Settings</div>
      </div>
      <div style={{ padding:"20px 20px 40px" }}>
        <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:16,color:"#1a1a2e",marginBottom:12 }}>Categories</div>
        <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:20 }}>
          {categories.map(cat=>(
            <div key={cat.id} style={{ background:"#fff",borderRadius:18,padding:"14px 16px",boxShadow:"0 3px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:52,height:52,borderRadius:12,overflow:"hidden",background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {cat.photo ? <img src={cat.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span style={{ fontSize:28 }}>{cat.emoji}</span>}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#1a1a2e",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{cat.label}</div>
                    {!isAvailable(cat) && (
                      <span style={{ fontSize:10,background:"#FEF3C7",color:"#92400E",borderRadius:6,padding:"2px 6px",fontFamily:"'Nunito',sans-serif",fontWeight:700,flexShrink:0 }}>
                        {cat.disabled?"🚫 Off":cat.timeStart?"⏰":"📅"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999" }}>{cat.items.length} items · "{cat.phrase}"</div>
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end" }}>
                  <button onClick={()=>setShowEditCat(cat)} style={{ background:"#667eea",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700 }}>✏️</button>
                  <button onClick={()=>setScheduleCat(cat)} style={{ background:"#F59E0B",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700 }}>⏰</button>
                  <button onClick={()=>setShowCatPhoto(cat.id)} style={{ background:cat.color,border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#fff",fontWeight:700 }}>📷</button>
                  <button onClick={()=>handleDeleteCat(cat.id)} style={{ background:"#fee2e2",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:14,color:"#EF4444",fontWeight:700 }}>🗑️</button>
                </div>
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

        <div style={{ fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:16,color:"#1a1a2e",margin:"24px 0 12px" }}>This Device</div>
        <div style={{ background:"#fff",borderRadius:18,padding:18,boxShadow:"0 3px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#1a1a2e",marginBottom:4,fontWeight:700 }}>
            Currently in: {deviceMode === "school" ? "🎒 School Mode" : "🏠 Home Mode"}
          </div>
          <div style={{ fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#999",marginBottom:14 }}>
            {deviceMode === "school"
              ? "Data is stored on this device only and works offline."
              : "Data syncs to the cloud and across devices in Home Mode."}
          </div>
          <button onClick={onSwitchMode} style={{
            width:"100%",padding:12,borderRadius:12,border:"2px solid #EF4444",
            background:"transparent",color:"#EF4444",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,cursor:"pointer",fontSize:14,
          }}>
            🔄 Switch to {deviceMode === "school" ? "Home" : "School"} Mode
          </button>
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

// ─── Choice Board (temporary, no persistence) ─────────────────────────────────
function ChoiceBoardScreen({ onBack }) {
  const [phase, setPhase] = useState("count"); // count | capture | choose | result
  const [count, setCount] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [confetti, setConfetti] = useState(false);

  function handleCountSelect(n) {
    setCount(n);
    setPhotos([]);
    setCurrent(0);
    setPhase("capture");
  }

  function handlePhotoSave({ photo, emoji, name }) {
    const newPhotos = [...photos, { photo, emoji, name: name?.trim() || "" }];
    setPhotos(newPhotos);
    if (newPhotos.length >= count) {
      setPhase("choose");
    } else {
      setCurrent(current + 1);
    }
  }

  function handleChoose(idx) {
    setSelected(idx);
    setConfetti(true);
    setPhase("result");
    setTimeout(() => setConfetti(false), 2000);
    if (photos[idx].name) speak(photos[idx].name);
  }

  function handleReset() {
    setPhase("count");
    setCount(0);
    setPhotos([]);
    setCurrent(0);
    setSelected(null);
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#fef3ff 0%,#fafbff 100%)" }}>
      <Confetti show={confetti} />
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#A855F7,#7C3AED)", padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.25)",border:"none",borderRadius:12,width:44,height:44,cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <div style={{ color:"#fff", fontSize:19, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>🎯 Choice Board</div>
      </div>

      <div style={{ padding:24 }}>
        {/* Step 1: Pick number of options */}
        {phase === "count" && (
          <div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:18, color:"#1a1a2e", marginBottom:16, textAlign:"center" }}>
              How many options?
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={()=>handleCountSelect(n)} style={{
                  padding:"24px 0", borderRadius:18, border:"none",
                  background:"linear-gradient(135deg,#A855F7,#7C3AED)",
                  color:"#fff", fontSize:28, fontWeight:900,
                  fontFamily:"'Nunito',sans-serif", cursor:"pointer",
                  boxShadow:"0 4px 14px rgba(124,58,237,0.3)",
                }}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Capture photos one at a time */}
        {phase === "capture" && (
          <PhotoPickerModal
            key={current}
            title={`Option ${current+1} of ${count}`}
            color="#A855F7"
            onSave={handlePhotoSave}
            onClose={onBack}
            showNameField={true}
            nameOptional={true}
          />
        )}

        {/* Step 3: Choose */}
        {phase === "choose" && (
          <div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:18, color:"#1a1a2e", marginBottom:16, textAlign:"center" }}>
              Tap your choice!
            </div>
            <div style={{ display:"grid", gridTemplateColumns: count<=2 ? "1fr 1fr" : count<=4 ? "1fr 1fr" : "1fr 1fr 1fr", gap:14 }}>
              {photos.map((p, idx) => (
                <div key={idx} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  {p.name && (
                    <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, color:"#7C3AED", marginBottom:6, textAlign:"center" }}>{p.name}</div>
                  )}
                  <button onClick={()=>handleChoose(idx)} style={{
                    border:"none", borderRadius:20, padding:0, cursor:"pointer",
                    background:"#fff", boxShadow:"0 6px 18px rgba(0,0,0,0.12)",
                    overflow:"hidden", aspectRatio:"1", display:"flex",
                    alignItems:"center", justifyContent:"center", width:"100%",
                  }}>
                    {p.photo
                      ? <img src={p.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <span style={{ fontSize:60 }}>{p.emoji}</span>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Result — show only chosen one */}
        {phase === "result" && selected !== null && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginTop:20 }}>
            <div style={{
              borderRadius:28, overflow:"hidden", boxShadow:"0 12px 36px rgba(124,58,237,0.35)",
              border:"6px solid #A855F7", width:"100%", maxWidth:300, aspectRatio:"1",
              display:"flex", alignItems:"center", justifyContent:"center", background:"#fff",
            }}>
              {photos[selected].photo
                ? <img src={photos[selected].photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:120 }}>{photos[selected].emoji}</span>
              }
            </div>
            {photos[selected].name && (
              <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:22, color:"#1a1a2e", marginTop:14 }}>
                {photos[selected].name}
              </div>
            )}
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:24, color:"#7C3AED", marginTop:10 }}>
              Great choice! 🎉
            </div>
            <button onClick={handleReset} style={{
              marginTop:24, padding:"14px 32px", borderRadius:16, border:"none",
              background:"linear-gradient(135deg,#A855F7,#7C3AED)", color:"#fff",
              fontSize:17, fontWeight:800, fontFamily:"'Nunito',sans-serif", cursor:"pointer",
              boxShadow:"0 4px 14px rgba(124,58,237,0.3)",
            }}>
              🔄 New Choice
            </button>
            <button onClick={onBack} style={{
              marginTop:12, padding:"14px 32px", borderRadius:16, border:`2px solid #A855F7`,
              background:"transparent", color:"#7C3AED",
              fontSize:17, fontWeight:800, fontFamily:"'Nunito',sans-serif", cursor:"pointer",
            }}>
              🏠 Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Voice Activated Screen ───────────────────────────────────────────────────
function VoiceActivatedScreen({ categories, parentPin, onSpeak, onExit }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [matched, setMatched] = useState([]); // now an array
  const [status, setStatus] = useState("Tap the mic to start!");
  const [showPinModal, setShowPinModal] = useState(false);
  const [debug, setDebug] = useState([]);
  const recogRef = useRef(null);

  const allItems = [];
  categories.forEach(cat => {
    cat.items?.forEach(item => allItems.push({ item, category: cat }));
  });

  // Fuzzy match — checks multiple ways a word could be close enough
  function fuzzyMatch(spoken, target) {
    const s = spoken.toLowerCase().trim();
    const t = target.toLowerCase().trim();
    if (s.includes(t) || t.includes(s)) return true;
    // Check if spoken starts with at least 3 chars of target
    if (t.length >= 3 && s.includes(t.slice(0, 3))) return true;
    // Check each word in spoken against each word in target
    const spokenWords = s.split(/\s+/);
    const targetWords = t.split(/\s+/);
    for (const sw of spokenWords) {
      for (const tw of targetWords) {
        if (sw.length < 3 || tw.length < 3) continue;
        // Check if words share enough characters at the start
        if (sw.startsWith(tw.slice(0, Math.max(3, Math.floor(tw.length * 0.6))))) return true;
        if (tw.startsWith(sw.slice(0, Math.max(3, Math.floor(sw.length * 0.6))))) return true;
        // Levenshtein-style: allow 1 error per 4 chars
        if (levenshtein(sw, tw) <= Math.floor(Math.max(sw.length, tw.length) / 4)) return true;
      }
    }
    return false;
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    return dp[m][n];
  }

  // Phonetic aliases — maps what speech recognition hears to what we want to match
  const PHONETIC_ALIASES = {
    "you too": "youtube",
    "you tube": "youtube",
    "you to": "youtube",
    "utube": "youtube",
    "disney": "disney+",
    "disney plus": "disney+",
    "amazon": "amazon music",
    "music": "amazon music",
    "mcdonald": "mcdonald's",
    "mac donald": "mcdonald's",
    "mac donalds": "mcdonald's",
    "burger king": "burger king",
    "nugget": "chicken nuggets",
    "nuggets": "chicken nuggets",
    "mac cheese": "mac & cheese",
    "macaroni": "mac & cheese",
    "eat": "i want to eat",
    "go": "i want to go",
    "drink": "i want to drink",
    "help": "i need help",
    "feel": "i feel",
  };

  function applyAliases(text) {
    let t = text.toLowerCase().trim();
    for (const [alias, replacement] of Object.entries(PHONETIC_ALIASES)) {
      if (t.includes(alias)) t = t.replace(alias, replacement);
    }
    return t;
  }

  function findMatches(text) {
    const original = text.toLowerCase().trim();
    const normalized = applyAliases(original);
    
    const matches = [];
    const seen = new Set();

    for (const { item, category } of allItems) {
      const targets = [item.name.toLowerCase(), category.label.toLowerCase()];
      let score = 0;
      for (const t of targets) {
        if (normalized.includes(t) || t.includes(normalized)) {
          score = t.length + 100;
          break;
        }
      }
      // Fuzzy if no exact match
      if (!score) {
        const words = normalized.split(/\s+/);
        const targetWords = [...item.name.toLowerCase().split(/\s+/), ...category.label.toLowerCase().split(/\s+/)];
        for (const tw of targetWords) {
          if (tw.length < 4) continue;
          for (const sw of words) {
            if (sw.length < 4) continue;
            if (levenshtein(sw, tw) <= Math.floor(Math.max(sw.length, tw.length) / 5)) {
              score = Math.max(score, tw.length);
            }
          }
        }
      }
      if (score > 0 && !seen.has(item.id)) {
        seen.add(item.id);
        matches.push({ item, category, score });
      }
    }

    // Sort by score, return top 4
    return matches.sort((a,b) => b.score - a.score).slice(0, 4);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Sorry, voice recognition isn't supported on this browser.");
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 5;

    recog.onstart = () => { setListening(true); setStatus("Listening..."); setTranscript(""); setMatched(null); };
    recog.onresult = (e) => {
      const results = Array.from(e.results);
      const texts = results.flatMap(r => Array.from(r)).map(r => r.transcript);
      const combined = texts.join(" ");
      setTranscript(combined);
      setDebug(texts);
      let allMatches = [];
      for (const t of texts) {
        const found = findMatches(t);
        found.forEach(m => {
          if (!allMatches.find(x => x.item.id === m.item.id)) allMatches.push(m);
        });
      }
      if (allMatches.length > 0) setMatched(allMatches.slice(0, 4));
    };
    recog.onend = () => {
      setListening(false);
      if (matched.length === 0) setStatus("Didn't catch that — try again!");
      else setStatus("Is this what you want?");
    };
    recog.onerror = (e) => {
      setListening(false);
      setStatus(e.error === "not-allowed" ? "Microphone permission denied." : "Try again!");
    };

    recogRef.current = recog;
    recog.start();
  }

  function handleTryAgain() {
    setMatched([]);
    setTranscript("");
    setDebug([]);
    setStatus("Tap the mic to start!");
  }

  function handleSelect(item, category) {
    const full = category.phrase ? `${category.phrase} ${item.name}` : item.name;
    onSpeak(full);
    setMatched([]);
    setTranscript("");
    setDebug([]);
    setStatus("Tap the mic to start!");
  }

  function getDeepLink(item) {
    const DEEP_LINKS = {
      "youtube":       { app: "youtube://",      web: "https://www.youtube.com" },
      "disney+":       { app: "disneyplus://",   web: "https://www.disneyplus.com" },
      "amazon music":  { app: "https://music.amazon.com/user-playlists/7e3811cb6f5b46e393412e79785cb73sune", web: "https://music.amazon.com/user-playlists/7e3811cb6f5b46e393412e79785cb73sune" },
      "netflix":       { app: "nflx://",         web: "https://www.netflix.com" },
      "hulu":          { app: "hulu://",         web: "https://www.hulu.com" },
      "spotify":       { app: "spotify://",      web: "https://www.spotify.com" },
      "apple music":   { app: "music://",        web: "https://music.apple.com" },
      "youtube kids":  { app: "youtubekids://",  web: "https://www.youtubekids.com" },
    };
    const nameKey = item.name.toLowerCase().trim();
    return item.appLink ? { app: item.appLink, web: item.webLink } : DEEP_LINKS[nameKey];
  }

  // Get the current parentPin from categories context — passed via prop

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      {/* PIN Modal to exit */}
      {showPinModal && (
        <PinModal title="Exit Voice Mode" correctPin={parentPin}
          onSuccess={onExit} onClose={()=>setShowPinModal(false)} />
      )}

      {/* Edit button — PIN protected */}
      <div style={{ position:"absolute", top:20, right:20 }}>
        <button onClick={()=>setShowPinModal(true)} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:12, padding:"8px 14px", cursor:"pointer", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13 }}>🔐 Edit</button>
      </div>

      <div style={{ fontSize:40, marginBottom:8 }}>🎤</div>
      <div style={{ color:"#fff", fontSize:26, fontWeight:900, fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>Voice Mode</div>
      <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, fontFamily:"'Nunito',sans-serif", marginBottom:32, textAlign:"center" }}>
        Say what you want and it will appear!
      </div>

      {/* Status */}
      <div style={{ color:"rgba(255,255,255,0.9)", fontSize:16, fontWeight:700, fontFamily:"'Nunito',sans-serif", marginBottom:20, textAlign:"center" }}>
        {status}
      </div>

      {/* Transcript (no match yet) */}
      {transcript && !matched && (
        <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:16, padding:"12px 20px", marginBottom:20, color:"#fff", fontFamily:"'Nunito',sans-serif", fontSize:15, textAlign:"center" }}>
          I heard: "{transcript}"
        </div>
      )}

      {/* Matched — show actual blob buttons for all matches */}
      {matched.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", animation:"fadeIn 0.3s ease" }}>
          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, fontFamily:"'Nunito',sans-serif", marginBottom:16, textAlign:"center" }}>
            {matched.length === 1 ? "Is this what you want?" : "Which one did you mean?"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns: matched.length === 1 ? "1fr" : "1fr 1fr", gap:12, width:"100%", maxWidth:360 }}>
            {matched.map(({ item, category }, idx) => {
              const bp = BLOB_PATHS[idx % BLOB_PATHS.length];
              const uid2 = `vm_${item.id}`;
              return (
                <a key={item.id} href={getDeepLink(item)?.app || "#"} 
                  onClick={(e)=>{
                    if (!getDeepLink(item)) e.preventDefault();
                    handleSelect(item, category);
                  }}
                  style={{
                    background:"none", border:"none", cursor:"pointer", padding:0,
                    display:"flex", flexDirection:"column", alignItems:"center",
                    filter:`drop-shadow(0 6px 16px ${category.dark}88)`,
                    textDecoration:"none",
                  }}>
                  background:"none", border:"none", cursor:"pointer", padding:0,
                  display:"flex", flexDirection:"column", alignItems:"center",
                  filter:`drop-shadow(0 6px 16px ${category.dark}88)`,
                }}>
                  <svg viewBox="0 0 100 100" style={{ width: matched.length===1?180:140, height:matched.length===1?180:140, display:"block", overflow:"visible" }}>
                    <defs>
                      <radialGradient id={`${uid2}_g`} cx="38%" cy="28%" r="65%">
                        <stop offset="0%" stopColor={category.light} />
                        <stop offset="48%" stopColor={category.color} />
                        <stop offset="100%" stopColor={category.dark} />
                      </radialGradient>
                      <clipPath id={`${uid2}_c`}><path d={bp} /></clipPath>
                    </defs>
                    <path d={bp} fill={`url(#${uid2}_g)`} />
                    {item.photo ? (
                      <image href={item.photo} x="8" y="8" width="84" height="84"
                        clipPath={`url(#${uid2}_c)`} preserveAspectRatio="xMidYMid slice" opacity="0.9" />
                    ) : (
                      <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="38">{item.emoji}</text>
                    )}
                    <ellipse cx="36" cy="26" rx="15" ry="10" fill="white" opacity="0.3" transform="rotate(-20,36,26)" />
                  </svg>
                  <span style={{ color:"#fff", fontSize:14, fontWeight:900, fontFamily:"'Nunito',sans-serif", marginTop:4, textAlign:"center" }}>{item.name}</span>
                </a>
              );
            })}
          </div>
          <button onClick={handleTryAgain} style={{
            marginTop:20, padding:"12px 32px", borderRadius:14, border:"2px solid rgba(255,255,255,0.4)",
            background:"transparent", color:"#fff", fontSize:15, fontWeight:700,
            fontFamily:"'Nunito',sans-serif", cursor:"pointer",
          }}>🔄 Try Again</button>
        </div>
      )}

      {/* Debug panel */}
      {debug.length > 0 && matched.length === 0 && (
        <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"10px 16px", marginBottom:16, width:"100%", maxWidth:360 }}>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, fontFamily:"'Nunito',sans-serif", marginBottom:6 }}>I heard:</div>
          {debug.map((t,i) => (
            <div key={i} style={{ color:"#fff", fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:600 }}>• "{t}"</div>
          ))}
        </div>
      )}

      {/* Mic button */}
      {matched.length === 0 && (
        <button onClick={startListening} disabled={listening} style={{
          width:120, height:120, borderRadius:"50%", border:"none",
          background:listening ? "#EF4444" : "rgba(255,255,255,0.95)",
          cursor:listening ? "default" : "pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:52, boxShadow:listening ? "0 0 0 20px rgba(239,68,68,0.3)" : "0 8px 28px rgba(0,0,0,0.25)",
          transition:"all 0.3s ease",
          animation: listening ? "pulse 1.2s infinite" : "none",
        }}>
          {listening ? "⏹️" : "🎤"}
        </button>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 20px rgba(239,68,68,0.2)} 50%{box-shadow:0 0 0 35px rgba(239,68,68,0.05)} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ─── Mode Selector (shown once per device) ────────────────────────────────────
function ModeSelectorScreen({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ fontSize:52, marginBottom:12 }}>🗣️</div>
      <div style={{ color:"#fff", fontSize:28, fontWeight:900, fontFamily:"'Nunito',sans-serif", marginBottom:6 }}>My Voice</div>
      <div style={{ color:"rgba(255,255,255,0.85)", fontSize:15, fontFamily:"'Nunito',sans-serif", marginBottom:40, textAlign:"center", maxWidth:300 }}>
        Which version should this device use?
      </div>

      <button onClick={()=>onSelect("home")} style={{
        width:"100%", maxWidth:320, padding:"20px 24px", borderRadius:20, border:"none",
        background:"#fff", cursor:"pointer", marginBottom:16,
        display:"flex", alignItems:"center", gap:16, textAlign:"left",
        boxShadow:"0 8px 24px rgba(0,0,0,0.2)",
      }}>
        <span style={{ fontSize:40 }}>🏠</span>
        <div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18, color:"#1a1a2e" }}>Home Mode</div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:"#888" }}>Full app — restaurants, videos, music</div>
        </div>
      </button>

      <button onClick={()=>onSelect("school")} style={{
        width:"100%", maxWidth:320, padding:"20px 24px", borderRadius:20, border:"none",
        background:"#fff", cursor:"pointer",
        display:"flex", alignItems:"center", gap:16, textAlign:"left",
        boxShadow:"0 8px 24px rgba(0,0,0,0.2)",
      }}>
        <span style={{ fontSize:40 }}>🎒</span>
        <div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18, color:"#1a1a2e" }}>School Mode</div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:"#888" }}>Offline-friendly — school essentials</div>
        </div>
      </button>

      <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, fontFamily:"'Nunito',sans-serif", marginTop:32, textAlign:"center", maxWidth:280 }}>
        This choice is saved on this device only. You can change it later in Settings.
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function MyVoiceApp() {
  const [deviceMode, setDeviceModeState] = useState(null); // null = not chosen yet, "home" or "school"
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
  const [voiceMode, setVoiceMode] = useState(false);
  const [lastRequest, setLastRequest] = useState(() => {
    try { return localStorage.getItem("myvoice_last_request") || ""; } catch { return ""; }
  });

  function updateLastRequest(text) {
    setLastRequest(text);
    try { localStorage.setItem("myvoice_last_request", text); } catch {}
  }

  function clearLastRequest() {
    setLastRequest("");
    try { localStorage.removeItem("myvoice_last_request"); } catch {}
  }

  // Check for saved device mode on mount
  useEffect(() => {
    const saved = getDeviceMode();
    if (saved) setDeviceModeState(saved);
  }, []);

  function handleSelectMode(mode) {
    setDeviceMode(mode);
    setDeviceModeState(mode);
  }

  useEffect(() => {
    if (!deviceMode) return; // wait until mode is chosen

    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT_LINK;
    document.head.appendChild(link);

    if (deviceMode === "school") {
      // School Mode — load from local storage only, fully offline
      const d = loadSchoolDataLocal();
      setData(d);
      setLoaded(true);
      if (d.voiceMode) setVoiceMode(true);
      return; // no Supabase subscription needed for school mode (Phase 1)
    }

    // Home Mode — load from Firestore as before
    loadFromFirestore(SEED_DATA).then(d => {
      setData(d);
      setLoaded(true);
      if (d.voiceMode) setVoiceMode(true);
    });
    const sub = subscribeToMessages(msg => {
      if (msg.message === "👍 On my way!") {
        setShowOnMyWay(true);
        speak("On my way!");
        setTimeout(() => setShowOnMyWay(false), 4000);
      }
    });
    return () => sub?.unsubscribe?.();
  }, [deviceMode]);

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

  function persist(updated) {
    setData(updated);
    if (deviceMode === "school") {
      saveSchoolDataLocal(updated); // local only — Phase 1
    } else {
      saveData(updated); // Firestore as before
    }
  }
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
    updateLastRequest(full);
    setGlobalSearch("");
    setSearchResults([]);
  }

  // Show mode selector if this device hasn't chosen a mode yet
  if (!deviceMode) {
    return <ModeSelectorScreen onSelect={handleSelectMode} />;
  }

  return (
    <div style={{ maxWidth:480,margin:"0 auto",fontFamily:"'Nunito',sans-serif" }}>
      <OnMyWayBanner show={showOnMyWay} />
      {!loaded && (
        <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"linear-gradient(135deg,#667eea,#764ba2)" }}>
          <div style={{ fontSize:52 }}>🗣️</div>
          <div style={{ color:"#fff",fontSize:22,fontWeight:800,fontFamily:"'Nunito',sans-serif" }}>My Voice</div>
          <div style={{ color:"rgba(255,255,255,0.8)",fontSize:14,fontFamily:"'Nunito',sans-serif" }}>
            {deviceMode === "school" ? "Loading (offline ready)..." : "Loading..."}
          </div>
        </div>
      )}
      {showPinModal && (
        <PinModal title="Parent Mode" correctPin={data.parentPin}
          onSuccess={handlePinSuccess} onClose={()=>setShowPinModal(false)} />
      )}
      {loaded && screen==="home" && voiceMode && !parentMode && (
        <VoiceActivatedScreen
          categories={data.categories}
          parentPin={data.parentPin}
          onSpeak={(text) => {
            speak(text);
            sendMessage(text);
            fetch("/api/notify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message:text }) }).catch(()=>{});
            updateLastRequest(text);
          }}
          onExit={()=>{
            setVoiceMode(false);
            saveData({ ...data, voiceMode: false });
          }}
        />
      )}
      {loaded && screen==="home" && (!voiceMode || parentMode) && (
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
                {deviceMode === "school" && (
                  <div style={{ display:"inline-block", marginTop:4, background:"rgba(255,255,255,0.25)", borderRadius:8, padding:"2px 10px", color:"#fff", fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>
                    🎒 School Mode {navigator.onLine ? "" : "(Offline)"}
                  </div>
                )}
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
                {parentMode && (
                  <button onClick={()=>{
                    const newMode = !voiceMode;
                    setVoiceMode(newMode);
                    persist({ ...data, voiceMode: newMode });
                  }} style={{
                    background:voiceMode?"#10B981":"rgba(255,255,255,0.22)",
                    border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",
                    fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff"
                  }}>
                    {voiceMode ? "🎤 Voice Mode ON" : "🎤 Voice Mode"}
                  </button>
                )}
                <button onClick={()=>setScreen("choice")} style={{ background:"rgba(255,255,255,0.22)",border:"none",borderRadius:12,padding:"8px 14px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:"#fff" }}>
                  🎯 Choice Board
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

          {/* Last Request Bar */}
          {lastRequest && (
            <div style={{
              background:"#1a1a2e", padding:"12px 20px",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>🗣️</span>
                <span style={{
                  fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14,
                  color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                }}>"{lastRequest}"</span>
              </div>
              <button onClick={clearLastRequest} style={{
                background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8,
                padding:"4px 10px", cursor:"pointer", color:"#fff", fontSize:12,
                fontFamily:"'Nunito',sans-serif", fontWeight:700, flexShrink:0,
              }}>✕ Clear</button>
            </div>
          )}

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
                    onOpenMenu={()=>{}}
                    onManageMenu={()=>{}}
                    onSchedule={()=>{}}
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
              data.categories
                .filter(cat => parentMode || isAvailable(cat))
                .map((cat,i) => (
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
          onUpdateCategory={updateCategory}
          onSpoken={updateLastRequest} />
      )}
      {loaded && screen==="choice" && (
        <ChoiceBoardScreen onBack={()=>setScreen("home")} />
      )}
      {loaded && screen==="settings" && (
        <SettingsScreen categories={data.categories} currentPin={data.parentPin}
          onUpdateCategories={updateAllCategories}
          onChangePin={pin=>persist({...data,parentPin:pin})}
          onBack={()=>setScreen("home")}
          deviceMode={deviceMode}
          onSwitchMode={()=>{
            const newMode = deviceMode === "school" ? "home" : "school";
            if (window.confirm(`Switch this device to ${newMode === "school" ? "School" : "Home"} Mode? The app will reload.`)) {
              setDeviceMode(newMode);
              window.location.reload();
            }
          }} />
      )}
    </div>
  );
}