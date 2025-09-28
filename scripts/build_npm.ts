// REF: https://deno.com/blog/publish-esm-cjs-module-dnt
import { build, emptyDir } from "@deno/dnt";
import { parseArgs } from "@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  alias: {
    v: "version",
    t: "test",
  },
  default: {
    test: false,
  },
  boolean: ["test"],
  string: ["version"],
});

const infoDeno = JSON.parse(Deno.readTextFileSync("deno.json"));
const test = args.test === true;
const version = args.version || infoDeno.version;

console.log("Building ESM module", {
  test,
  version,
});

await emptyDir("./dist");

await build({
  entryPoints: [
    "./src/mod.ts",
    {
      name: "./types",
      path: "src/types.ts",
    },
    {
      name: "./hono",
      path: "src/hono/mod.ts",
    },
  ],
  rootTestDir: "./tests",
  outDir: "./dist",
  compilerOptions: {
    lib: ["ES2021", "DOM"],
  },
  shims: {
    deno: test,
    crypto: false,
  },
  test,
  typeCheck: test ? false : "single",
  packageManager: "npm",
  package: {
    name: infoDeno.name,
    version,
    description: infoDeno.description,
    license: infoDeno.license,
    peerDependencies: {
      "hono": "^4.9.9",
    },
    repository: {
      type: "git",
      url: "git+https://github.com/kazejs/ioc.git",
    },
    bugs: {
      url: "https://github.com/kazejs/ioc/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "dist/LICENSE");
    Deno.copyFileSync("README.md", "dist/README.md");

    const customNpmignore = `
test_runner.js
yarn.lock
pnpm-lock.yaml
/src/
node_modules/
  `;

    Deno.writeTextFileSync("./dist/.npmignore", customNpmignore);

    // Remove hono from dependencies and keep only as peerDependency
    const packageJsonPath = "./dist/package.json";
    const packageJson = JSON.parse(Deno.readTextFileSync(packageJsonPath));

    if (packageJson.dependencies?.hono) {
      delete packageJson.dependencies.hono;
    }

    // Clean up empty dependencies object
    if (Object.keys(packageJson.dependencies || {}).length === 0) {
      delete packageJson.dependencies;
    }

    Deno.writeTextFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
    );
  },
});
