export type LifecycleSteps = { create: () => Promise<void>; prepare: () => Promise<void>; test: () => Promise<number>; finish: () => Promise<void>; cleanup: () => Promise<void>; keep: boolean };
export async function runTestLifecycle(steps: LifecycleSteps) {
  let created = false, exitCode = 0;
  let failure: unknown, cleanupFailure: unknown;
  try { await steps.create(); created = true; await steps.prepare(); exitCode = await steps.test(); }
  catch (error) { failure = error; exitCode = 1; }
  finally {
    let closed = true;
    try { await steps.finish(); } catch (error) { closed = false; cleanupFailure = error; if (!exitCode) exitCode = 1; }
    if (created && !steps.keep && closed) {
      try { await steps.cleanup(); } catch (error) { cleanupFailure = error; if (!exitCode) exitCode = 1; }
    }
  }
  return { exitCode, failure, cleanupFailure, created };
}
