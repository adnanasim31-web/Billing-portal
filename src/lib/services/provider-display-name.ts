/**
 * Shared by provider-portal-service.ts, provider-messaging-service.ts, and
 * the credential-expiration cron - kept in its own module (rather than
 * exported from provider-portal-service.ts) so none of those introduce a
 * circular import between each other.
 */
export function resolveProviderDisplayName(provider: {
  provider_type: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  credential_suffix: string | null;
}): string {
  if (provider.provider_type === "organization") {
    return provider.organization_name ?? "Provider";
  }
  const name = `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
  return provider.credential_suffix ? `${name}, ${provider.credential_suffix}` : name;
}
