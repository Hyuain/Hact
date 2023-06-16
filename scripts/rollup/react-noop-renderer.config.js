import {
  getBaseRollupPlugins,
  getPackageJSON,
  resolvePackagePath
} from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPackageJSON('react-noop-renderer')
const packagePath = resolvePackagePath(name)
const packageDistPath = resolvePackagePath(name, true)

export default [
  // ReactNoopRenderer package
  {
    input: `${packagePath}/${module}`,
    output: [
      {
        file: `${packageDistPath}/index.js`,
        name: 'ReactNoopRenderer',
        format: 'umd'
      }
    ],
    external: [...Object.keys(peerDependencies), 'scheduler'],
    plugins: [
      ...getBaseRollupPlugins({
        typescript: {
          exclude: ['./packages/react-dom/**/*'],
          tsconfigOverride: {
            compilerOptions: {
              paths: {
                hostConfig: [`./${name}/src/hostConfig.ts`]
              }
            }
          }
        }
      }),
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
