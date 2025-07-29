// Import delle funzioni Firebase necessarie
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// La tua configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAGoVq0-DvyqUUH4aDCfOFZP2NobclIg_o",
  authDomain: "hombu-8630c.firebaseapp.com",
  databaseURL: "https://hombu-8630c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hombu-8630c",
  storageBucket: "hombu-8630c.firebasestorage.app",
  messagingSenderId: "886418358212",
  appId: "1:886418358212:web:fa87f614ad5665b3426e91",
  measurementId: "G-D6W8XKCB8Z"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore e Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;


/*
export const firebaseConfig = {
  apiKey: "AIzaSyAGoVq0-DvyqUUH4aDCfOFZP2NobclIg_o",
  authDomain: "hombu-8630c.firebaseapp.com",
  databaseURL: "https://hombu-8630c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hombu-8630c",
  storageBucket: "hombu-8630c.firebasestorage.app",
  messagingSenderId: "886418358212",
  appId: "1:886418358212:web:fa87f614ad5665b3426e91",
  measurementId: "G-D6W8XKCB8Z"
};
*/
