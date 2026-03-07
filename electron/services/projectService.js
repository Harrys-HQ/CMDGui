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

async function getProjectDetails(projectPath) {
  const details = {
    type: 'folder',
    scripts: {},
    envVars: {},
    gitBranch: null,
    gitDirty: false,
  };

  try {
    const files = await fs.promises.readdir(projectPath);
    const filesLower = files.map((f) => f.toLowerCase());

    // 0. Parse .env if exists
    if (filesLower.includes('.env')) {
      try {
        const envContent = await fs.promises.readFile(path.join(projectPath, '.env'), 'utf8');
        envContent.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
              details.envVars[key.trim()] = valueParts.join('=').trim();
            }
          }
        });
      } catch (e) {
        console.error('Error parsing .env:', e);
      }
    }

    // 1. Determine Type & Scripts
    if (filesLower.includes('package.json')) {
      try {
        const pkgContent = await fs.promises.readFile(
          path.join(projectPath, 'package.json'),
          'utf8'
        );
        const pkg = JSON.parse(pkgContent);
        if (pkg.scripts) details.scripts = pkg.scripts;

        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['react']) details.type = 'react';
        else if (deps['vue']) details.type = 'vue';
        else if (deps['@angular/core']) details.type = 'angular';
        else if (deps['svelte']) details.type = 'svelte';
        else if (deps['next']) details.type = 'react';
        else if (deps['nuxt']) details.type = 'vue';
        else if (
          deps['@vitejs/plugin-react'] ||
          filesLower.includes('vite.config.ts') ||
          filesLower.includes('vite.config.js')
        )
          details.type = 'react';
        else details.type = 'node';
      } catch (e) {
        details.type = 'node';
      }
    } else if (filesLower.includes('deno.json') || filesLower.includes('deno.jsonc')) {
      details.type = 'deno';
    } else if (
      filesLower.includes('requirements.txt') ||
      filesLower.some((f) => f.endsWith('.py')) ||
      filesLower.includes('pyproject.toml')
    ) {
      details.type = 'python';
    } else if (filesLower.includes('cargo.toml')) {
      details.type = 'rust';
    } else if (filesLower.includes('go.mod')) {
      details.type = 'go';
    } else if (filesLower.includes('composer.json')) {
      try {
        const compContent = await fs.promises.readFile(
          path.join(projectPath, 'composer.json'),
          'utf8'
        );
        if (compContent.includes('laravel/framework')) details.type = 'laravel';
        else details.type = 'php';
      } catch (e) {
        details.type = 'php';
      }
    } else if (filesLower.includes('gemfile') || filesLower.some((f) => f.endsWith('.rb'))) {
      details.type = 'ruby';
    } else if (
      filesLower.includes('pom.xml') ||
      filesLower.includes('build.gradle') ||
      filesLower.some((f) => f.endsWith('.java'))
    ) {
      details.type = 'java';
    } else if (filesLower.includes('dockerfile') || filesLower.includes('docker-compose.yml')) {
      details.type = 'docker';
    } else if (files.some((f) => f.endsWith('.sln') || f.endsWith('.csproj'))) {
      details.type = 'dotnet';
    } else if (files.some((f) => f.endsWith('.cpp') || f.endsWith('.hpp') || f.endsWith('.cc'))) {
      details.type = 'cpp';
    } else if (filesLower.includes('.git')) {
      details.type = 'git';
    }

    // 2. Determine Git Status
    if (filesLower.includes('.git')) {
      try {
        const exec = require('util').promisify(require('child_process').exec);
        // Get branch
        const branchResult = await exec('git branch --show-current', { cwd: projectPath });
        if (branchResult.stdout) {
          details.gitBranch = branchResult.stdout.trim();
        }
        // Get dirty status
        const statusResult = await exec('git status --porcelain', { cwd: projectPath });
        if (statusResult.stdout && statusResult.stdout.trim().length > 0) {
          details.gitDirty = true;
        }
      } catch (e) {
        // Git might not be installed, or repo is empty
      }
    }
  } catch (err) {
    console.error('Error getting project details:', err);
  }

  return details;
}

module.exports = {
  getProjectInfo,
  getProjectDetails,
};
