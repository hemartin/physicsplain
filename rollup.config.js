import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/physicsplain.js',
  plugins: [terser()],
  output: {
    file: 'target/physicsplain-min.js',
    format: 'esm'
  }
}
