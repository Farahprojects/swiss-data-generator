// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAH-KHCfhlzoGUe2T05l2JvaMsMTfcempg",
  authDomain: "therai-775c1.firebaseapp.com",
  projectId: "therai-775c1",
  storageBucket: "therai-775c1.firebasestorage.app",
  messagingSenderId: "418946818517",
  appId: "1:418946818517:web:28240ec84063be3403dd5c",
  measurementId: "G-SN872VT8Q8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    // Emulators already connected
  }
}

export default app;
