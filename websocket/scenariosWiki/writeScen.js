import {multiplayerMessage, replayMessage} from '../apiWiki/createPage.js'
import {apicreateWikiPage, apicreateWordPage, apicreateDiagram} from '../apiWiki/page.js'
import { readJson} from '../../tool/allTool.js';
import {WikiOptions} from '../config.js'

//readJson必须写在这里，因为用了SharedArray。除非改用Open方法
const domain = WikiOptions.domainName,
    tenant = WikiOptions.tenant,
    mulitMessage = readJson('mulitMessage', '../k6scen/pageUsers.json'),
    wikiMessage = readJson('wikiMessage', '../k6scen/page2.json'),
    wordMessage = readJson('wordMessage', '../k6scen/word2.json'),
    pptMessage = readJson('pptMessage', '../k6scen/ppt.json'),
    excelMessage = readJson('excelMessage', '../k6scen/excel.json'),
    mindMessaage = readJson('mindMessaage', '../k6scen/mind2.json'),
    diagramMessage = readJson('diagramMessage', '../k6scen/diagram.json')

//写page场景
export function writePage(params){
    const pageid = apicreateWikiPage({
        'params': {
            'jsonpath': '$.data.id',
        },
        'Cookie': params.Cookie,
        'spaceId': WikiOptions.spaceId
    })
    console.log(params.Cookie, "@#@#")
    
    const url = WikiOptions.ws + domain +'/wikicolla/1/editor/' + tenant + '/' + String(pageid);
    console.log(url, "@@pageid",pageid)
    //支持标题替换（中文标题在utf-8编码中占用三个字节），支持篡改报文，替换对应pageid
    replayMessage(url, wikiMessage, {'Cookie': params.Cookie, 'pageid': String(pageid)})
}
// 写word场景
export function writeWord(params){
    const data = apicreateWordPage({
        'Cookie': params.Cookie,
        'contentType': 'word',
        'params': {
            'jsonpath': '$.data'
        },
        'spaceId': WikiOptions.spaceId
    })
    console.log(data, "@#@#")
    const pageid = data[0].id
    const fetchUrl = JSON.parse(data[0].content).fetchUrl
    
    const url = WikiOptions.ws + domain + '/doc/?docId=' + tenant+ '_' + String(pageid) + '&protocol='+ WikiOptions.protocol.split(':')[0] +'&EIO=3&transport=websocket';
    console.log(url, "here is url")
    replayMessage(url, wordMessage, {'type': 'office', 'tenant': tenant, 'spaceId': WikiOptions.spaceId, 'pageid': String(pageid),'Cookie': params.Cookie, 'pagetype': 'docx', 'fetchUrl':fetchUrl})
}
// 写ppt场景
export function writePpt(params){
    const pageid = apicreateWordPage({
        'title': '自动化创建ppt',
        'spaceId': WikiOptions.spaceId,
        'contentType': 'ppt',
        'Cookie': params.Cookie,
        'params': {
            'jsonpath': '$.data.[id]'
        }
    })
    console.log(pageid, "@#@#")
    const url = WikiOptions.ws + domain + '/doc/?docId=' + tenant+ '_' + String(pageid) + '&protocol=http&EIO=3&transport=websocket';
    console.log(url)
    replayMessage(url, pptMessage, {'type': 'office', 'tenant': tenant, 'spaceId': spaceId, 'pageid': String(pageid[0]),'Cookie': params.Cookie})
}

// 写excel场景
export function writeExcel(params){
    const pageid = apicreateWordPage({
        'title': '自动化创建excel',
        'spaceId': WikiOptions.spaceId,
        'Cookie': params.Cookie,
        'contentType': 'excel',
        'params': {
            'jsonpath': '$.data.[id]'
        }
    })
    console.log(pageid, "@#@#")
    const url = WikiOptions.ws + domain + '/doc/?docId=' + tenant+ '_' + String(pageid)[0] + '&protocol=http&EIO=3&transport=websocket';
    console.log(url)
    replayMessage(url, excelMessage, {'type': 'office', 'tenant': tenant, 'spaceId': spaceId, 'pageid': String(pageid[0]),'Cookie': params.Cookie})
}


export function writeMind(params){
    const pageid = apicreateWordPage({
        'title': '我是mind',
        'spaceId': WikiOptions.spaceId,
        'contentType': 'mind_mapping',
        'Cookie': params.Cookie,
        'params': {
            'jsonpath': '$.data.[id,content]'
        }
    })
    // console.log(pageid, "@#@#")
    var fetchUrl = JSON.parse(pageid[1])
    const url = WikiOptions.ws + domain + '/wikicolla/0/minder/' + tenant+ '/' + String(pageid[0]);
    console.log(fetchUrl['fetchUrl'], String(pageid[0]), url,pageid)
    replayMessage(url, mindMessaage, {'type': 'mind', 'tenant': tenant, 'spaceId': spaceId, 'pageid': String(pageid[0]),'Cookie': params.Cookie})
}

// 写diagram场景
export function writeDiagram(params){
    const pageid = apicreateWordPage({
        'title': '我是流程图',
        'spaceId': WikiOptions.spaceId,
        'contentType': 'diagram',
        'Cookie': params.Cookie,
        'params': {
            'jsonpath': '$.data.[id]'
        }
    })
    apicreateDiagram({'pageId': pageid[0]})
    const url = WikiOptions.ws + domain + '/wikicolla/2/diagram/' + tenant+ '/' + String(pageid[0]);
    console.log(pageid, "@#@#",url)
    replayMessage(url, diagramMessage,{'Cookie': params.Cookie})
}


export function multiwritePage(params){
    const pageid = apicreateWikiPage({
        'params': {
            'jsonpath': '$.data.id'
        },
        'Cookie': params[0].Cookie,
        'spaceId': WikiOptions.spaceId
    })
    console.log(params[0].Cookie, "@#@#pageid",pageid)
    
    const url = WikiOptions.ws + domain +'/wikicolla/1/editor/' + tenant + '/' + String(pageid);
    multiplayerMessage(url, mulitMessage, [{'Cookie': params[0].Cookie, 'url': url, 'tag': 'pageUser1','pageid': String(pageid)},{'Cookie': params[1].Cookie, 'url': url, 'tag': 'pageUser2','pageid': String(pageid)}])
}