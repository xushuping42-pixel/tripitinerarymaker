// Keep the build command on a stable .js entry point while the processing
// implementation remains an ES module.
import("./generate-template-assets.mjs").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
