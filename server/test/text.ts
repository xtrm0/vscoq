// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as diff from 'diff';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as text from '../src/util/AnnotatedText';

// Defines a Mocha test suite to group tests of similar kind together
suite("AnnotatedText", () => {

  test("textToString", (() => {
    assert.equal(text.textToString("foo"), "foo");
    assert.equal(text.textToString(["foo","bar"]), "foobar");
    assert.equal(text.textToString([{scope:"aa",text:"foo"},"bar"]), "foobar");
    assert.equal(text.textToString([{scope:"aa",text:["foo","!!"]},"bar"]), "foo!!bar");
    assert.equal(text.textToString([{substitution:"FOO",diff:"added",text:"foo"},"bar"]), "foobar");
  }));

  test("textToDisplayString", (() => {
    assert.equal(text.textToDisplayString("foo"), "foo");
    assert.equal(text.textToDisplayString(["foo","bar"]), "foobar");
    assert.equal(text.textToDisplayString([{scope:"aa",text:"foo"},"bar"]), "foobar");
    assert.equal(text.textToDisplayString([{scope:"aa",text:["foo","!!"]},"bar"]), "foo!!bar");
    assert.equal(text.textToDisplayString([{substitution:"FOO!!",diff:"added",text:"foo"},"bar"]), "FOO!!bar");
  }));

  test("textLength", (() => {
    assert.equal(text.textLength("foo"), 3);
    assert.equal(text.textLength(["foo","bar"]), 6);
    assert.equal(text.textLength([{scope:"aa",text:"foo"},"bar"]), 6);
    assert.equal(text.textLength([{scope:"aa",text:["foo","!!"]},"bar"]), 8);
    assert.equal(text.textLength([{substitution:"FOO",diff:"added",text:"foo"},"bar"]), 6);
  }));

  test("textDisplayLength", (() => {
    assert.equal(text.textDisplayLength("foo"), 3);
    assert.equal(text.textDisplayLength(["foo","bar"]), 6);
    assert.equal(text.textDisplayLength([{scope:"aa",text:"foo"},"bar"]), 6);
    assert.equal(text.textDisplayLength([{scope:"aa",text:["foo","!!"]},"bar"]), 8);
    assert.equal(text.textDisplayLength([{substitution:"FOO!!",diff:"added",text:"foo"},"bar"]), 8);
  }));

  test("normalizeText", (() => {
    assert.equal(text.normalizeText("foo"), "foo");
    assert.equal(text.normalizeText(["foo","bar"]), "foobar");
    assert.deepStrictEqual(text.normalizeText([{scope:"aa",text:"foo"},"bar"]), [{scope:"aa",text:"foo"},"bar"]);
    assert.deepStrictEqual(text.normalizeText([{scope:"aa",text:["foo","!!"]},"bar"]), [{scope:"aa",text:"foo!!"},"bar"]);
    assert.deepStrictEqual(text.normalizeText([{substitution:"FOO!!",diff:"added",text:"foo"},"bar"]), [{substitution:"FOO!!",diff:"added",text:"foo"},"bar"]);
    assert.deepStrictEqual(text.normalizeText([{scope:"aa",text:["foo","!!"]},{scope:"aa",text:["bar"]}]), {scope:"aa",text:"foo!!bar"});
    assert.deepStrictEqual(text.normalizeText([{scope:"aa",text:{scope:"",text:["foo","!!"]}},"bar"]), [{scope:"aa",text:"foo!!"},"bar"]);
    assert.deepStrictEqual(text.normalizeText([{scope:"aa",text:{scope:"",text:["foo","!!"]}},{scope:"aa",text:["bar"]}]), {scope:"aa",text:"foo!!bar"});
  }));

  test("mapAnnotation", (() => {    
    let hist : [string,text.Annotation,number,number][] = [];
    let x : text.AnnotatedText = "foo";
    assert.deepStrictEqual(text.mapAnnotation(x,(plainText,annotation,start, startD) => {
      hist.push([plainText,annotation,start, startD])
      return Object.assign(text.copyAnnotation(annotation),{text:plainText})
    }),{ text: 'foo' })
    assert.deepStrictEqual(hist, [["foo",{},0,0]]);
    //////
    hist = [];
    x = [{substitution: "bar!!", text: "foo"}, "def"]
    assert.deepStrictEqual(text.mapAnnotation(x,(plainText,annotation,start, startD) => {
      hist.push([plainText,annotation,start, startD])
      return Object.assign(text.copyAnnotation(annotation),{text:plainText})
    }),[{substitution: "bar!!", text: "foo"}, {text: "def"}])
    assert.deepStrictEqual(hist, [
      ["foo",{substitution: 'bar!!'},0,0],
      ["def",{},3,5]
      ]);
  }));

  test("diffText", (() => {
    assert.deepStrictEqual(text.diffText("aaaa","aabbaa").text, {diff:"added",text:"aabbaa"},"1: A");
    assert.deepStrictEqual(text.diffText("aa aa","aa bb aa").text, ["aa ",{diff:"added",text:"bb "},"aa"], "2: -A-");
    assert.deepStrictEqual(text.diffText("aa bb aa","aa aa").text, ["aa ","aa"], "3: -R-");
    assert.deepStrictEqual(text.diffText(["aa","aa"],["aa","bb","aa"]).text, [{diff:"added",text:"aa"},{diff:"added",text:"bb"},{diff:"added",text:"aa"}], "4: -A-");
    assert.deepStrictEqual(text.diffText({scope: "foo", text:"aa bb aa"},{scope: "bar", text: "aa aa"}).text, {scope: "bar", text: ["aa ","aa"]}, "5: -R-");
    assert.deepStrictEqual(text.diffText({diff: "added", text:"aa bb aa"},{scope: "bar", text: "aa aa"}).text, {scope: "bar", text: ["aa ","aa"]}, "6: -R-");
    assert.deepStrictEqual(text.diffText("aa bb aa",{scope: "bar", text: "aa aa"}).text, {scope: "bar", text: ["aa ","aa"]}, "7: -R-");
    assert.deepStrictEqual(text.diffText({substitution: "AA", text: "aa"},{substitution: "BBB", text: "aa"}).text, {diff: "added", substitution: "BBB", text: "aa"}, "8: subst A");
    assert.deepStrictEqual(text.diffText(
      {substitution: "AA AA", text:"aa aa"},
      {substitution: "AA BB AA", text: "aa bb aa"}).text,
      [{substitution:"AA ",text:"aa bb aa"},{diff:"added",substitution:"BB ",text:""},{substitution:"AA", text:""}], "9: subst -R-");
    assert.deepStrictEqual(text.diffText(
      [{substitution: "AA", text:"aa"},{substitution: "AA", text:"aa"}],
      [{substitution: "AA", text:"aa"},{substitution: "BB", text:"bb"},{substitution: "AA", text:"aa"}]).text,
      [{diff:"added", substitution: "AA", text:"aa"},{diff:"added", substitution: "BB", text:"bb"},{diff:"added", substitution: "AA", text:"aa"}], "10: subst -A-");
  }));

  // test("cancelAll: three lockers", asyncTest (async () => {
  //   const c = new CancellationSignal();
  //   const m = new Mutex();
  //   const unlock1 = await m.lock(c.event);
  //   const waitLock2 = m.lock(c.event);
  //   const waitLock3 = m.lock(c.event);
  //   c.cancel();
  //   try {
  //     await waitLock2;
  //     assert(false, 'Should not be able to acquire the cancelled lock');
  //   } catch(reason) {
  //      assert.equal(reason,Mutex.reasonCancelled,`lock() for the wrong reason`);
  //   }
  //   try {
  //     await waitLock3;
  //     assert(false, 'Should not be able to acquire the cancelled lock');
  //   } catch(reason) {
  //      assert.equal(reason,Mutex.reasonCancelled,`lock() for the wrong reason`);
  //   }
  //   await unlock1();
  //   assert(!m.isLocked());
  // }));

//   test("cancelAll: two lockers", asyncTest (async () => {
//     const m = new Mutex();
//     const unlock1 = await m.lock();
//     const waitLock = m.lock();
//     const waitCancelling = m.cancelAll();
//     try {
//       await waitLock;
//       assert(false, 'Should not be able to acquire the cancelled lock');
//     } catch(reason) {
//        assert.equal(reason,Mutex.reasonAllCancelled,`lock() for the wrong reason`);
//     }
//     await waitCancelling;
//     assert(m.isLocked()); // cancelling does not affect the current owner
//     await unlock1();
//     assert(!m.isLocked());
//   }));
// 
//   test("cancelAll: three lockers", asyncTest (async () => {
//     const m = new Mutex();
//     const unlock1 = await m.lock();
//     const waitLock2 = m.lock();
//     const waitLock3 = m.lock();
//     const waitCancelling = m.cancelAll();
//     try {
//       await waitLock2;
//       assert(false, 'Should not be able to acquire the cancelled lock');
//     } catch(reason) {
//        assert.equal(reason,Mutex.reasonAllCancelled,`lock() for the wrong reason`);
//     }
//     try {
//       await waitLock3;
//       assert(false, 'Should not be able to acquire the cancelled lock');
//     } catch(reason) {
//        assert.equal(reason,Mutex.reasonAllCancelled,`lock() for the wrong reason`);
//     }
//     await waitCancelling;
//     assert(m.isLocked()); // cancelling does not affect the current owner
//     await unlock1();
//     assert(!m.isLocked());
//   }));
  
});