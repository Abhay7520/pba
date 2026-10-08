// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: "AIzaSyAkmXtX1GAMNV39Zg6hwk9B2tklQK_uTjs",
  authDomain: "civiclink-f8fa9.firebaseapp.com",
  databaseURL: "https://civiclink-f8fa9-default-rtdb.firebaseio.com",
  projectId: "civiclink-f8fa9",
  storageBucket: "civiclink-f8fa9.firebasestorage.app",
  messagingSenderId: "813948184671",
  appId: "1:813948184671:web:c2c5d8ddf7e670ce1c13ea",
  measurementId: "G-82XVZ4H0BP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);