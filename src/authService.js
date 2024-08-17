import { auth, db } from './firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Función para iniciar sesión un usuario y vincularlo con Firestore
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verificar si el documento de usuario existe en Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Si el documento no existe, crearlo
      await setDoc(userDocRef, {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      console.log("Documento de usuario creado en Firestore.");
    } else {
      console.log("Usuario ya registrado en Firestore.");
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
  }
}
