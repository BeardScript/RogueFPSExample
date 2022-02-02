import * as RE from 'rogue-engine';
import Ammo from './ammo.wasm';
import * as THREE from 'three';

let onUpdate: {stop: () => void};

export class AmmoPhysics {
	static ammo: typeof Ammo | undefined;
	static collisionConfiguration: Ammo.btDefaultCollisionConfiguration;
	static dispatcher: Ammo.btCollisionDispatcher;
	static broadphase: Ammo.btDbvtBroadphase;
	static solver: Ammo.btSequentialImpulseConstraintSolver;
	static world: Ammo.btDiscreteDynamicsWorld;
	static worldTransform: Ammo.btTransform;

	static isRunning: boolean = false;
	static meshMap: Map<THREE.Mesh, any> = new Map();
	static meshes: THREE.Mesh[] = [];

	static async init() {
		this.ammo = await Ammo();

		this.collisionConfiguration = new this.ammo.btDefaultCollisionConfiguration();
		this.dispatcher = new this.ammo.btCollisionDispatcher( this.collisionConfiguration );
		this.broadphase = new this.ammo.btDbvtBroadphase();
		this.solver = new this.ammo.btSequentialImpulseConstraintSolver();
		this.world = new this.ammo.btDiscreteDynamicsWorld( this.dispatcher, this.broadphase, this.solver, this.collisionConfiguration );
		this.world
		.getBroadphase()
		.getOverlappingPairCache()
		.setInternalGhostPairCallback(new this.ammo.btGhostPairCallback());
		this.world.setGravity( new this.ammo.btVector3( 0, - 9.8, 0 ) );

		this.worldTransform = new this.ammo.btTransform();

		onUpdate = RE.onUpdate(() => {
			try {
				this.step();
			} catch (e) {
				RE.Debug.logError(e);
			}
		});

		RE.Runtime.onStop(() => {
			onUpdate.stop();
			this.isRunning = false;
			this.meshes = [];
			this.meshMap = new Map();

			if (!this.ammo) return;

			this.ammo.destroy(this.world);
			this.ammo.destroy(this.solver);
			this.ammo.destroy(this.broadphase);
			this.ammo.destroy(this.dispatcher);
			this.ammo.destroy(this.collisionConfiguration);
			this.ammo = undefined;
		});

		this.isRunning = true;
	}

	static getShape(mesh: THREE.Mesh) {
		if (!this.ammo) return;

		const geometry: THREE.BufferGeometry = mesh.geometry;
		let scale: THREE.Vector3 = new THREE.Vector3();
		mesh.getWorldScale(scale);

		if (!this.isRunning) return;

		if ( geometry instanceof THREE.BoxGeometry || geometry instanceof THREE.BoxBufferGeometry ) {
			const parameters = geometry.parameters;

			const sx = parameters.width !== undefined ? parameters.width / 2 : 0.5;
			const sy = parameters.height !== undefined ? parameters.height / 2 : 0.5;
			const sz = parameters.depth !== undefined ? parameters.depth / 2 : 0.5;

			const shape = new this.ammo.btBoxShape( new this.ammo.btVector3( sx * scale.x, sy * scale.y, sz * scale.z ) );
			shape.setMargin( 0.05 );

			return shape;
		}
		else if (
			geometry instanceof THREE.SphereGeometry || geometry instanceof THREE.IcosahedronGeometry ||
			geometry instanceof THREE.SphereBufferGeometry || geometry instanceof THREE.IcosahedronBufferGeometry
		) {
			const parameters = geometry.parameters;

			const radius = parameters.radius !== undefined ? parameters.radius : 1;

			const shape = new this.ammo.btSphereShape( radius * Math.max(scale.x, scale.y, scale.z) );
			shape.setMargin( 0.05 );

			return shape;
		}

		if (!(geometry instanceof THREE.BufferGeometry)) return;

		let vertices = geometry.attributes.position.array;
		let indices = geometry.index?.array as ArrayLike<number>;

		const btMesh = new this.ammo.btTriangleMesh(true, true);
		btMesh.setScaling(new this.ammo.btVector3(scale.x, scale.y, scale.z));

		for (let i = 0; i * 3 < indices.length; i++) {
			btMesh.addTriangle(
				new this.ammo.btVector3(vertices[indices[i * 3] * 3], vertices[indices[i * 3] * 3 + 1], vertices[indices[i * 3] * 3 + 2]),
				new this.ammo.btVector3(vertices[indices[i * 3 + 1] * 3], vertices[indices[i * 3 + 1] * 3 + 1], vertices[indices[i * 3 + 1] * 3 + 2]),
				new this.ammo.btVector3(vertices[indices[i * 3 + 2] * 3], vertices[indices[i * 3 + 2] * 3 + 1], vertices[indices[i * 3 + 2] * 3 + 2]),
				false
			);
		}

		const shape = new this.ammo.btBvhTriangleMeshShape(btMesh, true, true);
		// shape.setMargin( 0.05 );

		return shape;
	}

	static addMesh(mesh: THREE.Mesh, mass = 0) {
		if (!this.ammo) return;
		if (!this.isRunning) return;
		const shape = this.getShape( mesh );

		let rigidbody: Ammo.btRigidBody | undefined;

		if ( shape !== null ) {
			if ( mesh instanceof THREE.InstancedMesh ) {
				this.handleInstancedMesh( mesh, mass, shape );
			} else if ( mesh ) {
				rigidbody = this.handleMesh( mesh, mass, shape );
			}
		}

		return {shape, rigidbody};
	}

	private static handleMesh(mesh: THREE.Mesh, mass: number, shape: any) {
		if (!this.ammo) return;

		let position = new THREE.Vector3();
		let quaternion = new THREE.Quaternion();

		mesh.getWorldPosition(position);
		mesh.getWorldQuaternion(quaternion);

		const transform = new this.ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin( new this.ammo.btVector3( position.x, position.y, position.z ) );
		transform.setRotation( new this.ammo.btQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w ) );

		const motionState = new this.ammo.btDefaultMotionState( transform );

		const localInertia = new this.ammo.btVector3( 0, 0, 0 );

		if ( mass > 0 ) {
			shape.calculateLocalInertia( mass, localInertia );
		}

		const rbInfo = new this.ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );

		const body = new this.ammo.btRigidBody( rbInfo );
		// if ( isKinematic ) {
		// 	body.setActivationState(4);
		// 	body.setCollisionFlags(2);
		// }

		this.world.addRigidBody( body );

		if ( mass > 0 ) {
			this.meshes.push( mesh );
			this.meshMap.set( mesh, body );
		}

		return body;
	}

	private static handleInstancedMesh(mesh, mass, shape) {
		if (!this.ammo) return;

		const array = mesh.instanceMatrix.array;

		const bodies: any = [];

		for ( let i = 0; i < mesh.count; i ++ ) {
			const index = i * 16;

			const transform = new this.ammo.btTransform();
			transform.setFromOpenGLMatrix( array.slice( index, index + 16 ) );

			const motionState = new this.ammo.btDefaultMotionState( transform );

			const localInertia = new this.ammo.btVector3( 0, 0, 0 );
			shape.calculateLocalInertia( mass, localInertia );

			const rbInfo = new this.ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );

			const body = new this.ammo.btRigidBody( rbInfo );
			this.world.addRigidBody( body );

			bodies.push( body );
		}

		if ( mass > 0 ) {
			mesh.instanceMatrix.setUsage( 35048 );
			this.meshes.push( mesh );

			this.meshMap.set( mesh, bodies );
		}
	}

	static addCharacter() {
		if (!this.ammo) return;

		const shape = new this.ammo.btCapsuleShape(0.3, 1);

		shape.setMargin( 0.05 );

		const ghostObject = new this.ammo.btPairCachingGhostObject();
		const transform = new this.ammo.btTransform();

		transform.setIdentity();
		transform.setOrigin(new this.ammo.btVector3(0, 0, 0));
		transform.setRotation(new this.ammo.btQuaternion(0, 0, 0, 1));

		ghostObject.setWorldTransform(transform);
		ghostObject.setCollisionShape(shape);
		ghostObject.setCollisionFlags(ghostObject.getCollisionFlags() | 16);
		ghostObject.setActivationState(4);
  	ghostObject.activate(true);

		const controller = new this.ammo.btKinematicCharacterController(ghostObject, shape, 0.1, 1);
		controller.setUseGhostSweepTest(true);

		controller.setGravity(-this.world.getGravity().y());
		controller.setMaxSlope(Math.PI / 3);

		this.world.addCollisionObject(ghostObject, 32, -1 );
		this.world.addAction(controller);

		return {
			shape,
			ghostObject,
			controller,
		}
	}

	static setMeshPosition(mesh, position, index = 0) {
		if (!this.ammo) return;
		if (!this.isRunning) return;

		if ( mesh.isInstancedMesh ) {
			const bodies = this.meshMap.get( mesh );
			const body = bodies[ index ];

			body.setAngularVelocity( new this.ammo.btVector3( 0, 0, 0 ) );
			body.setLinearVelocity( new this.ammo.btVector3( 0, 0, 0 ) );

			this.worldTransform.setIdentity();
			this.worldTransform.setOrigin( new this.ammo.btVector3( position.x, position.y, position.z ) );
			body.setWorldTransform( this.worldTransform );
		} else if ( mesh.isMesh ) {
			const body = this.meshMap.get( mesh );

			body.setAngularVelocity( new this.ammo.btVector3( 0, 0, 0 ) );
			body.setLinearVelocity( new this.ammo.btVector3( 0, 0, 0 ) );

			this.worldTransform.setIdentity();
			this.worldTransform.setOrigin( new this.ammo.btVector3( position.x, position.y, position.z ) );
			body.setWorldTransform( this.worldTransform );
		}
	}

	private static step() {
		if (!this.ammo) return;

		this.world.stepSimulation( RE.Runtime.deltaTime, 10 );

		for ( let i = 0, l = this.meshes.length; i < l; i ++ ) {
			const mesh = this.meshes[ i ];

			if ( mesh instanceof THREE.InstancedMesh ) {
				const array = mesh.instanceMatrix.array;
				const bodies = this.meshMap.get( mesh );

				for ( let j = 0; j < bodies.length; j ++ ) {
					const body = bodies[ j ];

					const motionState = body.getMotionState();
					motionState.getWorldTransform( this.worldTransform );

					const position = this.worldTransform.getOrigin();
					const quaternion = this.worldTransform.getRotation();

					compose( position, quaternion, array, j * 16 );
				}

				mesh.instanceMatrix.needsUpdate = true;

			} else if (mesh) {
				const body = this.meshMap.get( mesh );

				const motionState = body.getMotionState();
				motionState.getWorldTransform( this.worldTransform );

				const position = this.worldTransform.getOrigin();
				const quaternion = this.worldTransform.getRotation();

				let localPos = new THREE.Vector3(position.x(), position.y(), position.z());
				let localRot = new THREE.Quaternion(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());

				mesh.parent?.worldToLocal(localPos);

				mesh.position.copy(localPos);

				let a = new THREE.Matrix4();
				let b = new THREE.Matrix4();
				let c = new THREE.Matrix4();

				a.makeRotationFromQuaternion(localRot);
				mesh.updateMatrixWorld();
				b.getInverse((mesh.parent as THREE.Object3D).matrixWorld);
				c.extractRotation(b);
				a.premultiply(c);
				mesh.quaternion.setFromRotationMatrix(a);
			}
		}
	}
}

function compose( position, quaternion, array, index ) {

	const x = quaternion.x(), y = quaternion.y(), z = quaternion.z(), w = quaternion.w();
	const x2 = x + x, y2 = y + y, z2 = z + z;
	const xx = x * x2, xy = x * y2, xz = x * z2;
	const yy = y * y2, yz = y * z2, zz = z * z2;
	const wx = w * x2, wy = w * y2, wz = w * z2;

	array[ index + 0 ] = ( 1 - ( yy + zz ) );
	array[ index + 1 ] = ( xy + wz );
	array[ index + 2 ] = ( xz - wy );
	array[ index + 3 ] = 0;

	array[ index + 4 ] = ( xy - wz );
	array[ index + 5 ] = ( 1 - ( xx + zz ) );
	array[ index + 6 ] = ( yz + wx );
	array[ index + 7 ] = 0;

	array[ index + 8 ] = ( xz + wy );
	array[ index + 9 ] = ( yz - wx );
	array[ index + 10 ] = ( 1 - ( xx + yy ) );
	array[ index + 11 ] = 0;

	array[ index + 12 ] = position.x();
	array[ index + 13 ] = position.y();
	array[ index + 14 ] = position.z();
	array[ index + 15 ] = 1;

}
