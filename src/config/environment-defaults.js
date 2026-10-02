/**
 * Prompt defaults for a new environment, copied from one the project
 * already has so only the values that differ need typing.
 */
class EnvironmentDefaults {
  /**
   * @param {Object} environments - The project's existing environments, by name
   * @param {Function} chooseSource - async (names) => name; asked only when
   *   there is more than one environment to copy from
   */
  constructor (environments = {}, chooseSource) {
    this.environments = environments
    this.chooseSource = chooseSource
  }

  /**
   * @param {Object} overrides - Values that win over copied ones (CLI flags)
   * @returns {Promise<Object>}
   */
  async resolve (overrides = {}) {
    const source = await this.sourceEnvironment()
    return { ...source, ...overrides }
  }

  async sourceEnvironment () {
    const names = Object.keys(this.environments)
    if (names.length === 0) return {}
    if (names.length === 1) return this.environments[names[0]]
    return this.environments[await this.chooseSource(names)]
  }
}

module.exports = { EnvironmentDefaults }
