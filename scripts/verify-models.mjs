import assert from "node:assert/strict";
import { createBalloon, createCloud, createGarden, createIntroTulip, createPlanet, createPlanetPlants, createPond } from "../src/components/models.js";

function verify(name, geometry) {
  const positions = geometry.attributes.position;
  assert.ok(positions?.count > 0, `${name}: missing vertices`);
  for (const [attribute, values] of Object.entries(geometry.attributes)) {
    assert.equal(values.count, positions.count, `${name}: mismatched ${attribute}`);
    assert.ok(values.array.every(Number.isFinite), `${name}: invalid ${attribute}`);
  }
  assert.ok(geometry.attributes.normal, `${name}: missing normals`);
  const triangles = (geometry.index?.count ?? positions.count) / 3;
  assert.ok(triangles < 100000, `${name}: excessive geometry`);
  console.log(`${name}: ${triangles} triangles`);
  geometry.dispose();
}

verify("planet", createPlanet());
verify("landscape", createPlanetPlants([-0.41, -1.21, -2.03, -2.8, 2.7]));
verify("cloud", createCloud());
for (let index = 0; index < 5; index++) {
  for (const [part, geometry] of Object.entries(createGarden(index))) verify(`garden-${index}/${part}`, geometry);
}
for (const [part, geometry] of Object.entries(createBalloon())) verify(`balloon/${part}`, geometry);
for (const [part, geometry] of Object.entries(createPond())) verify(`pond/${part}`, geometry);
const bud = createIntroTulip(0);
const flower = createIntroTulip(1);
assert.equal(bud.petals.attributes.position.count, flower.petals.attributes.position.count, "bloom morph topology");
for (const [part, geometry] of Object.entries(bud)) verify(`bud/${part}`, geometry);
for (const [part, geometry] of Object.entries(flower)) verify(`bloom/${part}`, geometry);
console.log("All procedural models passed.");
