import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module } = getPackageJSON('react-dom')
const packagePath = resolvePackagePath(name)
const packageDistPath = resolvePackagePath(name, true)

export default [
  // ReactDOM package
  {
    input: `${packagePath}/${module}`,
    // before React 17, export react-dom
    // after React 17, export react/client
    output: [
      {
        file: `${packageDistPath}/index.js`,
        name: 'index',
        format: 'umd'
      },
      {
        file: `${packageDistPath}/client.js`,
        name: 'client',
        format: 'umd'
      }
    ],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          hostConfig: `${packagePath}/src/hostConfig.ts`
        }
      }),
      generatePackageJson({
        inputFolder: packagePath,
        outputFolder: packageDistPath,
        baseContents: ({ name, description, version }) => {
          return {
            name,
            description,
            version,
            peerDependencies: {
              react: version
            },
            main: 'index.js'
          }
        }
      })
    ]
  }
]
