import http from "k6/http";
// import { describe, expect } from "https://jslib.k6.io/k6chaijs/4.3.4.3/index.js";
import { describe, expect } from "../tool/chaijs.js";


export default function () {
  // if (expect(2).to.equal(2)){
  //   console.log("@@@@@@@@@@@@@@@@@")
  // }
  // if (expect(2).to.equal(3)){
  //   console.log("@@@@@@@@@@@@@@@@@")
  // }
  describe('Basic test', (t) => {
    // throw 'Something entirely unexpected happened';
    // expect([200,201].to.be.an("array").that.includes(201));
    const myObject = { key1: '1'};

    expect(myObject).to.deep.include({ key1: 1});
    // expect(new Set(['a', 'b'])).to.have.all.keys('a', 'b');
    // const response = http.get('https://test-api.k6.io/');
    // const a = {"ancestors":[],"objectId":"JGTgMKpxk1"}
    // expect(a).to.have.keys("objectId");
    // expect(response.body).to.have.all.keys('a', 'b');
   

    // expect({ a: 1 }).to.not.have.property("b");
    // expect(2).to.equal(2);
    // expect({ a: 1 }).to.deep.equal({ a: 1 });
    // expect({ a: { b: ["x", "y"] } }).to.have.nested.property("a.b[1]");
    // expect({ a: 1 }).to.have.own.property("a");
    // expect([1, 2])
    //   .to.have.ordered.members([1, 2])
    //   .but.not.have.ordered.members([2, 1]);
    // expect({ a: 1, b: 2 }).to.not.have.any.keys("c", "d");
    // expect({ a: 1, b: 2 }).to.have.all.keys("a", "b");
    // expect("foo").to.be.a("string");
    // expect([200,201]).to.be.an("array").that.includes(201);
    // expect("foobar").to.include("foo");
    // expect(1).to.equal(1);
    // expect(true).to.be.true;
    // expect(false).to.be.false;
    // expect(null).to.be.null;
    // expect(undefined).to.be.undefined;
    // expect(NaN).to.be.NaN;
    // expect(1).to.equal(1);
    // expect([]).to.be.empty;
    // expect({}).not.to.be.arguments;
    // expect(1).to.equal(1);
    // expect({ a: 1 }).to.eql({ a: 1 }).but.not.equal({ a: 1 });
    // expect("foo").to.have.lengthOf(3);
    // expect(2).to.equal(2);
    // expect(1).to.equal(1);
    // expect(2).to.be.at.most(3);
    // expect(2).to.equal(2);
    // expect({ a: 1 }).to.not.be.an.instanceof(Array);
    // expect({ a: 1 }).to.have.property("a");
    // expect([1, 2, 3]).to.have.lengthOf(3);
    // expect("foobar").to.match(/^foo/);
    // expect("foobar").to.have.string("bar");
    // expect({ a: 1, b: 2 }).to.have.all.keys("a", "b");
    // const badFn = function () {
    //   throw new TypeError("Illegal salmon!");
    // };
    // expect(badFn).to.throw();
    // expect(1).to.satisfy(function (num) {
    //   return num > 0;
    // });
    // expect(1.5).to.equal(1.5);
    // expect([1, 2, 3]).to.have.members([2, 1, 3]);
    // expect("Today is sunny").to.contain.oneOf(["sunny", "cloudy"]);
    // expect({ a: 1 }).to.be.extensible;
    // expect(1).to.be.finite;
  });
}

