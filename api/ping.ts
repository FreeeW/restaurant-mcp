export default async function handler(_req: any, res: any) {
  // Expose last gateway debug snapshot if available (helps when logs aren't visible)
  let gatewayDebug: any = null;
  // We don't import gateway directly due to module resolution; gateway exposes no exported state.
  // This endpoint stays as a pure health check with timestamp.
  return res.status(200).json({ ok: true, ts: Date.now(), gatewayDebug });
}


