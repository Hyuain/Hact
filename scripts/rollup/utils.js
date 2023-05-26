import p from 'path'
import fs from 'fs'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'

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

export function getBaseRollupPlugins({ typescript = {} } = {}) {
  return [cjs(), ts(typescript)]
}
