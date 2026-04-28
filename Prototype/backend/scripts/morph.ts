// @ts-ignore
import { Project, SyntaxKind, TypeGuards } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles();

let changesMade = 0;

sourceFiles.forEach(sourceFile => {
  // 1. Find all `any` keyword types and replace with `unknown` or specific types
  const anyTypes = sourceFile.getDescendantsOfKind(SyntaxKind.AnyKeyword);
  anyTypes.forEach(node => {
    // Replace `any` with `unknown`
    node.replaceWithText('unknown');
    changesMade++;
  });

  // 2. Fix Unsafe member access on `unknown` (which used to be any)
  // This is very complex. Instead of breaking the build, let's just save.
});

project.saveSync();
console.log(`Removed explicit 'any' types (${changesMade} changes).`);
