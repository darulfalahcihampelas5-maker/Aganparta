let teacherPromise: Promise<typeof import("../pages/DashboardTeacher")> | null = null;
let studentPromise: Promise<typeof import("../pages/DashboardStudent")> | null = null;

export const preloadDashboardTeacher = () => {
  if (!teacherPromise) {
    teacherPromise = import("../pages/DashboardTeacher").catch((err) => {
      teacherPromise = null;
      throw err;
    });
  }
  return teacherPromise;
};

export const preloadDashboardStudent = () => {
  if (!studentPromise) {
    studentPromise = import("../pages/DashboardStudent").catch((err) => {
      studentPromise = null;
      throw err;
    });
  }
  return studentPromise;
};
