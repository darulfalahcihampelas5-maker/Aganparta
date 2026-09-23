sed -i '/const \[isSimulasiEnabled/a \
  useEffect(() => {\
    if (!isSimulasiEnabled && activeMenu === "simulasi") {\
      setActiveMenu("dashboard");\
    }\
  }, [isSimulasiEnabled, activeMenu]);\
' src/pages/DashboardStudent.tsx
