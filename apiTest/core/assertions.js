import Assertions from '../../tool/assertion.js';

function normalizeAssertions(assertions) {
	if (!assertions) {
		return [];
	}
	return Array.isArray(assertions) ? assertions : [assertions];
}

export function buildApiAssertions({ res, result, params = {}, extraAssertions = [] }) {
	const context = { res, result, params };
	const extras = [];
	for (const assertion of normalizeAssertions(extraAssertions)) {
		if (typeof assertion === 'function') {
			extras.push(...normalizeAssertions(assertion(context)));
		} else {
			extras.push(...normalizeAssertions(assertion));
		}
	}

	return [
		Assertions.pass(res.res.body),
		Assertions.assertion200(res.res),
		Assertions.pass(result),
		...extras,
	].filter(Boolean);
}
