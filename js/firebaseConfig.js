// Zamijeni sa svojim Firebase podacima iz konzole
const firebaseConfig = {
  apiKey: "AIzaSyCSrGHMsMaXJgXlhRZrsQbh54lflZgd2UQ",
  authDomain: "projekti-600a1.firebaseapp.com",
  databaseURL: "https://projekti-600a1.firebaseio.com",
  projectId: "projekti-600a1",
  storageBucket: "projekti-600a1.firebasestorage.app",
  messagingSenderId: "274304457639",
  appId: "1:274304457639:web:08d9ea8d43387651937482",
  measurementId: "G-6QKCPX1F1R"
};

// Inicijalizacija Firebase
firebase.initializeApp(firebaseConfig);

// Firestore instanca
const db = firebase.firestore();
