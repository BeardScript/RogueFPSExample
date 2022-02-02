import * as RE from 'rogue-engine';
import { MathUtils, Object3D, Vector3 } from 'three';
import ParticleSystem from './ParticleSystem.re';

const v3Zero = new Vector3();

export default class FPSShooter extends RE.Component {
  @RE.Prop("Object3D") origin: Object3D;
  @RE.Prop("Prefab") projectile: RE.Prefab;
  @RE.Prop("Number") bulletSpeed: number = 50;
  @RE.Prop("Number") fireRate: number = 100;
  @RE.Prop("Number") magSize: number = 50;
  @RE.Prop("Number") reloadTime: number = 2500;
  @RE.Prop("Number") maxTilt: number = 0;
  @RE.Prop("Boolean") isShooting: boolean = false;
  @RE.Prop("Boolean") isReloading: boolean = false;

  private magazine: number = 0;
  private curReloadTime: number = 0;
  private timer: number = 0;

  private tiltDir: Vector3 = new Vector3();
  private muzzleFlash: ParticleSystem | undefined;

  start() {
    this.magazine = this.magSize;
    this.object3d.rotation.order = 'YXZ';

    if (this.origin) {
      this.muzzleFlash = RE.getComponent(ParticleSystem, this.origin);
      this.muzzleFlash && (this.muzzleFlash.maxTime = this.fireRate);
    }
  }

  update() {
    if (this.timer < this.fireRate) {
      this.timer += RE.Runtime.deltaTime * 1000;
    }

    if (this.isReloading && this.curReloadTime < this.reloadTime) {
      return this.reload();
    }

    this.rotY = 0;
    this.curReloadTime = 0;
    this.restoreRotation(this.object3d);

    this.muzzleFlash && (this.muzzleFlash.isActive = this.magazine > 0 && this.isShooting);
    
    if (this.isShooting) {
      this.shoot();
    }
  }

  rotY = 0;

  reload() {
    this.object3d.rotation.setFromVector3(
      this.object3d.rotation.toVector3().lerp(new Vector3(0, MathUtils.degToRad(70), 0), 10 * RE.Runtime.deltaTime)
    );

    this.curReloadTime += RE.Runtime.deltaTime * 1000;
    if (this.curReloadTime >= this.reloadTime) {
      this.isReloading = false;
      this.magazine = this.magSize;
    }
  }

  tilt() {
    this.tiltDir = new Vector3(Math.random(), Math.random(), Math.random()).normalize();
    this.object3d.rotateOnAxis(this.tiltDir, this.maxTilt);

    const barrel = this.origin || this.object3d;

    if (barrel !== this.object3d) {
      this.restoreRotation(barrel);
      barrel.rotateOnAxis(this.tiltDir, this.maxTilt);
    }
  }

  restoreRotation(object: Object3D) {
    object.rotation.setFromVector3(v3Zero);
  }

  canShoot() {
    if (
      this.timer >= this.fireRate &&
      this.projectile &&
      !this.isReloading &&
      this.magazine > 0
    ) {
      return true;
    }

    return false;
  }

  shoot() {
    if (!this.canShoot()) return;

    const parent = RE.App.currentScene.getObjectByName("Projectiles");
    const projectile: Object3D = this.projectile.instantiate(parent);

    if (!projectile) return;

    const barrel = this.origin || this.object3d;

    this.tilt();

    const worldDir = new Vector3();
    const worldPos = new Vector3();
    barrel.getWorldDirection(worldDir);
    barrel.getWorldPosition(worldPos);

    barrel.getWorldPosition(projectile.position);
    projectile.lookAt(worldPos.add(worldDir));

    this.timer = 0;
    this.magazine--;
  }
}

RE.registerComponent(FPSShooter);
