import sql from 'k6/x/sql';

// The second argument is a PostgreSQL connection string, e.g.
// postgres://myuser:mypass@127.0.0.1:5432/postgres?sslmode=disable

// export function setup() {
//   db.exec(`CREATE TABLE IF NOT EXISTS keyvalues (
//     id SERIAL PRIMARY KEY,
//     key varchar(50) NOT NULL,
//     value varchar(50)
//   )`);
// }

// export function teardown() {
//   db.close();
// }

export function pgQuerytest(db) {
  let results = sql.query(db, `select name from "Item" limit 1;`);
  //[{"name":"1111"}]
  console.log(results)
  for (const row of results) {
    //key: 1111 
    console.log(`key: ${row.name}`);
  }
}

export function getFieldtype_Date(db){
  let results = sql.query(db, `select "objectId" from "FieldType" where name = '日期';`);
  return results[0]['objectId']
}

export function getitemGroup(db, workspace){
  let results = sql.query(db, `select "objectId" from "ItemGroup" where workspace = $1;`, workspace);
  return results[0]['objectId']
}
