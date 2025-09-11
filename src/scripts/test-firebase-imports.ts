// Test script to verify Firebase imports are working
import { auth, onAuthStateChanged } from '../firebase/auth';
import { db } from '../firebase/client';

console.log('🔥 Test script: Firebase auth imported successfully:', !!auth);
console.log('🔥 Test script: Firebase db imported successfully:', !!db);
console.log('🔥 Test script: onAuthStateChanged imported successfully:', typeof onAuthStateChanged);

// Test auth state listener
onAuthStateChanged(auth, (user) => {
  console.log('🔥 Test script: Auth state changed:', user ? 'User authenticated' : 'No user');
});

export {};
