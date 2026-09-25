import {writePage, writeWord, writePpt, writeExcel, writeMind, writeDiagram, multiwritePage} from './scenariosWiki/writeScen.js'
import {login} from './apiWiki/page.js'

export function setup() {
  return [{'Cookie': login({
    "username": "<YOUR-USERNAME>",
    "password": "<YOUR-PASSWORD>"
  })}, {'Cookie': login({
    "username": "<YOUR-USERNAME>",
    "password": "<YOUR-PASSWORD>"
  })},{'Cookie': login({
    "username": "<YOUR-USERNAME>",
    "password": "<YOUR-PASSWORD>"
  })},{'Cookie': login({
    "username": "<YOUR-USERNAME>",
    "password": "<YOUR-PASSWORD>"
  })},{'Cookie': login({
    "username": "<YOUR-USERNAME>",
    "password": "<YOUR-PASSWORD>"
  })},]
}
export function teardown() {
  // teardowndata(data)
}

export const options = {
  setupTimeout: '20m',
  discardResponseBodies: false,
  scenarios: {
    contacts: {
        executor: 'per-vu-iterations',
        vus: 5,
        iterations: 1,
        maxDuration: '10m',
        exec: 'scenarios_wikiPage',
        tags: { my_custom_tag: '编写wiki文档' },
        env: { MYVAR: 'test' },
      },}
}
export const options222 = {
  setupTimeout: '2m',
  discardResponseBodies: false,
  scenarios: {
    contacts: {
        executor: 'per-vu-iterations',
        vus: 2,
        iterations: 6,
        maxDuration: '10m',
        exec: 'scenarios_wikiPage',
        tags: { my_custom_tag: '编写wiki文档' },
        env: { MYVAR: 'contacts' },
      },
    contacts2: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10m',
      startTime: '1s',
      exec: 'scenarios_wikiWord',
      tags: { my_custom_tag: '编写word文档' },
      env: { MYVAR: 'contacts' },
    },
    contacts3: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10m',
      startTime: '1s',
      exec: 'scenarios_wikiPpt',
      tags: { my_custom_tag: '编写ppt文档' },
      env: { MYVAR: 'contacts' },
    },
    contacts4: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10m',
      startTime: '1s',
      exec: 'scenarios_wikiExcel',
      tags: { my_custom_tag: '编写excel文档' },
      env: { MYVAR: 'contacts' },
    },
    contacts5: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10m',
      startTime: '1s',
      exec: 'scenarios_wikiMind',
      tags: { my_custom_tag: '编写mind文档' },
      env: { MYVAR: 'contacts' },
    },
    contacts6: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10m',
      startTime: '1s',
      exec: 'scenarios_wikiDiagram',
      tags: { my_custom_tag: '编写流程图' },
      env: { MYVAR: 'contacts' },
    }
  },
};
export function scenarios_wikiPage(data) {
  writePage(data[`${__VU}`-1])
}
export function scenarios_wikiWord(data) {
  writeWord(data[`${__VU}`-1])
}
export function scenarios_wikiPpt(data) {
  // writePpt(data)
}
export function scenarios_wikiExcel(data) {
  // writeExcel(data)
}
export function scenarios_wikiMind(data) {
  // writeMind(data)
}
export function scenarios_wikiDiagram(data) {
  // writeDiagram(data)
}
// export function testhaha(data) {
//   const a = ['a', 'b']
//   console.log(`VU ${__VU}: disconnected`);
//   console.log(a[`${__VU}`-1])
// }
