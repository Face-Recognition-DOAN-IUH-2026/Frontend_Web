/**
 * Audit for unstable React dependency arrays.
 *
 * Rules:
 *
 *  error  A dependency of useEffect/useLayoutEffect/useCallback/useMemo refers
 *         to a value that is re-created on every render (array/object literal,
 *         arrow function, spread, .map()/.filter() result). Such a dependency
 *         changes identity every render, so the hook re-runs forever and React
 *         reports "Maximum update depth exceeded".
 *
 *  warn   A dependency refers to a function-typed prop/option (destructured
 *         from a component's props or a custom hook's options). The value is
 *         stable only if every caller memoises it; an inline arrow in the
 *         parent silently breaks that.
 *
 * Usage:  node scripts/audit-unstable-effect-deps.mjs [--warn-as-error]
 * Exit code is non-zero when at least one `error` finding exists.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const HOOK_NAMES = new Set(["useEffect", "useLayoutEffect", "useCallback", "useMemo"]);
const WARN_AS_ERROR = process.argv.includes("--warn-as-error");

/** Recursively collects .ts/.tsx files. */
export function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...collectFiles(fullPath));
    } else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

/** True when the expression allocates a fresh value on every evaluation. */
function createsNewValue(node) {
  switch (node.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
    case ts.SyntaxKind.ObjectLiteralExpression:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.FunctionExpression:
      return true;
    case ts.SyntaxKind.CallExpression: {
      const expression = node.expression;
      if (ts.isPropertyAccessExpression(expression)) {
        const method = expression.name.text;
        if (["map", "filter", "slice", "concat", "flatMap", "reduce"].includes(method)) return true;
      }
      return false;
    }
    case ts.SyntaxKind.SpreadElement:
      return true;
    default:
      return false;
  }
}

/** True when a type annotation describes a function. */
function isFunctionType(typeNode) {
  if (!typeNode) return false;
  const text = typeNode.getText();
  return text.includes("=>") || /\bFunction\b/.test(text);
}

/** Collects the function-typed names destructured from a parameter object. */
function collectFunctionBindings(parameters) {
  const bindings = new Map();
  for (const parameter of parameters) {
    if (!ts.isObjectBindingPattern(parameter.name)) continue;
    for (const element of parameter.name.elements) {
      const typeNode = element.type;
      if (isFunctionType(typeNode)) {
        bindings.set(element.name.getText(), element);
      }
    }
  }
  return bindings;
}

/** Analyses one file and returns the findings. */
export function analyseFile(filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const findings = [];
  const functionBindings = new Map();
  const destructuredNames = new Set();
  const parameterNames = new Set();
  const calledNames = new Set();
  const unstableLocals = new Set();

  // --- Pass 1: collect the facts the dependency check depends on -----------
  const collect = (node) => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      for (const [name, element] of collectFunctionBindings(node.parameters)) {
        functionBindings.set(name, element);
      }
      for (const parameter of node.parameters) {
        if (ts.isObjectBindingPattern(parameter.name)) {
          for (const element of parameter.name.elements) {
            destructuredNames.add(element.name.getText());
          }
        } else if (ts.isIdentifier(parameter.name)) {
          parameterNames.add(parameter.name.text);
        }
      }
    }

    // Identifiers used as a callee are functions — even when their type is
    // declared in an interface instead of inline.
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      calledNames.add(node.expression.text);
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (createsNewValue(node.initializer)) unstableLocals.add(node.name.text);
    }

    ts.forEachChild(node, collect);
  };
  collect(sourceFile);

  // --- Pass 2: inspect the dependency arrays --------------------------------
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && HOOK_NAMES.has(node.expression.text)) {
      const depsArgument = node.arguments[node.arguments.length - 1];
      if (depsArgument && ts.isArrayLiteralExpression(depsArgument)) {
        for (const element of depsArgument.elements) {
          if (!ts.isIdentifier(element)) continue;
          const name = element.text;

          if (unstableLocals.has(name)) {
            findings.push({
              level: "error",
              rule: "unstable-local-dep",
              name,
              message:
                `"${name}" is re-created on every render and used as a dependency — the hook re-runs on every render. Wrap it in useMemo/useCallback.`,
            });
            continue;
          }

          const isFunctionBinding =
            functionBindings.has(name) ||
            (destructuredNames.has(name) && calledNames.has(name)) ||
            (parameterNames.has(name) && calledNames.has(name));

          // React state setters are guaranteed to keep a stable identity.
          const isStateSetter = /^set[A-Z]/.test(name);

          if (isFunctionBinding && !isStateSetter) {
            findings.push({
              level: "warn",
              rule: "function-prop-dep",
              name,
              message:
                `"${name}" is a function prop/option used as a dependency — unstable unless every caller memoises it. Keep the latest value in a ref instead.`,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return findings.map((finding) => ({
    ...finding,
    file: filePath,
    line: sourceFile.getLineAndCharacterOfPosition(findNodePosition(sourceFile, finding.name)).line + 1,
  }));
}

/** Finds the first position of an identifier inside dependency arrays. */
function findNodePosition(sourceFile, name) {
  let found = 0;
  const search = (node) => {
    if (found) return;
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isIdentifier(element) && element.text === name) {
          found = element.getStart();
          return;
        }
      }
    }
    ts.forEachChild(node, search);
  };
  search(sourceFile);
  return found;
}

/** Analyses a whole directory. */
export function analyseDirectory(dir) {
  return collectFiles(dir).flatMap(analyseFile);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const files = collectFiles(SRC_DIR);
  const allFindings = files.flatMap(analyseFile);
  const errors = allFindings.filter((finding) => finding.level === "error");
  const warnings = allFindings.filter((finding) => finding.level === "warn");

  for (const finding of allFindings) {
    const tag = finding.level === "error" ? "ERROR" : "WARN ";
    const relative = path.relative(path.resolve(__dirname, ".."), finding.file);
    console.log(`${tag} ${relative}:${finding.line} [${finding.rule}] ${finding.message}`);
  }

  console.log(`\nScanned ${files.length} files — ${errors.length} error(s), ${warnings.length} warning(s).`);

  if (errors.length > 0 || (WARN_AS_ERROR && warnings.length > 0)) {
    process.exitCode = 1;
  }
}
