import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const packageJsonPath = require.resolve("lucide-react/package.json")
const lucideDirectory = dirname(packageJsonPath)
const generatedFile = join(
  lucideDirectory,
  "dist/esm/shared/src/build/defaultAttributes.mjs",
)

try {
  await readFile(generatedFile)
} catch (error) {
  if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
    throw error
  }

  const sourceMapPath = `${generatedFile}.map`
  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"))
  const source = sourceMap.sourcesContent?.[0]

  if (typeof source !== "string") {
    throw new Error(`Could not recover Lucide module from ${sourceMapPath}`)
  }

  const moduleSource = source.replace("} as const;", "};")
  await writeFile(generatedFile, moduleSource)
  console.info("Restored missing lucide-react defaultAttributes.mjs")
}
