
/* 
    该文件不能在k6中调用使用
    该文件旨在处理ws报文，提取报文信息并保存为一个新的同名json文件

*/
const fs = require('fs');
//editor office diagram
const messType = 'office'
const yourfile = 'word2.json'
console.log('start:');
const sourcePath = './websocket/scen/' + yourfile;
if (!fs.existsSync(sourcePath)) {
  console.error('源文件不存在：' + sourcePath + '，请先放置要处理的原始报文文件。');
  return;
}
// 读取原始 JSON 文件
fs.readFile(sourcePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data); // 解析 JSON 数据
    if(messType === 'editor' || messType === 'diagram'){
      for (const element of jsonData.log.entries){
        if (element.hasOwnProperty('_webSocketMessages') && element.request.url.includes(messType)){
          const newNameObject = element['_webSocketMessages'];
          const newJsonData = JSON.stringify(newNameObject, null, 2);
          fs.writeFile('./websocket/k6scen/' + yourfile, newJsonData, 'utf8', (err) => {
              if (err) {
                console.error('Error writing file:', err);
                return;
              }
              console.log('New JSON file created successfully!');
              return
            });
        }
      }
    }
    if(messType === 'mind'){
      for (const element of jsonData.log.entries){
        if (element.hasOwnProperty('_webSocketMessages') && element.request.url.includes('mind')){
          console.log(element.request.url)
          const newNameObject = element['_webSocketMessages'];
          const newJsonData = JSON.stringify(newNameObject, null, 2);
          fs.writeFile('./websocket/k6scen/' + yourfile, newJsonData, 'utf8', (err) => {
              if (err) {
                console.error('Error writing file:', err);
                return;
              }
              console.log('New JSON file created successfully!');
            });
      }}
  
    }
    if(messType === 'office'){
      for (const element of jsonData.log.entries){
        if (element.hasOwnProperty('_webSocketMessages') && element.request.url.includes('docId')){
          console.log(element.request.url)
          const newNameObject = element['_webSocketMessages'];
          const newJsonData = JSON.stringify(newNameObject, null, 2);
          fs.writeFile('./websocket/k6scen/' + yourfile, newJsonData, 'utf8', (err) => {
              if (err) {
                console.error('Error writing file:', err);
                return;
              }
              console.log('New JSON file created successfully!');
            });
        }
      }
      
    }

  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});
