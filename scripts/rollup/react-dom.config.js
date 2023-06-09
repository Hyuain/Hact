import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPackageJSON('react-dom')
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
        name: 'ReactDOM',
        format: 'umd'
      },
      {
        file: `${packageDistPath}/client.js`,
        name: 'client',
        format: 'umd'
      }
    ],
    // react-dom consists of hostConfig and react-reconciler,
    // react-reconciler will use internals inshared which relies on react,
    // so 'react' package will not be packaged into react-dom.
    // but if so, both react-dom and react will have independent internals.
    // we need them share internals and do not package react into react-dom.
    external: [...Object.keys(peerDependencies)],
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
  },
  // ReactTestUtils
  {
    input: `${packagePath}/test-utils.ts`,
    output: [
      {
        file: `${packageDistPath}/test-utils.js`,
        name: 'testUtils',
        format: 'umd'
      }
    ],
    external: ['react-dom', 'react'],
    plugins: getBaseRollupPlugins()
  }
]
