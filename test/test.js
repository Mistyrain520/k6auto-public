import http from 'k6/http';
import { sleep,check } from 'k6';
import sql from 'k6/x/sql';
import zaplogger from 'k6/x/zaplogger';
import Assertions from '../tool/assertion.js'
console.log("####@@@@")
export const options = {
    setupTimeout: '30m',
    discardResponseBodies: false,
    scenarios: {
      contacts: {
          executor: 'per-vu-iterations',
          vus: 1,
          iterations: 1,
          maxDuration: '1m',
          exec: 'test2',
          tags: { my_custom_tag: 'mytag' },
          env: { MYVAR: 'contacts' },
        }
    },
  };
export function test2(){
  Assertions.isSubsetOf(["NBCkE6DSPK","ofJ6c2ikF6"],["ofJ6c2ikF6","NBCkE6DSPK"])
  Assertions.isNotSubsetOf(["NBCkE6DSPK","ofJ6c2ikF6"],["ofJ6c2ikF6","NBCkE6DSPK"])
}
function mycheck(val, sets, tags){
  check(val, sets, tags)
  return

}
