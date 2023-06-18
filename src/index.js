window.hasNativeWebXRImplementation = navigator.xr !== undefined;

var utils = require('./utils/');
var debug = utils.debug;

var error = debug('A-Frame:error');
var warn = debug('A-Frame:warn');

if (window.document.currentScript && window.document.currentScript.parentNode !==
    window.document.head && !window.debug) {
  warn('Put the A-Frame <script> tag in the <head> of the HTML *before* the scene to ' +
       'ensure everything for A-Frame is properly registered before they are used from ' +
       'HTML.');
}

// Error if not using a server.
if (!window.cordova && window.location.protocol === 'file:') {
  error(
    'This HTML file is currently being served via the file:// protocol. ' +
    'Assets, textures, and models WILL NOT WORK due to cross-origin policy! ' +
    'Please use a local or hosted server: ' +
    'https://aframe.io/docs/1.4.0/introduction/installation.html#use-a-local-server.');
}

// CSS.
if (utils.device.isBrowserEnvironment) {
  require('./style/aframe.css');
}

// Required before `AEntity` so that all components are registered.
var AScene = require('./core/scene/a-scene').AScene;
var components = require('./core/component').components;
var registerComponent = require('./core/component').registerComponent;
var registerGeometry = require('./core/geometry').registerGeometry;
var registerPrimitive = require('./extras/primitives/primitives').registerPrimitive;
var registerShader = require('./core/shader').registerShader;
var registerSystem = require('./core/system').registerSystem;
var shaders = require('./core/shader').shaders;
var systems = require('./core/system').systems;
// Exports THREE to window so three.js can be used without alteration.
var THREE = window.THREE = require('./lib/three');

// require('./components/index'); // Register standard components.
require('./components/camera');
require('./components/material');
require('./components/position');
require('./components/scale');
require('./components/rotation');
require('./components/visible');
require('./components/light');
require('./components/look-controls');
require('./components/wasd-controls');
require('./components/geometry');
require('./components/scene/background');
require('./components/scene/device-orientation-permission-ui');
require('./components/scene/fog');
require('./components/scene/pool');
require('./components/scene/vr-mode-ui');
require('./geometries/box');
require('./geometries/plane');
require('./geometries/cylinder');
require('./geometries/sphere');
require('./shaders/flat');
require('./shaders/standard');
require('./systems/camera');
require('./systems/geometry');
require('./systems/light');
require('./systems/material');
require('./systems/renderer');
require('./systems/tracked-controls-webxr');
require('./systems/webxr');
var ANode = require('./core/a-node').ANode;
var AEntity = require('./core/a-entity').AEntity; // Depends on ANode and core components.

require('./core/a-assets');
require('./core/a-cubemap');
require('./core/a-mixin');

// Extras.
// require('./extras/components/');
// require('./extras/primitives/');
require('./extras/primitives/primitives/a-camera');
require('./extras/primitives/primitives/meshPrimitives');

console.log('A-Frame Version: 1.4.2 (Date 2023-07-06, Commit #d74c46ff)');
console.log('THREE Version (https://github.com/supermedium/three.js):', THREE.REVISION);

module.exports = window.AFRAME = {
  AComponent: require('./core/component').Component,
  AEntity: AEntity,
  ANode: ANode,
  // ANIME: require('super-animejs').default,
  AScene: AScene,
  components: components,
  coreComponents: Object.keys(components),
  geometries: require('./core/geometry').geometries,
  registerComponent: registerComponent,
  registerGeometry: registerGeometry,
  registerPrimitive: registerPrimitive,
  registerShader: registerShader,
  registerSystem: registerSystem,
  primitives: {
    getMeshMixin: require('./extras/primitives/getMeshMixin'),
    primitives: require('./extras/primitives/primitives').primitives
  },
  scenes: require('./core/scene/scenes'),
  schema: require('./core/schema'),
  shaders: shaders,
  systems: systems,
  THREE: THREE,
  utils: utils,
  version: require('./constants').AFRAME_VERSION
};
