import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace'
import { resolvePackagePath } from '../rollup/utils'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    replace({
      // replace __DEV__ to true in development mode and false in production mode
      __DEV__: true,
      preventAssignment: true
    })
  ],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: resolvePackagePath('react')
      },
      {
        find: 'react-dom',
        replacement: resolvePackagePath('react-dom')
      },
      {
        find: 'react-noop-renderer',
        replacement: resolvePackagePath('react-noop-renderer')
      },
      {
        find: 'hostConfig',
        replacement: path.resolve(
          resolvePackagePath('react-noop-renderer'),
          'src/hostConfig.ts'
        )
      }
    ]
  }
})
