// src/firebase/client-config.ts
// Configuración específica para el cliente que evita problemas de resolución

// Importar funciones necesarias localmente
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
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
import type { Unsubscribe } from 'firebase/firestore';

// Importar configuración local
import { app } from './client';

// Exportar servicios locales
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-exportar funciones para uso externo
export { initializeApp };
export { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged };
export {
  getFirestore,
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
};
export type { Unsubscribe };
