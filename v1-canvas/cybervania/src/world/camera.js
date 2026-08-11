/* CYBERVANIA — world/camera.js
   Smooth follow with look-ahead, a dead zone, room clamping, and targeted overrides
   for boss arenas and layer transitions (rule 39). Never snaps except on room entry. */
(function (CV) {
  'use strict';

  var U = CV.Util;

  function Camera() {
    this.x = 0; this.y = 0;
    this.tx = 0; this.ty = 0;
    this.lookX = 0; this.lookY = 0;
    this.bounds = { x: 0, y: 0, w: CV.W, h: CV.H };
    this.zoomOut = 0;          // reserved for boss reveals; renderer reads it
    this.override = null;      // {x,y,weight} — cinematic focus point
    this.freeze = false;
  }

  Camera.prototype.setRoom = function (room) {
    this.bounds.x = 0; this.bounds.y = 0;
    this.bounds.w = room.pw; this.bounds.h = room.ph;
  };

  Camera.prototype.clamp = function () {
    var maxX = Math.max(0, this.bounds.w - CV.W);
    var maxY = Math.max(0, this.bounds.h - CV.H);
    /* Rooms narrower than the screen are centred rather than pinned left. */
    this.x = this.bounds.w <= CV.W ? (this.bounds.w - CV.W) / 2 : U.clamp(this.x, 0, maxX);
    this.y = this.bounds.h <= CV.H ? (this.bounds.h - CV.H) / 2 : U.clamp(this.y, 0, maxY);
  };

  Camera.prototype.snapTo = function (px, py) {
    this.x = px - CV.W / 2; this.y = py - CV.H / 2;
    this.lookX = this.lookY = 0;
    this.clamp();
  };

  /* `target` is the player. Look-ahead leads the camera in the direction of travel,
     which is what lets the player see where a dash is taking them. */
  Camera.prototype.update = function (dt, target) {
    if (this.freeze) { this.clamp(); return; }

    var lookGoalX = U.clamp(target.vx / 220, -1, 1) * 44;
    /* Vertical look-ahead only when clearly falling or deliberately looking up —
       otherwise every small jump makes the camera bob, which reads as nausea. */
    var lookGoalY = 0;
    if (target.vy > 260) lookGoalY = U.clamp((target.vy - 260) / 300, 0, 1) * 40;
    else if (target.lookUp) lookGoalY = -36;
    else if (target.lookDown) lookGoalY = 42;

    this.lookX = U.damp(this.lookX, lookGoalX, 3.2, dt);
    this.lookY = U.damp(this.lookY, lookGoalY, 2.6, dt);

    var gx = target.x + target.w / 2 + this.lookX - CV.W / 2;
    var gy = target.y + target.h / 2 + this.lookY - CV.H / 2 - 12;

    if (this.override) {
      gx = U.lerp(gx, this.override.x - CV.W / 2, this.override.weight);
      gy = U.lerp(gy, this.override.y - CV.H / 2, this.override.weight);
    }

    /* Asymmetric damping: horizontal tracking is tight (movement game), vertical is
       looser so platform-hopping does not shake the frame. */
    this.x = U.damp(this.x, gx, 7.5, dt);
    this.y = U.damp(this.y, gy, 5.0, dt);

    this.clamp();
  };

  Camera.prototype.focus = function (x, y, weight) {
    this.override = { x: x, y: y, weight: U.clamp(weight, 0, 1) };
  };
  Camera.prototype.clearFocus = function () { this.override = null; };

  /* Final render offset including shake. Kept integer so the pixel grid never blurs. */
  Camera.prototype.rx = function () { return (this.x + CV.Engine.shakeX) | 0; };
  Camera.prototype.ry = function () { return (this.y + CV.Engine.shakeY) | 0; };

  Camera.prototype.visible = function (x, y, w, h, margin) {
    margin = margin || 48;
    return x + w > this.x - margin && x < this.x + CV.W + margin &&
           y + h > this.y - margin && y < this.y + CV.H + margin;
  };

  CV.Camera = Camera;

})(window.CV = window.CV || {});
