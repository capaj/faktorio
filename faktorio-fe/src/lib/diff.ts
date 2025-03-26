/**
 * Compares two objects and returns the differences, or null if they're the same
 * @param {Object} original - Original form data
 * @param {Object} current - Current form data
 * @returns {Object|null} Object containing only the changed fields, or null if no changes
 */
function getObjectDiff(
  original: { [x: string]: any },
  current: { [s: string]: unknown } | ArrayLike<unknown>
) {
  const changes: { [key: string]: { oldValue: any; newValue: any } } = {}

  for (const [key, value] of Object.entries(current)) {
    // Handle case where original doesn't have the key
    if (!(key in original)) {
      changes[key] = {
        oldValue: undefined,
        newValue: value
      }
      continue
    }

    const originalValue = original[key]
    const currentValue = value

    if (
      originalValue !== currentValue &&
      String(originalValue) !== String(currentValue) &&
      JSON.stringify(originalValue) !== JSON.stringify(currentValue)
    ) {
      changes[key] = {
        old: originalValue,
        new: currentValue
      }
    }
  }

  // Check for keys that exist in original but not in current
  for (const key of Object.keys(original)) {
    if (!(key in current)) {
      changes[key] = {
        old: original[key],
        new: undefined
      }
    }
  }

  // Return null if no changes were found
  return Object.keys(changes).length === 0 ? null : changes
}

function deepObjectDiff(original, current) {
  if (original === current) return null

  // Handle non-object types (including null)
  if (
    typeof original !== 'object' ||
    typeof current !== 'object' ||
    original === null ||
    current === null
  ) {
    return {
      oldValue: original,
      newValue: current
    }
  }

  // Handle arrays
  if (Array.isArray(original) && Array.isArray(current)) {
    if (original.length !== current.length) {
      return {
        oldValue: original,
        newValue: current
      }
    }

    const arrayDiffs = {}
    let hasChanges = false

    for (let i = 0; i < original.length; i++) {
      const diff = deepObjectDiff(original[i], current[i])
      if (diff !== null) {
        arrayDiffs[i] = diff
        hasChanges = true
      }
    }

    return hasChanges ? arrayDiffs : null
  }

  const changes = {}
  let hasChanges = false

  // Check for changes in current object
  for (const key of Object.keys(current)) {
    if (!(key in original)) {
      changes[key] = {
        oldValue: undefined,
        newValue: current[key]
      }
      hasChanges = true
      continue
    }

    const diff = deepObjectDiff(original[key], current[key])
    if (diff !== null) {
      changes[key] = diff
      hasChanges = true
    }
  }

  // Check for deleted keys
  for (const key of Object.keys(original)) {
    if (!(key in current)) {
      changes[key] = {
        oldValue: original[key],
        newValue: undefined
      }
      hasChanges = true
    }
  }

  return hasChanges ? changes : null
}

export { getObjectDiff, deepObjectDiff }
