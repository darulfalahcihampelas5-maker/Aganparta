const fs = require('fs');
const content = fs.readFileSync('src/pages/DashboardStudent.tsx', 'utf8');
const lines = content.split('\n');
let stack = [];
lines.forEach((line, i) => {
  const matches = line.match(/<\/?div/g);
  if (matches) {
    matches.forEach(m => {
      if (m === '<div') stack.push(i + 1);
      else if (m === '</div>') {
        if (stack.length === 0) console.log(`Unmatched closing div at line ${i + 1}`);
        else stack.pop();
      }
    });
  }
});
if (stack.length > 0) {
  console.log(`Unclosed div(s) starting at line(s): ${stack.join(', ')}`);
}
