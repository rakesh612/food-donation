
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCvwjVmLSKXou9MTxlV5jqlVeAeyB0iFS0",
  authDomain: "food-donation-ecddc.firebaseapp.com",
  projectId: "food-donation-ecddc",
  storageBucket: "food-donation-ecddc.firebasestorage.app",
  messagingSenderId: "1089554282623",
  appId: "1:1089554282623:web:653370b998dc6a3ec6674a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);