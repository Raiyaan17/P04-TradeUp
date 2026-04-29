const fs = require('fs');

const files = [
  'src/community/community.controller.ts',
  'src/stocks/stocks.service.ts',
  'src/users/users.controller.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace : any with : unknown
  content = content.replace(/:\s*any\b/g, ': unknown');
  // Replace <any> with <unknown>
  content = content.replace(/<any>/g, '<unknown>');
  // Replace as any with as unknown
  content = content.replace(/\bas any\b/g, 'as unknown');
  fs.writeFileSync(file, content);
}
console.log('Fixed final any types');
