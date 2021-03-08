// Emulates the wallpaper engine api
const mouseEvents = require('global-mouse-events');

window.mouseIsOnScreen = false;
window.jsOffsetX = window.jsOffsetY = 0; // Default

HTMLCanvasElement.prototype.addEventListener = (eName, listener) => window.addEventListener(eName, listener);

mouseEvents.on("mouseup", event => {
  const newEvent = new Event('mouseup', event);
  window.dispatchEvent(newEvent);
});

mouseEvents.on("mousedown", event => {
  const newEvent = new Event('mousedown', event);
  window.dispatchEvent(newEvent);
});

mouseEvents.on("mousemove", event => {
  if (event.x - jsOffsetX < 0 || event.y - jsOffsetY < 0 || event.x - jsOffsetX > window.innerWidth || event.y - jsOffsetY > window.innerHeight) {
    if (window.mouseIsOnScreen) {
        window.mouseIsOnScreen = false;
        window.dispatchEvent(new Event('mouseleave', { isTrusted: true, screenX: event.x - jsOffsetX, screenY: event.y - jsOffsetY, clientX: event.x - jsOffsetX, clientY: event.y - jsOffsetY }));
    }
  } else {
      if (!window.mouseIsOnScreen) {
        window.mouseIsOnScreen = true;
        window.dispatchEvent(new Event('mouseenter', { isTrusted: true, screenX: event.x - jsOffsetX, screenY: event.y - jsOffsetY, clientX: event.x - jsOffsetX, clientY: event.y - jsOffsetY }));
      }
  }
  const newEvent = new Event('mousemove');
  newEvent.x = newEvent.offsetX = newEvent.screenX = newEvent.clientX = event.x - jsOffsetX;
  newEvent.y = newEvent.offsetY = newEvent.screenY = newEvent.clientY = event.y - jsOffsetY;
  window.dispatchEvent(newEvent);
});

mouseEvents.on("mousewheel", event => {
  const newEvent = new Event('mousewheel', event);
  window.dispatchEvent(newEvent);
});

window.wallpaperRegisterAudioListener = (wallpaperAudioListener) => {
    // Not implemented
}

window.addEventListener('DOMContentLoaded', () => {
    const waitForWallpaper = setInterval(() => {
        if (window.noproject) {
            clearInterval(waitForWallpaper);
            return;
        }
        if (window.wallpaperPropertyListener === undefined || window.wallpaperPropertyListener.applyUserProperties === undefined || window.project === undefined) {
            return;
        }
        window.wallpaperPropertyListener.applyUserProperties(window.project.general.properties);
        clearInterval(waitForWallpaper);
    }, 100);
})