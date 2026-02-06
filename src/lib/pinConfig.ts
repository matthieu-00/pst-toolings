export interface AccessLevel {
  id: string;
  name: string;
  allowedPages: string[];
  allowExports: boolean;
  allowAllPages: boolean;
}

export interface PinConfig {
  hash: string;
  accessLevel: AccessLevel;
}

export const PIN_CONFIGS: PinConfig[] = [
  {
    hash: '663d51f1632c59fee6a85ffc67413cb8fcd7add52bc64d07119462a8f4368196',
    accessLevel: {
      id: 'level1',
      name: 'Standard Access',
      allowedPages: ['/', '/code-renderer', '/spreadsheet-diff', '/json-extractor', '/nrql-helper'],
      allowExports: false,
      allowAllPages: false,
    },
  },
  {
    hash: '9a58554f92f332bec01e6c2b0e310ceea95913162cce42126a7e9d04b708d352',
    accessLevel: {
      id: 'level2',
      name: 'Export Enabled',
      allowedPages: ['/', '/code-renderer', '/spreadsheet-diff', '/json-extractor', '/nrql-helper'],
      allowExports: true,
      allowAllPages: false,
    },
  },
  {
    hash: '7935f5acd2c05abeff313a1e8dad8e4d0863e7f6d570c491f398bb039212b4c9',
    accessLevel: {
      id: 'level3',
      name: 'Full Access',
      allowedPages: [],
      allowExports: true,
      allowAllPages: true,
    },
  },
];

/**
 * Hash a PIN using SHA-256 (for runtime comparison)
 * Uses Web Crypto API available in browsers
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
