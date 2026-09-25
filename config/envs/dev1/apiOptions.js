// 环境：dev1
// 每个环境目录（config/envs/<环境名>/）都是独立的一套配置：
//   apiOptions.js        - 域名、租户、环境变量、登录凭据等
//   data.json            - 登录态与业务数据（由 setupdata/testmanager_basic 写入）
//   dataTestmanager.json - 测试管理插件数据（由 testmanager_basic 写入）

const ApiOptions = {
    domainName: 'http://<YOUR-DOMAIN>',
    // projectuuid: 'crthaha2',
    team: '/api/team',
    tenant: '<YOUR-TENANT>',
    // 登录凭据：setupdata.js / teardown.js 从这里读取
    auth: {
        username: '<YOUR-USERNAME>',
        password: '<YOUR-PASSWORD>',
    },
}

const K8sOptions = {
    kubeconfig: '<YOUR-KUBECONFIG-PATH>',
    namespace: '<YOUR-K8S-NAMESPACE>',
}

const testmanagerOptions = {
    PLUGIN_ENV: {
        "BATCH_CONFIG": {
        "DELETE_V1": {
            "batchSize": 100 // 批量删除 用例，单次删除 个数
        }
    },
        "alias": {
            "repository": "目录"
        },
        "IS_PLUGIN_ENV": true,
        "IS_SANYUAN": true,
        "ZGC_CONFIG": false,
        "COMBINATION": {
            "MAX_COUNT": 1000
        },
        "FEATURE_FLAGS": [
            "ENABLE_TEST_REPORT",
            "ENABLE_MORE_CONFIG",
            "ENABLE_TEST_DESIGN",
            "ENABLE_OFFLINE_TEST_REPORT",
            "ENABLE_TEST_APPROVAL",
            "ENABLE_CASE_PUSH_UPDATE",
            "ENABLE_TEST_PLAN_CASE_DEFAULT_FILTER_FIELD",
            "ENABLE_REPOSITORY_TABLE_STEP",
            "ENABLE_COMBINE_CASE"
        ],
        "ENABLE_RUN_SHOW": true,
        "ES_REFRESH_DELAY": 1300,
        "BATCH_API_VERSION": "v2",
        "associated_product": "productSourceCustomFieldKey",
        "TEST_REPORT_VERSION": 2,
        "ENABLE_TEST_APPROVAL": "true",
        "ENABLED_CASE_SNAPSHOT": true,
        "FOLDER_TREE_MAX_DEPTH": 10,
        "PROXIMA_PAGE_BASE_URL": "http://<YOUR-DOMAIN>/project",
        "UN_SUPPORT_ITEM_UPDATE": true,
        "ENABLED_TESTPLAN_USE_EDITOR": true,
        "TEST_ENVIRONMENT_FIELD_NAME": "测试环境-新版",
        "productSourceCustomFieldKey": "associated_product",
        "DISABLE_IMPORT_MULTIPLY_SHEET": true,
        "ENABLE_TEST_RUN_MODAL_TABLE_LAYOUT": true
    }
}

export { ApiOptions, K8sOptions, testmanagerOptions }
