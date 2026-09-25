import http from 'k6/http';
import { sleep, check } from 'k6';
import { request } from '../../k6http/k6http.js';
import {ApiOptions} from '../../config/apiOptions.js'
import {dealrespon, httpRequestToCurl, checkExpectation, consoleLog } from '../../tool/allTool.js';
import { expect } from "../../tool/chaijs.js";
import {WikiOptions} from '../config.js'
// import zaplogger from 'k6/x/zaplogger';
const path = 'http://<YOUR-DOMAIN>/api/wiki/spaces/<YOUR-SPACE-ID>/pages';
let request_params = {
	headers: {
        'Content-Type': 'application/json',
        'X-Wiki-Tenant-Id': WikiOptions.tenant,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // 'Cookie': 'lang=zh-CN; USER_REALM_KEY="eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28iLCJyZWRpcmVjdFVyaSI6bnVsbH0="; PRE-GW-LOAD=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJ1U05DcmVhdGVkIjoiMSIsImRpc3BsYXlOYW1lIjoi6LaF566hIiwic0FNQWNjb3VudE5hbWUiOiJvc2MtYWRtaW4iLCJjb21wYW55IjoienVodXRlc3RfNiIsImNvbXBhbnlJZGVudGl0eSI6IkNPTVBBTllfT1dORVIiLCJ1c2VyUHJpbmNpcGFsTmFtZSI6Im9zY0BhZG1pbi5jb20iLCJqdGkiOiJkNGI4NWQ1NTlmNDI0MzNiOTY1YWNmODM1NmY4NjEzMiIsImlhdCI6MTcwNDM3OTg1MSwic3ViIjoiMSIsImV4cCI6MTcwNDkyMDQwMH0.kkfcqQeVbm8_R6n3HG9nQVpJQkCJSloKVoPxC3Ee4RA; PRE-GW-SESSION=d4b85d559f42433b965acf8356f86132',
      },
	};



export function login(params={}){
    const path = WikiOptions.protocol + WikiOptions.domainName + '/api/gateway/login';
    const payload = JSON.stringify(params)
    const res = http.request('POST', path, payload, {
      headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
      })
    check(res, {
		[path]: (res) => res.status == 200 || res.status == 201,
	})
    console.log(httpRequestToCurl('POST', path, res.request.headers, payload))
    let result = res.headers['Set-Cookie']
    const result1 = result.match(/PRE-GW-SESSION=(.+?);/g);
    return result1[0]
}

/* 

*/
export function apicreateWikiPage(params={}){
	const path = WikiOptions.protocol + WikiOptions.domainName + '/api/wiki/spaces/' + WikiOptions.spaceId +'/pages';
	const payload = JSON.stringify({
        "title": params.title || '',
        "content": "{\"default\":{\"type\":\"doc\",\"content\":[]}}",
        "description": "",
        "locale": "en",
        "isPrivate": false,
        "isPublished": false,
        "spaceId": params.spaceId,
        "publishEndDate": "",
        "publishStartDate": "",
        "scriptCss": "",
        "scriptJs": "",
        "tags": []
    });
    request_params.headers.Cookie = params.Cookie
    const res = http.request('POST', path, payload, request_params)
    //自带简单断言，非chaijs式断言
    check(res, {
		['创建page----' + path]: (res) => res.status == 200 || res.status == 201,
	})
    //调试打印curl
    console.log(httpRequestToCurl('POST', path, request_params.headers, payload))
    try {
		return dealrespon(res.json(), params.params)
	  } catch (err) {
		return dealrespon(res.body, params.params)
	}
}

export function apicreateWordPage(params={}){
	const path = WikiOptions.protocol + WikiOptions.domainName + '/api/wiki/spaces/' + WikiOptions.spaceId +'/pages';
	const payload = JSON.stringify({
        "title": "自动化畅写",
        "content": "{}",
        "description": "",
        "locale": "en",
        "isPrivate": false,
        "isPublished": false,
        "spaceId": parseInt(params.spaceId, 10),
        "publishEndDate": "",
        "publishStartDate": "",
        "scriptCss": "",
        "scriptJs": "",
        "tags": [],
        "contentType": params.contentType
    });
    request_params.headers.Cookie = params.Cookie
    const res = http.request('POST', path, payload, request_params)
    //自带简单断言，非chaijs式断言
    check(res, {
		[path]: (res) => res.status == 200 || res.status == 201,
	})
    //调试打印curl
    console.log(httpRequestToCurl('POST', path, request_params.headers, payload))
    try {
		return dealrespon(res.json(), params.params)
	  } catch (err) {
		return dealrespon(res.body, params.params)
	}
}
export function apicreateDiagram(params={}){
    const path = WikiOptions.protocol + WikiOptions.domainName + '/api/wiki/collaborations/diagram'
    const payload = JSON.stringify(
      {
        "content": "<mxfile host=\"<YOUR-DOMAIN>\" modified=\"2024-01-04T16:29:50.818Z\" agent=\"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\" etag=\"dpLQzD4qjR8nrb8HzcVL\" version=\"@DRAWIO-VERSION@\">\n  <diagram name=\"第 1 页\" id=\"bo8nPyVZPQyfpWg2iq58\">\n    dZDNDsIgEISfhnsLiT/nWvXiqQfPpKyFhLKEYtr49NJQrKR62GT321mYDGFVP10ct/KGAjShReeUIOxEKC1DBWB5BxmYFY16JVgs9KkEDJnQI2qvbA5bNAZanzHuHI657IF6a6NpuYYNvSvhZaQHul/5FVQn00fl7hg3PU/ixfggucDxC7GasMoh+tj1UwV6TiblEu/Of7YfYw6M/3EQmvXtMGTxs/oN\n  </diagram>\n</mxfile>\n",
        "spaceKey": "crt",
        "pageId": params.pageId
    }
    )
    request_params.headers.Cookie = params.Cookie
    const res = http.request('POST', path, payload, request_params)
    //自带简单断言，非chaijs式断言
    check(res, {
      [path]: (res) => res.status == 200 || res.status == 201,
    })
      //调试打印curl
      console.log(httpRequestToCurl('POST', path, request_params.headers, payload))
      try {
      return dealrespon(res.json(), params.params)
      } catch (err) {
      return dealrespon(res.body, params.params)
    }
}
