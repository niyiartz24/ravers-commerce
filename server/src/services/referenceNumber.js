const crypto = require('crypto');

/**
 * Builds a human-readable code like RAV-20260827-K3F9A.
 * Not guaranteed unique on its own — callers should check the DB and
 * retry on the rare collision (see generateUniqueCode below).
 */
function buildCode(prefix) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `${prefix}-${datePart}-${randomPart}`;
}

/**
 * Generates a code and retries on collision using the provided uniqueness
 * check (e.g. a DB lookup). Throws after a small number of attempts —
 * collisions at this entropy level should be effectively impossible.
 */
async function generateUniqueCode(prefix, existsCheck, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const code = buildCode(prefix);
    // eslint-disable-next-line no-await-in-loop
    const taken = await existsCheck(code);
    if (!taken) return code;
  }
  throw new Error(`Could not generate a unique ${prefix} code after ${attempts} attempts.`);
}

module.exports = { generateUniqueCode };
