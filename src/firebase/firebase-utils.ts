// src/firebase/firebase-utils.ts
// Utilidades básicas de Firebase para evitar problemas de resolución en el navegador

export {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  writeBatch,
  limit,
  orderBy
} from 'firebase/firestore';
