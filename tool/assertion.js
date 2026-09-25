import { expect } from "../tool/chaijs.js";

function checkExpectation(expectationFunc) {
  try {
    expectationFunc();
    return { 'pass': 'passed' };
  } catch (error) {
    return { 'fail': error.message };
  }
}

class Assertions {
  // 判断返回状态码是否为200或者201
  static assertion200(res) {
    const result = checkExpectation(() => expect([200, 201]).to.be.an("array").that.includes(res.status));

    return {
      name: "返回状态200或者201",
      status: result.pass || 'broken',
      parameters: [{ name: '实际结果', value: result.pass ? `状态码: ${res.status}` : `错误: ${result.fail}` }]
    }
  }

  // 判断返回结果是否包含指定属性
  static hasProperty(res, propName) {
    const result = checkExpectation(() => expect(res).to.have.property(propName));

    return {
      name: `返回包含${propName}`,
      status: result.pass || 'broken',
      parameters: [{
        name: '实际结果',
        value: result.pass ? JSON.stringify(res[propName]) : `错误: ${result.fail}`
      }]
    }
  }

  // 判断对象是否包含指定嵌套路径（如 'data.data.success'，数组下标用数字 key，如 'data.0.status'）
  static hasNestedProperty(obj, path) {
    const keys = String(path).split('.');
    const result = checkExpectation(() => {
      let current = obj;
      for (const key of keys) {
        expect(current).to.not.be.null.and.to.not.be.undefined;
        current = current[key];
      }
    });

    return {
      name: `返回包含嵌套属性${path}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际结果', value: obj !== undefined && obj !== null ? JSON.stringify(obj) : '空' },
        { name: '期望路径', value: String(path) }
      ]
    }
  }

  // 判断值是否为字符串
  static isString(value, name = "值") {
    const result = checkExpectation(() => expect(value).to.be.a("string"));

    return {
      name: `${name}是字符串`,
      status: result.pass || 'broken',
      parameters: [{ name: '实际结果', value: result.pass ? `${value}` : `错误: ${result.fail}` }]
    }
  }

  // 判断值是否不为空（null / undefined / 空串 / 空数组 / 空对象均视为空）
  static isNotEmpty(value, name = "值") {
    const result = checkExpectation(() => {
      expect(value).to.not.be.oneOf([null, undefined, '']);
      if (typeof value === 'string' || Array.isArray(value)) {
        expect(value.length).to.be.greaterThan(0);
      } else if (value !== null && typeof value === 'object') {
        expect(Object.keys(value).length).to.be.greaterThan(0);
      }
    });

    return {
      name: `${name}不为空`,
      status: result.pass || 'broken',
      parameters: [{
        name: '实际结果',
        value: value === null || value === undefined ? '空' : (typeof value === 'object' ? JSON.stringify(value) : `${value}`)
      }]
    }
  }

  static pass(res) {
    return {
      name: "完整返回",
      status: 'passed',
      parameters: [{ name: '实际结果', value: JSON.stringify(res) }]
    }
  }

  // 判断实际值actual是否等于期望值expected，如果expected未定义则使用defaultValue
  static equals(actual, expected, defaultValue = null) {
    const exp = expected !== undefined ? expected : defaultValue;
    const result = checkExpectation(() => {
      expect(actual).to.equal(exp);
    });
    return {
      name: `值等于${exp}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际值', value: actual !== undefined && actual !== null ? `${actual}` : '空' },
        { name: '期望值', value: expected !== undefined ? `${expected}` : `${defaultValue}（默认）` }
      ]
    }
}

  // 判断实际值actual是否大于等于期望值expected
  static gte(actual, expected) {
    const result = checkExpectation(() => {
      expect(actual).to.be.at.least(expected);
    });
    return {
      name: `值大于等于${expected}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际值', value: actual !== undefined && actual !== null ? `${actual}` : '空' },
        { name: '期望值', value: `${expected}` }
      ]
    }
  }

  // 判断数组subset是否是superset的子集
  static isSubsetOf(subset, superset) {
    // 容错处理：确保参数是数组
    const safeSubset = Array.isArray(subset) ? subset : [subset];
    const safeSuperset = Array.isArray(superset) ? superset : [superset];

    const result = checkExpectation(() => {
      expect(safeSuperset).to.include.members(safeSubset);
    });
    let subsetStr = safeSubset.length > 0 ? JSON.stringify(safeSubset) : '空';
    let supersetStr = safeSuperset.length > 0 ? JSON.stringify(safeSuperset) : '空';
    return {
      name: `${subsetStr}是${supersetStr}的子集`,
      status: result.pass || 'broken',
      parameters: [
        { name: `子集${subsetStr}`, value: subsetStr },
        { name: `超集${supersetStr}`, value: supersetStr }
      ]
    }
  }

  // 判断数组subset是否不是superset的子集（即superset不包含subset的所有成员）
  static isNotSubsetOf(subset, superset) {
    // 容错处理：确保参数是数组
    const safeSubset = Array.isArray(subset) ? subset : [subset];
    const safeSuperset = Array.isArray(superset) ? superset : [superset];

    const result = checkExpectation(() => {
      expect(safeSuperset).to.not.include.members(safeSubset);
    });
    let subsetStr = safeSubset.length > 0 ? JSON.stringify(safeSubset) : '空';
    let supersetStr = safeSuperset.length > 0 ? JSON.stringify(safeSuperset) : '空';
    return {
      name: `${subsetStr}不是${supersetStr}的子集`,
      status: result.pass || 'broken',
      parameters: [
        { name: `子集${subsetStr}`, value: subsetStr },
        { name: `超集${supersetStr}`, value: supersetStr }
      ]
    }
  }

  // 判断数组所有元素是否都等于指定值
  static allItemsEqual(arr, value) {
    const result = checkExpectation(() => {
      expect(arr).to.be.an('array');
      for (const item of arr) {
        expect(item).to.equal(value);
      }
    });

    return {
      name: `所有元素等于${value}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际结果', value: Array.isArray(arr) ? JSON.stringify(arr) : '非数组' },
        { name: '期望值', value: `${value}` }
      ]
    }
  }

  // 判断数组每个元素是否都包含指定属性
  static eachItemHasProperty(arr, prop) {
    const result = checkExpectation(() => {
      expect(arr).to.be.an('array');
      for (const item of arr) {
        expect(item).to.have.property(prop);
      }
    });

    return {
      name: `每个元素包含${prop}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际结果', value: Array.isArray(arr) ? JSON.stringify(arr) : '非数组' },
        { name: '期望属性', value: String(prop) }
      ]
    }
  }

  // 深度判断实际结果是否包含期望对象
  static deepInclude(actual, expected) {
    const result = checkExpectation(() => {
      expect(actual).to.deep.include(expected);
    });
    return {
      name: `返回深度包含${JSON.stringify(expected)}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际结果', value: actual !== undefined && actual !== null ? JSON.stringify(actual) : '空' },
        { name: '期望包含', value: expected !== undefined && expected !== null ? JSON.stringify(expected) : '空' }
      ]
    }
  }

  // 判断数组长度
  // length: 期望长度，operator: 'eq'(等于)/'gte'(大于等于)/'lte'(小于等于)/'gt'(大于)/'lt'(小于)，默认'eq'
  static arrayLength(arr, length, operator = 'eq') {
    const actualLength = Array.isArray(arr) ? arr.length : 0;
    const result = checkExpectation(() => {
      expect(arr).to.be.an('array');
      switch (operator) {
        case 'gte':
        case '>=':
          expect(arr).to.have.lengthOf.at.least(length);
          break;
        case 'lte':
        case '<=':
          expect(arr).to.have.lengthOf.at.most(length);
          break;
        case 'gt':
        case '>':
          expect(arr).to.have.lengthOf.above(length);
          break;
        case 'lt':
        case '<':
          expect(arr).to.have.lengthOf.below(length);
          break;
        case 'eq':
        case '=':
        default:
          expect(arr).to.have.lengthOf(length);
      }
    });

    const operatorMap = {
      'eq': '等于', '=': '等于',
      'gte': '大于等于', '>=': '大于等于',
      'lte': '小于等于', '<=': '小于等于',
      'gt': '大于', '>': '大于',
      'lt': '小于', '<': '小于'
    };

    return {
      name: `数组长度${operatorMap[operator] || '等于'}${length}`,
      status: result.pass || 'broken',
      parameters: [
        { name: '实际长度', value: `${actualLength}` },
        { name: '期望长度', value: `${operatorMap[operator] || '等于'} ${length}` },
        { name: '数组内容', value: Array.isArray(arr) ? JSON.stringify(arr.slice(0, 10)) + (arr.length > 10 ? '...' : '') : '非数组' }
      ]
    }
  }
}
  
  
export default Assertions;
