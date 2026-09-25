import uuid from './uuid.js'
import crypto from 'k6/crypto';
import {JSONPath} from '../node_modules/jsonpath-plus/dist/index-browser-esm.js';
import {logJson} from '../config/apiOptions.js'
import { ENV } from '../config/current.js'
import zaplogger from 'k6/x/zaplogger';
import file from 'k6/x/file';
import { SharedArray } from 'k6/data';
import { expect } from "../tool/chaijs.js";
import { outputDir } from './outputPath.js';


export function generateUUID(){
    return uuid.v4()
}

export function getNowString(){
    let now = new Date()
    let month = String(now.getMonth() + 1).padStart(2, '0')
    let day = String(now.getDate()).padStart(2, '0')
    let hour = String(now.getHours()).padStart(2, '0')
    let minute = String(now.getMinutes()).padStart(2, '0')
    return month + day + hour + minute
}
export function generateMd5(data) {
  return crypto.md5(data, 'hex');
}

// returnBykey返回 {'key': value}
// jsonpath 返回 []
//
export function dealrespon(obj, params){
  if (params && obj){
    if (params.hasOwnProperty("jsonpath")){
      return JSONPath(params['jsonpath'], obj)
    }
    if (params.hasOwnProperty("returnBykey")){
      return params.returnBykey.reduce(function(result, key) {
        if (key in obj) {
            result[key] = obj[key];
        }
        return result;
    }, {});
    }
  }

  return obj
}

//TUDO:用go的zap重新写个扩展，支持高性能写入,这样就不需要consoleLog了
export function consoleLog(params={}){
  if(!params){return}
  const mypath = generateFile()
  const mylogger = zaplogger.initLogger('./' + mypath.formattedDate + '/' + mypath.myfilename)
  // // 用深拷贝，创建独立副本
  // let Itemlog = JSON.parse(JSON.stringify(logJson));
  let statusDetails = zaplogger.zapObject('statusDetails', 'message', params.message,'trace', params.trace)

  // 判断所有steps是否都通过
  let mystatus = ''
  const steps = params.steps || []
  
  // 如果存在steps，检查所有step的状态
  if (steps.length > 0) {
    const allPassed = steps.every(step => step.status === 'passed')
    mystatus = allPassed ? 'passed' : 'broken'
  } else {
    // 没有steps时，根据响应状态码判断
    if ([200,201].includes(params.resStatus)){
      mystatus = "passed"
    }else{
      mystatus = "broken"
    }
  }
  
  let label = ''
  let labels = JSON.parse(JSON.stringify(logJson.labels))
  // 容错处理：group 默认为 'default'
  const group = params.group || '没有传分组的接口'
  if (!params.group) {
    console.log("有方法调用没有传入分组，请指定分组，已使用默认值 'default'")
  }
  if (group.includes('.')){
    var line = group.split('.')
    label = line[0]
    labels.push({"name": "subSuite", "value": line[1]})
  }else{
    label = group
  }
  labels = labels.map(item => {
    if (item.value === 'main') {
      item.value = label
      return item;
    }
    return item;
})
  mylogger.infow(params.casename,
    "name", params.casename,
    "status", mystatus,
    "start", params.start,
    "stop", params.stop,
    "description", params.description,
    statusDetails,
    "uuid", generateUUID(),
    "historyId", generateUUID(),
    "testCaseId", generateMd5(params.casename),
    "fullName", params.group + "#" + params.casename,
    "labels", labels,
    "steps", steps
    )
  mylogger.sync()
}

export function consoleError(params={}){
  const { errorMessage, group, casename, description } = params
  if(!errorMessage && !group && !casename){return}
  const mypath = generateFile()
  const mylogger = zaplogger.initLogger('./' + mypath.formattedDate + '/' + mypath.myfilename)
  let labels = JSON.parse(JSON.stringify(logJson.labels))
  let label = ''
  if (group.includes('.')){
    var line = group.split('.')
    label = line[0]
    labels.push({"name": "subSuite", "value": line[1]})
  }else{
    label = group
  }
  labels = labels.map(item => {
    if (item.value === 'main') {
      item.value = label
      return item;
    }
    return item;
  })
  let now = new Date().toISOString()
  mylogger.infow(casename,
    "name", casename,
    "status", "broken",
    "start", now,
    "stop", now,
    "description", description || errorMessage,
    "statusDetails", errorMessage,
    "uuid", generateUUID(),
    "historyId", generateUUID(),
    "testCaseId", generateMd5(casename),
    "fullName", group + "#" + casename,
    "labels", labels,
    "steps", []
    )
  mylogger.sync()
}
//再写个方法自动转为curl方便调试
export function httpRequestToCurl(method, url, headers, data) {
  let headerString = '';
  for (let key in headers) {
      headerString += `-H "${key}: ${headers[key]}" `;
  }

  let dataString = '';
  if (data) {
      dataString = `-d '${data}' `;
  }

  return `curl -X ${method} ${headerString}${dataString}${url}`;
}

export function generateFile(){
  const myfilename = generateUUID() + '-result.json';
  // allure 结果统一收敛到 report/allure/<日期>/ 下
  return {'formattedDate': outputDir('allure'), 'myfilename': myfilename}
}



//SharedArray方式读取Json
export function readJson(customName, filepath) {
  const data = new SharedArray(customName, function () {
    const f = JSON.parse(open(filepath));

    return f; // f must be an array
  });
  return data

}

export function writeDataJson(filepath, data, overwrite = true) {
  const logger = zaplogger.initLogger(filepath, true)
  let dataObj = zaplogger.zapObject('data', 'content', JSON.stringify(data))
  logger.infow("data", dataObj)
  logger.sync()
}

// ============ 环境相关数据文件（config/envs/<ENV>/） ============
export function getEnvDataPath(filename) {
  return `./config/envs/${ENV}/${filename}`;
}

export function readEnvData(filename) {
  const fileContent = JSON.parse(file.readFile(getEnvDataPath(filename)));
  return JSON.parse(fileContent.data.content);
}

export function writeEnvData(filename, data, overwrite = true) {
  writeDataJson(getEnvDataPath(filename), data, overwrite);
}

export function initDataFromFilePath(filePath) {
  return new SharedArray(filePath, function () {
    try {
      const f = JSON.parse(open(filePath));
      if (f && f.data && f.data.content) {
        return [JSON.parse(f.data.content)];
      }
    } catch (e) {
      console.log("init error:", e)
    }
    return [{}];
  });
}
