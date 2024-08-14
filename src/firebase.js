import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBGbHcvQ4q3BNQBfohTrMwp7WF9SJwmPLU",
    authDomain: "home-task-manager-5445f.firebaseapp.com",
    projectId: "home-task-manager-5445f",
    storageBucket: "home-task-manager-5445f.appspot.com",
    messagingSenderId: "778879030337",
    appId: "1:778879030337:web:bbce0e3d70b2f7cbc622c0",
    measurementId: "G-NZJK1803XF"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db };
