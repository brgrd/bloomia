/**
 * @typedef {"up"|"down"|"left"|"right"} Direction
 */

/**
 * @typedef {object} RuleContext
 * @property {Direction} dir
 * @property {{x:number,y:number}} from
 * @property {{x:number,y:number}} to
 * @property {number} nowMs
 * @property {number} startedAtMs
 * @property {Array<{t:number,dir:Direction}>} accepted
 * @property {number} stage
 * @property {number} width
 * @property {number} height
 * @property {{statsNear:(x:number,y:number,radius:number)=>{count:number,paritySum:number,phaseCounts:number[],dominantPhase:number},parityAt:(x:number,y:number,radius:number,kNearest:number)=>{inRadius:number,nearestUsed:number,paritySumNearest:number}}} field
 * @property {number} moveIndex
 * @property {Array<{x:number,y:number}>} trail
 */

/**
 * @typedef {object} RuleResult
 * @property {true} ok
 */

/**
 * @typedef {object} RuleError
 * @property {false} ok
 * @property {string} id
 * @property {string} label
 */

/**
 * @typedef {object} Rule
 * @property {string} id
 * @property {string} label
 * @property {(ctx:RuleContext) => (RuleResult|RuleError)} check
 */

export function createRuleEngine(rules) {
  /** @type {Rule[]} */
  const active = [...rules];

  return {
    list() {
      return active.map((r) => ({ id: r.id, label: r.label }));
    },
    /**
     * @param {RuleContext} ctx
     * @returns {RuleResult|RuleError}
     */
    validate(ctx) {
      for (const rule of active) {
        const res = rule.check(ctx);
        if (!res.ok) return res;
      }
      return { ok: true };
    },
  };
}
