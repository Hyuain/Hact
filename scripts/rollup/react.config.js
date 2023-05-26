import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'

const { name, module } = getPackageJSON('react')
const packagePath = resolvePackagePath(name)
const packageDistPath = resolvePackagePath(name, true)

export default [
  // React package
  {
    input: `${packagePath}/${module}`,
    output: {
      file: `${packageDistPath}/index.js`,
      name: 'react',
      format: 'umd'
    },
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: packagePath,
        outputFolder: packageDistPath,
        baseContents: ({ name, description, version }) => {
          return {
            name,
            description,
            version,
            main: 'index.js'
          }
        }
      })
    ]
  },
  {
    input: `${packagePath}/src/jsx.ts`,
    output: [
      // jsx-runtime package
      {
        file: `${packageDistPath}/jsx-runtime.js`,
        name: 'jsx-runtime',
        format: 'umd'
      },
      // jsx-dev-runtime package
      {
        file: `${packageDistPath}/jsx-dev-runtime.js`,
        name: 'jsx-dev-runtime',
        format: 'umd'
      }
    ],
    plugins: getBaseRollupPlugins()
  }
]
