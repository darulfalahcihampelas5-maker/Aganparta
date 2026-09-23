sed -i '667i\
  useEffect(() => {\
    if (!student?.kelas) return;\
    import("firebase/firestore").then(({ doc, onSnapshot }) => {\
      const docRef = doc(db, "config", "simulasiBK");\
      const unsubscribe = onSnapshot(docRef, (snap) => {\
        if (snap.exists()) {\
          const activeClasses = snap.data().activeClasses || [];\
          setIsSimulasiEnabled(activeClasses.includes(student.kelas));\
        } else {\
          setIsSimulasiEnabled(false);\
        }\
      });\
    });\
  }, [student?.kelas]);\
' src/pages/DashboardStudent.tsx
