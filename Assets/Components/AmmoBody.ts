import * as RE from 'rogue-engine';
import { Mesh, Vector3 } from 'three';
import Ammo from '../Classes/ammo.wasm';
import { AmmoPhysics } from '../Classes/AmmoPhysics';

export default class AmmoBody extends RE.Component {
  @RE.Prop("Number") mass = 0;
  @RE.Prop("Boolean") recursive = false;

  shape: Ammo.btCollisionShape | undefined;
  rigidBody: Ammo.btRigidBody | undefined;

  start() {
    this.recursive &&
    this.object3d.traverse(child => {
      child instanceof Mesh && RE.addComponent(new AmmoBody("AmmoBody", child));
    });
  }

  update() {
    if (!(this.object3d instanceof Mesh)) return;

    if (!AmmoPhysics.isRunning) return;

    if(!this.shape) {
      const info = AmmoPhysics.addMesh(this.object3d, this.mass);
      this.shape = info?.shape;
      this.rigidBody = info?.rigidbody;
    }
  }
}

RE.registerComponent(AmmoBody);
