import { itemApi } from "../apiTest/item.js";
import { ApiOptions } from "../config/apiOptions.js";


export function createItem(data){
    let item = itemApi.apicreateItem({
        'params': {
            'returnBykey': ['objectId']
        },
        'name': data.name + ApiOptions.projectuuid,
        'workspace': data.myworkspace.objectId,
        'itemType': data.myitemtype.objectId,
        'itemGroup': data.myitemGroup.objectId,
        'group': '事项场景.事项',
        'casename': '创建事项',
        'isNotLog': data.isNotLog,
        'loginRes': data.loginRes
    })
    return item
}
