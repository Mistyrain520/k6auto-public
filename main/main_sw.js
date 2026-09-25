// Environment entry: sw
import { storymapOaSync } from '../scenarios/sw_scenarios/storymap_oa_sync.js';

export const options = {
  setupTimeout: '30m',
  teardownTimeout: '30m',
  discardResponseBodies: false,
  scenarios: {
    storymap_oa_sync: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '300m',
      exec: 'scenarios_item',
      tags: { my_custom_tag: 'SW-OA同步空间' },
    },
  },
};

export function setup() {
  // Storymap scenario only needs the existing login state.
}

export function teardown(data) {
  // No cleanup needed for read-only storymap queries.
}

export function scenarios_item() {
  storymapOaSync();
}

export default scenarios_item;
