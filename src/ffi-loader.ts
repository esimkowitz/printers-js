/**
 * Shared FFI library loading logic for Deno and Bun
 */

export interface LibraryInfo {
  name: string;
  path: string;
  exists: boolean;
}

/**
 * Get the appropriate library name and path for the current platform
 */
export function getLibraryInfo(
  baseDir: string,
  platform: string,
  arch: string,
  fileExists: (path: string) => boolean,
): LibraryInfo {
  const { suffixedName, standardName } = getLibraryNames(platform, arch);

  // Ensure baseDir doesn't end with a slash to avoid double slashes
  const cleanBaseDir = baseDir.endsWith('/') || baseDir.endsWith('\\') ? baseDir.slice(0, -1) : baseDir;
  
  const suffixedPath = `${cleanBaseDir}/target/release/${suffixedName}`;
  const standardPath = `${cleanBaseDir}/target/release/${standardName}`;

  // Try suffixed name first (for published releases), fall back to standard (for local dev)
  if (fileExists(suffixedPath)) {
    return { name: suffixedName, path: suffixedPath, exists: true };
  } else if (fileExists(standardPath)) {
    return { name: standardName, path: standardPath, exists: true };
  } else {
    // Return suffixed name as default even if file doesn't exist (for better error messages)
    return { name: suffixedName, path: suffixedPath, exists: false };
  }
}

/**
 * Get both suffixed and standard library names for platform/arch
 */
function getLibraryNames(
  platform: string,
  arch: string,
): { suffixedName: string; standardName: string } {
  const extension = getExtension(platform);

  const suffixedName = getSuffixedLibraryName(platform, arch, extension);
  const standardName = getStandardLibraryName(platform, extension);

  return { suffixedName, standardName };
}

/**
 * Get file extension for platform
 */
function getExtension(platform: string): string {
  switch (platform) {
    case "windows":
      return "dll";
    case "darwin":
      return "dylib";
    default:
      return "so";
  }
}

/**
 * Get library name with architecture suffix
 */
function getSuffixedLibraryName(
  platform: string,
  arch: string,
  extension: string,
): string {
  const archSuffix = arch === "x86_64" ? "x64" : "arm64";

  if (platform === "windows") {
    // Windows ARM64 not supported by Deno/Bun, only x64
    return `printers_js-x64.${extension}`;
  } else if (platform === "darwin") {
    return `libprinters_js-${archSuffix}.${extension}`;
  } else {
    // Linux
    return `libprinters_js-${archSuffix}.${extension}`;
  }
}

/**
 * Get standard library name (for local development)
 */
function getStandardLibraryName(platform: string, extension: string): string {
  if (platform === "windows") {
    return `printers_js.${extension}`;
  } else {
    return `libprinters_js.${extension}`;
  }
}
