/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

// Fix JSX namespace for React 19
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare global {
  interface Window {
    testWiggleP2P: () => Promise<any>;
    wiggleNode: any;
  }
}

export {}
