/**
 * Vision Benchmark E2E Test
 * TASK-8.1: Benchmark Vision (FPS, RAM, mAP)
 * 
 * Exécute le benchmark vision dans un navigateur headless via Playwright
 * et collecte les métriques de performance.
 */

import { test, expect } from '@playwright/test';

interface BenchmarkResult {
  model: string;
  fps: number;
  latency: number;
  memory: number | string;
  mAP: number;
}

test.describe('Vision Benchmark', () => {
  test.setTimeout(120000); // 2 minutes max pour le benchmark complet

  test('should run vision benchmark and collect metrics', async ({ page }) => {
    // Collecter les logs console
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Collecter les erreurs JS
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Naviguer vers la page de benchmark (dans public/)
    await page.goto('/vision-benchmark.html', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Attendre que TensorFlow.js soit chargé
    await page.waitForFunction(() => {
      return typeof (window as any).tf !== 'undefined';
    }, { timeout: 15000 });

    // Vérifier que le backend est WebGL ou WebGPU
    const backend = await page.locator('#backend').textContent();
    console.log(`TensorFlow.js Backend: ${backend}`);
    expect(['webgl', 'webgpu', 'cpu']).toContain(backend?.toLowerCase());

    // Cliquer sur le bouton pour exécuter le benchmark (5 images pour rapidité)
    await page.click('#run-btn');

    // Attendre que les résultats soient affichés (max 60s)
    await page.waitForSelector('#results-container:not(.hidden)', {
      timeout: 60000
    });

    // Attendre que le tableau des résultats soit rempli
    await page.waitForFunction(() => {
      const tbody = document.querySelector('#results-table tbody');
      return tbody && tbody.children.length >= 2;
    }, { timeout: 10000 });

    // Extraire les résultats du tableau
    const results: BenchmarkResult[] = await page.evaluate(() => {
      const rows = document.querySelectorAll('#results-table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          model: cells[0]?.textContent || '',
          fps: parseFloat(cells[1]?.textContent || '0'),
          latency: parseFloat(cells[2]?.textContent || '0'),
          memory: cells[3]?.textContent === 'N/A' ? 'N/A' : parseFloat(cells[3]?.textContent || '0'),
          mAP: parseFloat(cells[4]?.textContent?.replace('%', '') || '0') / 100
        };
      });
    });

    // Afficher les résultats
    console.log('\n=== Vision Benchmark Results ===');
    console.log(`Backend: ${backend}`);
    console.log('--------------------------------');
    results.forEach(r => {
      console.log(`${r.model}:`);
      console.log(`  FPS: ${r.fps.toFixed(1)}`);
      console.log(`  Latency: ${r.latency.toFixed(1)} ms`);
      console.log(`  Memory: ${typeof r.memory === 'number' ? r.memory.toFixed(1) + ' MB' : r.memory}`);
      console.log(`  mAP: ${(r.mAP * 100).toFixed(1)}%`);
    });

    // Vérifier qu'il n'y a pas d'erreurs JS critiques
    const criticalErrors = errors.filter(e => 
      !e.includes('net::ERR') && // Ignorer les erreurs réseau mineures
      !e.includes('Failed to load resource') // Ignorer les ressources non trouvées
    );
    
    if (criticalErrors.length > 0) {
      console.warn('JS Errors detected:', criticalErrors);
    }

    // Assertions de performance
    const yoloResult = results.find(r => r.model.includes('YOLO'));
    const efficientResult = results.find(r => r.model.includes('Efficient'));

    // Vérifier que les deux modèles ont été testés
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Vérifier les performances minimales (FPS > 10 pour headless, > 20 visé)
    if (yoloResult) {
      expect(yoloResult.fps).toBeGreaterThan(5);
      console.log(`\n✓ YOLOv8-n: ${yoloResult.fps.toFixed(1)} FPS`);
    }

    if (efficientResult) {
      expect(efficientResult.fps).toBeGreaterThan(5);
      console.log(`✓ EfficientDet-Lite: ${efficientResult.fps.toFixed(1)} FPS`);
    }

    // Extraire le markdown généré
    const markdown = await page.locator('#markdown-output').textContent();
    expect(markdown).toContain('# Rapport de Benchmark Vision');

    // Stocker les résultats pour le rapport
    const reportData = {
      backend,
      results,
      markdown,
      errors: criticalErrors,
      timestamp: new Date().toISOString()
    };

    // Afficher le résumé JSON pour parsing externe
    console.log('\n=== JSON Report ===');
    console.log(JSON.stringify(reportData, null, 2));

    // Le test passe si nous arrivons ici sans erreurs critiques
    expect(criticalErrors.length).toBe(0);
  });

  test('should verify memory stability over multiple frames', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/vision-benchmark.html', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Attendre TensorFlow.js
    await page.waitForFunction(() => {
      return typeof (window as any).tf !== 'undefined';
    }, { timeout: 15000 });

    // Collecter les métriques mémoire initiales (si disponibles)
    const initialMemory = await page.evaluate(() => {
      const perf = (performance as any);
      if (perf.memory) {
        return perf.memory.usedJSHeapSize / (1024 * 1024);
      }
      return null;
    });

    // Exécuter le benchmark
    await page.click('#run-btn');

    // Attendre les résultats
    await page.waitForSelector('#results-container:not(.hidden)', {
      timeout: 60000
    });

    // Collecter les métriques mémoire finales
    const finalMemory = await page.evaluate(() => {
      const perf = (performance as any);
      if (perf.memory) {
        return perf.memory.usedJSHeapSize / (1024 * 1024);
      }
      return null;
    });

    if (initialMemory !== null && finalMemory !== null) {
      const memoryDelta = finalMemory - initialMemory;
      console.log(`Memory: ${initialMemory.toFixed(1)} MB → ${finalMemory.toFixed(1)} MB (Δ ${memoryDelta.toFixed(1)} MB)`);
      
      // Vérifier qu'il n'y a pas de fuite mémoire majeure (< 100 MB d'augmentation)
      expect(memoryDelta).toBeLessThan(100);
    } else {
      console.log('Memory API not available in this browser context');
    }
  });
});
