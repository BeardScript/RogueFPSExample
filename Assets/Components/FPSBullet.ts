import * as RE from 'rogue-engine';
import { Material, Mesh, Raycaster, Vector3 } from 'three';
import { DecalGeometry } from '../Classes/DecalGeometry';

const decalHelper = new Mesh();

export default class FPSBullet extends RE.Component {
  @RE.Prop("Number") speed: number = 50;
  @RE.Prop("Number") distance: number = 20;
  @RE.Prop("Material") decal: Material;
  @RE.Prop("Prefab") hitParticles: RE.Prefab;

  private origin: Vector3;
  private lastPosition: Vector3 = new Vector3();
  private raycaster: Raycaster = new Raycaster();

  private collided = false;

  update() {
    if (this.collided) return;
    if (!this.origin) {
      this.origin = new Vector3();
      this.object3d.getWorldPosition(this.origin);
    } 

    this.object3d.getWorldPosition(this.lastPosition);
    this.object3d.translateZ(-this.speed * RE.Runtime.deltaTime);

    let worldPos: Vector3 = new Vector3();
    this.object3d.getWorldPosition(worldPos);

    const worldDir = this.lastPosition.clone().sub(worldPos).normalize().negate();

    this.raycaster.set(this.lastPosition, worldDir);
    this.raycaster.far = this.lastPosition.distanceTo(worldPos);

    const intersects = this.raycaster.intersectObject(RE.App.currentScene, true);

    for (let i = 0; i < intersects.length; i++) {
      const intersection = intersects[i];
      const obj = intersection.object;

      if (obj.userData.isParticle) continue;

      if (obj.parent === this.object3d) continue;

      const orientationVector = intersection.face?.normal || this.raycaster.ray.direction;

      decalHelper.position.copy(orientationVector);

      const orientationClone = orientationVector.clone();
      orientationClone.transformDirection( obj.matrixWorld );
      orientationClone.multiplyScalar( 10 );
      orientationClone.add( intersection.point );

      decalHelper.lookAt( orientationClone );

      const orientation = decalHelper.rotation.clone();
      orientation.z = Math.random() * 2 * Math.PI;

      const scale = 0.1;
      const size = new Vector3( scale, scale, scale );

      const decalGeometry = new DecalGeometry( obj, intersection.point, orientation, size ) as any
      const decalMesh = new Mesh( decalGeometry, this.decal );

      const parent = RE.App.currentScene.getObjectByName("Projectiles");
      parent?.add(decalMesh);

      const particles = this.hitParticles.instantiate(parent);
      particles.position.copy(intersection.point);

      this.object3d.parent?.remove(this.object3d);
      break;
    }

    if (worldPos.distanceTo(this.origin) >= this.distance) {
      this.object3d.parent?.remove(this.object3d);
    }
  }

  isNotSelf(target, object) {

  }
}

RE.registerComponent(FPSBullet);
