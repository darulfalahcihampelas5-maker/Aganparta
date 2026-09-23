sed -i 's/const menus = \[/const allMenus = \[/g' src/pages/DashboardStudent.tsx
sed -i '/const variants = {/i \
  const menus = allMenus.filter(m => m.id !== "simulasi" || isSimulasiEnabled);\
' src/pages/DashboardStudent.tsx
