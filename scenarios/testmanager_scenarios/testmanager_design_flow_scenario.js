import { group, sleep } from 'k6';
import testmanagerBasicItem from '../basescenarios/testmanager_basicItem.js';
import testmanagerDesignFlow from '../basescenarios/testmanager_designFlow.js';

const DEFAULT_GROUP = '测试管理.测试设计';

function getEnvValue(key) {
    if (typeof __ENV === 'undefined') {
        return null;
    }
    return __ENV[key] || null;
}

function parseRange(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parts = String(value).split(',').map((item) => Number(item.trim()));
    if (parts.length !== 2 || parts.some((item) => !Number.isInteger(item))) {
        throw new Error(`Invalid range: ${value}. Use "start,end".`);
    }
    return parts;
}

/**
 * 从环境变量读取测试设计数据生成的可调范围，未设置时回退默认值。
 * 可通过 k6 run -e KEY=VALUE 覆盖：
 *   PRODUCT_RANGE       — 产品维度取值范围，格式 "start,end"，默认 [1, 10]
 *   DATA_FACTOR_RANGE   — 数据因子个数范围，格式 "start,end"，默认 [1, 1]
 *   VALID_VALUE_RANGE   — 每个因子的有效值数量范围，格式 "start,end"，默认 [1, 1]
 *   INVALID_VALUE_RANGE — 每个因子的无效值数量范围，格式 "start,end"，默认 [1, 1]
 *   CLEANUP             — true 时删除测试设计事项，默认 false
 */
function envOptions() {
    return {
        productRange: parseRange(getEnvValue("PRODUCT_RANGE"), [1, 10]),
        dataFactorRange: parseRange(getEnvValue("DATA_FACTOR_RANGE"), [1, 1]),
        validValueRange: parseRange(getEnvValue("VALID_VALUE_RANGE"), [1, 1]),
        invalidValueRange: parseRange(getEnvValue("INVALID_VALUE_RANGE"), [1, 1]),
        cleanup: getEnvValue("CLEANUP") === "true",
    };
}

export function testmanager_design_flow(options = {}) {
    const sceneGroup = options.group || DEFAULT_GROUP;
    const mergedOptions = {
        ...envOptions(),
        ...options,
    };
    delete mergedOptions.group;

    return group(sceneGroup, () => {
        if (!mergedOptions.testDesignItemId) {
            const testDesign = testmanagerBasicItem.createTestdesign(sceneGroup);
            mergedOptions.testDesignItemId = testDesign && testDesign.objectId;
            sleep(1);
        }
        return testmanagerDesignFlow.createDesignMindData(sceneGroup, mergedOptions);
    });
}

export default function () {
    testmanager_design_flow();
}
