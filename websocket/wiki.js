//旧版ws，目前不用了，改用'k6/experimental/websockets'
//该文件不可用了，仅作参考对比
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const sessionDuration = randomIntBetween(10000, 60000); // user session between 10s and 1m
const chatRoomName = 'publicRoom'; // choose your chat room name

export const options = {
  vus: 2,
  iterations: 2,
};

// 将 Base64 字符串转换为字节数组
function base64ToByteArray(base64String) {
    const decoded = bytes.decode(base64String, 'base64');
    const byteArray = new Uint8Array(decoded);
    return byteArray;
  }
export default function () {
    const url = `ws://<YOUR-DOMAIN>/wikicolla/0/editor/<YOUR-TENANT>/<YOUR-PAGE-ID>`;
    const params = {
      headers: {
        'Cookie': 'sensorsdata2015jssdkcross=%7B%22%24device_id%22%3A%2218b477e9b07187c-00b838bf989de26-26031151-3688960-18b477e9b081693%22%7D; lang=zh-CN; USER_REALM_KEY=eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28iLCJyZWRpcmVjdFVyaSI6bnVsbH0=; PRE-GW-LOAD=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJ1U05DcmVhdGVkIjoiMSIsImRpc3BsYXlOYW1lIjoi6LaF566hIiwic0FNQWNjb3VudE5hbWUiOiJvc2MtYWRtaW4iLCJjb21wYW55Ijoib3NjIiwiY29tcGFueUlkZW50aXR5IjoiQ09NUEFOWV9PV05FUiIsInVzZXJQcmluY2lwYWxOYW1lIjoib3NjLWFkbWluQHFxLmNvbSIsImp0aSI6Ijg4OThkYTBmMTYwOTRlYjBiOWIwMWQzNmFhYzhkMDFjIiwiaWF0IjoxNzAzNjg1NDQ3LCJzdWIiOiIxIiwiZXhwIjoxNzA0MjU4MDAwfQ.QwqCqGW_CD5naHfhlI4VqLzJzFnx01N7T31snrp-eqM; PRE-GW-SESSION=8898da0f16094eb0b9b01d36aac8d01c; tenant=osc',
      },
    };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', function open() {
    //   socket.sendBinary(base64ToByteArray('AgAIbm8gdG9rZW4='));
    });

    socket.on('close', function () {
      console.log(`VU ${__VU}: disconnected`);
    });

    socket.on('binaryMessage', function(msg) {
      console.log(new Uint8Array(msg))
    });

    // socket.setTimeout(function () {
    //   console.log(`VU ${__VU}: ${sessionDuration}ms passed, leaving the chat`);
    //   socket.send(JSON.stringify({ event: 'LEAVE' }));
    // }, sessionDuration);

    // socket.setTimeout(function () {
    //   console.log(`Closing the socket forcefully 3s after graceful LEAVE`);
    //   socket.close();
    // }, sessionDuration + 3000);
  });

  check(res, { 'Connected successfully': (r) => r && r.status === 101 });
}
