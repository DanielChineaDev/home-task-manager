import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginForm from './LoginForm';
import PopulateTasks from './PopulateTasks';
import DeleteAllTasks from './DeleteAllTasks';
import TaskManager from './TaskManager';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar si existe el documento del usuario en Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserData(userDoc.data()); // Guardar los datos del usuario de Firestore
        }

        setUser({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
        });
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div>
      {/* Descomenta solo uno de los siguientes */}
      {/* <DeleteAllTasks /> */}
      {/* <PopulateTasks /> */}
      {user ? (
        <div>
          <h1>Welcome, {userData?.name || user.name}!</h1>
          <button onClick={handleLogout}>Logout</button>
          <TaskManager />
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

export default App;
