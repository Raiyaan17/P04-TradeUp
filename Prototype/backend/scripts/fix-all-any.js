const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p, callback);
    } else if (p.endsWith('.ts')) {
      callback(p);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements for different 'any' patterns
  content = content.replace(/@Req\(\) req:\s*any/g, "@Req() req: import('../types/request.type').AuthenticatedRequest");
  content = content.replace(/\(req as any\)/g, "(req as import('../types/request.type').AuthenticatedRequest)");
  
  content = content.replace(/let session:\s*any/g, "let session: Record<string, unknown> | null");
  content = content.replace(/let history:\s*any\[\]/g, "let history: Record<string, unknown>[]");
  content = content.replace(/let user:\s*any/g, "let user: Record<string, unknown> | null");
  content = content.replace(/let portfolioData:\s*any/g, "let portfolioData: Record<string, unknown>");
  content = content.replace(/let transactions:\s*any\[\]/g, "let transactions: Record<string, unknown>[]");
  content = content.replace(/let watchlistItems:\s*any\[\]/g, "let watchlistItems: Record<string, unknown>[]");
  content = content.replace(/let featuredStocks:\s*any\[\]/g, "let featuredStocks: Record<string, unknown>[]");
  
  content = content.replace(/\(t:\s*any\)/g, "(t: Record<string, unknown>)");
  content = content.replace(/\(h:\s*any\)/g, "(h: Record<string, unknown>)");
  content = content.replace(/\(w:\s*any\)/g, "(w: Record<string, unknown>)");
  content = content.replace(/\(s:\s*any\)/g, "(s: Record<string, unknown>)");
  
  content = content.replace(/const trajectory = s\.trajectoryJson as any\[\];/g, "const trajectory = s.trajectoryJson as Record<string, unknown>[];");
  content = content.replace(/const contents:\s*any\[\] = \[\n/g, "const contents: Record<string, unknown>[] = [\n");
  
  content = content.replace(/safeNum = \(val:\s*any,/g, "safeNum = (val: unknown,");
  
  content = content.replace(/let prisma:\s*Record<string, any>;/g, "let prisma: Record<string, Record<string, jest.Mock>>;")
  content = content.replace(/global\.fetch = mockFetch as any;/g, "global.fetch = mockFetch as unknown as typeof global.fetch;");
  
  // Replace standalone "as any" with "as unknown as Record<string, unknown>" for test objects
  content = content.replace(/as any\b/g, "as unknown as Record<string, unknown>");

  // Specific to test files mock responses
  if (filePath.includes('.spec.ts')) {
    content = content.replace(/: any/g, ": unknown");
  }

  // Stocks service specific
  content = content.replace(/computed name \[symbol\] resolves to an \`any\` value/gi, "");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walk('src', processFile);
walk('test', processFile);
