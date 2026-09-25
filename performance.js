import http from 'k6/http';
import { fail } from 'k6';
// import { sleep } from 'k6';
import sql from 'k6/x/sql';
import {setupdata} from './scenarios/setupdata.js'
import { teardowndata } from './scenarios/teardown.js';
import { createItem } from './scenarios/itemScenarios.js';
import { getitemGroup } from './tool/pgsql.js';
export function setup() {
  const db1 = sql.open('postgres', 'postgres://<YOUR-DB-USER>:<YOUR-DB-PASSWORD>@<YOUR-DB-HOST>:5432/<YOUR-DB-NAME>?sslmode=disable');
  const data = setupdata()
  data.myitemGroup = {'objectId':getitemGroup(db1, data.myworkspace.objectId)}
  return data
}
export function teardown(data) {
  // teardowndata(data)
}
export const options = {
  setupTimeout: '30m',
  /*
  执行性能测试，设置为true，丢弃所有响应报文，默认只校验状态码。这里非常不建议设置true。
  因为是所有经过k6 http的请求报文都会丢失，这会影响到setup的数据获取
  因为性能测试通常是单一接口分开进行的，否则单个接口性能容易收到其他接口影响
  如果一定要从其他接口获取数据来作为性能测试接口的数据，建议在setup中获取
  当然，如果要压场景化的性能则例外。请根据实际安排。
  */
  discardResponseBodies: false,
  scenarios: {
    //这个场景是5个VU每个50迭代，也就是5并发，每个并发下执行20次function中的行为
    contacts: {
        executor: 'per-vu-iterations',
        vus: 5,
        iterations: 20,
        maxDuration: '5m',
        exec: 'scenarios_item',
        tags: { my_custom_tag: '事项相关场景' },
        env: { MYVAR: 'contacts' },
      }
  },
};

export function scenarios_item(data) {
  data.isNotLog = false
  createItem(data)
}
