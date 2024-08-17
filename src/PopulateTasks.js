import React, { useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";

function PopulateTasks() {
  useEffect(() => {
    const populateTasks = async () => {
      const tasksCollection = collection(db, "tasks");
      const tasksSnapshot = await getDocs(tasksCollection);

      // Si ya hay tareas en la base de datos, no hacer nada
      if (tasksSnapshot.size > 0) {
        console.log("Las tareas ya están pobladas.");
        return;
      }

      const tasks = [
        { title: "Lavar los platos", difficulty: "2" },
        { title: "Sacar la basura", difficulty: "1" },
        { title: "Limpiar el baño", difficulty: "3" },
        { title: "Aspirar la casa", difficulty: "2" },
        { title: "Hacer la cama", difficulty: "1" },
        { title: "Cortar el césped", difficulty: "3" },
        { title: "Limpiar ventanas", difficulty: "2" },
        { title: "Barrer el patio", difficulty: "1" },
        { title: "Cocinar la cena", difficulty: "3" },
        { title: "Doblar la ropa", difficulty: "1" },
        { title: "Planchar la ropa", difficulty: "2" },
        { title: "Organizar la despensa", difficulty: "2" },
        { title: "Lavar el coche", difficulty: "3" },
        { title: "Regar las plantas", difficulty: "1" },
        { title: "Lavar la ropa", difficulty: "2" },
      ];

      for (const task of tasks) {
        await addDoc(tasksCollection, {
          title: task.title,
          difficulty: task.difficulty,
          assignedTo: "", // No asignada inicialmente
          assignedToName: "",
          completed: false, // Todas las tareas inicialmente no están completadas
          createdAt: new Date(), // Fecha de creación actual
          createdBy: "admin", // ID del usuario que crea la tarea (puede ser un UID)
          createdByName: "admin@example.com" // Email o nombre del creador
        });
      }

      console.log("Tareas agregadas a la base de datos.");
    };

    populateTasks();
  }, []);

  return <div>Poblando la base de datos con tareas del hogar...</div>;
}

export default PopulateTasks;