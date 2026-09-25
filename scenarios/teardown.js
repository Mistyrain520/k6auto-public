import { consoleError, readEnvData } from '../tool/allTool.js';
import { workspaceApi } from '../apiTest/workspace.js';
import { ApiOptions } from '../config/apiOptions.js';
import { commonApi } from '../apiTest/common.js';
import file from 'k6/x/file';

export function teardowndata() {
	let data = readEnvData('data.json')
	
	if (data.myworkspace && data.myworkspace.myuuid) {
		console.log("删除空间",data.myworkspace.myuuid)
		workspaceApi.apiDeleteWorkspace({
			projectId: data.myworkspace.myuuid,
			password: ApiOptions.auth.password,
            group: '全局后置操作.空间清理',
            casename: '删除空间',
			loginRes: data.loginRes,
		})
	}
	if (data.myworkspace && data.myworkspace.objectId) {
		const queryWorkspace = commonApi.apiqueryByParse({
			params: {
			},
			where: { "objectId": data.myworkspace.objectId },
			tablename: 'Workspace',
			group: '全局后置操作.空间清理',
			casename: '查询Workspace，查不到说明空间删除了',
			loginRes: data.loginRes,
			isNotLog: false
		})
		if (queryWorkspace && queryWorkspace.results && queryWorkspace.results.length > 0) {
			consoleError({
				'group': '全局后置操作.空间清理',
				'casename': '验证空间被删除',
				'errorMessage': '能查询到空间，请确认空间是否被删除了，或者查询条件是否正确',
        	})
		}
	}

	if (data.myFlowScheme && data.myFlowScheme.objectId) {
		console.log("删除工作流方案",data.myFlowScheme.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'WorkflowScheme',
			id: data.myFlowScheme.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.工作流清理',
			casename: '删除工作流方案'
		})
	}

	if (data.myFlow && data.myFlow.objectId) {
		console.log("删除工作流",data.myFlow.objectId)
		commonApi.apieditByParse({
				method: 'DELETE',
				tablename: 'Workflow',
				id: data.myFlow.objectId,
				loginRes: data.loginRes,
				group: '全局后置操作.工作流清理',
				casename: '删除Workflow',
				isNotLog: false
			})
	}

	if (data.myStatus1 && data.myStatus1.objectId) {
		console.log("删除状态1",data.myStatus1.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'Status',
			id: data.myStatus1.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.工作流清理',
			casename: '删除Status1',
			isNotLog: false
		})
	
	}

	if (data.myStatus2 && data.myStatus2.objectId) {
		console.log("删除状态2",data.myStatus2.objectId)
		commonApi.apieditByParse({
				method: 'DELETE',
				tablename: 'Status',
				id: data.myStatus2.objectId,
				loginRes: data.loginRes,
				group: '全局后置操作.工作流清理',
				casename: '删除Status2',
				isNotLog: false
			})
	}

	if (data.myItemTypeScreenScheme && data.myItemTypeScreenScheme.objectId) {
		console.log("删除事项类型界面方案",data.myItemTypeScreenScheme.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'ItemTypeScreenScheme',
			id: data.myItemTypeScreenScheme.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.界面方案清理',
			casename: '删除事项类型界面方案'
		})
	}
	if (data.myscreenScheme && data.myscreenScheme.objectId) {
		console.log("删除界面方案",data.myscreenScheme.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'ScreenScheme',
			id: data.myscreenScheme.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.界面方案清理',
			casename: '删除界面方案'
		})
	}
	if (data.myscreen && data.myscreen.objectId) {
		console.log("删除界面",data.myscreen.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'Screen',
			id: data.myscreen.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.界面方案清理',
			casename: '删除界面'
		})
	}
	if (data.myField && data.myField.objectId) {
		console.log("删除字段",data.myField.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'CustomField',
			id: data.myField.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.界面方案清理',
			casename: '删除字段'
		})
	}
	if (data.myitemtypescheme && data.myitemtypescheme.objectId) {
		console.log("删除事项类型方案",data.myitemtypescheme.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'ItemTypeScheme',
			id: data.myitemtypescheme.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.类型清理',
			casename: '删除事项类型方案'
		})
	}
	if (data.myitemtype && data.myitemtype.objectId) {
		console.log("删除事项类型",data.myitemtype.objectId)
		commonApi.apieditByParse({
			method: 'DELETE',
			tablename: 'ItemType',
			id: data.myitemtype.objectId,
			loginRes: data.loginRes,
			group: '全局后置操作.类型清理',
			casename: '删除事项类型'
		})
	}
}
export function teardowntest() {
	const fileContent = JSON.parse(file.readFile('./config/data1.json'));
	const aa = JSON.parse(fileContent.data.content)
	console.log(fileContent, "读取到的文件内容", aa.dd);
}
