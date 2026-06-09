import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

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
const storage = getStorage(app);

const DOC_REF = doc(db, "myvoice", "appdata");

// ─── Firestore ────────────────────────────────────────────────────────────────
export async function loadFromFirestore(seedData) {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) return snap.data();
    await setDoc(DOC_REF, seedData);
    return seedData;
  } catch (e) {
    console.error("Firestore load error:", e);
    return seedData;
  }
}

export async function saveToFirestore(data) {
  try {
    await setDoc(DOC_REF, data);
  } catch (e) {
    console.error("Firestore save error:", e);
  }
}

// ─── Firebase Storage (photos) ────────────────────────────────────────────────

// Upload a base64 photo to Firebase Storage, return the download URL
export async function uploadPhoto(base64Data, path) {
  try {
    const storageRef = ref(storage, path);
    // Strip the data:image/...;base64, prefix
    const base64String = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const format = base64Data.includes("jpeg") ? "jpeg" : "png";
    await uploadString(storageRef, base64String, "base64", { contentType: `image/${format}` });
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (e) {
    console.error("Storage upload error:", e);
    return null;
  }
}

// Delete a photo from Firebase Storage
export async function deletePhoto(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (e) {
    console.error("Storage delete error:", e);
  }
}
