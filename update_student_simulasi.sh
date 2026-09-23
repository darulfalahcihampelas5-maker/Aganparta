sed -i '/const \[activeMenu, setActiveMenu\]/a \
  const [isSimulasiEnabled, setIsSimulasiEnabled] = useState(false);' src/pages/DashboardStudent.tsx
