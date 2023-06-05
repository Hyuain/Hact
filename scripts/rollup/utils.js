import p from 'path'
import fs from 'fs'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const packagePath = p.resolve(__dirname, '../../packages')
const distPath = p.resolve(__dirname, '../../dist/node_modules')

export function resolvePackagePath(packageName, isDist) {
  if (isDist) {
    return `${distPath}/${packageName}`
  }
  return `${packagePath}/${packageName}`
}

export function getPackageJSON(packageName) {
  const path = `${resolvePackagePath(packageName)}/package.json`
  const str = fs.readFileSync(path, 'utf-8')
  return JSON.parse(str)
}

export function getBaseRollupPlugins({
  typescript = {},
  alias = {
    // replace __DEV__ to true in development mode and false in production mode
    __DEV__: true,
    preventAssignment: true
  }
} = {}) {
  return [replace(alias), cjs(), ts(typescript)]
}
