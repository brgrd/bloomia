export function createRng(seed) {
  let state = seed >>> 0;
  return {
    nextU32() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state >>> 0;
    },
    nextFloat() {
      return this.nextU32() / 4294967296;
    },
    pick(list) {
      if (!list.length) return undefined;
      return list[Math.floor(this.nextFloat() * list.length)];
    },
  };
}
