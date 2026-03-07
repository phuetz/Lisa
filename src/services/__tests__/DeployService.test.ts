import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateDeployConfig,
  getDeployInstructions,
  getSupportedPlatforms,
  downloadConfig,
  downloadConfigFiles,
  sanitizeAppName,
  sanitizeEnvValue,
  type DeployConfig,
  type CloudPlatform,
  type GenerateResult,
} from '../DeployService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<DeployConfig> = {}): DeployConfig {
  return {
    appName: 'lisa-app',
    platform: 'fly',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sanitizeAppName
// ---------------------------------------------------------------------------

describe('sanitizeAppName', () => {
  it('should accept a valid alphanumeric name', () => {
    expect(sanitizeAppName('my-app')).toBe('my-app');
    expect(sanitizeAppName('app123')).toBe('app123');
    expect(sanitizeAppName('my_app')).toBe('my_app');
    expect(sanitizeAppName('MyApp')).toBe('MyApp');
  });

  it('should reject names starting with a hyphen', () => {
    expect(() => sanitizeAppName('-bad')).toThrow('Invalid app name');
  });

  it('should reject names starting with an underscore', () => {
    expect(() => sanitizeAppName('_bad')).toThrow('Invalid app name');
  });

  it('should reject names with spaces', () => {
    expect(() => sanitizeAppName('bad name')).toThrow('Invalid app name');
  });

  it('should reject names with special characters', () => {
    expect(() => sanitizeAppName('bad@name')).toThrow('Invalid app name');
    expect(() => sanitizeAppName('bad.name')).toThrow('Invalid app name');
    expect(() => sanitizeAppName('bad/name')).toThrow('Invalid app name');
  });

  it('should reject empty strings', () => {
    expect(() => sanitizeAppName('')).toThrow('Invalid app name');
  });
});

// ---------------------------------------------------------------------------
// sanitizeEnvValue
// ---------------------------------------------------------------------------

describe('sanitizeEnvValue', () => {
  it('should escape backslashes', () => {
    expect(sanitizeEnvValue('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape double quotes', () => {
    expect(sanitizeEnvValue('say "hello"')).toBe('say \\"hello\\"');
  });

  it('should escape dollar signs', () => {
    expect(sanitizeEnvValue('price is $10')).toBe('price is \\$10');
  });

  it('should escape backticks', () => {
    expect(sanitizeEnvValue('run `cmd`')).toBe('run \\`cmd\\`');
  });

  it('should escape exclamation marks', () => {
    expect(sanitizeEnvValue('hello!')).toBe('hello\\!');
  });

  it('should leave safe values unchanged', () => {
    expect(sanitizeEnvValue('simple-value_123')).toBe('simple-value_123');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Fly.io
// ---------------------------------------------------------------------------

describe('generateDeployConfig — fly', () => {
  it('should generate a valid fly.toml config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'fly' }));
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('fly.toml');
    expect(result.files[0].content).toContain('app = "lisa-app"');
    expect(result.files[0].content).toContain('primary_region = "iad"');
    expect(result.files[0].content).toContain('internal_port = 3000');
  });

  it('should use custom region and port', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'fly', region: 'cdg', port: 8080 })
    );
    expect(result.files[0].content).toContain('primary_region = "cdg"');
    expect(result.files[0].content).toContain('internal_port = 8080');
    expect(result.instructions).toContain('--region cdg');
  });

  it('should include custom env vars', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'fly', env: { API_KEY: 'secret123' } })
    );
    expect(result.files[0].content).toContain('API_KEY = "secret123"');
  });

  it('should include memory and cpus', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'fly', memory: '1024mb', cpus: 2 })
    );
    expect(result.files[0].content).toContain('memory = "1024mb"');
    expect(result.files[0].content).toContain('cpus = 2');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Railway
// ---------------------------------------------------------------------------

describe('generateDeployConfig — railway', () => {
  it('should generate a valid railway.json config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'railway' }));
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThanOrEqual(1);
    expect(result.files[0].path).toBe('railway.json');

    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.$schema).toBe('https://railway.app/railway.schema.json');
    expect(parsed.build.builder).toBe('DOCKERFILE');
    expect(parsed.deploy.restartPolicyType).toBe('ON_FAILURE');
  });

  it('should generate a .env.railway file when env vars are provided', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'railway', env: { DB_URL: 'postgres://localhost' } })
    );
    expect(result.files).toHaveLength(2);
    expect(result.files[1].path).toBe('.env.railway');
    expect(result.files[1].content).toContain('DB_URL=postgres://localhost');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Render
// ---------------------------------------------------------------------------

describe('generateDeployConfig — render', () => {
  it('should generate a valid render.yaml config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'render' }));
    expect(result.success).toBe(true);
    expect(result.files[0].path).toBe('render.yaml');
    expect(result.files[0].content).toContain('name: lisa-app');
    expect(result.files[0].content).toContain('env: docker');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Hetzner
// ---------------------------------------------------------------------------

describe('generateDeployConfig — hetzner', () => {
  it('should generate a valid cloud-init YAML', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'hetzner' }));
    expect(result.success).toBe(true);
    expect(result.files[0].path).toBe('hetzner-cloud-init.yml');
    expect(result.files[0].content).toContain('#cloud-config');
    expect(result.files[0].content).toContain('docker.io');
    expect(result.files[0].content).toContain('lisa-app');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Northflank
// ---------------------------------------------------------------------------

describe('generateDeployConfig — northflank', () => {
  it('should generate a valid northflank.json config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'northflank' }));
    expect(result.success).toBe(true);
    expect(result.files[0].path).toBe('northflank.json');

    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.name).toBe('lisa-app');
    expect(parsed.type).toBe('combined');
    expect(parsed.services[0].type).toBe('deployment');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — GCP
// ---------------------------------------------------------------------------

describe('generateDeployConfig — gcp', () => {
  it('should generate a valid app.yaml config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'gcp' }));
    expect(result.success).toBe(true);
    expect(result.files[0].path).toBe('app.yaml');
    expect(result.files[0].content).toContain('service: lisa-app');
    expect(result.files[0].content).toContain('runtime: custom');
  });

  it('should use custom region in instructions', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'gcp', region: 'europe-west1' })
    );
    expect(result.instructions).toContain('--region=europe-west1');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Vercel
// ---------------------------------------------------------------------------

describe('generateDeployConfig — vercel', () => {
  it('should generate a valid vercel.json config', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'vercel' }));
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('vercel.json');

    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.name).toBe('lisa-app');
    expect(parsed.version).toBe(2);
    expect(parsed.framework).toBe('vite');
    expect(parsed.outputDirectory).toBe('dist');
  });

  it('should include custom region', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'vercel', region: 'cdg1' })
    );
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.regions).toContain('cdg1');
  });

  it('should include env vars', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'vercel', env: { API_URL: 'https://api.example.com' } })
    );
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.env.API_URL).toBe('https://api.example.com');
    expect(parsed.env.NODE_ENV).toBe('production');
  });

  it('should include cache headers for assets', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'vercel' }));
    const parsed = JSON.parse(result.files[0].content);
    expect(parsed.headers).toHaveLength(1);
    expect(parsed.headers[0].source).toBe('/assets/(.*)');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — Netlify
// ---------------------------------------------------------------------------

describe('generateDeployConfig — netlify', () => {
  it('should generate netlify.toml and state.json', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'netlify' }));
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('netlify.toml');
    expect(result.files[1].path).toBe('.netlify/state.json');
  });

  it('should include build commands in netlify.toml', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'netlify' }));
    expect(result.files[0].content).toContain('command = "npm run build"');
    expect(result.files[0].content).toContain('publish = "dist"');
  });

  it('should include SPA redirect rule', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'netlify' }));
    expect(result.files[0].content).toContain('from = "/*"');
    expect(result.files[0].content).toContain('to = "/index.html"');
    expect(result.files[0].content).toContain('status = 200');
  });

  it('should include env vars in netlify.toml', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'netlify', env: { VITE_API: 'https://api.test' } })
    );
    expect(result.files[0].content).toContain('VITE_API = "https://api.test"');
  });

  it('should set the app name in state.json', () => {
    const result = generateDeployConfig(makeConfig({ platform: 'netlify' }));
    const state = JSON.parse(result.files[1].content);
    expect(state.name).toBe('lisa-app');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — unknown platform
// ---------------------------------------------------------------------------

describe('generateDeployConfig — unknown platform', () => {
  it('should return failure for an unsupported platform', () => {
    const result = generateDeployConfig(
      makeConfig({ platform: 'aws' as CloudPlatform })
    );
    expect(result.success).toBe(false);
    expect(result.files).toHaveLength(0);
    expect(result.instructions).toContain('Unknown platform');
  });
});

// ---------------------------------------------------------------------------
// generateDeployConfig — sanitization
// ---------------------------------------------------------------------------

describe('generateDeployConfig — sanitization', () => {
  it('should reject invalid app names', () => {
    expect(() =>
      generateDeployConfig(makeConfig({ appName: '../malicious' }))
    ).toThrow('Invalid app name');
  });

  it('should sanitize env values with dangerous characters', () => {
    const result = generateDeployConfig(
      makeConfig({
        platform: 'fly',
        env: { DANGER: 'val"ue$with`special!' },
      })
    );
    expect(result.files[0].content).toContain(
      'DANGER = "val\\"ue\\$with\\`special\\!"'
    );
  });
});

// ---------------------------------------------------------------------------
// getDeployInstructions
// ---------------------------------------------------------------------------

describe('getDeployInstructions', () => {
  const allPlatforms: CloudPlatform[] = [
    'fly', 'railway', 'render', 'hetzner', 'northflank', 'gcp', 'vercel', 'netlify',
  ];

  it.each(allPlatforms)('should return instructions for %s', (platform) => {
    const instructions = getDeployInstructions(platform);
    expect(instructions).toBeTruthy();
    expect(instructions.length).toBeGreaterThan(50);
  });

  it('should return a fallback for unknown platforms', () => {
    const instructions = getDeployInstructions('unknown' as CloudPlatform);
    expect(instructions).toContain('No instructions available');
  });
});

// ---------------------------------------------------------------------------
// getSupportedPlatforms
// ---------------------------------------------------------------------------

describe('getSupportedPlatforms', () => {
  it('should return all 8 platforms', () => {
    const platforms = getSupportedPlatforms();
    expect(platforms).toHaveLength(8);
    expect(platforms).toContain('fly');
    expect(platforms).toContain('railway');
    expect(platforms).toContain('render');
    expect(platforms).toContain('hetzner');
    expect(platforms).toContain('northflank');
    expect(platforms).toContain('gcp');
    expect(platforms).toContain('vercel');
    expect(platforms).toContain('netlify');
  });
});

// ---------------------------------------------------------------------------
// downloadConfig (browser download)
// ---------------------------------------------------------------------------

describe('downloadConfig', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let origCreateObjectURL: typeof URL.createObjectURL;
  let origRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(
      (node) => node
    );
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(
      (node) => node
    );

    // jsdom does not implement URL.createObjectURL/revokeObjectURL,
    // so we assign mock functions directly instead of using vi.spyOn.
    origCreateObjectURL = URL.createObjectURL;
    origRevokeObjectURL = URL.revokeObjectURL;
    createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-blob');
    revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('should do nothing when result is not successful', () => {
    downloadConfig({ success: false, files: [], instructions: '' });
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when there are no files', () => {
    downloadConfig({ success: true, files: [], instructions: '' });
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should download a single file directly', () => {
    const result: GenerateResult = {
      success: true,
      files: [{ path: 'fly.toml', content: 'app = "test"' }],
      instructions: '',
    };

    downloadConfig(result);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('should combine multiple files into a single download', () => {
    const result: GenerateResult = {
      success: true,
      files: [
        { path: 'netlify.toml', content: '[build]' },
        { path: '.netlify/state.json', content: '{}' },
      ],
      instructions: '',
    };

    downloadConfig(result);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// downloadConfigFiles (multi-file download)
// ---------------------------------------------------------------------------

describe('downloadConfigFiles', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let origCreateObjectURL: typeof URL.createObjectURL;
  let origRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    origCreateObjectURL = URL.createObjectURL;
    origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('should download each file individually', () => {
    const result: GenerateResult = {
      success: true,
      files: [
        { path: 'netlify.toml', content: '[build]' },
        { path: '.netlify/state.json', content: '{}' },
      ],
      instructions: '',
    };

    downloadConfigFiles(result);

    // Each file triggers its own download
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it('should do nothing for unsuccessful results', () => {
    downloadConfigFiles({ success: false, files: [], instructions: '' });
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
