import * as RE from 'rogue-engine';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import Ammo from '../Classes/ammo.wasm';
import { AmmoPhysics } from '../Classes/AmmoPhysics';
import FPSShooter from './FPSShooter.re';

const fwdDirection = new Vector3(0, 0, -1);
const bwdDirection = new Vector3(0, 0, 1);
const leftDirection = new Vector3(-1, 0, 0);
const rightDirection = new Vector3(1, 0, 0);

export default class FPSController extends RE.Component {
  @RE.Prop("Number") rotSpeed: number = 1;
  @RE.Prop("Number") minCameraRotY: number = 2.2;
  @RE.Prop("Number") maxCameraRotY: number = 4.5;
  @RE.Prop("Number") walkSpeed: number = 3;
  @RE.Prop("Number") fwdSpeedMultiplier: number = 1.3;
  @RE.Prop("Number") runSpeedMultiplier: number = 1.8;
  @RE.Prop("Number") jumpHeight: number = 0.5;
  @RE.Prop("Number") jumpSpeed: number = 50;
  @RE.Prop("Object3D") mainWeapon: Object3D;

  mainWeaponShooter: FPSShooter;
  camera: PerspectiveCamera;
  cameraPos: Object3D;

  character: {
    shape: Ammo.btCapsuleShape;
    ghostObject: Ammo.btPairCachingGhostObject;
    controller: Ammo.btKinematicCharacterController;
  } | undefined;
  characterDirection;

  awake() {
    RE.Input.mouse.lock();

    this.cameraPos = this.object3d.getObjectByName("CameraPosition") as Object3D;

    if (!this.cameraPos) {
      throw "Couldn't find child CemeraPosition";
    }

    this.camera = new PerspectiveCamera();
    RE.App.currentScene.add(this.camera);

    RE.App.activeCamera = this.camera.uuid;

    this.camera.position.copy(this.cameraPos.position);

    const appContainer = document.getElementById("rogue-app");

    if (!appContainer) return;

    appContainer.onmousedown = (e) => {
      RE.Input.mouse.lock();
    }

    RE.Runtime.onStop(() => {
      if (!appContainer) return;
  
      appContainer.onmousedown = null;
    });

    this.camera.rotation.order = 'YXZ';
    this.object3d.rotation.order = 'YXZ';
  }

  update() {
    if (!AmmoPhysics.isRunning) return;

    if (AmmoPhysics.isRunning && !this.character) {
      this.character = AmmoPhysics.addCharacter();
      if (this.character !== undefined) {
        this.character.controller.setJumpSpeed(this.jumpSpeed);
        this.character.controller.setMaxJumpHeight(this.jumpHeight);
      }
    }

    if (!this.character) return;

    if (this.mainWeapon && !this.mainWeaponShooter) {
      const mainWeaponShooter = RE.getComponent(FPSShooter, this.mainWeapon);
      if (!mainWeaponShooter) {
        RE.Debug.logError("Weapon is missing the Shooter component");
      } else {
        this.mainWeaponShooter = mainWeaponShooter;
      }
    }

    if (RE.Input.mouse.isLeftButtonPressed && this.mainWeaponShooter && document.pointerLockElement) {
      this.mainWeaponShooter.isShooting = true;
    } else {
      this.mainWeaponShooter.isShooting = false;
    }

    if (RE.Input.keyboard.getKeyDown("KeyR")) {
      this.mainWeaponShooter.isReloading = true;
    }

    const deltaTime = RE.Runtime.deltaTime;

    if (RE.Input.mouse.isMoving && document.pointerLockElement) {
      const mouseDeltaX = RE.Input.mouse.movementX * this.rotSpeed * deltaTime;
      const mouseDeltaY = RE.Input.mouse.movementY * this.rotSpeed * deltaTime;

      this.camera.rotation.set(
        this.camera.rotation.x - mouseDeltaY,
        this.camera.rotation.y - mouseDeltaX,
        this.camera.rotation.z
      );

      this.object3d.rotation.set(
        this.object3d.rotation.x,
        this.object3d.rotation.y - mouseDeltaX,
        this.object3d.rotation.z
      );

      this.camera.rotation.x = Math.max(this.minCameraRotY, Math.min(this.maxCameraRotY, this.camera.rotation.x));

      this.cameraPos.rotation.x = this.camera.rotation.x;
    }

    RE.Input.keyboard.getKeyPressed("Escape") && RE.Input.mouse.unlock();

    let actualSpeed = this.walkSpeed;
    let onlyFwd = true;

    const movementVector = new Vector3();

    if (RE.Input.keyboard.getKeyDown("Space")) {
      this.character.controller.jump();
    }

    if (RE.Input.keyboard.getKeyPressed("KeyW")) {
      movementVector.add(fwdDirection);
    }
    
    else if (RE.Input.keyboard.getKeyPressed("KeyS")) {
      movementVector.add(bwdDirection);
      onlyFwd = false;
    }

    if (RE.Input.keyboard.getKeyPressed("KeyA")) {
      movementVector.add(leftDirection);
      onlyFwd = false;
    }

    else if (RE.Input.keyboard.getKeyPressed("KeyD")) {
      movementVector.add(rightDirection);
      onlyFwd = false;
    }

    if (onlyFwd) {
      if (RE.Input.keyboard.getKeyPressed("ShiftLeft") && !this.mainWeaponShooter.isReloading)
        actualSpeed *= this.runSpeedMultiplier;
      else if (!this.mainWeaponShooter.isReloading)
        actualSpeed *= this.fwdSpeedMultiplier;
    }

    movementVector.normalize();

    if (!AmmoPhysics.ammo) return;

    if (movementVector.length() > 0) {
      movementVector.copy(movementVector.transformDirection(this.object3d.matrix).multiplyScalar(actualSpeed * deltaTime));
      const v3 = new AmmoPhysics.ammo.btVector3(movementVector.x, movementVector.y, movementVector.z);
      this.character.controller.setWalkDirection(v3);
    } else {
      this.character.controller.setWalkDirection(new AmmoPhysics.ammo.btVector3(0,0,0));
    }

    const pos = this.character.ghostObject.getWorldTransform().getOrigin();
    const halfHeight = this.character.shape.getHalfHeight();
    this.object3d.position.set(pos.x(), pos.y() - halfHeight, pos.z());

    this.camera.position.set(
      this.object3d.position.x,
      this.object3d.position.y + 1,
      this.object3d.position.z
    );
  }
}

RE.registerComponent(FPSController);
