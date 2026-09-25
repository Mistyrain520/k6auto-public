import http from 'k6/http';
import { sleep,check } from 'k6';
import { httpRequestToCurl} from '../tool/allTool.js';
import {ApiOptions} from '../config/apiOptions.js'
//options包含日志的分组信息等，用来打印报告日志用，统一设置，外部就不用自己重新设置了
// params包含请求的参数，如headers，cookies，timeout等
export function request(option, method, path, payload, params){
    let url = (option.domainName || ApiOptions.domainName) + path;
    let start = new Date().getTime();
	let res = http.request(method, url, payload, params);
	let stop = new Date().getTime();
	check(res, {
		[path]: (res) => res.status == 200 || res.status == 201,
	})
	// let mycheck = []
	// mycheck.push({
	// 		"name": "Step 1",
	// 		"status": "passed",
	// 	},
	// 	{
	// 		"name": "Step 1",
	// 		"status": "passed",
	// 	},
	// )
	if (!option.isNotLog){
		return {'res':res, 'report': {
			'group': option.group,
			'casename': option.casename || option.requestname,
			'resStatus': res.status,
			'start': start,
			'stop': stop,
			'description': "如下为curl实际请求:\n\n```bash\n" + httpRequestToCurl(method, url, params.headers, payload) + "\n```",
			'message': res.body || '无返回体,点击可查看更多信息',
			'trace': res.error
		}}
	}
		
	return {'res':res, 'report': null}
}
//		'description': httpRequestToCurl(method, url, params.headers, payload) + '----华丽的分割线----' + (res.body || '无返回体'),
