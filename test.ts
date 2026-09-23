import { isClassMatch, normalizeClassName, isAllClasses } from './src/lib/gradeUtils';

console.log("X and X3:", isClassMatch("X", "X3"));
console.log("X3 and X:", isClassMatch("X3", "X"));
console.log("10 and X3:", isClassMatch("10", "X3"));
console.log("Fase E and X3:", isClassMatch("Fase E", "X3"));
console.log("Pretes and X3:", isClassMatch("Pretes", "X3"));
console.log("X3 and Pretest:", isClassMatch("X3", "Pretest"));
console.log("x1 and x3:", isClassMatch("x1", "x3"));
console.log("isAllClasses('Pretes'):", isAllClasses("Pretes"));

