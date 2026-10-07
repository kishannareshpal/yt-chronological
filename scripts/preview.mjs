import * as esbuild from 'esbuild';

const port = Number(process.env.PORT ?? 5174);

const context = await esbuild.context({
  entryPoints: ['dev/preview.ts'],
  outdir: 'dev/build',
  bundle: true,
  format: 'iife',
  logLevel: 'info',
});
await context.watch();
await context.serve({ servedir: 'dev', port });
console.log(`Preview at http://localhost:${port}`);
