// Environment: sw
// Tenant: osc

const ApiOptions = {
    domainName: 'https://<YOUR-DOMAIN>:9000',
    team: '/api/team',
    tenant: '<YOUR-TENANT>',
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
        "PROXIMA_PAGE_BASE_URL": "https://<YOUR-DOMAIN>:9000/project",
        "UN_SUPPORT_ITEM_UPDATE": true,
        "ENABLED_TESTPLAN_USE_EDITOR": true,
        "TEST_ENVIRONMENT_FIELD_NAME": "测试环境-新版",
        "productSourceCustomFieldKey": "associated_product",
        "DISABLE_IMPORT_MULTIPLY_SHEET": true,
        "ENABLE_TEST_RUN_MODAL_TABLE_LAYOUT": true
    }
}

export { ApiOptions, K8sOptions, testmanagerOptions }
