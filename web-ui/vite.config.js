import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { execSync } from 'child_process';

let commitHash = 'dev';
let commitMsg = 'Local Development';
let commitDate = new Date().toISOString();
let branchName = 'main';

try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  commitMsg = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
  commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch {
  // fallback if not a git repository
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT_INFO__: JSON.stringify({
      hash: commitHash,
      message: commitMsg,
      date: commitDate,
      branch: branchName,
      buildTime: new Date().toISOString(),
    }),
  },
  server: {
    port: 5175,
    strictPort: true
  }
})
