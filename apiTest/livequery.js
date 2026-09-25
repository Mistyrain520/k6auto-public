import { WebSocket } from 'k6/experimental/websockets';
import { sleep, check } from 'k6';
import { generateUUID } from '../tool/allTool.js';
import { ApiOptions } from '../config/apiOptions.js';

// 从 ApiOptions.domainName 推导 ws:// 地址
function getWsUrl() {
    const domain = ApiOptions.domainName.replace(/^http/, 'ws');
    return `${domain}/api/team/parse`;
}

// 构建 connect 消息
function buildConnectMsg(sessionToken, installationId) {
    return JSON.stringify({
        op: 'connect',
        applicationId: ApiOptions.tenant,
        sessionToken: sessionToken,
        installationId: installationId,
    });
}

// 构建 subscribe 消息
function buildSubscribeMsg(requestId, className, where, sessionToken) {
    return JSON.stringify({
        op: 'subscribe',
        requestId: requestId,
        query: {
            className: className,
            where: where,
        },
        sessionToken: sessionToken,
    });
}

function buildUnsubscribeMsg(requestId, sessionToken) {
    return JSON.stringify({
        op: 'unsubscribe',
        requestId: requestId,
        sessionToken: sessionToken,
    });
}

// 从消息中提取 percentage
function parsePercentage(msg) {
    try {
        const parsed = JSON.parse(msg);
        return (parsed.object || parsed).percentage;
    } catch (e) {
        return null;
    }
}

// ============ 主入口 ============
// 连接 LiveQuery WebSocket，订阅指定 className 的 where 条件，
// 持续监听消息，percentage 达到 100 时自动关闭连接。
//
// params:
//   cookie        - (必填) 登录态 Cookie
//   sessionToken  - (必填) 登录态 sessionToken
//   className     - Parse 类名，默认 'ProcessBar'
//   where         - 查询条件，如 { key: 'xxx' }
//   requestId     - 订阅请求 ID，默认 1
//   installationId- 客户端标识，默认自动生成 UUID
//   wsUrl         - WebSocket 地址，默认从 ApiOptions 推导
//   onMessage     - 收到消息时的回调 (msg)
//   onComplete    - percentage 达到 100 时的回调
//
export function subscribeLiveQuery(params = {}) {
    const cookie = params.cookie;
    const sessionToken = params.sessionToken;
    if (!cookie || !sessionToken) {
        throw new Error('subscribeLiveQuery: cookie 和 sessionToken 为必填参数');
    }
    const installId = params.installationId || generateUUID();
    const wsUrl = params.wsUrl || getWsUrl();
    const requestId = params.requestId || 1;
    const className = params.className || 'ProcessBar';
    const where = params.where || {};
    const onMessage = params.onMessage || null;
    const onComplete = params.onComplete || null;

    console.log('installationId:', installId);

    const wsParams = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': cookie,
        },
    };

    const ws = new WebSocket(wsUrl, null, wsParams);

    ws.addEventListener('open', () => {
        if (!check(ws, {
            'ws链接状态': (r) => r.readyState == 1,
        })) {
            console.log('WS链接失败!!!', wsUrl);
            ws.close();
            return;
        }
        console.log('WS链接成功:', wsUrl);

        // 1. connect
        ws.send(buildConnectMsg(sessionToken, installId));
        sleep(0.1);

        // 2. subscribe
        ws.send(buildSubscribeMsg(requestId, className, where, sessionToken));
        console.log('已订阅:', className, JSON.stringify(where));

        ws.addEventListener('message', (event) => {
            let msg = '';
            if (typeof event.data === 'string') {
                msg = event.data;
            } else if (event.data instanceof ArrayBuffer) {
                const buffer = new Uint8Array(event.data);
                msg = String.fromCharCode.apply(null, buffer);
            }

            if (onMessage) {
                onMessage(msg);
            }

            const percentage = parsePercentage(msg);
            if (percentage !== null) {
                console.log('当前进度:', percentage + '%');
                if (percentage === 100) {
                    console.log('进度达100%，关闭连接');
                    if (onComplete) {
                        onComplete();
                    }
                    ws.send(buildUnsubscribeMsg(requestId, sessionToken));
                    sleep(0.1);
                    ws.close();
                }
            }
        });

        ws.addEventListener('close', () => {
            console.log('WS断开:', wsUrl);
        });
    });

    ws.addEventListener('error', (e) => {
        console.log('WS错误:', e);
    });

    return ws;
}
