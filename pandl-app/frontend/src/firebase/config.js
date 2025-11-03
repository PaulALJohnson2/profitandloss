import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDba6Gf2iIx_nCPOTyiwFfn3QrYaPqYsTQ",
  authDomain: "profit-and-loss-294a7.firebaseapp.com",
  projectId: "profit-and-loss-294a7",
  storageBucket: "profit-and-loss-294a7.firebasestorage.app",
  messagingSenderId: "436391574423",
  appId: "1:436391574423:web:c3e3239d219f81cb9362d2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };
