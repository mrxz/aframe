import * as SUPER_THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator';

var THREE = window.THREE = Object.assign({}, SUPER_THREE);

// TODO: Eventually include these only if they are needed by a component.
// require('../../vendor/DeviceOrientationControls'); // THREE.DeviceOrientationControls
// THREE.DRACOLoader = DRACOLoader;
THREE.GLTFLoader = GLTFLoader;
// THREE.KTX2Loader = KTX2Loader;
// THREE.OBJLoader = OBJLoader;
// THREE.MTLLoader = MTLLoader;
THREE.BufferGeometryUtils = BufferGeometryUtils;
THREE.LightProbeGenerator = LightProbeGenerator;

export default THREE;
