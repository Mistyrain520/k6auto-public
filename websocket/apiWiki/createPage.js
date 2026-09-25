// import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import { WebSocket,Params } from 'k6/experimental/websockets';
import encoding from 'k6/encoding';
import {WikiOptions} from '../config.js'
import { sleep, check } from 'k6';
// import { setTimeout, clearTimeout, setInterval, clearInterval } from 'k6/experimental/timers';


var changxie = {
	"type": "auth",
	"docid": "zuhutest_6_102684",
	"documentCallbackUrl": "http://<YOUR-DOMAIN>:5199/open/office/102684/saveCXCallback?tenant=zuhutest_6&userId=103&type=&id=102684",
	"token": "fghhfgsjdgfjs",
	"user": {
		"id": "103",
		"username": "<YOUR-USERNAME>",
		"firstname": null,
		"lastname": null,
		"indexUser": -1
	},
	"editorType": 2,
	"lastOtherSaveTime": -1,
	"block": [],
	"sessionId": null,
	"sessionTimeConnect": null,
	"sessionTimeIdle": 0,
	"documentFormatSave": 129,
	"view": false,
	"isCloseCoAuthoring": false,
	"openCmd": {
		"c": "open",
		"id": "zuhutest_6_102684",
		"userid": "103",
		"format": "pptx",
		"url": "http://<YOUR-DOMAIN>:5199/open/office/system/sample.pptx?tenant=zuhutest_6",
		"title": "Unnamed.pptx",
		"lcid": 30724,
		"nobase64": true
	},
	"lang": "zh",
	"mode": null,
	"permissions": {}
}
// const sessionDuration = randomIntBetween(5000, 60000); 

export function replayMessage(url, messages, params={}) {
    // const url = `ws://<YOUR-DOMAIN>/wikicolla/0/editor/<YOUR-TENANT>/4625`;
    const params1 = {
      headers: {

        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': params.Cookie,
      },
    };
  
  // TUDO:加入重试链接
  const ws = new WebSocket(url, null, params1);
    
  ws.addEventListener('open', () => {
    //这里要用==1来比较，因为readyState的类型是ReadyState，要用非严格比较
    if (!check(ws, {
      'ws链接状态': (r) => r.readyState == 1,
    })){
      console.log('链接失败!!!', url)
      ws.close()
    }
    console.log('链接成功了')
    for (const mess of messages){
      sleep(0.1)
      switch(mess.opcode){
        case 1:
          if (mess.type == 'send'){
            // console.log("case 1")
            if(params.type == 'office' && mess.data.includes('http://<YOUR-DOMAIN>:5199/open/office')){
              changxie['docid'] = params.tenant + '_' + params.pageid
              changxie['documentCallbackUrl'] = 'http://<YOUR-DOMAIN>:5199/open/office/'+ params.pageid+'/saveCXCallback?tenant='+ params.tenant+'&userId=103&type=&id=' + params.pageid
              changxie['openCmd']['id'] = params.tenant + '_' + params.pageid
              changxie['openCmd']['format'] = params.pagetype
              changxie['editorType'] = params.pagetype==='docx'?0:(params.pagetype==='pptx'?2:1)
              changxie['openCmd']['title'] = "Unnamed." + params.pagetype
              changxie['openCmd']['url'] = "http://<YOUR-DOMAIN>:9000/wiki-static/" + params.fetchUrl
              //靠，注意观察畅写的报文格式，是['message', '报文内容']，是个数组，别TM搞错了，排查半天。
              var sendDtat = '42' + JSON.stringify(['message', JSON.stringify(changxie)])
              console.log("case 1 发送@#@", sendDtat)
              ws.send(sendDtat)
              sleep(0.01)
            }
            else{
              console.log(mess.data)
              ws.send(mess.data)
              sleep(0.01)
            }
          }
          break;
        case 2:
          if (mess.type == 'send'){
            if(params.type == 'mind'){
              let senddatat = modifiArrBuff(mess.data, params)
              console.log("case 2-1 发送", encoding.b64encode(senddatat))
              ws.send(senddatat)
            }else{
              let strdata = encoding.b64decode(mess.data, 'std', 's')
              if (strdata.includes('pageId')){
                let senddatat = customModifiArrBuff(mess.data, WikiOptions.oldpageId, params.pageid)
                console.log("case 2-2 篡改报文发送", encoding.b64encode(senddatat))
                ws.send(senddatat)
                break
              }
              console.log("case 2-2 发送", mess.data)
              let arrbuff = encoding.b64decode(mess.data, 'std')
              ws.send(arrbuff)
              
              
            }
            sleep(0.01)      
          }
          break;
        default:
          if (mess.type == 'send'){
            console.log("default 发送", mess.data)
            let arrbuff = encoding.b64decode(mess.data, 'std')
            ws.send(arrbuff)
            sleep(0.01)
          }
      }
      
      
    }
    
    // listen for messages/errors and log them into console
    ws.addEventListener('message', (event) => {
      console.log('收到消息啦了')
      if (typeof event.data === 'string') {
        console.log('Received text message:', event.data);
    } else if (event.data instanceof ArrayBuffer) {
        const buffer = new Uint8Array(event.data);
        console.log('Received binary message:', buffer);
    }
    });
    ws.addEventListener('close', () => {
      console.log(`VU ${__VU} disconnected`);
    });
    //注释，即可不停打印收到的message.k6并未能很好支持Js promise await异步。因此总是先执行发送之后再接受消息，暂时无法实时接受。实时接受需要开两个k6实例。
    ws.close()
  });
}
//即将废弃该方法
function modifiArrBuff(base64String, params={}){
  console.log(params, "#$#$")
  //这个customlength = 18不是固定的，得看报文的租户信息来修改
  const customlength = 18
  var buff = encoding.b64decode(base64String, 'std')
  let uint8View = new Uint8Array(buff); 
  let tenant = params.tenant;
  let pageid = params.pageid;
  let oldbuffLength = uint8View.length
  //因为那个特殊租户带有_所以+1
  let newLength = tenant.length + pageid.length + 1
  let newUint8View1 = new Uint8Array(1);
  newUint8View1[0] = uint8View[0]
  let newUint8View2 = new Uint8Array(newLength);
  for(let i = 0; i< newLength; i++){
    if(i < tenant.length){
      newUint8View2[i] = tenant[i].charCodeAt(0)
    }
    if(i == tenant.length){
      newUint8View2[i] = '-'.charCodeAt(0)
    }
    if(i > tenant.length){
      newUint8View2[i] = pageid[i-tenant.length-1].charCodeAt(0)
    }
  }
  let newUint8View3 = new Uint8Array(oldbuffLength - customlength);
  for(let i = 0; i< newUint8View3.length; i++){
    newUint8View3[i] = uint8View[i + customlength]
  }
  let mergedArray = new Uint8Array(newUint8View1.length + newUint8View2.length + newUint8View3.length);
  mergedArray.set(newUint8View1, 0);
  mergedArray.set(newUint8View2, newUint8View1.length);
  mergedArray.set(newUint8View3, newUint8View1.length + newUint8View2.length);
  return mergedArray.buffer
}

// 将字符串转换为 Uint8Array
function stringToUint8Array(str) {
  let arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i);
  }
  return arr;
}
// 替换字节序列
function replaceSequence(array, targetSequence, replacementSequence) {
  const strArray = array.join(',');
  const strTarget = targetSequence.join(',');
  const strReplacement = replacementSequence.join(',');

  if (strArray.includes(strTarget)) {
      const strNewArray = strArray.replace(strTarget, strReplacement);
      return new Uint8Array(strNewArray.split(',').map(Number)).buffer;
  } else {
      return array.buffer;
  }
}
function customModifiArrBuff(base64String, oldstring, newstringdata){
  // 原始 Uint8Array
  var oldbuff = encoding.b64decode(base64String, 'std')
  let originalArray = new Uint8Array(oldbuff);

  // 要查找的字节序列
  let targetSequence = stringToUint8Array(oldstring);

  // 替换的字节序列
  let replacementSequence = stringToUint8Array(newstringdata);;

  // 执行替换
  let newArray = replaceSequence(originalArray, targetSequence, replacementSequence);
  return newArray

}
