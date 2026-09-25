import encoding from 'k6/encoding';
import { request } from '../k6http/k6http.js';
import { ApiOptions } from '../config/apiOptions.js';
import { consoleLog } from '../tool/allTool.js';
import Assertions from '../tool/assertion.js';

const request_params = {
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
};

function buildUserInfo(payload = {}) {
    return JSON.stringify({
        admin: payload.admin,
        companies: payload.companies,
        company: payload.company,
        companyIdentity: payload.companyIdentity,
        companyPath: payload.companyPath,
        displayName: payload.displayName,
        email: payload.email,
        id: payload.id,
        sAMAccountName: payload.sAMAccountName,
        status: payload.status,
        uSNCreated: payload.uSNCreated,
        userPrincipalName: payload.userPrincipalName,
        username: payload.username,
    });
}

function getLoginCookie(res) {
    const result = res.headers['Set-Cookie'];
    if (!result) {
        return '';
    }
    const result1 = result.match(/PRE-GW-SESSION=(.+?);/g);
    return result1 ? result1[0] : '';
}

function getParseSessionToken(loginResult = {}) {
    const body = loginResult.body || loginResult;
    const userInfo = buildUserInfo((body && body.payload) || {});
    return encoding.b64encode(userInfo);
}

export function login(params = {}) {
    const path = '/api/gateway/login';
    const option = JSON.parse(JSON.stringify(ApiOptions));
    const payload = JSON.stringify({password: params.password, username: params.username});
    option.domainName = params.domainName;
    option.group = params.group;
    option.casename = params.casename;
    option.isNotLog = params.isNotLog;
    // console.log(httpRequestToCurl('POST', path, request_params.headers,payload))
    const res = request(option, 'POST', path, payload, request_params);
    const body = res.res.json();
    const Cookie = getLoginCookie(res.res);
    const sessionToken = getParseSessionToken({ body });

    if (!option.isNotLog){
        res.report.steps = [
            Assertions.pass(res.res.body),
            Assertions.assertion200(res.res),
            Assertions.hasProperty(body, 'payload'),
            Assertions.isString(Cookie, "Cookie"),
            Assertions.isString(sessionToken, "sessionToken")
        ];
        consoleLog(res.report);
    }

    return {
        Cookie,
        sessionToken,
        body,
    };
}
