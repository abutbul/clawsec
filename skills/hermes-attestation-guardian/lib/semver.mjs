/**
 * @param {string} version
 * @returns {[number, number, number] | null}
 */
export function parseSemver(version) {
  const cleaned = String(version || "")
    .trim()
    .replace(/^v/i, "")
    .split("+")[0]
    .split("-")[0];

  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) return null;

  const normalized = [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2] || "0", 10),
    Number.parseInt(match[3] || "0", 10),
  ];

  if (normalized.some((part) => Number.isNaN(part))) return null;
  return /** @type {[number, number, number]} */ (normalized);
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number | null}
 */
export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;

  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string | null} version
 * @param {string} rawSpec
 * @returns {boolean}
 */
export function versionMatches(version, rawSpec) {
  const spec = String(rawSpec || "").trim();
  if (!spec || spec === "*" || spec.toLowerCase() === "any") return true;
  if (!version || String(version).trim().toLowerCase() === "unknown") return false;

  const normalizedVersion = String(version).trim().replace(/^v/i, "");

  if (spec.includes("*")) {
    const wildcardRegex = new RegExp(`^${escapeRegex(spec).replace(/\\\*/g, ".*")}$`);
    return wildcardRegex.test(normalizedVersion);
  }

  const comparatorMatch = spec.match(/^(>=|<=|>|<|=)\s*([vV]?\d+(?:\.\d+){0,2})$/);
  if (comparatorMatch) {
    const operator = comparatorMatch[1];
    const targetVersion = comparatorMatch[2].trim();
    const compared = compareSemver(normalizedVersion, targetVersion);
    if (compared === null) return false;
    if (operator === ">=") return compared >= 0;
    if (operator === "<=") return compared <= 0;
    if (operator === ">") return compared > 0;
    if (operator === "<") return compared < 0;
    return compared === 0;
  }

  if (spec.startsWith("^")) {
    const target = parseSemver(spec.slice(1));
    const current = parseSemver(normalizedVersion);
    if (!target || !current) return false;

    const lowerBound = `${target[0]}.${target[1]}.${target[2]}`;
    let upperBound;
    if (target[0] > 0) {
      upperBound = `${target[0] + 1}.0.0`;
    } else if (target[1] > 0) {
      upperBound = `0.${target[1] + 1}.0`;
    } else {
      upperBound = `0.0.${target[2] + 1}`;
    }

    const lowerCompared = compareSemver(normalizedVersion, lowerBound);
    const upperCompared = compareSemver(normalizedVersion, upperBound);
    return lowerCompared !== null && upperCompared !== null && lowerCompared >= 0 && upperCompared === -1;
  }

  if (spec.startsWith("~")) {
    const target = parseSemver(spec.slice(1));
    const current = parseSemver(normalizedVersion);
    if (!target || !current) return false;
    return (
      current[0] === target[0] &&
      current[1] === target[1] &&
      compareSemver(normalizedVersion, spec.slice(1)) !== -1
    );
  }

  return normalizedVersion === spec || normalizedVersion === spec.replace(/^v/i, "");
}
