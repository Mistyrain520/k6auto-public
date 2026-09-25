import { consoleError, readEnvData, writeEnvData } from '../../tool/allTool.js';
import { commonApi } from '../../apiTest/common.js';
import { itemTypeApi } from '../../apiTest/itemType.js';
import { screenApi } from '../../apiTest/screen.js';
import { testManagerDesignApi } from '../../apiTest/testmanager/testmanager_design.js';
import { sleep } from 'k6';

/*
    本场景流程：
        1.查询测试管理应用
        2.订阅测试管理应用到当前空间
        3.查询测试管理相关事项类型
        4.更新层级方案
        5.查询 associated_product 产品字段，补齐 crt产品1/crt产品2 产品选项，查询组合维度配置获取产品 id，把产品字段 id 和产品 id 写入 data.json
*/

function getResults(raw) {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (raw && Array.isArray(raw.results)) {
        return raw.results;
    }
    if (raw && raw.data && Array.isArray(raw.data.results)) {
        return raw.data.results;
    }
    return [];
}

function getCustomData(field = {}) {
    return (field.data && field.data.customData)
        || (field.property && field.property.customData)
        || field.customData
        || [];
}

function ensureProductOptions(customData = [], products = []) {
    const next = [...customData];
    const exists = new Set(next.map((item) => item && item.value));
    products.forEach((product) => {
        if (!exists.has(product)) {
            next.push({ label: product, value: product });
            exists.add(product);
        }
    });
    return next;
}

export function testmanager_basic(){

    const data = readEnvData('data.json')
    let loginRes = data.loginRes
    let testmanagerData
    let testmanagerApp = commonApi.apiqueryByParse(
        {
            'params': {
            },
            'where': JSON.stringify({
                'appKey': 'test_manager',
                'environmentKey': 'production'
            }),
            'tablename': 'AppsWorkspace',
            'loginRes': loginRes,
            'group': '测试管理.前置校验',
            'casename': '查询测试管理应用',
            'keys': 'appKey,objectId,global,workspaces'
        }
    )
    if (testmanagerApp.results.length == 0){
        consoleError({
            'group': '测试管理.前置校验',
            'casename': '查询测试管理应用',
            'errorMessage': '没有查询到测试管理应用，请手动检查是否订阅'
        })
        return
    }
    commonApi.apiSubscribePlugin({
        'appKey': 'test_manager',
        'loginRes': loginRes,
        'group': '测试管理.前置校验',
        'casename': '测试管理应用到当前空间（重复应用不会有问题）',
        'insert': [data.myworkspace.key],

    })
    let itemTypes = commonApi.apiqueryByParse({
        'params': {
        },
        'where': JSON.stringify({
            //查询name不行，会出问题，查了很多出来。
            'key': {'$in': ['test_manager_detail','test_manager_plan','test_manager_execution','test_manager_report',
                'test_manager_design','test_manager_data_factor','test_manager_action_factor','test_manager_approval','test_manager_automation_script']}
        }),
        'keys':'name,key,objectId,icon',
        'tablename': 'ItemType',
        'loginRes': loginRes,
        'group': '测试管理.前置校验',
        'casename': '查询事项类型'
    })

    let itemTypeshierarchy = itemTypes.results.map(item => ({ key: item.key, objectId: item.objectId, name: item.name,icon: item.icon }))
    testmanagerData = { itemTypes: Object.fromEntries(itemTypeshierarchy.map(item => [item.key, item])) }

    itemTypeApi.apiUpdateItemTypeSchemeHierarchy({
        objectId: data.myitemtypescheme.objectId,
        hierarchy: itemTypeshierarchy,
        loginRes: loginRes,
        group: '测试管理.前置校验',
        casename: '更新层级方案'
    })

    //5.查询 associated_product 产品字段，补齐 crt产品1/crt产品2 产品选项，并把产品字段 id 写入 data.json
    const productFieldQuery = commonApi.apiqueryByParse({
        loginRes: loginRes,
        tablename: 'CustomField',
        where: { key: 'associated_product' },
        keys: 'name,key,objectId,data,property,fieldType',
        limit: 1,
        group: '测试管理.前置校验',
        casename: '查询 associated_product 自定义字段'
    })
    const productField = getResults(productFieldQuery)[0]
    if (!productField || !productField.objectId) {
        consoleError({
            'group': '测试管理.前置校验',
            'casename': '查询 associated_product 自定义字段',
            'errorMessage': '没有找到 key 为 associated_product 的自定义字段'
        })
        return
    }
    screenApi.apiEditField({
        loginRes: loginRes,
        objectId: productField.objectId,
        data: {
            ...(productField.data || {}),
            customData: ensureProductOptions(getCustomData(productField), ['crt产品1', 'crt产品2']),
        },
        group: '测试管理.前置校验',
        casename: '补齐 crt产品1 到 crt产品2 产品选项',
    })
    sleep(1)
    const productConfig = testManagerDesignApi.apiGetCombinationDimensionConfig({
        loginRes: loginRes,
        workspaceKey: data.myworkspace?.key || 'error',
        group: '测试管理.前置校验',
        casename: '查询组合维度配置',
    })
    data.productField = {
        'key': 'associated_product',
        'objectId': productField.objectId,
        'products': {
            'crt产品1': productConfig?.['crt产品1'] || '',
            'crt产品2': productConfig?.['crt产品2'] || '',
        },
    }
    writeEnvData('data.json', data)

    // console.log(testmanagerData, "testmanagerData")
    writeEnvData('dataTestmanager.json', testmanagerData)
}
export default function () {
    testmanager_basic()
}
