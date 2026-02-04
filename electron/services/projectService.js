const fs = require('fs');
const path = require('path');

async function getProjectInfo(projectPath) {
  try {
    const files = await fs.promises.readdir(projectPath);
    const filesLower = files.map((f) => f.toLowerCase());

    if (filesLower.includes('package.json')) {
      try {
        const pkgContent = await fs.promises.readFile(
          path.join(projectPath, 'package.json'),
          'utf8'
        );
        const pkg = JSON.parse(pkgContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['react']) return 'react';
        if (deps['vue']) return 'vue';
        if (deps['@angular/core']) return 'angular';
        if (deps['svelte']) return 'svelte';
        if (deps['next']) return 'react';
        if (deps['nuxt']) return 'vue';
        if (
          deps['@vitejs/plugin-react'] ||
          filesLower.includes('vite.config.ts') ||
          filesLower.includes('vite.config.js')
        )
          return 'react';
        return 'node';
      } catch (e) {
        return 'node';
      }
    }

    if (filesLower.includes('deno.json') || filesLower.includes('deno.jsonc')) return 'deno';
    if (
      filesLower.includes('requirements.txt') ||
      filesLower.some((f) => f.endsWith('.py')) ||
      filesLower.includes('pyproject.toml')
    )
      return 'python';
    if (filesLower.includes('cargo.toml')) return 'rust';
    if (filesLower.includes('go.mod')) return 'go';
    if (filesLower.includes('composer.json')) {
      try {
        const compContent = await fs.promises.readFile(
          path.join(projectPath, 'composer.json'),
          'utf8'
        );
        if (compContent.includes('laravel/framework')) return 'laravel';
        return 'php';
      } catch (e) {
        return 'php';
      }
    }
    if (filesLower.includes('gemfile') || filesLower.some((f) => f.endsWith('.rb'))) return 'ruby';
    if (
      filesLower.includes('pom.xml') ||
      filesLower.includes('build.gradle') ||
      filesLower.some((f) => f.endsWith('.java'))
    )
      return 'java';
    if (filesLower.includes('dockerfile') || filesLower.includes('docker-compose.yml'))
      return 'docker';
    if (files.some((f) => f.endsWith('.sln') || f.endsWith('.csproj'))) return 'dotnet';
    if (files.some((f) => f.endsWith('.cpp') || f.endsWith('.hpp') || f.endsWith('.cc')))
      return 'cpp';
    if (filesLower.includes('.git')) return 'git';

    return 'folder';
  } catch (err) {
    return 'folder';
  }
}

module.exports = {
  getProjectInfo
};
