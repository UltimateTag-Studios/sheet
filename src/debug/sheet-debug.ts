export function sheetDebugLog(
  enabled: boolean,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!enabled) {
    return;
  }
  if (data === undefined) {
    console.info(`[sheet] ${message}`);
    return;
  }
  console.info(`[sheet] ${message}`, data);
}
