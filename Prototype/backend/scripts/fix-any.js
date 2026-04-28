const fs = require('fs');
const glob = require('glob');
const path = require('path');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Chatbot Controller tests
  if (filePath.includes('chatbot.controller.spec.ts')) {
    // Already fixed manually
  }

  // Fix Oracle Controller
  if (filePath.includes('oracle.controller.ts')) {
    // Fixed by previous node command, but let's make sure
  }

  // Common patterns
  // @Req() req: any
  content = content.replace(/@Req\(\)\s+req:\s+any/g, "@Req() req: import('../types/request.type').AuthenticatedRequest");
  
  // (req as any).user
  content = content.replace(/\(req as any\)\.user/g, "(req as import('../types/request.type').AuthenticatedRequest).user");
  
  // : any -> : unknown for some safe spots where any is explicitly banned
  // But wait, changing `any` to `unknown` will cause "Object is of type 'unknown'" errors.

  fs.writeFileSync(filePath, content);
};

const run = () => {
  glob('src/**/*.ts', (err, files) => {
    files.forEach(fixFile);
  });
  glob('test/**/*.ts', (err, files) => {
    files.forEach(fixFile);
  });
};

run();
