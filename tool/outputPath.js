// 统一输出路径助手：allure / pods / monitor 三类日志共用，避免各写各的日期格式。
// 结构：report/<type>/<YYYY-MM-DD>/<filename>

function pad(value) {
	return String(value).padStart(2, '0');
}

export function dateText(date = new Date()) {
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
	].join('-');
}

export function timeText(date = new Date()) {
	return [
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds()),
	].join('');
}

export function outputDir(type, date = new Date()) {
	return `report/${type}/${dateText(date)}`;
}

export function outputPath(type, filename, date = new Date()) {
	return `${outputDir(type, date)}/${filename}`;
}
