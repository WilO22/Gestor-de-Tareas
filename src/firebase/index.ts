// src/firebase/index.ts
// Archivo central para exports de Firebase para evitar problemas de resolución en el navegador

// Re-exportar todo lo necesario de Firebase
export { initializeApp } from 'firebase/app';
export {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
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
} from 'firebase/firestore';

// Re-exportar nuestros módulos locales
export { app, db } from './client';
export { auth } from './auth';
export * from './api';
export * from './users';
export * from './invitations';
