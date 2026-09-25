import sql from 'k6/x/sql';

export default function () {
    // 只要能正常打印，不报 "Unknown module: k6/x/sql" 错误，就说明编译进去了！
    console.log("xk6-sql 模块加载成功！当前对象:", sql);
}