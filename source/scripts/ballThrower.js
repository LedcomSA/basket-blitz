/**
 * BallThrower — swipe/drag up to launch the ball toward the hoop.
 *
 * One physics loop with fixed sub-steps (exact under constant gravity):
 * collisions with the rim (torus), the backboard (bounded plane) and the
 * floor. A basket counts when the ball center crosses the rim plane
 * downward inside the rim; it is a swish (+2) when the rim was not touched.
 * All tunables are exposed as editor attributes.
 */
var BallThrower = pc.createScript('ballThrower');

// --- Inspector attributes ---------------------------------------------------
BallThrower.attributes.add('hoop', { type: 'entity', title: 'Hoop (rim center)' });
BallThrower.attributes.add('gravity', { type: 'number', default: 9.8 });
BallThrower.attributes.add('ballRadius', { type: 'number', default: 0.525 });

// Throw
BallThrower.attributes.add('arcHeight', { type: 'number', default: 1.8, description: 'Apex height above the rim: sets the bell shape of the shot' });
BallThrower.attributes.add('shotSpeed', { type: 'number', default: 1.15, description: 'Time multiplier: >1 = same arc, faster ball; <1 = slower' });
BallThrower.attributes.add('airDrag', { type: 'number', default: 1.5, description: 'In-flight slowdown (1/s): strong initial burst progressively slowed by gravity and air' });
BallThrower.attributes.add('fullPowerSwipe', { type: 'number', default: 350, description: 'Swipe length in px for maximum power' });
BallThrower.attributes.add('lateralFactor', { type: 'number', default: 0.006, description: 'Sideways aim offset (m) per pixel of sideways drag' });
BallThrower.attributes.add('perfectPower', { type: 'number', default: 0.7, description: 'Swipe power (0-1) that lands exactly in the rim center' });
BallThrower.attributes.add('depthFactor', { type: 'number', default: 1.6, description: 'Depth aim error (m) per unit of power away from perfectPower (0 = always deep enough)' });

// Rim / board / floor
BallThrower.attributes.add('rimRadius', { type: 'number', default: 0.92, description: 'Rim ring radius (center of the tube)' });
BallThrower.attributes.add('rimTube', { type: 'number', default: 0.05, description: 'Rim tube radius' });
BallThrower.attributes.add('rimBounce', { type: 'number', default: 0.6, description: 'Restitution on the rim' });
BallThrower.attributes.add('backboardZ', { type: 'number', default: 7.35, description: 'Z of the backboard front face' });
BallThrower.attributes.add('boardHalfWidth', { type: 'number', default: 2.9 });
BallThrower.attributes.add('boardBottom', { type: 'number', default: 3.4 });
BallThrower.attributes.add('boardTop', { type: 'number', default: 7.2 });
BallThrower.attributes.add('boardBounce', { type: 'number', default: 0.6 });
BallThrower.attributes.add('floorY', { type: 'number', default: -2.63, description: 'Ball center height when resting on the floor' });
BallThrower.attributes.add('bounce', { type: 'number', default: 0.55, description: 'Restitution on the floor (0-1)' });
BallThrower.attributes.add('minBounceSpeed', { type: 'number', default: 0.8, description: 'Below this vertical speed the ball stops bouncing and rolls' });
BallThrower.attributes.add('floorFriction', { type: 'number', default: 0.85, description: 'Horizontal speed kept at each floor bounce' });
BallThrower.attributes.add('rollFriction', { type: 'number', default: 1.5, description: 'Rolling slowdown per second' });
BallThrower.attributes.add('netDrag', { type: 'number', default: 0.35, description: 'Horizontal speed kept when the ball drops through the net' });
BallThrower.attributes.add('netDepth', { type: 'number', default: 1.3, description: 'Net length below the rim (m): zone where the net guides the ball' });
BallThrower.attributes.add('netPull', { type: 'number', default: 15, description: 'How strongly the net centers the ball while it drops through (1/s)' });

// Spawn arc — each new shot starts slightly rotated around the hoop
BallThrower.attributes.add('spawnArc', { type: 'number', default: 40, description: 'Half-amplitude of the spawn arc around the hoop (degrees)' });
BallThrower.attributes.add('arcStepMin', { type: 'number', default: 6, description: 'Min spawn rotation per shot (degrees)' });
BallThrower.attributes.add('arcStepMax', { type: 'number', default: 14, description: 'Max spawn rotation per shot (degrees)' });

// Reset
BallThrower.attributes.add('resetDelay', { type: 'number', default: 2.2, description: 'Seconds after the first floor contact before respawn' });
BallThrower.attributes.add('maxFlightDuration', { type: 'number', default: 6 });
BallThrower.attributes.add('boundsZ', { type: 'number', default: 14, description: 'Out of bounds distance' });
BallThrower.attributes.add('boundsX', { type: 'number', default: 10 });

// Visual motion
BallThrower.attributes.add('visual', { type: 'entity', title: 'Visual (mesh child)', description: 'Rotated for spin so lights on the root stay fixed' });
BallThrower.attributes.add('backSpin', { type: 'number', default: 240, description: 'Backspin in flight (deg/s)' });
BallThrower.attributes.add('sideSpinFactor', { type: 'number', default: 1.5, description: 'Side spin (deg/s) per pixel of sideways drag' });
BallThrower.attributes.add('floatAmplitude', { type: 'number', default: 0, description: 'Idle float height (m)' });
BallThrower.attributes.add('floatSpeed', { type: 'number', default: 2.4, description: 'Idle float speed (rad/s)' });
BallThrower.attributes.add('idleSpin', { type: 'vec3', default: [0, 0, 0], description: 'Idle rotation (deg/s)' });

// Trail
BallThrower.attributes.add('trailOpacity', { type: 'number', default: 0.42, description: 'Trail opacity behind the ball (0 = disabled, 1 = opaque)' });
BallThrower.attributes.add('trailDuration', { type: 'number', default: 0.42, description: 'Trail lifetime in seconds' });
BallThrower.attributes.add('trailWidth', { type: 'number', default: 0.65, description: 'Initial trail width behind the ball (m)' });
BallThrower.attributes.add('trailColor', { type: 'rgb', default: [1, 1, 1], description: 'Trail color' });

var SUBSTEP = 1 / 240;
var TRAIL_SEGMENTS = 28;

// --- Runtime ----------------------------------------------------------------

BallThrower.prototype.initialize = function () {
    this.baseSpawn = this.entity.getPosition().clone();
    this.spawnPos = this.baseSpawn.clone();
    this._arcAngle = 0;
    this._arcDir = 1;
    this.pos = this.spawnPos.clone();
    this.velocity = new pc.Vec3();
    this._prev = new pc.Vec3();
    this._spin = new pc.Vec3();
    this._tmp = new pc.Vec3();
    this._tmp2 = new pc.Vec3();
    this._closest = new pc.Vec3();
    this._baseRot = this.visual ? this.visual.getLocalRotation().clone() : null;

    this.state = 'idle';        // idle | flying
    this.canThrow = false;      // enabled when gameplay starts
    this._dragStart = null;
    this._dragCur = null;
    this._floatT = 0;
    this._resetFlags();
    this._initTrail();

    var self = this;

    var down = function (x, y) {
        if (!self.canThrow || self.state !== 'idle') return;
        self._dragStart = { x: x, y: y };
        self._dragCur = { x: x, y: y };
    };
    var move = function (x, y) {
        if (self._dragStart) self._dragCur = { x: x, y: y };
    };
    var up = function () {
        if (!self._dragStart) return;
        var s = self._dragStart, e = self._dragCur;
        self._dragStart = null;
        self._dragCur = null;
        self._throw(s, e);
    };

    if (this.app.mouse) {
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, function (e) { down(e.x, e.y); });
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, function (e) { move(e.x, e.y); });
        this.app.mouse.on(pc.EVENT_MOUSEUP, function () { up(); });
    }
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, function (e) {
            var t = e.changedTouches[0];
            down(t.x, t.y);
        });
        this.app.touch.on(pc.EVENT_TOUCHMOVE, function (e) {
            var t = e.changedTouches[0];
            move(t.x, t.y);
        });
        this.app.touch.on(pc.EVENT_TOUCHEND, function () { up(); });
    }

    var homeSpawn = function () {
        self._arcAngle = 0;
        self._arcDir = 1;
        self.spawnPos.copy(self.baseSpawn);
        self.app.fire('ball:spawn', { angle: 0, pivot: self.hoop.getPosition().clone() });
    };
    this.app.on('game:play', function () {
        self.canThrow = true;
        homeSpawn();
        self.reset(true);
    });
    this.app.on('game:menu', function () {
        self.canThrow = false;
        homeSpawn();
        self.reset(true);
    });
};

BallThrower.prototype._resetFlags = function () {
    this._g = this.gravity;
    this._drag = 0;
    this._timer = 0;
    this._acc = 0;
    this._floorT = -1;
    this._grounded = false;
    this._scored = false;
    this._rimHit = false;
};

BallThrower.prototype._throw = function (start, end) {
    var dx = end.x - start.x;              // px, + = right
    var dy = start.y - end.y;              // px, + = swipe up
    if (dy < 30) return;                   // too small, ignore

    var power = pc.math.clamp(dy / this.fullPowerSwipe, 0.15, 1);

    // Aim: sideways from the drag direction, depth from the swipe strength
    var hoop = this.hoop.getPosition();
    var tx = hoop.x - dx * this.lateralFactor;
    var tz = hoop.z + (power - this.perfectPower) * this.depthFactor;

    var p = this.pos;
    var g = this.gravity;

    // Bell-shaped shot: launch upward to an apex above the rim, then drop in.
    // airDrag + gravity apply to all 3 axes so the ball leaves the hand with a
    // strong initial burst and progressively decelerates all the way to the apex.
    var k = this.shotSpeed;
    var apex = Math.max(hoop.y, p.y) + this.arcHeight;
    var gEff = g * k * k;
    var d = Math.max(0, this.airDrag) * k;

    var tUp, tDown, T, vy0, horizScale;
    if (d > 1e-4) {
        // Solve e^u - 1 - u = C for the ascent and w - 1 + e^-w = C for the descent
        var cUp = d * d * (apex - p.y) / gEff;
        var u = Math.sqrt(2 * cUp);
        for (var i = 0; i < 8; i++) {
            var eu = Math.exp(u);
            u -= (eu - 1 - u - cUp) / (eu - 1);
        }
        var cDown = d * d * (apex - hoop.y) / gEff;
        var w = Math.sqrt(2 * cDown);
        for (var j = 0; j < 8; j++) {
            var ew = Math.exp(-w);
            w -= (w - 1 + ew - cDown) / (1 - ew);
        }
        tUp = u / d;
        tDown = w / d;
        T = tUp + tDown;
        vy0 = (gEff / d) * (Math.exp(u) - 1);
        horizScale = d / (1 - Math.exp(-d * T));
    } else {
        tUp = Math.sqrt(2 * (apex - p.y) / g) / k;
        tDown = Math.sqrt(2 * (apex - hoop.y) / g) / k;
        T = tUp + tDown;
        vy0 = gEff * tUp;
        horizScale = 1 / T;
    }

    this._spin.set(-this.backSpin, 0, -dx * this.sideSpinFactor);
    this._resetFlags();
    this._clearTrail();
    this._g = gEff;
    this._drag = d;
    this.velocity.set((tx - p.x) * horizScale, vy0, (tz - p.z) * horizScale);
    this.state = 'flying';
    this.app.fire('ball:launch');
};

BallThrower.prototype.update = function (dt) {
    if (this.state === 'idle') {
        this._floatT += dt * this.floatSpeed;
        this.pos.set(this.spawnPos.x, this.spawnPos.y + Math.sin(this._floatT) * this.floatAmplitude, this.spawnPos.z);
        this.entity.setPosition(this.pos);
        if (this.visual) this.visual.rotate(this.idleSpin.x * dt, this.idleSpin.y * dt, this.idleSpin.z * dt);
        return;
    }

    this._timer += dt;
    this._acc = Math.min(this._acc + dt, 0.1);
    while (this._acc >= SUBSTEP && this.state === 'flying') {
        this._step(SUBSTEP);
        this._acc -= SUBSTEP;
    }
    if (this.state !== 'flying') return;

    this.entity.setPosition(this.pos);
    if (this.visual) this.visual.rotate(this._spin.x * dt, this._spin.y * dt, this._spin.z * dt);
    this._updateTrail();

    if (this._floorT >= 0) this._floorT += dt;
    var p = this.pos;
    if (this._floorT >= this.resetDelay || this._timer > this.maxFlightDuration ||
        Math.abs(p.x) > this.boundsX || Math.abs(p.z) > this.boundsZ) this.reset();
};

BallThrower.prototype._step = function (h) {
    var p = this.pos, v = this.velocity, g = this._g, d = this._drag;
    this._prev.copy(p);

    // Exact integration under gravity and 3D air drag
    if (d > 1e-4 && !this._grounded) {
        var decay = Math.exp(-d * h);
        var step = (1 - decay) / d;
        var vt = g / d;
        p.x += v.x * step;
        p.z += v.z * step;
        p.y += (v.y + vt) * step - vt * h;
        v.x *= decay;
        v.z *= decay;
        v.y = (v.y + vt) * decay - vt;
    } else {
        p.x += v.x * h;
        p.z += v.z * h;
        if (!this._grounded) {
            p.y += v.y * h - 0.5 * g * h * h;
            v.y -= g * h;
        }
    }

    this._checkScore();
    this._guideThroughNet(h);
    this._collideRim();
    this._collideBoard();
    this._collideFloor(h);
};

BallThrower.prototype._checkScore = function () {
    if (this._scored) return;
    var hoop = this.hoop.getPosition();
    var a = this._prev, b = this.pos;
    if (this.velocity.y >= 0 || a.y < hoop.y || b.y >= hoop.y) return;

    var f = (a.y - hoop.y) / (a.y - b.y);
    var dx = pc.math.lerp(a.x, b.x, f) - hoop.x;
    var dz = pc.math.lerp(a.z, b.z, f) - hoop.z;
    if (dx * dx + dz * dz >= this.rimRadius * this.rimRadius) return;

    this._scored = true;
    this._g = this.gravity;   // natural drop through the net
    this._drag = 0;
    this.app.fire('ball:score', this._rimHit ? 1 : 2);
    // The net catches the ball: most horizontal speed is lost
    this.velocity.x *= this.netDrag;
    this.velocity.z *= this.netDrag;
    this._spin.mulScalar(0.3);
};

// After a basket, the net funnels the ball toward its axis while it drops through
BallThrower.prototype._guideThroughNet = function (h) {
    if (!this._scored) return;
    var hoop = this.hoop.getPosition(), p = this.pos, v = this.velocity;
    var below = hoop.y - p.y;
    if (below <= 0 || below >= this.netDepth) return;
    var k = Math.min(1, this.netPull * h);
    p.x += (hoop.x - p.x) * k;
    p.z += (hoop.z - p.z) * k;
    v.x *= 1 - k;
    v.z *= 1 - k;
};

BallThrower.prototype._collideRim = function () {
    var hoop = this.hoop.getPosition();
    var p = this.pos, v = this.velocity, n = this._tmp, c = this._closest;

    // Closest point of the rim circle to the ball center
    var hx = p.x - hoop.x, hz = p.z - hoop.z;
    var hl = Math.sqrt(hx * hx + hz * hz);
    if (hl < 1e-6) { hx = 1; hz = 0; hl = 1; }
    c.set(hoop.x + hx / hl * this.rimRadius, hoop.y, hoop.z + hz / hl * this.rimRadius);

    n.sub2(p, c);
    var d = n.length();
    var min = this.ballRadius + this.rimTube;
    if (d >= min || d < 1e-6) return;

    n.mulScalar(1 / d);
    var t = this._tmp2;
    p.copy(c).add(t.copy(n).mulScalar(min));    // push out of the rim
    var vn = v.dot(n);
    if (vn < 0) {
        this._g = this.gravity;   // back to real gravity after the hit
        this._drag = 0;
        v.sub(t.copy(n).mulScalar((1 + this.rimBounce) * vn));
        v.mulScalar(0.95);
        this._spin.set(-this._spin.x * 0.5, (Math.random() - 0.5) * 200, this._spin.z + (Math.random() - 0.5) * 200);
        if (!this._rimHit || -vn > 1) this.app.fire('ball:rim');
        this._rimHit = true;
    }
};

BallThrower.prototype._collideBoard = function () {
    var p = this.pos, v = this.velocity, r = this.ballRadius;
    if (v.z <= 0 || p.z + r < this.backboardZ) return;
    if (Math.abs(p.x) > this.boardHalfWidth + r * 0.5 || p.y < this.boardBottom - r * 0.5 || p.y > this.boardTop + r * 0.5) return;
    p.z = this.backboardZ - r;
    this._g = this.gravity;
    this._drag = 0;
    v.z = -v.z * this.boardBounce;
    v.x *= 0.9;
    this.app.fire('ball:boardHit');
};

BallThrower.prototype._collideFloor = function (h) {
    var p = this.pos, v = this.velocity, r = this.floorY;
    if (p.y <= r && v.y < 0) {
        p.y = r;
        this._g = this.gravity;
        this._drag = 0;
        if (this._floorT < 0) this._floorT = 0;
        if (-v.y * this.bounce < this.minBounceSpeed) {
            v.y = 0;
            this._grounded = true;
        } else {
            v.y = -v.y * this.bounce;
            v.x *= this.floorFriction;
            v.z *= this.floorFriction;
            this.app.fire('ball:bounce');
        }
    }
    if (this._grounded) {
        // Rolling: exponential slowdown, spin matches the ground speed
        var k = Math.exp(-this.rollFriction * h);
        v.x *= k;
        v.z *= k;
        var rad = this.ballRadius;
        this._spin.set(v.z / rad * pc.math.RAD_TO_DEG, 0, -v.x / rad * pc.math.RAD_TO_DEG);
    }
};

BallThrower.prototype._advanceArc = function () {
    this._arcAngle += (this.arcStepMin + Math.random() * (this.arcStepMax - this.arcStepMin)) * this._arcDir;
    if (Math.abs(this._arcAngle) > this.spawnArc) {
        this._arcAngle = this.spawnArc * this._arcDir;
        this._arcDir = -this._arcDir;
    }
    var a = this._arcAngle * pc.math.DEG_TO_RAD;
    var hoop = this.hoop.getPosition();
    var dx = this.baseSpawn.x - hoop.x;
    var dz = this.baseSpawn.z - hoop.z;
    var c = Math.cos(a), s = Math.sin(a);
    this.spawnPos.set(hoop.x + dx * c - dz * s, this.baseSpawn.y, hoop.z + dx * s + dz * c);
    this.app.fire('ball:spawn', { angle: a, pivot: hoop.clone() });
};

BallThrower.prototype._initTrail = function () {
    this._trail = [];
    this._trailRoot = new pc.Entity('BallTrail');
    this.app.root.addChild(this._trailRoot);
    this._trailSegs = [];

    for (var i = 0; i < TRAIL_SEGMENTS; i++) {
        var mat = new pc.StandardMaterial();
        mat.useLighting = false;
        mat.useSkybox = false;
        mat.diffuse = new pc.Color(0, 0, 0);
        mat.specular = new pc.Color(0, 0, 0);
        mat.emissive = new pc.Color(1, 1, 1);
        mat.opacity = 0.3;
        mat.blendType = pc.BLEND_NORMAL;
        mat.depthWrite = false;
        mat.cull = pc.CULLFACE_NONE;
        mat.update();

        var seg = new pc.Entity('TrailSeg');
        seg.addComponent('render', {
            type: 'plane',
            castShadows: false,
            receiveShadows: false,
            material: mat
        });
        seg.enabled = false;
        this._trailRoot.addChild(seg);
        this._trailSegs.push({ entity: seg, mat: mat });
    }

    var self = this;
    this.on('destroy', function () {
        if (self._trailRoot) self._trailRoot.destroy();
    });
};

BallThrower.prototype._clearTrail = function () {
    if (!this._trail) return;
    this._trail.length = 0;
    if (this._trailSegs) {
        for (var i = 0; i < this._trailSegs.length; i++) {
            this._trailSegs[i].entity.enabled = false;
        }
    }
};

BallThrower.prototype._updateTrail = function () {
    if (!this._trailSegs || this.trailOpacity <= 0 || this.trailDuration <= 0) {
        this._clearTrail();
        return;
    }

    var now = this._timer;
    var dur = this.trailDuration;
    var pts = this._trail;

    // Emit points while the ball is airborne (before hitting the floor)
    if (this._floorT < 0) {
        var p = this.pos;
        var last = pts.length > 0 ? pts[0] : null;
        var distSq = last ? (p.x - last.x) * (p.x - last.x) + (p.y - last.y) * (p.y - last.y) + (p.z - last.z) * (p.z - last.z) : 1;
        if (!last || distSq > 0.002) {
            pts.unshift({ x: p.x, y: p.y, z: p.z, t: now });
            if (pts.length > TRAIL_SEGMENTS + 1) pts.pop();
        } else {
            last.x = p.x; last.y = p.y; last.z = p.z; last.t = now;
        }
    }

    while (pts.length > 0 && now - pts[pts.length - 1].t > dur) {
        pts.pop();
    }

    var count = Math.min(pts.length - 1, TRAIL_SEGMENTS);
    var c = this.trailColor;
    var cr = c ? c.r : 1, cg = c ? c.g : 1, cb = c ? c.b : 1;
    var aVec = this._tmp, bVec = this._tmp2, mid = this._closest;
    var cam = this.app.root.findComponent('camera');
    var camPos = cam ? cam.entity.getPosition() : this.baseSpawn;
    var bx = this.pos.x - camPos.x, by = this.pos.y - camPos.y, bz = this.pos.z - camPos.z;
    var bLenSq = bx * bx + by * by + bz * bz;
    var minPerp = this.ballRadius * 1.02;

    for (var i = 0; i < TRAIL_SEGMENTS; i++) {
        var s = this._trailSegs[i];
        if (i >= count) {
            s.entity.enabled = false;
            continue;
        }
        var A = pts[i], B = pts[i + 1];
        aVec.set(A.x, A.y, A.z);
        bVec.set(B.x, B.y, B.z);
        var len = aVec.distance(bVec);
        if (len < 1e-4) {
            s.entity.enabled = false;
            continue;
        }

        mid.lerp(aVec, bVec, 0.5);
        // Screen-space silhouette check: distance from the ball center to the camera->mid ray
        var rx = mid.x - camPos.x, ry = mid.y - camPos.y, rz = mid.z - camPos.z;
        var rLenSq = rx * rx + ry * ry + rz * rz;
        var dot = bx * rx + by * ry + bz * rz;
        var perpSq = rLenSq > 1e-6 ? bLenSq - (dot * dot) / rLenSq : 0;
        if (perpSq < minPerp * minPerp) {
            s.entity.enabled = false;
            continue;
        }

        var age = now - 0.5 * (A.t + B.t);
        var life = pc.math.clamp(1 - age / dur, 0, 1);
        var w = this.trailWidth * (0.15 + 0.85 * life);

        s.entity.setPosition(mid);
        s.entity.lookAt(aVec);
        s.entity.rotateLocal(90, 0, 0);
        s.entity.setLocalScale(w, 1, len);

        s.mat.emissive.set(cr, cg, cb);
        s.mat.opacity = this.trailOpacity * life;
        s.mat.update();
        s.entity.enabled = true;
    }
};

BallThrower.prototype.reset = function (keepAngle) {
    if (!keepAngle) this._advanceArc();
    this.pos.copy(this.spawnPos);
    this.entity.setPosition(this.pos);
    this.velocity.set(0, 0, 0);
    this._resetFlags();
    this._clearTrail();
    this._floatT = 0;
    if (this.visual && this._baseRot) this.visual.setLocalRotation(this._baseRot);
    this.state = 'idle';
    this._dragStart = null;
    this.app.fire('ball:reset');
};
