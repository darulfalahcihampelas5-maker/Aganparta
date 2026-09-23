import { isClassMatch, normalizeClassName, isAllClasses, isExamForClass } from './src/lib/gradeUtils';

const mockExam1 = {
  title: "Pretes",
  targetClasses: ["X"],
};

const mockExam2 = {
  title: "Pretes",
  kelas: "10",
};

const mockExam3 = {
  title: "Pretes",
  targets: [{kelas: "10"}],
};

console.log("Exam1 X3:", isExamForClass(mockExam1, "X3"));
console.log("Exam2 X3:", isExamForClass(mockExam2, "X3"));
console.log("Exam3 X3:", isExamForClass(mockExam3, "X3"));

