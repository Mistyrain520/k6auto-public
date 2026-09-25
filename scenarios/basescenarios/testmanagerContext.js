import { readEnvData } from '../../tool/allTool.js';

export function getTestmanagerContext() {
	const data = readEnvData('data.json');
	const testmanagerData = readEnvData('dataTestmanager.json');

	return {
		data,
		testmanagerData,
		loginRes: data.loginRes || null,
	};
}

export default {
	getTestmanagerContext,
};
