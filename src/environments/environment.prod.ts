// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "AIzaSyCLk6vLIRtdQk8Ji45aoMcCDQLYqTAPBEo",
    authDomain: "uniproject-3170a.firebaseapp.com",
    databaseURL: "https://uniproject-3170a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "uniproject-3170a",
    storageBucket: "uniproject-3170a.firebasestorage.app",
    messagingSenderId: "640418593421",
    appId: "1:640418593421:web:fbe77d48cfb134c5eb80c4",
    measurementId: "G-14N4GB2F49"
  }
};

// Initialize Firebase
const app = initializeApp(environment.firebaseConfig);
const analytics = getAnalytics(app);