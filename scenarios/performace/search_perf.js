import { group } from 'k6';
import { itemApi } from '../../apiTest/item.js';
import { readEnvData } from '../../tool/allTool.js';

// ============ 性能压测：search 查询事项 ============
// 压测对象：POST /api/team/parse/api/search（复用 apiTest/item.js 的 itemApi.search）
// 每次迭代执行 2 个查询，用 k6 group 区分开每个请求的指标：
//   group1 按 key 查询：key = 'WS0806003-4'
//   group2 按标题模糊查询：'标题' ~ '机不可失的'（iql 由调用方直接传入）
// 参数：
//   vus=5，每个 VU 迭代 10 次（per-vu-iterations），共 50 次迭代、100 次请求
//   key 可用环境变量覆盖：-e SEARCH_KEY=xxx；标题可用 -e SEARCH_TITLE=xxx
// 登录态：setup 阶段从 config/envs/<当前环境>/data.json 读取 loginRes，所有 VU/迭代复用
// 真实返回：{ code: 0, payload: { count, items: [...] } }，parseResponse 已提取 payload.items
const SEARCH_KEY = __ENV.SEARCH_KEY || 'WS0806003-4';
const SEARCH_TITLE = __ENV.SEARCH_TITLE || '机不可失的';
const GROUP = '性能压测.事项搜索';

export const options = {
	setupTimeout: '10m',
	discardResponseBodies: false,
	scenarios: {
		search_items: {
			executor: 'per-vu-iterations',
			vus: 2,
			iterations: 2,
			maxDuration: '10m',
			exec: 'searchItem',
			tags: { scene: 'search压测' },
		},
	},
};

// setup 只执行一次：读取当前环境 data.json 的登录态
export function setup() {
	const data = readEnvData('data.json');
	if (!data || !data.loginRes) {
		throw new Error('data.json 缺少 loginRes，请先执行 config/refreshLogin.js 刷新当前环境登录态');
	}
	return data;
}

// 压测入口：每个迭代执行两个 search 查询，用 k6 group 区分指标
export function searchItem(data) {
	const loginRes = data && data.loginRes;
	group('按key查询', () => {
		const items = itemApi.search({
			isNotLog: true,
			loginRes,
			iql: `key = '${SEARCH_KEY}'`,
			group: GROUP,
			casename: `search查询key=${SEARCH_KEY}`,
		});
		console.log(`[按key查询] key=${SEARCH_KEY} 命中 ${(items && items.length) || 0} 条`);
	});
	group('按标题查询', () => {
		const items = itemApi.search({
			isNotLog: true,
			loginRes,
			iql: `'标题' ~ '${SEARCH_TITLE}'`,
			group: GROUP,
			casename: `search标题查询=${SEARCH_TITLE}`,
		});
		console.log(`[按标题查询] 标题~'${SEARCH_TITLE}' 命中 ${(items && items.length) || 0} 条`);
	});
}

export default searchItem;
