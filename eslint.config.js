import neostandard from 'neostandard'

// Math.sin, Math.cos and Math.atan2 differ between engines in the last bit,
// so the library uses the deterministic versions in src/detmath.js
const useDetmath = (property) =>
  ({ object: 'Math', property, message: `Use detmath.${property} so results are the same in every engine.` })

export default [
  ...neostandard(),
  {
    files: ['src/**/*.js'],
    rules: {
      'no-restricted-properties': ['error', useDetmath('sin'), useDetmath('cos'), useDetmath('atan2')]
    }
  }
]
