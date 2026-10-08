/** Read server configuration without exposing its value in diagnostics. */
export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}
