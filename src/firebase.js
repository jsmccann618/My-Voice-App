import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMptXnYzKpKMJZkRgdhvftRl_4BZzKoTk",
  authDomain: "my-voice-app-1b454.firebaseapp.com",
  projectId: "my-voice-app-1b454",
  storageBucket: "my-voice-app-1b454.firebasestorage.app",
  messagingSenderId: "452280740678",
  appId: "1:452280740678:web:2a0163028c98b1e3a95347"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DOC_REF = doc(db, "myvoice", "appdata");

// Load data from Firestore, fall back to local seed if nothing saved yet
export async function loadFromFirestore(seedData) {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) {
      return snap.data();
    }
    // First run — save seed data to Firestore
    await setDoc(DOC_REF, seedData);
    return seedData;
  } catch (e) {
    console.error("Firestore load error:", e);
    return seedData;
  }
}

// Save data to Firestore
export async function saveToFirestore(data) {
  try {
    await setDoc(DOC_REF, data);
  } catch (e) {
    console.error("Firestore save error:", e);
  }
}

// Subscribe to real-time updates (for parent companion mode later)
export function subscribeToChanges(callback) {
  return onSnapshot(DOC_REF, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}
