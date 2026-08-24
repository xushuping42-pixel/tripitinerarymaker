import { access, copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const styles = ["architectural", "cute-playful", "floral", "animal", "minimalist", "sunny", "vintage"];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);
const directories = {
  raw: path.join(root, "public", "raw"),
  thumbnails: path.join(root, "public", "thumbnails"),
  previews: path.join(root, "public", "previews"),
  print: path.join(root, "public", "print"),
  data: path.join(root, "data"),
  manifest: path.join(root, "scripts", ".template-assets-manifest.json"),
};

const number = (index) => String(index).padStart(2, "0");
const outputName = (style, index, suffix, extension) => `trip-itinerary-template-${style}-${number(index)}-${suffix}.${extension}`;
const pathsFor = (style, index) => ({
  thumbnail: path.join(directories.thumbnails, style, outputName(style, index, "thumb", "webp")),
  preview: path.join(directories.previews, style, outputName(style, index, "preview", "webp")),
  print: path.join(directories.print, style, outputName(style, index, "print", "png")),
});

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function listImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "zh-Hans-CN", { numeric: true }));
}

async function createWebp(input, maxEdge, initialQuality, maxBytes) {
  for (let quality = initialQuality; quality >= 10; quality -= 5) {
    const buffer = await sharp(input)
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (buffer.length <= maxBytes || quality === 10) return { buffer, quality };
  }
  throw new Error(`Could not encode ${input}`);
}

async function fingerprint(file) {
  const info = await stat(file);
  return `${info.size}:${info.mtimeMs}`;
}

async function readManifest() {
  try { return JSON.parse(await readFile(directories.manifest, "utf8")); } catch { return { version: 1, styles: {} }; }
}

function nextIndex(entries) {
  const used = new Set(Object.values(entries).map((entry) => entry.index));
  let index = 1;
  while (used.has(index)) index += 1;
  return index;
}

async function removeOutputs(style, index) {
  await Promise.all(Object.values(pathsFor(style, index)).map((file) => rm(file, { force: true })));
}

async function cleanOrphans(directory, style, suffix, expected) {
  const styleDirectory = path.join(directory, style);
  if (await exists(styleDirectory)) {
    const files = await readdir(styleDirectory);
    await Promise.all(files.filter((file) => file.endsWith(suffix) && !expected.has(file)).map((file) => rm(path.join(styleDirectory, file), { force: true })));
  }
  const legacyPattern = new RegExp(`^trip-itinerary-template-${style}-\\d+-(thumb|preview|print)\\.(webp|png)$`);
  if (await exists(directory)) {
    const files = await readdir(directory);
    await Promise.all(files.filter((file) => legacyPattern.test(file)).map((file) => rm(path.join(directory, file), { force: true })));
  }
}

async function writeTemplatesData() {
  const data = {};
  for (const style of styles) {
    const directory = path.join(directories.thumbnails, style);
    data[style] = await exists(directory)
      ? (await readdir(directory)).filter((file) => file.endsWith("-thumb.webp")).sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
      : [];
  }
  await writeFile(path.join(directories.data, "templates.js"), `export const templates = ${JSON.stringify(data, null, 2)};\n`);
}

await Promise.all([directories.thumbnails, directories.previews, directories.print, directories.data].map((directory) => mkdir(directory, { recursive: true })));

const missingFolders = [];
for (const style of styles) if (!await exists(path.join(directories.raw, style))) missingFolders.push(style);
if (missingFolders.length) throw new Error(`Missing raw image folders: ${missingFolders.map((style) => `public/raw/${style}`).join(", ")}`);

const manifest = await readManifest();
for (const style of styles) {
  await Promise.all([directories.thumbnails, directories.previews, directories.print].map((directory) => mkdir(path.join(directory, style), { recursive: true })));
  const rawDirectory = path.join(directories.raw, style);
  const files = await listImages(rawDirectory);
  const previous = manifest.styles[style] ?? {};
  const currentNames = new Set(files);

  for (const [source, entry] of Object.entries(previous)) {
    if (!currentNames.has(source)) {
      await removeOutputs(style, entry.index);
      delete previous[source];
    }
  }

  console.log(`${style}: ${files.length} raw images`);
  for (const source of files) {
    const input = path.join(rawDirectory, source);
    const currentFingerprint = await fingerprint(input);
    const entry = previous[source] ?? { index: nextIndex(previous), fingerprint: "" };
    const outputs = pathsFor(style, entry.index);
    const outputsExist = await Promise.all(Object.values(outputs).map(exists));

    // If a prior run recorded the source, regenerate only when that source changed.
    // If the manifest was removed but all three outputs exist, preserve them and
    // rebuild the manifest instead of needlessly processing the image again.
    const sourceIsUnchanged = !previous[source]?.fingerprint || entry.fingerprint === currentFingerprint;
    if (sourceIsUnchanged && outputsExist.every(Boolean)) {
      console.log(`  skip ${source}`);
      previous[source] = { ...entry, fingerprint: currentFingerprint };
      continue;
    }

    const thumbnail = await createWebp(input, 300, 70, 20 * 1024);
    const preview = await createWebp(input, 1200, 80, 80 * 1024);
    await Promise.all([writeFile(outputs.thumbnail, thumbnail.buffer), writeFile(outputs.preview, preview.buffer), copyFile(input, outputs.print)]);
    previous[source] = { index: entry.index, fingerprint: currentFingerprint };
    console.log(`  processed ${source} -> thumbnail q${thumbnail.quality}, preview q${preview.quality}`);
  }

  manifest.styles[style] = previous;
  await cleanOrphans(directories.thumbnails, style, "-thumb.webp", new Set(Object.values(previous).map((entry) => outputName(style, entry.index, "thumb", "webp"))));
  await cleanOrphans(directories.previews, style, "-preview.webp", new Set(Object.values(previous).map((entry) => outputName(style, entry.index, "preview", "webp"))));
  await cleanOrphans(directories.print, style, "-print.png", new Set(Object.values(previous).map((entry) => outputName(style, entry.index, "print", "png"))));
}

await writeFile(directories.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
await writeTemplatesData();
console.log("Updated data/templates.js from public/thumbnails.");
