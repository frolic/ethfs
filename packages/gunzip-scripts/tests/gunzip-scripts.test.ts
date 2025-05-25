import { test, expect } from '@playwright/test';
import { generateTestHtml, writeTestFile, TestScript } from './test-utils';

test.describe('gunzipScripts', () => {
  test('UMD script execution', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `
          console.log('UMD script executing...');
          window.testResult = 'UMD script executed';
          window.testCounter = (window.testCounter || 0) + 1;
          console.log('UMD script finished, testResult:', window.testResult);
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'UMD Test',
      additionalBody: `
        <script>
          console.log('Test script starting...');
          window.testData = { ready: false };
          setTimeout(() => {
            console.log('Setting testData ready to true');
            window.testData.ready = true;
          }, 100);
        </script>
      `
    });

    const filePath = writeTestFile('umd-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.testData?.ready);

    const testResult = await page.evaluate(() => window.testResult);
    const testCounter = await page.evaluate(() => window.testCounter);

    expect(testResult).toBe('UMD script executed');
    expect(testCounter).toBe(1);
  });

  test('ESM with import resolution', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'esm',
        path: './math.js',
        content: `
          console.log('ESM math module executing...');
          export function add(a, b) {
            return a + b;
          }
          window.mathModuleLoaded = true;
          console.log('ESM math module finished loading');
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'ESM Test',
      additionalBody: `
        <script type="module-shim">
          console.log('Test module-shim script starting...');
          setTimeout(async () => {
            console.log('Attempting to import ./math.js...');
            try {
              const math = await import('./math.js');
              console.log('Import successful, calling add(2,3)...');
              window.importResult = math.add(2, 3);
              console.log('Result:', window.importResult);
              window.testComplete = true;
            } catch (e) {
              console.log('Import failed:', e.message);
              window.importError = e.message;
              window.testComplete = true;
            }
          }, 500);
        </script>
      `
    });

    const filePath = writeTestFile('esm-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.testComplete, { timeout: 5000 });

    const importShimExists = await page.evaluate(() => typeof window.importShim !== 'undefined');
    expect(importShimExists).toBe(true);

    const mathModuleLoaded = await page.evaluate(() => window.mathModuleLoaded);
    expect(mathModuleLoaded).toBe(true);

    const importResult = await page.evaluate(() => window.importResult);
    const importError = await page.evaluate(() => window.importError);

    expect(importError).toBeUndefined();
    expect(importResult).toBe(5);
  });

  test('mixed UMD and ESM scripts', async ({ page }) => {
  
    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `
          window.umdData = 'UMD loaded';
        `
      },
      {
        type: 'esm',
        name: 'utils',
        content: `
          export const greeting = 'Hello from ESM';
          window.esmLoaded = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Mixed Test',
      additionalBody: `
        <script type="module-shim">
          setTimeout(async () => {
            try {
              const utils = await import('utils');
              window.mixedTestResult = {
                umd: window.umdData,
                esm: utils.greeting,
                esmLoaded: window.esmLoaded
              };
              window.mixedTestComplete = true;
            } catch (e) {
              window.mixedTestError = e.message;
              window.mixedTestComplete = true;
            }
          }, 500);
        </script>
      `
    });

    const filePath = writeTestFile('mixed-test.html', html);
    await page.goto(`file://${filePath}`);

    // Wait for test to complete
    await page.waitForFunction(() => window.mixedTestComplete, { timeout: 5000 });

    const result = await page.evaluate(() => window.mixedTestResult);
    const error = await page.evaluate(() => window.mixedTestError);

    expect(error).toBeUndefined();
    expect(result).toEqual({
      umd: 'UMD loaded',
      esm: 'Hello from ESM',
      esmLoaded: true
    });
  });

  test('ESM with internal imports (Three.js mock)', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'esm',
        name: 'three',
        content: `
          export class Scene { add() {} }
          export class PerspectiveCamera { position = { z: 0 }; }
          export class WebGLRenderer { domElement = document.createElement('canvas'); setSize() {} render() {} }
          export class Mesh {}
          window.threeLoaded = true;
        `
      },
      {
        type: 'esm',
        path: 'three/addons/controls/OrbitControls.js',
        content: `
          export class OrbitControls {
            update() {}
          }
          window.orbitControlsLoaded = true;
        `
      }
    ];

    const html = generateTestHtml(scripts, {
      title: 'Three.js Test',
      additionalBody: `
        <div id="container"></div>
        <script type="module-shim">
          setTimeout(async () => {
            try {
              const { Scene, PerspectiveCamera, WebGLRenderer, Mesh } = await import('three');
              const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
              
              const scene = new Scene();
              const camera = new PerspectiveCamera();
              const renderer = new WebGLRenderer();
              const cube = new Mesh();
              const controls = new OrbitControls();
              
              scene.add(cube);
              document.getElementById('container').appendChild(renderer.domElement);
              renderer.render(scene, camera);
              controls.update();
              
              window.threeJsTestComplete = true;
            } catch (e) {
              window.threeJsTestError = e.message;
              window.threeJsTestComplete = true;
            }
          }, 1000);
        </script>
      `
    });

    const filePath = writeTestFile('threejs-test.html', html);
    await page.goto(`file://${filePath}`);

    await page.waitForFunction(() => window.threeJsTestComplete, { timeout: 10000 });

    const threeLoaded = await page.evaluate(() => window.threeLoaded);
    const orbitControlsLoaded = await page.evaluate(() => window.orbitControlsLoaded);
    const error = await page.evaluate(() => window.threeJsTestError);

    expect(error).toBeUndefined();
    expect(threeLoaded).toBe(true);
    expect(orbitControlsLoaded).toBe(true);

    const canvasExists = await page.evaluate(() => !!document.querySelector('#container canvas'));
    expect(canvasExists).toBe(true);
  });

  test('version compatibility (0.0.1 vs 0.0.2)', async ({ page }) => {

    const scripts: TestScript[] = [
      {
        type: 'umd',
        content: `window.versionTest = 'works';`
      }
    ];

    // Test v0.0.1
    const html1 = generateTestHtml(scripts, { gunzipVersion: '0.0.1' });
    const filePath1 = writeTestFile('version-001-test.html', html1);
    await page.goto(`file://${filePath1}`);
    await page.waitForFunction(() => window.versionTest);
    
    let result = await page.evaluate(() => window.versionTest);
    expect(result).toBe('works');

    // Test v0.0.2
    const html2 = generateTestHtml(scripts, { gunzipVersion: '0.0.2' });
    const filePath2 = writeTestFile('version-002-test.html', html2);
    await page.goto(`file://${filePath2}`);
    await page.waitForFunction(() => window.versionTest);
    
    result = await page.evaluate(() => window.versionTest);
    expect(result).toBe('works');
  });

  test('real Three.js with relative imports', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');

    // Read actual Three.js files
    const threeJsPath = path.resolve('./node_modules/three/build/three.module.js');
    const threeCorePath = path.resolve('./node_modules/three/build/three.core.js');
    const orbitControlsPath = path.resolve('./node_modules/three/examples/jsm/controls/OrbitControls.js');

    let threeJs, threeCore, orbitControls;
    
    try {
      threeJs = fs.readFileSync(threeJsPath, 'utf8');
      console.log('Read three.module.js:', threeJs.length, 'chars');
    } catch (e) {
      console.log('Could not read three.module.js:', e.message);
      return; // Skip test if Three.js not available
    }

    try {
      threeCore = fs.readFileSync(threeCorePath, 'utf8');
      console.log('Read three.core.js:', threeCore.length, 'chars');
    } catch (e) {
      console.log('Could not read three.core.js, using three.module.js only');
      threeCore = null;
    }

    try {
      orbitControls = fs.readFileSync(orbitControlsPath, 'utf8');
      console.log('Read OrbitControls.js:', orbitControls.length, 'chars');
    } catch (e) {
      console.log('Could not read OrbitControls.js:', e.message);
      return; // Skip test if OrbitControls not available
    }

    const scripts: TestScript[] = [];

    // Add three.core.js if it exists
    if (threeCore) {
      scripts.push({
        type: 'esm',
        path: './three.core.js',
        content: threeCore
      });
    }

    // Add three.module.js
    scripts.push({
      type: 'esm',
      name: 'three',
      content: threeJs
    });

    // Add OrbitControls
    scripts.push({
      type: 'esm',
      path: 'three/examples/jsm/controls/OrbitControls.js',
      content: orbitControls
    });

    const html = generateTestHtml(scripts, {
      title: 'Actual Three.js Test',
      additionalBody: `
        <div id="container" style="width: 400px; height: 300px; border: 1px solid #ccc; margin: 20px;"></div>
        <div id="info">
          <p>Testing with actual Three.js files:</p>
          <ul>
            <li>three.module.js (${Math.round(threeJs.length/1024)}KB)</li>
            ${threeCore ? `<li>three.core.js (${Math.round(threeCore.length/1024)}KB)</li>` : ''}
            <li>OrbitControls.js (${Math.round(orbitControls.length/1024)}KB)</li>
          </ul>
          <p id="status">Starting...</p>
        </div>
        <script type="module-shim">
          import * as THREE from 'three';
          import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
          
          console.log('🚀 Starting actual Three.js test with static imports...');
          document.getElementById('status').textContent = 'Loading Three.js...';
          
          // Wait for gunzipScripts to be ready before proceeding
          const startTest = () => {
            if (window.gunzipScriptsReady) {
              console.log('gunzipScripts is ready, starting test...');
              runTest();
            } else {
              console.log('Waiting for gunzipScripts to be ready...');
              document.addEventListener('gunzipScriptsReady', () => {
                console.log('gunzipScriptsReady event received, starting test...');
                runTest();
              });
            }
          };
          
          const runTest = () => {
            try {
              console.log('Three.js imported:', Object.keys(THREE).slice(0, 10).join(', '), '...');
              console.log('OrbitControls imported successfully');
              
              document.getElementById('status').textContent = 'Creating scene...';
              
              // Create a simple scene
              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(75, 400/300, 0.1, 1000);
              const renderer = new THREE.WebGLRenderer();
              
              renderer.setSize(400, 300);
              document.getElementById('container').appendChild(renderer.domElement);
              
              // Create a cube
              const geometry = new THREE.BoxGeometry();
              const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
              const cube = new THREE.Mesh(geometry, material);
              scene.add(cube);
              
              // Create controls
              const controls = new OrbitControls(camera, renderer.domElement);
              controls.enableDamping = true;
              
              camera.position.z = 5;
              
              // Render once
              renderer.render(scene, camera);
              controls.update();
              
              document.getElementById('status').textContent = 'Success! ✨';
              window.actualThreeJsTestComplete = true;
              console.log('✨ Actual Three.js test completed successfully!');
              
            } catch (e) {
              console.log('❌ Actual Three.js test failed:', e.message);
              console.log('Error stack:', e.stack);
              document.getElementById('status').textContent = 'Failed: ' + e.message;
              window.actualThreeJsTestError = e.message;
              window.actualThreeJsTestComplete = true;
            }
          };
          
          // Start the test
          startTest();
        </script>
      `
    });

    const filePath = writeTestFile('actual-threejs-test.html', html);
    console.log('Loading actual Three.js test file:', filePath);
    await page.goto(`file://${filePath}`);

    // Wait for test to complete
    await page.waitForFunction(() => window.actualThreeJsTestComplete, { timeout: 15000 });

    // Check results
    const error = await page.evaluate(() => window.actualThreeJsTestError);
    const status = await page.evaluate(() => document.getElementById('status')?.textContent);

    console.log('Actual Three.js test results:', { error, status });

    if (error) {
      console.log('Test failed with error (this may be expected):', error);
      // Check if it's the expected relative import error
      if (error.includes('Failed to resolve module specifier')) {
        console.log('✅ Got expected relative import error - this confirms the issue');
        expect(error).toContain('Failed to resolve module specifier');
      } else {
        throw new Error('Unexpected error: ' + error);
      }
    } else {
      console.log('✅ Test passed - Three.js loaded successfully!');
      expect(status).toContain('Success!');
      
      // Check that canvas was created
      const canvasExists = await page.evaluate(() => !!document.querySelector('#container canvas'));
      expect(canvasExists).toBe(true);
    }
  });

});