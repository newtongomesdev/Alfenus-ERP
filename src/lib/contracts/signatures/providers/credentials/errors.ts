export class ProviderConfigurationError extends Error { constructor(public readonly code: string) { super(code); this.name = "ProviderConfigurationError"; } }
