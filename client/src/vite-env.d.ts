/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROVIDER_RPC_URL: string
  readonly VITE_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}