import React, { useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

function DeleteAllTasks() {
  useEffect(() => {
    const deleteTasks = async () => {
      const tasksCollection = collection(db, "tasks");
      const tasksSnapshot = await getDocs(tasksCollection);
      
      const deletePromises = tasksSnapshot.docs.map(taskDoc => 
        deleteDoc(doc(db, "tasks", taskDoc.id))
      );

      await Promise.all(deletePromises);
      
      alert("Todas las tareas han sido eliminadas de la base de datos.");
    };

    deleteTasks();
  }, []);

  return <div>Eliminando todas las tareas de la base de datos...</div>;
}

export default DeleteAllTasks;
