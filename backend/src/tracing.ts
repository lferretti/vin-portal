let tracer: { init: (opts: Record<string, unknown>) => void } | undefined;

if (process.env.DD_TRACE_ENABLED === 'true') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    tracer = require('dd-trace').default ?? require('dd-trace');
    tracer!.init({
      service: 'vin-portal-api',
      env: process.env.DD_ENV ?? 'dev',
      version: process.env.DD_VERSION ?? 'unknown',
      logInjection: true,
      runtimeMetrics: true,
    });
  } catch {
    // dd-trace not installed — skip tracing
  }
}

export default tracer;
