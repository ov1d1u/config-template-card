import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";

export default {
  input: ["src/nunjucks-template-card.ts"],
  output: {
    dir: "./dist",
    format: "es"
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    typescript(),
    json(),
  ], treeshake: false,
};
