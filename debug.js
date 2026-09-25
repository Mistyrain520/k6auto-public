
import { ApiOptions } from './config/apiOptions.js';
import { generateUUID, initDataFromFilePath, readEnvData } from './tool/allTool.js';
import { commonApi } from './apiTest/common.js';
export function debug(...args) {
    let data = readEnvData('data.json');
    let testmanagerData = readEnvData('dataTestmanager.json');
    commonApi.apiqueryByParse({
        loginRes: data.loginRes,
        group: '测试管理.前置校验',
        casename: '查询应用市场',
        tablename: 'AppsWorkspace',
        where: {
            "appKey": "test_manager",
            "environmentKey": "production"
        },
        keys: 'objectId'
    })

}
export default function(){
    debug()
}
