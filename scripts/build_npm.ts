// REF: https://deno.com/blog/publish-esm-cjs-module-dnt
import { build, emptyDir } from "jsr:@deno/dnt@^0.41.3";
import { parseArgs } from "jsr:@std/cli/parse-args";

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
    "./mod.ts",
    {
      name: "./types",
      path: "types.ts",
    },
    {
      name: "./hono",
      path: "hono.ts",
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
  package: {
    name: infoDeno.name,
    version,
    description: infoDeno.description,
    license: infoDeno.license,
    devDependencies: {
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
  },
});
