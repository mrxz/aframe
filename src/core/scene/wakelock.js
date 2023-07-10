
var wakelockSentinel;
module.exports = function initWakelock (scene) {
  if (!scene.isMobile || !navigator.wakeLock) { return; }

  scene.addEventListener('enter-vr', function () {
    navigator.wakeLock.request().then(function (sentinel) {
      wakelockSentinel = sentinel;
    });
  });
  scene.addEventListener('exit-vr', function () {
    if(wakelockSentinel) {
      wakelockSentinel.release();
      wakelockSentinel = undefined;
    }
  });
};
