import assert from "node:assert/strict";
import { mergeSelection, booleanMeasurement, elementPolygons } from "../../published-site/assets/boolean-geometry.js";
import { booleanPath } from "../../published-site/assets/boolean-geometry.js";

let id = 0;
const rectangle = (x,y,width,height, extra={}) => ({ id: "s"+(++id),type:"rectangle",x,y,width,height,angle:0,
  backgroundColor:"#e03131",strokeColor:"#000000",strokeWidth:1,fillStyle:"hachure",opacity:100,customData:{icnAreaFill:{x:.5,y:.5}},...extra });
function mock(shapes) {
  let elements = shapes, state={selectedElementIds:Object.fromEntries(shapes.map(e=>[e.id,true]))};
  return {
    getSceneElements:()=>elements.filter(e=>!e.isDeleted), getSceneElementsIncludingDeleted:()=>elements,
    getAppState:()=>state, updateScene:patch=>{elements=patch.elements;state={...state,...patch.appState}},
  };
}
function merge(shapes) {
  const api=mock(shapes);
  assert.ok(mergeSelection(api,x=>x.map(e=>({...e,id:"merged-"+(++id)})),(e,p)=>({...e,...p}),"IMMEDIATELY"));
  const result=api.getSceneElements()[0];
  assert.equal(api.getSceneElements().length,1);
  return result;
}
const overlap=merge([rectangle(0,0,100,100),rectangle(50,50,100,100)]);
assert.equal(booleanMeasurement(overlap).value,17500);
assert.equal(overlap.customData.icnBoolean.polygons.length,1);
const hole=merge([rectangle(0,0,100,20),rectangle(0,80,100,20),rectangle(0,20,20,60),rectangle(80,20,20,60)]);
assert.equal(booleanMeasurement(hole).value,6400);
assert.equal(hole.customData.icnBoolean.polygons[0].length,2);
assert.equal(booleanPath(hole).match(/M/g).length,2);
const disjoint=merge([rectangle(0,0,100,100),rectangle(200,0,100,100)]);
assert.equal(disjoint.customData.icnBoolean.polygons.length,2);
assert.equal(booleanMeasurement(disjoint).value,20000);
assert.equal(booleanPath(disjoint).match(/M/g).length,2);
const contained=merge([rectangle(0,0,100,100),rectangle(20,20,30,30)]);
assert.equal(booleanMeasurement(contained).value,10000);
const repeated=merge([hole,rectangle(20,20,60,60)]);
assert.equal(booleanMeasurement(repeated).value,10000);
const scaled={...hole,width:200,height:200};
assert.equal(booleanMeasurement(scaled).value,25600);
assert.ok(elementPolygons({...scaled,angle:Math.PI/4}));
console.log("Union overlap, containment, holes, disjoint islands, repeated merge and scaled area passed.");
